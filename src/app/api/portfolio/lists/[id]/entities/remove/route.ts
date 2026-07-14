import { NextResponse } from "next/server";

const XANO_PORTFOLIO_BASE = "https://xdil-abvj-o7rq.e2.xano.io/api:xbsQ0H4R:develop";

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

/** PATCH /api/portfolio/lists/:id/entities/remove — remove entity from a portfolio. */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
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

    const portfolioId = Number.parseInt(params.id, 10);
    if (!Number.isFinite(portfolioId) || portfolioId <= 0) {
      return NextResponse.json({ error: "Invalid portfolio id" }, { status: 400 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

    const entityType =
      body && typeof body.entity_type === "string"
        ? body.entity_type.trim().toLowerCase()
        : null;

    const entityIdRaw = body?.entity_id;
    const entityId =
      typeof entityIdRaw === "number"
        ? entityIdRaw
        : typeof entityIdRaw === "string"
        ? Number.parseInt(entityIdRaw, 10)
        : null;

    if (!entityType || !VALID_ENTITY_TYPES.has(entityType)) {
      return NextResponse.json(
        {
          error:
            "entity_type is required (company, advisor, investor, sector, individual)",
        },
        { status: 400 }
      );
    }

    if (entityId == null || !Number.isFinite(entityId) || entityId <= 0) {
      return NextResponse.json(
        { error: "entity_id is required and must be a positive number" },
        { status: 400 }
      );
    }

    const upstream = await fetchWithAuth(
      `${XANO_PORTFOLIO_BASE}/lists/${portfolioId}/entities/remove`,
      token,
      {
        method: "PATCH",
        body: JSON.stringify({
          id: portfolioId,
          entity_type: entityType,
          entity_id: entityId,
        }),
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

    return NextResponse.json(data ?? { ok: true }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { error: "Internal error", message: (e as Error).message },
      { status: 500 }
    );
  }
}
