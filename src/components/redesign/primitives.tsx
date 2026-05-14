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
export const T = {
  paper:        "#FAFAF7",
  panel:        "#FFFFFF",
  inset:        "#F4F3EE",
  divider:      "rgba(15,17,21,0.08)",
  hair:         "rgba(15,17,21,0.06)",
  ink:          "#0F1115",
  body:         "#2A2D33",
  muted:        "#6B6E76",
  faint:        "#9A9CA3",
  azure:        "oklch(54% 0.22 258)",
  azureSoft:    "oklch(96% 0.035 258)",
  emerald:      "oklch(56% 0.13 158)",
  emeraldSoft:  "oklch(95% 0.05 158)",
  coral:        "oklch(68% 0.13 25)",
  coralSoft:    "oklch(95% 0.04 25)",
  lavender:     "oklch(64% 0.16 285)",
  lavenderSoft: "oklch(94% 0.045 285)",
  up:           "oklch(55% 0.13 150)",
  down:         "oklch(55% 0.17 25)",
  r:            6,
  rLg:          10,
  sans:         '"Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  mono:         '"Geist Mono", ui-monospace, "SF Mono", Menlo, monospace',
} as const;

// ── Pill ────────────────────────────────────────────────────────────────────
type PillTone = "neutral" | "azure" | "lavender" | "coral" | "emerald" | "up" | "down" | "ghost";
const PILL_TONES: Record<PillTone, { bg: string; fg: string; bd: string }> = {
  neutral:  { bg: T.inset,        fg: T.body,     bd: T.divider },
  azure:    { bg: T.azureSoft,    fg: T.azure,    bd: "transparent" },
  lavender: { bg: T.lavenderSoft, fg: T.lavender, bd: "transparent" },
  coral:    { bg: T.coralSoft,    fg: T.coral,    bd: "transparent" },
  emerald:  { bg: T.emeraldSoft,  fg: T.emerald,  bd: "transparent" },
  up:       { bg: "oklch(95% 0.05 150)", fg: T.up,   bd: "transparent" },
  down:     { bg: "oklch(95% 0.06 25)",  fg: T.down, bd: "transparent" },
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
        padding: "2px 8px",
        borderRadius: 4,
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.bd}`,
        fontFamily: T.sans,
        fontSize: 11.5,
        fontWeight: 500,
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
  showArrow = true,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
  showArrow?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 16px 12px",
        borderBottom: `1px solid ${T.hair}`,
      }}
    >
      <div
        style={{
          fontFamily: T.sans,
          fontSize: 13.5,
          fontWeight: 600,
          color: T.ink,
        }}
      >
        {children}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: T.panel,
        border: `1px solid ${hover ? "oklch(82% 0.07 258)" : T.divider}`,
        borderRadius: T.rLg,
        overflow: "hidden",
        boxShadow: hover ? "0 4px 20px rgba(35,80,200,0.06)" : "none",
        transition: "box-shadow 160ms, border-color 160ms, transform 160ms",
        transform: hover ? "translateY(-1px)" : "translateY(0)",
        width: "100%",
        minWidth: 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── MiniKV — compact key/value row (right-rail style) ───────────────────────
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
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "7px 0",
        borderBottom: last ? "none" : `1px solid ${T.hair}`,
        fontSize: 12.5,
      }}
    >
      <div style={{ color: T.muted }}>{k}</div>
      <div
        style={{
          color: T.ink,
          fontFamily: mono ? T.mono : T.sans,
          fontVariantNumeric: "tabular-nums",
          fontWeight: 500,
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

// ── WeightChip ───────────────────────────────────────────────────────────────
export function WeightChip({
  weight,
  hideMinor = false,
}: {
  weight: string;
  hideMinor?: boolean;
}) {
  if (weight === "Main") return <Pill tone="azure">Main</Pill>;
  if (hideMinor) return null;
  return <Pill tone="ghost">Minor</Pill>;
}
