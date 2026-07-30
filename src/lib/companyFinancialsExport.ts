import { downloadXlsxBuffer } from "@/lib/listExport/xlsx";
import type { FiMetricSourceType } from "@/lib/financialIntelligence/sourceTypes";
import type { IncomeStatementFinancialsViewModel } from "@/lib/incomeStatementFinancials";
import {
  formatFiscalYearHeader,
  getVisibleFinancialsCellDisplay,
  getVisibleYoyValue,
  type CompanyFinancialsViewModel,
  type FinancialsMetricRow,
} from "@/lib/companyFinancialMetricsCard";

const FINANCIALS_TEMPLATE_PATH = "/exports/financials-export-template.xlsx";

/** Column indices on the reference template (1-based): C/D=years, E=YoY, F=source. */
const COL_YEAR_START = 3;
const COL_YOY = 5;
const COL_SOURCE = 6;

const CENTER_ALIGN: Partial<import("exceljs").Alignment> = {
  horizontal: "center",
  vertical: "middle",
};

const SECTION_HEADER_ROWS = {
  incomeStatement: 7,
  financial: 17,
  subscription: 24,
  other: 35,
} as const;

const INCOME_STATEMENT_ROWS: Record<string, number> = {
  revenue: 8,
  revenue_yoy: 9,
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

function setYearHeaders(
  worksheet: import("exceljs").Worksheet,
  headerRow: number,
  years: number[]
): void {
  for (let index = 0; index < 2; index += 1) {
    const year = years[index];
    setCenteredCell(
      worksheet,
      headerRow,
      COL_YEAR_START + index,
      year ? formatFiscalYearHeader(year) : ""
    );
  }
  setCenteredCell(worksheet, headerRow, COL_YOY, "YoY");
  setCenteredCell(worksheet, headerRow, COL_SOURCE, "Source");
}

function writeYearValues(
  worksheet: import("exceljs").Worksheet,
  row: number,
  values: string[]
): void {
  for (let index = 0; index < 2; index += 1) {
    setCenteredCell(
      worksheet,
      row,
      COL_YEAR_START + index,
      values[index] ?? "-"
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

  const yearValues = years.map((year) => {
    const cell = metric.cellsByYear[year];
    if (!cell) return "-";
    return getVisibleFinancialsCellDisplay(cell, allowedSources);
  });
  while (yearValues.length < 2) yearValues.unshift("-");

  writeYearValues(worksheet, row, yearValues.slice(-2));

  const yoy = getVisibleYoyValue(metric, years, allowedSources);
  setCenteredCell(worksheet, row, COL_YOY, yoy?.display ?? "-");

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

  setYearHeaders(worksheet, headerRow, years);

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
  years: number[],
  allowedSources: FiMetricSourceType[]
): void {
  setYearHeaders(worksheet, SECTION_HEADER_ROWS.incomeStatement, years);
  if (!model) return;

  const sourceVisible = allowedSources.includes(model.sourceType);
  const metricsByKey = new Map(model.metrics.map((metric) => [metric.key, metric]));

  for (const [key, row] of Object.entries(INCOME_STATEMENT_ROWS)) {
    const metric = metricsByKey.get(key);
    if (!metric) continue;

    const values = metric.values.slice(-2);
    while (values.length < 2) values.unshift("-");

    const displayValues = sourceVisible ? values : values.map(() => "-");

    writeYearValues(worksheet, row, displayValues);
  }

  if (sourceVisible) {
    setCenteredCell(
      worksheet,
      INCOME_STATEMENT_ROWS.revenue,
      COL_SOURCE,
      model.sourceType
    );
  } else {
    setCenteredCell(worksheet, INCOME_STATEMENT_ROWS.revenue, COL_SOURCE, "");
  }
}

export type FinancialMetricsExportInput = {
  model: CompanyFinancialsViewModel;
  allowedSources: FiMetricSourceType[];
  companyName: string;
  years: number[];
  incomeStatementModel?: IncomeStatementFinancialsViewModel | null;
};

/** Exports the current filtered view into the branded financials XLSX template. */
export async function exportFinancialMetricsView(
  input: FinancialMetricsExportInput
): Promise<void> {
  const { model, allowedSources, companyName, years, incomeStatementModel } =
    input;

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
    years,
    allowedSources
  );

  const cardsById = new Map(model.cards.map((card) => [card.id, card]));

  fillCardSection(
    worksheet,
    cardsById.get("financial"),
    FINANCIAL_METRIC_ROWS,
    SECTION_HEADER_ROWS.financial,
    years,
    allowedSources
  );
  fillCardSection(
    worksheet,
    cardsById.get("subscription"),
    SUBSCRIPTION_METRIC_ROWS,
    SECTION_HEADER_ROWS.subscription,
    years,
    allowedSources
  );
  fillCardSection(
    worksheet,
    cardsById.get("other"),
    OTHER_METRIC_ROWS,
    SECTION_HEADER_ROWS.other,
    years,
    allowedSources
  );

  const outputBuffer = await workbook.xlsx.writeBuffer();
  await downloadXlsxBuffer(
    outputBuffer as ArrayBuffer,
    `Financials_Export_${slugify(companyName) || "company"}`
  );
}
