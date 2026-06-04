import { authService } from "@/lib/auth";
import { extractPortfolioList, parseUserId } from "@/lib/portfolioListUtils";

const XANO_PORTFOLIO_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:xbsQ0H4R:develop";

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

export async function resolveAuthUserId(): Promise<number | null> {
  const id = parseUserId(authService.getUser()?.id);
  if (id != null) return id;

  const me = await authService.fetchMe();
  return parseUserId(me?.id);
}

/** GET get_users_lists — called from the browser so it appears in DevTools. */
export async function fetchUserListsFromXano(): Promise<unknown> {
  const token = authService.getToken();
  if (!token) {
    throw new Error("Missing auth token");
  }

  const userId = await resolveAuthUserId();
  if (userId == null) {
    throw new Error("Could not resolve user id");
  }

  const url = `${XANO_PORTFOLIO_BASE}/get_users_lists?user_id=${encodeURIComponent(String(userId))}`;
  const resp = await fetchWithAuth(url, token, { method: "GET" });

  const text = await resp.text().catch(() => "");
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!resp.ok) {
    const err = new Error(
      typeof data === "object" && data && "message" in data
        ? String((data as { message: unknown }).message)
        : `get_users_lists failed (${resp.status})`
    );
    (err as Error & { status?: number; data?: unknown }).status = resp.status;
    (err as Error & { data?: unknown }).data = data;
    throw err;
  }

  return data;
}

/** POST user_lists — create a list (browser → Xano). */
export async function createUserListInXano(listName: string): Promise<unknown> {
  const token = authService.getToken();
  if (!token) {
    throw new Error("Missing auth token");
  }

  const userId = await resolveAuthUserId();
  if (userId == null) {
    throw new Error("Could not resolve user id");
  }

  const name = listName.trim();
  if (!name) {
    throw new Error("List name is required");
  }

  const resp = await fetchWithAuth(`${XANO_PORTFOLIO_BASE}/user_lists`, token, {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      portfolio_label: name,
      list_name: name,
    }),
  });

  const text = await resp.text().catch(() => "");
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!resp.ok) {
    const err = new Error(
      typeof data === "object" && data && "message" in data
        ? String((data as { message: unknown }).message)
        : `user_lists create failed (${resp.status})`
    );
    (err as Error & { status?: number; data?: unknown }).status = resp.status;
    (err as Error & { data?: unknown }).data = data;
    throw err;
  }

  return data;
}

export { extractPortfolioList };
