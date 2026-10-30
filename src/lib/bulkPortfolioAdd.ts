import type { PortfolioEntityType } from "@/lib/portfolioEntity";
import {
  bulkAddEntitiesToList,
  bulkCreateListWithEntities,
  bulkFollowEntities,
} from "@/lib/bulkPortfolioApi";

export type BulkPortfolioAction =
  | { mode: "follow" }
  | { mode: "lists"; listIds: number[] }
  | { mode: "new_list"; name: string };

export type BulkProgress = {
  total: number;
  done: number;
  success: number;
  failed: number;
};

export type BulkAddOutcome = {
  success: number;
  failed: number;
  listIds: number[];
  /** Newly added (to the list, or newly followed for a plain follow). */
  added: number;
  /** Already followed / already in the list. */
  skipped: number;
  listName: string | null;
};

export async function bulkAddEntitiesToPortfolio(
  entityType: PortfolioEntityType,
  entityIds: number[],
  action: BulkPortfolioAction,
  onProgress?: (progress: BulkProgress) => void,
  options?: { savedFilterId?: number | null; keepSynced?: boolean }
): Promise<BulkAddOutcome> {
  const ids = Array.from(
    new Set(entityIds.filter((id) => Number.isFinite(id) && id > 0))
  );
  const none: BulkAddOutcome = {
    success: 0,
    failed: 0,
    listIds: [],
    added: 0,
    skipped: 0,
    listName: null,
  };
  if (ids.length === 0) return none;

  const report = (done: number) =>
    onProgress?.({ total: ids.length, done, success: done, failed: 0 });
  report(0);

  try {
    if (action.mode === "follow") {
      const res = await bulkFollowEntities(entityType, ids, (done) =>
        report(done)
      );
      return { ...none, success: ids.length, added: res.added, skipped: res.skipped };
    }

    if (action.mode === "new_list") {
      const res = await bulkCreateListWithEntities(
        {
          label: action.name,
          entityType,
          entityIds: ids,
          savedFilterId: options?.savedFilterId,
          keepSynced: options?.keepSynced,
        },
        (done) => report(done)
      );
      return {
        ...none,
        success: ids.length,
        listIds: res.listId != null ? [res.listId] : [],
        added: res.added,
        skipped: res.skipped,
        listName: res.listName,
      };
    }

    const listIds = action.listIds.filter((id) => Number.isFinite(id) && id > 0);
    if (listIds.length === 0) throw new Error("Select at least one list");
    const outcome = { ...none, listIds };
    for (const listId of listIds) {
      const res = await bulkAddEntitiesToList(listId, entityType, ids, (done) =>
        report(done)
      );
      outcome.added += res.added;
      outcome.skipped += res.skipped;
      outcome.listName = res.listName ?? outcome.listName;
    }
    outcome.success = ids.length * listIds.length;
    return outcome;
  } catch (error) {
    onProgress?.({ total: ids.length, done: ids.length, success: 0, failed: ids.length });
    if (action.mode === "lists" && action.listIds.length === 0) throw error;
    return { ...none, failed: ids.length };
  }
}

export async function bulkAddCompaniesToPortfolio(
  companyIds: number[],
  action: BulkPortfolioAction,
  onProgress?: (progress: BulkProgress) => void
): Promise<BulkAddOutcome> {
  return bulkAddEntitiesToPortfolio("company", companyIds, action, onProgress);
}
