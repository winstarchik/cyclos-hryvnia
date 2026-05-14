import { NextRequest, NextResponse } from "next/server";
import {
  isValidAuthEmail,
  isValidAuthPassword,
  normalizeAuthEmail,
} from "@/lib/server/authInput";
import {
  createUserAccount,
  findUserByEmail,
  recordUserLogin,
} from "@/lib/server/accounts";
import { hashPassword } from "@/lib/server/password";
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
    | {
        email?: unknown;
        code?: unknown;
        password?: unknown;
        confirmPassword?: unknown;
      }
    | null;
  const email =
    typeof body?.email === "string" ? normalizeAuthEmail(body.email) : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const confirmPassword =
    typeof body?.confirmPassword === "string" ? body.confirmPassword : "";

  if (!isValidAuthEmail(email)) {
    return authError("INVALID_EMAIL", "Enter a valid email address.", 400);
  }

  if (!/^\d{6}$/.test(code)) {
    return authError("INVALID_CODE", "Enter the 6-digit code from your email.", 400);
  }

  if (!isValidAuthPassword(password)) {
    return authError("INVALID_PASSWORD", "Password must be 8-128 characters.", 400);
  }

  if (password !== confirmPassword) {
    return authError("PASSWORD_MISMATCH", "Passwords do not match.", 400);
  }

  const rateLimit = checkRateLimit(
    getRateLimitKey(request, `register:${email}`),
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
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return authError(
        "ACCOUNT_EXISTS",
        "An account with this email already exists. Sign in instead.",
        409,
      );
    }

    const otpResult = verifyOtpToken(
      getOtpTokenFromRequest(request),
      email,
      code,
      "register",
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

    const { passwordHash, passwordSalt } = await hashPassword(password);
    const user = await createUserAccount(email, passwordHash, passwordSalt);
    await recordUserLogin(user.email, request.headers.get("user-agent")).catch(
      (error) => {
        if (process.env.NODE_ENV !== "production") {
          console.error("Registration device capture failed:", error);
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
      console.error("Account registration failed:", error);
    }

    return authError(
      "AUTH_DEPENDENCY_UNAVAILABLE",
      "Registration is temporarily unavailable. Please try again shortly.",
      503,
    );
  }
}
