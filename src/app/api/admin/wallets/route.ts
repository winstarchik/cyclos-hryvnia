import { NextRequest, NextResponse } from "next/server";
import { getAdminApiSecret } from "@/lib/env";
import { getAdminSessionFromRequest, isValidAdminSecret } from "@/lib/server/adminAuth";
import { listRegisteredWallets } from "@/lib/server/accounts";

export async function GET(request: NextRequest) {
  if (!getAdminApiSecret()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (request.headers.has("authorization") && !isValidAdminSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!getAdminSessionFromRequest(request)) {
    return NextResponse.json(
      { error: "Admin email verification required" },
      { status: 403 },
    );
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
