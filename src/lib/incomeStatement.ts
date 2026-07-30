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
  currency?: string | null;
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

function sanitizeCurrencyCode(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "0" || /^\d+$/.test(trimmed)) return undefined;
  if (trimmed.toUpperCase() === "US$" || trimmed.toUpperCase() === "US") {
    return "USD";
  }
  return trimmed.toUpperCase();
}

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
    statement_currency:
      sanitizeCurrencyCode(row.statement_currency) ||
      sanitizeCurrencyCode(row.currency) ||
      undefined,
  };
}

function parseQuarterYearFromDisplay(display: string): { year: number; quarter: number } | null {
  const compact = display.replace(/[\s,]/g, "");
  const match =
    compact.match(/^Q([1-4])(20\d{2})$/i) ||
    compact.match(/^Q([1-4])[-/](20\d{2})$/i) ||
    compact.match(/^Q\s?([1-4])\s?[-/]?\s?(20\d{2})$/i);
  if (!match) return null;
  return { quarter: Number(match[1]), year: Number(match[2]) };
}

function parseFiscalYearFromDisplay(display: string): number | null {
  const compact = display.replace(/[\s,]/g, "");
  const fyMatch = compact.match(/^FY(20\d{2})$/i);
  if (fyMatch) return Number(fyMatch[1]);
  const yearMatch = compact.match(/\b(20\d{2})\b/);
  return yearMatch ? Number(yearMatch[1]) : null;
}

/** Comparable UTC timestamp for column ordering (oldest → newest, left → right). */
export function incomeStatementPeriodSortKey(
  row: NormalizedIncomeStatementRow
): number {
  if (row.period_end_date) {
    const parsed = Date.parse(row.period_end_date);
    if (!Number.isNaN(parsed)) return parsed;
  }

  const display = (row.period_display_end_date || "").trim();
  if (display) {
    const quarter = parseQuarterYearFromDisplay(display);
    if (quarter) {
      // End-of-quarter month/day for stable ordering vs fiscal years.
      const monthIndex = quarter.quarter * 3 - 1;
      return Date.UTC(quarter.year, monthIndex + 1, 0);
    }

    const fiscalYear = parseFiscalYearFromDisplay(display);
    if (fiscalYear != null) {
      return Date.UTC(fiscalYear, 11, 31);
    }
  }

  if (row.period_year != null) {
    const periodType = (row.period_type || "").toLowerCase();
    if (periodType.includes("quarter")) {
      return Date.UTC(row.period_year, 11, 31);
    }
    return Date.UTC(row.period_year, 11, 31);
  }

  return 0;
}

/** Oldest → newest (left-to-right in the table). */
export function sortIncomeStatementRowsAsc(
  rows: NormalizedIncomeStatementRow[]
): NormalizedIncomeStatementRow[] {
  return [...rows].sort(
    (a, b) => incomeStatementPeriodSortKey(a) - incomeStatementPeriodSortKey(b)
  );
}

function periodSortKey(row: NormalizedIncomeStatementRow): number {
  return incomeStatementPeriodSortKey(row);
}

/** Parses API income-statement blocks and returns up to 3 most recent periods. */
export function normalizeIncomeStatementRows(
  blocks: Array<{ income_statements?: IncomeStatementApiEntry[] | string }> | undefined,
  limit = 3
): NormalizedIncomeStatementRow[] {
  const sorted = sortIncomeStatementRowsAsc(
    parseIncomeStatementBlocks(blocks).map(normalizeRow)
  );
  return sorted.slice(-limit);
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
  const display = (row.period_display_end_date || "").trim();
  const quarter = parseQuarterYearFromDisplay(display);
  if (quarter) return quarter.year;
  return parseFiscalYearFromDisplay(display);
}

/** Picks up to N fiscal-year columns, preferring fiscal_year over quarterly for the same year. */
export function selectIncomeStatementYearColumns(
  rows: NormalizedIncomeStatementRow[],
  limit = 2
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

  return sortIncomeStatementRowsAsc(
    Array.from(byYear.entries())
      .sort((a, b) => a[0] - b[0])
      .slice(-limit)
      .map(([, row]) => row)
  );
}

export function resolveIncomeStatementCurrency(
  rows: NormalizedIncomeStatementRow[],
  fallback?: string
): string {
  for (const row of rows) {
    const code = sanitizeCurrencyCode(row.statement_currency);
    if (code) return code;
  }
  return sanitizeCurrencyCode(fallback) || "";
}

type FinancialMetricsIncomeRow = {
  id?: number;
  financial_year_int?: number | null;
  financial_year_text?: string | null;
  Revenue_m?: number | string | null;
  Revenue_currency_display?: string | null;
  EBITDA_m?: number | string | null;
  EBITDA_currency_display?: string | null;
  EBIT_m?: number | string | null;
  EBIT_currency_display?: string | null;
};

function millionsToRaw(value: number | string | null | undefined): number | null {
  const millions = parseNumeric(value);
  if (millions == null) return null;
  return millions * 1_000_000;
}

/** Builds income-statement-shaped rows from multi-year financial metrics card data. */
export function buildIncomeStatementFromFinancialMetrics(
  rows: FinancialMetricsIncomeRow[]
): NormalizedIncomeStatementRow[] {
  return rows.flatMap((row, index) => {
    const year =
      parseNumeric(row.financial_year_int) ??
      parseNumeric(row.financial_year_text);
    if (year == null) return [];

    const revenue = millionsToRaw(row.Revenue_m);
    const ebit = millionsToRaw(row.EBIT_m);
    const ebitda = millionsToRaw(row.EBITDA_m);
    if (revenue == null && ebit == null && ebitda == null) return [];

    return [
      {
        id: row.id ?? index,
        period_type: "fiscal_year",
        period_year: year,
        period_display_end_date: `FY${year}`,
        revenue,
        ebit,
        ebitda,
        statement_currency:
          sanitizeCurrencyCode(row.Revenue_currency_display) ||
          sanitizeCurrencyCode(row.EBIT_currency_display) ||
          sanitizeCurrencyCode(row.EBITDA_currency_display) ||
          undefined,
      },
    ];
  });
}

/** Merges profile/API/card sources and returns up to 3 fiscal-year columns. */
export function resolveDisplayIncomeStatementRows({
  apiRows = [],
  profileRows = [],
  financialMetricsRows = [],
  limit = 3,
}: {
  apiRows?: NormalizedIncomeStatementRow[];
  profileRows?: NormalizedIncomeStatementRow[];
  financialMetricsRows?: FinancialMetricsIncomeRow[];
  limit?: number;
}): NormalizedIncomeStatementRow[] {
  const fromMetrics = buildIncomeStatementFromFinancialMetrics(
    financialMetricsRows
  );
  const merged = selectIncomeStatementYearColumns(
    [...apiRows, ...profileRows, ...fromMetrics],
    limit
  );
  const fallbackCurrency = resolveIncomeStatementCurrency(
    merged,
    sanitizeCurrencyCode(
      financialMetricsRows
        .map((row) => row.Revenue_currency_display)
        .find(Boolean)
    )
  );
  if (!fallbackCurrency) return merged;

  return sortIncomeStatementRowsAsc(
    merged.map((row) => ({
      ...row,
      statement_currency:
        sanitizeCurrencyCode(row.statement_currency) || fallbackCurrency,
    }))
  );
}
