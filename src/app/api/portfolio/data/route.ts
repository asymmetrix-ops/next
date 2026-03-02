import { NextResponse } from "next/server";

const XANO_PORTFOLIO_BASE_URLS = [
  "https://xdil-abvj-o7rq.e2.xano.io/api:jlAOWruI",
  "https://xdil-abvj-o7rq.e2.xano.io/api:jlAOWruI:develop",
] as const;

const toNonEmptyString = (v: unknown) => {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
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

async function getUserIdFromToken(token: string) {
  const authApiUrl =
    process.env.NEXT_PUBLIC_XANO_API_URL ||
    "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6:develop";

  const authResp = await fetchWithAuth(`${authApiUrl}/auth/me`, token, {
    method: "GET",
  });

  if (!authResp.ok) {
    return {
      ok: false as const,
      status: authResp.status,
      statusText: authResp.statusText,
      data: await authResp.text().catch(() => ""),
    };
  }

  const authData = (await authResp.json().catch(() => null)) as unknown;
  const userIdRaw =
    authData && typeof authData === "object"
      ? (authData as { id?: unknown }).id
      : null;

  const userId =
    typeof userIdRaw === "number"
      ? userIdRaw
      : typeof userIdRaw === "string"
        ? Number.parseInt(userIdRaw, 10)
        : null;

  if (userId == null || !Number.isFinite(userId)) {
    return {
      ok: false as const,
      status: 502,
      statusText: "Bad Gateway",
      data: "Auth response missing user id",
    };
  }

  return { ok: true as const, userId };
}

async function proxyPortfolioData(
  token: string,
  userId: number,
  search: string | null
) {
  // Xano routes are method-specific; calling the wrong method often returns 404 (not 405).
  // Spec for this endpoint indicates GET, with user_id + optional search.
  const qs = new URLSearchParams();
  qs.set("user_id", String(userId));
  if (search) qs.set("search", search);
  const upstreamGetUrls = XANO_PORTFOLIO_BASE_URLS.map(
    (b) => `${b}/portfolio/data?${qs.toString()}`
  );

  const getResp = await fetchWithAuthFallback(upstreamGetUrls, token, {
    method: "GET",
  });

  if (getResp.ok) return getResp;

  // Fallback to POST in case the endpoint is implemented as POST upstream.
  // (Some environments might differ, or accept body-based search/user_id.)
  if (getResp.status === 404 || getResp.status === 405) {
    const payload: Record<string, unknown> = {
      user_id: userId,
      ...(search ? { search } : {}),
    };

    const upstreamPostUrls = upstreamBaseUrlsWithPath("/portfolio/data");
    return fetchWithAuthFallback(upstreamPostUrls, token, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  return getResp;
}

export async function GET(req: Request) {
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

    const url = new URL(req.url);
    const search = toNonEmptyString(url.searchParams.get("search"));

    const userIdResult = await getUserIdFromToken(token);
    if (!userIdResult.ok) {
      return NextResponse.json(
        {
          error: "Auth failed",
          statusText: userIdResult.statusText,
          data: userIdResult.data,
        },
        { status: userIdResult.status }
      );
    }

    const upstreamResp = await proxyPortfolioData(
      token,
      userIdResult.userId,
      search
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

const upstreamBaseUrlsWithPath = (path: string) =>
  XANO_PORTFOLIO_BASE_URLS.map((b) => `${b}${path}`);

