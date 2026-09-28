import type { Individual } from "@/types/individuals";
import {
  formatIndividualLocation,
  formatIndividualRoles,
  getIndividualFieldAliasesForColumn,
} from "./individualsColumnFields";

export type ColumnSortKind = "text" | "number";

const NOT_SORTABLE = null;

export const INDIVIDUAL_SERVER_SORT_BY: Record<string, "name" | "corporate_events_count"> =
  {
    name: "name",
    corporate_events: "corporate_events_count",
  };

export function getIndividualServerSortBy(
  columnKey: string
): "name" | "corporate_events_count" | null {
  return INDIVIDUAL_SERVER_SORT_BY[columnKey] ?? null;
}

export function getIndividualServerSortDefaultDirection(
  columnKey: string
): "asc" | "desc" {
  return columnKey === "corporate_events" ? "desc" : "asc";
}

export const INDIVIDUAL_COLUMN_SORT_KIND: Record<string, ColumnSortKind | null> = {
  name: "text",
  current_company: "text",
  current_roles: "text",
  corporate_events: "number",
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
): string | number | null {
  if (columnKey === "corporate_events") {
    const count = individual.corporate_events_count;
    return typeof count === "number" && Number.isFinite(count) ? count : null;
  }
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

export function getIndividualUiColumnForServerSortBy(
  sortBy: string | undefined
): string | null {
  if (sortBy === "corporate_events_count") return "corporate_events";
  if (sortBy === "name") return "name";
  return null;
}
