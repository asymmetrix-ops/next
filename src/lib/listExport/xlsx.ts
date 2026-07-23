import type { ExportColumnDef } from "./types";

/** Reference brand palette (extracted from Asymmetrix export template). */
const BANNER_NAVY = "FF011844";
const BANNER_BLUE = "FF0370AA";
const BANNER_LIGHT_BLUE = "FF2DB7FF";
const WHITE = "FFFFFFFF";

const LOGO_PATH = "/exports/asymmetrix-export-logo.png";
/** Official brand asset (navy card + white icon/wordmark baked in), matching the reference export: 935x381px. */
const LOGO_ASPECT_RATIO = 381 / 935;

/** Reference template row height (matches sheetFormatPr defaultRowHeight="14.4"); rows 1-3 use this default (no override). */
const DEFAULT_ROW_HEIGHT_PT = 14.4;
const PT_TO_PX = 1.333;
/** Fill the full navy banner block height (rows 1-3 at the default row height), matching the reference sheet's flush logo placement. */
const LOGO_HEIGHT_PX = Math.round(DEFAULT_ROW_HEIGHT_PT * 3 * PT_TO_PX);
const LOGO_WIDTH_PX = Math.round(LOGO_HEIGHT_PX / LOGO_ASPECT_RATIO);

/** Banner rows 1-3 (navy), row 4 (blue stripe), row 5 (light-blue stripe), row 6 (blank gap). */
const BANNER_ROW_COUNT = 6;
const CATEGORY_HEADER_ROW = BANNER_ROW_COUNT + 1; // 7
const COLUMN_HEADER_ROW = BANNER_ROW_COUNT + 2; // 8
const DATA_START_ROW = BANNER_ROW_COUNT + 3; // 9

/** Leading spacer column A — data starts at column B. */
const DATA_COL_OFFSET = 1;

let cachedLogoBase64: string | null = null;

async function loadLogoBase64(): Promise<string | null> {
  if (cachedLogoBase64) return cachedLogoBase64;
  if (typeof window === "undefined") return null;
  try {
    const response = await fetch(LOGO_PATH);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    cachedLogoBase64 = btoa(binary);
    return cachedLogoBase64;
  } catch {
    return null;
  }
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

/**
 * We don't hide unused columns like the reference template does, so the
 * banner fill must extend well past the last data column or it visually stops
 * abruptly and looks unfinished/unstyled beyond the data.
 */
const BANNER_MIN_FILL_COLUMNS_ALL = 52; // column AZ — All columns export
const BANNER_MIN_FILL_COLUMNS_VISIBLE = 48; // column AV — Visible columns export

async function applyBanner(
  worksheet: import("exceljs").Worksheet,
  totalColumns: number,
  workbook: import("exceljs").Workbook,
  minFillColumns: number = BANNER_MIN_FILL_COLUMNS_ALL
): Promise<void> {
  const fillColumns = Math.max(totalColumns, minFillColumns);

  const fillRow = (rowNum: number, argb: string) => {
    for (let col = 1; col <= fillColumns; col += 1) {
      worksheet.getCell(rowNum, col).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb },
      };
    }
  };

  // Explicit height on every banner row (not just a sheet-wide default) so
  // Excel, Google Sheets, and LibreOffice all render it identically.
  worksheet.getRow(1).height = DEFAULT_ROW_HEIGHT_PT;
  worksheet.getRow(2).height = DEFAULT_ROW_HEIGHT_PT;
  worksheet.getRow(3).height = DEFAULT_ROW_HEIGHT_PT;
  fillRow(1, BANNER_NAVY);
  fillRow(2, BANNER_NAVY);
  fillRow(3, BANNER_NAVY);
  worksheet.getRow(4).height = 6;
  fillRow(4, BANNER_BLUE);
  worksheet.getRow(5).height = 6;
  fillRow(5, BANNER_LIGHT_BLUE);
  worksheet.getRow(6).height = 6;

  worksheet.mergeCells(1, 1, 3, fillColumns);

  const logoBase64 = await loadLogoBase64();
  if (!logoBase64) return;

  const imageId = workbook.addImage({
    base64: `data:image/png;base64,${logoBase64}`,
    extension: "png",
  });

  // Flush top-left, filling the full navy banner block — matches the reference sheet's logo placement.
  worksheet.addImage(imageId, {
    tl: { col: 0, row: 0 },
    ext: { width: LOGO_WIDTH_PX, height: LOGO_HEIGHT_PX },
  });
}

function applyCategoryAndHeaderRows(
  worksheet: import("exceljs").Worksheet,
  columns: ExportColumnDef[]
): void {
  const categoryRowNum = CATEGORY_HEADER_ROW;
  const headerRowNum = COLUMN_HEADER_ROW;

  let currentCategory = "";
  let categoryStartCol = DATA_COL_OFFSET + 1;

  const closeCategoryGroup = (endCol: number) => {
    if (!currentCategory) return;
    if (endCol > categoryStartCol) {
      worksheet.mergeCells(
        categoryRowNum,
        categoryStartCol,
        categoryRowNum,
        endCol
      );
    }
  };

  for (let i = 0; i < columns.length; i += 1) {
    const col = DATA_COL_OFFSET + i + 1;
    const category = exportCategoryLabel(columns[i].categoryName);

    if (category !== currentCategory) {
      closeCategoryGroup(col - 1);
      currentCategory = category;
      categoryStartCol = col;
      const cell = worksheet.getCell(categoryRowNum, col);
      cell.value = category;
      cell.font = { bold: true, size: 11 };
    }

    const headerCell = worksheet.getCell(headerRowNum, col);
    headerCell.value = columns[i].label;
    headerCell.font = { bold: true, size: 11 };
    headerCell.border = {
      top: { style: "thin", color: { argb: "FFD0D0D0" } },
      bottom: { style: "thin", color: { argb: "FFD0D0D0" } },
    };
  }
  closeCategoryGroup(DATA_COL_OFFSET + columns.length);

  // Explicit height (not a sheet-wide default) for consistent cross-app rendering.
  worksheet.getRow(categoryRowNum).height = DEFAULT_ROW_HEIGHT_PT;
  worksheet.getRow(headerRowNum).height = DEFAULT_ROW_HEIGHT_PT;
}

function buildDirectorySheet(
  worksheet: import("exceljs").Worksheet,
  entitySheetName: string,
  columns: ExportColumnDef[]
): void {
  const { left, right } = groupColumnsForDirectory(columns);

  worksheet.properties.defaultRowHeight = 14.4;

  worksheet.columns = [
    { width: 3 },
    { width: 28 },
    { width: 3 },
    { width: 28 },
    { width: 3 },
  ];

  type DirEntry =
    | { kind: "category"; label: string }
    | { kind: "column"; column: ExportColumnDef; headerColLetter: string };

  const toEntries = (cols: ExportColumnDef[]): DirEntry[] => {
    const entries: DirEntry[] = [];
    let current = "";
    for (const column of cols) {
      const cat = exportCategoryLabel(column.categoryName);
      if (cat !== current) {
        if (current !== "") entries.push({ kind: "category", label: "" });
        entries.push({ kind: "category", label: cat });
        current = cat;
      }
      const colIndex =
        columns.findIndex((c) => c.key === column.key) + 1 + DATA_COL_OFFSET;
      entries.push({
        kind: "column",
        column,
        headerColLetter: worksheet.getColumn(colIndex).letter ?? "",
      });
    }
    return entries;
  };

  // Row 7: first category label for each column already appears via entries below (row 8+)
  const leftEntries = toEntries(left);
  const rightEntries = toEntries(right);
  const rowCount = Math.max(leftEntries.length, rightEntries.length);

  const writeColumn = (entries: DirEntry[], col: number) => {
    for (let i = 0; i < entries.length; i += 1) {
      const entry = entries[i];
      const rowNum = CATEGORY_HEADER_ROW + i;
      const cell = worksheet.getCell(rowNum, col);
      if (entry.kind === "category") {
        cell.value = entry.label;
        cell.font = { bold: true, size: 11 };
        continue;
      }
      const label = entry.column.label;
      const target = `${entitySheetName}!${entry.headerColLetter}${COLUMN_HEADER_ROW}`;
      cell.value = {
        text: label,
        hyperlink: `#'${entitySheetName}'!${entry.headerColLetter}${COLUMN_HEADER_ROW}`,
        tooltip: target,
      };
      cell.font = { color: { argb: "FF0563C1" }, underline: true, size: 11 };
    }
  };

  writeColumn(leftEntries, 2);
  writeColumn(rightEntries, 4);

  // Explicit height on every content row (not a sheet-wide default) for
  // consistent cross-app rendering — matches the entity sheet exactly.
  for (let i = 0; i < rowCount; i += 1) {
    worksheet.getRow(CATEGORY_HEADER_ROW + i).height = DEFAULT_ROW_HEIGHT_PT;
  }
}

function buildEntitySheet(
  worksheet: import("exceljs").Worksheet,
  columns: ExportColumnDef[],
  rows: string[][]
): void {
  // Match the reference template's default row height (14.4pt).
  worksheet.properties.defaultRowHeight = 14.4;

  worksheet.columns = [
    { width: 3 },
    ...columns.map(() => ({ width: 18 })),
  ];

  applyCategoryAndHeaderRows(worksheet, columns);

  for (let r = 0; r < rows.length; r += 1) {
    const rowNum = DATA_START_ROW + r;
    const rowValues = rows[r];
    for (let c = 0; c < rowValues.length; c += 1) {
      worksheet.getCell(rowNum, DATA_COL_OFFSET + c + 1).value = rowValues[c];
    }
    // Explicit height (not a sheet-wide default) for consistent cross-app rendering.
    worksheet.getRow(rowNum).height = DEFAULT_ROW_HEIGHT_PT;
  }

  worksheet.views = [
    {
      state: "frozen",
      xSplit: DATA_COL_OFFSET + 2,
      ySplit: COLUMN_HEADER_ROW,
    },
  ];
}

/**
 * ExcelJS always writes `customHeight="1"` on `<sheetFormatPr>` whenever
 * `defaultRowHeight` differs from its own internal default of 15 — even
 * though our value (14.4) matches the reference template's *actual*
 * (unflagged) default. That stray flag makes Google Sheets treat 14.4pt as
 * a "custom" measurement and convert it to 19.2px instead of respecting the
 * plain default the way it does for the reference file. Strip the flag
 * from `sheetFormatPr` only (row-level `customHeight` on rows 4-6 is left
 * untouched) so imported behavior matches the reference exactly.
 */
async function stripSheetFormatCustomHeightFlag(
  buffer: ArrayBuffer
): Promise<ArrayBuffer> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buffer);
  const sheetPaths = Object.keys(zip.files).filter((name) =>
    /^xl\/worksheets\/sheet\d+\.xml$/.test(name)
  );

  for (const path of sheetPaths) {
    const xml = await zip.file(path)?.async("string");
    if (!xml) continue;
    const patched = xml.replace(
      /(<sheetFormatPr\b[^>]*?)\s+customHeight="1"([^>]*>)/,
      "$1$2"
    );
    if (patched !== xml) {
      zip.file(path, patched);
    }
  }

  return zip.generateAsync({ type: "arraybuffer" });
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
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();

  const directorySheet = workbook.addWorksheet("Directory");
  buildDirectorySheet(directorySheet, input.entitySheetName, input.columns);
  await applyBanner(
    directorySheet,
    5,
    workbook,
    BANNER_MIN_FILL_COLUMNS_ALL
  );

  const entitySheet = workbook.addWorksheet(input.entitySheetName);
  buildEntitySheet(entitySheet, input.columns, input.rows);
  await applyBanner(
    entitySheet,
    input.columns.length + DATA_COL_OFFSET,
    workbook,
    BANNER_MIN_FILL_COLUMNS_ALL
  );

  const buffer = await workbook.xlsx.writeBuffer();
  return stripSheetFormatCustomHeightFlag(buffer as ArrayBuffer);
}

export async function buildVisibleColumnsWorkbook(
  input: VisibleColumnsWorkbookInput
): Promise<ArrayBuffer> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();

  const entitySheet = workbook.addWorksheet(input.entitySheetName);
  buildEntitySheet(entitySheet, input.columns, input.rows);
  await applyBanner(
    entitySheet,
    input.columns.length + DATA_COL_OFFSET,
    workbook,
    BANNER_MIN_FILL_COLUMNS_VISIBLE
  );

  const buffer = await workbook.xlsx.writeBuffer();
  return stripSheetFormatCustomHeightFlag(buffer as ArrayBuffer);
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
  BANNER_ROW_COUNT,
  CATEGORY_HEADER_ROW,
  COLUMN_HEADER_ROW,
  DATA_START_ROW,
  DATA_COL_OFFSET,
};

export const EXPORT_BRAND_COLORS = {
  BANNER_NAVY,
  BANNER_BLUE,
  BANNER_LIGHT_BLUE,
  WHITE,
};
