import { NextResponse } from "next/server";
import { getNFTCollections, NFT_MARKET_CURRENCY } from "@/lib/nfts";

export const revalidate = 60;

export async function GET() {
  try {
    const { collections, source } = await getNFTCollections();

    return NextResponse.json(
      {
        status: "ok",
        source,
        updatedAt: new Date().toISOString(),
        currency: NFT_MARKET_CURRENCY,
        data: {
          collections,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[nfts] Could not load collections", error);
    }

    return NextResponse.json(
      {
        status: "error",
        error: "Failed to load NFT collections",
      },
      { status: 500 },
    );
  }
}
