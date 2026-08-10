import { buildCompaniesSearchPayload } from "@/lib/companiesFilterPayload";
import { mapCompanyTableApiRow } from "@/lib/companyTableData";
import { EMPTY_DISPLAY } from "@/lib/emptyDisplay";
import {
  fetchAllCompaniesForExport,
  getCompanyCellExportValue,
  getCompanyCellValue,
} from "./companiesListExport";
import { readFieldValue } from "./readFieldValue";
import type { ExportColumnDef } from "./types";
import { buildVisibleColumnsWorkbook, downloadXlsxBuffer } from "./xlsx";
import type { ExportCellValue } from "./exportCellValue";

export const MARKET_MAP_BUCKET_TYPE_IDS: Record<string, number> = {
  public: 7,
  private_equity_owned: 1,
  venture_capital_backed: 3,
  private: 2,
};

/** Matches Companies_Export.xlsx visible-columns layout (row 7 headers). */
const MARKET_MAP_EXPORT_COLUMNS: ExportColumnDef[] = [
  { key: "id", label: "ID", categoryName: "Identity", type: "number" },
  { key: "name", label: "Name", categoryName: "Identity", type: "text" },
  {
    key: "asymmetrix_url",
    label: "Asymmetrix URL",
    categoryName: "Identity",
    type: "url",
  },
  {
    key: "description",
    label: "Description",
    categoryName: "Default",
    type: "paragraph",
  },
  {
    key: "primary_sectors",
    label: "Primary Sector(s)",
    categoryName: "Default",
    type: "text",
  },
  {
    key: "secondary_sectors",
    label: "Secondary Sector(s)",
    categoryName: "Default",
    type: "text",
  },
  {
    key: "linkedin_members",
    label: "LinkedIn Members",
    categoryName: "Default",
    type: "number",
  },
  { key: "country", label: "Country", categoryName: "Default", type: "text" },
];

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getMarketMapCellValue(
  row: Record<string, unknown>,
  column: ExportColumnDef
): string {
  if (column.key === "country") {
    const raw = readFieldValue(row, [
      "country",
      "hq_country",
      "_locations.Country",
    ]);
    if (raw == null || raw === "") return EMPTY_DISPLAY;
    const text = String(raw).trim();
    return text || EMPTY_DISPLAY;
  }

  return getCompanyCellValue(row, column);
}

function getMarketMapCellExportValue(
  row: Record<string, unknown>,
  column: ExportColumnDef
): ExportCellValue {
  if (column.key === "country") {
    const display = getMarketMapCellValue(row, column);
    return display === EMPTY_DISPLAY ? null : display;
  }

  return getCompanyCellExportValue(row, column);
}

export async function exportMarketMapBucket(options: {
  sectorId: number;
  sectorName: string;
  bucketType: string;
  bucketLabel: string;
  expectedCount?: number;
}): Promise<void> {
  const ownershipTypeId = MARKET_MAP_BUCKET_TYPE_IDS[options.bucketType];
  if (!ownershipTypeId) return;

  const filters = buildCompaniesSearchPayload({
    state: {
      filters: [],
      viewId: null,
      searchText: "",
      filterLogic: "and",
    },
    primarySectors: [],
    secondarySectors: [],
    ownershipTypes: [],
    ownershipTypeIds: [ownershipTypeId],
    scopedPrimarySectorIds: [options.sectorId],
    perPage: 100,
  });

  const rawRows = await fetchAllCompaniesForExport(
    filters,
    options.expectedCount,
    true
  );
  const rows = rawRows.map((row) => mapCompanyTableApiRow(row));

  const dataRows = rows.map((row) =>
    MARKET_MAP_EXPORT_COLUMNS.map((column) =>
      getMarketMapCellExportValue(row, column)
    )
  );

  const buffer = await buildVisibleColumnsWorkbook({
    entitySheetName: "Companies",
    columns: MARKET_MAP_EXPORT_COLUMNS,
    rows: dataRows,
  });

  const sectorSlug =
    slugify(options.sectorName) || `sector-${options.sectorId}`;
  const bucketSlug = slugify(options.bucketLabel) || options.bucketType;
  await downloadXlsxBuffer(buffer, `${sectorSlug}_${bucketSlug}`);
}
