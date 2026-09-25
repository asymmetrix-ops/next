import { authService } from "@/lib/auth";

const RECENT_ITEMS_BASE = "https://xdil-abvj-o7rq.e2.xano.io/api:IRwc7Iiy";

export type RecentItemEntityType =
  | "company"
  | "investor"
  | "advisor"
  | "individual"
  | "corporate_event"
  | "insight"
  | "sector";

export type RecentItem = {
  id?: number;
  entityType: string;
  entityId: number;
  title: string;
  url: string;
  /** Epoch milliseconds. */
  lastViewedAt?: number;
  /** Raw logo payload (base64 or URL) — resolve with resolveCompanyLogoSrc before rendering. */
  logo?: string | null;
};

/**
 * Best-effort log of an entity page view, so it can surface in the "Recent"
 * section of global search. Never throws — a failure here should never
 * block or error the page the user is actually trying to view.
 */
export async function recordRecentItem(params: {
  entityType: RecentItemEntityType;
  entityId: number | string;
  entityName: string;
  entityUrl: string;
}): Promise<void> {
  try {
    const token = authService.getToken();
    const user = authService.getUser();
    const userId = user?.id ? String(user.id) : "";
    if (!token || !userId) return;

    await fetch(`${RECENT_ITEMS_BASE}/user_recent_items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        user_id: userId,
        entity_type: params.entityType,
        entity_id: String(params.entityId),
        entity_name: params.entityName,
        entity_url: params.entityUrl,
        last_viewed_at: new Date().toISOString(),
      }),
      keepalive: true,
    });
  } catch {
    // Best-effort only.
  }
}

/**
 * List the current user's recently-viewed entities, newest first.
 *
 * ASSUMPTION: the Xano CRUD group behind `/user_recent_items` also exposes a
 * GET (list) at the same path, filterable by `user_id` — only the POST
 * (create) call was provided. If that assumption is wrong (e.g. GET needs a
 * different path or param name), this silently returns [] rather than
 * breaking the search modal — confirm the real shape once available.
 */
export async function fetchRecentItems(
  limit = 5,
  signal?: AbortSignal
): Promise<RecentItem[]> {
  try {
    const token = authService.getToken();
    const user = authService.getUser();
    const userId = user?.id ? String(user.id) : "";
    if (!token || !userId) return [];

    const params = new URLSearchParams({ user_id: userId });
    const res = await fetch(`${RECENT_ITEMS_BASE}/user_recent_items?${params.toString()}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      signal,
    });
    if (!res.ok) return [];

    const data = (await res.json()) as unknown;
    const raw: unknown[] = Array.isArray(data)
      ? data
      : Array.isArray((data as { items?: unknown[] })?.items)
        ? (data as { items: unknown[] }).items
        : [];

    return raw
      .map((item): RecentItem | null => {
        if (!item || typeof item !== "object") return null;
        const rec = item as Record<string, unknown>;
        const entityId = Number(rec.entity_id);
        const url = String(rec.entity_url ?? "").trim();
        if (!Number.isFinite(entityId) || !url) return null;
        const lastViewedRaw = rec.last_viewed_at;
        const lastViewedAt =
          typeof lastViewedRaw === "number"
            ? lastViewedRaw
            : typeof lastViewedRaw === "string" && lastViewedRaw.trim()
              ? Number(lastViewedRaw) || new Date(lastViewedRaw).getTime() || undefined
              : undefined;
        const logoRaw = rec.linkedin_logo ?? rec.logo_url ?? rec.logo ?? null;
        const logo = typeof logoRaw === "string" && logoRaw.trim() ? logoRaw : null;
        return {
          id: typeof rec.id === "number" ? rec.id : undefined,
          entityType: String(rec.entity_type ?? ""),
          entityId,
          title: String(rec.entity_name ?? "Untitled"),
          url,
          lastViewedAt,
          logo,
        };
      })
      .filter((r): r is RecentItem => r !== null)
      .sort((a, b) => (b.lastViewedAt ?? 0) - (a.lastViewedAt ?? 0))
      .slice(0, limit);
  } catch {
    return [];
  }
}
