"use client";

import React from "react";
import { LinkedH, T } from "./primitives";

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

const COL = "minmax(88px, 1.15fr) 1fr 1fr 1fr";

const metricLabelStyle: React.CSSProperties = {
  fontFamily: T.sans,
  fontSize: 12.5,
  fontWeight: 400,
  color: T.muted,
};

const metricValueStyle: React.CSSProperties = {
  fontFamily: T.sans,
  fontSize: 12.5,
  fontWeight: 400,
  color: T.body,
  textAlign: "right",
};

function formatIncomeValue(value: number | null | undefined): string {
  if (typeof value !== "number") return "—";
  return Math.round(value / 1_000_000).toLocaleString();
}

function ColHeader() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: COL,
        alignItems: "center",
        gap: 10,
        padding: "8px 16px",
        background: T.paper,
        borderBottom: `1px solid ${T.hair}`,
        ...metricLabelStyle,
        fontSize: 10.5,
        fontWeight: 500,
        textTransform: "uppercase",
        letterSpacing: 0.4,
      }}
    >
      <div>Financial period</div>
      <div style={{ textAlign: "right" }}>Revenue (m)</div>
      <div style={{ textAlign: "right" }}>EBIT (m)</div>
      <div style={{ textAlign: "right" }}>EBITDA (m)</div>
    </div>
  );
}

function DataRow({
  row,
  last,
}: {
  row: IncomeStatementRow;
  last: boolean;
}) {
  const period = (row.period_display_end_date || "").replace(/[,\s]/g, "");

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: COL,
        alignItems: "center",
        gap: 10,
        padding: "10px 16px",
        borderBottom: last ? "none" : `1px solid ${T.hair}`,
      }}
    >
      <div style={{ ...metricLabelStyle, textAlign: "left" }}>
        {period || "—"}
      </div>
      <div style={metricValueStyle}>{formatIncomeValue(row.revenue)}</div>
      <div style={metricValueStyle}>{formatIncomeValue(row.ebit)}</div>
      <div style={metricValueStyle}>{formatIncomeValue(row.ebitda)}</div>
    </div>
  );
}

export function IncomeStatementTable({
  rows,
  currency = "",
}: {
  rows: IncomeStatementRow[];
  currency?: string;
}) {
  const titleCurrency = currency.trim();
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: 320 }}>
        {titleCurrency ? (
          <div
            style={{
              padding: "10px 16px 0",
              fontSize: 12,
              color: T.muted,
              fontWeight: 500,
            }}
          >
            Currency: {titleCurrency}
          </div>
        ) : null}
        <ColHeader />
        <div style={{ padding: "4px 0" }}>
          {rows.map((row, index) => (
            <DataRow
              key={row.id}
              row={row}
              last={index === rows.length - 1}
            />
          ))}
        </div>
      </div>
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
