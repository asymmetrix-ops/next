"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { fetchCorporateEventTransactionCompsServer } from "@/app/transaction-comps/actions";
import type { CorporateEventTransactionComp } from "@/components/transaction-comps/transactionCompsTypes";
import { LinkPanel, T } from "@/components/redesign/primitives";

const COLUMNS = [
  "Target",
  "Financial year",
  "EV ($m)",
  "Revenue ($m)",
  "EBITDA ($m)",
  "EV / Revenue",
  "EV / EBITDA",
  "EBITDA margin",
  "Growth",
  "Rule of 40",
  "EV source",
] as const;

const dash = "–";
const fmt = (v: number | null | undefined, digits = 1, suffix = "") =>
  v == null ? dash : `${v.toLocaleString(undefined, { maximumFractionDigits: digits })}${suffix}`;
/** A zero from the API means "not available" for monetary values. */
const money = (v: number | null | undefined) => (v ? fmt(v) : dash);

/** Transaction comp multiples for a corporate event. Renders nothing when there are none. */
export function CorporateEventTransactionCompsPanel({ eventId }: { eventId: number }) {
  const [rows, setRows] = useState<CorporateEventTransactionComp[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchCorporateEventTransactionCompsServer(eventId).then((items) => {
      if (!cancelled) setRows(items);
    });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (rows.length === 0) return null;

  return (
    <LinkPanel>
      <div style={{ fontFamily: T.sans, minWidth: 0 }}>
        <div
          style={{
            padding: "14px 16px 12px",
            borderBottom: `1px solid ${T.hair}`,
            fontSize: "13.5px",
            fontWeight: 600,
            color: T.ink,
          }}
        >
          Transaction Comps
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {COLUMNS.map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: "6px 10px",
                      textAlign: i === 0 || i === COLUMNS.length - 1 ? "left" : "right",
                      fontSize: 10,
                      fontWeight: 600,
                      color: T.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ borderTop: `1px solid ${T.hair}`, color: T.body }}>
                  <td style={{ padding: "6px 10px", minWidth: 160 }}>
                    <Link
                      href={`/company/${r.company_id}`}
                      prefetch={false}
                      style={{ color: T.azure, textDecoration: "underline", fontWeight: 500 }}
                    >
                      {r.company_name}
                    </Link>
                  </td>
                  <td style={cell}>{r.financial_year ?? dash}</td>
                  <td style={cell}>{money(r.ev_m_usd)}</td>
                  <td style={cell}>{money(r.revenue_m_usd)}</td>
                  <td style={cell}>{money(r.ebitda_m_usd)}</td>
                  <td style={cell}>{fmt(r.ev_revenue, 1, "x")}</td>
                  <td style={cell}>{fmt(r.ev_ebitda, 1, "x")}</td>
                  <td style={cell}>{fmt(r.ebitda_margin_pc, 1, "%")}</td>
                  <td style={cell}>{fmt(r.revenue_growth_pc, 1, "%")}</td>
                  <td style={cell}>{fmt(r.rule_of_40, 0)}</td>
                  <td style={{ padding: "6px 10px", color: T.muted, whiteSpace: "nowrap" }}>
                    {r.ev_source_type || dash}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </LinkPanel>
  );
}

const cell: React.CSSProperties = {
  padding: "6px 10px",
  textAlign: "right",
  whiteSpace: "nowrap",
  fontVariantNumeric: "tabular-nums",
};
