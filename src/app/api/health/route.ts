import { NextResponse } from "next/server";
import { handleError, logDevError } from "@/lib/errors";

export async function GET() {
  try {
    const healthcheck = {
      status: "ok",
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(healthcheck, { status: 200 });
  } catch (error) {
    const appError = handleError(error);
    logDevError("[api/health] Health check failed", error);

    return NextResponse.json(
      {
        error: {
          code: appError.code,
          message: "Health check is temporarily unavailable.",
        },
      },
      { status: 500 },
    );
  }
}
