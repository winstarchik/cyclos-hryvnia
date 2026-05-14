import { NextRequest, NextResponse } from "next/server";
import {
  isValidAuthEmail,
  isValidAuthPassword,
  normalizeAuthEmail,
} from "@/lib/server/authInput";
import { findUserByEmail, recordUserLogin } from "@/lib/server/accounts";
import { verifyPassword } from "@/lib/server/password";
import {
  clearOtpCookie,
  getOtpTokenFromRequest,
  verifyOtpToken,
} from "@/lib/server/otp";
import { attachSessionCookie } from "@/lib/server/session";
import { checkRateLimit, getRateLimitKey } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

function authError(error: string, message: string, status: number) {
  return NextResponse.json({ status: "error", error, message }, { status });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { email?: unknown; code?: unknown; password?: unknown }
    | null;
  const email =
    typeof body?.email === "string" ? normalizeAuthEmail(body.email) : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!isValidAuthEmail(email)) {
    return authError("INVALID_EMAIL", "Enter a valid email address.", 400);
  }

  if (!/^\d{6}$/.test(code)) {
    return authError("INVALID_CODE", "Enter the 6-digit code from your email.", 400);
  }

  if (!isValidAuthPassword(password)) {
    return authError("INVALID_PASSWORD", "Enter your account password.", 400);
  }

  const rateLimit = checkRateLimit(
    getRateLimitKey(request, `login:${email}`),
    10,
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
    if (!user) {
      return authError(
        "ACCOUNT_NOT_FOUND",
        "No account was found for this email. Register first.",
        404,
      );
    }

    const otpResult = await verifyOtpToken(
      getOtpTokenFromRequest(request),
      email,
      code,
      "login",
    );

    if (otpResult.ok !== true) {
      return authError(
        otpResult.reason === "expired" ? "CODE_EXPIRED" : "INVALID_CODE",
        otpResult.reason === "expired"
          ? "The code expired. Request a new one."
          : "The code is incorrect. Please try again.",
        401,
      );
    }

    const passwordOk = await verifyPassword(
      password,
      user.passwordHash,
      user.passwordSalt,
    );

    if (!passwordOk) {
      return authError(
        "INVALID_CREDENTIALS",
        "The email or password is incorrect.",
        401,
      );
    }

    await recordUserLogin(user.email, request.headers.get("user-agent")).catch(
      (error) => {
        if (process.env.NODE_ENV !== "production") {
          console.error("Login device capture failed:", error);
        }
      },
    );

    const response = NextResponse.json({
      status: "ok",
      data: {
        user: {
          id: user.id,
          email: user.email,
        },
      },
    });

    attachSessionCookie(response, user);
    return clearOtpCookie(response);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Account login failed:", error);
    }

    return authError(
      "AUTH_DEPENDENCY_UNAVAILABLE",
      "Sign in is temporarily unavailable. Please try again shortly.",
      503,
    );
  }
}
