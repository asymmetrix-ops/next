import { buildExportColumnList } from "./columnMeta";
import {
  buildAllColumnsWorkbook,
  buildVisibleColumnsWorkbook,
  downloadXlsxBuffer,
} from "./xlsx";
import {
  coerceExportCellValue,
  type ExportCellValue,
} from "./exportCellValue";
import { applyExportRowLimit } from "./exportLimit";
import { EMPTY_DISPLAY } from "@/lib/emptyDisplay";
import { trackKeyAction, type TrackingSection } from "@/lib/tracking";
import type { ExportColumnDef, ListExportMode, ListExportRequest } from "./types";

export interface GenericListExportInput {
  request: ListExportRequest;
  config: {
    entitySheetName: string;
    filePrefix: string;
    categories: Array<{
      name: string;
      columns: Array<{
        columnKey: string;
        label: string;
        type: string;
      }>;
    }>;
    visibleColumnKeys: string[];
    extraLeadingColumns?: ExportColumnDef[];
    /** When set, used for `all_columns` mode instead of `categories`. */
    allColumnsCategories?: Array<{
      name: string;
      columns: Array<{
        columnKey: string;
        label: string;
        type: string;
      }>;
    }>;
  };
  rows: Record<string, unknown>[];
  getEntityName: (row: Record<string, unknown>) => string;
  getCellValue: (
    row: Record<string, unknown>,
    column: ExportColumnDef
  ) => string;
  /** When set, writes numeric cells as Excel numbers instead of display text. */
  getCellExportValue?: (
    row: Record<string, unknown>,
    column: ExportColumnDef
  ) => ExportCellValue;
}

/** Section Insights: which platform section an export belongs to (by file prefix). */
const EXPORT_SECTION: Record<string, TrackingSection> = {
  Companies: "companies",
  TransactionComps: "transaction_comps",
  CorporateEvents: "corporate_events",
  Individuals: "individuals",
  Advisors: "advisors",
  Investors: "investors",
  FinancialBenchmark: "financial_intelligence",
  FinancialScreener: "financial_intelligence",
};

function trackListExport(filePrefix: string, mode: string, rowCount: number) {
  const section = EXPORT_SECTION[filePrefix];
  if (!section) return;
  trackKeyAction({ section, action: "export", actionDetail: mode, exportRows: rowCount });
}

export async function runGenericListExport(
  input: GenericListExportInput
): Promise<void> {
  const { request, config, getCellValue, getCellExportValue } = input;
  const rows = await applyExportRowLimit(input.rows);
  const columnCategories =
    request.mode === "all_columns" && config.allColumnsCategories
      ? config.allColumnsCategories
      : config.categories;
  const columns = buildExportColumnList(request.mode, {
    categories: columnCategories,
    visibleColumnKeys: config.visibleColumnKeys,
    extraLeadingColumns: config.extraLeadingColumns,
  });

  if (columns.length === 0) return;

  const dataRows: ExportCellValue[][] = rows.map((row) =>
    columns.map((column) => {
      if (getCellExportValue) {
        return getCellExportValue(row, column);
      }

      const display = getCellValue(row, column);
      if (display == null || display.trim() === "" || display === EMPTY_DISPLAY) {
        return null;
      }

      return coerceExportCellValue(column, display);
    })
  );

  if (request.mode === "all_columns") {
    const buffer = await buildAllColumnsWorkbook({
      entitySheetName: config.entitySheetName,
      columns,
      rows: dataRows,
    });
    await downloadXlsxBuffer(buffer, `${config.filePrefix}_Export_AllColumns`);
    trackListExport(config.filePrefix, request.mode, rows.length);
    return;
  }

  // Visible columns: single-sheet XLSX matching Companies sheet chrome (no Directory)
  const buffer = await buildVisibleColumnsWorkbook({
    entitySheetName: config.entitySheetName,
    columns,
    rows: dataRows,
  });
  await downloadXlsxBuffer(buffer, `${config.filePrefix}_Export_VisibleColumns`);
  trackListExport(config.filePrefix, request.mode, rows.length);
}

export type { ListExportMode, ListExportRequest };
