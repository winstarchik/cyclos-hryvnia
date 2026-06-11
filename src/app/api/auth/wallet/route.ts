import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import {
  getUserEncryptedWallet,
  setUserEncryptedWallet,
  type EncryptedWalletRecord,
} from "@/lib/server/accounts";
import { csrfErrorResponse, verifyCsrfRequest } from "@/lib/server/csrf";
import { getSessionFromRequest } from "@/lib/server/session";

export const runtime = "nodejs";

const MAX_WALLET_CIPHERTEXT_BYTES = 4_096;
const WALLET_IV_BYTES = 12;
const WALLET_SALT_BYTES = 16;
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

function authError(error: string, message: string, status: number) {
  return NextResponse.json({ status: "error", error, message }, { status });
}

function getBase64ByteLength(value: string, maxBytes: number) {
  if (
    value.length === 0 ||
    value.length > Math.ceil(maxBytes / 3) * 4 ||
    value.length % 4 !== 0 ||
    !BASE64_PATTERN.test(value)
  ) {
    return null;
  }

  try {
    return Buffer.from(value, "base64").byteLength;
  } catch {
    return null;
  }
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
    const cipherTextBytes = getBase64ByteLength(
      wallet.cipherText,
      MAX_WALLET_CIPHERTEXT_BYTES,
    );
    const ivBytes = getBase64ByteLength(wallet.iv, WALLET_IV_BYTES);
    const saltBytes = getBase64ByteLength(wallet.salt, WALLET_SALT_BYTES);

    return (
      Number.isInteger(wallet.iterations) &&
      wallet.iterations >= 100_000 &&
      wallet.iterations <= 1_000_000 &&
      cipherTextBytes !== null &&
      cipherTextBytes >= 16 &&
      cipherTextBytes <= MAX_WALLET_CIPHERTEXT_BYTES &&
      ivBytes === WALLET_IV_BYTES &&
      saltBytes === WALLET_SALT_BYTES
    );
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
  if (!verifyCsrfRequest(request)) {
    return csrfErrorResponse();
  }

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
