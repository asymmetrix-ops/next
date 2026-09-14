import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const CAPITAL_RADAR_API_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:aRPLxo_v:develop";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const token =
      cookieStore.get("asymmetrix_auth_token")?.value ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const companyId = params.id;
    if (!companyId) {
      return NextResponse.json(
        { error: "Missing company id" },
        { status: 400 }
      );
    }

    const apiUrl = `${CAPITAL_RADAR_API_BASE}/company/${encodeURIComponent(
      companyId
    )}/capital_radar`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching capital radar:", error);
    return NextResponse.json(
      { error: "Failed to fetch capital radar" },
      { status: 500 }
    );
  }
}
