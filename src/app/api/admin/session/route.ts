import { NextRequest, NextResponse } from "next/server";
import { clearAdminSessionCookies } from "@/lib/server/adminAuth";
import { csrfErrorResponse, verifyCsrfRequest } from "@/lib/server/csrf";

export async function DELETE(request: NextRequest) {
  if (!verifyCsrfRequest(request)) {
    return csrfErrorResponse();
  }

  const response = NextResponse.json({ status: "ok" }, { status: 200 });
  return clearAdminSessionCookies(response);
}
