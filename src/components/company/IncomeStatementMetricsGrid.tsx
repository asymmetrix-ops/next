"use client";

import React from "react";
import {
  T,
  tableColHeaderBarStyle,
} from "@/components/redesign/primitives";
import { formatFiscalYearHeader } from "@/lib/companyFinancialMetricsCard";
import type { IncomeStatementFinancialsViewModel } from "@/lib/incomeStatementFinancials";
import type { FiMetricSourceType } from "@/lib/financialIntelligence/sourceTypes";

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
  gridTemplate,
  showYoyColumn = false,
  reserveYoyColumn = false,
  scrollable = false,
  allowedSources,
}: {
  model: IncomeStatementFinancialsViewModel;
  gridTemplate: string;
  showYoyColumn?: boolean;
  reserveYoyColumn?: boolean;
  scrollable?: boolean;
  allowedSources: FiMetricSourceType[];
}) {
  const sourceVisible = allowedSources.includes(model.sourceType);
  const includeYoySpacer = reserveYoyColumn && !showYoyColumn;
  const cellAlign = { textAlign: "center" as const, whiteSpace: "nowrap" as const };

  return (
    <div
      className="income-statement-table"
      style={{
        width: scrollable ? "max-content" : "100%",
        minWidth: scrollable ? "100%" : 0,
      }}
    >
      <div
        style={{
          ...tableColHeaderBarStyle,
          gridTemplateColumns: gridTemplate,
        }}
      >
        <span style={{ whiteSpace: "nowrap" }}>Metric</span>
        {model.years.map((year, index) => (
          <span key={`${year}-${index}`} style={cellAlign}>
            {year != null ? formatFiscalYearHeader(year) : model.columnLabels[index]}
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
          {metric.values.map((value, valueIndex) => (
            <div
              key={`${metric.key}-${valueIndex}`}
              style={{ display: "flex", justifyContent: "center" }}
            >
              <ValueCell value={value} visible={sourceVisible} />
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
