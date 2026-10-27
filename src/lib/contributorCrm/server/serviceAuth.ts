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

export function clearContributorServiceToken(): void {
  cachedToken = null;
  cachedTokenExpiryMs = null;
}

export async function getContributorServiceToken(
  forceRefresh = false
): Promise<string> {
  if (!forceRefresh && cachedToken && isCachedTokenValid()) {
    return cachedToken;
  }

  const pairs: Array<{ email: string; password: string }> = [];
  const dcpEmail = (
    process.env.DCP_EMAIL ||
    process.env.DCP_Email ||
    process.env.DCP_email ||
    ""
  ).trim();
  const dcpPw = process.env.DCP_PW || process.env.DCP_Pw || "";
  if (dcpEmail && dcpPw) pairs.push({ email: dcpEmail, password: dcpPw });
  const cronEmail = process.env.CRON_AUTH_EMAIL?.trim();
  const cronPw = process.env.CRON_AUTH_PASSWORD;
  if (cronEmail && cronPw) pairs.push({ email: cronEmail, password: cronPw });
  if (!pairs.length) {
    throw new Error(
      "Contributor service credentials are not configured. Set DCP_EMAIL and DCP_PW (or CRON_AUTH_EMAIL and CRON_AUTH_PASSWORD)."
    );
  }

  let lastError = "";
  for (const pair of pairs) {
    const res = await fetch(AUTH_LOGIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pair),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      lastError = text || `Service login failed (${res.status})`;
      continue;
    }
    const data = (await res.json()) as { authToken?: string };
    if (!data?.authToken) {
      lastError = "Invalid service login response: missing authToken";
      continue;
    }
    cachedToken = data.authToken;
    cachedTokenExpiryMs = getTokenExpiryMs(cachedToken) ?? Date.now() + 3_600_000;
    return cachedToken;
  }
  throw new Error(lastError || "Service login failed");
}
