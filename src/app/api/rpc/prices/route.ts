import { NextRequest, NextResponse } from "next/server";
import { PRICE_CACHE_TTL } from "@/constants/tokens";

interface PriceTokenConfig {
  coingeckoId: string | null;
  fallbackUSD: number;
}

const PRICE_TOKENS: Record<string, PriceTokenConfig> = {
  SOL:  { coingeckoId: "solana",       fallbackUSD: 150      },
  USDC: { coingeckoId: "usd-coin",     fallbackUSD: 1        },
  USDT: { coingeckoId: "tether",       fallbackUSD: 1        },
  WBTC: { coingeckoId: "bitcoin",      fallbackUSD: 65_000   },
  BTC:  { coingeckoId: "bitcoin",      fallbackUSD: 65_000   },
  BNB:  { coingeckoId: "binancecoin",  fallbackUSD: 600      },
  cUAH: { coingeckoId: null,           fallbackUSD: 0.024    },
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
};

/**
 * In-process cache shared across requests on the same serverless instance.
 * TTL is driven by PRICE_CACHE_TTL from constants/tokens.ts (60 s).
 */
let priceCache: {
  expiresAt: number;
  prices:  Record<string, number>;
  changes: Record<string, number>;
} | null = null;

export interface PricePayload {
  /** USD price per token. */
  prices:  Record<string, number>;
  /**
   * 24-hour percentage change from CoinGecko.
   * Only present for tokens with a coingeckoId.
   */
  changes: Record<string, number>;
}

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

function fallbackPriceData(symbols: string[]): PricePayload {
  return {
    prices: symbols.reduce<Record<string, number>>((acc, sym) => {
      const cfg = PRICE_TOKENS[sym];
      if (cfg) acc[sym] = cfg.fallbackUSD;
      return acc;
    }, {}),
    changes: {},
  };
}

async function fetchLivePriceData(): Promise<PricePayload> {
  const now = Date.now();

  if (priceCache && priceCache.expiresAt > now) {
    return { prices: priceCache.prices, changes: priceCache.changes };
  }

  /* Build id -> symbol[] mapping (multiple symbols can share one CoinGecko id) */
  const idToSymbols = new Map<string, string[]>();
  for (const [sym, cfg] of Object.entries(PRICE_TOKENS)) {
    if (!cfg.coingeckoId) continue;
    const existing = idToSymbols.get(cfg.coingeckoId) ?? [];
    existing.push(sym);
    idToSymbols.set(cfg.coingeckoId, existing);
  }

  const ids = Array.from(idToSymbols.keys()).join(",");

  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price` +
    `?ids=${ids}` +
    `&vs_currencies=usd` +
    `&include_24hr_change=true`,
    {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: Math.floor(PRICE_CACHE_TTL / 1_000) },
    },
  );

  if (!response.ok) {
    throw new Error(`CoinGecko responded with ${response.status}`);
  }

  const data = (await response.json()) as Record<
    string,
    { usd?: number; usd_24h_change?: number }
  >;

  const prices  = fallbackPriceData(Object.keys(PRICE_TOKENS)).prices;
  const changes: Record<string, number> = {};

  for (const [id, symbols] of idToSymbols.entries()) {
    const entry = data[id];
    if (!entry) continue;

    const price  = entry.usd;
    const change = entry.usd_24h_change;

    for (const sym of symbols) {
      if (typeof price === "number" && Number.isFinite(price) && price > 0) {
        prices[sym] = price;
      }
      if (typeof change === "number" && Number.isFinite(change)) {
        changes[sym] = change;
      }
    }
  }

  priceCache = { expiresAt: now + PRICE_CACHE_TTL, prices, changes };
  return { prices, changes };
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawSymbols = searchParams.get("symbols");
  const requestedSymbols: string[] = rawSymbols
    ? rawSymbols.split(",").map((s) => s.trim()).filter((s) => s in PRICE_TOKENS)
    : Object.keys(PRICE_TOKENS);
  const uniqueSymbols = Array.from(new Set(requestedSymbols));

  let payload: PricePayload;
  try {
    payload = await fetchLivePriceData();
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[api/rpc/prices] CoinGecko error — using fallback", err);
    }
    payload = fallbackPriceData(Object.keys(PRICE_TOKENS));
  }

  const filteredPrices:  Record<string, number> = {};
  const filteredChanges: Record<string, number> = {};

  for (const sym of uniqueSymbols) {
    if (sym in payload.prices)  filteredPrices[sym]  = payload.prices[sym];
    if (sym in payload.changes) filteredChanges[sym] = payload.changes[sym];
  }

  return jsonResponse(
    { status: "ok", data: { prices: filteredPrices, changes: filteredChanges } },
    200,
  );
}
