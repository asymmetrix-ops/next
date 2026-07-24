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

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
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

async function parseExcelFile(file: File): Promise<Record<string, unknown>[]> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headers: string[] = [];
  const rows: Record<string, unknown>[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = normalizeHeader(String(cell.value ?? ""));
      });
      return;
    }

    const record: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      if (!header) return;
      const cell = row.getCell(index + 1);
      record[header] = cell.value ?? "";
    });

    if (Object.values(record).some((value) => value != null && value !== "")) {
      rows.push(record);
    }
  });

  return rows;
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
): Promise<OutreachImportRow[]> {
  const lowerName = file.name.toLowerCase();
  const rawRows =
    lowerName.endsWith(".csv")
      ? parseCsv(await file.text())
      : lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")
        ? await parseExcelFile(file)
        : null;

  if (rawRows == null) {
    throw new Error("Unsupported file type. Upload a .csv or .xlsx file.");
  }

  const rows = rawRows
    .map(mapToOutreachRow)
    .filter((row): row is OutreachImportRow => row != null);

  if (rows.length === 0) {
    throw new Error("No valid rows found. Check column headers and data.");
  }

  return rows;
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
