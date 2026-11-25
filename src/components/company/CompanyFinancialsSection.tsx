"use client";

import { DataSourceTag } from "@/components/tags/DataSourceTag";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import {
  CARD_HEADER_BAR_STYLE,
  CARD_TITLE_STYLE,
  LinkPanel,
  T,
  finMetricLabelStyle,
  tableColHeaderBarStyle,
  tableColHeaderStyle,
} from "@/components/redesign/primitives";
import {
  DEFAULT_FI_SOURCE_TYPES,
  FI_SOURCE_TYPES,
  FI_SOURCE_TYPES_UI_ORDER,
  SOURCE_TYPE_DESCRIPTIONS,
  sourceTypeColor,
  type FiMetricSourceType,
} from "@/lib/financialIntelligence/sourceTypes";
import {
  buildCompanyFinancialsViewModel,
  buildFinancialsTableGridTemplate,
  formatFiscalYearHeader,
  getVisibleFinancialsCellDisplay,
  getVisibleFinancialsSourceDisplay,
  getVisibleYoyValue,
  resolveFinancialsTableColumnYears,
  type CompanyFinancialMetricsCardRow,
  type CompanyFinancialsViewModel,
  type FinancialsCellValue,
  type FinancialsYoyValue,
} from "@/lib/companyFinancialMetricsCard";
import { exportFinancialMetricsView } from "@/lib/companyFinancialsExport";
import {
  buildIncomeStatementFinancialsViewModel,
  remapIncomeStatementToTableYears,
  resolveIncomeStatementCellDisplay,
} from "@/lib/incomeStatementFinancials";
import type { NormalizedIncomeStatementRow } from "@/lib/incomeStatement";
import { IncomeStatementFinancialsCard } from "@/components/company/IncomeStatementFinancialsCard";
import { FinancialsCurrencyToggle } from "@/components/company/FinancialsCurrencyToggle";
import { usePlatformCurrency } from "@/components/providers/PlatformCurrencyProvider";
import {
  resolveFxToggleConfig,
  type CurrencyDisplayMode,
} from "@/lib/financialsCurrencyToggle";

type Props = {
  rows: CompanyFinancialMetricsCardRow[];
  loading: boolean;
  companyName: string;
  incomeStatementRows?: NormalizedIncomeStatementRow[];
  /** Full fiscal-year history for the Financials tab income statement table. */
  incomeStatementHistoryRows?: NormalizedIncomeStatementRow[];
  hideEmptyCards?: boolean;
};

function ExportButton({
  label,
  onClick,
  compact = false,
}: {
  label: string;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: compact ? "6px 10px" : "8px 12px",
        borderRadius: T.r,
        border: `1px solid ${T.hair}`,
        background: T.panel,
        color: T.body,
        fontFamily: T.sans,
        fontSize: 12.5,
        fontWeight: 500,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      <ArrowUpTrayIcon width={14} height={14} aria-hidden />
      {label}
    </button>
  );
}

function SourceLegend({
  allowedSources,
  onToggleSourceType,
  disabled,
}: {
  allowedSources: FiMetricSourceType[];
  onToggleSourceType: (type: FiMetricSourceType) => void;
  disabled?: boolean;
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          ...tableColHeaderStyle,
          marginBottom: 10,
        }}
      >
        Data Source
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {FI_SOURCE_TYPES_UI_ORDER.map((type) => {
          const checked = allowedSources.includes(type);
          const isDisabled = disabled;
          return (
            <label
              key={type}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "10px 14px",
                borderRadius: T.rLg,
                border: `1px solid ${T.hair}`,
                background: T.panel,
                minWidth: 180,
                cursor: isDisabled ? "not-allowed" : "pointer",
                opacity: isDisabled && !checked ? 0.55 : 1,
              }}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={isDisabled}
                onChange={() => onToggleSourceType(type)}
                style={{
                  marginTop: 3,
                  accentColor: sourceTypeColor(type),
                  flexShrink: 0,
                }}
              />
              <span style={{ minWidth: 0 }}>
                <span
                  style={{
                    fontFamily: T.sans,
                    fontSize: 13,
                    fontWeight: 700,
                    color: T.ink,
                  }}
                >
                  {type}
                </span>
                <span
                  style={{
                    display: "block",
                    marginTop: 2,
                    fontFamily: T.sans,
                    fontSize: 11.5,
                    color: T.muted,
                    lineHeight: 1.35,
                  }}
                >
                  {SOURCE_TYPE_DESCRIPTIONS[type]}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function MetricValueCell({
  cell,
  allowedSources,
  currencyMode,
}: {
  cell: FinancialsCellValue;
  allowedSources: FiMetricSourceType[];
  currencyMode: CurrencyDisplayMode;
}) {
  const display = getVisibleFinancialsCellDisplay(
    cell,
    allowedSources,
    currencyMode
  );

  const isEmpty = display === "-";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontFamily: T.sans,
          fontSize: 13,
          fontWeight: isEmpty ? 600 : 700,
          color: isEmpty ? T.faint : sourceTypeColor(cell.sourceType),
          fontVariantNumeric: "tabular-nums",
          minWidth: 0,
          textAlign: "center",
        }}
      >
        {display}
      </span>
      {isEmpty ? null : <DataSourceTag label={cell.sourceLabel} />}
    </div>
  );
}

function YoyCell({ value }: { value: FinancialsYoyValue | null }) {
  if (!value) {
    return (
      <span style={{ fontFamily: T.sans, fontSize: 13, color: T.muted }}>-</span>
    );
  }

  const color =
    value.sentiment === "positive"
      ? T.up
      : value.sentiment === "negative"
        ? T.down
        : T.muted;

  return (
    <span
      style={{
        fontFamily: T.sans,
        fontSize: 13,
        fontWeight: 600,
        color,
        textAlign: "center",
      }}
    >
      {value.display}
    </span>
  );
}

function SourceCell({ sourceType }: { sourceType: FiMetricSourceType | null }) {
  if (!sourceType) {
    return (
      <span style={{ fontFamily: T.sans, fontSize: 13, color: T.muted }}>-</span>
    );
  }

  return (
    <span
      style={{
        fontFamily: T.sans,
        fontSize: 11.5,
        fontWeight: 600,
        color: T.muted,
        textAlign: "center",
        whiteSpace: "nowrap",
      }}
    >
      {sourceType}
    </span>
  );
}

function FinancialsMetricsCard({
  card,
  years,
  allowedSources,
  showYoy,
  gridTemplate,
  currencyMode,
}: {
  card: CompanyFinancialsViewModel["cards"][number];
  years: number[];
  allowedSources: FiMetricSourceType[];
  showYoy: boolean;
  gridTemplate: string;
  currencyMode: CurrencyDisplayMode;
}) {
  return (
    <LinkPanel style={{ marginBottom: 16 }}>
      <div style={CARD_HEADER_BAR_STYLE}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            minWidth: 0,
          }}
        >
          <span style={CARD_TITLE_STYLE}>{card.title}</span>
        </div>
      </div>

      <div
        style={{
          ...tableColHeaderBarStyle,
          gridTemplateColumns: gridTemplate,
        }}
      >
        <span>Metric</span>
        {years.map((year) => (
          <span key={year} style={{ textAlign: "center" }}>
            {formatFiscalYearHeader(year)}
          </span>
        ))}
        {showYoy ? <span style={{ textAlign: "center" }}>YoY</span> : null}
        <span style={{ textAlign: "center" }}>Source</span>
      </div>
      {card.metrics.map((metric, index) => (
        <div
          key={metric.key}
          style={{
            display: "grid",
            gridTemplateColumns: gridTemplate,
            alignItems: "center",
            padding: "12px 16px",
            borderBottom:
              index === card.metrics.length - 1
                ? "none"
                : `1px solid ${T.hair}`,
            minWidth: 0,
          }}
        >
          <span
            style={{
              ...finMetricLabelStyle,
              fontSize: 13,
              fontWeight: 600,
              color: T.ink2,
              minWidth: 0,
            }}
          >
            {metric.label}
          </span>
          {years.map((year) => (
            <div
              key={`${metric.key}-${year}`}
              style={{ display: "flex", justifyContent: "center" }}
            >
              <MetricValueCell
                cell={metric.cellsByYear[year] ?? { display: "-", raw: null, sourceType: null }}
                allowedSources={allowedSources}
                currencyMode={currencyMode}
              />
            </div>
          ))}
          {showYoy ? (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <YoyCell
                value={getVisibleYoyValue(
                  metric,
                  years,
                  allowedSources,
                  currencyMode
                )}
              />
            </div>
          ) : null}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <SourceCell sourceType={getVisibleFinancialsSourceDisplay(metric, years)} />
          </div>
        </div>
      ))}
    </LinkPanel>
  );
}

const ALLOWED_SOURCES_STORAGE_KEY = "asx.financials.allowedSources";

export function CompanyFinancialsSection({
  rows,
  loading,
  companyName,
  incomeStatementRows = [],
  incomeStatementHistoryRows = [],
  hideEmptyCards = false,
}: Props) {
  const { currency: platformCurrency } = usePlatformCurrency();
  const [allowedSources, setAllowedSources] = useState<FiMetricSourceType[]>([
    ...DEFAULT_FI_SOURCE_TYPES,
  ]);
  const [currencyMode, setCurrencyMode] =
    useState<CurrencyDisplayMode>("preferred");

  // Remember the Data source selection across companies (read after mount to avoid a hydration mismatch).
  const [sourcesLoaded, setSourcesLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(ALLOWED_SOURCES_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as unknown;
        if (Array.isArray(saved)) {
          setAllowedSources(
            FI_SOURCE_TYPES.filter((type) => saved.includes(type))
          );
        }
      }
    } catch {
      /* storage unavailable: keep the default */
    }
    setSourcesLoaded(true);
  }, []);
  useEffect(() => {
    if (!sourcesLoaded) return;
    try {
      window.localStorage.setItem(
        ALLOWED_SOURCES_STORAGE_KEY,
        JSON.stringify(allowedSources)
      );
    } catch {
      /* ignore */
    }
  }, [allowedSources, sourcesLoaded]);

  const incomeStatementSourceRows =
    incomeStatementHistoryRows.length > 0
      ? incomeStatementHistoryRows
      : incomeStatementRows;

  const fxToggleConfig = useMemo(
    () =>
      resolveFxToggleConfig(
        rows,
        incomeStatementSourceRows,
        platformCurrency
      ),
    [rows, incomeStatementSourceRows, platformCurrency]
  );

  useEffect(() => {
    setCurrencyMode("preferred");
  }, [platformCurrency, rows, incomeStatementSourceRows]);

  const fullModel = useMemo(
    () => buildCompanyFinancialsViewModel(rows, platformCurrency),
    [rows, platformCurrency]
  );

  // Metric tables show only when a metric has a value in some year
  const model = useMemo(() => {
    if (!hideEmptyCards) return fullModel;
    const cards = fullModel.cards.filter((card) =>
      card.metrics.some((metric) =>
        Object.values(metric.cellsByYear).some((cell) => cell.display !== "-")
      )
    );
    return { years: cards.length > 0 ? fullModel.years : [], cards };
  }, [fullModel, hideEmptyCards]);

  const incomeStatementModel = useMemo(
    () =>
      buildIncomeStatementFinancialsViewModel(
        incomeStatementSourceRows,
        platformCurrency
      ),
    [incomeStatementSourceRows, platformCurrency]
  );

  const metricsYears = model.years;

  const tableYears = useMemo(
    () =>
      resolveFinancialsTableColumnYears(
        incomeStatementModel?.years ?? [],
        metricsYears
      ),
    [incomeStatementModel?.years, metricsYears]
  );

  const metricsShowYoy = metricsYears.length >= 2;
  const hasMetrics = metricsYears.length > 0;
  const showTableYoyColumn =
    hasMetrics && tableYears.length >= 2 && metricsShowYoy;

  const gridTemplate = buildFinancialsTableGridTemplate(
    tableYears.length,
    showTableYoyColumn,
    { includeSourceColumn: true }
  );

  const incomeStatementUsesHistory =
    incomeStatementHistoryRows.length > 0;
  const incomeStatementShowYoy =
    incomeStatementUsesHistory &&
    (incomeStatementModel?.columnLabels.length ?? 0) >= 2;

  const alignedIncomeStatementModel = useMemo(() => {
    if (!incomeStatementModel) return null;
    if (incomeStatementHistoryRows.length > 0) {
      return incomeStatementModel;
    }
    if (tableYears.length === 0) return null;
    return remapIncomeStatementToTableYears(incomeStatementModel, tableYears);
  }, [incomeStatementModel, incomeStatementHistoryRows.length, tableYears]);

  const toggleSourceType = useCallback((type: FiMetricSourceType) => {
    setAllowedSources((prev) => {
      const nextSet = new Set(prev);
      if (nextSet.has(type)) {
        nextSet.delete(type);
      } else {
        nextSet.add(type);
      }
      return FI_SOURCE_TYPES.filter((item) => nextSet.has(item));
    });
  }, []);

  const handleExport = useCallback(async () => {
    await exportFinancialMetricsView({
      model,
      allowedSources,
      companyName,
      tableYears,
      incomeStatementModel: alignedIncomeStatementModel,
    });
  }, [
    model,
    allowedSources,
    companyName,
    tableYears,
    alignedIncomeStatementModel,
  ]);

  const hasIncomeStatement = alignedIncomeStatementModel != null;

  // With a source unticked: hide rows with no visible figure, then cards with no rows.
  const filterActive = allowedSources.length < FI_SOURCE_TYPES.length;

  const visibleCards = useMemo(() => {
    if (!filterActive) return model.cards;
    return model.cards
      .map((card) => ({
        ...card,
        metrics: card.metrics.filter((metric) =>
          tableYears.some((year) => {
            const cell = metric.cellsByYear[year];
            return (
              cell != null &&
              getVisibleFinancialsCellDisplay(cell, allowedSources, currencyMode) !==
                "-"
            );
          })
        ),
      }))
      .filter((card) => card.metrics.length > 0);
  }, [model.cards, filterActive, tableYears, allowedSources, currencyMode]);

  const visibleIncomeStatementModel = useMemo(() => {
    if (!alignedIncomeStatementModel) return null;
    if (!filterActive) return alignedIncomeStatementModel;
    if (!allowedSources.includes(alignedIncomeStatementModel.sourceType)) {
      return null;
    }
    const metrics = alignedIncomeStatementModel.metrics.filter((metric) =>
      metric.cells.some(
        (cell) => resolveIncomeStatementCellDisplay(cell, currencyMode) !== "-"
      )
    );
    return metrics.length > 0
      ? { ...alignedIncomeStatementModel, metrics }
      : null;
  }, [alignedIncomeStatementModel, filterActive, allowedSources, currencyMode]);

  const nothingVisible =
    visibleCards.length === 0 && visibleIncomeStatementModel == null;

  if (loading && !hasMetrics && !hasIncomeStatement) {
    return (
      <div
        style={{
          padding: "48px 0",
          textAlign: "center",
          color: T.muted,
          fontFamily: T.sans,
          fontSize: 14,
        }}
      >
        Loading financial metrics…
      </div>
    );
  }

  if (!hasMetrics && !hasIncomeStatement) {
    return (
      <div
        style={{
          padding: "48px 0",
          textAlign: "center",
          color: T.muted,
          fontFamily: T.sans,
          fontSize: 14,
        }}
      >
        No financial metrics available for this company.
      </div>
    );
  }

  return (
    <div style={{ width: "100%", minWidth: 0 }}>
      {hasMetrics || hasIncomeStatement ? (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1 1 420px", minWidth: 0 }}>
            <SourceLegend
              allowedSources={allowedSources}
              onToggleSourceType={toggleSourceType}
            />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 10,
              flexShrink: 0,
              paddingTop: 24,
            }}
          >
            {fxToggleConfig ? (
              <FinancialsCurrencyToggle
                config={fxToggleConfig}
                mode={currencyMode}
                onChange={setCurrencyMode}
              />
            ) : null}
            <ExportButton label="Export" onClick={() => void handleExport()} />
          </div>
        </div>
      ) : null}

      {nothingVisible ? (
        <div
          style={{
            padding: "32px 0",
            textAlign: "center",
            color: T.muted,
            fontFamily: T.sans,
            fontSize: 14,
          }}
        >
          No figures match the selected data sources.
        </div>
      ) : null}

      {visibleIncomeStatementModel && alignedIncomeStatementModel ? (
        <IncomeStatementFinancialsCard
          model={visibleIncomeStatementModel}
          showYoyColumn={incomeStatementShowYoy}
          reserveYoyColumn={
            !incomeStatementUsesHistory && showTableYoyColumn
          }
          allowedSources={allowedSources}
          currencyMode={currencyMode}
          gridTemplate={buildFinancialsTableGridTemplate(
            alignedIncomeStatementModel.columnLabels.length,
            incomeStatementShowYoy ||
              (!incomeStatementUsesHistory && showTableYoyColumn),
            { includeSourceColumn: true }
          )}
        />
      ) : null}

      {!hasMetrics
        ? null
        : visibleCards.map((card) => (
            <FinancialsMetricsCard
              key={card.id}
              card={card}
              years={tableYears}
              allowedSources={allowedSources}
              showYoy={showTableYoyColumn}
              gridTemplate={gridTemplate}
              currencyMode={currencyMode}
            />
          ))}
    </div>
  );
}
