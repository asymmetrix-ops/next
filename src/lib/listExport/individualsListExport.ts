import { INDIVIDUALS_COLUMN_CATEGORIES } from "@/components/individuals/individualsColumnCategories";
import {
  formatIndividualLocation,
  formatIndividualRoles,
  getIndividualFieldAliasesForColumn,
} from "@/components/individuals/individualsColumnFields";
import type { Individual } from "@/types/individuals";
import {
  createDefaultIndividualFilters,
  individualsFiltersToRequestBody,
  type IndividualsSearchFilters,
} from "@/lib/individualsFilterPayload";
import { EMPTY_DISPLAY } from "@/lib/emptyDisplay";
import { normalizeIndividualExportRow } from "@/lib/normalizeIndividual";
import { readFieldValue } from "./readFieldValue";
import { runGenericListExport } from "./runListExport";
import {
  EXPORT_ALL_ENTITIES_CAP,
  type ExportColumnDef,
  type ListExportRequest,
} from "./types";

const EXPORT_PER_PAGE = 100;
const MAX_EXPORT_PAGES = 500;

const INDIVIDUALS_API_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:Xpykjv0R:develop";

const EXTRA_INDIVIDUAL_COLUMNS: ExportColumnDef[] = [
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

function getIndividualId(row: Record<string, unknown>): number {
  const id = Number(row.id);
  return Number.isFinite(id) ? id : 0;
}

function normalizeSelectedIndividualIds(selectedIds: number[]): number[] {
  return selectedIds
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);
}

function getProfileUrl(id: number): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://www.asymmetrixintelligence.com";
  return `${origin}/individual/${id}`;
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

function getIndividualCellValue(
  row: Record<string, unknown>,
  column: ExportColumnDef
): string {
  if (column.key === "id") {
    const id = getIndividualId(row);
    return id > 0 ? String(id) : EMPTY_DISPLAY;
  }

  if (column.key === "asymmetrix_url") {
    const id = getIndividualId(row);
    return id > 0 ? getProfileUrl(id) : EMPTY_DISPLAY;
  }

  const individual = row as unknown as Individual;

  if (column.key === "name") {
    return toPlainText(individual.advisor_individuals);
  }

  if (column.key === "current_company") {
    return toPlainText(individual.current_company);
  }

  if (column.key === "current_roles") {
    return formatIndividualRoles(individual);
  }

  if (column.key === "location") {
    return formatIndividualLocation(individual._locations_individual);
  }

  const raw = readFieldValue(row, getIndividualFieldAliasesForColumn(column.key));
  return toPlainText(raw);
}

function orderRowsBySelectedIds(
  rows: Record<string, unknown>[],
  selectedIds: number[]
): Record<string, unknown>[] {
  const byId = new Map(
    rows
      .map((row) => [getIndividualId(row), row] as const)
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
    const id = getIndividualId(item);
    if (id > 0) {
      if (seenIds.has(id)) continue;
      seenIds.add(id);
    }
    allItems.push(item);
    added += 1;
  }
  return added;
}

async function fetchIndividualsPage(
  filters: IndividualsSearchFilters,
  page: number,
  perPage: number = EXPORT_PER_PAGE
): Promise<{
  items: Record<string, unknown>[];
  pageTotal: number;
  totalCount: number;
}> {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication required");

  const body = individualsFiltersToRequestBody({
    ...filters,
    page,
    per_page: perPage,
  });
  const response = await fetch(`${INDIVIDUALS_API_BASE}/get_all_individuals`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch individuals for export (${response.status})`);
  }

  const data = (await response.json()) as {
    items?: Record<string, unknown>[];
    individuals?: Record<string, unknown>[];
    totalPages?: number;
    totalItems?: number;
    totalIndividuals?: number;
  };

  const rawItems = data.items ?? data.individuals ?? [];
  const items = rawItems
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map(normalizeIndividualExportRow);

  const totalCount = data.totalItems ?? data.totalIndividuals ?? items.length;
  const pageTotal = data.totalPages || 1;

  return { items, pageTotal, totalCount };
}

async function fetchSelectedIndividualsForExport(
  filters: IndividualsSearchFilters,
  selectedIds: number[]
): Promise<Record<string, unknown>[]> {
  const safeIds = normalizeSelectedIndividualIds(selectedIds);
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
    const result = await fetchIndividualsPage(filters, page, EXPORT_PER_PAGE);
    for (const item of result.items) {
      const id = getIndividualId(item);
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

async function fetchAllIndividualsForExport(
  filters: IndividualsSearchFilters,
  expectedTotalCount?: number
): Promise<Record<string, unknown>[]> {
  let page = 1;
  let pageTotal = 1;
  const allItems: Record<string, unknown>[] = [];
  const seenIds = new Set<number>();
  let resolvedTotalCount =
    expectedTotalCount && expectedTotalCount > 0 ? expectedTotalCount : 0;

  while (page <= pageTotal && page <= MAX_EXPORT_PAGES) {
    const result = await fetchIndividualsPage(filters, page, EXPORT_PER_PAGE);

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

export async function exportIndividualsList(
  request: ListExportRequest,
  filters: IndividualsSearchFilters,
  visibleColumnKeys: string[],
  expectedTotalCount?: number
): Promise<void> {
  let rows: Record<string, unknown>[];

  if (request.scope === "selected") {
    const selectedIds = normalizeSelectedIndividualIds(request.selectedIds ?? []);
    if (selectedIds.length === 0) return;
    rows = await fetchSelectedIndividualsForExport(
      filters ?? createDefaultIndividualFilters(),
      selectedIds
    );
  } else {
    rows = await fetchAllIndividualsForExport(
      filters ?? createDefaultIndividualFilters(),
      expectedTotalCount
    );
  }

  await runGenericListExport({
    request,
    config: {
      entitySheetName: "Individuals",
      filePrefix: "Individuals",
      categories: INDIVIDUALS_COLUMN_CATEGORIES,
      visibleColumnKeys,
      extraLeadingColumns: EXTRA_INDIVIDUAL_COLUMNS,
    },
    rows,
    getEntityName: (row) =>
      String(
        (row as unknown as Individual).advisor_individuals ?? row.name ?? "—"
      ),
    getCellValue: getIndividualCellValue,
  });
}
