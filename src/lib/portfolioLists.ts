// Portfolio Lists — localStorage-based named list management.
// Lists are purely client-side collections; global follow state lives in Xano.

export type ListEntityType =
  | "company"
  | "advisor"
  | "investor"
  | "sector"
  | "individual";

export interface ListEntity {
  entityType: ListEntityType;
  entityId: number;
  name: string;
}

export interface PortfolioList {
  id: string;
  /** Xano portfolio ID returned by POST /create/portfolio. Present when the list was synced with the backend. */
  xanoId?: number;
  name: string;
  createdAt: number;
  entities: ListEntity[];
}

const STORAGE_KEY = "portfolio_lists_v1";

export function getPortfolioLists(): PortfolioList[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PortfolioList[]) : [];
  } catch {
    return [];
  }
}

function savePortfolioLists(lists: PortfolioList[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
}

export function createPortfolioList(name: string): PortfolioList {
  const list: PortfolioList = {
    id: `list_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim(),
    createdAt: Date.now(),
    entities: [],
  };
  const lists = getPortfolioLists();
  lists.push(list);
  savePortfolioLists(lists);
  return list;
}

/**
 * Saves a portfolio that was created by the Xano backend.
 * Uses the Xano ID as the local ID so future API calls can reference it.
 */
export function saveXanoPortfolioList(xanoId: number, label: string): PortfolioList {
  const id = String(xanoId);
  const existing = getPortfolioLists().find((l) => l.id === id || l.xanoId === xanoId);
  if (existing) return existing;

  const list: PortfolioList = {
    id,
    xanoId,
    name: label.trim(),
    createdAt: Date.now(),
    entities: [],
  };
  const lists = getPortfolioLists();
  lists.push(list);
  savePortfolioLists(lists);
  return list;
}

export function renamePortfolioList(id: string, name: string): void {
  const lists = getPortfolioLists();
  const idx = lists.findIndex((l) => l.id === id);
  if (idx >= 0) {
    lists[idx].name = name.trim();
    savePortfolioLists(lists);
  }
}

export function deletePortfolioList(id: string): void {
  savePortfolioLists(getPortfolioLists().filter((l) => l.id !== id));
}

export function addEntityToList(listId: string, entity: ListEntity): void {
  const lists = getPortfolioLists();
  const list = lists.find((l) => l.id === listId);
  if (!list) return;
  const exists = list.entities.some(
    (e) => e.entityType === entity.entityType && e.entityId === entity.entityId
  );
  if (!exists) {
    list.entities.push(entity);
    savePortfolioLists(lists);
  }
}

export function removeEntityFromList(
  listId: string,
  entityType: ListEntityType,
  entityId: number
): void {
  const lists = getPortfolioLists();
  const list = lists.find((l) => l.id === listId);
  if (!list) return;
  list.entities = list.entities.filter(
    (e) => !(e.entityType === entityType && e.entityId === entityId)
  );
  savePortfolioLists(lists);
}

export function isEntityInList(
  listId: string,
  entityType: ListEntityType,
  entityId: number
): boolean {
  const list = getPortfolioLists().find((l) => l.id === listId);
  if (!list) return false;
  return list.entities.some(
    (e) => e.entityType === entityType && e.entityId === entityId
  );
}

export function getListsContainingEntity(
  entityType: ListEntityType,
  entityId: number
): PortfolioList[] {
  return getPortfolioLists().filter((list) =>
    list.entities.some(
      (e) => e.entityType === entityType && e.entityId === entityId
    )
  );
}
