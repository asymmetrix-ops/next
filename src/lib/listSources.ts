import type { PortfolioEntityType } from "@/lib/portfolioEntity";
import { xanoRequest } from "@/lib/portfolioFollow";

/** Filters a bulk add came from; sent to Xano so the list can show how it was built. */
export type ListFilterSource = {
  name?: string | null;
  savedFilterId?: number | null;
  filters: Record<string, unknown>;
  /** Groups the chunks of one add into a single source entry. */
  batchId?: string;
};

export type ListSource = {
  kind: "filters" | "manual";
  entity_type: PortfolioEntityType;
  name?: string | null;
  saved_filter_id?: number | null;
  filters?: Record<string, unknown> | null;
  added_at: string;
  added: number;
  matched?: number;
};

export type ListSources = {
  listId: number;
  listName: string | null;
  keepSynced: boolean;
  savedFilterId: number | null;
  lastSyncedAt: string | null;
  sources: ListSource[];
};

export function newSourceBatchId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Request body for the `source` input of the bulk list endpoints. */
export function toSourcePayload(source: ListFilterSource | undefined) {
  if (!source) return {};
  return {
    source: {
      kind: "filters",
      batch_id: source.batchId ?? newSourceBatchId(),
      name: source.name ?? null,
      saved_filter_id: source.savedFilterId ?? null,
      filters: source.filters,
    },
  };
}

/** Xano timestamps arrive as epoch milliseconds. */
function toIso(value: unknown): string | null {
  if (typeof value === "string" && value) return value;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? new Date(n).toISOString() : null;
}

/** GET lists/{id}/sources */
export async function fetchListSources(listId: number): Promise<ListSources> {
  const res = (await xanoRequest(`/lists/${listId}/sources`, "GET")) as
    | Record<string, unknown>
    | null;
  const raw = Array.isArray(res?.sources) ? (res?.sources as ListSource[]) : [];
  return {
    listId,
    listName: typeof res?.list_name === "string" ? res.list_name : null,
    keepSynced: res?.keep_synced === true,
    savedFilterId: Number(res?.saved_filter_id) || null,
    lastSyncedAt: toIso(res?.last_synced_at),
    sources: raw,
  };
}
