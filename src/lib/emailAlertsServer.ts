import { cookies, headers } from "next/headers";

const ALERTS_BASE_URL = "https://asymmetrix-email-service.fly.dev/alerts";

const AUTH_API_URL =
  process.env.NEXT_PUBLIC_XANO_API_URL ||
  "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6";

export type AuthUser = {
  id: number;
  email?: string;
};

export function getAlertsApiKey(): string | null {
  const key = process.env.ALERTS_API_KEY?.trim();
  return key || null;
}

export async function getTokenFromRequest(): Promise<string | null> {
  const cookieStore = await cookies();
  const headerStore = await headers();
  return (
    cookieStore.get("asymmetrix_auth_token")?.value ||
    headerStore.get("x-asym-token") ||
    null
  );
}

async function fetchWithAuth(url: string, token: string, init: RequestInit = {}) {
  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
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

export async function getAuthUser(token: string): Promise<
  | { ok: true; user: AuthUser }
  | { ok: false; status: number; statusText: string; data: string }
> {
  const authResp = await fetchWithAuth(`${AUTH_API_URL}/auth/me`, token, {
    method: "GET",
  });

  if (!authResp.ok) {
    return {
      ok: false,
      status: authResp.status,
      statusText: authResp.statusText,
      data: await authResp.text().catch(() => ""),
    };
  }

  const data = (await authResp.json().catch(() => null)) as {
    id?: unknown;
    email?: unknown;
  } | null;

  const idRaw = data?.id;
  const userId =
    typeof idRaw === "number"
      ? idRaw
      : typeof idRaw === "string"
        ? Number.parseInt(idRaw, 10)
        : null;

  if (userId == null || !Number.isFinite(userId)) {
    return {
      ok: false,
      status: 502,
      statusText: "Bad Gateway",
      data: "Auth response missing user id",
    };
  }

  const email =
    typeof data?.email === "string" && data.email.trim()
      ? data.email.trim()
      : undefined;

  return { ok: true, user: { id: userId, email } };
}

export async function alertsUpstream(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const apiKey = getAlertsApiKey();
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ALERTS_API_KEY is not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const url = path.startsWith("http") ? path : `${ALERTS_BASE_URL}${path}`;
  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
      ...(init.headers as Record<string, string> | undefined),
    },
    cache: "no-store",
  });
}

export async function proxyAlertsResponse(upstreamResp: Response) {
  const text = await upstreamResp.text().catch(() => "");
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!upstreamResp.ok) {
    return Response.json(
      {
        error: "Upstream error",
        statusText: upstreamResp.statusText,
        data,
      },
      { status: upstreamResp.status }
    );
  }

  return Response.json(data, { status: upstreamResp.status });
}

export async function requireAuthUser(): Promise<
  | { ok: true; token: string; user: AuthUser }
  | { ok: false; response: Response }
> {
  const token = await getTokenFromRequest();
  if (!token) {
    return {
      ok: false,
      response: Response.json({ error: "Missing auth token" }, { status: 401 }),
    };
  }

  const userResult = await getAuthUser(token);
  if (!userResult.ok) {
    return {
      ok: false,
      response: Response.json(
        {
          error: "Auth failed",
          statusText: userResult.statusText,
          data: userResult.data,
        },
        { status: userResult.status }
      ),
    };
  }

  return { ok: true, token, user: userResult.user };
}
