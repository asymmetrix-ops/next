const AUTH_LOGIN_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6/auth/login";

let cachedToken: string | null = null;
let cachedTokenExpiryMs: number | null = null;

function getTokenExpiryMs(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
        "utf8"
      )
    ) as { exp?: unknown };
    if (typeof payload?.exp !== "number") return null;
    return payload.exp * 1000;
  } catch {
    return null;
  }
}

function isCachedTokenValid(): boolean {
  if (!cachedToken) return false;
  if (cachedTokenExpiryMs == null) return true;
  return Date.now() < cachedTokenExpiryMs - 30_000;
}

export async function getContributorServiceToken(): Promise<string> {
  if (cachedToken && isCachedTokenValid()) {
    return cachedToken;
  }

  const email = process.env.CONTRIBUTOR_SERVICE_EMAIL?.trim();
  const password = process.env.CONTRIBUTOR_SERVICE_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "Contributor service credentials are not configured. Set CONTRIBUTOR_SERVICE_EMAIL and CONTRIBUTOR_SERVICE_PASSWORD in .env.local."
    );
  }

  const res = await fetch(AUTH_LOGIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Service login failed (${res.status})`);
  }

  const data = (await res.json()) as { authToken?: string };
  if (!data?.authToken) {
    throw new Error("Invalid service login response: missing authToken");
  }

  cachedToken = data.authToken;
  cachedTokenExpiryMs = getTokenExpiryMs(cachedToken) ?? Date.now() + 3_600_000;
  return cachedToken;
}
