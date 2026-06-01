"use client";

import React from "react";
import {
  LinkedH,
  T,
  KV_LABEL_COL,
  kvLabelStyle,
  kvValueStyle,
  tableColHeaderBarStyle,
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

const COL = `${KV_LABEL_COL} 1fr 1fr 1fr`;
const ROW_GAP = 10;

function formatIncomeValue(value: number | null | undefined): string {
  if (typeof value !== "number") return "—";
  return Math.round(value / 1_000_000).toLocaleString();
}

function ColHeader() {
  return (
    <div
      style={{
        ...tableColHeaderBarStyle,
        gridTemplateColumns: COL,
        gap: ROW_GAP,
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
        gap: ROW_GAP,
        padding: "10px 16px",
        borderBottom: last ? "none" : `1px solid ${T.hair}`,
      }}
    >
      <div style={kvLabelStyle}>{period || "—"}</div>
      <div style={{ ...kvValueStyle, textAlign: "right" }}>
        {formatIncomeValue(row.revenue)}
      </div>
      <div style={{ ...kvValueStyle, textAlign: "right" }}>
        {formatIncomeValue(row.ebit)}
      </div>
      <div style={{ ...kvValueStyle, textAlign: "right" }}>
        {formatIncomeValue(row.ebitda)}
      </div>
    </div>
  );
}

export function IncomeStatementTable({
  rows,
}: {
  rows: IncomeStatementRow[];
  currency?: string;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: 320 }}>
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
