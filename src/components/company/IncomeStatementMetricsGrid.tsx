"use client";

import React from "react";
import {
  T,
  tableColHeaderBarStyle,
} from "@/components/redesign/primitives";
import { formatFiscalYearHeader } from "@/lib/companyFinancialMetricsCard";
import type { IncomeStatementFinancialsViewModel } from "@/lib/incomeStatementFinancials";

function ValueCell({
  value,
  metricKey,
}: {
  value: string;
  metricKey: string;
}) {
  if (metricKey === "revenue_yoy" && value !== "-") {
    const color =
      value.startsWith("+")
        ? T.up
        : value.startsWith("-")
          ? T.down
          : T.body;
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
        {value}
      </span>
    );
  }

  return (
    <span
      style={{
        fontFamily: T.sans,
        fontSize: 13,
        fontWeight: value === "-" ? 400 : 600,
        color: value === "-" ? T.muted : T.body,
        textAlign: "center",
      }}
    >
      {value}
    </span>
  );
}

export function IncomeStatementMetricsGrid({
  model,
  gridTemplate,
  showYoyColumn = false,
}: {
  model: IncomeStatementFinancialsViewModel;
  gridTemplate: string;
  showYoyColumn?: boolean;
}) {
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
              <ValueCell value={value} metricKey={metric.key} />
            </div>
          ))}
          {showYoyColumn ? (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <ValueCell value="-" metricKey={metric.key} />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
