import {
  buildCsvContent,
  downloadCsvContent,
} from "@/lib/listExport/csv";
import type { FiMetricSourceType } from "@/lib/financialIntelligence/sourceTypes";
import {
  FINANCIALS_CARD_DEFS,
  formatFiscalYearHeader,
  getVisibleFinancialsCellDisplay,
  getVisibleYoyValue,
  getYoyComparisonYears,
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
  allowedSources: FiMetricSourceType[],
  companyName: string
): string {
  const yoyYears = getYoyComparisonYears(model.years);
  const headers = [
    "Company",
    "Card",
    "Metric",
    ...model.years.map((year) => formatFiscalYearHeader(year)),
    ...(yoyYears ? ["YoY"] : []),
    "Data Source",
  ];

  const rows: string[][] = [];

  for (const card of model.cards.filter((item) => cardIds.includes(item.id))) {
    for (const metric of card.metrics) {
      const yearValues = model.years.map((year) => {
        const cell = metric.cellsByYear[year];
        if (!cell) return "-";
        return getVisibleFinancialsCellDisplay(cell, allowedSources);
      });

      const yoyValue = getVisibleYoyValue(metric, model.years, allowedSources);

      const sourceTypes = model.years
        .map((year) => metric.cellsByYear[year]?.sourceType ?? "")
        .filter(Boolean)
        .join(" / ");

      rows.push([
        companyName,
        card.title,
        metric.label,
        ...yearValues,
        ...(yoyYears ? [yoyValue?.display ?? "-"] : []),
        sourceTypes,
      ]);
    }
  }

  return buildCsvContent(headers, rows);
}

/** Exports the current filtered view (respects active data source toggles). */
export function exportFinancialMetricsView(
  model: CompanyFinancialsViewModel,
  allowedSources: FiMetricSourceType[],
  companyName: string,
  cardIds: FinancialsCardDef["id"][] = FINANCIALS_CARD_DEFS.map((card) => card.id)
): void {
  const scopeLabel =
    cardIds.length === 1
      ? slugify(
          FINANCIALS_CARD_DEFS.find((card) => card.id === cardIds[0])?.title ??
            cardIds[0]
        )
      : "all";

  const content = buildFinancialsCsv(
    model,
    cardIds,
    allowedSources,
    companyName
  );
  downloadCsvContent(
    content,
    `company-financials-${scopeLabel}-${slugify(companyName)}`
  );
}
