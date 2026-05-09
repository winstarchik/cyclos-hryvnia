import { NextRequest, NextResponse } from "next/server";
import { isValidAuthEmail, normalizeAuthEmail } from "@/lib/server/authInput";
import { findUserByEmail } from "@/lib/server/accounts";
import { sendPasswordResetEmail } from "@/lib/server/email";
import { createPasswordResetToken } from "@/lib/server/resetToken";
import { checkRateLimit, getRateLimitKey } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

function authError(error: string, message: string, status: number) {
  return NextResponse.json({ status: "error", error, message }, { status });
}

function parseLocale(value: unknown) {
  return value === "en" || value === "ua" || value === "ru" ? value : "en";
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { email?: unknown; locale?: unknown }
    | null;
  const email =
    typeof body?.email === "string" ? normalizeAuthEmail(body.email) : "";
  const locale = parseLocale(body?.locale);

  if (!isValidAuthEmail(email)) {
    return authError("INVALID_EMAIL", "Enter a valid email address.", 400);
  }

  const rateLimit = checkRateLimit(
    getRateLimitKey(request, `forgot:${email}`),
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
    const user = await findUserByEmail(email);

    if (user) {
      const resetToken = createPasswordResetToken(user);
      const resetUrl = `${request.nextUrl.origin}/${locale}/reset-password?token=${encodeURIComponent(resetToken)}`;
      await sendPasswordResetEmail(user.email, resetUrl);
    }

    return NextResponse.json({
      status: "ok",
      data: {
        sent: true,
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Password reset request failed:", error);
    }

    return authError(
      "AUTH_DEPENDENCY_UNAVAILABLE",
      "Password recovery is temporarily unavailable. Please try again shortly.",
      503,
    );
  }
}
