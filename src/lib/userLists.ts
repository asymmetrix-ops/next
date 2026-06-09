import { authService } from "@/lib/auth";
import { extractPortfolioList, parseUserId } from "@/lib/portfolioListUtils";
import {
  buildCreateUserListPayload,
  XANO_USER_PORTFOLIO_BASE,
} from "@/lib/portfolioApi";

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

/** GET get_users_lists — auth identifies user; no user_id param. */
export async function fetchUserListsFromXano(): Promise<unknown> {
  const token = authService.getToken();
  if (!token) {
    throw new Error("Missing auth token");
  }

  const url = `${XANO_USER_PORTFOLIO_BASE}/get_users_lists`;
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

  const name = listName.trim();
  if (!name) {
    throw new Error("List name is required");
  }

  const userId = (await resolveAuthUserId()) ?? 0;

  const resp = await fetchWithAuth(
    `${XANO_USER_PORTFOLIO_BASE}/user_lists`,
    token,
    {
      method: "POST",
      body: JSON.stringify(buildCreateUserListPayload(name, userId)),
    }
  );

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
