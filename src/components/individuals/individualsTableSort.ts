import type { Individual } from "@/types/individuals";
import {
  formatIndividualLocation,
  formatIndividualRoles,
  getIndividualFieldAliasesForColumn,
} from "./individualsColumnFields";

export type ColumnSortKind = "text";

const NOT_SORTABLE = null;

export const INDIVIDUAL_COLUMN_SORT_KIND: Record<string, ColumnSortKind | null> = {
  name: "text",
  current_company: "text",
  current_roles: "text",
  location: "text",
  follow: NOT_SORTABLE,
};

export function getIndividualColumnSortKind(
  columnKey: string
): ColumnSortKind | null {
  return INDIVIDUAL_COLUMN_SORT_KIND[columnKey] ?? null;
}

function readIndividualValue(
  individual: Individual,
  aliases: readonly string[]
): unknown {
  const rec = individual as unknown as Record<string, unknown>;
  for (const alias of aliases) {
    const parts = alias.split(".");
    let current: unknown = rec;
    for (const part of parts) {
      if (!current || typeof current !== "object") {
        current = undefined;
        break;
      }
      current = (current as Record<string, unknown>)[part];
    }
    if (current != null && current !== "") return current;
  }
  return undefined;
}

export function getIndividualSortValueForColumn(
  individual: Individual,
  columnKey: string
): string | null {
  if (columnKey === "location") {
    const formatted = formatIndividualLocation(individual._locations_individual);
    return formatted === "-" ? null : formatted.toLowerCase();
  }
  if (columnKey === "current_roles") {
    const formatted = formatIndividualRoles(individual);
    return formatted === "-" ? null : formatted.toLowerCase();
  }

  const raw = readIndividualValue(
    individual,
    getIndividualFieldAliasesForColumn(columnKey)
  );
  if (raw == null || raw === "") return null;
  return String(raw).toLowerCase();
}

export function compareIndividualSortValues(
  a: string | null,
  b: string | null,
  dir: "asc" | "desc"
): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;

  const result = a.localeCompare(b);
  return dir === "asc" ? result : -result;
}
