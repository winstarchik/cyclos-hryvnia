import { PublicKey } from "@solana/web3.js";
import { NextRequest, NextResponse } from "next/server";
import { getTransactionHistory } from "@/lib/solana";
import { logDevError } from "@/lib/errors";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  const rawLimit = searchParams.get("limit");
  const limit = rawLimit ? Number.parseInt(rawLimit, 10) : DEFAULT_LIMIT;

  if (!address) {
    return jsonResponse({ error: "Address is required" }, 400);
  }

  if (
    (rawLimit !== null && !/^\d+$/.test(rawLimit)) ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > MAX_LIMIT
  ) {
    return jsonResponse({ error: "Limit must be between 1 and 100" }, 400);
  }

  try {
    // Validate address before RPC calls. Cursor pagination can be added here
    // in Phase 2 without changing the response envelope.
    new PublicKey(address);

    const transactions = await getTransactionHistory(address, limit);

    return jsonResponse(
      {
        status: "ok",
        data: {
          transactions,
          count: transactions.length,
          limit,
        },
      },
      200,
    );
  } catch (error) {
    logDevError("[api/rpc/transactions] Error fetching transactions", error);

    return jsonResponse({ error: "Failed to fetch transactions" }, 500);
  }
}
