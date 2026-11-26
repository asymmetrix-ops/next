"use client";
/**
 * HeadcountCard — redesign/HeadcountCard.jsx converted to TypeScript.
 * Pure-SVG line + area chart with Y-axis ticks and X-axis date labels.
 * No Recharts dependency.
 */
import React from "react";
import Link from "next/link";
import { LinkPanel, T, CARD_HEADER_BAR_STYLE, CARD_TITLE_STYLE } from "./primitives";

const LINKEDIN_BLUE = "#0A66C2";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Card colours, switched by the site's dark class
const HC_THEME_CSS = `
.hc-card {
  --hc-panel: ${T.panel};
  --hc-ink: ${T.ink};
  --hc-body: ${T.body};
  --hc-muted: ${T.muted};
  --hc-hair: ${T.hair};
  --hc-grid: ${T.divider};
  --hc-line: #0370AA;
  --hc-tint: #E8F8FF;
  --hc-up-fg: ${T.up};
  --hc-up-bg: ${T.emeraldSoft};
  --hc-up-bd: var(--c-line-c3e7d3);
  --hc-down-fg: ${T.down};
  --hc-down-bg: ${T.coralSoft};
  --hc-down-bd: var(--c-line-f5cfc8);
  --hc-flat-fg: ${T.body};
  --hc-flat-bg: ${T.inset};
  --hc-flat-bd: ${T.divider};
  --hc-tip-bg: var(--t-panel);
  --hc-tip-bd: ${T.divider};
}
.dark .hc-card {
  --hc-panel: hsl(var(--card));
  --hc-ink: hsl(var(--card-foreground));
  --hc-body: hsl(var(--muted-foreground));
  --hc-muted: hsl(var(--muted-foreground));
  --hc-hair: hsl(var(--border));
  --hc-grid: hsl(var(--border));
  --hc-line: #38BDF8;
  --hc-tint: rgba(56, 189, 248, 0.14);
  --hc-up-fg: #4ADE80;
  --hc-up-bg: rgba(74, 222, 128, 0.12);
  --hc-up-bd: rgba(74, 222, 128, 0.35);
  --hc-down-fg: #F87171;
  --hc-down-bg: rgba(248, 113, 113, 0.12);
  --hc-down-bd: rgba(248, 113, 113, 0.35);
  --hc-flat-fg: hsl(var(--muted-foreground));
  --hc-flat-bg: hsl(var(--muted));
  --hc-flat-bd: hsl(var(--border));
  --hc-tip-bg: hsl(var(--popover));
  --hc-tip-bd: hsl(var(--border));
}
`;

function toEmployeeCountNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

// Month index (year * 12 + month) from "2025-03", "2025-03-01" or a full date
function toMonthIndex(date: string | undefined): number | null {
  if (!date) return null;
  const m = /^(\d{4})-(\d{1,2})/.exec(date.trim());
  if (m) return parseInt(m[1]!, 10) * 12 + parseInt(m[2]!, 10) - 1;
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? null : d.getFullYear() * 12 + d.getMonth();
}

const shortMonth = (mi: number) =>
  `${MONTHS[mi % 12]} '${String(Math.floor(mi / 12)).slice(2)}`;
const longMonth = (mi: number) => `${MONTHS[mi % 12]} ${Math.floor(mi / 12)}`;

// Strip trailing zeros, e.g. 1.20 -> "1.2"
const trimFixed = (v: number, decimals: number) => String(parseFloat(v.toFixed(decimals)));

const axisUnit = (v: number) => (v >= 1_000_000 ? 1_000_000 : v >= 1_000 ? 1_000 : 1);

// Axis label, at most one decimal (80k, 1.2k, 1.2m)
function formatAxisValue(v: number): string {
  const unit = axisUnit(v);
  const suffix = unit === 1_000_000 ? "m" : unit === 1_000 ? "k" : "";
  return `${trimFixed(v / unit, 1)}${suffix}`;
}

// True when the tick reads exactly with one decimal
const fitsOneDecimal = (t: number) => {
  const x = (t / axisUnit(t)) * 10;
  return Math.abs(x - Math.round(x)) < 1e-6;
};

// End point label (72, 1.3k, 82k, 148k, 1.2m)
function formatShortValue(v: number): string {
  if (v < 1_000) return String(Math.round(v));
  if (v < 10_000) return `${trimFixed(v / 1_000, 1)}k`;
  if (Math.round(v / 1_000) < 1_000) return `${Math.round(v / 1_000)}k`;
  return `${trimFixed(v / 1_000_000, 1)}m`;
}

// Rounded Y steps, 4 or 5 ticks from a round number
function buildYTicks(dataMin: number, dataMax: number): number[] {
  let lo = dataMin;
  let hi = dataMax;
  if (hi <= lo) {
    const pad = Math.max(1, Math.abs(lo) * 0.1);
    lo -= pad;
    hi += pad;
  }
  lo = Math.max(0, lo);
  for (let p = 0; p <= 9; p++) {
    for (const m of [1, 2, 5]) {
      const step = m * 10 ** p;
      let start = Math.floor(lo / step) * step;
      let end = Math.ceil(hi / step) * step;
      let count = Math.round((end - start) / step) + 1;
      if (count > 5) continue;
      while (count < 4) {
        if (count % 2 === 0 && start - step >= 0) start -= step;
        else end += step;
        count++;
      }
      const ticks = Array.from({ length: count }, (_, i) => start + i * step);
      if (ticks.every(fitsOneDecimal)) return ticks;
    }
  }
  return [lo, hi];
}

// Month labels every N months back from the latest, spaced so they never overlap
const X_STEP_MONTHS = [1, 2, 3, 4, 6, 9, 12, 18, 24, 36, 48, 60, 120];
const X_LABEL_MIN_GAP = 46;
function buildXTicks(first: number, last: number, plotW: number): number[] {
  const span = last - first;
  if (span <= 0) return [last];
  const pxPerMonth = plotW / span;
  for (const step of X_STEP_MONTHS) {
    const n = Math.floor(span / step) + 1;
    if (n <= 6 && step * pxPerMonth >= X_LABEL_MIN_GAP) {
      return Array.from({ length: n }, (_, i) => last - (n - 1 - i) * step);
    }
  }
  return [last];
}

// YoY chip text and tone, grey when flat, none without a figure
function buildYoYChip(label?: string): { text: string; arrow: string; tone: "up" | "down" | "flat" } | null {
  const num = label ? parseFloat(label.replace(/[^\-0-9.]/g, "")) : NaN;
  if (!Number.isFinite(num)) return null;
  const abs = Math.round(Math.abs(num) * 10) / 10;
  if (abs === 0) return { text: "0% YoY", arrow: "", tone: "flat" };
  return num > 0
    ? { text: `${abs}% YoY`, arrow: "▲", tone: "up" }
    : { text: `${abs}% YoY`, arrow: "▼", tone: "down" };
}

type Props = {
  /** Monthly headcount values (oldest → newest); strings / comma-formatted OK */
  data: ReadonlyArray<unknown>;
  /** ISO date strings aligned with each `data` entry */
  dates?: string[];
  /** Pre-formatted YoY label e.g. "+6.4% YoY". Optional. */
  yoyLabel?: string;
  /** Current (last) employee count. Falls back to last non-zero data point. */
  count?: unknown;
  /** LinkedIn company URL for the header icon. */
  linkedinUrl?: string;
  fillGridCell?: boolean;
};

const CHART_H = 200;
const PAD_T = 8;
const PAD_B = 25;

export function HeadcountCard({
  data,
  dates,
  yoyLabel,
  count,
  linkedinUrl,
  fillGridCell = false,
}: Props) {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = React.useState(0);

  // Series points, zero months dropped so the line doesn't dip to 0
  const points = React.useMemo(() => {
    const numeric = data.map(toEmployeeCountNumber);
    const hasAnyNonZero = numeric.some((v) => v > 0);
    const withDates = Boolean(dates && dates.length === numeric.length);
    return numeric
      .map((value, i) => ({ value, month: withDates ? toMonthIndex(dates![i]) : null }))
      .filter((p) => !hasAnyNonZero || p.value > 0);
  }, [data, dates]);

  const hasChart = points.length >= 3;
  const lastPoint = points.length > 0 ? points[points.length - 1]!.value : null;
  const countN = count != null ? toEmployeeCountNumber(count) : null;
  const headline = countN != null && countN > 0 ? countN : lastPoint;
  // No YoY chip with less than a year of history
  const knownMonths = points.map((p) => p.month).filter((m): m is number => m != null);
  const historyMonths =
    knownMonths.length === points.length && knownMonths.length > 0
      ? knownMonths[knownMonths.length - 1]! - knownMonths[0]!
      : null;
  const chip =
    points.length < 2 || (historyMonths != null && historyMonths < 12) ? null : buildYoYChip(yoyLabel);

  // Track the real card width so labels stay 11px at every size
  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [hasChart]);

  // Chart geometry
  const chart = React.useMemo(() => {
    if (!hasChart || width <= 0) return null;
    const values = points.map((p) => p.value);
    const ticks = buildYTicks(Math.min(...values), Math.max(...values));
    const yMin = ticks[0]!;
    const yMax = ticks[ticks.length - 1]!;
    const yLabels = ticks.map(formatAxisValue);
    const endLabel = formatShortValue(values[values.length - 1]!);

    const padL = Math.max(...yLabels.map((l) => l.length)) * 5.8 + 10;
    const padR = endLabel.length * 6.2 + 12;
    const plotL = padL;
    const plotR = Math.max(plotL + 40, width - padR);
    const plotW = plotR - plotL;
    const plotT = PAD_T;
    const plotB = CHART_H - PAD_B;

    const months = points.map((p) => p.month);
    const byMonth =
      months.every((m): m is number => m != null) && months[months.length - 1]! > months[0]!;
    const firstMonth = byMonth ? (months[0] as number) : 0;
    const lastMonth = byMonth ? (months[months.length - 1] as number) : 0;
    const xOfMonth = (m: number) => plotL + ((m - firstMonth) / (lastMonth - firstMonth)) * plotW;
    const xs = points.map((p, i) =>
      byMonth ? xOfMonth(p.month as number) : plotL + (i / (points.length - 1)) * plotW
    );
    const yOf = (v: number) => plotT + (1 - (v - yMin) / (yMax - yMin || 1)) * (plotB - plotT);
    const ys = values.map(yOf);

    const linePath = xs.map((x, i) => `${i ? "L" : "M"}${x.toFixed(1)} ${ys[i]!.toFixed(1)}`).join(" ");
    const areaPath = `${linePath} L${xs[xs.length - 1]!.toFixed(1)} ${plotB} L${xs[0]!.toFixed(1)} ${plotB} Z`;
    const xTicks = byMonth
      ? buildXTicks(firstMonth, lastMonth, plotW).map((m) => {
          const x = xOfMonth(m);
          const anchor: "start" | "middle" | "end" =
            x - 18 < 0 ? "start" : x + 18 > width ? "end" : "middle";
          return { x: anchor === "start" ? 0 : anchor === "end" ? width : x, label: shortMonth(m), anchor };
        })
      : [];

    return { ticks, yLabels, yOf, endLabel, plotL, plotR, plotT, plotB, xs, ys, linePath, areaPath, xTicks };
  }, [hasChart, width, points]);

  // Nearest point to the pointer
  const handlePointer = (e: React.PointerEvent<SVGRectElement>) => {
    if (!chart) return;
    const box = e.currentTarget.getBoundingClientRect();
    const x = chart.plotL + ((e.clientX - box.left) / (box.width || 1)) * (chart.plotR - chart.plotL);
    let best = 0;
    chart.xs.forEach((px, i) => {
      if (Math.abs(px - x) < Math.abs(chart.xs[best]! - x)) best = i;
    });
    setHoveredIndex(best);
  };

  const hovered = chart && hoveredIndex != null && hoveredIndex < points.length ? hoveredIndex : null;
  const hoveredPoint = hovered != null ? points[hovered] : null;

  // LinkedIn icon, linked when the page has a URL
  const iconGlyph = (
    <svg width={11} height={11} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
  const iconStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 18,
    height: 18,
    backgroundColor: LINKEDIN_BLUE,
    borderRadius: 3,
    color: "#fff",
    textDecoration: "none",
    flexShrink: 0,
  };
  const linkedinIcon = linkedinUrl ? (
    <Link
      href={linkedinUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="LinkedIn page"
      style={iconStyle}
      onClick={(e) => e.stopPropagation()}
    >
      {iconGlyph}
    </Link>
  ) : (
    <span style={iconStyle}>{iconGlyph}</span>
  );

  const axisText = { fontSize: 11, fontFamily: T.sans, fill: "var(--hc-muted)" } as const;

  return (
    <LinkPanel fillGridCell={fillGridCell} className="hc-card" style={{ background: "var(--hc-panel)" }}>
      <style dangerouslySetInnerHTML={{ __html: HC_THEME_CSS }} />

      {/* Header */}
      <div style={{ ...CARD_HEADER_BAR_STYLE, borderBottom: "1px solid var(--hc-hair)" }}>
        <div
          style={{
            ...CARD_TITLE_STYLE,
            color: "var(--hc-ink)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          {linkedinIcon}
          LinkedIn employee count
        </div>
      </div>

      <div style={{ padding: "12px 14px 10px", flex: 1, minHeight: 0, minWidth: 0 }}>
        {/* Headline count + YoY chip */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "var(--hc-ink)",
              fontVariantNumeric: "tabular-nums",
              letterSpacing: -0.5,
              lineHeight: 1,
            }}
          >
            {headline != null && headline > 0 ? headline.toLocaleString("en-US") : "-"}
          </div>
          {chip && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                height: 22,
                padding: "0 8px",
                borderRadius: 999,
                background: `var(--hc-${chip.tone}-bg)`,
                color: `var(--hc-${chip.tone}-fg)`,
                border: `1px solid var(--hc-${chip.tone}-bd)`,
                fontFamily: T.sans,
                fontSize: 12,
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {chip.arrow && <span style={{ fontSize: 9 }}>{chip.arrow}</span>}
              {chip.text}
            </span>
          )}
        </div>

        {!hasChart && (
          <div style={{ fontSize: 12.5, color: "var(--hc-muted)", padding: "4px 0 2px" }}>
            Not enough history yet
          </div>
        )}

        {/* Line chart */}
        {hasChart && (
          <div ref={wrapRef} style={{ position: "relative", height: CHART_H, minWidth: 0 }}>
            {chart && (
              <svg
                width={width}
                height={CHART_H}
                style={{ display: "block", overflow: "visible" }}
                role="img"
                aria-label={`LinkedIn employee count, latest ${chart.endLabel}`}
              >
                {/* Gridlines and Y axis labels */}
                {chart.ticks.map((t, i) => (
                  <g key={t}>
                    <line
                      x1={chart.plotL}
                      x2={chart.plotR}
                      y1={chart.yOf(t)}
                      y2={chart.yOf(t)}
                      stroke="var(--hc-grid)"
                      strokeWidth={1}
                    />
                    <text x={chart.plotL - 8} y={chart.yOf(t)} dy="0.35em" textAnchor="end" {...axisText}>
                      {chart.yLabels[i]}
                    </text>
                  </g>
                ))}

                {/* Tinted area and line */}
                <path d={chart.areaPath} fill="var(--hc-tint)" />
                <path
                  d={chart.linePath}
                  fill="none"
                  stroke="var(--hc-line)"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />

                {chart.xTicks.map((t) => (
                  <text key={t.label} x={t.x} y={CHART_H - 5} textAnchor={t.anchor} {...axisText}>
                    {t.label}
                  </text>
                ))}

                {/* Hover marker */}
                {hovered != null && (
                  <g pointerEvents="none">
                    <line
                      x1={chart.xs[hovered]}
                      x2={chart.xs[hovered]}
                      y1={chart.plotT}
                      y2={chart.plotB}
                      stroke="var(--hc-line)"
                      strokeOpacity={0.35}
                      strokeWidth={1}
                    />
                    <circle
                      cx={chart.xs[hovered]}
                      cy={chart.ys[hovered]}
                      r={3.5}
                      fill="var(--hc-line)"
                      stroke="var(--hc-panel)"
                      strokeWidth={1.5}
                    />
                  </g>
                )}

                {/* Latest point, hollow, with its short value */}
                <circle
                  cx={chart.xs[chart.xs.length - 1]}
                  cy={chart.ys[chart.ys.length - 1]}
                  r={4}
                  fill="var(--hc-panel)"
                  stroke="var(--hc-line)"
                  strokeWidth={2}
                />
                <text
                  x={chart.xs[chart.xs.length - 1]! + 8}
                  y={chart.ys[chart.ys.length - 1]}
                  dy="0.35em"
                  fontSize={11}
                  fontWeight={700}
                  fontFamily={T.sans}
                  fill="var(--hc-line)"
                >
                  {chart.endLabel}
                </text>

                {/* Hover and tap area */}
                <rect
                  x={chart.plotL}
                  y={0}
                  width={Math.max(0, chart.plotR - chart.plotL)}
                  height={CHART_H}
                  fill="transparent"
                  onPointerMove={handlePointer}
                  onPointerDown={handlePointer}
                  onPointerLeave={() => setHoveredIndex(null)}
                />
              </svg>
            )}

            {/* Hover tooltip */}
            {chart && hovered != null && hoveredPoint && (
              <div
                style={{
                  position: "absolute",
                  left: chart.xs[hovered],
                  top: chart.ys[hovered],
                  transform: `translate(${
                    chart.xs[hovered]! / width > 0.65
                      ? "calc(-100% + 12px)"
                      : chart.xs[hovered]! / width < 0.35
                        ? "-12px"
                        : "-50%"
                  }, calc(-100% - 10px))`,
                  background: "var(--hc-tip-bg)",
                  border: "1px solid var(--hc-tip-bd)",
                  borderRadius: 6,
                  padding: "5px 8px",
                  pointerEvents: "none",
                  zIndex: 2,
                  fontFamily: T.sans,
                  fontSize: 12,
                  lineHeight: 1.4,
                  whiteSpace: "nowrap",
                  boxShadow: "0 2px 8px rgba(15,17,21,0.08)",
                }}
              >
                {hoveredPoint.month != null && (
                  <span style={{ color: "var(--hc-body)" }}>{`${longMonth(hoveredPoint.month)} · `}</span>
                )}
                <span style={{ color: "var(--hc-ink)", fontWeight: 600 }}>
                  {hoveredPoint.value.toLocaleString("en-US")}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </LinkPanel>
  );
}
