import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { fetchHomeCorporateEventsRaw } from "@/lib/homeCorporateEventsServer";

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

    const showFollowed =
      request.nextUrl.searchParams.get("show_followed") === "true";
    const userIdParam = request.nextUrl.searchParams.get("user_id");
    const userId =
      userIdParam != null && userIdParam !== ""
        ? Number(userIdParam)
        : undefined;

    const data = await fetchHomeCorporateEventsRaw({
      token,
      showFollowed,
      userId: Number.isFinite(userId) ? userId : undefined,
    });

    return NextResponse.json(data, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error("Error fetching home corporate events:", error);
    return NextResponse.json(
      { error: "Failed to fetch corporate events" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
