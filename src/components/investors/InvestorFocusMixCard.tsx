"use client";

import React, { useMemo, useState } from "react";
import {
  CARD_TITLE_STYLE,
  descriptionBodyStyle,
  FIN_METRICS_TAB_BAR_STYLE,
  LinkPanel,
  numericPctValueStyle,
  numericValueStyle,
  PctBar,
  T,
} from "@/components/redesign/primitives";
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
        display: "flex",
        alignItems: "center",
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
        borderBottom: `2px solid ${active ? T.azure : "transparent"}`,
        flexShrink: 0,
        transition: "color 120ms, border-color 120ms",
      }}
    >
      <span
        style={{
          ...CARD_TITLE_STYLE,
          fontWeight: active ? 600 : 500,
          color: active ? T.ink : T.muted,
        }}
      >
        {label}
      </span>
    </button>
  );
}

function FocusMixHeader({
  tab,
  onSelectTab,
}: {
  tab: Tab;
  onSelectTab: (next: Tab) => void;
}) {
  return (
    <div style={FIN_METRICS_TAB_BAR_STYLE}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "nowrap",
          minWidth: 0,
          flex: 1,
          overflow: "hidden",
        }}
      >
        <TabButton active={tab === "sector"} label="Sector mix" onClick={() => onSelectTab("sector")} />
        <TabButton active={tab === "stage"} label="Stage focus" onClick={() => onSelectTab("stage")} />
        <TabButton active={tab === "geography"} label="Geography" onClick={() => onSelectTab("geography")} />
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
          textAlign: "center",
          flex: fillGridCell ? 1 : undefined,
          ...descriptionBodyStyle,
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
            }}
          >
            <div
              style={{
                color: T.body,
                display: "flex",
                alignItems: "center",
                gap: 8,
                minWidth: 0,
                ...descriptionBodyStyle,
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
                ...numericPctValueStyle,
                textAlign: "right",
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
      <div style={{ fontSize: 12, color: T.muted, ...numericValueStyle }}>{left}</div>
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
        <FocusMixHeader tab="sector" onSelectTab={() => {}} />
        <div
          style={{
            padding: "20px 16px",
            color: T.muted,
            textAlign: "center",
            flex: fillGridCell ? 1 : undefined,
            ...descriptionBodyStyle,
          }}
        >
          Loading portfolio mix…
        </div>
      </LinkPanel>
    );
  }

  return (
    <LinkPanel fillGridCell={fillGridCell}>
      <FocusMixHeader tab={tab} onSelectTab={selectTab} />

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
