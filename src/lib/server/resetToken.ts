import { createHmac, timingSafeEqual } from "node:crypto";
import { getAuthSecret } from "@/lib/env";
import type { AccountUser } from "@/lib/server/accounts";

const RESET_TTL_SECONDS = 60 * 30;

interface PasswordResetPayload {
  purpose: "password-reset";
  sub: string;
  email: string;
  passwordUpdatedAt: string;
  exp: number;
}

function signPayload(payload: string) {
  return createHmac("sha256", getAuthSecret())
    .update(payload)
    .digest("base64url");
}

export function createPasswordResetToken(user: AccountUser) {
  const payload: PasswordResetPayload = {
    purpose: "password-reset",
    sub: user.id,
    email: user.email,
    passwordUpdatedAt: user.passwordUpdatedAt,
    exp: Math.floor(Date.now() / 1000) + RESET_TTL_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyPasswordResetToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload);
  const received = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as PasswordResetPayload;

    if (
      payload.purpose !== "password-reset" ||
      !payload.sub ||
      !payload.email ||
      !payload.passwordUpdatedAt ||
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
