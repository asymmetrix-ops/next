import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const XANO_CHANGE_REQUEST_URL =
  process.env.XANO_CHANGE_REQUEST_URL ||
  "https://xdil-abvj-o7rq.e2.xano.io/api:DmVo_1KR/change_request";

/** Defaults when query params are omitted (matches Xano filter payload). */
const DEFAULT_CHANGE_REQUEST = {
  type: "companies",
  page: "1",
  per_page: "50",
} as const;

function mergeChangeRequestParams(request: NextRequest): URLSearchParams {
  const sp = new URLSearchParams(request.nextUrl.searchParams);
  if (!sp.has("type")) sp.set("type", DEFAULT_CHANGE_REQUEST.type);
  if (!sp.has("page")) sp.set("page", DEFAULT_CHANGE_REQUEST.page);
  if (!sp.has("per_page")) sp.set("per_page", DEFAULT_CHANGE_REQUEST.per_page);
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

    const sp = mergeChangeRequestParams(request);
    const qs = sp.toString();
    const url = `${XANO_CHANGE_REQUEST_URL}?${qs}`;

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
        /* keep raw text */
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
    console.error("[change-request]", e);
    return NextResponse.json(
      { error: "Failed to proxy change_request" },
      { status: 500 }
    );
  }
}
