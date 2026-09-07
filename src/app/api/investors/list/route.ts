import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  fetchInvestorsListRaw,
  isInitialInvestorsListParams,
} from "@/lib/investorsListServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  const searchParams = request.nextUrl.searchParams;
  const { ok: isInitial } = isInitialInvestorsListParams(searchParams);

  const token = getToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await fetchInvestorsListRaw({ token, searchParams });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[INVESTORS LIST]", message);
    return NextResponse.json(
      { error: message, initial: isInitial },
      { status: 502 }
    );
  }
}
