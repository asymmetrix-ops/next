import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const XANO_GET_CHANGE_STATE_ALL =
  process.env.XANO_GET_CHANGE_STATE_ALL_URL ||
  "https://xdil-abvj-o7rq.e2.xano.io/api:DmVo_1KR/get_change_state_all";

const DEFAULT_PAGE = "1";
const DEFAULT_PER_PAGE = "50";

function mergeParams(request: NextRequest): URLSearchParams {
  const sp = new URLSearchParams(request.nextUrl.searchParams);
  if (!sp.has("page")) sp.set("page", DEFAULT_PAGE);
  if (!sp.has("per_page")) sp.set("per_page", DEFAULT_PER_PAGE);
  return sp;
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token =
      cookieStore.get("asymmetrix_auth_token")?.value ||
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const sp = mergeParams(request);
    const qs = sp.toString();
    const url = `${XANO_GET_CHANGE_STATE_ALL}?${qs}`;

    const resp = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const text = await resp.text();
    if (!resp.ok) {
      let details: unknown = text;
      try {
        details = JSON.parse(text);
      } catch {
        /* keep raw */
      }
      return NextResponse.json(
        {
          error: `Xano error ${resp.status}`,
          details,
        },
        { status: 502 }
      );
    }

    try {
      const data = JSON.parse(text) as unknown;
      return NextResponse.json(data);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON from Xano", details: text },
        { status: 502 }
      );
    }
  } catch (e) {
    console.error("[change-state-all]", e);
    return NextResponse.json(
      { error: "Failed to proxy get_change_state_all" },
      { status: 500 }
    );
  }
}
