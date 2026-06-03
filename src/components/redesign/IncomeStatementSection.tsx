"use client";

import React from "react";
import {
  LinkedH,
  T,
  tableColHeaderStyle,
  finMetricRowStyle,
  finMetricLabelStyle,
  finMetricValueStyle,
  overviewBodyPadding,
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

/** Two-column grid: label | value (no source column) — matches Fin Metrics proportions. */
const IS_COLS = "minmax(118px, 138px) minmax(0, 1fr)";

function formatIncomeValue(value: number | null | undefined): string {
  if (typeof value !== "number") return "—";
  return Math.round(value / 1_000_000).toLocaleString();
}

function IsPeriodHeader({ period }: { period: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: IS_COLS,
        gap: 8,
        alignItems: "center",
        padding: "8px 14px 6px",
        background: T.paper,
        borderBottom: `1px solid ${T.hair}`,
        ...tableColHeaderStyle,
      }}
    >
      <span />
      <span style={{ textAlign: "center", justifySelf: "center", width: "100%" }}>
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
      className="info-row"
      style={{
        ...finMetricRowStyle,
        gridTemplateColumns: IS_COLS,
        borderBottom: last ? "none" : finMetricRowStyle.borderBottom,
      }}
    >
      <span
        style={{
          ...finMetricLabelStyle,
          whiteSpace: "normal",
          lineHeight: 1.35,
          paddingRight: 4,
        }}
      >
        {label}
      </span>
      <span
        style={{
          ...finMetricValueStyle,
          textAlign: "center",
          justifySelf: "center",
          width: "100%",
        }}
      >
        {value}
      </span>
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
    <div>
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
            <div style={{ padding: overviewBodyPadding }}>
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
