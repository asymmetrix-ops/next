"use client";
/**
 * Redesign V3 shared primitives — TypeScript equivalents of
 * redesign/shared.jsx + redesign/_helpers.jsx
 *
 * All components are self-contained (tokens baked in) and accept
 * real data via props. The token values match page.tsx's `T` object.
 */
import React from "react";

// ── Design tokens (mirrors page.tsx T and redesign/tokens.jsx) ──────────────
// Exact values from the Asymmetrix design system (ui_kits/landing/landing.css
// "--lp-*"), the authoritative source for this redesign.
export const T = {
  paper:        "#F5F7FD",
  panel:        "#FFFFFF",
  inset:        "#EFF2F8",
  divider:      "#E4E8F2",
  hair:         "#EFF2F8",
  ink:          "#0A0E1A",
  body:         "#566078",
  muted:        "#6B7488",
  faint:        "#8A93A8",
  azure:        "#2A46EA",
  azureSoft:    "#F1F4FE",
  emerald:      "#0F7040",
  emeraldSoft:  "#E4F5EC",
  coral:        "#A62E22",
  coralSoft:    "#FCEAE7",
  lavender:     "#523793",
  lavenderSoft: "#F1EBFC",
  up:           "#0F7040",
  down:         "#A62E22",
  warn:         "#7A5605",
  warnSoft:     "#FEF6E0",
  r:            8,
  rLg:          16,
  sans:         "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono:         'var(--font-geist-mono, "Geist Mono", ui-monospace, "SF Mono", Menlo, monospace)',
  /** Card hover — blue highlight without heavy inset ring */
  cardHoverBorder: "#C6D1FB",
  cardHoverShadow:
    "0 4px 10px rgba(16, 28, 70, 0.07), 0 20px 48px rgba(16, 28, 70, 0.10)",
} as const;

/** Card header title — matches LinkedH / Overview / Description. */
export const CARD_TITLE_STYLE: React.CSSProperties = {
  fontFamily: T.sans,
  fontSize: 13.5,
  fontWeight: 600,
  color: T.ink,
  lineHeight: 1.25,
  whiteSpace: "nowrap",
};

/** Fixed-height title bar so adjacent cards align (arrow / metadata do not shift row). */
export const CARD_HEADER_BAR_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: "12px 14px 10px",
  borderBottom: `1px solid ${T.hair}`,
  minWidth: 0,
  boxSizing: "border-box",
  minHeight: 44,
  flexShrink: 0,
};

/** Overview KV label column width. */
export const KV_LABEL_COL = "minmax(118px, auto)";

/** Overview-aligned row label (field names). */
export const kvLabelStyle: React.CSSProperties = {
  color: T.muted,
  fontFamily: T.sans,
  fontSize: 13,
  fontWeight: 400,
  lineHeight: 1.35,
};

/** Overview-aligned row value. */
export const kvValueStyle: React.CSSProperties = {
  color: T.body,
  fontFamily: T.sans,
  fontVariantNumeric: "tabular-nums",
  fontSize: 13,
  lineHeight: 1.55,
  fontWeight: 400,
};

/** Description card body — shared reference for Financial Metrics values. */
export const descriptionBodyStyle: React.CSSProperties = {
  fontFamily: T.sans,
  fontSize: 13,
  lineHeight: 1.55,
  color: T.body,
  fontWeight: 400,
};

/** Numeric data values — system sans with tabular figures for alignment. */
export const numericValueStyle: React.CSSProperties = {
  fontFamily: T.sans,
  fontVariantNumeric: "tabular-nums",
};

/** Percentage column in profile mix bars (Product type, Sector mix, etc.). */
export const numericPctValueStyle: React.CSSProperties = {
  ...numericValueStyle,
  fontSize: 12,
  color: T.ink,
};

/** Shared horizontal padding for card body content (Overview, Financials). */
export const CARD_BODY_X_PAD = 14;
export const overviewBodyPadding = "2px 14px 8px";

/** Shared fin-metrics layout + typography (both cards). */
export const FIN_METRIC_COMPACT_BODY_FONT_SIZE = 13;
export const FIN_METRIC_COMPACT_PERIOD_FONT_SIZE = 10;
export const FIN_METRIC_COMPACT_LABEL_COL_WIDTH = 138;

/** Fixed width so header "Source" and row values share the same column bounds. */
export const FIN_METRIC_SOURCE_COL_WIDTH = 80;

/** Single grid for both fin-metrics cards so stacked columns align. */
export const FIN_METRIC_GRID_COLS =
  `${FIN_METRIC_COMPACT_LABEL_COL_WIDTH}px 1fr ${FIN_METRIC_SOURCE_COL_WIDTH}px`;

/** @deprecated alias — use FIN_METRIC_GRID_COLS */
export const FIN_METRIC_COMPACT_GRID_COLS = FIN_METRIC_GRID_COLS;

/** Tab bar for Financial / Subscription metrics cards — identical shell to LinkedH. */
export const FIN_METRICS_TAB_BAR_STYLE: React.CSSProperties = {
  ...CARD_HEADER_BAR_STYLE,
};

/** Tab labels in fin-metrics headers — same typography as other card titles (LinkedH). */
export const FIN_METRICS_TAB_STYLE: React.CSSProperties = {
  ...CARD_TITLE_STYLE,
};

/** Period row (DEC-2026 · Source) — shared compact header across both fin-metrics cards. */
export const finMetricsPeriodHeaderStyle: React.CSSProperties = {
  fontFamily: T.sans,
  fontSize: FIN_METRIC_COMPACT_PERIOD_FONT_SIZE,
  fontWeight: 500,
  color: T.muted,
  textTransform: "uppercase",
  letterSpacing: 0.35,
};

/** Horizontal inset for fin-metrics body — matches Overview card (`2px 14px 8px`). */
export const finMetricsContentXPad = CARD_BODY_X_PAD;

export const finMetricsBodyPadding = "2px 0 4px";

/** Income Statement — equal-width fiscal-year columns so headers align with values. */
export function finMetricIncomeStatementGridCols(periodCount: number): string {
  if (periodCount <= 0) return FIN_METRIC_GRID_COLS;
  return `minmax(118px, max-content) 1fr repeat(${periodCount}, minmax(88px, 1fr)) 1fr`;
}

export const finMetricRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: FIN_METRIC_GRID_COLS,
  columnGap: 8,
  alignItems: "center",
  padding: "2px 0",
  borderBottom: `1px solid ${T.hair}`,
};

export const finMetricLabelStyle: React.CSSProperties = {
  ...kvLabelStyle,
  whiteSpace: "nowrap",
  textAlign: "left",
  justifySelf: "start",
};

/** Source column in data rows — centered under the period header. */
export const finMetricSourceColStyle: React.CSSProperties = {
  ...kvLabelStyle,
  textAlign: "center",
  whiteSpace: "nowrap",
  justifySelf: "stretch",
  width: "100%",
  minWidth: 0,
};

/** Source column in the period header row — matches period header typography. */
export const finMetricPeriodSourceColStyle: React.CSSProperties = {
  ...finMetricsPeriodHeaderStyle,
  textAlign: "center",
  whiteSpace: "nowrap",
  justifySelf: "stretch",
  width: "100%",
  minWidth: 0,
};

/** Numeric / currency values in Financial, Subscription, and Income Statement tabs. */
export const finMetricValueStyle: React.CSSProperties = {
  ...descriptionBodyStyle,
  fontWeight: 700,
  color: T.ink,
  fontVariantNumeric: "tabular-nums",
};

/** CSS class for fin-metric value cells (page-level typography guard). */
export const FIN_METRIC_VALUE_CLASS = "fin-metric-value";

/** Value column in Financial Metrics — centered under the period header. */
export const finMetricValueColStyle: React.CSSProperties = {
  ...finMetricValueStyle,
  textAlign: "center",
  justifySelf: "center",
  width: "100%",
  minWidth: 0,
  wordBreak: "break-word",
};

/** Period column header in fin metrics tables (DEC-2026) — matches Source header. */
export const finMetricPeriodColStyle: React.CSSProperties = {
  ...finMetricsPeriodHeaderStyle,
  textAlign: "center",
  justifySelf: "center",
  width: "100%",
  whiteSpace: "nowrap",
};

/** Table column header bar — matches Management card. */
export const tableColHeaderStyle: React.CSSProperties = {
  fontFamily: T.sans,
  fontSize: 10.5,
  fontWeight: 500,
  color: T.muted,
  textTransform: "uppercase",
  letterSpacing: 0.4,
};

export const tableColHeaderBarStyle: React.CSSProperties = {
  display: "grid",
  alignItems: "center",
  padding: "8px 16px",
  background: T.paper,
  borderBottom: `1px solid ${T.hair}`,
  ...tableColHeaderStyle,
};

/** Profile tables: column 0 left; all other columns centered. */
export function profileTableColAlign(columnIndex: number): "left" | "center" {
  return columnIndex === 0 ? "left" : "center";
}

/** Body cell typography for Corporate Events / Subsidiaries rows. */
export const profileTableCellStyle: React.CSSProperties = {
  ...descriptionBodyStyle,
};

/**
 * Five-column grid for Corporate Events on the company profile:
 * Event Details | Parties | Deal Details | Advisors | Sector
 */
export const PROFILE_EVENTS_ROW_GRID =
  "minmax(0, 1.35fr) minmax(0, 1.15fr) minmax(0, 1fr) minmax(0, 0.85fr) minmax(0, 0.85fr)";

export const PROFILE_EVENTS_ROW_GAP = 8;

export const PROFILE_EVENTS_ROW_PAD = {
  header: "8px 16px",
  body: "10px 16px",
} as const;

/** Grid-column placement for Subsidiaries on PROFILE_EVENTS_ROW_GRID. */
export const SUBS_PROFILE_GRID_COL = {
  company: "1 / 3",
  sector: 3,
  country: 4,
  yearAcquired: 6,
} as const;

/** Equal-width columns for Current Subsidiaries (4 fields). */
export const SUBS_PROFILE_ROW_GRID = "repeat(4, minmax(0, 1fr))";

/** Equal thirds — Role centered between Name and LinkedIn. */
export const MANAGEMENT_ROW_GRID = "repeat(3, minmax(0, 1fr))";

// ── Pill ────────────────────────────────────────────────────────────────────
type PillTone = "neutral" | "azure" | "lavender" | "coral" | "emerald" | "warn" | "up" | "down" | "ghost";
const PILL_TONES: Record<PillTone, { bg: string; fg: string; bd: string }> = {
  neutral:  { bg: T.inset,        fg: T.body,     bd: T.divider },
  azure:    { bg: T.azureSoft,    fg: T.azure,    bd: "transparent" },
  lavender: { bg: T.lavenderSoft, fg: T.lavender, bd: "transparent" },
  coral:    { bg: T.coralSoft,    fg: T.coral,    bd: "transparent" },
  emerald:  { bg: T.emeraldSoft,  fg: T.emerald,  bd: "transparent" },
  warn:     { bg: T.warnSoft,     fg: T.warn,     bd: "transparent" },
  up:       { bg: T.emeraldSoft, fg: T.up,   bd: "transparent" },
  down:     { bg: T.coralSoft,   fg: T.down, bd: "transparent" },
  ghost:    { bg: "transparent",  fg: T.muted,    bd: T.divider },
};
export function Pill({
  children,
  tone = "neutral",
  style,
}: {
  children: React.ReactNode;
  tone?: PillTone;
  style?: React.CSSProperties;
}) {
  const t = PILL_TONES[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 24,
        padding: "0 10px",
        borderRadius: 999,
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.bd}`,
        fontFamily: T.sans,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1.5,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

// ── Delta pill (auto-toned for +/– values) ──────────────────────────────────
export function Delta({ value }: { value: string | number }) {
  const num = parseFloat(String(value).replace(/[^\-0-9.]/g, ""));
  const tone: PillTone = num > 0 ? "up" : num < 0 ? "down" : "ghost";
  return <Pill tone={tone}>{value}</Pill>;
}

// ── LinkedH — card header bar with optional right slot + → arrow ────────────
export function LinkedH({
  children,
  right,
  showArrow = false,
  leftSlot,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
  showArrow?: boolean;
  leftSlot?: React.ReactNode;
}) {
  return (
    <div style={CARD_HEADER_BAR_STYLE}>
      <div
        style={{
          ...CARD_TITLE_STYLE,
          display: "flex",
          alignItems: "center",
          gap: 8,
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        {leftSlot}
        {children}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
        }}
      >
        {right && <div style={{ fontSize: 11.5, color: T.muted }}>{right}</div>}
        {showArrow && (
          <div
            style={{
              fontSize: 14,
              color: T.azure,
              fontWeight: 500,
              lineHeight: 1,
              padding: "2px 4px",
            }}
          >
            →
          </div>
        )}
      </div>
    </div>
  );
}

// ── LinkPanel — hoverable card shell ────────────────────────────────────────
export function LinkPanel({
  children,
  style,
  /** Fill grid row height (flex column). */
  fillGridCell = false,
  className,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  fillGridCell?: boolean;
  className?: string;
}) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      className={className}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative" as const,
        background: T.panel,
        border: `1px solid ${hover ? T.cardHoverBorder : T.divider}`,
        borderRadius: T.rLg,
        overflow: "hidden",
        boxShadow: hover ? T.cardHoverShadow : "none",
        transition: "box-shadow 160ms ease, border-color 160ms ease",
        zIndex: hover ? 1 : "auto",
        width: "100%",
        minWidth: 0,
        ...(fillGridCell
          ? {
              height: "100%",
              display: "flex" as const,
              flexDirection: "column" as const,
              minHeight: 0,
            }
          : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── PctBar — inline bar for product-type rows (redesign _helpers) ──────────
export function PctBar({ pct, color }: { pct: number; color: string }) {
  const w = Math.min(100, Math.max(0, pct));
  return (
    <div
      style={{
        height: 6,
        background: T.inset,
        borderRadius: 3,
        overflow: "hidden",
        width: 90,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: `${w}%`,
          height: "100%",
          background: color,
          borderRadius: 3,
        }}
      />
    </div>
  );
}

// ── MiniKV — compact key/value row (aligned with Overview KV) ───────────────
export function MiniKV({
  k,
  v,
  last = false,
  mono = false,
}: {
  k: string;
  v: React.ReactNode;
  last?: boolean;
  mono?: boolean;
}) {
  return (
    <div
      style={{
        ...finMetricRowStyle,
        gridTemplateColumns: `${KV_LABEL_COL} 1fr`,
        borderBottom: last ? "none" : finMetricRowStyle.borderBottom,
      }}
    >
      <div style={finMetricLabelStyle}>{k}</div>
      <div
        style={{
          ...finMetricValueStyle,
          fontFamily: mono ? T.mono : T.sans,
          textAlign: "right",
        }}
      >
        {v}
      </div>
    </div>
  );
}

// ── TagRow — pills with "+N more" overflow tooltip ───────────────────────────
export function TagRow({
  items,
  tone = "neutral",
  max = 3,
}: {
  items: string[];
  tone?: PillTone;
  max?: number;
}) {
  const [hover, setHover] = React.useState(false);
  const visible = items.slice(0, max);
  const hidden = items.slice(max);
  return (
    <span
      style={{
        display: "flex",
        gap: 4,
        flexWrap: "nowrap",
        alignItems: "center",
        minWidth: 0,
      }}
    >
      {visible.map((s) => (
        <Pill key={s} tone={tone}>
          {s}
        </Pill>
      ))}
      {hidden.length > 0 && (
        <span
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{ position: "relative", cursor: "default" }}
        >
          <Pill tone="ghost">+{hidden.length}</Pill>
          {hover && (
            <span
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                right: 0,
                background: T.ink,
                color: "#fff",
                fontFamily: T.sans,
                fontSize: 11.5,
                padding: "6px 10px",
                borderRadius: 6,
                boxShadow: "0 4px 18px rgba(0,0,0,0.18)",
                whiteSpace: "nowrap",
                zIndex: 20,
                lineHeight: 1.55,
              }}
            >
              {hidden.map((h) => (
                <div key={h}>{h}</div>
              ))}
            </span>
          )}
        </span>
      )}
    </span>
  );
}

// ── KV — overview-style key / value row ─────────────────────────────────────
export function KV({
  k,
  v,
  mono = false,
  last = false,
  style,
}: {
  k: string;
  v: React.ReactNode;
  mono?: boolean;
  last?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `${KV_LABEL_COL} 1fr`,
        gap: 8,
        padding: "4px 0",
        borderBottom: last ? "none" : `1px solid ${T.hair}`,
        fontSize: 13,
        lineHeight: 1.55,
        alignItems: "start",
        ...style,
      }}
    >
      <div style={{ ...kvLabelStyle, whiteSpace: "nowrap" }}>{k}</div>
      <div style={{ ...kvValueStyle, fontFamily: mono ? T.mono : T.sans }}>
        {v}
      </div>
    </div>
  );
}

// ── WeightChip ───────────────────────────────────────────────────────────────
export function WeightChip({
  weight,
  hideMinor = false,
}: {
  weight: string;
  hideMinor?: boolean;
}) {
  const w = weight.trim();
  const key = w.toLowerCase();
  if (key === "main" || key === "primary")
    return <Pill tone="azure">{w ? titleCaseWeight(w) : "Main"}</Pill>;
  if (key === "secondary")
    return <Pill tone="lavender">{w ? titleCaseWeight(w) : "Secondary"}</Pill>;
  if (key === "minor") {
    if (hideMinor) return null;
    return <Pill tone="ghost">Minor</Pill>;
  }
  if (!w) return hideMinor ? null : <span style={{ color: T.faint }}>—</span>;
  return <Pill tone="ghost">{w}</Pill>;
}

function titleCaseWeight(s: string) {
  return s
    .split(/\s+/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}
