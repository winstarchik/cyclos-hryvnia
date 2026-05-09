import { NextRequest, NextResponse } from "next/server";
import { sendLoginCodeEmail } from "@/lib/server/email";
import {
  attachOtpCookie,
  createOtpToken,
  generateEmailCode,
} from "@/lib/server/otp";
import { isValidAuthEmail, normalizeAuthEmail } from "@/lib/server/authInput";
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

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { email?: unknown }
    | null;
  const email =
    typeof body?.email === "string" ? normalizeAuthEmail(body.email) : "";

  if (!isValidAuthEmail(email)) {
    return authError("INVALID_EMAIL", "Enter a valid email address.", 400);
  }

  const rateLimit = checkRateLimit(getRateLimitKey(request, email), 5, 60_000);
  if (!rateLimit.allowed) {
    return authError(
      "RATE_LIMITED",
      `Too many attempts. Try again in ${rateLimit.retryAfter} seconds.`,
      429,
    );
  }

  try {
    const code = generateEmailCode();
    await sendLoginCodeEmail(email, code);

    const response = NextResponse.json({
      status: "ok",
      data: {
        maskedEmail: maskEmail(email),
      },
    });

    return attachOtpCookie(response, createOtpToken(email, code));
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Email code request failed:", error);
    }

    return authError(
      "EMAIL_SERVICE_UNAVAILABLE",
      "We could not send the login code. Please try again shortly.",
      503,
    );
  }
}
