import { NextRequest, NextResponse } from "next/server";

// Hardcoded prices for MVP. Integrate Jupiter Price API in Phase 2, then add
// 5-minute caching, real-time updates, and broader token coverage.
const PRICES: Record<string, number> = {
  SOL: 180,
  USDC: 1,
  cUAH: 0.01,
  WBTC: 40_000,
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "no-store",
};

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: corsHeaders,
  });
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbols = searchParams
    .get("symbols")
    ?.split(",")
    .map((symbol) => symbol.trim())
    .filter(Boolean) ?? [];

  if (symbols.length === 0) {
    return jsonResponse(
      {
        status: "ok",
        data: PRICES,
      },
      200,
    );
  }

  const filteredPrices: Record<string, number> = {};

  for (const symbol of symbols) {
    if (symbol in PRICES) {
      filteredPrices[symbol] = PRICES[symbol];
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
