import { addEntityToPortfolioApi } from "@/lib/portfolioEntity";
import {
  followPortfolioEntities,
  invalidateUserPortfolioRecordCache,
} from "@/lib/portfolioFollow";
import { createUserListInXano } from "@/lib/userLists";

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

// Must be 1: Xano's list-entity endpoint does read-modify-write on the
// followed_companies array. Concurrent requests race and only the last
// write survives, so we serialize all additions to the same list.
const CONCURRENCY = 1;

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<boolean>,
  onProgress?: (progress: BulkProgress) => void
): Promise<BulkProgress> {
  const progress: BulkProgress = {
    total: items.length,
    done: 0,
    success: 0,
    failed: 0,
  };

  const report = () => onProgress?.({ ...progress });

  let index = 0;
  const runNext = async (): Promise<void> => {
    while (index < items.length) {
      const current = index++;
      const ok = await worker(items[current]).catch(() => false);
      progress.done += 1;
      if (ok) progress.success += 1;
      else progress.failed += 1;
      report();
    }
  };

  report();
  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(items.length, 1)) },
    () => runNext()
  );
  await Promise.all(workers);
  return progress;
}

function parseCreatedListId(raw: unknown): number | null {
  if (!raw || typeof raw !== "object") return null;
  const id = (raw as { id?: unknown }).id;
  if (typeof id === "number" && Number.isFinite(id)) return id;
  if (typeof id === "string") {
    const parsed = Number.parseInt(id, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export async function bulkAddCompaniesToPortfolio(
  companyIds: number[],
  action: BulkPortfolioAction,
  onProgress?: (progress: BulkProgress) => void
): Promise<{ success: number; failed: number; listIds: number[] }> {
  const ids = companyIds.filter((id) => Number.isFinite(id) && id > 0);
  if (ids.length === 0) {
    return { success: 0, failed: 0, listIds: [] };
  }

  let listIds: number[] = [];
  if (action.mode === "new_list") {
    const created = await createUserListInXano(action.name);
    const newId = parseCreatedListId(created);
    if (newId == null) {
      throw new Error("Failed to create list");
    }
    listIds = [newId];
  } else if (action.mode === "lists") {
    listIds = action.listIds.filter((id) => Number.isFinite(id) && id > 0);
    if (listIds.length === 0) {
      throw new Error("Select at least one list");
    }
  }

  if (action.mode === "follow") {
    onProgress?.({ total: ids.length, done: 0, success: 0, failed: 0 });
    try {
      await followPortfolioEntities({
        followKey: "followed_companies",
        entityIds: ids,
      });
      invalidateUserPortfolioRecordCache();
      onProgress?.({
        total: ids.length,
        done: ids.length,
        success: ids.length,
        failed: 0,
      });
      return { success: ids.length, failed: 0, listIds: [] };
    } catch {
      onProgress?.({
        total: ids.length,
        done: ids.length,
        success: 0,
        failed: ids.length,
      });
      return { success: 0, failed: ids.length, listIds: [] };
    }
  }

  type Task = { companyId: number; listId: number };
  const tasks: Task[] = listIds.flatMap((listId) =>
    ids.map((companyId) => ({ companyId, listId }))
  );

  onProgress?.({ total: tasks.length, done: 0, success: 0, failed: 0 });

  try {
    await followPortfolioEntities({
      followKey: "followed_companies",
      entityIds: ids,
    });
    invalidateUserPortfolioRecordCache();
  } catch {
    onProgress?.({
      total: tasks.length,
      done: tasks.length,
      success: 0,
      failed: tasks.length,
    });
    return { success: 0, failed: tasks.length, listIds };
  }

  const result = await runWithConcurrency(
    tasks,
    CONCURRENCY,
    async (task) => {
      await addEntityToPortfolioApi({
        portfolioId: task.listId,
        entityType: "company",
        entityId: task.companyId,
        skipGlobalFollow: true,
      });
      return true;
    },
    onProgress
  );

  return { success: result.success, failed: result.failed, listIds };
}
