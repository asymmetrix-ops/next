"use client";

import React, { useCallback, useMemo, useState } from "react";
import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import {
  CARD_HEADER_BAR_STYLE,
  CARD_TITLE_STYLE,
  LinkPanel,
  T,
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
} from "@/lib/incomeStatementFinancials";
import type { EmployeeTimeSeriesPoint } from "@/lib/companyLinkedIn";
import type { IncomeStatementRow } from "@/components/redesign/IncomeStatementSection";
import { IncomeStatementFinancialsCard } from "@/components/company/IncomeStatementFinancialsCard";

type Props = {
  rows: CompanyFinancialMetricsCardRow[];
  loading: boolean;
  companyName: string;
  incomeStatementRows?: IncomeStatementRow[];
  /** Full fiscal-year history for the Financials tab income statement table. */
  incomeStatementHistoryRows?: IncomeStatementRow[];
  incomeStatementCurrency?: string;
  employeeHistory?: EmployeeTimeSeriesPoint[];
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
          const isDisabled =
            disabled || (checked && allowedSources.length <= 1);
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
                    fontWeight: 600,
                    color: sourceTypeColor(type),
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
}: {
  cell: FinancialsCellValue;
  allowedSources: FiMetricSourceType[];
}) {
  const display = getVisibleFinancialsCellDisplay(cell, allowedSources);
  const color = cell.sourceType ? sourceTypeColor(cell.sourceType) : T.body;

  return (
    <span
      style={{
        fontFamily: T.sans,
        fontSize: 13,
        fontWeight: display === "-" ? 400 : 600,
        color: display === "-" ? T.muted : color,
        minWidth: 0,
        textAlign: "center",
      }}
    >
      {display}
    </span>
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

function FinancialsMetricsCard({
  card,
  years,
  allowedSources,
  showYoy,
  gridTemplate,
}: {
  card: CompanyFinancialsViewModel["cards"][number];
  years: number[];
  allowedSources: FiMetricSourceType[];
  showYoy: boolean;
  gridTemplate: string;
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
          <span
            style={{
              fontFamily: T.sans,
              fontSize: 12,
              color: T.muted,
              fontWeight: 500,
            }}
          >
            {card.metrics.length} metrics
          </span>
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
              fontFamily: T.sans,
              fontSize: 13,
              color: T.body,
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
              />
            </div>
          ))}
          {showYoy ? (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <YoyCell
                value={getVisibleYoyValue(metric, years, allowedSources)}
              />
            </div>
          ) : null}
        </div>
      ))}
    </LinkPanel>
  );
}

export function CompanyFinancialsSection({
  rows,
  loading,
  companyName,
  incomeStatementRows = [],
  incomeStatementHistoryRows = [],
  incomeStatementCurrency = "",
  employeeHistory = [],
}: Props) {
  const [allowedSources, setAllowedSources] = useState<FiMetricSourceType[]>([
    ...DEFAULT_FI_SOURCE_TYPES,
  ]);

  const model = useMemo(
    () => buildCompanyFinancialsViewModel(rows, employeeHistory),
    [rows, employeeHistory]
  );

  const incomeStatementSourceRows =
    incomeStatementHistoryRows.length > 0
      ? incomeStatementHistoryRows
      : incomeStatementRows;

  const incomeStatementModel = useMemo(
    () =>
      buildIncomeStatementFinancialsViewModel(
        incomeStatementSourceRows,
        employeeHistory,
        incomeStatementCurrency
      ),
    [
      incomeStatementSourceRows,
      employeeHistory,
      incomeStatementCurrency,
    ]
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
    showTableYoyColumn
  );

  const incomeStatementYearCount =
    incomeStatementModel?.years.filter((year) => year != null).length ?? 0;
  const incomeStatementUsesHistory =
    incomeStatementHistoryRows.length > 0;
  const incomeStatementShowYoy =
    incomeStatementUsesHistory && incomeStatementYearCount >= 2;
  const incomeStatementGridTemplate = buildFinancialsTableGridTemplate(
    incomeStatementYearCount,
    incomeStatementShowYoy,
    { fixedWidth: incomeStatementUsesHistory }
  );

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
        if (nextSet.size <= 1) return prev;
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
          <div style={{ flexShrink: 0, paddingTop: 24 }}>
            <ExportButton label="Export" onClick={() => void handleExport()} />
          </div>
        </div>
      ) : null}

      {hasIncomeStatement && alignedIncomeStatementModel ? (
        <IncomeStatementFinancialsCard
          model={alignedIncomeStatementModel}
          gridTemplate={
            incomeStatementUsesHistory
              ? incomeStatementGridTemplate
              : gridTemplate
          }
          showYoyColumn={incomeStatementShowYoy}
          reserveYoyColumn={
            !incomeStatementUsesHistory && showTableYoyColumn
          }
          scrollable={incomeStatementUsesHistory}
          allowedSources={allowedSources}
        />
      ) : null}

      {!hasMetrics
        ? null
        : model.cards.map((card) => (
            <FinancialsMetricsCard
              key={card.id}
              card={card}
              years={tableYears}
              allowedSources={allowedSources}
              showYoy={showTableYoyColumn}
              gridTemplate={gridTemplate}
            />
          ))}
    </div>
  );
}
