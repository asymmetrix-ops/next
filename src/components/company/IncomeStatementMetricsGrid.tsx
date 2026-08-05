"use client";

import React, { useMemo } from "react";
import {
  T,
  tableColHeaderBarStyle,
} from "@/components/redesign/primitives";
import { buildFinancialsTableGridTemplate } from "@/lib/companyFinancialMetricsCard";
import type { IncomeStatementFinancialsViewModel } from "@/lib/incomeStatementFinancials";
import type { FiMetricSourceType } from "@/lib/financialIntelligence/sourceTypes";


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
  value,
  visible,
}: {
  value: string;
  visible: boolean;
}) {
  const display = !visible && value !== "-" ? "-" : value;

  return (
    <span
      style={{
        fontFamily: T.sans,
        fontSize: 13,
        fontWeight: display === "-" ? 400 : 600,
        color: display === "-" ? T.muted : T.body,
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
  const useFixedWidth = periodCount > 3;

  const gridTemplate = useMemo(
    () =>
      buildFinancialsTableGridTemplate(periodCount, includeTrailingColumn, {
        fixedWidth: useFixedWidth,
      }),
    [periodCount, includeTrailingColumn, useFixedWidth]
  );

  const cellAlign = { textAlign: "center" as const, whiteSpace: "nowrap" as const };

  return (
    <div
      className="income-statement-table"
      style={{
        width: useFixedWidth ? "max-content" : "100%",
        minWidth: useFixedWidth ? "100%" : 0,
      }}
    >
      <div
        style={{
          ...tableColHeaderBarStyle,
          gridTemplateColumns: gridTemplate,
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
            display: "grid",
            gridTemplateColumns: gridTemplate,
            alignItems: "center",
            padding: "12px 16px",
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
                value={metric.values[valueIndex] ?? "-"}
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
