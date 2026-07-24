import { ADVISORS_COLUMN_CATEGORIES } from "@/components/advisors/advisorsColumnCategories";
import { getAdvisorFieldAliasesForColumn } from "@/components/advisors/advisorsColumnFields";
import type { AdvisorListItem, AdvisorSectorItem } from "@/app/advisors/actions";
import {
  advisorsFiltersToSearchParams,
  createDefaultAdvisorFilters,
  type AdvisorsSearchFilters,
} from "@/lib/advisorsFilterPayload";
import { EMPTY_DISPLAY } from "@/lib/emptyDisplay";
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

const ADVISORS_API_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:Cd_uVQYn:develop";

const EXTRA_ADVISOR_COLUMNS: ExportColumnDef[] = [
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

function getAdvisorId(row: Record<string, unknown>): number {
  const id = Number(row.id);
  return Number.isFinite(id) ? id : 0;
}

function normalizeSelectedAdvisorIds(selectedIds: number[]): number[] {
  return selectedIds
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);
}

function getProfileUrl(id: number): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://www.asymmetrixintelligence.com";
  return `${origin}/advisor/${id}`;
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

function formatAdvisorSectors(value: unknown): string {
  if (value == null || value === "") return EMPTY_DISPLAY;
  if (Array.isArray(value)) {
    const names = value
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          const rec = item as AdvisorSectorItem;
          return String(rec.name ?? "").trim();
        }
        return "";
      })
      .filter(Boolean);
    return names.length > 0 ? names.join(", ") : EMPTY_DISPLAY;
  }
  return toPlainText(value);
}

function getAdvisorCellValue(
  row: Record<string, unknown>,
  column: ExportColumnDef
): string {
  if (column.key === "id") {
    const id = getAdvisorId(row);
    return id > 0 ? String(id) : EMPTY_DISPLAY;
  }

  if (column.key === "asymmetrix_url") {
    const id = getAdvisorId(row);
    return id > 0 ? getProfileUrl(id) : EMPTY_DISPLAY;
  }

  const advisor = row as unknown as AdvisorListItem;

  if (column.key === "name") {
    return toPlainText(advisor.name);
  }

  if (column.key === "website") {
    const raw = readFieldValue(row, getAdvisorFieldAliasesForColumn("website"));
    return normalizeWebsiteUrl(raw) ?? toPlainText(raw);
  }

  if (column.key === "description") {
    return toPlainText(advisor.description);
  }

  if (column.key === "events_advised") {
    return toPlainText(advisor.events_advised);
  }

  if (column.key === "sectors") {
    return formatAdvisorSectors(advisor.sectors);
  }

  if (column.key === "linkedin_members") {
    return toPlainText(advisor.linkedin_members);
  }

  if (column.key === "country") {
    return toPlainText(advisor.country);
  }

  const raw = readFieldValue(row, getAdvisorFieldAliasesForColumn(column.key));
  return toPlainText(raw);
}

function orderRowsBySelectedIds(
  rows: Record<string, unknown>[],
  selectedIds: number[]
): Record<string, unknown>[] {
  const byId = new Map(
    rows
      .map((row) => [getAdvisorId(row), row] as const)
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
    const id = getAdvisorId(item);
    if (id > 0) {
      if (seenIds.has(id)) continue;
      seenIds.add(id);
    }
    allItems.push(item);
    added += 1;
  }
  return added;
}

async function fetchAdvisorsPage(
  filters: AdvisorsSearchFilters,
  page: number,
  perPage: number = EXPORT_PER_PAGE
): Promise<{
  items: Record<string, unknown>[];
  pageTotal: number;
  totalCount: number;
}> {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication required");

  const params = advisorsFiltersToSearchParams({
    ...filters,
    page,
    per_page: perPage,
  });
  const url = `${ADVISORS_API_BASE}/get_all_advisors_list?${params.toString()}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch advisors for export (${response.status})`);
  }

  const raw = (await response.json()) as {
    items?: Record<string, unknown>[];
    result1?: {
      items?: Record<string, unknown>[];
      pageTotal?: number;
      itemsTotal?: number;
    };
    Advisors_companies?: {
      items?: Record<string, unknown>[];
      pageTotal?: number;
      itemsTotal?: number;
    };
    pageTotal?: number;
    itemsTotal?: number;
  };

  const payload = raw.result1 ?? raw.Advisors_companies ?? raw;
  const items = (payload.items ?? raw.items ?? []).filter(
    (item): item is Record<string, unknown> => !!item && typeof item === "object"
  );
  const totalCount = payload.itemsTotal ?? raw.itemsTotal ?? items.length;
  const pageTotal = payload.pageTotal ?? raw.pageTotal ?? 1;

  return { items, pageTotal, totalCount };
}

async function fetchSelectedAdvisorsForExport(
  filters: AdvisorsSearchFilters,
  selectedIds: number[]
): Promise<Record<string, unknown>[]> {
  const safeIds = normalizeSelectedAdvisorIds(selectedIds);
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
    const result = await fetchAdvisorsPage(filters, page, EXPORT_PER_PAGE);
    for (const item of result.items) {
      const id = getAdvisorId(item);
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

async function fetchAllAdvisorsForExport(
  filters: AdvisorsSearchFilters,
  expectedTotalCount?: number
): Promise<Record<string, unknown>[]> {
  let page = 1;
  let pageTotal = 1;
  const allItems: Record<string, unknown>[] = [];
  const seenIds = new Set<number>();
  let resolvedTotalCount =
    expectedTotalCount && expectedTotalCount > 0 ? expectedTotalCount : 0;

  while (page <= pageTotal && page <= MAX_EXPORT_PAGES) {
    const result = await fetchAdvisorsPage(filters, page, EXPORT_PER_PAGE);

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

export async function exportAdvisorsList(
  request: ListExportRequest,
  filters: AdvisorsSearchFilters,
  visibleColumnKeys: string[],
  expectedTotalCount?: number
): Promise<void> {
  let rows: Record<string, unknown>[];

  if (request.scope === "selected") {
    const selectedIds = normalizeSelectedAdvisorIds(request.selectedIds ?? []);
    if (selectedIds.length === 0) return;
    rows = await fetchSelectedAdvisorsForExport(
      filters ?? createDefaultAdvisorFilters(),
      selectedIds
    );
  } else {
    rows = await fetchAllAdvisorsForExport(
      filters ?? createDefaultAdvisorFilters(),
      expectedTotalCount
    );
  }

  await runGenericListExport({
    request,
    config: {
      entitySheetName: "Advisors",
      filePrefix: "Advisors",
      categories: ADVISORS_COLUMN_CATEGORIES,
      visibleColumnKeys,
      extraLeadingColumns: EXTRA_ADVISOR_COLUMNS,
    },
    rows,
    getEntityName: (row) => String(row.name ?? "—"),
    getCellValue: getAdvisorCellValue,
  });
}
