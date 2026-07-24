import {
  COMPANIES_COLUMN_CATEGORIES,
  type CompanyColumnType,
} from "@/components/companies/companiesColumnCategories";
import {
  getFieldAliasesForColumn,
  LIST_JSON_COLUMN_KEYS,
} from "@/components/companies/companiesColumnFields";
import { getApiColumnsForSelectedKeys } from "@/components/companies/companiesApiColumns";
import { companySearchPayloadToSearchParams } from "@/lib/companiesFilterPayload";
import type { CompanySearchPayload } from "@/lib/filterBuilder";
import { formatCompanyColumnDisplay } from "@/lib/companyTableData";
import { mapCompanyTableApiRow } from "@/lib/companyTableData";
import { normalizeCompaniesResponse } from "@/app/companies/normalizeCompaniesResponse";
import { EMPTY_DISPLAY } from "@/lib/emptyDisplay";
import { readFieldValue } from "./readFieldValue";
import { runGenericListExport } from "./runListExport";
import { EXPORT_ALL_ENTITIES_CAP, type ExportColumnDef, type ListExportRequest } from "./types";

const EXPORT_PER_PAGE = 100;
const MAX_EXPORT_PAGES = 500;

const COMPANIES_API_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au:develop";

const COLUMN_TYPE_BY_KEY = new Map<string, CompanyColumnType>(
  COMPANIES_COLUMN_CATEGORIES.flatMap((category) =>
    category.columns.map((column) => [column.columnKey, column.type])
  )
);

const EXTRA_COMPANY_COLUMNS: ExportColumnDef[] = [
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

function getAllExportApiColumns(): string[] {
  return getApiColumnsForSelectedKeys(
    COMPANIES_COLUMN_CATEGORIES.flatMap((category) =>
      category.columns.map((column) => column.columnKey)
    )
  );
}

function normalizeSelectedCompanyIds(selectedIds: number[]): number[] {
  return selectedIds
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);
}

function buildSelectedCompaniesFilters(
  filters: CompanySearchPayload,
  selectedIds: number[]
): CompanySearchPayload {
  const safeIds = normalizeSelectedCompanyIds(selectedIds);
  if (safeIds.length === 0) {
    return filters;
  }

  return {
    ...filters,
    company_ids: safeIds,
    Offset: 1,
    Per_page: Math.min(Math.max(safeIds.length, 1), EXPORT_PER_PAGE),
  };
}

function orderRowsBySelectedIds(
  rows: Record<string, unknown>[],
  selectedIds: number[]
): Record<string, unknown>[] {
  const byId = new Map(
    rows
      .map((row) => [Number(row.id), row] as const)
      .filter(([id]) => Number.isFinite(id) && id > 0)
  );
  return selectedIds
    .map((id) => byId.get(id))
    .filter((row): row is Record<string, unknown> => Boolean(row));
}

function getProfileUrl(id: number): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://www.asymmetrixintelligence.com";
  return `${origin}/company/${id}`;
}

function parseListField(value: unknown): unknown[] {
  if (value == null || value === "") return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "[]" || trimmed === "{}") return [];
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === "object") return Object.values(parsed);
    } catch {
      return trimmed
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
    }
  }
  if (typeof value === "object") return Object.values(value as Record<string, unknown>);
  return [value];
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
    const text = value
      .map((item) => {
        if (typeof item === "string" || typeof item === "number") return String(item);
        if (item && typeof item === "object") {
          const rec = item as Record<string, unknown>;
          return String(
            rec.name ??
              rec.sector_name ??
              rec.investor_name ??
              rec.Product_Type ??
              rec.Data_Collection_Method ??
              rec.Revenue_Model_ ??
              ""
          ).trim();
        }
        return "";
      })
      .filter(Boolean)
      .join(", ");
    return text || EMPTY_DISPLAY;
  }
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    const preferred =
      rec.name ??
      rec.ownership ??
      rec.sector_name ??
      rec.City ??
      rec.Country ??
      rec.display ??
      rec.label;
    if (preferred != null) return toPlainText(preferred);
    return EMPTY_DISPLAY;
  }
  return String(value);
}

function getCompanyCellValue(
  row: Record<string, unknown>,
  column: ExportColumnDef
): string {
  if (column.key === "id") {
    const id = Number(row.id);
    return Number.isFinite(id) && id > 0 ? String(id) : EMPTY_DISPLAY;
  }

  if (column.key === "asymmetrix_url") {
    const id = Number(row.id);
    return Number.isFinite(id) && id > 0 ? getProfileUrl(id) : EMPTY_DISPLAY;
  }

  if (column.key === "years_since_last_investment") {
    return toPlainText(row.years_since_last_investment);
  }

  const raw = readFieldValue(row, [...getFieldAliasesForColumn(column.key)]);

  if (LIST_JSON_COLUMN_KEYS.has(column.key)) {
    const parsed = parseListField(raw);
    return parsed.length > 0 ? toPlainText(parsed) : EMPTY_DISPLAY;
  }

  const columnType = (COLUMN_TYPE_BY_KEY.get(column.key) ??
    column.type) as CompanyColumnType;

  if (columnType === "paragraph" || columnType === "text" || columnType === "url") {
    return toPlainText(raw);
  }

  return formatCompanyColumnDisplay(column.key, columnType, raw);
}

function appendUniqueItems(
  allItems: Record<string, unknown>[],
  seenIds: Set<number>,
  items: Record<string, unknown>[]
): number {
  let added = 0;
  for (const item of items) {
    const id = Number(item.id);
    if (Number.isFinite(id) && id > 0) {
      if (seenIds.has(id)) continue;
      seenIds.add(id);
    }
    allItems.push(item);
    added += 1;
  }
  return added;
}

function computeInitialPageLimit(expectedTotalCount?: number): number {
  if (expectedTotalCount && expectedTotalCount > 0) {
    return Math.min(
      Math.ceil(expectedTotalCount / EXPORT_PER_PAGE),
      MAX_EXPORT_PAGES
    );
  }
  return MAX_EXPORT_PAGES;
}

function resolveExportPageLimit(
  expectedTotalCount: number | undefined,
  apiTotalCount: number,
  pageTotal: number,
  listPerPage = 20
): number {
  const totalItems =
    expectedTotalCount && expectedTotalCount > 0
      ? expectedTotalCount
      : apiTotalCount > 0
        ? apiTotalCount
        : 0;

  if (totalItems > 0) {
    return Math.min(Math.ceil(totalItems / EXPORT_PER_PAGE), MAX_EXPORT_PAGES);
  }

  if (pageTotal > 0) {
    const pagesIfItemCount = Math.ceil(pageTotal / EXPORT_PER_PAGE);
    const pagesIfListPages = Math.ceil(
      (pageTotal * Math.max(listPerPage, 1)) / EXPORT_PER_PAGE
    );

    // API sometimes puts total item count in pageTotal — never treat that as page count.
    if (pageTotal > MAX_EXPORT_PAGES) {
      return Math.min(pagesIfItemCount, MAX_EXPORT_PAGES);
    }

    return Math.min(
      Math.max(pagesIfListPages, pagesIfItemCount),
      MAX_EXPORT_PAGES
    );
  }

  return MAX_EXPORT_PAGES;
}

async function fetchCompaniesPage(
  filters: CompanySearchPayload,
  page: number,
  apiColumns: string[],
  perPage: number = EXPORT_PER_PAGE
): Promise<{
  items: Record<string, unknown>[];
  pageTotal: number;
  curPage: number;
  nextPage: number | null;
  totalCount: number;
  perPage: number;
}> {
  const token = getAuthToken();
  const params = companySearchPayloadToSearchParams(
    { ...filters, columns: apiColumns },
    { page, perPage }
  );
  const url = `${COMPANIES_API_BASE}/Get_new_companies?${params.toString()}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch companies for export (${response.status})`);
  }

  const raw = await response.json();
  const normalized = normalizeCompaniesResponse(raw);
  const {
    items,
    pageTotal,
    curPage,
    nextPage,
    totalCount = 0,
    perPage: responsePerPage,
  } = normalized.result1;

  return {
    items: items as unknown as Record<string, unknown>[],
    pageTotal,
    curPage,
    nextPage,
    totalCount,
    perPage: responsePerPage || perPage,
  };
}

async function fetchSelectedCompaniesForExport(
  filters: CompanySearchPayload,
  selectedIds: number[]
): Promise<Record<string, unknown>[]> {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication required");

  const safeIds = normalizeSelectedCompanyIds(selectedIds);
  if (safeIds.length === 0) return [];

  const apiColumns = getAllExportApiColumns();
  const exportFilters = buildSelectedCompaniesFilters(filters, safeIds);
  const perPage = Math.min(Math.max(safeIds.length, 1), EXPORT_PER_PAGE);
  const result = await fetchCompaniesPage(
    exportFilters,
    1,
    apiColumns,
    perPage
  );

  return orderRowsBySelectedIds(result.items, safeIds);
}

async function fetchAllCompaniesForExport(
  filters: CompanySearchPayload,
  expectedTotalCount?: number
): Promise<Record<string, unknown>[]> {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication required");

  const apiColumns = getAllExportApiColumns();
  let page = 1;
  const allItems: Record<string, unknown>[] = [];
  const seenIds = new Set<number>();
  let resolvedTotalCount =
    expectedTotalCount && expectedTotalCount > 0 ? expectedTotalCount : 0;
  let pageLimit = computeInitialPageLimit(expectedTotalCount);

  while (page <= pageLimit) {
    const result = await fetchCompaniesPage(filters, page, apiColumns);

    if (page === 1) {
      if (!resolvedTotalCount && result.totalCount > 0) {
        resolvedTotalCount = result.totalCount;
      }
      pageLimit = Math.min(
        pageLimit,
        resolveExportPageLimit(
          resolvedTotalCount || undefined,
          result.totalCount,
          result.pageTotal,
          result.perPage
        )
      );
    }

    if (result.items.length === 0) break;

    const added = appendUniqueItems(allItems, seenIds, result.items);
    if (added === 0) break;

    if (allItems.length >= EXPORT_ALL_ENTITIES_CAP) break;
    if (resolvedTotalCount > 0 && allItems.length >= resolvedTotalCount) break;

    if (result.items.length < EXPORT_PER_PAGE) break;
    if (result.nextPage == null) break;
    if (result.curPage >= pageLimit) break;

    const nextPage = result.nextPage > page ? result.nextPage : page + 1;
    if (nextPage <= page) break;
    page = nextPage;
  }

  return allItems.slice(0, EXPORT_ALL_ENTITIES_CAP);
}

export async function exportCompaniesList(
  request: ListExportRequest,
  filters: CompanySearchPayload,
  visibleColumnKeys: string[],
  expectedTotalCount?: number
): Promise<void> {
  let rows: Record<string, unknown>[];

  if (request.scope === "selected") {
    const selectedIds = normalizeSelectedCompanyIds(request.selectedIds ?? []);
    if (selectedIds.length === 0) return;
    rows = await fetchSelectedCompaniesForExport(filters, selectedIds);
  } else {
    rows = await fetchAllCompaniesForExport(filters, expectedTotalCount);
  }

  await runGenericListExport({
    request,
    config: {
      entitySheetName: "Companies",
      filePrefix: "Companies",
      categories: COMPANIES_COLUMN_CATEGORIES,
      visibleColumnKeys,
      extraLeadingColumns: EXTRA_COMPANY_COLUMNS,
    },
    rows,
    getEntityName: (row) => String(row.name ?? "—"),
    getCellValue: getCompanyCellValue,
  });
}

export function normalizeCompanyExportRow(
  row: Record<string, unknown>
): Record<string, unknown> {
  return mapCompanyTableApiRow(row);
}
