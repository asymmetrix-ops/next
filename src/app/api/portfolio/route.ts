import { NextResponse } from "next/server";

const FOLLOW_KEYS = [
  "followed_companies",
  "followed_advisors",
  "followed_investors",
  "followed_sectors",
  "followed_individuals",
] as const;

type FollowKey = (typeof FOLLOW_KEYS)[number];

const toFiniteInt = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number.parseInt(value.trim(), 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

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
      headers: { ...baseHeaders, Authorization: `${token}` },
      cache: "no-store",
    });
  }

  return resp;
}

async function fetchWithAuthFallback(
  urls: string[],
  token: string,
  init: Omit<RequestInit, "headers"> & { headers?: Record<string, string> } = {}
) {
  let lastResp: Response | null = null;
  for (const url of urls) {
    const resp = await fetchWithAuth(url, token, init);
    lastResp = resp;
    // Common Xano response for missing endpoint is 404. Try next URL.
    if (resp.status !== 404) return resp;
  }
  return lastResp!;
}

const XANO_PORTFOLIO_BASE_URLS = [
  "https://xdil-abvj-o7rq.e2.xano.io/api:jlAOWruI",
  "https://xdil-abvj-o7rq.e2.xano.io/api:jlAOWruI:develop",
] as const;

export async function GET() {
  try {
    const tokenCookie = (await import("next/headers"))
      .cookies()
      .get("asymmetrix_auth_token")?.value;

    const tokenHeader = (await import("next/headers"))
      .headers()
      .get("x-asym-token");

    const token = tokenCookie || tokenHeader;
    if (!token) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    const authApiUrl =
      process.env.NEXT_PUBLIC_XANO_API_URL ||
      "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6:develop";

    const authResp = await fetchWithAuth(`${authApiUrl}/auth/me`, token, {
      method: "GET",
    });

    if (!authResp.ok) {
      return NextResponse.json(
        { error: "Auth failed", statusText: authResp.statusText },
        { status: authResp.status }
      );
    }

    const authData = (await authResp.json().catch(() => null)) as unknown;
    const userId =
      authData && typeof authData === "object" && typeof (authData as { id?: unknown }).id === "number"
        ? (authData as { id: number }).id
        : authData && typeof authData === "object" && typeof (authData as { id?: unknown }).id === "string"
        ? Number.parseInt(String((authData as { id: string }).id), 10)
        : null;

    if (userId == null || !Number.isFinite(userId)) {
      return NextResponse.json(
        { error: "Auth response missing user id" },
        { status: 502 }
      );
    }

    const upstreamResp = await fetchWithAuthFallback(
      XANO_PORTFOLIO_BASE_URLS.map(
        (b) => `${b}/get_users_portfolio?user_id=${encodeURIComponent(String(userId))}`
      ),
      token,
      { method: "GET" }
    );

    const text = await upstreamResp.text().catch(() => "");
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (upstreamResp.ok && !text) {
      return NextResponse.json(
        {
          error: "Upstream empty response",
          hint: "Xano returned 200 with an empty body for get_users_portfolio.",
        },
        { status: 502 }
      );
    }

    if (!upstreamResp.ok) {
      return NextResponse.json(
        { error: "Upstream error", statusText: upstreamResp.statusText, data },
        { status: upstreamResp.status }
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

export async function POST(req: Request) {
  try {
    const tokenCookie = (await import("next/headers"))
      .cookies()
      .get("asymmetrix_auth_token")?.value;

    const tokenHeader = (await import("next/headers"))
      .headers()
      .get("x-asym-token");

    const token = tokenCookie || tokenHeader;
    if (!token) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

    let followKey: FollowKey | null = null;
    let entityId: number | null = null;

    for (const key of FOLLOW_KEYS) {
      const raw = body?.[key];
      if (raw === null) {
        followKey = key;
        entityId = null;
        break;
      }
      const val = toFiniteInt(raw);
      if (val !== null) {
        followKey = key;
        entityId = val;
        break;
      }
    }

    if (followKey === null) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const authApiUrl =
      process.env.NEXT_PUBLIC_XANO_API_URL ||
      "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6:develop";

    const authResp = await fetchWithAuth(`${authApiUrl}/auth/me`, token, {
      method: "GET",
    });

    if (!authResp.ok) {
      const text = await authResp.text().catch(() => "");
      return NextResponse.json(
        { error: "Auth failed", statusText: authResp.statusText, text },
        { status: authResp.status }
      );
    }

    const authData = (await authResp.json().catch(() => null)) as unknown;
    const userId =
      authData && typeof authData === "object" && typeof (authData as { id?: unknown }).id === "number"
        ? (authData as { id: number }).id
        : null;

    if (userId == null) {
      return NextResponse.json(
        { error: "Auth response missing user id" },
        { status: 502 }
      );
    }

    const updates: Record<FollowKey, number | null> = {
      followed_companies: null,
      followed_advisors: null,
      followed_investors: null,
      followed_sectors: null,
      followed_individuals: null,
    };
    updates[followKey] = entityId;

    const upstreamResp = await fetchWithAuthFallback(
      XANO_PORTFOLIO_BASE_URLS.map((b) => `${b}/users/portfolio`),
      token,
      { method: "POST", body: JSON.stringify({ user_id: userId, updates }) }
    );

    const text = await upstreamResp.text().catch(() => "");
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!upstreamResp.ok) {
      return NextResponse.json(
        { error: "Upstream error", statusText: upstreamResp.statusText, data },
        { status: upstreamResp.status }
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

