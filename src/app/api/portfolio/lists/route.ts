import { NextResponse } from "next/server";

const XANO_LISTS_BASE = "https://xdil-abvj-o7rq.e2.xano.io/api:jlAOWruI";

async function fetchWithAuth(
  url: string,
  token: string,
  init: Omit<RequestInit, "headers"> & { headers?: Record<string, string> } = {}
) {
  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers || {}),
  };

  // Try Bearer first; fall back to bare token if Xano returns 401
  let resp = await fetch(url, {
    ...init,
    headers: { ...baseHeaders, Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (resp.status === 401) {
    resp = await fetch(url, {
      ...init,
      headers: { ...baseHeaders, Authorization: token },
      cache: "no-store",
    });
  }

  return resp;
}

/** POST /api/portfolio/lists — create a named portfolio in Xano. */
export async function POST(req: Request) {
  try {
    const { cookies, headers } = await import("next/headers");
    const tokenCookie = (await cookies()).get("asymmetrix_auth_token")?.value;
    const reqHeaders = await headers();
    const tokenHeader = reqHeaders.get("x-asym-token");
    const authHeader = reqHeaders.get("authorization");
    const tokenFromAuth =
      authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

    const token = tokenCookie || tokenHeader || tokenFromAuth;
    if (!token) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

    const label =
      body && typeof body.label === "string" ? body.label.trim() : null;

    if (!label) {
      return NextResponse.json(
        { error: "label is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    const upstream = await fetchWithAuth(
      `${XANO_LISTS_BASE}/create/portfolio`,
      token,
      {
        method: "POST",
        body: JSON.stringify({ label }),
      }
    );

    const text = await upstream.text().catch(() => "");
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Upstream error", statusText: upstream.statusText, data },
        { status: upstream.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal error", message: (e as Error).message },
      { status: 500 }
    );
  }
}
