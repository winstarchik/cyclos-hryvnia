import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getTelegramBotToken } from "@/lib/env";
import type { TMAUser } from "@/lib/tmaTypes";

export const runtime = "nodejs";

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function verifyTelegramInitData(initData: string) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");

  if (!hash) return null;

  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData")
    .update(getTelegramBotToken())
    .digest();
  const expectedHash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (!safeEqual(hash, expectedHash)) return null;

  const authDate = Number(params.get("auth_date") ?? 0);
  if (!Number.isFinite(authDate) || authDate <= 0) return null;

  const maxAgeSeconds = 60 * 60 * 24;
  if (Math.floor(Date.now() / 1000) - authDate > maxAgeSeconds) return null;

  const rawUser = params.get("user");
  if (!rawUser) return null;

  try {
    const user = JSON.parse(rawUser) as {
      id?: number | string;
      username?: string;
      is_premium?: boolean;
    };
    const userId =
      user.id === undefined || user.id === null ? null : String(user.id);

    if (!userId) return null;

    return {
      userId,
      username: user.username ?? null,
      isPremium: Boolean(user.is_premium),
      startParam: params.get("start_param"),
      platform: "telegram",
    } satisfies TMAUser;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | { initData?: unknown; platform?: unknown }
    | null;
  const initData = typeof body?.initData === "string" ? body.initData : "";

  if (!initData) {
    return NextResponse.json(
      { status: "error", error: "MISSING_INIT_DATA" },
      { status: 400 },
    );
  }

  const user = verifyTelegramInitData(initData);
  if (!user) {
    return NextResponse.json(
      { status: "error", error: "INVALID_INIT_DATA" },
      { status: 401 },
    );
  }

  return NextResponse.json(
    {
      status: "ok",
      data: {
        user: {
          ...user,
          platform:
            typeof body?.platform === "string" && body.platform
              ? body.platform
              : user.platform,
        },
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
