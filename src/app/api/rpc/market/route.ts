import { NextResponse } from "next/server";

interface MarketTokenConfig {
  id: string | null;
  symbol: string;
  name: string;
  fallbackPrice: number;
  fallbackChange24h: number;
  color: string;
}

interface MarketTokenResponse {
  symbol: string;
  name: string;
  priceUSD: number;
  change24h: number;
  color: string;
  points: number[];
}

const MARKET_TOKENS: MarketTokenConfig[] = [
  {
    id: "solana",
    symbol: "SOL",
    name: "Solana",
    fallbackPrice: 150,
    fallbackChange24h: 2.8,
    color: "#14F195",
  },
  {
    id: "bitcoin",
    symbol: "BTC",
    name: "Bitcoin",
    fallbackPrice: 65_000,
    fallbackChange24h: 1.4,
    color: "#F7931A",
  },
  {
    id: "tether",
    symbol: "USDT",
    name: "Tether",
    fallbackPrice: 1,
    fallbackChange24h: 0.01,
    color: "#26A17B",
  },
  {
    id: "usd-coin",
    symbol: "USDC",
    name: "USD Coin",
    fallbackPrice: 1,
    fallbackChange24h: 0,
    color: "#2775CA",
  },
  {
    id: null,
    symbol: "cUAH",
    name: "Cyclos Hryvnia",
    fallbackPrice: 0.024,
    fallbackChange24h: 0,
    color: "#4169E1",
  },
  {
    id: "binancecoin",
    symbol: "BNB",
    name: "BNB",
    fallbackPrice: 600,
    fallbackChange24h: 1.1,
    color: "#F3BA2F",
  },
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
};

function fallbackPoints(price: number, change24h: number): number[] {
  const drift = change24h / 100;
  return Array.from({ length: 24 }).map((_, index) => {
    const progress = index / 23;
    const wave = Math.sin(index * 0.75) * 0.006;
    return Number((price * (1 - drift + progress * drift + wave)).toFixed(8));
  });
}

function fallbackToken(token: MarketTokenConfig): MarketTokenResponse {
  return {
    symbol: token.symbol,
    name: token.name,
    priceUSD: token.fallbackPrice,
    change24h: token.fallbackChange24h,
    color: token.color,
    points: fallbackPoints(token.fallbackPrice, token.fallbackChange24h),
  };
}

async function fetchCoinGeckoToken(
  token: MarketTokenConfig,
): Promise<MarketTokenResponse> {
  if (!token.id) {
    return fallbackToken(token);
  }

  const response = await fetch(
    `https://api.coingecko.com/api/v3/coins/${token.id}/market_chart?vs_currency=usd&days=7&interval=daily`,
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

  const data = (await response.json()) as {
    prices?: Array<[number, number]>;
  };
  const points =
    data.prices
      ?.map(([, price]) => Number(price))
      .filter((price) => Number.isFinite(price) && price > 0) ?? [];

  if (points.length === 0) {
    return fallbackToken(token);
  }

  const first = points[0];
  const last = points[points.length - 1];
  const previous = points.at(-2) ?? first;
  const change24h = previous > 0 ? ((last - previous) / previous) * 100 : 0;

  return {
    symbol: token.symbol,
    name: token.name,
    priceUSD: last,
    change24h,
    color: token.color,
    points,
  };
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET() {
  const market = await Promise.all(
    MARKET_TOKENS.map(async (token) => {
      try {
        return await fetchCoinGeckoToken(token);
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error(`Market chart fallback for ${token.symbol}`, error);
        }
        return fallbackToken(token);
      }
    }),
  );

  return NextResponse.json(
    {
      status: "ok",
      data: market,
      source: "coingecko",
    },
    {
      status: 200,
      headers: corsHeaders,
    },
  );
}
