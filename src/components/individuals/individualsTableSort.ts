import type {
  IndividualSortBy,
  IndividualSortOrder,
} from "@/lib/individualsFilterPayload";

export type { IndividualSortBy, IndividualSortOrder };

/** UI table column key → API `sort_by` value. */
export const INDIVIDUAL_UI_TO_SERVER_SORT: Record<string, IndividualSortBy> = {
  name: "name",
  current_company: "current_company",
  advisor_deal_count: "advisor_deal_count",
  location: "country",
};

export function getIndividualServerSortColumn(
  columnKey: string
): IndividualSortBy | null {
  return INDIVIDUAL_UI_TO_SERVER_SORT[columnKey] ?? null;
}

export function getIndividualUiColumnForServerSort(
  sortBy: IndividualSortBy | string | undefined
): string | null {
  if (!sortBy) return null;
  const entry = Object.entries(INDIVIDUAL_UI_TO_SERVER_SORT).find(
    ([, apiKey]) => apiKey === sortBy
  );
  return entry?.[0] ?? null;
}

export function getIndividualColumnSortKind(
  columnKey: string
): "server" | null {
  return getIndividualServerSortColumn(columnKey) ? "server" : null;
}
