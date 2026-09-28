import type {
  IndividualsSortBy,
  IndividualsSortDir,
} from "@/lib/individualsFilterPayload";

export type IndividualsListSortState = {
  sortBy: IndividualsSortBy;
  sortDir: IndividualsSortDir;
};

export const DEFAULT_INDIVIDUALS_LIST_SORT: IndividualsListSortState = {
  sortBy: "name",
  sortDir: "asc",
};

export const ADVISORS_TAB_DEFAULT_LIST_SORT: IndividualsListSortState = {
  sortBy: "corporate_events_count",
  sortDir: "desc",
};

export function parseIndividualsListSortFromSearchParams(
  params: URLSearchParams
): IndividualsListSortState | null {
  const sortByRaw = params.get("sort_by");
  const sortDirRaw = params.get("sort_dir");

  const sortBy: IndividualsSortBy | null =
    sortByRaw === "name" || sortByRaw === "corporate_events_count"
      ? sortByRaw
      : null;
  const sortDir: IndividualsSortDir | null =
    sortDirRaw === "asc" || sortDirRaw === "desc" ? sortDirRaw : null;

  if (!sortBy && !sortDir) return null;
  return {
    sortBy: sortBy ?? DEFAULT_INDIVIDUALS_LIST_SORT.sortBy,
    sortDir: sortDir ?? DEFAULT_INDIVIDUALS_LIST_SORT.sortDir,
  };
}

export function applyIndividualsListSortToSearchParams(
  params: URLSearchParams,
  sort: IndividualsListSortState
): URLSearchParams {
  params.set("sort_by", sort.sortBy);
  params.set("sort_dir", sort.sortDir);
  return params;
}

export function columnKeyToIndividualsSortBy(
  columnKey: string
): IndividualsSortBy | null {
  if (columnKey === "name") return "name";
  if (columnKey === "corporate_events") return "corporate_events_count";
  return null;
}

export function individualsSortByToColumnKey(
  sortBy: IndividualsSortBy
): "name" | "corporate_events" {
  return sortBy === "corporate_events_count" ? "corporate_events" : "name";
}

export function toggleIndividualsListSort(
  prev: IndividualsListSortState,
  sortBy: IndividualsSortBy
): IndividualsListSortState {
  if (prev.sortBy !== sortBy) {
    return {
      sortBy,
      sortDir: sortBy === "corporate_events_count" ? "desc" : "asc",
    };
  }
  return {
    sortBy,
    sortDir: prev.sortDir === "asc" ? "desc" : "asc",
  };
}

export function mergeSortIntoIndividualFilters<T extends { sort_by?: IndividualsSortBy; sort_dir?: IndividualsSortDir }>(
  filters: T,
  sort: IndividualsListSortState
): T & { sort_by: IndividualsSortBy; sort_dir: IndividualsSortDir } {
  return {
    ...filters,
    sort_by: sort.sortBy,
    sort_dir: sort.sortDir,
  };
}
