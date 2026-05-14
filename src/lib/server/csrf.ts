import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAuthSecret } from "@/lib/env";

export const CSRF_HEADER_NAME = "x-csrf-token";
export const CSRF_COOKIE_NAME =
  process.env.NODE_ENV === "production" ? "__Host-cyclos_csrf" : "cyclos_csrf";

const CSRF_TTL_SECONDS = 60 * 60 * 6;
const CSRF_VERSION = 1;

interface CsrfPayload {
  ver: typeof CSRF_VERSION;
  nonce: string;
  iat: number;
  exp: number;
}

function signPayload(payload: string) {
  return createHmac("sha256", getAuthSecret())
    .update(payload)
    .digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  return origin === request.nextUrl.origin;
}

function getRawCookieValue(request: NextRequest, name: string) {
  const rawCookie = request.headers.get("cookie");
  if (!rawCookie) return undefined;

  for (const segment of rawCookie.split(";")) {
    const [rawName, ...rawValueParts] = segment.trim().split("=");
    if (rawName === name) {
      return rawValueParts.join("=");
    }
  }

  return undefined;
}

export function createCsrfToken() {
  const now = Math.floor(Date.now() / 1000);
  const payload: CsrfPayload = {
    ver: CSRF_VERSION,
    nonce: randomBytes(24).toString("base64url"),
    iat: now,
    exp: now + CSRF_TTL_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyCsrfToken(token: string | undefined) {
  if (!token) return false;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return false;

  const expectedSignature = signPayload(encodedPayload);
  if (!safeEqual(signature, expectedSignature)) return false;

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as CsrfPayload;

    return (
      payload.ver === CSRF_VERSION &&
      typeof payload.nonce === "string" &&
      payload.exp >= Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}

export function attachCsrfCookie(response: NextResponse, token: string) {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
    maxAge: CSRF_TTL_SECONDS,
  });

  return response;
}

export function clearCsrfCookie(response: NextResponse) {
  response.cookies.set(CSRF_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}

export function verifyCsrfRequest(request: NextRequest) {
  if (!isSameOrigin(request)) return false;

  const headerToken = request.headers.get(CSRF_HEADER_NAME) ?? undefined;
  const cookieToken =
    request.cookies.get(CSRF_COOKIE_NAME)?.value ??
    getRawCookieValue(request, CSRF_COOKIE_NAME);

  if (!headerToken || !verifyCsrfToken(headerToken)) return false;

  // Some in-app webviews can drop Secure cookies during local testing. The
  // signed header token remains the CSRF gate; when the cookie arrives, also
  // enforce double-submit equality.
  if (cookieToken && !safeEqual(headerToken, cookieToken)) return false;

  return true;
}

export function csrfErrorResponse() {
  return NextResponse.json(
    {
      status: "error",
      error: "CSRF_VALIDATION_FAILED",
      message: "Security check failed. Refresh the page and try again.",
    },
    { status: 403 },
  );
}
