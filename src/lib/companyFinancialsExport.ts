import {
  buildCsvContent,
  downloadCsvContent,
} from "@/lib/listExport/csv";
import type { FiMetricSourceType } from "@/lib/financialIntelligence/sourceTypes";
import {
  FINANCIALS_CARD_DEFS,
  formatFiscalYearHeader,
  getVisibleFinancialsCellDisplay,
  type CompanyFinancialsViewModel,
  type FinancialsCardDef,
} from "@/lib/companyFinancialMetricsCard";

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildFinancialsCsv(
  model: CompanyFinancialsViewModel,
  cardIds: FinancialsCardDef["id"][],
  allowedSources: FiMetricSourceType[] | null,
  companyName: string
): string {
  const headers = [
    "Company",
    "Card",
    "Metric",
    ...model.years.map((year) => formatFiscalYearHeader(year)),
    "Data Source",
  ];

  const rows: string[][] = [];

  for (const card of model.cards.filter((item) => cardIds.includes(item.id))) {
    for (const metric of card.metrics) {
      const yearValues = model.years.map((year) => {
        const cell = metric.cellsByYear[year];
        if (!cell) return "-";
        if (allowedSources) {
          return getVisibleFinancialsCellDisplay(cell, allowedSources);
        }
        return cell.display;
      });

      const sourceTypes = model.years
        .map((year) => metric.cellsByYear[year]?.sourceType ?? "")
        .filter(Boolean)
        .join(" / ");

      rows.push([
        companyName,
        card.title,
        metric.label,
        ...yearValues,
        sourceTypes,
      ]);
    }
  }

  return buildCsvContent(headers, rows);
}

function exportFinancialsCsv(
  model: CompanyFinancialsViewModel,
  cardIds: FinancialsCardDef["id"][],
  allowedSources: FiMetricSourceType[] | null,
  companyName: string,
  filename: string
): void {
  const content = buildFinancialsCsv(
    model,
    cardIds,
    allowedSources,
    companyName
  );
  downloadCsvContent(content, filename);
}

export function exportAllFinancialMetrics(
  model: CompanyFinancialsViewModel,
  companyName: string
): void {
  exportFinancialsCsv(
    model,
    FINANCIALS_CARD_DEFS.map((card) => card.id),
    null,
    companyName,
    `company-financials-all-${slugify(companyName)}`
  );
}

export function exportCurrentFinancialView(
  model: CompanyFinancialsViewModel,
  allowedSources: FiMetricSourceType[],
  companyName: string
): void {
  exportFinancialsCsv(
    model,
    FINANCIALS_CARD_DEFS.map((card) => card.id),
    allowedSources,
    companyName,
    `company-financials-filtered-${slugify(companyName)}`
  );
}

export function exportFinancialCard(
  model: CompanyFinancialsViewModel,
  cardId: FinancialsCardDef["id"],
  allowedSources: FiMetricSourceType[] | null,
  companyName: string
): void {
  const card = FINANCIALS_CARD_DEFS.find((item) => item.id === cardId);
  exportFinancialsCsv(
    model,
    [cardId],
    allowedSources,
    companyName,
    `company-financials-${slugify(card?.title ?? cardId)}-${slugify(companyName)}`
  );
}
