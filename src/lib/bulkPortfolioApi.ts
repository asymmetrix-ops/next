import type { PortfolioEntityType } from "@/lib/portfolioEntity";
import {
  invalidateUserPortfolioRecordCache,
  xanoRequest,
} from "@/lib/portfolioFollow";

/** Xano array columns hold at most 100 ids, so bulk calls are sent in chunks of this size. */
export const BULK_CHUNK_SIZE = 100;

export type BulkAddResult = {
  /** Entities newly added to the list (or newly followed for a plain follow). */
  added: number;
  /** Entities that were already there. */
  skipped: number;
  /** Entities newly followed as a side effect of adding them to a list. */
  newlyFollowed: number;
  listId: number | null;
  listName: string | null;
};

function cleanIds(ids: number[]): number[] {
  return Array.from(
    new Set(ids.filter((id) => Number.isFinite(id) && id > 0))
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

const emptyResult = (): BulkAddResult => ({
  added: 0,
  skipped: 0,
  newlyFollowed: 0,
  listId: null,
  listName: null,
});

/** POST portfolio/entities/bulk — follow many entities at once. */
export async function bulkFollowEntities(
  entityType: PortfolioEntityType,
  entityIds: number[],
  onProgress?: (done: number, total: number) => void
): Promise<BulkAddResult> {
  const ids = cleanIds(entityIds);
  const result = emptyResult();
  invalidateUserPortfolioRecordCache();
  let done = 0;
  for (const part of chunk(ids, BULK_CHUNK_SIZE)) {
    const res = (await xanoRequest("/portfolio/entities/bulk", "POST", {
      entity_type: entityType,
      entity_ids: part,
    })) as Record<string, unknown> | null;
    result.added += num(res?.followed);
    result.skipped += num(res?.skipped);
    done += part.length;
    onProgress?.(done, ids.length);
  }
  invalidateUserPortfolioRecordCache();
  return result;
}

/** POST lists/{id}/entities/bulk — add many entities to an existing list. */
export async function bulkAddEntitiesToList(
  listId: number,
  entityType: PortfolioEntityType,
  entityIds: number[],
  onProgress?: (done: number, total: number) => void
): Promise<BulkAddResult> {
  const ids = cleanIds(entityIds);
  const result = { ...emptyResult(), listId };
  invalidateUserPortfolioRecordCache();
  let done = 0;
  for (const part of chunk(ids, BULK_CHUNK_SIZE)) {
    const res = (await xanoRequest(`/lists/${listId}/entities/bulk`, "POST", {
      id: listId,
      entity_type: entityType,
      entity_ids: part,
    })) as Record<string, unknown> | null;
    result.added += num(res?.added_to_list);
    result.skipped += num(res?.skipped_in_list);
    result.newlyFollowed += num(res?.newly_followed);
    if (typeof res?.list_name === "string") result.listName = res.list_name;
    done += part.length;
    onProgress?.(done, ids.length);
  }
  invalidateUserPortfolioRecordCache();
  return result;
}

/** POST lists/from_entities — create a list, then fill it with the remaining chunks. */
export async function bulkCreateListWithEntities(
  input: {
    label: string;
    entityType: PortfolioEntityType;
    entityIds: number[];
    savedFilterId?: number | null;
    keepSynced?: boolean;
  },
  onProgress?: (done: number, total: number) => void
): Promise<BulkAddResult> {
  const ids = cleanIds(input.entityIds);
  const parts = chunk(ids, BULK_CHUNK_SIZE);
  const first = parts.shift() ?? [];
  invalidateUserPortfolioRecordCache();

  const created = (await xanoRequest("/lists/from_entities", "POST", {
    label: input.label.trim(),
    entity_type: input.entityType,
    entity_ids: first,
    ...(input.savedFilterId ? { saved_filter_id: input.savedFilterId } : {}),
    ...(input.keepSynced ? { keep_synced: true } : {}),
  })) as Record<string, unknown> | null;

  const listId = num(created?.list_id) || null;
  const result: BulkAddResult = {
    added: num(created?.added_to_list),
    skipped: num(created?.skipped_in_list),
    newlyFollowed: num(created?.newly_followed),
    listId,
    listName:
      typeof created?.list_name === "string" ? created.list_name : input.label,
  };
  let done = first.length;
  onProgress?.(done, ids.length);

  if (listId != null) {
    for (const part of parts) {
      const res = await bulkAddEntitiesToList(listId, input.entityType, part);
      result.added += res.added;
      result.skipped += res.skipped;
      result.newlyFollowed += res.newlyFollowed;
      done += part.length;
      onProgress?.(done, ids.length);
    }
  }
  invalidateUserPortfolioRecordCache();
  return result;
}
