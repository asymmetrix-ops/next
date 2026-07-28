export type IncomeStatementApiEntry = {
  id: number;
  period_display_end_date?: string;
  period_end_date?: string;
  period_type?: string;
  period_year?: number | string | null;
  revenue?: number | string | null;
  ebit?: number | string | null;
  ebitda?: number | string | null;
  EBIT_margin_pc?: number | string | null;
  EBITDA_margin_pc?: number | string | null;
  FTE_count?: number | string | null;
  Revenue_per_FTE?: number | string | null;
  statement_currency?: string | null;
  cost_of_goods_sold_currency?: string | null;
};

export type NormalizedIncomeStatementRow = {
  id: number;
  period_display_end_date?: string;
  period_end_date?: string;
  period_type?: string;
  period_year?: number | null;
  revenue?: number | null;
  ebit?: number | null;
  ebitda?: number | null;
  ebit_margin_pc?: number | null;
  ebitda_margin_pc?: number | null;
  fte_count?: number | null;
  revenue_per_fte?: number | null;
  statement_currency?: string;
};

function parseNumeric(value?: number | string | null): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "number")
    return Number.isFinite(value) ? value : undefined;
  const trimmed = String(value).trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed.replace(/,/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function parseIncomeStatementBlocks(
  blocks: Array<{ income_statements?: IncomeStatementApiEntry[] | string }> | undefined
): IncomeStatementApiEntry[] {
  return (blocks || []).flatMap((block) => {
    const raw = block?.income_statements as unknown;
    if (!raw) return [] as IncomeStatementApiEntry[];
    if (typeof raw === "string") {
      try {
        const decoded = JSON.parse(
          raw.replace(/\\u0022/g, '"')
        ) as unknown;
        return Array.isArray(decoded)
          ? (decoded as IncomeStatementApiEntry[])
          : [];
      } catch {
        return [] as IncomeStatementApiEntry[];
      }
    }
    return (raw as IncomeStatementApiEntry[]) || [];
  });
}

function normalizeRow(row: IncomeStatementApiEntry): NormalizedIncomeStatementRow {
  const revenue = parseNumeric(row.revenue);
  const fteCount = parseNumeric(row.FTE_count);
  const revenuePerFte = parseNumeric(row.Revenue_per_FTE);

  return {
    id: row.id,
    period_display_end_date: row.period_display_end_date,
    period_end_date: row.period_end_date,
    period_type: row.period_type?.trim() || undefined,
    period_year: parseNumeric(row.period_year) ?? null,
    revenue: revenue ?? null,
    ebit: parseNumeric(row.ebit) ?? null,
    ebitda: parseNumeric(row.ebitda) ?? null,
    ebit_margin_pc: parseNumeric(row.EBIT_margin_pc) ?? null,
    ebitda_margin_pc: parseNumeric(row.EBITDA_margin_pc) ?? null,
    fte_count: fteCount ?? null,
    revenue_per_fte:
      revenuePerFte ??
      (revenue != null && fteCount != null && fteCount > 0
        ? revenue / fteCount
        : null),
    statement_currency: row.statement_currency?.trim() || undefined,
  };
}

function periodSortKey(row: NormalizedIncomeStatementRow): number {
  if (row.period_end_date) return Date.parse(row.period_end_date) || 0;
  return (
    Date.parse((row.period_display_end_date || "").replace(/[^0-9-]/g, "")) || 0
  );
}

/** Parses API income-statement blocks and returns up to 3 most recent periods. */
export function normalizeIncomeStatementRows(
  blocks: Array<{ income_statements?: IncomeStatementApiEntry[] | string }> | undefined,
  limit = 3
): NormalizedIncomeStatementRow[] {
  return parseIncomeStatementBlocks(blocks)
    .map(normalizeRow)
    .sort((a, b) => periodSortKey(a) - periodSortKey(b))
    .slice(-limit);
}

/** Normalizes rows from `company_income_statement_card` (flat array). */
export function normalizeIncomeStatementApiRows(
  rows: IncomeStatementApiEntry[] | undefined,
  limit = 3
): NormalizedIncomeStatementRow[] {
  return selectIncomeStatementYearColumns(
    (rows || []).map(normalizeRow),
    limit
  );
}

export function hasIncomeStatementValues(
  rows: NormalizedIncomeStatementRow[]
): boolean {
  return rows.some(
    (row) =>
      row.revenue != null ||
      row.ebit != null ||
      row.ebitda != null ||
      row.ebit_margin_pc != null ||
      row.ebitda_margin_pc != null
  );
}

function resolvePeriodYear(row: NormalizedIncomeStatementRow): number | null {
  if (row.period_year != null) return row.period_year;
  if (row.period_end_date) {
    const y = new Date(row.period_end_date).getFullYear();
    return Number.isFinite(y) ? y : null;
  }
  const fromDisplay = (row.period_display_end_date || "").match(/\b(20\d{2})\b/);
  return fromDisplay ? Number(fromDisplay[1]) : null;
}

/** Picks up to 3 fiscal-year columns, preferring fiscal_year over quarterly for the same year. */
export function selectIncomeStatementYearColumns(
  rows: NormalizedIncomeStatementRow[],
  limit = 3
): NormalizedIncomeStatementRow[] {
  const byYear = new Map<number, NormalizedIncomeStatementRow>();

  for (const row of rows) {
    const year = resolvePeriodYear(row);
    if (year == null) continue;
    const existing = byYear.get(year);
    if (!existing) {
      byYear.set(year, row);
      continue;
    }
    const rowIsFy = row.period_type === "fiscal_year";
    const existingIsFy = existing.period_type === "fiscal_year";
    if (rowIsFy && !existingIsFy) {
      byYear.set(year, row);
    } else if (rowIsFy === existingIsFy) {
      const rowKey = periodSortKey(row);
      const existingKey = periodSortKey(existing);
      if (rowKey >= existingKey) byYear.set(year, row);
    }
  }

  return Array.from(byYear.entries())
    .sort((a, b) => a[0] - b[0])
    .slice(-limit)
    .map(([, row]) => row);
}

export function resolveIncomeStatementCurrency(
  rows: NormalizedIncomeStatementRow[],
  fallback?: string
): string {
  const fromRows = rows.map((row) => row.statement_currency).find(Boolean);
  return fromRows || fallback?.trim() || "";
}
