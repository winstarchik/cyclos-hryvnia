import { createHash, createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAuthSecret } from "@/lib/env";
import { consumeOneTimeToken } from "@/lib/server/oneTimeTokens";

export const OTP_COOKIE_NAME = "cyclos_email_otp";
const OTP_TTL_SECONDS = 60 * 10;

export type OtpPurpose = "login" | "register";

interface OtpPayload {
  jti: string;
  email: string;
  purpose: OtpPurpose;
  codeHash: string;
  exp: number;
}

function signPayload(payload: string) {
  return createHmac("sha256", getAuthSecret())
    .update(payload)
    .digest("base64url");
}

function hashCode(email: string, code: string) {
  return createHmac("sha256", getAuthSecret())
    .update(`${email.trim().toLowerCase()}:${code.trim()}`)
    .digest("hex");
}

export function generateEmailCode() {
  return randomInt(100_000, 1_000_000).toString();
}

export function createOtpToken(
  email: string,
  code: string,
  purpose: OtpPurpose,
) {
  const payload: OtpPayload = {
    codeHash: hashCode(email, code),
    email: email.trim().toLowerCase(),
    jti: randomUUID(),
    purpose,
    exp: Math.floor(Date.now() / 1000) + OTP_TTL_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export async function verifyOtpToken(
  token: string | undefined,
  email: string,
  code: string,
  purpose: OtpPurpose,
) {
  if (!token) {
    return { ok: false, reason: "missing" as const };
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return { ok: false, reason: "invalid" as const };
  }

  const expectedSignature = signPayload(encodedPayload);
  const received = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return { ok: false, reason: "invalid" as const };
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as OtpPayload;
    const normalizedEmail = email.trim().toLowerCase();

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return { ok: false, reason: "expired" as const };
    }

    if (!payload.jti) {
      return { ok: false, reason: "invalid" as const };
    }

    if (payload.email !== normalizedEmail) {
      return { ok: false, reason: "invalid" as const };
    }

    if (payload.purpose !== purpose) {
      return { ok: false, reason: "invalid" as const };
    }

    const incomingHash = Buffer.from(hashCode(normalizedEmail, code), "hex");
    const storedHash = Buffer.from(payload.codeHash, "hex");

    if (
      incomingHash.length !== storedHash.length ||
      !timingSafeEqual(incomingHash, storedHash)
    ) {
      return { ok: false, reason: "invalid" as const };
    }

    const consumed = await consumeOneTimeToken(
      payload.jti,
      `email-otp:${payload.purpose}`,
      payload.exp,
    );

    if (!consumed) {
      return { ok: false, reason: "consumed" as const };
    }

    return { ok: true, email: normalizedEmail } as const;
  } catch {
    return { ok: false, reason: "invalid" as const };
  }
}

export function attachOtpCookie(response: NextResponse, token: string) {
  response.cookies.set(OTP_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: OTP_TTL_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

export function clearOtpCookie(response: NextResponse) {
  response.cookies.set(OTP_COOKIE_NAME, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

export function getOtpTokenFromRequest(request: NextRequest) {
  return request.cookies.get(OTP_COOKIE_NAME)?.value;
}

export function emailToStableUserId(email: string) {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}
