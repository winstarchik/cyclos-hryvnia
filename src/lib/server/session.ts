import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAuthSecret } from "@/lib/env";
import type { AuthUser } from "@/lib/server/authInput";

export const SESSION_COOKIE_NAME = "cyclos_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const SESSION_VERSION = 2;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

interface SessionPayload {
  ver: typeof SESSION_VERSION;
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

function signPayload(payload: string) {
  return createHmac("sha256", getAuthSecret())
    .update(payload)
    .digest("base64url");
}

export function createSessionToken(user: AuthUser) {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    ver: SESSION_VERSION,
    sub: user.id,
    email: user.email,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string | undefined) {
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
    ) as SessionPayload;

    if (
      payload.ver !== SESSION_VERSION ||
      !payload.sub ||
      !payload.email ||
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getSessionFromRequest(request: NextRequest) {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}

export function attachSessionCookie(response: NextResponse, user: AuthUser) {
  response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(user), {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? "none" : "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  return response;
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? "none" : "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
