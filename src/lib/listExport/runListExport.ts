import { buildExportColumnList } from "./columnMeta";
import {
  buildAllColumnsWorkbook,
  buildVisibleColumnsWorkbook,
  downloadXlsxBuffer,
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
  const { request, config, rows, getCellValue } = input;
  const columns = buildExportColumnList(request.mode, config);

  if (columns.length === 0 || rows.length === 0) return;

  const dataRows = rows.map((row) =>
    columns.map((column) => {
      const value = getCellValue(row, column);
      return value == null || value.trim() === "" ? "-" : value;
    })
  );

  if (request.mode === "all_columns") {
    const buffer = await buildAllColumnsWorkbook({
      entitySheetName: config.entitySheetName,
      columns,
      rows: dataRows,
    });
    await downloadXlsxBuffer(buffer, `${config.filePrefix}_Export_AllColumns`);
    return;
  }

  // Visible columns: single-sheet XLSX matching Companies sheet chrome (no Directory)
  const buffer = await buildVisibleColumnsWorkbook({
    entitySheetName: config.entitySheetName,
    columns,
    rows: dataRows,
  });
  await downloadXlsxBuffer(buffer, `${config.filePrefix}_Export_VisibleColumns`);
}

export type { ListExportMode, ListExportRequest };
