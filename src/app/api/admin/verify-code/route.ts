import { NextRequest, NextResponse } from "next/server";
import { getAdminApiSecret } from "@/lib/env";
import {
  attachAdminSessionCookie,
  clearAdminOtpCookie,
  getAdminOtpFromRequest,
  isValidAdminSecret,
  verifyAdminOtpToken,
} from "@/lib/server/adminAuth";
import { checkRateLimit, getRateLimitKey } from "@/lib/server/rateLimit";

export async function POST(request: NextRequest) {
  if (!getAdminApiSecret()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isValidAdminSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { code?: string };
  try {
    body = (await request.json()) as { code?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const code = body.code?.trim() ?? "";
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { error: "Enter the 6-digit email code" },
      { status: 400 },
    );
  }

  const rateLimit = checkRateLimit(
    getRateLimitKey(request, "admin-verify"),
    6,
    60_000,
  );

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `Too many attempts. Try again in ${rateLimit.retryAfter} seconds.`,
      },
      { status: 429 },
    );
  }

  if (!verifyAdminOtpToken(getAdminOtpFromRequest(request), code)) {
    return NextResponse.json(
      { error: "Wrong or expired admin code" },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ status: "ok" }, { status: 200 });
  attachAdminSessionCookie(response);
  clearAdminOtpCookie(response);

  return response;
}

