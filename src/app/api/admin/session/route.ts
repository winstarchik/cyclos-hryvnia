import { NextResponse } from "next/server";
import { clearAdminSessionCookies } from "@/lib/server/adminAuth";

export async function DELETE() {
  const response = NextResponse.json({ status: "ok" }, { status: 200 });
  return clearAdminSessionCookies(response);
}

