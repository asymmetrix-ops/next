"use client";

import React from "react";
import {
  LinkedH,
  T,
  finMetricRowStyle,
  finMetricLabelStyle,
  finMetricValueColStyle,
  finMetricsPeriodHeaderStyle,
  finMetricsBodyPadding,
  FIN_METRIC_TWO_COLS,
} from "./primitives";

export type IncomeStatementRow = {
  id: number;
  period_display_end_date?: string;
  revenue?: number | null;
  ebit?: number | null;
  ebitda?: number | null;
  cost_of_goods_sold_currency?: string;
};

type Props = {
  rows: IncomeStatementRow[];
  /** ISO currency code shown in the section title, e.g. "USD". Stripped from values. */
  currency?: string;
};

function formatIncomeValue(value: number | null | undefined): string {
  if (typeof value !== "number") return "—";
  return Math.round(value / 1_000_000).toLocaleString();
}

function IsPeriodHeader({ period }: { period: string }) {
  return (
    <div
      className="income-statement-period"
      style={{
        display: "grid",
        gridTemplateColumns: FIN_METRIC_TWO_COLS,
        gap: 8,
        alignItems: "center",
        padding: "4px 12px 3px",
        background: T.paper,
        borderBottom: `1px solid ${T.hair}`,
        ...finMetricsPeriodHeaderStyle,
      }}
    >
      <span />
      <span style={{ textAlign: "right", justifySelf: "stretch", width: "100%" }}>
        {period}
      </span>
    </div>
  );
}

function IsMetricRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last: boolean;
}) {
  return (
    <div
      className="info-row income-statement-row"
      style={{
        ...finMetricRowStyle,
        gridTemplateColumns: FIN_METRIC_TWO_COLS,
        borderBottom: last ? "none" : finMetricRowStyle.borderBottom,
      }}
    >
      <span
        style={{
          ...finMetricLabelStyle,
          whiteSpace: "normal",
          lineHeight: 1.35,
          paddingRight: 8,
        }}
      >
        {label}
      </span>
      <span style={finMetricValueColStyle}>{value}</span>
    </div>
  );
}

export function IncomeStatementTable({
  rows,
}: {
  rows: IncomeStatementRow[];
  currency?: string;
}) {
  if (rows.length === 0) return null;

  return (
    <div className="income-statement-table">
      {rows.map((row) => {
        const period =
          (row.period_display_end_date || "").replace(/[,\s]/g, "") || "—";
        const metrics = [
          { label: "Revenue (m)", value: formatIncomeValue(row.revenue) },
          { label: "EBIT (m)", value: formatIncomeValue(row.ebit) },
          { label: "EBITDA (m)", value: formatIncomeValue(row.ebitda) },
        ];
        return (
          <div key={row.id}>
            <IsPeriodHeader period={period} />
            <div style={{ padding: finMetricsBodyPadding }}>
              {metrics.map((m, i) => (
                <IsMetricRow
                  key={m.label}
                  label={m.label}
                  value={m.value}
                  last={i === metrics.length - 1}
                />
              ))}
            </div>
          </div>
        );
      })}
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
