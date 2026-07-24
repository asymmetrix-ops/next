import {
  INVESTORS_COLUMN_CATEGORIES,
  INVESTORS_EXPORT_CATEGORIES,
} from "@/components/investors/investorsColumnCategories";
import { getInvestorFieldAliasesForColumn } from "@/components/investors/investorsColumnFields";
import type { InvestorListItem } from "@/app/investors/actions";
import {
  createDefaultInvestorFilters,
  investorSearchPayloadToSearchParams,
  type InvestorsSearchFilters,
} from "@/lib/investorsFilterPayload";
import { EMPTY_DISPLAY } from "@/lib/emptyDisplay";
import { normalizeLinkedInProfileUrl } from "@/lib/linkedinUrl";
import { normalizeWebsiteUrl } from "@/lib/websiteUrl";
import { readFieldValue } from "./readFieldValue";
import { runGenericListExport } from "./runListExport";
import {
  EXPORT_ALL_ENTITIES_CAP,
  type ExportColumnDef,
  type ListExportRequest,
} from "./types";

const EXPORT_PER_PAGE = 100;
const MAX_EXPORT_PAGES = 500;

const INVESTORS_API_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm:develop";

const EXTRA_INVESTOR_COLUMNS: ExportColumnDef[] = [
  {
    key: "id",
    label: "ID",
    categoryName: "Identity",
    type: "number",
  },
  {
    key: "asymmetrix_url",
    label: "Asymmetrix URL",
    categoryName: "Identity",
    type: "url",
  },
];

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("asymmetrix_auth_token");
}

function getInvestorId(row: Record<string, unknown>): number {
  const id = Number(row.original_new_company_id ?? row.id);
  return Number.isFinite(id) ? id : 0;
}

function normalizeSelectedInvestorIds(selectedIds: number[]): number[] {
  return selectedIds
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);
}

function getProfileUrl(id: number): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://www.asymmetrixintelligence.com";
  return `${origin}/investors/${id}`;
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

function formatInvestorSectors(value: unknown): string {
  if (value == null || value === "") return EMPTY_DISPLAY;
  if (Array.isArray(value)) {
    const names = value
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          return String(
            (item as { name?: string; sector_name?: string }).name ??
              (item as { sector_name?: string }).sector_name ??
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

function getInvestorCellValue(
  row: Record<string, unknown>,
  column: ExportColumnDef
): string {
  if (column.key === "id") {
    const id = getInvestorId(row);
    return id > 0 ? String(id) : EMPTY_DISPLAY;
  }

  if (column.key === "asymmetrix_url") {
    const id = getInvestorId(row);
    return id > 0 ? getProfileUrl(id) : EMPTY_DISPLAY;
  }

  const investor = row as unknown as InvestorListItem;

  if (column.key === "name") {
    return toPlainText(investor.company_name ?? row.name);
  }

  if (column.key === "website") {
    const raw = readFieldValue(row, getInvestorFieldAliasesForColumn("website"));
    return normalizeWebsiteUrl(raw) ?? toPlainText(raw);
  }

  if (column.key === "type") {
    return formatInvestorSectors(investor.investor_type);
  }

  if (column.key === "description") {
    return toPlainText(investor.description);
  }

  if (column.key === "events_advised") {
    const raw = readFieldValue(
      row,
      getInvestorFieldAliasesForColumn("events_advised")
    );
    return toPlainText(raw);
  }

  if (column.key === "portfolio_companies") {
    return toPlainText(investor.number_of_active_investments);
  }

  if (column.key === "primary_sectors") {
    return formatInvestorSectors(
      investor.da_primary_sector_names ??
        readFieldValue(row, getInvestorFieldAliasesForColumn("primary_sectors"))
    );
  }

  if (column.key === "linkedin_members") {
    return toPlainText(investor.linkedin_members);
  }

  if (column.key === "country") {
    return toPlainText(investor.country);
  }

  if (column.key === "years_since_last_investment") {
    const lastInvestment = investor.last_investment;
    if (lastInvestment?.display) return String(lastInvestment.display);
    return toPlainText(investor.years_since_last_investment);
  }

  if (column.key === "linkedin_url") {
    const raw = readFieldValue(row, getInvestorFieldAliasesForColumn("linkedin_url"));
    return (
      normalizeLinkedInProfileUrl(raw) ??
      normalizeWebsiteUrl(raw) ??
      toPlainText(raw)
    );
  }

  const raw = readFieldValue(row, getInvestorFieldAliasesForColumn(column.key));
  return toPlainText(raw);
}

function orderRowsBySelectedIds(
  rows: Record<string, unknown>[],
  selectedIds: number[]
): Record<string, unknown>[] {
  const byId = new Map(
    rows
      .map((row) => [getInvestorId(row), row] as const)
      .filter(([id]) => id > 0)
  );
  return selectedIds
    .map((id) => byId.get(id))
    .filter((row): row is Record<string, unknown> => Boolean(row));
}

function appendUniqueItems(
  allItems: Record<string, unknown>[],
  seenIds: Set<number>,
  items: Record<string, unknown>[]
): number {
  let added = 0;
  for (const item of items) {
    const id = getInvestorId(item);
    if (id > 0) {
      if (seenIds.has(id)) continue;
      seenIds.add(id);
    }
    allItems.push(item);
    added += 1;
  }
  return added;
}

async function fetchInvestorsPage(
  filters: InvestorsSearchFilters,
  page: number,
  perPage: number = EXPORT_PER_PAGE
): Promise<{
  items: Record<string, unknown>[];
  pageTotal: number;
  totalCount: number;
}> {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication required");

  const params = investorSearchPayloadToSearchParams({
    ...filters,
    page,
    per_page: perPage,
  });
  const url = `${INVESTORS_API_BASE}/investors_with_d_a_list?${params.toString()}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch investors for export (${response.status})`);
  }

  const raw = await response.json();
  const investors = raw?.investors ?? raw;
  const rawItems: unknown[] = Array.isArray(investors?.items)
    ? investors.items
    : [];
  const items = rawItems.filter(
    (item): item is Record<string, unknown> => !!item && typeof item === "object"
  );
  const totalCount =
    typeof investors?.itemsTotal === "number" ? investors.itemsTotal : items.length;
  const pageTotal = investors?.pageTotal || 1;

  return { items, pageTotal, totalCount };
}

async function fetchSelectedInvestorsForExport(
  filters: InvestorsSearchFilters,
  selectedIds: number[]
): Promise<Record<string, unknown>[]> {
  const safeIds = normalizeSelectedInvestorIds(selectedIds);
  if (safeIds.length === 0) return [];

  const selectedSet = new Set(safeIds);
  const found = new Map<number, Record<string, unknown>>();
  let page = 1;
  let pageTotal = 1;

  while (
    page <= pageTotal &&
    page <= MAX_EXPORT_PAGES &&
    found.size < selectedSet.size
  ) {
    const result = await fetchInvestorsPage(filters, page, EXPORT_PER_PAGE);
    for (const item of result.items) {
      const id = getInvestorId(item);
      if (selectedSet.has(id)) {
        found.set(id, item);
      }
    }

    if (result.items.length === 0) break;
    pageTotal = result.pageTotal;
    page += 1;
  }

  return orderRowsBySelectedIds(Array.from(found.values()), safeIds);
}

async function fetchAllInvestorsForExport(
  filters: InvestorsSearchFilters,
  expectedTotalCount?: number
): Promise<Record<string, unknown>[]> {
  let page = 1;
  let pageTotal = 1;
  const allItems: Record<string, unknown>[] = [];
  const seenIds = new Set<number>();
  let resolvedTotalCount =
    expectedTotalCount && expectedTotalCount > 0 ? expectedTotalCount : 0;

  while (page <= pageTotal && page <= MAX_EXPORT_PAGES) {
    const result = await fetchInvestorsPage(filters, page, EXPORT_PER_PAGE);

    if (page === 1) {
      if (!resolvedTotalCount && result.totalCount > 0) {
        resolvedTotalCount = result.totalCount;
      }
      pageTotal = Math.min(
        result.pageTotal,
        resolvedTotalCount > 0
          ? Math.ceil(Math.min(resolvedTotalCount, EXPORT_ALL_ENTITIES_CAP) / EXPORT_PER_PAGE)
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

export async function exportInvestorsList(
  request: ListExportRequest,
  filters: InvestorsSearchFilters,
  visibleColumnKeys: string[],
  expectedTotalCount?: number
): Promise<void> {
  let rows: Record<string, unknown>[];

  if (request.scope === "selected") {
    const selectedIds = normalizeSelectedInvestorIds(request.selectedIds ?? []);
    if (selectedIds.length === 0) return;
    rows = await fetchSelectedInvestorsForExport(
      filters ?? createDefaultInvestorFilters(),
      selectedIds
    );
  } else {
    rows = await fetchAllInvestorsForExport(
      filters ?? createDefaultInvestorFilters(),
      expectedTotalCount
    );
  }

  await runGenericListExport({
    request,
    config: {
      entitySheetName: "Investors",
      filePrefix: "Investors",
      categories: INVESTORS_COLUMN_CATEGORIES,
      allColumnsCategories: INVESTORS_EXPORT_CATEGORIES,
      visibleColumnKeys,
      extraLeadingColumns: EXTRA_INVESTOR_COLUMNS,
    },
    rows,
    getEntityName: (row) => String(row.company_name ?? row.name ?? "—"),
    getCellValue: getInvestorCellValue,
  });
}
