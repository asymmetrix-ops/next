import { xanoRequest } from "@/lib/portfolioFollow";
import type { PortfolioEntityType } from "@/lib/portfolioEntity";

export type SavedFilter = {
  id: number;
  entity_type: PortfolioEntityType;
  name: string;
  /** The exact filter state the list view applies; opaque to the API. */
  filters: unknown;
  created_at?: number | string;
  updated_at?: number | string;
};

export async function listSavedFilters(
  entityType?: PortfolioEntityType
): Promise<SavedFilter[]> {
  const qs = entityType ? `?entity_type=${encodeURIComponent(entityType)}` : "";
  const data = await xanoRequest(`/saved_filters${qs}`, "GET");
  return Array.isArray(data) ? (data as SavedFilter[]) : [];
}

export async function createSavedFilter(input: {
  entityType: PortfolioEntityType;
  name: string;
  filters: unknown;
}): Promise<SavedFilter> {
  return (await xanoRequest("/saved_filters", "POST", {
    entity_type: input.entityType,
    name: input.name.trim(),
    filters: input.filters,
  })) as SavedFilter;
}

export async function renameSavedFilter(
  id: number,
  name: string
): Promise<SavedFilter> {
  return (await xanoRequest(`/saved_filters/${id}`, "PATCH", {
    id,
    name: name.trim(),
  })) as SavedFilter;
}

/** Overwrite a saved set with the filters currently applied. */
export async function updateSavedFilter(
  id: number,
  filters: unknown
): Promise<SavedFilter> {
  return (await xanoRequest(`/saved_filters/${id}`, "PATCH", {
    id,
    filters,
  })) as SavedFilter;
}

export async function deleteSavedFilter(id: number): Promise<void> {
  await xanoRequest(`/saved_filters/${id}`, "DELETE");
}
