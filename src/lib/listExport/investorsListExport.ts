import { INVESTORS_COLUMN_CATEGORIES } from "@/components/investors/investorsColumnCategories";
import { getInvestorFieldAliasesForColumn } from "@/components/investors/investorsColumnFields";
import {
  createDefaultInvestorFilters,
  investorSearchPayloadToSearchParams,
  type InvestorsSearchFilters,
} from "@/lib/investorsFilterPayload";
import { normalizeLinkedInProfileUrl } from "@/lib/linkedinUrl";
import { normalizeWebsiteUrl } from "@/lib/websiteUrl";
import { readFieldValue } from "./readFieldValue";
import { runGenericListExport } from "./runListExport";
import type { ExportColumnDef, ListExportRequest } from "./types";

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

function getProfileUrl(id: number): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://www.asymmetrixintelligence.com";
  return `${origin}/investors/${id}`;
}

function formatListValue(value: unknown): string {
  if (value == null || value === "") return "-";
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean).join(", ") || "-";
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toLocaleString() : "-";
  }
  return String(value);
}

function getInvestorCellValue(
  row: Record<string, unknown>,
  column: ExportColumnDef
): string {
  if (column.key === "id") {
    const id = getInvestorId(row);
    return id > 0 ? String(id) : "-";
  }

  if (column.key === "asymmetrix_url") {
    const id = getInvestorId(row);
    return id > 0 ? getProfileUrl(id) : "-";
  }

  if (column.key === "name") {
    return String(row.company_name ?? row.name ?? "-");
  }

  if (column.key === "type") {
    return formatListValue(row.investor_type);
  }

  if (column.key === "portfolio_companies") {
    return formatListValue(row.number_of_active_investments);
  }

  if (column.key === "primary_sectors") {
    return formatListValue(row.da_primary_sector_names ?? row.primary_sectors);
  }

  if (column.key === "years_since_last_investment") {
    const lastInvestment = row.last_investment as
      | { display?: string | null }
      | undefined;
    if (lastInvestment?.display) return String(lastInvestment.display);
  }

  if (column.key === "website") {
    const href = normalizeWebsiteUrl(
      readFieldValue(row, getInvestorFieldAliasesForColumn("website"))
    );
    return href || "-";
  }

  if (column.key === "linkedin_url") {
    const raw = readFieldValue(row, getInvestorFieldAliasesForColumn("linkedin_url"));
    return (
      normalizeLinkedInProfileUrl(raw) ??
      normalizeWebsiteUrl(raw) ??
      formatListValue(raw)
    );
  }

  const raw = readFieldValue(row, getInvestorFieldAliasesForColumn(column.key));
  return formatListValue(raw);
}

async function fetchAllInvestorsForExport(
  filters: InvestorsSearchFilters,
  selectedIds?: number[]
): Promise<Record<string, unknown>[]> {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication required");

  let page = 1;
  let pageTotal = 1;
  const allItems: Record<string, unknown>[] = [];

  do {
    const params = investorSearchPayloadToSearchParams({
      ...filters,
      page,
      per_page: 100,
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
    const items = (Array.isArray(investors?.items) ? investors.items : []) as Record<
      string,
      unknown
    >[];
    allItems.push(...items);
    pageTotal = investors?.pageTotal || 1;
    page += 1;
  } while (page <= pageTotal);

  if (!selectedIds || selectedIds.length === 0) return allItems;

  const selectedSet = new Set(selectedIds);
  return allItems.filter((item) => selectedSet.has(getInvestorId(item)));
}

export async function exportInvestorsList(
  request: ListExportRequest,
  filters: InvestorsSearchFilters,
  visibleColumnKeys: string[]
): Promise<void> {
  const selectedIds =
    request.scope === "selected" ? request.selectedIds ?? [] : undefined;

  if (request.scope === "selected" && (!selectedIds || selectedIds.length === 0)) {
    return;
  }

  const rows = await fetchAllInvestorsForExport(
    filters ?? createDefaultInvestorFilters(),
    selectedIds
  );

  await runGenericListExport({
    request,
    config: {
      entitySheetName: "Investors",
      filePrefix: "Investors",
      categories: INVESTORS_COLUMN_CATEGORIES,
      visibleColumnKeys,
      extraLeadingColumns: EXTRA_INVESTOR_COLUMNS,
    },
    rows,
    getEntityName: (row) => String(row.company_name ?? row.name ?? "—"),
    getCellValue: getInvestorCellValue,
  });
}
