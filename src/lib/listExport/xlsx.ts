import type { ExportColumnDef } from "./types";

/** Blank rows before category/header block (matches reference export layout). */
const PADDING_ROW_COUNT = 6;
const CATEGORY_HEADER_ROW = PADDING_ROW_COUNT + 1;
const COLUMN_HEADER_ROW = PADDING_ROW_COUNT + 2;
const DATA_START_ROW = PADDING_ROW_COUNT + 3;
const INDEX_HEADER_ROW = 1;
const INDEX_DATA_START_ROW = 2;

function columnIndexToLetter(index: number): string {
  let n = index;
  let result = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

function buildCategoryHeaderRow(columns: ExportColumnDef[]): string[] {
  const row = columns.map(() => "");
  let currentCategory = "";
  for (let i = 0; i < columns.length; i += 1) {
    const category = columns[i].categoryName;
    if (category !== currentCategory) {
      row[i] = category;
      currentCategory = category;
    }
  }
  return row;
}

function buildPaddingRows(columnCount: number): string[][] {
  return Array.from({ length: PADDING_ROW_COUNT }, () =>
    Array.from({ length: columnCount }, () => "")
  );
}

export interface AllColumnsWorkbookInput {
  entitySheetName: string;
  columns: ExportColumnDef[];
  rows: string[][];
  indexRows: Array<{ name: string; targetRow: number }>;
}

export async function buildAllColumnsWorkbook(
  input: AllColumnsWorkbookInput
): Promise<ArrayBuffer> {
  const XLSX = await import("xlsx");

  const entityHeaders = columnsToHeaders(input.columns);
  const categoryRow = buildCategoryHeaderRow(input.columns);
  const entityDataRows = input.rows;
  const columnCount = input.columns.length;

  const entityAoA: string[][] = [
    ...buildPaddingRows(columnCount),
    categoryRow,
    entityHeaders,
    ...entityDataRows,
  ];

  const indexAoA: string[][] = [["Name"]];
  for (const entry of input.indexRows) {
    indexAoA.push([entry.name || "—"]);
  }

  const entitySheet = XLSX.utils.aoa_to_sheet(entityAoA);
  const indexSheet = XLSX.utils.aoa_to_sheet(indexAoA);

  const nameColumnIndex =
    input.columns.findIndex((column) => column.key === "name") + 1;
  const linkColumnLetter =
    nameColumnIndex > 0
      ? columnIndexToLetter(nameColumnIndex)
      : columnIndexToLetter(1);

  for (let i = 0; i < input.indexRows.length; i += 1) {
    const entry = input.indexRows[i];
    const indexRow = INDEX_DATA_START_ROW + i;
    const entityRow = entry.targetRow;
    const cellRef = `A${indexRow}`;
    const label = entry.name?.trim() || "—";
    const location = `${input.entitySheetName}!${linkColumnLetter}${entityRow}`;

    // Plain text + internal hyperlink object (Numbers/Excel compatible; avoids HYPERLINK formula errors).
    indexSheet[cellRef] = {
      v: label,
      t: "s",
      l: { Target: location, Tooltip: label },
    };
  }

  entitySheet["!freeze"] = {
    xSplit: 3,
    ySplit: COLUMN_HEADER_ROW,
    topLeftCell: "D9",
    activePane: "bottomRight",
    state: "frozen",
  };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, indexSheet, "Index");
  XLSX.utils.book_append_sheet(workbook, entitySheet, input.entitySheetName);

  return XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
}

function columnsToHeaders(columns: ExportColumnDef[]): string[] {
  return columns.map((column) => column.label);
}

export async function downloadXlsxBuffer(
  buffer: ArrayBuffer,
  filename: string
): Promise<void> {
  const timestamp = new Date().toISOString().slice(0, 10);
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = `${filename}_${timestamp}.xlsx`;
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const EXPORT_SHEET_LAYOUT = {
  PADDING_ROW_COUNT,
  CATEGORY_HEADER_ROW,
  COLUMN_HEADER_ROW,
  DATA_START_ROW,
  INDEX_HEADER_ROW,
  INDEX_DATA_START_ROW,
};
