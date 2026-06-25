import type { SavedBenchmark } from "./types";

const STORAGE_KEY = "asymmetrix_fi_saved_benchmarks";

export function loadSavedBenchmarks(): SavedBenchmark[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedBenchmark[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveBenchmark(entry: SavedBenchmark): SavedBenchmark[] {
  const existing = loadSavedBenchmarks();
  const next = [
    entry,
    ...existing.filter((item) => item.target_company_id !== entry.target_company_id),
  ].slice(0, 10);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function deleteSavedBenchmark(targetCompanyId: number): SavedBenchmark[] {
  const next = loadSavedBenchmarks().filter(
    (item) => item.target_company_id !== targetCompanyId
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
