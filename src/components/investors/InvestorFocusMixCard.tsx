"use client";

import React, { useMemo, useState } from "react";
import { LinkPanel, PctBar, T } from "@/components/redesign/primitives";
import { mixBarColorFor } from "./investorSectorColors";

export type InvestorMixRow = {
  label: string;
  pct: number;
};

type Tab = "sector" | "stage" | "geography";

type Props = {
  sectorMix?: InvestorMixRow[];
  stageFocus?: InvestorMixRow[];
  geography?: InvestorMixRow[];
  coveragePct?: number | null;
  loading?: boolean;
  /** Rows shown before "View all" expand. Default 8. */
  maxVisible?: number;
  fillGridCell?: boolean;
};

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        padding: "0 0 4px",
        cursor: "pointer",
        fontFamily: T.sans,
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        color: active ? T.ink : T.muted,
        borderBottom: `2px solid ${active ? T.azure : "transparent"}`,
        whiteSpace: "nowrap",
        transition: "color 120ms, border-color 120ms",
      }}
    >
      {label}
    </button>
  );
}

function MixBody({
  rows,
  fillGridCell = false,
  scrollable = false,
}: {
  rows: InvestorMixRow[];
  fillGridCell?: boolean;
  scrollable?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div
        style={{
          padding: "20px 16px",
          color: T.muted,
          fontSize: 12.5,
          textAlign: "center",
          flex: fillGridCell ? 1 : undefined,
        }}
      >
        No data available
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "8px 16px 10px",
        flex: fillGridCell ? 1 : undefined,
        minHeight: 0,
        overflowY: scrollable ? "auto" : undefined,
      }}
    >
      {rows.map((row, i) => {
        const color = mixBarColorFor(i);
        return (
          <div
            key={`${row.label}-${i}`}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 90px 52px",
              alignItems: "center",
              gap: 10,
              padding: "9px 0",
              borderBottom: i === rows.length - 1 ? "none" : `1px solid ${T.hair}`,
              fontSize: 12.5,
            }}
          >
            <div
              style={{
                color: T.body,
                display: "flex",
                alignItems: "center",
                gap: 8,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: color,
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {row.label}
              </span>
            </div>
            <PctBar pct={row.pct} color={color} />
            <div
              style={{
                fontFamily: T.mono,
                fontSize: 12,
                color: T.ink,
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {row.pct}%
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MixFooter({
  total,
  visibleCount,
  expanded,
  onExpand,
  onCollapse,
}: {
  total: number;
  visibleCount: number;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
}) {
  const left = expanded
    ? `Showing all ${total}`
    : `1–${visibleCount} of ${total}`;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "8px 16px 10px",
        borderTop: `1px solid ${T.hair}`,
        flexWrap: "wrap",
      }}
    >
      <div style={{ fontSize: 12, color: T.muted, fontFamily: T.mono }}>{left}</div>
      {!expanded ? (
        <button
          type="button"
          onClick={onExpand}
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
          View all {total} →
        </button>
      ) : (
        <button
          type="button"
          onClick={onCollapse}
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
          Show less
        </button>
      )}
    </div>
  );
}

export function InvestorFocusMixCard({
  sectorMix = [],
  stageFocus = [],
  geography = [],
  coveragePct,
  loading = false,
  maxVisible = 8,
  fillGridCell = false,
}: Props) {
  const [tab, setTab] = useState<Tab>("sector");
  const [expanded, setExpanded] = useState(false);

  const activeRows = useMemo(() => {
    if (tab === "stage") return stageFocus;
    if (tab === "geography") return geography;
    return sectorMix;
  }, [tab, sectorMix, stageFocus, geography]);

  const total = activeRows.length;
  const hasOverflow = total > maxVisible;
  const displayedRows = expanded || !hasOverflow ? activeRows : activeRows.slice(0, maxVisible);
  const visibleCount = displayedRows.length;

  const footerCoverage =
    coveragePct != null && Number.isFinite(coveragePct)
      ? `Asymmetrix coverage — ${Math.round(coveragePct)}% of active portfolio`
      : "Asymmetrix coverage — % of active portfolio";

  const selectTab = (next: Tab) => {
    setTab(next);
    setExpanded(false);
  };

  if (loading) {
    return (
      <LinkPanel fillGridCell={fillGridCell}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 14px 10px",
            borderBottom: `1px solid ${T.hair}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
            <TabButton active label="Sector mix" onClick={() => {}} />
            <TabButton active={false} label="Stage focus" onClick={() => {}} />
            <TabButton active={false} label="Geography" onClick={() => {}} />
          </div>
          <div style={{ fontSize: 14, color: T.azure, fontWeight: 500, lineHeight: 1 }}>→</div>
        </div>
        <div
          style={{
            padding: "20px 16px",
            color: T.muted,
            fontSize: 12.5,
            textAlign: "center",
            flex: fillGridCell ? 1 : undefined,
          }}
        >
          Loading portfolio mix…
        </div>
      </LinkPanel>
    );
  }

  return (
    <LinkPanel fillGridCell={fillGridCell}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 14px 10px",
          flexShrink: 0,
          borderBottom: `1px solid ${T.hair}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: 16, minWidth: 0, overflow: "hidden" }}>
          <TabButton active={tab === "sector"} label="Sector mix" onClick={() => selectTab("sector")} />
          <TabButton active={tab === "stage"} label="Stage focus" onClick={() => selectTab("stage")} />
          <TabButton active={tab === "geography"} label="Geography" onClick={() => selectTab("geography")} />
        </div>
        <div
          style={{
            fontSize: 14,
            color: T.azure,
            fontWeight: 500,
            lineHeight: 1,
            padding: "2px 4px",
            flexShrink: 0,
          }}
        >
          →
        </div>
      </div>

      <MixBody
        rows={displayedRows}
        fillGridCell={fillGridCell}
        scrollable={expanded && hasOverflow}
      />

      {hasOverflow ? (
        <MixFooter
          total={total}
          visibleCount={visibleCount}
          expanded={expanded}
          onExpand={() => setExpanded(true)}
          onCollapse={() => setExpanded(false)}
        />
      ) : null}

      <div
        style={{
          padding: "8px 16px 12px",
          borderTop: `1px solid ${T.hair}`,
          fontSize: 11,
          color: T.muted,
          fontFamily: T.sans,
          flexShrink: 0,
        }}
      >
        {footerCoverage}
      </div>
    </LinkPanel>
  );
}
