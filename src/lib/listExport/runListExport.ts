import { buildExportColumnList } from "./columnMeta";
import { buildCsvContent, downloadCsvContent } from "./csv";
import {
  buildAllColumnsWorkbook,
  downloadXlsxBuffer,
  EXPORT_SHEET_LAYOUT,
} from "./xlsx";
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
  };
  rows: Record<string, unknown>[];
  getEntityName: (row: Record<string, unknown>) => string;
  getCellValue: (
    row: Record<string, unknown>,
    column: ExportColumnDef
  ) => string;
}

export async function runGenericListExport(
  input: GenericListExportInput
): Promise<void> {
  const { request, config, rows, getEntityName, getCellValue } = input;
  const columns = buildExportColumnList(request.mode, config);

  if (columns.length === 0 || rows.length === 0) return;

  const dataRows = rows.map((row) =>
    columns.map((column) => getCellValue(row, column))
  );

  if (request.mode === "all_columns") {
    const indexRows = rows.map((row, index) => ({
      name: getEntityName(row),
      targetRow: EXPORT_SHEET_LAYOUT.DATA_START_ROW + index,
    }));
    const buffer = await buildAllColumnsWorkbook({
      entitySheetName: config.entitySheetName,
      columns,
      rows: dataRows,
      indexRows,
    });
    await downloadXlsxBuffer(buffer, `${config.filePrefix}_Export_AllColumns`);
    return;
  }

  const headers = columns.map((column) => column.label);
  const csv = buildCsvContent(headers, dataRows);
  downloadCsvContent(csv, `${config.filePrefix}_Export_VisibleColumns`);
}

export type { ListExportMode, ListExportRequest };
