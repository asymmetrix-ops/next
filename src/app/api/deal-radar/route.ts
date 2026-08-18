import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { fetchDealRadarRaw } from "@/lib/dealRadarServer";

export const dynamic = "force-dynamic";

function getToken(request: NextRequest): string | null {
  const cookieToken = cookies().get("asymmetrix_auth_token")?.value;
  if (cookieToken) return cookieToken;

  const auth =
    request.headers.get("authorization") ||
    request.headers.get("Authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const token = getToken(request);
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Number(searchParams.get("limit") ?? "25");
    const offset = Number(searchParams.get("offset") ?? "0");

    if (!Number.isFinite(limit) || limit <= 0) {
      return NextResponse.json({ error: "Invalid limit" }, { status: 400 });
    }
    if (!Number.isFinite(offset) || offset < 0) {
      return NextResponse.json({ error: "Invalid offset" }, { status: 400 });
    }

    const data = await fetchDealRadarRaw({ limit, offset, token });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching deal radar:", error);
    return NextResponse.json(
      { error: "Failed to fetch deal radar" },
      { status: 500 }
    );
  }
}
