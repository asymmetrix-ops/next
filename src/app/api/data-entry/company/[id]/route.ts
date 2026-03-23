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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getToken(_request);
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const url = `${XANO_BASE}/${id}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        data?.error || data?.message || "Failed to fetch company",
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[data-entry/company] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch company" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = getToken(request);
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const url = `${XANO_BASE}/${id}`;
    const body = await request.text();

    const res = await fetch(url, {
      method: "PATCH",
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
        data?.error || data?.message || "Failed to update company",
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[data-entry/company] PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update company" },
      { status: 500 }
    );
  }
}
