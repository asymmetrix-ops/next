import { NextRequest, NextResponse } from "next/server";
import { fetchChartData } from "@/lib/yahoo-finance/fetchChartData";
import type { Interval, Range } from "@/types/yahoo-finance";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ticker = searchParams.get("ticker");
    const range = searchParams.get("range") as Range;
    const interval = searchParams.get("interval") as Interval;

    if (!ticker || !range || !interval) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const data = await fetchChartData(ticker, range, interval);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching chart data:", error);
    return NextResponse.json(
      { error: "Failed to fetch chart data" },
      { status: 500 }
    );
  }
}
