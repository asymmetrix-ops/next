import { getCorporateEventFieldAliasesForColumn } from "./corporateEventsColumnFields";
import type { CorporateEvent } from "@/types/corporateEvents";
import {
  derivePrimaryFromCompany,
  deriveSecondaryFromCompany,
  getFundingStage,
  getTargetCompany,
  getTargetCountry,
  getTargetName,
} from "./corporateEventsTableUtils";

export type ColumnSortKind = "text" | "number" | "date";

const NOT_SORTABLE = null;

export const CORPORATE_EVENT_COLUMN_SORT_KIND: Record<
  string,
  ColumnSortKind | null
> = {
  description: "text",
  announcement_date: "date",
  target: "text",
  target_hq: "text",
  parties: NOT_SORTABLE,
  deal_type: "text",
  funding_stage: "text",
  investment_amount: "number",
  enterprise_value: "number",
  advisors: NOT_SORTABLE,
  primary_sectors: "text",
  secondary_sectors: "text",
};

export function getCorporateEventColumnSortKind(
  columnKey: string
): ColumnSortKind | null {
  return CORPORATE_EVENT_COLUMN_SORT_KIND[columnKey] ?? null;
}

function readValue(
  event: Record<string, unknown>,
  aliases: readonly string[]
): unknown {
  for (const alias of aliases) {
    const value = event[alias];
    if (value != null && value !== "") return value;
  }
  return undefined;
}

export function getCorporateEventSortValueForColumn(
  event: Record<string, unknown>,
  columnKey: string
): string | number | null {
  const kind = getCorporateEventColumnSortKind(columnKey);
  if (!kind) return null;

  const corporateEvent = event as unknown as CorporateEvent;
  let raw: unknown;

  switch (columnKey) {
    case "target":
      raw = getTargetName(corporateEvent);
      break;
    case "target_hq":
      raw = getTargetCountry(corporateEvent);
      break;
    case "funding_stage":
      raw = getFundingStage(corporateEvent);
      break;
    case "investment_amount":
      raw = corporateEvent.investment_data?.investment_amount_m;
      break;
    case "enterprise_value":
      raw = corporateEvent.ev_data?.enterprise_value_m;
      break;
    case "primary_sectors":
      raw = derivePrimaryFromCompany(getTargetCompany(corporateEvent), {});
      break;
    case "secondary_sectors":
      raw = deriveSecondaryFromCompany(getTargetCompany(corporateEvent));
      break;
    default:
      raw = readValue(event, getCorporateEventFieldAliasesForColumn(columnKey));
  }

  if (raw == null || raw === "") return null;

  if (kind === "number") {
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  }

  if (kind === "date") {
    const time = Date.parse(String(raw));
    return Number.isFinite(time) ? time : null;
  }

  return String(raw).toLowerCase();
}

export function compareCorporateEventSortValues(
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
