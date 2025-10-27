import { NextRequest, NextResponse } from "next/server";
import { fetchStockSearch } from "@/lib/yahoo-finance/fetchStockSearch";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ticker = searchParams.get("ticker");

    if (!ticker) {
      return NextResponse.json(
        { error: "Missing ticker parameter" },
        { status: 400 }
      );
    }

    const data = await fetchStockSearch(ticker);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching news data:", error);
    return NextResponse.json(
      { error: "Failed to fetch news data" },
      { status: 500 }
    );
  }
}
