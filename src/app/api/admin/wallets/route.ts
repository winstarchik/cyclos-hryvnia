import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAdminApiSecret } from "@/lib/env";
import { listRegisteredWallets } from "@/lib/server/accounts";

function readBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  return request.headers.get("x-admin-secret")?.trim() ?? "";
}

function isValidAdminToken(request: NextRequest) {
  const secret = getAdminApiSecret();
  if (!secret) return false;

  const token = readBearerToken(request);
  const tokenBuffer = Buffer.from(token);
  const secretBuffer = Buffer.from(secret);

  return (
    tokenBuffer.length === secretBuffer.length &&
    timingSafeEqual(tokenBuffer, secretBuffer)
  );
}

export async function GET(request: NextRequest) {
  if (!getAdminApiSecret()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isValidAdminToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const wallets = await listRegisteredWallets();
    return NextResponse.json(
      {
        status: "ok",
        data: {
          count: wallets.length,
          fundedCount: wallets.filter((wallet) => wallet.walletPublicKey).length,
          wallets,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to list registered wallets:", error);
    }

    return NextResponse.json(
      { error: "Failed to list registered wallets" },
      { status: 500 },
    );
  }
}
