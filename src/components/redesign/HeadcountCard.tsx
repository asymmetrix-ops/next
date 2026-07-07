"use client";
/**
 * HeadcountCard — redesign/HeadcountCard.jsx converted to TypeScript.
 * Pure-SVG line + area chart with Y-axis ticks and X-axis date labels.
 * No Recharts dependency.
 */
import React from "react";
import Link from "next/link";
import { LinkPanel, LinkedH, Delta, T } from "./primitives";

function toEmployeeCountNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** ~5 human-readable Y ticks spanning [dataMin, dataMax] (ref: sparse left axis). */
function buildYTicks(dataMin: number, dataMax: number, maxTicks = 5): number[] {
  if (!Number.isFinite(dataMin) || !Number.isFinite(dataMax)) return [0, 1];
  if (dataMax < dataMin) return buildYTicks(dataMax, dataMin, maxTicks);
  if (dataMin === dataMax) {
    const pad = Math.max(100, Math.round(Math.abs(dataMin) * 0.04) || 500);
    return buildYTicks(dataMin - pad, dataMax + pad, maxTicks);
  }
  const range = dataMax - dataMin;
  const rough = range / Math.max(1, maxTicks - 1);
  const pow10 = 10 ** Math.floor(Math.log10(Math.max(rough, 1e-9)));
  const fr = rough / pow10;
  const niceFr = fr <= 1 ? 1 : fr <= 2 ? 2 : fr <= 5 ? 5 : 10;
  const step = niceFr * pow10;
  const y0 = Math.floor(dataMin / step) * step;
  const y1 = Math.ceil(dataMax / step) * step;
  const out: number[] = [];
  for (let v = y0; v <= y1 + step * 1e-9; v += step) {
    out.push(Math.round(v));
    if (out.length > maxTicks + 3) break;
  }
  if (out.length < 2) return [y0, y1];
  return out;
}

function formatAxisMonthYear(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.toLocaleString("en-US", { month: "short" })} '${String(d.getFullYear()).slice(2)}`;
}

function formatTooltipMonthYear(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    const [year, month] = iso.split("-");
    if (year && month) {
      const fallback = new Date(parseInt(year, 10), parseInt(month, 10) - 1);
      if (!Number.isNaN(fallback.getTime())) {
        return fallback.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
        });
      }
    }
    return "";
  }
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
}

type Props = {
  /** Monthly headcount values (oldest → newest); strings / comma-formatted OK */
  data: ReadonlyArray<unknown>;
  /**
   * ISO date strings aligned with each `data` entry.
   * The card picks 5 evenly-spaced ones for the X-axis after filtering zeros.
   */
  dates?: string[];
  /** Pre-formatted YoY label e.g. "+6.4% YoY". Optional. */
  yoyLabel?: string;
  /** Current (last) employee count. Falls back to last non-zero data point. */
  count?: unknown;
  /** "As of" label shown under the headline. */
  asOf?: string;
  /** e.g. "56-month history" */
  historyLabel?: string;
  /** LinkedIn company URL for the footer icon. */
  linkedinUrl?: string;
  fillGridCell?: boolean;
};

export function HeadcountCard({
  data,
  dates,
  yoyLabel,
  count,
  asOf,
  historyLabel,
  linkedinUrl,
  fillGridCell = false,
}: Props) {
  const id = React.useId().replace(/:/g, "");
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  const numericData = data.map(toEmployeeCountNumber);

  // Mirror EmployeeChart: strip zero entries so the chart doesn't flat-line
  const hasAnyNonZero = numericData.some((v) => v > 0);
  const filteredData = hasAnyNonZero
    ? numericData.filter((v) => v > 0)
    : numericData;

  // Need ≥2 points to draw a line; duplicate a single point so one month still renders
  const rawPts =
    filteredData.length >= 2
      ? filteredData
      : filteredData.length === 1
        ? [filteredData[0]!, filteredData[0]!]
        : [];
  const hasChart = rawPts.length >= 2;
  const pts = hasChart ? rawPts : [0, 1]; // safe fallback so math never divides by 0
  // Prefer the last non-zero value if caller passed 0
  const lastNonZero =
    filteredData.length > 0 ? filteredData[filteredData.length - 1]! : null;
  const countN = count != null ? toEmployeeCountNumber(count) : null;
  const last =
    countN != null && countN > 0 ? countN : lastNonZero;

  const dataMin = Math.min(...pts);
  const dataMax = Math.max(...pts);

  const ticks = buildYTicks(dataMin, dataMax, 5);
  const yMin = ticks[0]!;
  const yMax = ticks[ticks.length - 1]!;
  const ySpan = yMax > yMin ? yMax - yMin : 1;

  const W = 460, H = 180;
  const padL = 44, padR = 8, padT = 6, padB = 20;
  const iW = W - padL - padR;
  const iH = H - padT - padB;

  const cx = (i: number) => padL + (i / (pts.length - 1)) * iW;
  const cy = (v: number) => padT + (1 - (v - yMin) / ySpan) * iH;

  const seriesPoints = React.useMemo(() => {
    const points: { value: number; dateLabel: string }[] = [];
    if (dates && dates.length === numericData.length) {
      numericData.forEach((v, i) => {
        if (!hasAnyNonZero || v > 0) {
          points.push({
            value: v,
            dateLabel: formatTooltipMonthYear(dates[i]!),
          });
        }
      });
    } else {
      pts.forEach((v) => points.push({ value: v, dateLabel: "" }));
    }
    return points;
  }, [dates, numericData, hasAnyNonZero, pts]);

  const linePath = pts
    .map((v, i) => `${i ? "L" : "M"}${cx(i).toFixed(1)} ${cy(v).toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L${cx(pts.length - 1)} ${padT + iH} L${padL} ${padT + iH} Z`;

  // X-axis: up to 5 ticks, placed at actual series indices (not fake even spacing)
  const xAxisTicks: { i: number; label: string }[] = (() => {
    if (!hasChart) return [];
    const filteredDates: string[] = [];
    if (dates && dates.length === numericData.length) {
      numericData.forEach((v, i) => {
        if (!hasAnyNonZero || v > 0) filteredDates.push(dates[i]!);
      });
    }
    if (filteredDates.length < 2) return [];
    const n = filteredDates.length;
    const rawIdx =
      n <= 5
        ? Array.from({ length: n }, (_, j) => j)
        : [0, Math.round(n * 0.25), Math.round(n * 0.5), Math.round(n * 0.75), n - 1];
    const uniqueIdx = rawIdx.filter((v, j, arr) => arr.indexOf(v) === j);
    return uniqueIdx
      .map((i) => ({ i, label: formatAxisMonthYear(filteredDates[i]!) }))
      .filter((t) => t.label.length > 0);
  })();

  /** Line stroke: blue-grey (ref), distinct from bright axis accent */
  const lineStroke = "oklch(40% 0.06 258)";

  const linkedinIcon = linkedinUrl ? (
    <Link
      href={linkedinUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 22,
        height: 22,
        backgroundColor: T.azure,
        borderRadius: 4,
        color: "#fff",
        textDecoration: "none",
        flexShrink: 0,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    </Link>
  ) : null;

  return (
    <LinkPanel fillGridCell={fillGridCell}>
      <LinkedH
        right={yoyLabel ? <Delta value={yoyLabel} /> : undefined}
        showArrow
        leftSlot={linkedinIcon}
      >
        LinkedIn employee count
      </LinkedH>

      <div
        style={{
          padding: "10px 14px 10px",
          flex: 1,
          minHeight: 0,
          minWidth: 0,
        }}
      >
        {/* Headline count + subtitle inline, vertically centered */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 6,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: T.ink,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: -0.5,
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            {last != null && last > 0 ? last.toLocaleString() : "-"}
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: T.muted,
              lineHeight: 1.35,
              paddingTop: 1,
            }}
          >
            Total employees{asOf ? ` · ${asOf}` : ""}
            {historyLabel ? ` · ${historyLabel}` : ""}
          </div>
        </div>

        {/* SVG chart */}
        {hasChart && (
          <div style={{ position: "relative", flexShrink: 0, minWidth: 0 }}>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              width="100%"
              height="auto"
              style={{ display: "block", overflow: "visible", aspectRatio: `${W} / ${H}` }}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <defs>
                <linearGradient id={`hcg-${id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.azure} stopOpacity={0.14} />
                  <stop offset="55%" stopColor={T.azure} stopOpacity={0.05} />
                  <stop offset="100%" stopColor={T.azure} stopOpacity={0} />
                </linearGradient>
              </defs>

              {/* Grid lines + Y labels */}
              {ticks.map((t) => {
                const yy = cy(t);
                return (
                  <g key={t}>
                    <line
                      x1={padL}
                      x2={W - padR}
                      y1={yy}
                      y2={yy}
                      stroke={T.hair}
                      strokeWidth={1}
                      strokeDasharray="4 4"
                    />
                    <text
                      x={padL - 6}
                      y={yy + 3}
                      textAnchor="end"
                      fontSize={10}
                      fontFamily={T.sans}
                      fill={T.muted}
                    >
                      {t.toLocaleString()}
                    </text>
                  </g>
                );
              })}

              {/* X-axis labels — x = cx(i) so labels line up with the line chart */}
              {xAxisTicks.map(({ i: xi, label }) => (
                <text
                  key={`${xi}-${label}`}
                  x={cx(xi)}
                  y={H - 4}
                  textAnchor="middle"
                  fontSize={10}
                  fontFamily={T.sans}
                  fill={T.muted}
                >
                  {label}
                </text>
              ))}

              {/* Area fill */}
              <path d={areaPath} fill={`url(#hcg-${id})`} />

              {/* Line */}
              <path
                d={linePath}
                fill="none"
                stroke={lineStroke}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {/* Hover targets + highlight */}
              {seriesPoints.map((pt, i) => (
                <g key={`pt-${i}-${pt.value}`}>
                  <circle
                    cx={cx(i)}
                    cy={cy(pt.value)}
                    r={14}
                    fill="transparent"
                    style={{ cursor: pt.dateLabel ? "pointer" : "default" }}
                    onMouseEnter={() => setHoveredIndex(i)}
                  />
                  {hoveredIndex === i && (
                    <>
                      <line
                        x1={cx(i)}
                        x2={cx(i)}
                        y1={padT}
                        y2={padT + iH}
                        stroke={T.azure}
                        strokeWidth={1}
                        strokeOpacity={0.35}
                      />
                      <circle
                        cx={cx(i)}
                        cy={cy(pt.value)}
                        r={4}
                        fill={T.azure}
                      />
                      <circle
                        cx={cx(i)}
                        cy={cy(pt.value)}
                        r={7}
                        fill={T.azure}
                        fillOpacity={0.18}
                      />
                    </>
                  )}
                </g>
              ))}

              {/* End dot (when not hovered) */}
              {hoveredIndex !== pts.length - 1 && (
                <>
                  <circle
                    cx={cx(pts.length - 1)}
                    cy={cy(pts[pts.length - 1])}
                    r={3.5}
                    fill={lineStroke}
                  />
                  <circle
                    cx={cx(pts.length - 1)}
                    cy={cy(pts[pts.length - 1])}
                    r={6}
                    fill={lineStroke}
                    fillOpacity={0.15}
                  />
                </>
              )}
            </svg>

            {hoveredIndex != null && seriesPoints[hoveredIndex]?.dateLabel ? (
              <div
                style={{
                  position: "absolute",
                  left: `${(cx(hoveredIndex) / W) * 100}%`,
                  top: `${(cy(seriesPoints[hoveredIndex]!.value) / H) * 100}%`,
                  transform: "translate(-50%, calc(-100% - 10px))",
                  backgroundColor: "#ffffff",
                  border: "1px solid #ccc",
                  borderRadius: 4,
                  padding: 10,
                  pointerEvents: "none",
                  zIndex: 2,
                  fontFamily: T.sans,
                  fontSize: 13,
                  lineHeight: 1.4,
                  whiteSpace: "nowrap",
                  boxShadow: "0 2px 8px rgba(15,17,21,0.08)",
                }}
              >
                <p style={{ margin: 0, color: T.body }}>
                  {`Date: ${seriesPoints[hoveredIndex]!.dateLabel}`}
                </p>
                <p style={{ margin: 0, color: T.azure }}>
                  {`Employees: ${seriesPoints[hoveredIndex]!.value.toLocaleString()}`}
                </p>
              </div>
            ) : null}
          </div>
        )}

      </div>
    </LinkPanel>
  );
}
