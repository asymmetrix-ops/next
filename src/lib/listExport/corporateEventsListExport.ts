import {
  CORPORATE_EVENTS_COLUMN_CATEGORIES,
  CORPORATE_EVENTS_EXPORT_CATEGORIES,
} from "@/components/corporate-events/corporateEventsColumnCategories";
import {
  extractAdvisorLinks,
  extractBuyerLinks,
  extractInvestorLinks,
  extractSellerLinks,
  extractTargetLinks,
} from "@/components/corporate-events/corporateEventsPartyLinks";
import {
  formatCorporateEventDate,
  getFundingStage,
  getTargetCompany,
  getTargetCountry,
  getTargetName,
} from "@/components/corporate-events/corporateEventsTableUtils";
import {
  createDefaultCorporateEventFilters,
  corporateEventsFiltersToSearchParams,
  type CorporateEventsSearchFilters,
} from "@/lib/corporateEventsFilterPayload";
import { EMPTY_DISPLAY } from "@/lib/emptyDisplay";
import type { CorporateEvent } from "@/types/corporateEvents";
import { readFieldValue } from "./readFieldValue";
import { runGenericListExport } from "./runListExport";
import {
  EXPORT_ALL_ENTITIES_CAP,
  type ExportColumnDef,
  type ListExportRequest,
} from "./types";

const EXPORT_PER_PAGE = 100;
const MAX_EXPORT_PAGES = 500;

const CORPORATE_EVENTS_API_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:617tZc8l:develop";

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("asymmetrix_auth_token");
}

function getEventId(row: Record<string, unknown>): number {
  const id = Number(row.id);
  return Number.isFinite(id) ? id : 0;
}

function getProfileUrl(id: number): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://www.asymmetrixintelligence.com";
  return `${origin}/corporate-event/${id}`;
}

function toPlainText(value: unknown): string {
  if (value == null || value === "") return EMPTY_DISPLAY;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toLocaleString() : EMPTY_DISPLAY;
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "[]" || trimmed === "{}") return EMPTY_DISPLAY;
    return trimmed;
  }
  if (Array.isArray(value)) {
    const text = value.map(String).filter(Boolean).join(", ");
    return text || EMPTY_DISPLAY;
  }
  return String(value);
}

function formatSectorList(value: unknown): string {
  if (value == null || value === "") return EMPTY_DISPLAY;
  if (Array.isArray(value)) {
    const names = value
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          return String(
            (item as { sector_name?: string; name?: string }).sector_name ??
              (item as { name?: string }).name ??
              ""
          ).trim();
        }
        return "";
      })
      .filter(Boolean);
    return names.length > 0 ? names.join(", ") : EMPTY_DISPLAY;
  }
  return toPlainText(value);
}

function formatCurrencyAmount(
  amount: unknown,
  currency: unknown
): string {
  if (amount == null || currency == null || currency === "") return EMPTY_DISPLAY;
  const n =
    typeof amount === "number"
      ? amount
      : Number(String(amount).replace(/,/g, "").trim());
  if (Number.isNaN(n)) return EMPTY_DISPLAY;
  return `${String(currency)}${n.toLocaleString(undefined, {
    maximumFractionDigits: 3,
  })}`;
}

function linkNames(links: Array<{ name?: string | null }>): string {
  const names = links
    .map((link) => link.name?.trim())
    .filter((name): name is string => Boolean(name));
  return names.length > 0 ? names.join(", ") : EMPTY_DISPLAY;
}

function formatPartiesExport(event: CorporateEvent): string {
  const partnership = /partnership/i.test(event.deal_type || "");
  const parts: string[] = [];
  const targets = linkNames(extractTargetLinks(event));
  if (targets !== EMPTY_DISPLAY) {
    parts.push(`${partnership ? "Target(s)" : "Target"}: ${targets}`);
  }
  const buyers = linkNames(extractBuyerLinks(event));
  if (buyers !== EMPTY_DISPLAY) parts.push(`Buyer(s): ${buyers}`);
  const investors = linkNames(extractInvestorLinks(event));
  if (investors !== EMPTY_DISPLAY) parts.push(`Investor(s): ${investors}`);
  if (!partnership) {
    const sellers = linkNames(extractSellerLinks(event));
    parts.push(`Seller(s): ${sellers === EMPTY_DISPLAY ? "-" : sellers}`);
  }
  return parts.length > 0 ? parts.join(" | ") : EMPTY_DISPLAY;
}

function formatDealDetailsExport(event: CorporateEvent): string {
  const fundingStage = getFundingStage(event);
  const parts = [
    event.deal_type ? `Deal Type: ${event.deal_type}` : null,
    fundingStage ? `Funding Stage: ${fundingStage}` : null,
    event.investment_data?.investment_amount_m != null &&
    event.investment_data?.currency?.Currency
      ? `Amount (m): ${formatCurrencyAmount(
          event.investment_data.investment_amount_m,
          event.investment_data.currency.Currency
        )}`
      : null,
    event.ev_data?.enterprise_value_m != null && event.ev_data?.currency?.Currency
      ? `EV (m): ${formatCurrencyAmount(
          event.ev_data.enterprise_value_m,
          event.ev_data.currency.Currency
        )}`
      : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" | ") : EMPTY_DISPLAY;
}

function formatBuyersInvestors(event: CorporateEvent): string {
  const names = [
    ...extractBuyerLinks(event),
    ...extractInvestorLinks(event),
  ]
    .map((link) => link.name?.trim())
    .filter((name): name is string => Boolean(name));
  const unique = Array.from(new Set(names));
  return unique.length > 0 ? unique.join(", ") : EMPTY_DISPLAY;
}

function getCorporateEventCellValue(
  row: Record<string, unknown>,
  column: ExportColumnDef
): string {
  const event = row as unknown as CorporateEvent;

  if (column.key === "asymmetrix_url") {
    const id = getEventId(row);
    return id > 0 ? getProfileUrl(id) : EMPTY_DISPLAY;
  }

  if (column.key === "description") {
    return toPlainText(event.description);
  }

  if (column.key === "announcement_date") {
    return formatCorporateEventDate(event.announcement_date) || EMPTY_DISPLAY;
  }

  if (column.key === "target") {
    return getTargetName(event) || EMPTY_DISPLAY;
  }

  if (column.key === "target_hq") {
    return getTargetCountry(event) || EMPTY_DISPLAY;
  }

  if (column.key === "parties") {
    return formatPartiesExport(event);
  }

  if (column.key === "deal_details") {
    return formatDealDetailsExport(event);
  }

  if (column.key === "investors") {
    return formatBuyersInvestors(event);
  }

  if (column.key === "sellers") {
    return linkNames(extractSellerLinks(event));
  }

  if (column.key === "advisors") {
    return linkNames(extractAdvisorLinks(event));
  }

  if (column.key === "deal_type") {
    return toPlainText(event.deal_type);
  }

  if (column.key === "funding_stage") {
    return toPlainText(getFundingStage(event));
  }

  if (column.key === "investment_amount") {
    return formatCurrencyAmount(
      event.investment_data?.investment_amount_m,
      event.investment_data?.currency?.Currency
    );
  }

  if (column.key === "enterprise_value") {
    return formatCurrencyAmount(
      event.ev_data?.enterprise_value_m,
      event.ev_data?.currency?.Currency
    );
  }

  if (column.key === "primary_sectors") {
    const target = getTargetCompany(event) as
      | {
          primary_sectors?: unknown;
          _sectors_primary?: unknown;
        }
      | null;
    const formatted =
      formatSectorList(target?.primary_sectors) ||
      formatSectorList(target?._sectors_primary);
    return formatted;
  }

  if (column.key === "secondary_sectors") {
    const target = getTargetCompany(event) as
      | {
          secondary_sectors?: unknown;
          _sectors_secondary?: unknown;
        }
      | null;
    const formatted =
      formatSectorList(target?.secondary_sectors) ||
      formatSectorList(target?._sectors_secondary);
    return formatted;
  }

  return toPlainText(readFieldValue(row, [column.key]));
}

function appendUniqueItems(
  allItems: Record<string, unknown>[],
  seenIds: Set<number>,
  items: Record<string, unknown>[]
): number {
  let added = 0;
  for (const item of items) {
    const id = getEventId(item);
    if (id > 0) {
      if (seenIds.has(id)) continue;
      seenIds.add(id);
    }
    allItems.push(item);
    added += 1;
  }
  return added;
}

async function fetchCorporateEventsPage(
  filters: CorporateEventsSearchFilters,
  page: number,
  perPage: number = EXPORT_PER_PAGE
): Promise<{
  items: Record<string, unknown>[];
  pageTotal: number;
  totalCount: number;
}> {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication required");

  const params = corporateEventsFiltersToSearchParams({
    ...filters,
    Page: page,
    Per_page: perPage,
  });
  const url = `${CORPORATE_EVENTS_API_BASE}/get_all_corporate_events?${params.toString()}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch corporate events for export (${response.status})`
    );
  }

  const raw = (await response.json()) as {
    items?: unknown[];
    pageTotal?: number;
    itemTotal?: number;
    itemsReceived?: number;
  };
  const rawItems = Array.isArray(raw.items) ? raw.items : [];
  const items = rawItems.filter(
    (item): item is Record<string, unknown> => !!item && typeof item === "object"
  );
  const totalCount =
    typeof raw.itemTotal === "number"
      ? raw.itemTotal
      : typeof raw.itemsReceived === "number"
        ? raw.itemsReceived
        : items.length;
  const pageTotal = raw.pageTotal || 1;

  return { items, pageTotal, totalCount };
}

async function fetchAllCorporateEventsForExport(
  filters: CorporateEventsSearchFilters,
  expectedTotalCount?: number
): Promise<Record<string, unknown>[]> {
  let page = 1;
  let pageTotal = 1;
  const allItems: Record<string, unknown>[] = [];
  const seenIds = new Set<number>();
  let resolvedTotalCount =
    expectedTotalCount && expectedTotalCount > 0 ? expectedTotalCount : 0;

  while (page <= pageTotal && page <= MAX_EXPORT_PAGES) {
    const result = await fetchCorporateEventsPage(filters, page, EXPORT_PER_PAGE);

    if (page === 1) {
      if (!resolvedTotalCount && result.totalCount > 0) {
        resolvedTotalCount = result.totalCount;
      }
      pageTotal = Math.min(
        result.pageTotal,
        resolvedTotalCount > 0
          ? Math.ceil(
              Math.min(resolvedTotalCount, EXPORT_ALL_ENTITIES_CAP) / EXPORT_PER_PAGE
            )
          : result.pageTotal
      );
    }

    if (result.items.length === 0) break;

    const added = appendUniqueItems(allItems, seenIds, result.items);
    if (added === 0) break;

    if (allItems.length >= EXPORT_ALL_ENTITIES_CAP) break;
    if (resolvedTotalCount > 0 && allItems.length >= resolvedTotalCount) break;
    if (result.items.length < EXPORT_PER_PAGE) break;

    page += 1;
  }

  return allItems.slice(0, EXPORT_ALL_ENTITIES_CAP);
}

export async function exportCorporateEventsList(
  request: ListExportRequest,
  filters: CorporateEventsSearchFilters,
  visibleColumnKeys: string[],
  expectedTotalCount?: number
): Promise<void> {
  if (request.scope === "selected") {
    return;
  }

  const rows = await fetchAllCorporateEventsForExport(
    filters ?? createDefaultCorporateEventFilters(),
    expectedTotalCount
  );

  await runGenericListExport({
    request,
    config: {
      entitySheetName: "Corporate Events",
      filePrefix: "CorporateEvents",
      categories: CORPORATE_EVENTS_COLUMN_CATEGORIES,
      allColumnsCategories: CORPORATE_EVENTS_EXPORT_CATEGORIES,
      visibleColumnKeys,
    },
    rows,
    getEntityName: (row) =>
      String((row as unknown as CorporateEvent).description ?? "—"),
    getCellValue: getCorporateEventCellValue,
  });
}
