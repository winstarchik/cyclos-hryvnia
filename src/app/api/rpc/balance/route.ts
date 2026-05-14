import { PublicKey } from "@solana/web3.js";
import { NextRequest, NextResponse } from "next/server";
import { getAllTokenAccounts, getSOLBalance } from "@/lib/solana";
import { logDevError } from "@/lib/errors";

const corsHeaders = {
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "no-store",
  Vary: "Origin",
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");

  if (!address) {
    return jsonResponse({ error: "Address is required" }, 400);
  }

  try {
    // Validate address before RPC calls. Rate limiting and server-side caching
    // can be added here in Phase 2.
    new PublicKey(address);

    const [sol, tokenAccounts] = await Promise.all([
      getSOLBalance(address),
      getAllTokenAccounts(address),
    ]);

    return jsonResponse(
      {
        status: "ok",
        data: {
          sol,
          tokens: tokenAccounts,
        },
      },
      200,
    );
  } catch (error) {
    logDevError("[api/rpc/balance] Error fetching balance", error);

    return jsonResponse({ error: "Failed to fetch balance" }, 500);
  }
}
