import { NextResponse } from "next/server";
import { attachCsrfCookie, createCsrfToken } from "@/lib/server/csrf";

export const runtime = "nodejs";

export async function GET() {
  const csrfToken = createCsrfToken();
  const response = NextResponse.json(
    {
      status: "ok",
      data: {
        csrfToken,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );

  return attachCsrfCookie(response, csrfToken);
}
