import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { fetchDealRadarRaw } from "@/lib/dealRadarServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

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
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Number(searchParams.get("limit") ?? "25");
    const offset = Number(searchParams.get("offset") ?? "0");

    if (!Number.isFinite(limit) || limit <= 0) {
      return NextResponse.json(
        { error: "Invalid limit" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }
    if (!Number.isFinite(offset) || offset < 0) {
      return NextResponse.json(
        { error: "Invalid offset" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const data = await fetchDealRadarRaw({ limit, offset, token });
    return NextResponse.json(data, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error("Error fetching deal radar:", error);
    return NextResponse.json(
      { error: "Failed to fetch deal radar" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
