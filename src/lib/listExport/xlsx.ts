import type { ExportColumnDef } from "./types";

/** Reference brand palette (extracted from Asymmetrix export template). */
const BANNER_NAVY = "FF011844";
const BANNER_BLUE = "FF0370AA";
const BANNER_LIGHT_BLUE = "FF2DB7FF";
const WHITE = "FFFFFFFF";

const LOGO_PATH = "/exports/asymmetrix-export-logo.png";

/** Reference template row height (matches sheetFormatPr defaultRowHeight="14.4"). */
const DEFAULT_ROW_HEIGHT_PT = 14.4;
/** Blue / light-blue stripe rows + blank gap beneath the banner. */
const BANNER_STRIPE_ROW_HEIGHT_PT = 6;

/** Logo anchor + extent copied from the reference export (rows 1–3, cols A–B). */
const LOGO_ANCHOR_BR_COL = 1;
const LOGO_ANCHOR_BR_COL_OFF_EMU = 1_125_214;
const LOGO_ANCHOR_BR_ROW = 3;
const LOGO_EXT_CX_EMU = 1_353_814;
const LOGO_EXT_CY_EMU = 548_640;
/** Reference spacer column width (column A). */
const SPACER_COL_WIDTH = 3.332_031_25;

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
  worksheet.properties.defaultRowHeight = DEFAULT_ROW_HEIGHT_PT;

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

  // Rows 1–3 and all content rows inherit defaultRowHeight (14.4pt).
  // Only rows 4–6 get an explicit height — matching the reference export,
  // where customHeight on every row makes Google Sheets render 14.4pt as 19.2px.
  fillRow(1, BANNER_NAVY);
  fillRow(2, BANNER_NAVY);
  fillRow(3, BANNER_NAVY);
  worksheet.getRow(4).height = BANNER_STRIPE_ROW_HEIGHT_PT;
  fillRow(4, BANNER_BLUE);
  worksheet.getRow(5).height = BANNER_STRIPE_ROW_HEIGHT_PT;
  fillRow(5, BANNER_LIGHT_BLUE);
  worksheet.getRow(6).height = BANNER_STRIPE_ROW_HEIGHT_PT;

  worksheet.mergeCells(1, 1, 3, fillColumns);

  // Match the reference template's spacer width so the logo anchor lands
  // identically (ExcelJS's approximate col→px math otherwise drifts).
  worksheet.getColumn(1).width = SPACER_COL_WIDTH;

  const logoBase64 = await loadLogoBase64();
  if (!logoBase64) return;

  const imageId = workbook.addImage({
    base64: `data:image/png;base64,${logoBase64}`,
    extension: "png",
  });

  // Transparent wordmark/icon over the navy cell fill (not an opaque card).
  // Anchor values copied verbatim from the reference export template.
  worksheet.addImage(imageId, {
    tl: { nativeCol: 0, nativeColOff: 0, nativeRow: 0, nativeRowOff: 0 },
    br: {
      nativeCol: LOGO_ANCHOR_BR_COL,
      nativeColOff: LOGO_ANCHOR_BR_COL_OFF_EMU,
      nativeRow: LOGO_ANCHOR_BR_ROW,
      nativeRowOff: 0,
    },
  } as unknown as Parameters<typeof worksheet.addImage>[1]);
}

function applyHeaderRow(
  worksheet: import("exceljs").Worksheet,
  columns: ExportColumnDef[],
  headerRowNum: number
): void {
  for (let i = 0; i < columns.length; i += 1) {
    const col = DATA_COL_OFFSET + i + 1;
    const headerCell = worksheet.getCell(headerRowNum, col);
    headerCell.value = columns[i].label;
    headerCell.font = { bold: true, size: 11 };
    headerCell.border = {
      top: { style: "thin", color: { argb: "FFD0D0D0" } },
      bottom: { style: "thin", color: { argb: "FFD0D0D0" } },
    };
  }
}

function applyCategoryAndHeaderRows(
  worksheet: import("exceljs").Worksheet,
  columns: ExportColumnDef[],
  options: { includeCategoryRow?: boolean } = {}
): { headerRowNum: number; dataStartRow: number } {
  const includeCategoryRow = options.includeCategoryRow !== false;
  const headerRowNum = includeCategoryRow ? COLUMN_HEADER_ROW : CATEGORY_HEADER_ROW;
  const dataStartRow = includeCategoryRow ? DATA_START_ROW : COLUMN_HEADER_ROW;

  if (includeCategoryRow) {
    const categoryRowNum = CATEGORY_HEADER_ROW;
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
    }
    closeCategoryGroup(DATA_COL_OFFSET + columns.length);
  }

  applyHeaderRow(worksheet, columns, headerRowNum);
  return { headerRowNum, dataStartRow };
}

/** 1-based column index → Excel column letter (1 = A, 2 = B, …). */
function columnIndexToLetter(index: number): string {
  let letter = "";
  let n = index;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

function buildDirectorySheet(
  worksheet: import("exceljs").Worksheet,
  entitySheetName: string,
  columns: ExportColumnDef[]
): void {
  const { left, right } = groupColumnsForDirectory(columns);

  worksheet.properties.defaultRowHeight = 14.4;

  worksheet.columns = [
    { width: SPACER_COL_WIDTH },
    { width: 28 },
    { width: SPACER_COL_WIDTH },
    { width: 28 },
    { width: SPACER_COL_WIDTH },
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
        headerColLetter: columnIndexToLetter(colIndex),
      });
    }
    return entries;
  };

  // Row 7: first category label for each column already appears via entries below (row 8+)
  const leftEntries = toEntries(left);
  const rightEntries = toEntries(right);

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
}

function buildEntitySheet(
  worksheet: import("exceljs").Worksheet,
  columns: ExportColumnDef[],
  rows: string[][],
  options: { includeCategoryRow?: boolean } = {}
): void {
  // Match the reference template's default row height (14.4pt).
  worksheet.properties.defaultRowHeight = 14.4;

  worksheet.columns = [
    { width: SPACER_COL_WIDTH },
    ...columns.map(() => ({ width: 18 })),
  ];

  const { headerRowNum, dataStartRow } = applyCategoryAndHeaderRows(
    worksheet,
    columns,
    options
  );

  for (let r = 0; r < rows.length; r += 1) {
    const rowNum = dataStartRow + r;
    const rowValues = rows[r];
    for (let c = 0; c < rowValues.length; c += 1) {
      worksheet.getCell(rowNum, DATA_COL_OFFSET + c + 1).value = rowValues[c];
    }
  }

  worksheet.views = [
    {
      state: "frozen",
      xSplit: DATA_COL_OFFSET + 2,
      ySplit: headerRowNum,
    },
  ];
}

/**
 * Post-processes ExcelJS's raw XLSX output to fix two things ExcelJS's
 * public API can't express:
 *
 * 1. `customHeight="1"` on `<sheetFormatPr>` — ExcelJS always writes this
 *    whenever `defaultRowHeight` differs from its own internal default of
 *    15, even though our value (14.4) matches the reference template's
 *    *actual* (unflagged) default. That stray flag makes Google Sheets
 *    treat 14.4pt as a "custom" measurement and convert it to 19.2px
 *    instead of respecting it plainly. Stripped from `sheetFormatPr` only
 *    (row-level `customHeight` on rows 4-6/data rows is left untouched).
 *
 * 2. Logo `<xdr:pic>` extent — ExcelJS writes `<a:ext cx="0" cy="0"/>`.
 *    Patch in the reference template's fixed EMU size so Google Sheets
 *    renders the transparent wordmark at exactly 57.6px tall (3×14.4pt),
 *    flush with the navy banner and not bleeding into the blue stripe.
 */
async function patchGeneratedWorkbookXml(
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

  const drawingPaths = Object.keys(zip.files).filter((name) =>
    /^xl\/drawings\/drawing\d+\.xml$/.test(name)
  );
  for (const path of drawingPaths) {
    const xml = await zip.file(path)?.async("string");
    if (!xml) continue;
    let patched = xml;
    // Banner logo: top-left anchor at row/col 0 with a picture inside.
    patched = patched.replace(
      new RegExp(
        String.raw`(<xdr:twoCellAnchor[^>]*>[\s\S]*?<xdr:row>0</xdr:row>[\s\S]*?<xdr:pic>[\s\S]*?<a:ext cx=")\d+(" cy=")\d+("\/>)`,
        "g"
      ),
      `$1${LOGO_EXT_CX_EMU}$2${LOGO_EXT_CY_EMU}$3`
    );
    patched = patched.replace(
      new RegExp(
        String.raw`(<xdr:twoCellAnchor[^>]*>[\s\S]*?<xdr:row>0</xdr:row>[\s\S]*?<xdr:pic>[\s\S]*?<xdr:to>[\s\S]*?<xdr:colOff>)\d+(</xdr:colOff>)`,
        "g"
      ),
      `$1${LOGO_ANCHOR_BR_COL_OFF_EMU}$2`
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
  return patchGeneratedWorkbookXml(buffer as ArrayBuffer);
}

export async function buildVisibleColumnsWorkbook(
  input: VisibleColumnsWorkbookInput
): Promise<ArrayBuffer> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();

  const entitySheet = workbook.addWorksheet(input.entitySheetName);
  buildEntitySheet(entitySheet, input.columns, input.rows, {
    includeCategoryRow: false,
  });
  await applyBanner(
    entitySheet,
    input.columns.length + DATA_COL_OFFSET,
    workbook,
    BANNER_MIN_FILL_COLUMNS_VISIBLE
  );

  const buffer = await workbook.xlsx.writeBuffer();
  return patchGeneratedWorkbookXml(buffer as ArrayBuffer);
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

/** All-columns entity sheet layout (category row + header row). */
export const EXPORT_SHEET_LAYOUT = {
  BANNER_ROW_COUNT,
  CATEGORY_HEADER_ROW,
  COLUMN_HEADER_ROW,
  DATA_START_ROW,
  DATA_COL_OFFSET,
};

/** Visible-columns export: no category row — headers on row 7, data from row 8. */
export const EXPORT_SHEET_LAYOUT_VISIBLE = {
  BANNER_ROW_COUNT,
  COLUMN_HEADER_ROW: CATEGORY_HEADER_ROW,
  DATA_START_ROW: COLUMN_HEADER_ROW,
  DATA_COL_OFFSET,
};

export const EXPORT_BRAND_COLORS = {
  BANNER_NAVY,
  BANNER_BLUE,
  BANNER_LIGHT_BLUE,
  WHITE,
};
