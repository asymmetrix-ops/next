"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  profileTableCellStyle,
  tableColHeaderBarStyle,
  tableColHeaderStyle,
  T,
  Pill,
} from "@/components/redesign/primitives";

export type CorporateEventTransactionRow = {
  id: number;
  title: string;
  date?: string;
  dealType?: string;
  target?: React.ReactNode;
  investors?: React.ReactNode;
};

type Props = {
  title: string;
  rows: CorporateEventTransactionRow[];
  maxInitial?: number;
  loadMoreStep?: number;
};

const ROW_GRID =
  "minmax(0, 28%) minmax(0, 14%) minmax(0, 16%) minmax(0, 22%) minmax(0, 20%)";
const COL_GAP = 2;
const ROW_PAD = "6px 10px";

function dealTypeTone(dealType: string): "coral" | "azure" | "neutral" {
  const d = dealType.toLowerCase();
  if (d.includes("acquisition") || d.includes("merger")) return "azure";
  if (d.includes("divest")) return "coral";
  return "neutral";
}

export function CorporateEventTransactionsPanel({
  title,
  rows,
  maxInitial = 5,
  loadMoreStep = 5,
}: Props) {
  const [displayCount, setDisplayCount] = useState(maxInitial);

  const headerRight = useMemo(() => {
    if (rows.length === 0) return "";
    return `${rows.length} event${rows.length === 1 ? "" : "s"}`;
  }, [rows.length]);

  const displayed = rows.slice(0, displayCount);
  const hasMore = rows.length > displayCount;

  return (
    <div style={{ fontFamily: T.sans, minWidth: 0, maxWidth: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 16px 12px",
          borderBottom: `1px solid ${T.hair}`,
        }}
      >
        <div style={{ fontSize: "13.5px", fontWeight: 600, color: T.ink }}>{title}</div>
        {headerRight ? (
          <div style={{ fontSize: "11.5px", color: T.muted }}>{headerRight}</div>
        ) : null}
      </div>

      <div style={{ maxWidth: "100%", minWidth: 0, overflow: "hidden" }}>
        <div style={{ width: "100%", ...profileTableCellStyle }}>
          <div
            style={{
              ...tableColHeaderBarStyle,
              gridTemplateColumns: ROW_GRID,
              gap: COL_GAP,
              padding: ROW_PAD,
            }}
          >
            {(["Event", "Date", "Type", "Target", "Investors"] as const).map((h) => (
              <div key={h} style={{ ...tableColHeaderStyle, textAlign: "left", fontSize: 10 }}>
                {h}
              </div>
            ))}
          </div>

          {displayed.length > 0 ? (
            displayed.map((row, index) => {
              const last = index === displayed.length - 1;
              const isPartnership = row.dealType?.toLowerCase() === "partnership";
              return (
                <div
                  key={row.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: ROW_GRID,
                    gap: COL_GAP,
                    alignItems: "center",
                    padding: ROW_PAD,
                    borderBottom: last && !hasMore ? "none" : `1px solid ${T.hair}`,
                  }}
                >
                  <div style={{ minWidth: 0, overflow: "hidden" }}>
                    <Link
                      href={`/corporate-event/${row.id}`}
                      prefetch={false}
                      style={{
                        color: T.azure,
                        textDecoration: "underline",
                        fontWeight: 500,
                        fontSize: 12,
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.title}
                    </Link>
                  </div>
                  <div style={{ color: T.body, fontSize: 12, whiteSpace: "nowrap" }}>
                    {row.date || "-"}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    {row.dealType ? (
                      <Pill tone={dealTypeTone(row.dealType)} style={{ fontSize: 10, padding: "1px 5px" }}>
                        {row.dealType}
                      </Pill>
                    ) : (
                      "-"
                    )}
                  </div>
                  <div style={{ color: T.body, fontSize: 12, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {row.target || "-"}
                  </div>
                  <div style={{ color: T.muted, fontSize: 12, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {isPartnership ? "-" : row.investors || "-"}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ padding: "20px 16px", color: T.muted, fontSize: "12.5px", textAlign: "center" }}>
              No events available
            </div>
          )}
        </div>
      </div>

      {hasMore ? (
        <div style={{ padding: "10px 16px 14px", borderTop: `1px solid ${T.hair}` }}>
          <button
            type="button"
            onClick={() => setDisplayCount((prev) => prev + loadMoreStep)}
            style={{
              padding: 0,
              border: "none",
              background: "none",
              color: T.azure,
              fontSize: 12.5,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: T.sans,
            }}
          >
            Load more
          </button>
        </div>
      ) : null}
    </div>
  );
}
