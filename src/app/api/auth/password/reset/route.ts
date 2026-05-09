import { NextRequest, NextResponse } from "next/server";
import { isValidAuthPassword } from "@/lib/server/authInput";
import { findUserByEmail, updateUserPassword } from "@/lib/server/accounts";
import { hashPassword } from "@/lib/server/password";
import { verifyPasswordResetToken } from "@/lib/server/resetToken";
import { attachSessionCookie } from "@/lib/server/session";
import { checkRateLimit, getRateLimitKey } from "@/lib/server/rateLimit";

export const runtime = "nodejs";

function authError(error: string, message: string, status: number) {
  return NextResponse.json({ status: "error", error, message }, { status });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { token?: unknown; password?: unknown; confirmPassword?: unknown }
    | null;
  const token = typeof body?.token === "string" ? body.token : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const confirmPassword =
    typeof body?.confirmPassword === "string" ? body.confirmPassword : "";
  const payload = verifyPasswordResetToken(token);

  if (!payload) {
    return authError(
      "INVALID_RESET_TOKEN",
      "This reset link is invalid or expired.",
      400,
    );
  }

  if (!isValidAuthPassword(password)) {
    return authError("INVALID_PASSWORD", "Password must be 8-128 characters.", 400);
  }

  if (password !== confirmPassword) {
    return authError("PASSWORD_MISMATCH", "Passwords do not match.", 400);
  }

  const rateLimit = checkRateLimit(
    getRateLimitKey(request, `reset:${payload.email}`),
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
    const user = await findUserByEmail(payload.email);

    if (
      !user ||
      user.id !== payload.sub ||
      user.passwordUpdatedAt !== payload.passwordUpdatedAt
    ) {
      return authError(
        "INVALID_RESET_TOKEN",
        "This reset link is invalid or expired.",
        400,
      );
    }

    const { passwordHash, passwordSalt } = await hashPassword(password);
    const updatedUser = await updateUserPassword(
      user.email,
      passwordHash,
      passwordSalt,
    );

    if (!updatedUser) {
      return authError(
        "ACCOUNT_NOT_FOUND",
        "No account was found for this reset link.",
        404,
      );
    }

    const response = NextResponse.json({
      status: "ok",
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
        },
      },
    });

    return attachSessionCookie(response, updatedUser);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Password reset failed:", error);
    }

    return authError(
      "AUTH_DEPENDENCY_UNAVAILABLE",
      "Password reset is temporarily unavailable. Please try again shortly.",
      503,
    );
  }
}
