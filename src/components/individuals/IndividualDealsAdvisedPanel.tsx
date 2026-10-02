"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  LinkPanel,
  LinkedH,
  T,
  profileTableCellStyle,
  tableColHeaderBarStyle,
  tableColHeaderStyle,
} from "@/components/redesign/primitives";
import { DealTypeBadge } from "@/components/corporate-events/DealTypeBadge";
import { SimplePager } from "@/components/shared/SimplePager";
import { formatCurrency, formatDate } from "@/utils/individualHelpers";

type DealAdvised = {
  event_id: number;
  announcement_date: string | null;
  deal_type: string | null;
  event_description: string | null;
  target_name: string | null;
  counterparty_company_id: number | null;
  counterparty_name: string | null;
  advisor_company_id: number | null;
  advisor_firm_name: string | null;
  deal_value_m: number | string | null;
  deal_value_currency: string | null;
  total: number;
};

const PER_PAGE = 20;
const ROW_GRID =
  "minmax(0, 1.4fr) minmax(92px, auto) minmax(100px, auto) minmax(0, 1fr) minmax(0, 1fr) minmax(80px, auto)";
const API_BASE = "https://xdil-abvj-o7rq.e2.xano.io/api:Xpykjv0R:develop";

export function IndividualDealsAdvisedPanel({ individualId }: { individualId: number }) {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<DealAdvised[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!individualId || individualId <= 0) return;
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    const token = localStorage.getItem("asymmetrix_auth_token");
    fetch(
      `${API_BASE}/individual/deals_advised?individual_id=${individualId}&page=${page}&per_page=${PER_PAGE}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
    )
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((data: unknown) => {
        if (!cancelled) setRows(Array.isArray(data) ? (data as DealAdvised[]) : []);
      })
      .catch(() => {
        if (!cancelled) {
          setRows([]);
          setFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [individualId, page]);

  const total = rows[0]?.total ?? 0;
  if (!loading && (failed || (total === 0 && page === 1))) return null;

  return (
    <LinkPanel>
      <LinkedH right={total ? `${total} deal${total === 1 ? "" : "s"}` : undefined}>
        Deals Advised
      </LinkedH>
      <div style={{ overflowX: "auto", maxWidth: "100%", minWidth: 0 }}>
        <div style={{ width: "100%", minWidth: 860, ...profileTableCellStyle }}>
          <div
            style={{
              ...tableColHeaderBarStyle,
              gridTemplateColumns: ROW_GRID,
              gap: 8,
              padding: "8px 16px",
            }}
          >
            {["Corporate Event", "Date", "Type", "Counterparty", "Advisor", "Value"].map(
              (h) => (
                <div key={h} style={{ ...tableColHeaderStyle, textAlign: "left" }}>
                  {h}
                </div>
              )
            )}
          </div>
          {loading ? (
            <div style={{ padding: "20px 16px", color: T.muted, fontSize: 12.5, textAlign: "center" }}>
              Loading…
            </div>
          ) : (
            rows.map((d, i) => (
              <div
                key={`${d.event_id}-${d.advisor_company_id}-${i}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: ROW_GRID,
                  gap: 8,
                  alignItems: "center",
                  padding: "10px 16px",
                  borderBottom: i === rows.length - 1 ? "none" : `1px solid ${T.hair}`,
                }}
              >
                <Link
                  href={`/corporate-event/${d.event_id}`}
                  prefetch={false}
                  style={{
                    color: T.azure,
                    textDecoration: "underline",
                    fontWeight: 500,
                    wordBreak: "break-word",
                  }}
                >
                  {d.event_description || "-"}
                </Link>
                <div style={{ color: T.body, whiteSpace: "nowrap" }}>
                  {d.announcement_date ? formatDate(d.announcement_date) : "-"}
                </div>
                <div>{d.deal_type ? <DealTypeBadge dealType={d.deal_type} /> : "-"}</div>
                <div style={{ color: T.body, minWidth: 0 }}>{d.counterparty_name || "-"}</div>
                <div style={{ minWidth: 0 }}>
                  {d.advisor_company_id && d.advisor_firm_name ? (
                    <Link
                      href={`/advisor/${d.advisor_company_id}`}
                      prefetch={false}
                      style={{ color: T.azure, textDecoration: "underline" }}
                    >
                      {d.advisor_firm_name}
                    </Link>
                  ) : (
                    <span style={{ color: T.muted }}>{d.advisor_firm_name || "-"}</span>
                  )}
                </div>
                <div style={{ color: T.body, fontFamily: T.mono }}>
                  {d.deal_value_m && d.deal_value_currency
                    ? formatCurrency(String(d.deal_value_m), d.deal_value_currency)
                    : "-"}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <SimplePager page={page} perPage={PER_PAGE} total={total} onPageChange={setPage} />
    </LinkPanel>
  );
}
