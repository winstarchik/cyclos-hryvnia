import { NextRequest, NextResponse } from "next/server";
import { getAdminApiSecret, getAdminEmail } from "@/lib/env";
import {
  attachAdminOtpCookie,
  createAdminOtpToken,
  generateAdminCode,
  isValidAdminSecret,
  maskEmail,
} from "@/lib/server/adminAuth";
import { sendAdminCodeEmail } from "@/lib/server/email";
import { checkRateLimit, getRateLimitKey } from "@/lib/server/rateLimit";

export async function POST(request: NextRequest) {
  if (!getAdminApiSecret()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isValidAdminSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminEmail = getAdminEmail();
  if (!adminEmail) {
    return NextResponse.json(
      { error: "Admin email is not configured" },
      { status: 503 },
    );
  }

  const rateLimit = checkRateLimit(
    getRateLimitKey(request, `admin-code:${adminEmail}`),
    3,
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

  try {
    const code = generateAdminCode();
    const response = NextResponse.json(
      {
        status: "ok",
        data: {
          email: maskEmail(adminEmail),
        },
      },
      { status: 200 },
    );

    await sendAdminCodeEmail(adminEmail, code);
    return attachAdminOtpCookie(response, createAdminOtpToken(adminEmail, code));
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to send admin code:", error);
    }

    return NextResponse.json(
      { error: "Failed to send admin code" },
      { status: 500 },
    );
  }
}

