import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { fetchCompanyCapitalRadarServer } from "@/lib/companyCapitalRadarServer";

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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getToken(request);
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const data = await fetchCompanyCapitalRadarServer(params.id, token);
    if (!data) {
      return NextResponse.json(
        { error: "Capital radar data not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching company capital radar:", error);
    return NextResponse.json(
      { error: "Failed to fetch company capital radar" },
      { status: 500 }
    );
  }
}
