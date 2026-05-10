/**
 * hooks/useBalance.ts
 *
 * Non-custodial balance hook for Cyclos Hryvnia.
 *
 * Fetches:
 *   1. Native SOL balance via `getBalance`
 *   2. SPL-token balances via `getParsedTokenAccountsByOwner`
 *   3. USD prices + 24h change from CoinGecko (free tier, no API key)
 *
 * Prices are module-level cached for PRICE_CACHE_TTL (60 s) so that
 * multiple renders never hammer the public endpoint.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { useWallet } from "./useWallet";
import type { Balance } from "@/types";
import {
  KNOWN_TOKENS,
  COINGECKO_IDS,
  COINGECKO_ID_TO_KEY,
  PRICE_CACHE_TTL,
  type TokenMeta,
} from "@/constants/tokens";

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface PriceEntry {
  usd: number;
  usd_24h_change: number;
}

type PriceMap = Record<string, PriceEntry>; // coingeckoId → entry

interface PriceCache {
  data: PriceMap;
  fetchedAt: number;
}

export interface UseBalanceResult {
  balances: (Balance & { changePercent?: number })[];
  totalValueUSD: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// ─── Module-level price cache ─────────────────────────────────────────────────

let priceCache: PriceCache | null = null;

async function fetchPrices(): Promise<PriceMap> {
  const now = Date.now();
  if (priceCache && now - priceCache.fetchedAt < PRICE_CACHE_TTL) {
    return priceCache.data;
  }

  const ids = COINGECKO_IDS.join(",");
  const url =
    `https://api.coingecko.com/api/v3/simple/price` +
    `?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    // Treat as GET cache-revalidation so Next.js edge can cache it too
    next: { revalidate: 60 },
  } as RequestInit);

  if (!res.ok) {
    throw new Error(`CoinGecko error: ${res.status}`);
  }

  const json = (await res.json()) as Record<
    string,
    { usd?: number; usd_24h_change?: number }
  >;

  const data: PriceMap = {};
  for (const [id, val] of Object.entries(json)) {
    data[id] = {
      usd: val.usd ?? 0,
      usd_24h_change: val.usd_24h_change ?? 0,
    };
  }

  priceCache = { data, fetchedAt: now };
  return data;
}

// ─── RPC connection (singleton per module) ────────────────────────────────────

function getConnection(): Connection {
  const rpc =
    process.env.NEXT_PUBLIC_SOLANA_RPC ??
    "https://api.mainnet-beta.solana.com";
  return new Connection(rpc, "confirmed");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildBalance(
  meta: TokenMeta,
  mintOrSOL: string,
  amount: number,
  prices: PriceMap,
): Balance & { changePercent?: number } {
  // Resolve USD price
  let usdPrice: number;
  let changePercent: number | undefined;

  if (meta.fixedUSD !== undefined) {
    usdPrice = meta.fixedUSD;
    changePercent = undefined; // pegged — no meaningful 24h change
  } else if (meta.coingeckoId) {
    const entry = prices[meta.coingeckoId];
    usdPrice = entry?.usd ?? 0;
    changePercent = entry?.usd_24h_change;
  } else {
    usdPrice = 0;
  }

  return {
    token: {
      address: mintOrSOL,
      symbol: meta.symbol,
      name: meta.name,
      decimals: meta.decimals,
      logo: meta.logo || null,
      chain: "solana",
      price: usdPrice || null,
    },
    amount,
    valueUSD: amount * usdPrice,
    changePercent,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBalance(): UseBalanceResult {
  const { address } = useWallet();

  const [balances, setBalances] = useState<
    (Balance & { changePercent?: number })[]
  >([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Prevent stale async results from updating unmounted component
  const abortRef = useRef<AbortController | null>(null);

  const fetchBalances = useCallback(async (): Promise<void> => {
    if (!address) {
      setBalances([]);
      return;
    }

    // Cancel any in-flight fetch
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const publicKey = new PublicKey(address);
      const connection = getConnection();

      // ── 1. Fetch prices and SOL balance in parallel ──────────────────────
      const [prices, lamports] = await Promise.all([
        fetchPrices().catch(() => ({} as PriceMap)),
        connection.getBalance(publicKey),
      ]);

      if (controller.signal.aborted) return;

      const results: (Balance & { changePercent?: number })[] = [];

      // ── 2. SOL (native) ──────────────────────────────────────────────────
      const solMeta = KNOWN_TOKENS["SOL"];
      if (solMeta) {
        const solAmount = lamports / LAMPORTS_PER_SOL;
        results.push(buildBalance(solMeta, "SOL", solAmount, prices));
      }

      // ── 3. SPL Tokens ────────────────────────────────────────────────────
      const tokenAccounts =
        await connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: TOKEN_PROGRAM_ID,
        });

      if (controller.signal.aborted) return;

      for (const { account } of tokenAccounts.value) {
        const parsed = account.data.parsed as {
          info?: {
            mint?: string;
            tokenAmount?: { uiAmount?: number | null };
          };
        };

        const mint = parsed?.info?.mint;
        const uiAmount = parsed?.info?.tokenAmount?.uiAmount ?? 0;

        if (!mint) continue;

        // Skip dust / zero balances
        if (uiAmount <= 0) continue;

        const meta = KNOWN_TOKENS[mint];
        if (!meta) continue; // unknown token — skip for now

        results.push(buildBalance(meta, mint, uiAmount, prices));
      }

      // ── 4. Sort: cUAH first, then by USD value desc ──────────────────────
      results.sort((a, b) => {
        if (a.token.symbol === "cUAH") return -1;
        if (b.token.symbol === "cUAH") return 1;
        return b.valueUSD - a.valueUSD;
      });

      setBalances(results);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      const message =
        err instanceof Error ? err.message : "Failed to fetch balances";
      setError(message);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [address]);

  // Initial fetch + refresh on address change
  useEffect(() => {
    void fetchBalances();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchBalances]);

  // Auto-refresh every 30 seconds while mounted
  useEffect(() => {
    if (!address) return;
    const interval = setInterval(() => void fetchBalances(), 30_000);
    return () => clearInterval(interval);
  }, [address, fetchBalances]);

  const totalValueUSD = balances.reduce((sum, b) => sum + b.valueUSD, 0);

  return {
    balances,
    totalValueUSD,
    loading,
    error,
    refetch: fetchBalances,
  };
}
