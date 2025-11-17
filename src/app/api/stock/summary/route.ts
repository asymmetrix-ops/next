import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";

// Yahoo Finance integration temporarily disabled; this API now returns a 503
export async function GET(request: NextRequest) {
  noStore();

  const searchParams = request.nextUrl.searchParams;
  const ticker = searchParams.get("ticker");

  if (!ticker) {
    return NextResponse.json(
      { error: "Missing ticker parameter" },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { error: "Stock summary API is temporarily disabled." },
    { status: 503 }
  );
}
