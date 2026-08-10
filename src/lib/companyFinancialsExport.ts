import { downloadXlsxBuffer } from "@/lib/listExport/xlsx";
import { EXCEL_NUM_FMT, writeExportCell } from "@/lib/listExport/exportCellValue";
import type { FiMetricSourceType } from "@/lib/financialIntelligence/sourceTypes";
import type {
  IncomeStatementExportFormat,
  IncomeStatementFinancialsViewModel,
} from "@/lib/incomeStatementFinancials";
import {
  FINANCIALS_CARD_DEFS,
  FINANCIALS_DISPLAY_YEAR_COUNT,
  FINANCIALS_TABLE_MAX_YEAR_COLUMNS,
  formatFiscalYearHeader,
  getVisibleFinancialsCellDisplay,
  getVisibleYoyValue,
  type CompanyFinancialsViewModel,
  type FinancialsMetricFormat,
  type FinancialsMetricRow,
} from "@/lib/companyFinancialMetricsCard";

const FINANCIALS_TEMPLATE_PATH = "/exports/financials-export-template.xlsx";

/** Column indices on the v5 template (1-based): C+ = year columns, F = source. */
const COL_YEAR_START = 3;
const COL_METRICS_YOY = 5;
const COL_SOURCE = 6;

const CENTER_ALIGN: Partial<import("exceljs").Alignment> = {
  horizontal: "center",
  vertical: "middle",
};

const METRIC_FORMAT_BY_KEY = FINANCIALS_CARD_DEFS.reduce<
  Record<string, FinancialsMetricFormat>
>((map, card) => {
  for (const metric of card.metrics) {
    map[metric.key] = metric.format;
  }
  return map;
}, {});

function excelNumFmtForMetricFormat(
  format: FinancialsMetricFormat | undefined
): string | undefined {
  switch (format) {
    case "money_millions":
      return EXCEL_NUM_FMT.millionsDecimal;
    case "percent":
      return EXCEL_NUM_FMT.percent;
    case "count":
      return EXCEL_NUM_FMT.count;
    case "money_whole":
      return EXCEL_NUM_FMT.whole;
    case "plain_number":
      return EXCEL_NUM_FMT.decimal;
    case "multiple":
      return EXCEL_NUM_FMT.multiple;
    default:
      return undefined;
  }
}

function excelNumFmtForIncomeStatementFormat(
  format: IncomeStatementExportFormat
): string {
  switch (format) {
    case "millions_from_units":
      return EXCEL_NUM_FMT.millions;
    case "percent":
      return EXCEL_NUM_FMT.percent;
    case "count":
      return EXCEL_NUM_FMT.count;
    case "whole":
      return EXCEL_NUM_FMT.whole;
    default:
      return EXCEL_NUM_FMT.decimal;
  }
}

function exportValueForIncomeStatement(
  raw: number | null,
  format: IncomeStatementExportFormat
): number | null {
  if (raw == null || !Number.isFinite(raw)) return null;
  if (format === "millions_from_units") return raw / 1_000_000;
  return raw;
}

const SECTION_HEADER_ROWS = {
  incomeStatement: 7,
  financial: 17,
  subscription: 24,
  other: 35,
} as const;

const INCOME_STATEMENT_ROWS: Record<string, number> = {
  revenue: 8,
  ebitda: 10,
  ebitda_margin: 11,
  ebit: 12,
  ebit_margin: 13,
  fte: 14,
  revenue_per_fte: 15,
};

const FINANCIAL_METRIC_ROWS: Record<string, number> = {
  ev: 18,
  revenue_multiple: 19,
  rev_growth: 20,
  ebitda_margin: 21,
  rule_of_40: 22,
};

const SUBSCRIPTION_METRIC_ROWS: Record<string, number> = {
  subscription_revenue_pc: 25,
  subscription_revenue_m: 26,
  churn: 27,
  upsell: 28,
  cross_sell: 29,
  price_increase: 30,
  rev_expansion: 31,
  nrr: 32,
  new_client_growth: 33,
};

const OTHER_METRIC_ROWS: Record<string, number> = {
  ebit: 36,
  clients: 37,
  rev_per_client: 38,
  employees: 39,
  rev_per_employee: 40,
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function loadFinancialsTemplate(): Promise<ArrayBuffer> {
  const response = await fetch(FINANCIALS_TEMPLATE_PATH);
  if (!response.ok) {
    throw new Error("Failed to load financials export template");
  }
  return response.arrayBuffer();
}

function setCenteredCell(
  worksheet: import("exceljs").Worksheet,
  row: number,
  col: number,
  value: string | number
): void {
  const cell = worksheet.getCell(row, col);
  cell.value = value;
  cell.alignment = CENTER_ALIGN;
}

function writeNumericCell(
  worksheet: import("exceljs").Worksheet,
  row: number,
  col: number,
  value: number | null | undefined,
  numFmt?: string
): void {
  const cell = worksheet.getCell(row, col);
  cell.alignment = CENTER_ALIGN;
  writeExportCell(cell, value ?? null, numFmt);
}

function setYearHeaders(
  worksheet: import("exceljs").Worksheet,
  headerRow: number,
  years: number[],
  options: { yearCount: number; includeYoy: boolean }
): void {
  const { yearCount, includeYoy } = options;
  const exportYears = years.slice(-yearCount);
  while (exportYears.length < yearCount) exportYears.unshift(NaN);

  for (let index = 0; index < yearCount; index += 1) {
    const year = exportYears[index];
    setCenteredCell(
      worksheet,
      headerRow,
      COL_YEAR_START + index,
      Number.isFinite(year) ? formatFiscalYearHeader(year) : ""
    );
  }

  if (includeYoy) {
    setCenteredCell(worksheet, headerRow, COL_METRICS_YOY, "YoY");
  }

  setCenteredCell(worksheet, headerRow, COL_SOURCE, "Source");
}

function writeYearNumericValues(
  worksheet: import("exceljs").Worksheet,
  row: number,
  values: Array<number | null>,
  yearCount: number,
  numFmt?: string
): void {
  const padded = values.slice(-yearCount);
  while (padded.length < yearCount) padded.unshift(null);

  for (let index = 0; index < yearCount; index += 1) {
    writeNumericCell(
      worksheet,
      row,
      COL_YEAR_START + index,
      padded[index] ?? null,
      numFmt
    );
  }
}

function resolveMetricSourceLabel(
  metric: FinancialsMetricRow,
  years: number[],
  allowedSources: FiMetricSourceType[]
): string {
  for (let index = years.length - 1; index >= 0; index -= 1) {
    const year = years[index];
    const cell = metric.cellsByYear[year];
    if (!cell?.sourceType) continue;
    const display = getVisibleFinancialsCellDisplay(cell, allowedSources);
    if (display !== "-") return cell.sourceType;
  }
  return "";
}

function fillCardMetricRow(
  worksheet: import("exceljs").Worksheet,
  row: number,
  metric: FinancialsMetricRow | undefined,
  years: number[],
  allowedSources: FiMetricSourceType[]
): void {
  if (!metric) return;

  const metricFormat = METRIC_FORMAT_BY_KEY[metric.key];
  const numFmt = excelNumFmtForMetricFormat(metricFormat);

  const yearValues = years.map((year) => {
    const cell = metric.cellsByYear[year];
    if (!cell) return null;
    const display = getVisibleFinancialsCellDisplay(cell, allowedSources);
    if (display === "-") return null;
    return cell.raw;
  });

  writeYearNumericValues(
    worksheet,
    row,
    yearValues,
    FINANCIALS_DISPLAY_YEAR_COUNT,
    numFmt
  );

  const yoy = getVisibleYoyValue(metric, years, allowedSources);
  writeNumericCell(
    worksheet,
    row,
    COL_METRICS_YOY,
    yoy?.percentChange ?? null,
    EXCEL_NUM_FMT.percent
  );

  setCenteredCell(
    worksheet,
    row,
    COL_SOURCE,
    resolveMetricSourceLabel(metric, years, allowedSources)
  );
}

function fillCardSection(
  worksheet: import("exceljs").Worksheet,
  card: CompanyFinancialsViewModel["cards"][number] | undefined,
  rowMap: Record<string, number>,
  headerRow: number,
  years: number[],
  allowedSources: FiMetricSourceType[]
): void {
  if (!card) return;

  setYearHeaders(worksheet, headerRow, years, {
    yearCount: FINANCIALS_DISPLAY_YEAR_COUNT,
    includeYoy: true,
  });

  const metricsByKey = new Map(card.metrics.map((metric) => [metric.key, metric]));
  for (const [key, row] of Object.entries(rowMap)) {
    fillCardMetricRow(
      worksheet,
      row,
      metricsByKey.get(key),
      years,
      allowedSources
    );
  }
}

function fillIncomeStatementSection(
  worksheet: import("exceljs").Worksheet,
  model: IncomeStatementFinancialsViewModel | null | undefined,
  allowedSources: FiMetricSourceType[]
): void {
  if (!model) return;

  const exportYears = model.years
    .filter((year): year is number => year != null)
    .slice(-FINANCIALS_TABLE_MAX_YEAR_COLUMNS);

  setYearHeaders(worksheet, SECTION_HEADER_ROWS.incomeStatement, exportYears, {
    yearCount: FINANCIALS_TABLE_MAX_YEAR_COLUMNS,
    includeYoy: false,
  });

  const sourceVisible = allowedSources.includes(model.sourceType);
  const metricsByKey = new Map(model.metrics.map((metric) => [metric.key, metric]));

  for (const [key, row] of Object.entries(INCOME_STATEMENT_ROWS)) {
    const metric = metricsByKey.get(key);
    if (!metric) continue;

    const values = metric.rawValues.slice(-FINANCIALS_TABLE_MAX_YEAR_COLUMNS);
    const exportValues = sourceVisible
      ? values.map((raw) =>
          exportValueForIncomeStatement(raw, metric.exportFormat)
        )
      : values.map(() => null);
    const numFmt = excelNumFmtForIncomeStatementFormat(metric.exportFormat);

    writeYearNumericValues(
      worksheet,
      row,
      exportValues,
      FINANCIALS_TABLE_MAX_YEAR_COLUMNS,
      numFmt
    );
  }

  setCenteredCell(
    worksheet,
    INCOME_STATEMENT_ROWS.revenue,
    COL_SOURCE,
    sourceVisible ? model.sourceType : ""
  );
}

export type FinancialMetricsExportInput = {
  model: CompanyFinancialsViewModel;
  allowedSources: FiMetricSourceType[];
  companyName: string;
  /** Shared table years (IS may use up to 3; metric cards use the latest 2). */
  tableYears: number[];
  incomeStatementModel?: IncomeStatementFinancialsViewModel | null;
};

/** Exports the current filtered view into the branded financials XLSX template. */
export async function exportFinancialMetricsView(
  input: FinancialMetricsExportInput
): Promise<void> {
  const {
    model,
    allowedSources,
    companyName,
    tableYears,
    incomeStatementModel,
  } = input;

  const metricExportYears = tableYears.slice(-FINANCIALS_DISPLAY_YEAR_COUNT);

  const ExcelJS = (await import("exceljs")).default;
  const templateBuffer = await loadFinancialsTemplate();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(templateBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("Financials export template is missing a worksheet");
  }

  fillIncomeStatementSection(
    worksheet,
    incomeStatementModel,
    allowedSources
  );

  const cardsById = new Map(model.cards.map((card) => [card.id, card]));

  fillCardSection(
    worksheet,
    cardsById.get("financial"),
    FINANCIAL_METRIC_ROWS,
    SECTION_HEADER_ROWS.financial,
    metricExportYears,
    allowedSources
  );
  fillCardSection(
    worksheet,
    cardsById.get("subscription"),
    SUBSCRIPTION_METRIC_ROWS,
    SECTION_HEADER_ROWS.subscription,
    metricExportYears,
    allowedSources
  );
  fillCardSection(
    worksheet,
    cardsById.get("other"),
    OTHER_METRIC_ROWS,
    SECTION_HEADER_ROWS.other,
    metricExportYears,
    allowedSources
  );

  const outputBuffer = await workbook.xlsx.writeBuffer();
  await downloadXlsxBuffer(
    outputBuffer as ArrayBuffer,
    `Financials_Export_${slugify(companyName) || "company"}`
  );
}
