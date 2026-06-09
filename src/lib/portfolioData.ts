import { authService } from "@/lib/auth";
import type { PortfolioEntityRow } from "@/lib/portfolioEntity";
import { XANO_USER_PORTFOLIO_BASE } from "@/lib/portfolioApi";

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

/** Map portfolio/data items into legacy id arrays (companies, sectors, …). */
export function portfolioDataToUserPortfolioRecord(data: PortfolioDataResult): {
  user_portfolio_id: number;
  user_id: number;
  companies: number[];
  sectors: number[];
  individuals: number[];
  investors: number[];
  advisors: number[];
} {
  const idsFor = (entity: PortfolioEntityRow["entity"]) =>
    data.items.filter((item) => item.entity === entity).map((item) => item.id);

  return {
    user_portfolio_id: 0,
    user_id: 0,
    companies: idsFor("company"),
    sectors: idsFor("sector"),
    individuals: idsFor("individual"),
    investors: idsFor("investor"),
    advisors: idsFor("advisor"),
  };
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

/** GET list/data — items + counts for a specific user list (auth + user_lists_id). */
export async function fetchPortfolioDataFromXano(options?: {
  userListId?: number;
  search?: string;
  signal?: AbortSignal;
}): Promise<PortfolioDataResult> {
  const token = authService.getToken();
  if (!token) {
    throw new Error("Missing auth token");
  }

  const listId =
    options?.userListId != null &&
    Number.isFinite(options.userListId) &&
    options.userListId > 0
      ? options.userListId
      : null;

  if (listId == null) {
    throw new Error("user_lists_id is required");
  }

  const qs = new URLSearchParams();
  qs.set("user_lists_id", String(listId));
  if (options?.search?.trim()) qs.set("search", options.search.trim());

  const resp = await fetchWithAuth(
    `${XANO_USER_PORTFOLIO_BASE}/list/data?${qs.toString()}`,
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
