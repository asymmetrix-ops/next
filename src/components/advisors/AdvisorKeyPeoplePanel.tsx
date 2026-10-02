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
import { SimplePager } from "@/components/shared/SimplePager";
import { ADVISORS_API_BASE } from "@/lib/advisorsApiBase";
import { formatDate } from "@/utils/individualHelpers";

type KeyPerson = {
  individual_id: number;
  name: string;
  deal_count: number;
  most_recent_deal_date: string | null;
  job_titles: string | null;
  total: number;
};

const PER_PAGE = 25;
const ROW_GRID = "minmax(0, 1.4fr) minmax(0, 1.2fr) 80px minmax(110px, auto)";

export function AdvisorKeyPeoplePanel({ advisorId }: { advisorId: number }) {
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<KeyPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!advisorId || advisorId <= 0) return;
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("asymmetrix_auth_token")
        : null;
    fetch(
      `${ADVISORS_API_BASE}/advisor/key_people?company_id=${advisorId}&page=${page}&per_page=${PER_PAGE}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
    )
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((data: unknown) => {
        if (!cancelled) setRows(Array.isArray(data) ? (data as KeyPerson[]) : []);
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
  }, [advisorId, page]);

  const total = rows[0]?.total ?? 0;

  // Hide the section entirely when the firm has no linked deal-level people.
  if (!loading && (failed || (total === 0 && page === 1))) return null;

  return (
    <LinkPanel>
      <LinkedH>Key People</LinkedH>
      <div style={{ overflowX: "auto", maxWidth: "100%", minWidth: 0 }}>
        <div style={{ width: "100%", minWidth: 520, ...profileTableCellStyle }}>
          <div
            style={{
              ...tableColHeaderBarStyle,
              gridTemplateColumns: ROW_GRID,
              gap: 8,
              padding: "8px 16px",
            }}
          >
            {["Name", "Role", "Deals", "Most recent deal"].map((h, i) => (
              <div
                key={h}
                style={{ ...tableColHeaderStyle, textAlign: i < 2 ? "left" : "right" }}
              >
                {h}
              </div>
            ))}
          </div>
          {loading ? (
            <div style={{ padding: "20px 16px", color: T.muted, fontSize: 12.5, textAlign: "center" }}>
              Loading…
            </div>
          ) : (
            rows.map((p, i) => (
              <div
                key={p.individual_id}
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
                  href={`/individual/${p.individual_id}`}
                  prefetch={false}
                  style={{ color: T.azure, textDecoration: "underline", fontWeight: 500, fontSize: 13 }}
                >
                  {p.name}
                </Link>
                <div style={{ color: T.body }}>{p.job_titles || "-"}</div>
                <div style={{ color: T.body, textAlign: "right" }}>{p.deal_count}</div>
                <div style={{ color: T.body, textAlign: "right", whiteSpace: "nowrap" }}>
                  {p.most_recent_deal_date ? formatDate(p.most_recent_deal_date) : "-"}
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
