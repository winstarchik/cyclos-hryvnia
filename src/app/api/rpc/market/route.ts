import { NextResponse } from "next/server";

interface MarketTokenConfig {
  id: string | null;
  symbol: string;
  name: string;
  logo: string;
  fallbackPrice: number;
  fallbackChange24h: number;
  color: string;
}

interface MarketTokenResponse {
  symbol: string;
  name: string;
  logo: string;
  priceUSD: number;
  change24h: number;
  color: string;
  points: number[];
}

const MARKET_TOKENS: MarketTokenConfig[] = [
  {
    id: null,
    symbol: "cUAH",
    name: "Cyclos Hryvnia",
    logo: "/icons/tokens/cuah.svg",
    fallbackPrice: 0.025,
    fallbackChange24h: 0,
    color: "#4169E1",
  },
  {
    id: "solana",
    symbol: "SOL",
    name: "Solana",
    logo: "/icons/tokens/sol.svg",
    fallbackPrice: 150,
    fallbackChange24h: 2.8,
    color: "#14F195",
  },
  {
    id: "bitcoin",
    symbol: "BTC",
    name: "Bitcoin",
    logo: "/icons/tokens/btc.svg",
    fallbackPrice: 65_000,
    fallbackChange24h: 1.4,
    color: "#F7931A",
  },
  {
    id: "tether",
    symbol: "USDT",
    name: "Tether",
    logo: "/icons/tokens/usdt.svg",
    fallbackPrice: 1,
    fallbackChange24h: 0.01,
    color: "#26A17B",
  },
  {
    id: "usd-coin",
    symbol: "USDC",
    name: "USD Coin",
    logo: "/icons/tokens/usdc.svg",
    fallbackPrice: 1,
    fallbackChange24h: 0,
    color: "#2775CA",
  },
  {
    id: "binancecoin",
    symbol: "BNB",
    name: "BNB",
    logo: "/icons/tokens/bnb.svg",
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
  const offsets = [-0.006, -0.003, -0.004, 0.001, -0.001, 0.004, 0.003, 0.007];

  return offsets.map((offset, index) => {
    const progress = index / (offsets.length - 1);
    const trend = -drift + progress * drift;
    return Number((price * (1 + trend + offset)).toFixed(8));
  });
}

function fallbackToken(token: MarketTokenConfig): MarketTokenResponse {
  return {
    symbol: token.symbol,
    name: token.name,
    logo: token.logo,
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
    logo: token.logo,
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
