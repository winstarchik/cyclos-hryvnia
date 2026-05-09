import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookie } from "@/lib/server/session";
import {
  clearOtpCookie,
  emailToStableUserId,
  getOtpTokenFromRequest,
  verifyOtpToken,
} from "@/lib/server/otp";
import { isValidAuthEmail, normalizeAuthEmail } from "@/lib/server/authInput";
import { checkRateLimit, getRateLimitKey } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

function authError(error: string, message: string, status: number) {
  return NextResponse.json({ status: "error", error, message }, { status });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { email?: unknown; code?: unknown }
    | null;
  const email =
    typeof body?.email === "string" ? normalizeAuthEmail(body.email) : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";

  if (!isValidAuthEmail(email)) {
    return authError("INVALID_EMAIL", "Enter a valid email address.", 400);
  }

  if (!/^\d{6}$/.test(code)) {
    return authError("INVALID_CODE", "Enter the 6-digit code from your email.", 400);
  }

  const rateLimit = checkRateLimit(getRateLimitKey(request, email), 10, 60_000);
  if (!rateLimit.allowed) {
    return authError(
      "RATE_LIMITED",
      `Too many attempts. Try again in ${rateLimit.retryAfter} seconds.`,
      429,
    );
  }

  const result = verifyOtpToken(getOtpTokenFromRequest(request), email, code);

  if (result.ok !== true) {
    return authError(
      result.reason === "expired" ? "CODE_EXPIRED" : "INVALID_CODE",
      result.reason === "expired"
        ? "The code expired. Request a new one."
        : "The code is incorrect. Please try again.",
      401,
    );
  }

  const verifiedEmail = result.email ?? email;
  const user = {
    email: verifiedEmail,
    id: emailToStableUserId(verifiedEmail),
  };
  const response = NextResponse.json({ status: "ok", data: { user } });
  attachSessionCookie(response, user);
  return clearOtpCookie(response);
}
