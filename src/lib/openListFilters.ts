import type { PortfolioEntityType } from "@/lib/portfolioEntity";

const KEY = "asymmetrix_open_list_filters";

/** List view each entity type opens into; types without one cannot be filtered. */
export const LIST_VIEW_PATHS: Partial<Record<PortfolioEntityType, string>> = {
  company: "/companies",
  investor: "/investors",
  advisor: "/advisors",
  individual: "/individuals",
};

/** Hand a stored filter set to the list view that is about to open. */
export function stashFiltersForListView(
  entityType: PortfolioEntityType,
  filters: Record<string, unknown>
): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ entityType, filters }));
  } catch {
    /* sessionStorage unavailable: the list view simply opens unfiltered */
  }
}

/** Read and clear filters stashed for this entity type, if any. */
export function takeStashedFilters(
  entityType: PortfolioEntityType
): Record<string, unknown> | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      entityType?: string;
      filters?: Record<string, unknown>;
    };
    if (parsed.entityType !== entityType || !parsed.filters) return null;
    sessionStorage.removeItem(KEY);
    return parsed.filters;
  } catch {
    return null;
  }
}
