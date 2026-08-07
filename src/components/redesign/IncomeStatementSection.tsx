"use client";

import React from "react";
import {
  LinkedH,
  T,
  FIN_METRIC_VALUE_CLASS,
  finMetricLabelStyle,
  finMetricValueStyle,
  finMetricsPeriodHeaderStyle,
} from "./primitives";
import type { NormalizedIncomeStatementRow } from "@/lib/incomeStatement";
import {
  resolveIncomeStatementCurrency,
  sortIncomeStatementRowsAsc,
} from "@/lib/incomeStatement";
import { appendMetricCurrency } from "@/lib/buildFinancialMetricsSections";
import { formatMetricMillionsPlain } from "@/lib/formatMetricMillions";

export type IncomeStatementRow = NormalizedIncomeStatementRow;

type Props = {
  rows: IncomeStatementRow[];
  /** ISO currency code, e.g. "USD". Applied to value cells. */
  currency?: string;
};

function formatIncomeValue(
  value: number | null | undefined,
  currency?: string
): string {
  if (typeof value !== "number") return "-";
  return appendMetricCurrency(
    formatMetricMillionsPlain(value / 1_000_000),
    currency
  );
}

function incomeMetrics(resolvedCurrency: string) {
  return [
    {
      label: "Revenue (m)",
      getValue: (row: IncomeStatementRow) =>
        formatIncomeValue(row.revenue, resolvedCurrency),
    },
    {
      label: "EBIT (m)",
      getValue: (row: IncomeStatementRow) =>
        formatIncomeValue(row.ebit, resolvedCurrency),
    },
    {
      label: "EBITDA (m)",
      getValue: (row: IncomeStatementRow) =>
        formatIncomeValue(row.ebitda, resolvedCurrency),
    },
  ];
}

function formatPeriod(row: IncomeStatementRow): string {
  const display = (row.period_display_end_date || "").replace(/[,\s]/g, "");
  if (display) return display;
  if (row.period_year != null) return `FY${row.period_year}`;
  return "-";
}

const thStyle: React.CSSProperties = {
  ...finMetricsPeriodHeaderStyle,
  padding: "4px 8px 3px",
  textAlign: "center",
  fontWeight: 500,
  verticalAlign: "bottom",
};

const tdLabelStyle: React.CSSProperties = {
  ...finMetricLabelStyle,
  padding: "4px 8px 4px 0",
  textAlign: "left",
  whiteSpace: "normal",
  lineHeight: 1.35,
};

const tdValueStyle: React.CSSProperties = {
  ...finMetricValueStyle,
  padding: "4px 8px",
  textAlign: "center",
};

/** Compact master-style income statement for the profile financial card. */
export function IncomeStatementTable({ rows, currency = "" }: Props) {
  const orderedRows = sortIncomeStatementRowsAsc(rows);
  const resolvedCurrency = resolveIncomeStatementCurrency(
    orderedRows,
    currency.trim()
  );
  const metrics = incomeMetrics(resolvedCurrency);
  if (orderedRows.length === 0) return null;

  return (
    <div
      className="income-statement-table"
      style={{
        padding: "0 16px 8px",
        overflowX: "auto",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
        }}
      >
        <thead>
          <tr
            style={{
              background: T.paper,
              borderBottom: `1px solid ${T.hair}`,
            }}
          >
            <th style={{ ...thStyle, textAlign: "left", paddingLeft: 0 }} />
            {orderedRows.map((row) => (
              <th key={row.id} style={thStyle}>
                {formatPeriod(row)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map((metric, metricIndex) => (
            <tr
              key={metric.label}
              className="income-statement-row"
              style={{
                borderBottom:
                  metricIndex === metrics.length - 1
                    ? "none"
                    : `1px solid ${T.hair}`,
              }}
            >
              <td style={tdLabelStyle}>{metric.label}</td>
              {orderedRows.map((row) => (
                <td
                  key={`${row.id}-${metric.label}`}
                  className={FIN_METRIC_VALUE_CLASS}
                  style={tdValueStyle}
                >
                  {metric.getValue(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function IncomeStatementSection({
  rows,
  currency = "",
}: Props) {
  const titleCurrency = currency.trim();
  return (
    <div
      style={{
        marginTop: 16,
        marginLeft: -16,
        marginRight: -16,
        borderTop: `1px solid ${T.hair}`,
      }}
    >
      <LinkedH showArrow={false}>
        Income statement{titleCurrency ? ` (${titleCurrency})` : ""}
      </LinkedH>
      <IncomeStatementTable rows={rows} currency={currency} />
    </div>
  );
}
