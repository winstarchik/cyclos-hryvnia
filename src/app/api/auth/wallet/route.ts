import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import {
  getUserEncryptedWallet,
  setUserEncryptedWallet,
  type EncryptedWalletRecord,
} from "@/lib/server/accounts";
import { getSessionFromRequest } from "@/lib/server/session";

export const runtime = "nodejs";

function authError(error: string, message: string, status: number) {
  return NextResponse.json({ status: "error", error, message }, { status });
}

function isEncryptedWalletRecord(value: unknown): value is EncryptedWalletRecord {
  if (!value || typeof value !== "object") return false;

  const wallet = value as Partial<EncryptedWalletRecord>;

  if (
    wallet.version !== 1 ||
    wallet.kdf !== "PBKDF2-SHA256" ||
    typeof wallet.publicKey !== "string" ||
    typeof wallet.cipherText !== "string" ||
    typeof wallet.iv !== "string" ||
    typeof wallet.salt !== "string" ||
    typeof wallet.iterations !== "number"
  ) {
    return false;
  }

  try {
    new PublicKey(wallet.publicKey);
    return wallet.iterations >= 100_000 && wallet.iterations <= 1_000_000;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);

  if (!session) {
    return authError("UNAUTHENTICATED", "Sign in first.", 401);
  }

  try {
    const wallet = await getUserEncryptedWallet(session.email);

    return NextResponse.json(
      {
        status: "ok",
        data: {
          wallet,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Wallet vault lookup failed:", error);
    }

    return authError(
      "WALLET_LOOKUP_FAILED",
      "Wallet setup is temporarily unavailable. Please try again.",
      503,
    );
  }
}

export async function PUT(request: NextRequest) {
  const session = getSessionFromRequest(request);

  if (!session) {
    return authError("UNAUTHENTICATED", "Sign in first.", 401);
  }

  const body = (await request.json().catch(() => null)) as
    | { wallet?: unknown }
    | null;

  if (!isEncryptedWalletRecord(body?.wallet)) {
    return authError("INVALID_WALLET", "Wallet payload is invalid.", 400);
  }

  try {
    const wallet = await setUserEncryptedWallet(session.email, body.wallet);

    if (!wallet) {
      return authError("ACCOUNT_NOT_FOUND", "Account was not found.", 404);
    }

    return NextResponse.json(
      {
        status: "ok",
        data: {
          wallet,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Wallet vault save failed:", error);
    }

    return authError(
      "WALLET_SAVE_FAILED",
      "Wallet setup is temporarily unavailable. Please try again.",
      503,
    );
  }
}

