import type { ExportColumnDef } from "./types";

/** Blank rows before category/header block (matches reference export layout). */
const PADDING_ROW_COUNT = 6;
const CATEGORY_HEADER_ROW = PADDING_ROW_COUNT + 1; // 7
const COLUMN_HEADER_ROW = PADDING_ROW_COUNT + 2; // 8
const DATA_START_ROW = PADDING_ROW_COUNT + 3; // 9

/** Leading spacer column A — data starts at column B (index 2 in 1-based Excel). */
const DATA_COL_OFFSET = 1;

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

/** Normalize control-room category names to the reference export labels. */
export function exportCategoryLabel(categoryName: string): string {
  const key = categoryName.trim().toLowerCase();
  if (key === "default" || key === "overview") return "Overview";
  if (key === "financial metrics" || key === "financial") {
    return "Financial Metrics";
  }
  if (key === "subscription metrics" || key === "subscription") {
    return "Subscription Metrics";
  }
  if (key === "other metrics" || key === "other") return "Other Metrics";
  if (key === "identity") return "Identity";
  if (key === "lists") return "Lists";
  return categoryName;
}

function buildCategoryHeaderRow(columns: ExportColumnDef[]): string[] {
  const row = columns.map(() => "");
  let currentCategory = "";
  for (let i = 0; i < columns.length; i += 1) {
    const category = exportCategoryLabel(columns[i].categoryName);
    if (category !== currentCategory) {
      row[i] = category;
      currentCategory = category;
    }
  }
  return row;
}

function withLeadingSpacer(values: string[]): string[] {
  return ["", ...values];
}

function buildPaddingRows(columnCount: number): string[][] {
  return Array.from({ length: PADDING_ROW_COUNT }, () =>
    Array.from({ length: columnCount + DATA_COL_OFFSET }, () => "")
  );
}

function setColWidths(
  sheet: Record<string, unknown>,
  widths: Array<{ wch: number }>
): void {
  sheet["!cols"] = widths;
}

function setFreeze(
  sheet: Record<string, unknown>,
  opts: {
    xSplit: number;
    ySplit: number;
    topLeftCell: string;
  }
): void {
  sheet["!views"] = [
    {
      state: "frozen",
      xSplit: opts.xSplit,
      ySplit: opts.ySplit,
      topLeftCell: opts.topLeftCell,
      activePane: "bottomRight",
    },
  ];
}

function groupColumnsForDirectory(
  columns: ExportColumnDef[]
): { left: ExportColumnDef[]; right: ExportColumnDef[] } {
  const left: ExportColumnDef[] = [];
  const right: ExportColumnDef[] = [];

  for (const column of columns) {
    const cat = exportCategoryLabel(column.categoryName);
    if (
      cat === "Financial Metrics" ||
      cat === "Subscription Metrics" ||
      cat === "Other Metrics"
    ) {
      right.push(column);
    } else {
      left.push(column);
    }
  }

  return { left, right };
}

function buildDirectorySheet(
  XLSX: typeof import("xlsx"),
  entitySheetName: string,
  columns: ExportColumnDef[]
) {
  const { left, right } = groupColumnsForDirectory(columns);
  const aoa: string[][] = Array.from({ length: 6 }, () => ["", "", "", "", ""]);

  // Row 7: category titles for the two directory columns
  const leftFirstCat = left[0]
    ? exportCategoryLabel(left[0].categoryName)
    : "";
  const rightFirstCat = right[0]
    ? exportCategoryLabel(right[0].categoryName)
    : "";
  aoa.push(["", leftFirstCat, "", rightFirstCat, ""]);

  type DirEntry =
    | { kind: "category"; label: string }
    | { kind: "column"; column: ExportColumnDef; sheetColLetter: string };

  const toEntries = (cols: ExportColumnDef[]): DirEntry[] => {
    const entries: DirEntry[] = [];
    let current = "";
    for (const column of cols) {
      const cat = exportCategoryLabel(column.categoryName);
      // First category already shown on row 7 — subsequent groups get a blank + header
      if (cat !== current) {
        if (current !== "") {
          entries.push({ kind: "category", label: "" }); // spacer row
          entries.push({ kind: "category", label: cat });
        }
        current = cat;
      }
      const colIdx =
        columns.findIndex((c) => c.key === column.key) + 1 + DATA_COL_OFFSET;
      entries.push({
        kind: "column",
        column,
        sheetColLetter: columnIndexToLetter(colIdx),
      });
    }
    return entries;
  };

  const leftEntries = toEntries(left);
  const rightEntries = toEntries(right);
  const rowCount = Math.max(leftEntries.length, rightEntries.length);

  for (let i = 0; i < rowCount; i += 1) {
    const row = ["", "", "", "", ""];
    const l = leftEntries[i];
    const r = rightEntries[i];
    if (l?.kind === "category") row[1] = l.label;
    if (l?.kind === "column") row[1] = l.column.label;
    if (r?.kind === "category") row[3] = r.label;
    if (r?.kind === "column") row[3] = r.column.label;
    aoa.push(row);
  }

  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  setColWidths(sheet, [
    { wch: 3 },
    { wch: 28 },
    { wch: 3 },
    { wch: 28 },
    { wch: 3 },
  ]);

  // Hyperlinks: column labels → header cell on entity sheet (row 8)
  const applyLinks = (entries: DirEntry[], excelCol: "B" | "D") => {
    for (let i = 0; i < entries.length; i += 1) {
      const entry = entries[i];
      if (entry.kind !== "column") continue;
      const rowNum = 8 + i; // first data row of directory block is Excel row 8
      const cellRef = `${excelCol}${rowNum}`;
      const label = entry.column.label;
      const location = `${entitySheetName}!${entry.sheetColLetter}${COLUMN_HEADER_ROW}`;
      sheet[cellRef] = {
        v: label,
        t: "s",
        l: { Target: `#${location}`, Tooltip: label },
      };
    }
  };

  applyLinks(leftEntries, "B");
  applyLinks(rightEntries, "D");

  return sheet;
}

function buildEntitySheet(
  XLSX: typeof import("xlsx"),
  columns: ExportColumnDef[],
  rows: string[][]
) {
  const headers = columns.map((column) => column.label);
  const categoryRow = buildCategoryHeaderRow(columns);
  const columnCount = columns.length;

  const aoa: string[][] = [
    ...buildPaddingRows(columnCount),
    withLeadingSpacer(categoryRow),
    withLeadingSpacer(headers),
    ...rows.map((row) => withLeadingSpacer(row)),
  ];

  const sheet = XLSX.utils.aoa_to_sheet(aoa);

  const colWidths = [{ wch: 3 }, ...columns.map(() => ({ wch: 18 }))];
  setColWidths(sheet, colWidths);
  setFreeze(sheet, {
    xSplit: 3,
    ySplit: COLUMN_HEADER_ROW,
    topLeftCell: "D9",
  });

  return sheet;
}

export interface AllColumnsWorkbookInput {
  entitySheetName: string;
  columns: ExportColumnDef[];
  rows: string[][];
}

export interface VisibleColumnsWorkbookInput {
  entitySheetName: string;
  columns: ExportColumnDef[];
  rows: string[][];
}

export async function buildAllColumnsWorkbook(
  input: AllColumnsWorkbookInput
): Promise<ArrayBuffer> {
  const XLSX = await import("xlsx");

  const directorySheet = buildDirectorySheet(
    XLSX,
    input.entitySheetName,
    input.columns
  );
  const entitySheet = buildEntitySheet(XLSX, input.columns, input.rows);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, directorySheet, "Directory");
  XLSX.utils.book_append_sheet(workbook, entitySheet, input.entitySheetName);

  return XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  }) as ArrayBuffer;
}

export async function buildVisibleColumnsWorkbook(
  input: VisibleColumnsWorkbookInput
): Promise<ArrayBuffer> {
  const XLSX = await import("xlsx");
  const entitySheet = buildEntitySheet(XLSX, input.columns, input.rows);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, entitySheet, input.entitySheetName);

  return XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  }) as ArrayBuffer;
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
  DATA_COL_OFFSET,
};
