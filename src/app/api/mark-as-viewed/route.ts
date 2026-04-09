import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const XANO_MARK_AS_VIEWED_URL =
  process.env.XANO_MARK_AS_VIEWED_URL ||
  "https://xdil-abvj-o7rq.e2.xano.io/api:DmVo_1KR/mark_as_viewed";

export async function POST(request: NextRequest) {
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const rawIds = (body as { change_state_id?: unknown })?.change_state_id;
    if (!Array.isArray(rawIds)) {
      return NextResponse.json(
        { error: "change_state_id must be an array" },
        { status: 400 }
      );
    }

    const change_state_id = rawIds.filter(
      (x): x is number =>
        typeof x === "number" && Number.isFinite(x)
    );

    if (change_state_id.length !== rawIds.length) {
      return NextResponse.json(
        { error: "change_state_id must contain only numbers" },
        { status: 400 }
      );
    }

    const resp = await fetch(XANO_MARK_AS_VIEWED_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ change_state_id }),
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
      const data = text ? (JSON.parse(text) as unknown) : null;
      return NextResponse.json(data ?? { ok: true });
    } catch {
      return NextResponse.json({ ok: true, raw: text });
    }
  } catch (e) {
    console.error("[mark-as-viewed]", e);
    return NextResponse.json(
      { error: "Failed to proxy mark_as_viewed" },
      { status: 500 }
    );
  }
}
