/**
 * hooks/useTransactions.ts
 *
 * Fetches and parses the last 50 on-chain transactions for the connected wallet.
 *
 * Detection logic:
 *   swap    → any instruction belongs to a known DEX program (Jupiter / Orca / Raydium)
 *   receive → net SOL delta > 0  OR  SPL tokenTransfer.destination === myAddress
 *   send    → net SOL delta < 0  AND  no recognisable swap program
 *
 * Returns: Transaction[] (src/types/index.ts) + { loading, error, refetch }
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Connection,
  PublicKey,
  type ParsedTransactionWithMeta,
  type ParsedInstruction,
  type PartiallyDecodedInstruction,
} from "@solana/web3.js";
import { useWallet } from "./useWallet";
import { KNOWN_TOKENS } from "@/constants/tokens";
import type { Token, Transaction as AppTransaction } from "@/types";

// ─── DEX program IDs ──────────────────────────────────────────────────────────

const DEX_PROGRAMS = new Set<string>([
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4", // Jupiter v6
  "JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB",  // Jupiter v4
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",  // Orca Whirlpool
  "9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP", // Orca v2
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", // Raydium AMM v4
  "5quBtoiQqxF9Jv6KYKctB59NT3gtJD2Y65kdnB1Uev3h", // Raydium CL
]);

// ─── RPC connection (singleton per module) ────────────────────────────────────

function getConnection(): Connection {
  const rpc =
    process.env.NEXT_PUBLIC_SOLANA_RPC ??
    "https://api.mainnet-beta.solana.com";
  return new Connection(rpc, "confirmed");
}

const SOL_MINT_ADDRESS = "So11111111111111111111111111111111111111112";

function buildToken(
  tokenKey: string,
  fallbackSymbol: string,
  fallbackDecimals: number,
): Token {
  const meta = KNOWN_TOKENS[tokenKey];
  const address = tokenKey === "SOL" ? SOL_MINT_ADDRESS : tokenKey;

  return {
    address,
    symbol: meta?.symbol ?? fallbackSymbol,
    name: meta?.name ?? fallbackSymbol,
    decimals: meta?.decimals ?? fallbackDecimals,
    logo: meta?.logo || null,
    chain: "solana",
    price: meta?.fixedUSD ?? null,
  };
}

// ─── Instruction type narrowing ───────────────────────────────────────────────

function isParsedInstruction(
  ix: ParsedInstruction | PartiallyDecodedInstruction,
): ix is ParsedInstruction {
  return "parsed" in ix;
}

function getAllInstructions(tx: ParsedTransactionWithMeta) {
  const outer = tx.transaction.message.instructions;
  const inner =
    tx.meta?.innerInstructions?.flatMap((group) => group.instructions) ?? [];

  return [...outer, ...inner];
}

function getAccountAddress(
  tx: ParsedTransactionWithMeta,
  accountIndex: number,
): string | null {
  return tx.transaction.message.accountKeys[accountIndex]?.pubkey.toBase58() ?? null;
}

function getTokenAccountMeta(tx: ParsedTransactionWithMeta) {
  const map = new Map<
    string,
    { owner?: string; mint: string; amount: number; decimals: number }
  >();

  for (const balance of [
    ...(tx.meta?.preTokenBalances ?? []),
    ...(tx.meta?.postTokenBalances ?? []),
  ]) {
    const address = getAccountAddress(tx, balance.accountIndex);
    if (!address) continue;

    map.set(address, {
      owner: balance.owner,
      mint: balance.mint,
      amount: balance.uiTokenAmount.uiAmount ?? 0,
      decimals: balance.uiTokenAmount.decimals,
    });
  }

  return map;
}

// ─── Detect DEX involvement ───────────────────────────────────────────────────

function isSwapTx(tx: ParsedTransactionWithMeta): boolean {
  return getAllInstructions(tx).some((ix) =>
    DEX_PROGRAMS.has(ix.programId.toBase58()),
  );
}

// ─── Parse a single transaction ───────────────────────────────────────────────

function parseTx(
  tx: ParsedTransactionWithMeta,
  myAddress: string,
): AppTransaction | null {
  const sig = tx.transaction.signatures[0];
  if (!sig) return null;

  const meta = tx.meta;
  if (!meta) return null;

  const blockTime = tx.blockTime;
  if (!blockTime) return null;

  const accounts = tx.transaction.message.accountKeys;
  const myIndex = accounts.findIndex(
    (a) => a.pubkey.toBase58() === myAddress,
  );

  // ── Determine tx type ────────────────────────────────────────────────────

  if (isSwapTx(tx)) {
    // For swaps, surface the output token (postTokenBalances – preTokenBalances max delta)
    const preMap = new Map(
      (meta.preTokenBalances ?? []).map((b) => [
        `${b.accountIndex}:${b.mint}`,
        b.uiTokenAmount.uiAmount ?? 0,
      ]),
    );

    let bestAmount = 0;
    let bestMint = "";

    for (const post of meta.postTokenBalances ?? []) {
      const key = `${post.accountIndex}:${post.mint}`;
      const pre = preMap.get(key) ?? 0;
      const delta = (post.uiTokenAmount.uiAmount ?? 0) - pre;
      if (delta > bestAmount) {
        bestAmount = delta;
        bestMint = post.mint;
      }
    }

    const tokenMeta = bestMint ? KNOWN_TOKENS[bestMint] : null;
    const symbol = tokenMeta?.symbol ?? "SOL";
    const decimals = tokenMeta?.decimals ?? 9;
    const token = buildToken(bestMint || "SOL", symbol, decimals);
    const fixedUSD = tokenMeta?.fixedUSD;
    const usdPrice =
      fixedUSD !== undefined ? fixedUSD : 0; // prices unavailable at parse time

    return {
      id: sig,
      hash: sig,
      from: myAddress,
      to: myAddress,
      type: "swap",
      amount: bestAmount,
      token,
      valueUSD: bestAmount * usdPrice,
      timestamp: blockTime * 1_000,
      status: meta.err ? "failed" : "success",
    };
  }

  // ── SOL transfer (send / receive) ────────────────────────────────────────

  if (myIndex !== -1) {
    const pre = meta.preBalances[myIndex] ?? 0;
    const post = meta.postBalances[myIndex] ?? 0;
    const lamportDelta = post - pre;

    if (lamportDelta !== 0) {
      const amount = Math.abs(lamportDelta) / 1e9;
      const type: AppTransaction["type"] = lamportDelta > 0 ? "receive" : "send";

      // Counterparty: find the account with the opposite delta
      let counterparty = "";
      for (let i = 0; i < accounts.length; i++) {
        if (i === myIndex) continue;
        const preDelta = (meta.postBalances[i] ?? 0) - (meta.preBalances[i] ?? 0);
        if (
          (type === "receive" && preDelta < 0) ||
          (type === "send" && preDelta > 0)
        ) {
          counterparty = accounts[i]?.pubkey.toBase58() ?? "";
          break;
        }
      }

      return {
        id: sig,
        hash: sig,
        from: type === "send" ? myAddress : counterparty,
        to: type === "receive" ? myAddress : counterparty,
        type,
        amount,
        token: buildToken("SOL", "SOL", 9),
        valueUSD: 0, // populated by caller with live price if needed
        timestamp: blockTime * 1_000,
        status: meta.err ? "failed" : "success",
      };
    }
  }

  // ── SPL token transfer ───────────────────────────────────────────────────

  const tokenAccountMeta = getTokenAccountMeta(tx);

  for (const ix of getAllInstructions(tx)) {
    if (!isParsedInstruction(ix)) continue;
    if (ix.program !== "spl-token") continue;

    const parsed = ix.parsed as {
      type?: string;
      info?: {
        source?: string;
        destination?: string;
        mint?: string;
        tokenAmount?: { uiAmount?: number | null; decimals?: number };
        amount?: string;
      };
    };

    if (
      parsed.type !== "transfer" &&
      parsed.type !== "transferChecked"
    )
      continue;

    const info = parsed.info;
    if (!info) continue;

    const sourceMeta = info.source ? tokenAccountMeta.get(info.source) : null;
    const destinationMeta = info.destination
      ? tokenAccountMeta.get(info.destination)
      : null;
    const mint = info.mint ?? sourceMeta?.mint ?? destinationMeta?.mint ?? "";
    const tokenMeta = mint ? KNOWN_TOKENS[mint] : null;
    const symbol = tokenMeta?.symbol ?? "SPL";
    const decimals =
      info.tokenAmount?.decimals ??
      sourceMeta?.decimals ??
      destinationMeta?.decimals ??
      tokenMeta?.decimals ??
      6;
    const uiAmount =
      info.tokenAmount?.uiAmount ??
      (info.amount ? Number(info.amount) / 10 ** decimals : 0);
    if (!uiAmount) continue;

    const fixedUSD = tokenMeta?.fixedUSD;
    const token = buildToken(mint || "SPL", symbol, decimals);

    const isReceive =
      info.destination === myAddress || destinationMeta?.owner === myAddress;
    const isSend = info.source === myAddress || sourceMeta?.owner === myAddress;
    if (!isReceive && !isSend) continue;

    const type: AppTransaction["type"] = isReceive ? "receive" : "send";

    return {
      id: sig,
      hash: sig,
      from: sourceMeta?.owner ?? info.source ?? "",
      to: destinationMeta?.owner ?? info.destination ?? "",
      type,
      amount: uiAmount,
      token,
      valueUSD: fixedUSD !== undefined ? uiAmount * fixedUSD : 0,
      timestamp: blockTime * 1_000,
      status: meta.err ? "failed" : "success",
    };
  }

  return null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseTransactionsResult {
  transactions: AppTransaction[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTransactions(): UseTransactionsResult {
  const { address } = useWallet();

  const [transactions, setTransactions] = useState<AppTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const fetchTransactions = useCallback(async (): Promise<void> => {
    if (!address) {
      setTransactions([]);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const connection = getConnection();
      const pubkey = new PublicKey(address);

      // ── 1. Fetch signature list ──────────────────────────────────────────
      const sigs = await connection.getSignaturesForAddress(pubkey, {
        limit: 50,
      });

      if (controller.signal.aborted) return;
      if (sigs.length === 0) {
        setTransactions([]);
        return;
      }

      // ── 2. Fetch parsed transactions in parallel ─────────────────────────
      const signatures = sigs.map((s) => s.signature);

      // getParsedTransactions returns (ParsedTransactionWithMeta | null)[]
      const rawTxs = await connection.getParsedTransactions(signatures, {
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
      });

      if (controller.signal.aborted) return;

      // ── 3. Parse each transaction ────────────────────────────────────────
      const parsed: AppTransaction[] = [];
      for (const rawTx of rawTxs) {
        if (!rawTx) continue;
        const result = parseTx(rawTx, address);
        if (result) parsed.push(result);
      }

      setTransactions(parsed.sort((a, b) => b.timestamp - a.timestamp));
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      const message =
        err instanceof Error ? err.message : "Failed to fetch transactions";
      setError(message);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [address]);

  // Initial fetch + re-fetch on address change
  useEffect(() => {
    void fetchTransactions();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchTransactions]);

  // Auto-refresh every 60 s; balances refresh more frequently than history.
  useEffect(() => {
    if (!address) return;
    const id = setInterval(() => void fetchTransactions(), 60_000);
    return () => clearInterval(id);
  }, [address, fetchTransactions]);

  return { transactions, loading, error, refetch: fetchTransactions };
}
