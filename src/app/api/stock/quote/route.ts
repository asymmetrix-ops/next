import { NextRequest, NextResponse } from "next/server";
import { fetchQuote } from "@/lib/yahoo-finance/fetchQuote";

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

    const data = await fetchQuote(ticker);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching quote data:", error);
    return NextResponse.json(
      { error: "Failed to fetch quote data" },
      { status: 500 }
    );
  }
}
