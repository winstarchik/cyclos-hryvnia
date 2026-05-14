import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAdminApiSecret, getAdminEmail, getAuthSecret } from "@/lib/env";
import { consumeOneTimeToken } from "@/lib/server/oneTimeTokens";

export const ADMIN_OTP_COOKIE_NAME = "cyclos_admin_otp";
export const ADMIN_SESSION_COOKIE_NAME = "cyclos_admin_session";

const ADMIN_OTP_TTL_SECONDS = 60 * 10;
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 6;
const ADMIN_TOKEN_VERSION = 1;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

interface AdminOtpPayload {
  ver: typeof ADMIN_TOKEN_VERSION;
  jti: string;
  email: string;
  nonce: string;
  codeHash: string;
  exp: number;
}

interface AdminSessionPayload {
  ver: typeof ADMIN_TOKEN_VERSION;
  email: string;
  iat: number;
  exp: number;
}

function signPayload(payload: string) {
  return createHmac("sha256", getAuthSecret())
    .update(payload)
    .digest("base64url");
}

function encodeSignedPayload(payload: object) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

function decodeSignedPayload<T>(token: string | undefined): T | null {
  if (!token) return null;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = signPayload(encodedPayload);
  const received = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return null;
  }

  try {
    return JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as T;
  } catch {
    return null;
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getConfiguredAdminEmail() {
  const email = getAdminEmail();
  return email ? normalizeEmail(email) : undefined;
}

function hashAdminCode(email: string, code: string, nonce: string) {
  return createHmac("sha256", getAuthSecret())
    .update(`${normalizeEmail(email)}:${nonce}:${code.trim()}`)
    .digest("hex");
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function readAdminBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  return request.headers.get("x-admin-secret")?.trim() ?? "";
}

export function isValidAdminSecret(request: NextRequest) {
  const secret = getAdminApiSecret();
  if (!secret) return false;

  return safeCompare(readAdminBearerToken(request), secret);
}

export function generateAdminCode() {
  return randomInt(100_000, 1_000_000).toString();
}

export function maskEmail(email: string) {
  const [name = "", domain = ""] = email.split("@");
  if (!domain) return email;

  const visibleName =
    name.length <= 2 ? `${name[0] ?? "*"}*` : `${name.slice(0, 2)}***${name.slice(-1)}`;

  return `${visibleName}@${domain}`;
}

export function createAdminOtpToken(email: string, code: string) {
  const normalizedEmail = normalizeEmail(email);
  const nonce = randomUUID();
  const payload: AdminOtpPayload = {
    ver: ADMIN_TOKEN_VERSION,
    email: normalizedEmail,
    jti: randomUUID(),
    nonce,
    codeHash: hashAdminCode(normalizedEmail, code, nonce),
    exp: Math.floor(Date.now() / 1000) + ADMIN_OTP_TTL_SECONDS,
  };

  return encodeSignedPayload(payload);
}

export async function verifyAdminOtpToken(token: string | undefined, code: string) {
  const payload = decodeSignedPayload<AdminOtpPayload>(token);
  const adminEmail = getConfiguredAdminEmail();

  if (!payload || !adminEmail || payload.ver !== ADMIN_TOKEN_VERSION) return false;
  if (!payload.jti) return false;
  if (payload.email !== adminEmail) return false;
  if (payload.exp < Math.floor(Date.now() / 1000)) return false;

  const codeMatches = safeCompare(
    hashAdminCode(payload.email, code, payload.nonce),
    payload.codeHash,
  );

  if (!codeMatches) return false;

  return consumeOneTimeToken(payload.jti, "admin-otp", payload.exp);
}

export function createAdminSessionToken() {
  const adminEmail = getConfiguredAdminEmail();
  if (!adminEmail) {
    throw new Error("Missing admin email");
  }

  const now = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    ver: ADMIN_TOKEN_VERSION,
    email: adminEmail,
    iat: now,
    exp: now + ADMIN_SESSION_TTL_SECONDS,
  };

  return encodeSignedPayload(payload);
}

export function getAdminSessionFromRequest(request: NextRequest) {
  const payload = decodeSignedPayload<AdminSessionPayload>(
    request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value,
  );
  const adminEmail = getConfiguredAdminEmail();

  if (!payload || !adminEmail || payload.ver !== ADMIN_TOKEN_VERSION) return null;
  if (payload.email !== adminEmail) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;

  return payload;
}

export function getAdminOtpFromRequest(request: NextRequest) {
  return request.cookies.get(ADMIN_OTP_COOKIE_NAME)?.value;
}

export function attachAdminOtpCookie(response: NextResponse, token: string) {
  response.cookies.set(ADMIN_OTP_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: ADMIN_OTP_TTL_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: IS_PRODUCTION,
  });

  return response;
}

export function attachAdminSessionCookie(response: NextResponse) {
  response.cookies.set(ADMIN_SESSION_COOKIE_NAME, createAdminSessionToken(), {
    httpOnly: true,
    maxAge: ADMIN_SESSION_TTL_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: IS_PRODUCTION,
  });

  return response;
}

export function clearAdminOtpCookie(response: NextResponse) {
  response.cookies.set(ADMIN_OTP_COOKIE_NAME, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: IS_PRODUCTION,
  });

  return response;
}

export function clearAdminSessionCookies(response: NextResponse) {
  clearAdminOtpCookie(response);
  response.cookies.set(ADMIN_SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: IS_PRODUCTION,
  });

  return response;
}
