import { ADVISORS_COLUMN_CATEGORIES } from "@/components/advisors/advisorsColumnCategories";
import { getAdvisorFieldAliasesForColumn } from "@/components/advisors/advisorsColumnFields";
import {
  advisorsFiltersToSearchParams,
  createDefaultAdvisorFilters,
  type AdvisorsSearchFilters,
} from "@/lib/advisorsFilterPayload";
import { readFieldValue } from "./readFieldValue";
import { runGenericListExport } from "./runListExport";
import { EXPORT_ALL_ENTITIES_CAP, type ExportColumnDef, type ListExportRequest } from "./types";

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

function getProfileUrl(id: number): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://www.asymmetrixintelligence.com";
  return `${origin}/advisor/${id}`;
}

function formatValue(value: unknown): string {
  if (value == null || value === "") return "-";
  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toLocaleString() : "-";
  }
  return String(value);
}

function getAdvisorCellValue(
  row: Record<string, unknown>,
  column: ExportColumnDef
): string {
  if (column.key === "id") {
    const id = getAdvisorId(row);
    return id > 0 ? String(id) : "-";
  }

  if (column.key === "asymmetrix_url") {
    const id = getAdvisorId(row);
    return id > 0 ? getProfileUrl(id) : "-";
  }

  const raw = readFieldValue(row, getAdvisorFieldAliasesForColumn(column.key));
  return formatValue(raw);
}

async function fetchAllAdvisorsForExport(
  filters: AdvisorsSearchFilters,
  selectedIds?: number[]
): Promise<Record<string, unknown>[]> {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication required");

  let page = 1;
  let pageTotal = 1;
  const allItems: Record<string, unknown>[] = [];

  do {
    const params = advisorsFiltersToSearchParams({
      ...filters,
      page,
      per_page: 100,
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
      result1?: { items?: Record<string, unknown>[]; pageTotal?: number };
      Advisors_companies?: {
        items?: Record<string, unknown>[];
        pageTotal?: number;
      };
      pageTotal?: number;
    };

    const payload = raw.result1 ?? raw.Advisors_companies ?? raw;
    const items = payload.items ?? raw.items ?? [];
    allItems.push(...items);
    pageTotal = payload.pageTotal ?? raw.pageTotal ?? 1;
    page += 1;
  } while (page <= pageTotal && allItems.length < EXPORT_ALL_ENTITIES_CAP);

  if (!selectedIds || selectedIds.length === 0) {
    return allItems.slice(0, EXPORT_ALL_ENTITIES_CAP);
  }

  const selectedSet = new Set(selectedIds);
  return allItems.filter((item) => selectedSet.has(getAdvisorId(item)));
}

export async function exportAdvisorsList(
  request: ListExportRequest,
  filters: AdvisorsSearchFilters,
  visibleColumnKeys: string[]
): Promise<void> {
  const selectedIds =
    request.scope === "selected" ? request.selectedIds ?? [] : undefined;

  if (request.scope === "selected" && (!selectedIds || selectedIds.length === 0)) {
    return;
  }

  const rows = await fetchAllAdvisorsForExport(
    filters ?? createDefaultAdvisorFilters(),
    selectedIds
  );

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
