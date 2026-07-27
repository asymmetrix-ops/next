import type { Worksheet } from "exceljs";

export type OutreachImportRow = {
  company_name_text: string;
  website: string;
  ceo_first_name: string;
  ceo_last_name: string;
  ceo_email: string;
  round1_sent_at: number | null;
  round2_sent_at: number | null;
  round3_sent_at: number | null;
};

export type ParsedEmailTemplate = {
  round: 2 | 3;
  headline: string;
  body: string;
  from_email: string;
  publication_date: string;
};

export type OutreachImportResult = {
  rows: OutreachImportRow[];
  emailTemplates: ParsedEmailTemplate[];
};

const COMPANY_SHEET_NAMES = ["company analysis list", "companies", "sheet1"];
const BODY_SHEET_NAME = "body";
const DEFAULT_FROM_EMAIL = "asymmetrix@asymmetrixintelligence.com";

const ROUND_HEADLINES: Record<2 | 3, string> = {
  2: "DCP Outreach — Round 2",
  3: "DCP Outreach — Round 3",
};

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function normalizeSheetName(value: string): string {
  return value.trim().toLowerCase();
}

function todayPublicationDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  cells.push(current);
  return cells;
}

function parseCsv(text: string): Record<string, unknown>[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);
  const rows: Record<string, unknown>[] = [];

  for (const line of lines.slice(1)) {
    const values = parseCsvLine(line);
    const record: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      if (header) record[header] = values[index]?.trim() ?? "";
    });
    if (Object.values(record).some((value) => value != null && value !== "")) {
      rows.push(record);
    }
  }

  return rows;
}

function cellToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("richText" in value && Array.isArray((value as { richText: unknown }).richText)) {
      return (value as { richText: { text: string }[] }).richText
        .map((part) => part.text)
        .join("");
    }
    if ("text" in value) return String((value as { text: unknown }).text);
    if ("result" in value) return cellToText((value as { result: unknown }).result);
    if ("hyperlink" in value && "text" in value) {
      return String((value as { text: unknown }).text);
    }
  }
  return String(value);
}

function extractEmailBody(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/^Subject:\s*.+(?:\n|$)/i, "")
    .trim();
}

function findSheetByName(
  worksheets: { name: string }[],
  candidates: string[]
): number | null {
  const normalizedCandidates = new Set(candidates.map(normalizeSheetName));
  const index = worksheets.findIndex((sheet) =>
    normalizedCandidates.has(normalizeSheetName(sheet.name))
  );
  return index >= 0 ? index : null;
}

type ExcelWorksheet = Worksheet;

function parseWorksheetRows(sheet: ExcelWorksheet): Record<string, unknown>[] {
  const headers: string[] = [];
  const rows: Record<string, unknown>[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = normalizeHeader(cellToText(cell.value));
      });
      return;
    }

    const record: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      if (!header) return;
      record[header] = cellToText(row.getCell(index + 1).value);
    });

    if (Object.values(record).some((value) => value != null && value !== "")) {
      rows.push(record);
    }
  });

  return rows;
}

function findRoundColumnIndex(headers: string[], round: 2 | 3): number | null {
  const pattern = round === 2 ? /round\s*2/i : /round\s*3/i;
  const index = headers.findIndex((header) => pattern.test(header));
  return index >= 0 ? index : null;
}

function parseBodySheet(sheet: ExcelWorksheet): ParsedEmailTemplate[] {
  const headers: string[] = [];
  const columnTexts: string[][] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = cellToText(cell.value).trim();
        columnTexts[colNumber - 1] = [];
      });
      return;
    }

    headers.forEach((_, index) => {
      const text = cellToText(row.getCell(index + 1).value).trim();
      if (text) {
        if (!columnTexts[index]) columnTexts[index] = [];
        columnTexts[index].push(text);
      }
    });
  });

  const publicationDate = todayPublicationDate();
  const templates: ParsedEmailTemplate[] = [];

  for (const round of [2, 3] as const) {
    const columnIndex = findRoundColumnIndex(headers, round);
    if (columnIndex == null) continue;

    const rawBody = (columnTexts[columnIndex] ?? []).join("\n\n").trim();
    const body = extractEmailBody(rawBody);
    if (!body) continue;

    templates.push({
      round,
      headline: ROUND_HEADLINES[round],
      body,
      from_email: DEFAULT_FROM_EMAIL,
      publication_date: publicationDate,
    });
  }

  return templates;
}

async function parseExcelWorkbook(file: File): Promise<{
  rawRows: Record<string, unknown>[];
  emailTemplates: ParsedEmailTemplate[];
}> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());

  const companySheetIndex =
    findSheetByName(workbook.worksheets, COMPANY_SHEET_NAMES) ??
    workbook.worksheets.findIndex(
      (sheet) => normalizeSheetName(sheet.name) !== BODY_SHEET_NAME
    );

  const companySheet =
    companySheetIndex >= 0 ? workbook.worksheets[companySheetIndex] : null;
  const rawRows = companySheet ? parseWorksheetRows(companySheet) : [];

  const bodySheetIndex = findSheetByName(workbook.worksheets, [BODY_SHEET_NAME]);
  const emailTemplates =
    bodySheetIndex != null
      ? parseBodySheet(workbook.worksheets[bodySheetIndex])
      : [];

  return { rawRows, emailTemplates };
}

export function parseTimestamp(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "object" && value && "result" in value) {
    return parseTimestamp((value as { result: unknown }).result);
  }
  if (typeof value === "number") {
    if (value > 1e12) return Math.round(value);
    if (value > 1e9) return Math.round(value * 1000);
    if (value > 0 && value < 100000) {
      const epoch = Date.UTC(1899, 11, 30);
      return epoch + Math.round(value * 86400000);
    }
    return Math.round(value);
  }

  const str = String(value).trim();
  if (!str) return null;

  const num = Number(str);
  if (!Number.isNaN(num)) return parseTimestamp(num);

  const parsed = Date.parse(str);
  return Number.isNaN(parsed) ? null : parsed;
}

function getField(raw: Record<string, unknown>, keys: string[]): unknown {
  const wanted = new Set(keys.map(normalizeHeader));
  for (const [rawKey, value] of Object.entries(raw)) {
    if (wanted.has(normalizeHeader(rawKey))) return value;
  }
  return undefined;
}

export function mapToOutreachRow(
  raw: Record<string, unknown>
): OutreachImportRow | null {
  const company_name_text = String(
    getField(raw, ["company_name_text", "company_name"]) ?? ""
  ).trim();
  if (!company_name_text) return null;

  return {
    company_name_text,
    website: String(getField(raw, ["website"]) ?? "").trim(),
    ceo_first_name: String(getField(raw, ["ceo_first_name"]) ?? "").trim(),
    ceo_last_name: String(getField(raw, ["ceo_last_name"]) ?? "").trim(),
    ceo_email: String(getField(raw, ["ceo_email"]) ?? "").trim(),
    round1_sent_at: parseTimestamp(getField(raw, ["round1_sent_at"])),
    round2_sent_at: parseTimestamp(getField(raw, ["round2_sent_at"])),
    round3_sent_at: parseTimestamp(getField(raw, ["round3_sent_at"])),
  };
}

export async function parseOutreachImportFile(
  file: File
): Promise<OutreachImportResult> {
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith(".csv")) {
    const rawRows = parseCsv(await file.text());
    const rows = rawRows
      .map(mapToOutreachRow)
      .filter((row): row is OutreachImportRow => row != null);

    if (rows.length === 0) {
      throw new Error("No valid rows found. Check column headers and data.");
    }

    return { rows, emailTemplates: [] };
  }

  if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
    const { rawRows, emailTemplates } = await parseExcelWorkbook(file);
    const rows = rawRows
      .map(mapToOutreachRow)
      .filter((row): row is OutreachImportRow => row != null);

    if (rows.length === 0) {
      throw new Error("No valid rows found. Check column headers and data.");
    }

    return { rows, emailTemplates };
  }

  throw new Error("Unsupported file type. Upload a .csv or .xlsx file.");
}

export const OUTREACH_IMPORT_COLUMNS = [
  "company_name_text",
  "website",
  "ceo_first_name",
  "ceo_last_name",
  "ceo_email",
  "round1_sent_at",
  "round2_sent_at",
  "round3_sent_at",
] as const;
