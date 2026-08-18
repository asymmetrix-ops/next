import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { fetchCompanyLinkedInServer } from "@/lib/companyLinkedInServer";

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

    const data = await fetchCompanyLinkedInServer(params.id, token);
    if (!data) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching company LinkedIn data:", error);
    return NextResponse.json(
      { error: "Failed to fetch company LinkedIn data" },
      { status: 500 }
    );
  }
}
