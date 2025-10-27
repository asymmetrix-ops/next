import { NextRequest, NextResponse } from "next/server";
import yahooFinance from "yahoo-finance2";
import { unstable_noStore as noStore } from "next/cache";

export async function GET(request: NextRequest) {
  noStore();

  try {
    const searchParams = request.nextUrl.searchParams;
    const ticker = searchParams.get("ticker");
    const modulesParam = searchParams.get("modules");

    if (!ticker) {
      return NextResponse.json(
        { error: "Missing ticker parameter" },
        { status: 400 }
      );
    }

    // Determine which modules to fetch
    const modules = modulesParam
      ? [modulesParam]
      : ["summaryDetail", "defaultKeyStatistics"];

    const data = await yahooFinance.quoteSummary(ticker, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      modules: modules as any,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching summary data:", error);
    return NextResponse.json(
      { error: "Failed to fetch summary data" },
      { status: 500 }
    );
  }
}
