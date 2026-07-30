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
  allowedSources,
}: {
  model: IncomeStatementFinancialsViewModel;
  gridTemplate: string;
  showYoyColumn?: boolean;
  allowedSources: FiMetricSourceType[];
}) {
  const sourceVisible = allowedSources.includes(model.sourceType);
  return (
    <div className="income-statement-table" style={{ width: "100%", minWidth: 0 }}>
      <div
        style={{
          ...tableColHeaderBarStyle,
          gridTemplateColumns: gridTemplate,
        }}
      >
        <span>Metric</span>
        {model.years.map((year, index) => (
          <span key={`${year}-${index}`} style={{ textAlign: "center" }}>
            {year != null ? formatFiscalYearHeader(year) : model.columnLabels[index]}
          </span>
        ))}
        {showYoyColumn ? (
          <span style={{ textAlign: "center" }}>YoY</span>
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
          ) : null}
        </div>
      ))}
    </div>
  );
}
