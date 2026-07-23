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
import { readFieldValue } from "./readFieldValue";
import { runGenericListExport } from "./runListExport";
import { EXPORT_ALL_ENTITIES_CAP, type ExportColumnDef, type ListExportRequest } from "./types";

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

function getProfileUrl(id: number): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://www.asymmetrixintelligence.com";
  return `${origin}/individual/${id}`;
}

function getIndividualCellValue(
  row: Record<string, unknown>,
  column: ExportColumnDef
): string {
  if (column.key === "id") {
    const id = getIndividualId(row);
    return id > 0 ? String(id) : "-";
  }

  if (column.key === "asymmetrix_url") {
    const id = getIndividualId(row);
    return id > 0 ? getProfileUrl(id) : "-";
  }

  const individual = row as unknown as Individual;

  if (column.key === "name") {
    return individual.advisor_individuals || "-";
  }

  if (column.key === "current_company") {
    return individual.current_company || "-";
  }

  if (column.key === "current_roles") {
    return formatIndividualRoles(individual);
  }

  if (column.key === "location") {
    return formatIndividualLocation(individual._locations_individual);
  }

  const raw = readFieldValue(row, getIndividualFieldAliasesForColumn(column.key));
  if (raw == null || raw === "") return "-";
  return String(raw);
}

async function fetchAllIndividualsForExport(
  filters: IndividualsSearchFilters,
  selectedIds?: number[]
): Promise<Record<string, unknown>[]> {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication required");

  let page = 1;
  let pageTotal = 1;
  const allItems: Record<string, unknown>[] = [];

  do {
    const body = individualsFiltersToRequestBody({
      ...filters,
      page,
      per_page: 100,
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
    };

    const items = data.items ?? data.individuals ?? [];
    allItems.push(...items);
    pageTotal = data.totalPages || 1;
    page += 1;
  } while (page <= pageTotal && allItems.length < EXPORT_ALL_ENTITIES_CAP);

  if (!selectedIds || selectedIds.length === 0) {
    return allItems.slice(0, EXPORT_ALL_ENTITIES_CAP);
  }

  const selectedSet = new Set(selectedIds);
  return allItems.filter((item) => selectedSet.has(getIndividualId(item)));
}

export async function exportIndividualsList(
  request: ListExportRequest,
  filters: IndividualsSearchFilters,
  visibleColumnKeys: string[]
): Promise<void> {
  const selectedIds =
    request.scope === "selected" ? request.selectedIds ?? [] : undefined;

  if (request.scope === "selected" && (!selectedIds || selectedIds.length === 0)) {
    return;
  }

  const rows = await fetchAllIndividualsForExport(
    filters ?? createDefaultIndividualFilters(),
    selectedIds
  );

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
