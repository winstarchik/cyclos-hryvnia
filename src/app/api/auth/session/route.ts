import { NextRequest, NextResponse } from "next/server";
import {
  clearSessionCookie,
  getSessionFromRequest,
} from "@/lib/server/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json(
      { status: "error", error: "UNAUTHENTICATED" },
      { status: 401 },
    );
  }

  return NextResponse.json({
    status: "ok",
    data: {
      user: {
        id: session.sub,
        email: session.email,
      },
    },
  });
}

export async function DELETE() {
  const response = NextResponse.json({ status: "ok" });
  return clearSessionCookie(response);
}
