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
import { appendMetricCurrency } from "@/lib/buildFinancialMetricsSections";

export type IncomeStatementRow = {
  id: number;
  period_display_end_date?: string;
  period_end_date?: string;
  revenue?: number | null;
  ebit?: number | null;
  ebitda?: number | null;
  cost_of_goods_sold_currency?: string;
};

type Props = {
  rows: IncomeStatementRow[];
  /** ISO currency code, e.g. "USD". Applied to value cells. */
  currency?: string;
};

function sanitizeCurrencyCode(value?: string | null): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed || trimmed === "0" || /^\d+$/.test(trimmed)) return "";
  const compact = trimmed.replace(/\s/g, "").toUpperCase();
  if (compact === "US$" || compact === "US") return "USD";
  return compact;
}

function resolveIncomeStatementCurrency(
  rows: IncomeStatementRow[],
  fallback = ""
): string {
  for (const row of rows) {
    const code = sanitizeCurrencyCode(row.cost_of_goods_sold_currency);
    if (code) return code;
  }
  return sanitizeCurrencyCode(fallback);
}

function formatIncomeValue(
  value: number | null | undefined,
  currency?: string
): string {
  if (typeof value !== "number") return "-";
  return appendMetricCurrency(
    Math.round(value / 1_000_000).toLocaleString(),
    currency || undefined
  );
}

function formatPeriod(period?: string): string {
  return (period || "").replace(/[,\s]/g, "") || "-";
}

function parseIncomeStatementPeriod(row: IncomeStatementRow): number {
  if (row.period_end_date) {
    const parsed = Date.parse(row.period_end_date);
    if (!Number.isNaN(parsed)) return parsed;
  }
  const fromDisplay = Date.parse(
    (row.period_display_end_date || "").replace(/[^0-9-]/g, "")
  );
  return Number.isNaN(fromDisplay) ? 0 : fromDisplay;
}

/** Oldest → newest (left-to-right in the table). */
export function sortIncomeStatementRowsAsc(
  rows: IncomeStatementRow[]
): IncomeStatementRow[] {
  return [...rows].sort(
    (a, b) => parseIncomeStatementPeriod(a) - parseIncomeStatementPeriod(b)
  );
}

const INCOME_METRIC_DEFS: {
  label: string;
  getRaw: (row: IncomeStatementRow) => number | null | undefined;
}[] = [
  { label: "Revenue (m)", getRaw: (row) => row.revenue },
  { label: "EBIT (m)", getRaw: (row) => row.ebit },
  { label: "EBITDA (m)", getRaw: (row) => row.ebitda },
];

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
  verticalAlign: "middle",
};

const tdValueStyle: React.CSSProperties = {
  ...finMetricValueStyle,
  padding: "4px 8px",
  textAlign: "center",
  verticalAlign: "middle",
};

export function IncomeStatementTable({
  rows,
  currency = "",
}: {
  rows: IncomeStatementRow[];
  currency?: string;
}) {
  if (rows.length === 0) return null;

  const orderedRows = sortIncomeStatementRowsAsc(rows);
  const resolvedCurrency = resolveIncomeStatementCurrency(
    orderedRows,
    currency.trim()
  );

  return (
    <div
      className="income-statement-table"
      style={{ padding: "2px 12px 4px", width: "100%", minWidth: 0 }}
    >
      <table
        className="income-statement-grid"
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
        }}
      >
        <colgroup>
          <col style={{ width: "38%" }} />
          {orderedRows.map((row) => (
            <col key={row.id} style={{ width: `${62 / orderedRows.length}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr
            className="income-statement-period"
            style={{
              background: T.paper,
              borderBottom: `1px solid ${T.hair}`,
            }}
          >
            <th style={{ ...thStyle, textAlign: "left", paddingLeft: 0 }} />
            {orderedRows.map((row) => (
              <th key={row.id} style={thStyle}>
                {formatPeriod(row.period_display_end_date)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {INCOME_METRIC_DEFS.map((metric, metricIndex) => (
            <tr
              key={metric.label}
              className="income-statement-row"
              style={{
                borderBottom:
                  metricIndex === INCOME_METRIC_DEFS.length - 1
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
                  {formatIncomeValue(
                    metric.getRaw(row),
                    sanitizeCurrencyCode(row.cost_of_goods_sold_currency) ||
                      resolvedCurrency
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function IncomeStatementSection({ rows, currency = "" }: Props) {
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
