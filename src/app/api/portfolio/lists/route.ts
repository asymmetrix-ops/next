import { NextResponse } from "next/server";

const XANO_LISTS_BASE = "https://xdil-abvj-o7rq.e2.xano.io/api:jlAOWruI";
const XANO_PORTFOLIO_BASE = "https://xdil-abvj-o7rq.e2.xano.io/api:xbsQ0H4R:develop";
const XANO_AUTH_BASE =
  process.env.NEXT_PUBLIC_XANO_API_URL ||
  "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6:develop";

async function fetchWithAuth(
  url: string,
  token: string,
  init: Omit<RequestInit, "headers"> & { headers?: Record<string, string> } = {}
) {
  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers || {}),
  };

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

async function getUserId(token: string): Promise<number | null> {
  const resp = await fetchWithAuth(`${XANO_AUTH_BASE}/auth/me`, token, {
    method: "GET",
  });
  if (!resp.ok) return null;
  const data = (await resp.json().catch(() => null)) as { id?: unknown } | null;
  const raw = data?.id;
  const id =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
      ? Number.parseInt(raw, 10)
      : null;
  return id != null && Number.isFinite(id) ? id : null;
}

function extractToken(req: Request, cookieHeader: string | null, tokenHeader: string | null, authHeader: string | null) {
  void req;
  const fromAuth = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  return cookieHeader || tokenHeader || fromAuth || null;
}

// ---------------------------------------------------------------------------
// GET /api/portfolio/lists — fetch all user portfolios from Xano
// ---------------------------------------------------------------------------
export async function GET(req: Request) {
  try {
    const { cookies, headers } = await import("next/headers");
    const tokenCookie = (await cookies()).get("asymmetrix_auth_token")?.value ?? null;
    const reqHeaders = await headers();
    const tokenHeader = reqHeaders.get("x-asym-token");
    const authHeader = reqHeaders.get("authorization");

    const token = extractToken(req, tokenCookie, tokenHeader, authHeader);
    if (!token) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    const userId = await getUserId(token);
    if (userId == null) {
      return NextResponse.json({ error: "Auth failed" }, { status: 401 });
    }

    const upstream = await fetchWithAuth(
      `${XANO_PORTFOLIO_BASE}/get_users_portfolio?user_id=${encodeURIComponent(String(userId))}`,
      token,
      { method: "GET" }
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

// ---------------------------------------------------------------------------
// POST /api/portfolio/lists — create a named portfolio in Xano
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  try {
    const { cookies, headers } = await import("next/headers");
    const tokenCookie = (await cookies()).get("asymmetrix_auth_token")?.value ?? null;
    const reqHeaders = await headers();
    const tokenHeader = reqHeaders.get("x-asym-token");
    const authHeader = reqHeaders.get("authorization");

    const token = extractToken(req, tokenCookie, tokenHeader, authHeader);
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
      { method: "POST", body: JSON.stringify({ label }) }
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
