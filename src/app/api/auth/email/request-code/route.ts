import { NextRequest, NextResponse } from "next/server";
import { isValidAuthEmail, normalizeAuthEmail } from "@/lib/server/authInput";
import { findUserByEmail } from "@/lib/server/accounts";
import { sendAuthCodeEmail } from "@/lib/server/email";
import {
  attachOtpCookie,
  createOtpToken,
  generateEmailCode,
  type OtpPurpose,
} from "@/lib/server/otp";
import { checkRateLimit, getRateLimitKey } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

function authError(error: string, message: string, status: number) {
  return NextResponse.json({ status: "error", error, message }, { status });
}

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;
  const visible = name.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(2, name.length - 2))}@${domain}`;
}

function parseMode(mode: unknown): OtpPurpose | null {
  return mode === "login" || mode === "register" ? mode : null;
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { email?: unknown; mode?: unknown }
    | null;
  const email =
    typeof body?.email === "string" ? normalizeAuthEmail(body.email) : "";
  const mode = parseMode(body?.mode);

  if (!isValidAuthEmail(email)) {
    return authError("INVALID_EMAIL", "Enter a valid email address.", 400);
  }

  if (!mode) {
    return authError("INVALID_MODE", "Choose sign in or registration.", 400);
  }

  const rateLimit = checkRateLimit(
    getRateLimitKey(request, `${mode}:${email}`),
    5,
    60_000,
  );
  if (!rateLimit.allowed) {
    return authError(
      "RATE_LIMITED",
      `Too many attempts. Try again in ${rateLimit.retryAfter} seconds.`,
      429,
    );
  }

  try {
    const existingUser = await findUserByEmail(email);

    if (mode === "login" && !existingUser) {
      return authError(
        "ACCOUNT_NOT_FOUND",
        "No account was found for this email. Register first.",
        404,
      );
    }

    if (mode === "register" && existingUser) {
      return authError(
        "ACCOUNT_EXISTS",
        "An account with this email already exists. Sign in instead.",
        409,
      );
    }

    const code = generateEmailCode();
    await sendAuthCodeEmail(email, code, mode);

    const response = NextResponse.json({
      status: "ok",
      data: {
        maskedEmail: maskEmail(email),
      },
    });

    return attachOtpCookie(response, createOtpToken(email, code, mode));
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Email code request failed:", error);
    }

    return authError(
      "AUTH_DEPENDENCY_UNAVAILABLE",
      "Account verification is temporarily unavailable. Please try again shortly.",
      503,
    );
  }
}
