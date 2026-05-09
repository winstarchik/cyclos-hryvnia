import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookie } from "@/lib/server/session";
import { checkRateLimit, getRateLimitKey } from "@/lib/server/rateLimit";
import {
  createUser,
  findUserByEmail,
  isValidAuthEmail,
  isValidAuthPassword,
  normalizeAuthEmail,
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

    if (existingUser) {
      return authError(
        "ACCOUNT_EXISTS",
        "An account with this email already exists. Please log in.",
        409,
      );
    }

    const user = await createUser(normalizedEmail, password);
    const response = NextResponse.json(
      { status: "ok", data: { user } },
      { status: 201 },
    );

    return attachSessionCookie(response, user);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Registration failed:", error);
    }

    return authError(
      "AUTH_SERVICE_UNAVAILABLE",
      "Authentication is temporarily unavailable. Please try again shortly.",
      503,
    );
  }
}
