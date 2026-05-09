import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookie } from "@/lib/server/session";
import { checkRateLimit, getRateLimitKey } from "@/lib/server/rateLimit";
import {
  findUserByEmail,
  isValidAuthEmail,
  isValidAuthPassword,
  normalizeAuthEmail,
  verifyUserLogin,
} from "@/lib/server/users";

export const runtime = "nodejs";

async function readAuthBody(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { email?: unknown; password?: unknown }
    | null;

  return {
    email: typeof body?.email === "string" ? body.email : "",
    password: typeof body?.password === "string" ? body.password : "",
  };
}

function authError(error: string, message: string, status: number) {
  return NextResponse.json({ status: "error", error, message }, { status });
}

export async function POST(request: NextRequest) {
  const { email, password } = await readAuthBody(request);
  const normalizedEmail = normalizeAuthEmail(email);

  if (!isValidAuthEmail(normalizedEmail)) {
    return authError("INVALID_EMAIL", "Enter a valid email address.", 400);
  }

  if (!isValidAuthPassword(password)) {
    return authError(
      "INVALID_PASSWORD",
      "Password must be between 8 and 128 characters.",
      400,
    );
  }

  const rateLimit = checkRateLimit(getRateLimitKey(request, normalizedEmail));
  if (!rateLimit.allowed) {
    return authError(
      "RATE_LIMITED",
      `Too many attempts. Try again in ${rateLimit.retryAfter} seconds.`,
      429,
    );
  }

  try {
    const existingUser = await findUserByEmail(normalizedEmail);

    if (!existingUser) {
      return authError(
        "ACCOUNT_NOT_FOUND",
        "No account was found for this email. Please register first.",
        404,
      );
    }

    const user = await verifyUserLogin(normalizedEmail, password);

    if (!user) {
      return authError(
        "INVALID_CREDENTIALS",
        "The email or password is incorrect.",
        401,
      );
    }

    const response = NextResponse.json({ status: "ok", data: { user } });
    return attachSessionCookie(response, user);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Login failed:", error);
    }

    return authError(
      "AUTH_SERVICE_UNAVAILABLE",
      "Authentication is temporarily unavailable. Please try again shortly.",
      503,
    );
  }
}
