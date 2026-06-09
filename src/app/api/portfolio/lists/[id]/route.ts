import { NextResponse } from "next/server";
import {
  XANO_PORTFOLIO_LISTS_BASE,
  XANO_USER_PORTFOLIO_BASE,
} from "@/lib/portfolioApi";

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

/** GET /api/portfolio/lists/:id — fetch a single user portfolio from Xano. */
export async function GET(
  _req: Request,
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

    const userPortfolioId = Number.parseInt(params.id, 10);
    if (!Number.isFinite(userPortfolioId) || userPortfolioId <= 0) {
      return NextResponse.json({ error: "Invalid portfolio id" }, { status: 400 });
    }

    const query = `user_portfolio_id=${encodeURIComponent(String(userPortfolioId))}`;

    // GET must not include a body (fetch/Next will throw).
    let upstream = await fetchWithAuth(
      `${XANO_PORTFOLIO_LISTS_BASE}/user_list/${userPortfolioId}?${query}`,
      token,
      { method: "GET" }
    );

    // Some Xano stacks expect POST with JSON body instead of GET.
    if (!upstream.ok && (upstream.status === 404 || upstream.status === 405)) {
      upstream = await fetchWithAuth(
        `${XANO_PORTFOLIO_LISTS_BASE}/user_list/${userPortfolioId}`,
        token,
        {
          method: "POST",
          body: JSON.stringify({ user_portfolio_id: userPortfolioId }),
        }
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

/** PATCH /api/portfolio/lists/:id — rename portfolio label in Xano. */
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
    const label =
      body && typeof body.label === "string" ? body.label.trim() : null;

    if (!label) {
      return NextResponse.json(
        { error: "label is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    const upstream = await fetchWithAuth(
      `${XANO_USER_PORTFOLIO_BASE}/lists/${portfolioId}`,
      token,
      {
        method: "PATCH",
        body: JSON.stringify({ id: portfolioId, label }),
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

/** DELETE /api/portfolio/lists/:id — delete a user portfolio in Xano. */
export async function DELETE(
  _req: Request,
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

    const userListsId = Number.parseInt(params.id, 10);
    if (!Number.isFinite(userListsId) || userListsId <= 0) {
      return NextResponse.json({ error: "Invalid portfolio id" }, { status: 400 });
    }

    const upstream = await fetchWithAuth(
      `${XANO_USER_PORTFOLIO_BASE}/user_lists/${userListsId}`,
      token,
      {
        method: "DELETE",
        body: JSON.stringify({ user_lists_id: userListsId }),
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
