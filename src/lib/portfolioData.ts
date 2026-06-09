import { authService } from "@/lib/auth";
import type { PortfolioEntityRow } from "@/lib/portfolioEntity";
import { parseUserId } from "@/lib/portfolioListUtils";
import {
  XANO_PORTFOLIO_LISTS_BASE,
  XANO_USER_PORTFOLIO_BASE,
} from "@/lib/portfolioApi";
import { resolveAuthUserId } from "@/lib/userLists";

export type PortfolioDataCounts = {
  total: number;
  companies: number;
  sectors: number;
  individuals: number;
  investors: number;
  advisors: number;
};

export type PortfolioDataResult = {
  items: PortfolioEntityRow[];
  counts: PortfolioDataCounts;
};

/** Clear cached list/data (call after follow, list CRUD, etc.). */
export function invalidatePortfolioDataCache(): void {
  // no-op — cache removed; every tab click makes a fresh request
}

const emptyCounts = (): PortfolioDataCounts => ({
  total: 0,
  companies: 0,
  sectors: 0,
  individuals: 0,
  investors: 0,
  advisors: 0,
});

/** Parse list/data — supports legacy array or { items, counts }. */
export function parsePortfolioDataResponse(data: unknown): PortfolioDataResult {
  if (Array.isArray(data)) {
    const items = data.filter(
      (row): row is PortfolioEntityRow =>
        row &&
        typeof row === "object" &&
        typeof (row as PortfolioEntityRow).entity === "string" &&
        Number.isFinite((row as PortfolioEntityRow).id)
    );
    return { items, counts: { ...emptyCounts(), total: items.length } };
  }

  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    const rawItems = Array.isArray(o.items) ? o.items : [];
    const items = rawItems.filter(
      (row): row is PortfolioEntityRow =>
        row &&
        typeof row === "object" &&
        typeof (row as PortfolioEntityRow).entity === "string" &&
        Number.isFinite((row as PortfolioEntityRow).id)
    );

    const c =
      o.counts && typeof o.counts === "object"
        ? (o.counts as Record<string, unknown>)
        : null;

    const total =
      typeof c?.total === "number" && Number.isFinite(c.total)
        ? c.total
        : items.length;

    return {
      items,
      counts: {
        total,
        companies:
          typeof c?.companies === "number" ? c.companies : 0,
        sectors: typeof c?.sectors === "number" ? c.sectors : 0,
        individuals:
          typeof c?.individuals === "number" ? c.individuals : 0,
        investors: typeof c?.investors === "number" ? c.investors : 0,
        advisors: typeof c?.advisors === "number" ? c.advisors : 0,
      },
    };
  }

  return { items: [], counts: emptyCounts() };
}

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

/** GET portfolio/data — items + counts for the user's singular portfolio. */
export async function fetchUserPortfolioData(options?: {
  search?: string;
  signal?: AbortSignal;
}): Promise<PortfolioDataResult> {
  const token = authService.getToken();
  if (!token) {
    throw new Error("Missing auth token");
  }

  const qs = new URLSearchParams();
  qs.set("search", options?.search?.trim() ?? "");

  const resp = await fetchWithAuth(
    `${XANO_USER_PORTFOLIO_BASE}/portfolio/data?${qs.toString()}`,
    token,
    { method: "GET", signal: options?.signal }
  );

  const text = await resp.text().catch(() => "");
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!resp.ok) {
    throw new Error(
      typeof data === "object" && data && "message" in data
        ? String((data as { message: unknown }).message)
        : `portfolio/data failed (${resp.status})`
    );
  }

  return parsePortfolioDataResponse(data);
}

/** GET list/data — items + counts (optional user_lists_id). */
export async function fetchPortfolioDataFromXano(options?: {
  userListId?: number;
  search?: string;
  signal?: AbortSignal;
}): Promise<PortfolioDataResult> {
  const token = authService.getToken();
  if (!token) {
    throw new Error("Missing auth token");
  }

  // Fast path: user id is already in localStorage via authService
  const userId = parseUserId(authService.getUser()?.id) ?? (await resolveAuthUserId());
  if (userId == null) {
    throw new Error("Could not resolve user id");
  }

  const qs = new URLSearchParams();
  qs.set("user_id", String(userId));
  if (options?.search?.trim()) qs.set("search", options.search.trim());
  const listId =
    options?.userListId != null &&
    Number.isFinite(options.userListId) &&
    options.userListId > 0
      ? options.userListId
      : null;

  if (listId != null) {
    qs.set("user_lists_id", String(listId));
  }

  const resp = await fetchWithAuth(
    `${XANO_PORTFOLIO_LISTS_BASE}/list/data?${qs.toString()}`,
    token,
    { method: "GET", signal: options?.signal }
  );

  const text = await resp.text().catch(() => "");
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!resp.ok) {
    throw new Error(
      typeof data === "object" && data && "message" in data
        ? String((data as { message: unknown }).message)
        : `list/data failed (${resp.status})`
    );
  }

  return parsePortfolioDataResponse(data);
}
