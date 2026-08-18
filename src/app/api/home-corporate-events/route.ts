import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { fetchHomeCorporateEventsRaw } from "@/lib/homeCorporateEventsServer";

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

    const showFollowed =
      request.nextUrl.searchParams.get("show_followed") === "true";
    if (showFollowed) {
      const url = new URL(
        "https://xdil-abvj-o7rq.e2.xano.io/api:5YnK3rYr/corporate_events"
      );
      url.searchParams.set("show_followed", "true");
      const userId = request.nextUrl.searchParams.get("user_id");
      if (userId) url.searchParams.set("user_id", userId);

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Data-Source": "live",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: `API error: ${response.status}` },
          { status: response.status }
        );
      }

      return NextResponse.json(await response.json());
    }

    const data = await fetchHomeCorporateEventsRaw({ token });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching home corporate events:", error);
    return NextResponse.json(
      { error: "Failed to fetch corporate events" },
      { status: 500 }
    );
  }
}
