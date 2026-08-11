"use client";

import React, { useMemo } from "react";
import {
  T,
  tableColHeaderBarStyle,
} from "@/components/redesign/primitives";
import type {
  IncomeStatementCellValue,
  IncomeStatementFinancialsViewModel,
} from "@/lib/incomeStatementFinancials";
import type { FiMetricSourceType } from "@/lib/financialIntelligence/sourceTypes";
import { DualCurrencyValue } from "@/components/company/DualCurrencyValue";

function buildIncomeStatementGridTemplate(
  periodCount: number,
  includeTrailingColumn: boolean
): string {
  const labelCol = "minmax(140px, 1.5fr)";
  const periodColumns = `repeat(${periodCount}, minmax(0, 1fr))`;
  const yoyCol = "minmax(56px, 0.8fr)";
  return includeTrailingColumn
    ? `${labelCol} ${periodColumns} ${yoyCol}`
    : `${labelCol} ${periodColumns}`;
}

const GRID_COLUMN_GAP = 16;
const GRID_ROW_PADDING = "12px 20px";

function columnKey(
  model: IncomeStatementFinancialsViewModel,
  index: number
): string {
  return model.columnKeys[index] ?? `col-${index}`;
}

function YoyValueCell({ value, visible }: { value: string; visible: boolean }) {
  const display = !visible || value === "-" ? "-" : value;
  const color =
    display.startsWith("+")
      ? T.up
      : display.startsWith("-") && display !== "-"
        ? T.down
        : display === "-"
          ? T.muted
          : T.body;

  return (
    <span
      style={{
        fontFamily: T.sans,
        fontSize: 13,
        fontWeight: display === "-" ? 400 : 600,
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
}: {
  cell: IncomeStatementCellValue;
  visible: boolean;
}) {
  const display = !visible && cell.display !== "-" ? "-" : cell.display;
  const muted = display === "-";

  return (
    <DualCurrencyValue
      display={display}
      nativeDisplay={muted || !visible ? null : cell.nativeDisplay}
      fxTooltip={muted || !visible ? null : cell.fxTooltip}
      muted={muted}
    />
  );
}

export function IncomeStatementMetricsGrid({
  model,
  showYoyColumn = false,
  reserveYoyColumn = false,
  allowedSources,
}: {
  model: IncomeStatementFinancialsViewModel;
  showYoyColumn?: boolean;
  reserveYoyColumn?: boolean;
  allowedSources: FiMetricSourceType[];
}) {
  const sourceVisible = allowedSources.includes(model.sourceType);
  const includeYoySpacer = reserveYoyColumn && !showYoyColumn;
  const periodCount = model.columnLabels.length;
  const includeTrailingColumn = showYoyColumn || includeYoySpacer;

  const gridTemplate = useMemo(
    () => buildIncomeStatementGridTemplate(periodCount, includeTrailingColumn),
    [periodCount, includeTrailingColumn]
  );

  const gridStyle = useMemo(
    () => ({
      display: "grid" as const,
      gridTemplateColumns: gridTemplate,
      columnGap: GRID_COLUMN_GAP,
      alignItems: "center" as const,
      width: "100%",
    }),
    [gridTemplate]
  );

  const cellAlign = { textAlign: "center" as const, whiteSpace: "nowrap" as const };

  return (
    <div className="income-statement-table" style={{ width: "100%", minWidth: 0 }}>
      <div
        style={{
          ...tableColHeaderBarStyle,
          ...gridStyle,
          padding: GRID_ROW_PADDING,
        }}
      >
        <span style={{ whiteSpace: "nowrap" }}>Metric</span>
        {model.columnLabels.map((label, index) => (
          <span key={columnKey(model, index)} style={cellAlign}>
            {label}
          </span>
        ))}
        {showYoyColumn ? (
          <span style={cellAlign}>YoY</span>
        ) : includeYoySpacer ? (
          <span aria-hidden="true" />
        ) : null}
      </div>

      {model.metrics.map((metric, index) => (
        <div
          key={metric.key}
          className="income-statement-row"
          style={{
            ...gridStyle,
            padding: GRID_ROW_PADDING,
            borderBottom:
              index === model.metrics.length - 1
                ? "none"
                : `1px solid ${T.hair}`,
          }}
        >
          <span
            style={{
              fontFamily: T.sans,
              fontSize: 13,
              color: T.body,
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
                cell={metric.cells[valueIndex] ?? { display: metric.values[valueIndex] ?? "-" }}
                visible={sourceVisible}
              />
            </div>
          ))}
          {showYoyColumn ? (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <YoyValueCell value={metric.yoy} visible={sourceVisible} />
            </div>
          ) : includeYoySpacer ? (
            <div aria-hidden="true" />
          ) : null}
        </div>
      ))}
    </div>
  );
}
