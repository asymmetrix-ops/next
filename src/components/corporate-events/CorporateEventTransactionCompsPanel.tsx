"use client";

import React from "react";
import Link from "next/link";
import type { CorporateEventTransactionComp } from "@/components/transaction-comps/transactionCompsTypes";
import { LinkPanel, T } from "@/components/redesign/primitives";

const fmt = (v: number | null | undefined, digits = 1, suffix = "") =>
  v == null ? null : `${v.toLocaleString(undefined, { maximumFractionDigits: digits })}${suffix}`;
/** A zero from the API means "not available" for monetary values. */
const money = (v: number | null | undefined) => (v ? fmt(v) : null);

function metricRows(r: CorporateEventTransactionComp): [string, string | null][] {
  return [
    ["EV / Revenue", fmt(r.ev_revenue, 1, "x")],
    ["EV / EBITDA", fmt(r.ev_ebitda, 1, "x")],
    ["EV ($m)", money(r.ev_m_usd)],
    ["Revenue ($m)", money(r.revenue_m_usd)],
    ["EBITDA ($m)", money(r.ebitda_m_usd)],
    ["EBITDA margin", fmt(r.ebitda_margin_pc, 1, "%")],
    ["Revenue growth", fmt(r.revenue_growth_pc, 1, "%")],
    ["Rule of 40", fmt(r.rule_of_40, 0)],
    ["Financial year", r.financial_year != null ? String(r.financial_year) : null],
    ["EV source", r.ev_source_type || null],
  ];
}

/** Transaction comp tile for a corporate event page (shown next to Description when comps exist). */
export function CorporateEventTransactionCompsPanel({
  comps,
}: {
  comps: CorporateEventTransactionComp[];
}) {
  return (
    <LinkPanel fillGridCell>
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
        {comps.map((r, index) => (
          <div
            key={r.id}
            style={{
              padding: "10px 16px 12px",
              borderTop: index > 0 ? `1px solid ${T.hair}` : undefined,
            }}
          >
            <Link
              href={`/company/${r.company_id}`}
              prefetch={false}
              style={{ color: T.azure, textDecoration: "underline", fontWeight: 500, fontSize: 12.5 }}
            >
              {r.company_name}
            </Link>
            <dl style={{ margin: "8px 0 0", fontSize: 12 }}>
              {metricRows(r)
                .filter(([, value]) => value != null)
                .map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "4px 0",
                      borderBottom: `1px solid ${T.hair}`,
                    }}
                  >
                    <dt style={{ color: T.muted }}>{label}</dt>
                    <dd
                      style={{
                        margin: 0,
                        color: T.body,
                        fontVariantNumeric: "tabular-nums",
                        textAlign: "right",
                      }}
                    >
                      {value}
                    </dd>
                  </div>
                ))}
            </dl>
          </div>
        ))}
      </div>
    </LinkPanel>
  );
}
