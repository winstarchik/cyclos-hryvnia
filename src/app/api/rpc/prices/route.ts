import { NextRequest, NextResponse } from "next/server";

interface PriceTokenConfig {
  coingeckoId: string | null;
  fallbackUSD: number;
}

const PRICE_CACHE_TTL_MS = 5 * 60 * 1000;

const PRICE_TOKENS: Record<string, PriceTokenConfig> = {
  SOL: { coingeckoId: "solana", fallbackUSD: 150 },
  USDC: { coingeckoId: "usd-coin", fallbackUSD: 1 },
  USDT: { coingeckoId: "tether", fallbackUSD: 1 },
  WBTC: { coingeckoId: "bitcoin", fallbackUSD: 65_000 },
  BTC: { coingeckoId: "bitcoin", fallbackUSD: 65_000 },
  BNB: { coingeckoId: "binancecoin", fallbackUSD: 600 },
  cUAH: { coingeckoId: null, fallbackUSD: 0.024 },
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
};

let priceCache:
  | {
      expiresAt: number;
      prices: Record<string, number>;
    }
  | null = null;

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: corsHeaders,
  });
}

function fallbackPrices(symbols: string[]): Record<string, number> {
  return symbols.reduce<Record<string, number>>((prices, symbol) => {
    const token = PRICE_TOKENS[symbol];
    if (token) {
      prices[symbol] = token.fallbackUSD;
    }
    return prices;
  }, {});
}

async function fetchLivePrices(): Promise<Record<string, number>> {
  const now = Date.now();

  if (priceCache && priceCache.expiresAt > now) {
    return priceCache.prices;
  }

  const idToSymbols = new Map<string, string[]>();

  for (const [symbol, token] of Object.entries(PRICE_TOKENS)) {
    if (!token.coingeckoId) continue;

    const symbols = idToSymbols.get(token.coingeckoId) ?? [];
    symbols.push(symbol);
    idToSymbols.set(token.coingeckoId, symbols);
  }

  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${Array.from(
      idToSymbols.keys(),
    ).join(",")}&vs_currencies=usd`,
    {
      headers: {
        accept: "application/json",
      },
      next: {
        revalidate: 300,
      },
      signal: AbortSignal.timeout(8_000),
    },
  );

  if (!response.ok) {
    throw new Error(`CoinGecko responded with ${response.status}`);
  }

  const data = (await response.json()) as Record<string, { usd?: number }>;
  const prices = fallbackPrices(Object.keys(PRICE_TOKENS));

  for (const [id, symbols] of idToSymbols.entries()) {
    const price = data[id]?.usd;

    if (typeof price === "number" && Number.isFinite(price) && price > 0) {
      for (const symbol of symbols) {
        prices[symbol] = price;
      }
    }
  }

  priceCache = {
    expiresAt: now + PRICE_CACHE_TTL_MS,
    prices,
  };

  return prices;
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbols = searchParams
    .get("symbols")
    ?.split(",")
    .map((symbol) => symbol.trim())
    .filter((symbol) => symbol in PRICE_TOKENS) ?? [];
  const requestedSymbols =
    symbols.length > 0 ? Array.from(new Set(symbols)) : Object.keys(PRICE_TOKENS);
  let prices: Record<string, number>;

  try {
    prices = await fetchLivePrices();
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Price fallback is active", error);
    }
    prices = fallbackPrices(Object.keys(PRICE_TOKENS));
  }

  const filteredPrices: Record<string, number> = {};

  for (const symbol of requestedSymbols) {
    if (symbol in prices) {
      filteredPrices[symbol] = prices[symbol];
    }
  }

  return jsonResponse(
    {
      status: "ok",
      data: filteredPrices,
    },
    200,
  );
}
