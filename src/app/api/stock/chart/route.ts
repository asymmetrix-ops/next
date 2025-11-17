import { NextRequest, NextResponse } from "next/server";

// Stock chart API temporarily disabled; no external finance dependency
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ticker = searchParams.get("ticker");

  if (!ticker) {
    return NextResponse.json(
      { error: "Missing ticker parameter" },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { error: "Stock chart API is temporarily disabled." },
    { status: 503 }
  );
}
