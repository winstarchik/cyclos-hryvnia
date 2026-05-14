import { NextRequest, NextResponse } from "next/server";
import {
  clearSessionCookie,
  getSessionFromRequest,
} from "@/lib/server/session";
import {
  clearCsrfCookie,
  csrfErrorResponse,
  verifyCsrfRequest,
} from "@/lib/server/csrf";

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

export async function DELETE(request: NextRequest) {
  if (!verifyCsrfRequest(request)) {
    return csrfErrorResponse();
  }

  const response = NextResponse.json({ status: "ok" });
  clearSessionCookie(response);
  return clearCsrfCookie(response);
}
