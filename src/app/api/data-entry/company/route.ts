import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const XANO_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:Zy_LlXuz/new_company";

function getToken(request: NextRequest): string | null {
  const cookieStore = cookies();
  const fromCookie = cookieStore.get("asymmetrix_auth_token")?.value;
  if (fromCookie) return fromCookie;
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const token = getToken(request);
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.text();

    const res = await fetch(XANO_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body || "{}",
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        data?.error || data?.message || "Failed to create company",
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[data-entry/company] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create company" },
      { status: 500 }
    );
  }
}
