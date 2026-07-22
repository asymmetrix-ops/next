export const MCP_GUEST_AUTH_API_BASE =
  process.env.MCP_GUEST_AUTH_API_URL ||
  "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6:v1";

export const MCP_GUEST_AUTH_ME_URL = `${MCP_GUEST_AUTH_API_BASE}/auth/me`;

export const MCP_GUEST_AUTH_GENERIC_ERROR =
  "Unable to sign in. If your email is eligible for MCP Guest access, check your inbox for a one-time password.";

export function normalizeMcpGuestEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function fetchMcpGuestAuthMe(
  token: string
): Promise<Record<string, unknown> | null> {
  let response = await fetch(MCP_GUEST_AUTH_ME_URL, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (response.status === 401) {
    response = await fetch(MCP_GUEST_AUTH_ME_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: token,
      },
      cache: "no-store",
    });
  }

  if (!response.ok) return null;

  const data = await response.json().catch(() => null);
  return data && typeof data === "object"
    ? (data as Record<string, unknown>)
    : null;
}

export function extractAuthToken(data: unknown): string {
  if (!data || typeof data !== "object") return "";

  const record = data as Record<string, unknown>;
  const raw = record.authToken ?? record.token;
  return typeof raw === "string" ? raw.trim() : "";
}
