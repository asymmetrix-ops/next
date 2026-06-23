import { getAdvisorFieldAliasesForColumn } from "./advisorsColumnFields";

export type ColumnSortKind = "text" | "number";

const NOT_SORTABLE = null;

export const ADVISOR_COLUMN_SORT_KIND: Record<string, ColumnSortKind | null> = {
  logo: NOT_SORTABLE,
  name: "text",
  description: NOT_SORTABLE,
  events_advised: "number",
  sectors: "text",
  linkedin_members: "number",
  country: "text",
  follow: NOT_SORTABLE,
};

export function getAdvisorColumnSortKind(columnKey: string): ColumnSortKind | null {
  return ADVISOR_COLUMN_SORT_KIND[columnKey] ?? null;
}

function readAdvisorValue(
  advisor: Record<string, unknown>,
  aliases: readonly string[]
): unknown {
  for (const alias of aliases) {
    const value = advisor[alias];
    if (value != null && value !== "") return value;
  }
  return undefined;
}

export function getAdvisorSortValueForColumn(
  advisor: Record<string, unknown>,
  columnKey: string
): string | number | null {
  const raw = readAdvisorValue(
    advisor,
    getAdvisorFieldAliasesForColumn(columnKey)
  );
  if (raw == null || raw === "") return null;

  const kind = getAdvisorColumnSortKind(columnKey);
  if (kind === "number") {
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  }
  return String(raw).toLowerCase();
}

export function compareAdvisorSortValues(
  a: string | number | null,
  b: string | number | null,
  dir: "asc" | "desc"
): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  let result = 0;
  if (typeof a === "number" && typeof b === "number") {
    result = a - b;
  } else {
    result = String(a).localeCompare(String(b));
  }

  return dir === "asc" ? result : -result;
}
