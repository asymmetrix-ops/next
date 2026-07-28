export type ColumnStorageScope = "local" | "session";

function getStorage(scope: ColumnStorageScope): Storage | null {
  if (typeof window === "undefined") return null;
  return scope === "session" ? window.sessionStorage : window.localStorage;
}

export function loadStoredColumnKeys(
  key: string,
  scope: ColumnStorageScope
): string[] | null {
  try {
    const storage = getStorage(scope);
    if (!storage) return null;
    const saved = storage.getItem(key);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return null;
  }
}

export function saveStoredColumnKeys(
  key: string,
  scope: ColumnStorageScope,
  keys: string[]
): void {
  try {
    const storage = getStorage(scope);
    if (!storage) return;
    storage.setItem(key, JSON.stringify(keys));
  } catch (error) {
    console.warn("Unable to save column preferences:", error);
  }
}
