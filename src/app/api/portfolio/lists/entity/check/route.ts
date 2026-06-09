import { NextResponse } from "next/server";

const XANO_PORTFOLIO_BASE = "https://xdil-abvj-o7rq.e2.xano.io/api:xbsQ0H4R";

const VALID_ENTITY_TYPES = new Set([
  "company",
  "advisor",
  "investor",
  "sector",
  "individual",
]);

async function fetchWithAuth(
  url: string,
  token: string,
  init: Omit<RequestInit, "headers"> & { headers?: Record<string, string> } = {}
) {
  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
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

function extractToken(
  cookieHeader: string | null,
  tokenHeader: string | null,
  authHeader: string | null
) {
  const fromAuth = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;
  return cookieHeader || tokenHeader || fromAuth || null;
}

/** GET /api/portfolio/lists/entity/check — which lists contain this entity. */
export async function GET(req: Request) {
  try {
    const { cookies, headers } = await import("next/headers");
    const tokenCookie = (await cookies()).get("asymmetrix_auth_token")?.value ?? null;
    const reqHeaders = await headers();
    const tokenHeader = reqHeaders.get("x-asym-token");
    const authHeader = reqHeaders.get("authorization");

    const token = extractToken(tokenCookie, tokenHeader, authHeader);
    if (!token) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    const url = new URL(req.url);
    const entityType = (url.searchParams.get("entity_type") || "")
      .trim()
      .toLowerCase();
    const entityIdRaw = url.searchParams.get("entity_id");
    const entityId =
      entityIdRaw != null ? Number.parseInt(entityIdRaw, 10) : Number.NaN;

    if (!entityType || !VALID_ENTITY_TYPES.has(entityType)) {
      return NextResponse.json(
        {
          error:
            "entity_type is required (company, advisor, investor, sector, individual)",
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(entityId) || entityId <= 0) {
      return NextResponse.json(
        { error: "entity_id is required and must be a positive number" },
        { status: 400 }
      );
    }

    const payload = JSON.stringify({
      entity_type: entityType,
      entity_id: entityId,
    });

    const query = `entity_type=${encodeURIComponent(entityType)}&entity_id=${encodeURIComponent(String(entityId))}`;

    let upstream = await fetchWithAuth(
      `${XANO_PORTFOLIO_BASE}/lists/entity/check?${query}`,
      token,
      { method: "GET" }
    );

    if (!upstream.ok && (upstream.status === 404 || upstream.status === 405)) {
      upstream = await fetchWithAuth(
        `${XANO_PORTFOLIO_BASE}/lists/entity/check`,
        token,
        { method: "POST", body: payload }
      );
    }

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
