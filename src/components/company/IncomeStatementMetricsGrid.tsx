"use client";

import React, { useMemo } from "react";
import {
  T,
  finMetricLabelStyle,
  tableColHeaderBarStyle,
} from "@/components/redesign/primitives";
import { buildFinancialsTableGridTemplate } from "@/lib/companyFinancialMetricsCard";
import { sourceTypeColor } from "@/lib/financialIntelligence/sourceTypes";
import type {
  IncomeStatementCellValue,
  IncomeStatementFinancialsViewModel,
} from "@/lib/incomeStatementFinancials";
import {
  resolveIncomeStatementCellDisplay,
  resolveIncomeStatementMetricYoY,
} from "@/lib/incomeStatementFinancials";
import type { FiMetricSourceType } from "@/lib/financialIntelligence/sourceTypes";
import type { CurrencyDisplayMode } from "@/lib/financialsCurrencyToggle";

const GRID_COLUMN_GAP = 16;
const ROW_PADDING = "12px 16px";
const LABEL_COL_MIN = 180;
const PERIOD_COL_MIN = 88;
const TRAILING_COL_MIN = 72;

function buildIncomeStatementMinWidth(
  periodCount: number,
  includeYoyColumn: boolean
): number {
  const colCount = 1 + periodCount + (includeYoyColumn ? 1 : 0) + 1;
  const colsMin =
    LABEL_COL_MIN +
    periodCount * PERIOD_COL_MIN +
    (includeYoyColumn ? TRAILING_COL_MIN : 0) +
    TRAILING_COL_MIN;
  return colsMin + GRID_COLUMN_GAP * (colCount - 1);
}

function columnKey(
  model: IncomeStatementFinancialsViewModel,
  index: number
): string {
  return model.columnKeys[index] ?? `col-${index}`;
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

function YoyValueCell({ value, visible }: { value: string; visible: boolean }) {
  const display = !visible || value === "-" ? "-" : value;
  const isEmpty = display === "-";
  const color = isEmpty
    ? T.faint
    : display.startsWith("+")
      ? T.up
      : display.startsWith("-")
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
      {display}
    </span>
  );
}

function ValueCell({
  cell,
  visible,
  currencyMode,
  sourceType,
}: {
  cell: IncomeStatementCellValue;
  visible: boolean;
  currencyMode: CurrencyDisplayMode;
  sourceType: FiMetricSourceType;
}) {
  const resolved = resolveIncomeStatementCellDisplay(cell, currencyMode);
  const display = !visible && resolved !== "-" ? "-" : resolved;
  const isEmpty = display === "-";

  return (
    <span
      style={{
        fontFamily: T.sans,
        fontSize: 13,
        fontWeight: isEmpty ? 600 : 700,
        color: isEmpty ? T.faint : sourceTypeColor(sourceType),
        fontVariantNumeric: "tabular-nums",
        textAlign: "center",
      }}
    >
      {display}
    </span>
  );
}

export function IncomeStatementMetricsGrid({
  model,
  showYoyColumn = false,
  reserveYoyColumn = false,
  allowedSources,
  currencyMode = "preferred",
  gridTemplate: gridTemplateOverride,
}: {
  model: IncomeStatementFinancialsViewModel;
  showYoyColumn?: boolean;
  reserveYoyColumn?: boolean;
  allowedSources: FiMetricSourceType[];
  currencyMode?: CurrencyDisplayMode;
  gridTemplate?: string;
}) {
  const sourceVisible = allowedSources.includes(model.sourceType);
  const includeYoySpacer = reserveYoyColumn && !showYoyColumn;
  const includeYoyColumn = showYoyColumn || includeYoySpacer;
  const periodCount = model.columnLabels.length;

  const gridTemplate = useMemo(
    () =>
      gridTemplateOverride ??
      buildFinancialsTableGridTemplate(periodCount, includeYoyColumn, {
        includeSourceColumn: true,
      }),
    [gridTemplateOverride, periodCount, includeYoyColumn]
  );

  const minGridWidth = useMemo(
    () => buildIncomeStatementMinWidth(periodCount, includeYoyColumn),
    [periodCount, includeYoyColumn]
  );

  const rowGridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: gridTemplate,
    alignItems: "center",
    padding: ROW_PADDING,
    minWidth: minGridWidth,
    width: "100%",
  };

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <div
        className="income-statement-table"
        style={{ width: "100%", minWidth: minGridWidth }}
      >
        <div
          style={{
            ...tableColHeaderBarStyle,
            gridTemplateColumns: gridTemplate,
            minWidth: minGridWidth,
          }}
        >
          <span>Metric</span>
          {model.columnLabels.map((label, index) => (
            <span key={columnKey(model, index)} style={{ textAlign: "center" }}>
              {label}
            </span>
          ))}
          {includeYoyColumn ? (
            <span style={{ textAlign: "center" }}>YoY</span>
          ) : null}
          <span style={{ textAlign: "center" }}>Source</span>
        </div>

        {model.metrics.map((metric, index) => (
          <div
            key={metric.key}
            className="income-statement-row"
            style={{
              ...rowGridStyle,
              borderBottom:
                index === model.metrics.length - 1
                  ? "none"
                  : `1px solid ${T.hair}`,
            }}
          >
            <span
              style={{
                ...finMetricLabelStyle,
                fontSize: 13,
                fontWeight: 600,
                color: T.ink2,
                minWidth: 0,
                whiteSpace: "nowrap",
              }}
            >
              {metric.label}
            </span>
            {model.columnLabels.map((_, valueIndex) => (
              <div
                key={`${metric.key}-${columnKey(model, valueIndex)}`}
                style={{ display: "flex", justifyContent: "center" }}
              >
                <ValueCell
                  cell={
                    metric.cells[valueIndex] ?? {
                      display: metric.values[valueIndex] ?? "-",
                    }
                  }
                  visible={sourceVisible}
                  currencyMode={currencyMode}
                  sourceType={model.sourceType}
                />
              </div>
            ))}
            {includeYoyColumn ? (
              <div style={{ display: "flex", justifyContent: "center" }}>
                {showYoyColumn ? (
                  <YoyValueCell
                    value={resolveIncomeStatementMetricYoY(
                      metric,
                      currencyMode
                    )}
                    visible={sourceVisible}
                  />
                ) : (
                  <span aria-hidden="true" />
                )}
              </div>
            ) : null}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <SourceCell
                sourceType={sourceVisible ? model.sourceType : null}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
