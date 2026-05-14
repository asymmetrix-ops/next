"use client";
/**
 * HeadcountCard — redesign/HeadcountCard.jsx converted to TypeScript.
 * Pure-SVG line + area chart with Y-axis ticks and X-axis date labels.
 * No Recharts dependency.
 */
import React from "react";
import Link from "next/link";
import { LinkPanel, LinkedH, Delta, T } from "./primitives";

type Props = {
  /** Monthly headcount values (oldest → newest, min 2 points). */
  data: number[];
  /**
   * ISO date strings aligned with each `data` entry.
   * The card picks 5 evenly-spaced ones for the X-axis after filtering zeros.
   */
  dates?: string[];
  /** Pre-formatted YoY label e.g. "+6.4% YoY". Optional. */
  yoyLabel?: string;
  /** Current (last) employee count. Falls back to last non-zero data point. */
  count?: number;
  /** "As of" label shown under the headline. */
  asOf?: string;
  /** LinkedIn company URL for the footer icon. */
  linkedinUrl?: string;
};

export function HeadcountCard({
  data,
  dates,
  yoyLabel,
  count,
  asOf,
  linkedinUrl,
}: Props) {
  const id = React.useId().replace(/:/g, "");

  // Mirror EmployeeChart: strip zero entries so the chart doesn't flat-line
  const hasAnyNonZero = data.some((v) => v > 0);
  const filteredData = hasAnyNonZero ? data.filter((v) => v > 0) : data;

  const rawPts = filteredData.length >= 2 ? filteredData : [];
  const hasChart = rawPts.length >= 2;
  const pts = hasChart ? rawPts : [0, 1]; // safe fallback so math never divides by 0
  // Prefer the last non-zero value if caller passed 0
  const lastNonZero = filteredData.length > 0 ? filteredData[filteredData.length - 1] : null;
  const last = count != null && count > 0 ? count : lastNonZero;

  const dataMin = Math.min(...pts);
  const dataMax = Math.max(...pts);

  // Nice Y-axis ticks — always ensure yMax > yMin to avoid division-by-zero
  const niceStep = (() => {
    const r = dataMax - dataMin;
    if (r > 4000) return 2000;
    if (r > 1500) return 1000;
    if (r > 800) return 500;
    if (r > 200) return 200;
    return 100;
  })();
  const yMin = Math.floor(dataMin / niceStep) * niceStep;
  const yMaxRaw = Math.ceil(dataMax / niceStep) * niceStep;
  const yMax = yMaxRaw > yMin ? yMaxRaw : yMin + niceStep; // guarantee yMax > yMin
  const ticks: number[] = [];
  for (let v = yMin; v <= yMax; v += niceStep) ticks.push(v);

  const W = 460, H = 150;
  const padL = 44, padR = 8, padT = 8, padB = 22;
  const iW = W - padL - padR;
  const iH = H - padT - padB;

  const cx = (i: number) => padL + (i / (pts.length - 1)) * iW;
  const cy = (v: number) => padT + (1 - (v - yMin) / (yMax - yMin)) * iH;

  const linePath = pts
    .map((v, i) => `${i ? "L" : "M"}${cx(i).toFixed(1)} ${cy(v).toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L${cx(pts.length - 1)} ${padT + iH} L${padL} ${padT + iH} Z`;

  // Build x-axis labels from the filtered date strings
  const autoXLabels: string[] = (() => {
    if (!hasChart || pts.length < 5) return [];
    // Build filtered dates aligned with filteredData
    const filteredDates: string[] = [];
    if (dates && dates.length === data.length) {
      data.forEach((v, i) => {
        if (!hasAnyNonZero || v > 0) filteredDates.push(dates[i]);
      });
    }
    if (filteredDates.length < 2) return [];
    const n = filteredDates.length;
    const indices = [0, Math.round(n * 0.25), Math.round(n * 0.5), Math.round(n * 0.75), n - 1];
    const unique = indices.filter((v, i, arr) => arr.indexOf(v) === i);
    return unique.map((idx) => {
      try {
        const d = new Date(filteredDates[idx]);
        return `${d.toLocaleString("en-US", { month: "short" })} '${String(d.getFullYear()).slice(2)}`;
      } catch { return ""; }
    });
  })();

  return (
    <LinkPanel>
      <LinkedH
        right={yoyLabel ? <Delta value={yoyLabel} /> : undefined}
        showArrow={!yoyLabel}
      >
        LinkedIn employee count
      </LinkedH>

      <div style={{ padding: "20px 18px 14px" }}>
        {/* Headline count */}
        <div
          style={{
            fontSize: 32,
            fontWeight: 600,
            color: T.ink,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: -0.6,
            lineHeight: 1.1,
          }}
        >
          {last != null && last > 0 ? last.toLocaleString() : "—"}
        </div>
        <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
          Total full-time employees{asOf ? ` · ${asOf}` : ""}
        </div>

        {/* SVG chart */}
        {hasChart && (
          <div style={{ marginTop: 18 }}>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              width="100%"
              height={H}
              style={{ display: "block", overflow: "visible" }}
            >
              <defs>
                <linearGradient id={`hcg-${id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.azure} stopOpacity={0.18} />
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
                    />
                    <text
                      x={padL - 6}
                      y={yy + 3}
                      textAnchor="end"
                      fontSize={9.5}
                      fontFamily={T.mono}
                      fill={T.faint}
                    >
                      {t.toLocaleString()}
                    </text>
                  </g>
                );
              })}

              {/* X-axis labels */}
              {autoXLabels.map((label, i) => {
                const xx =
                  autoXLabels.length > 1
                    ? padL + (i / (autoXLabels.length - 1)) * iW
                    : padL;
                return (
                  <text
                    key={label}
                    x={xx}
                    y={H - 4}
                    textAnchor="middle"
                    fontSize={9.5}
                    fontFamily={T.mono}
                    fill={T.faint}
                  >
                    {label}
                  </text>
                );
              })}

              {/* Area fill */}
              <path d={areaPath} fill={`url(#hcg-${id})`} />

              {/* Line */}
              <path
                d={linePath}
                fill="none"
                stroke={T.azure}
                strokeWidth={1.75}
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {/* End dot */}
              <circle
                cx={cx(pts.length - 1)}
                cy={cy(pts[pts.length - 1])}
                r={3.5}
                fill={T.azure}
              />
              <circle
                cx={cx(pts.length - 1)}
                cy={cy(pts[pts.length - 1])}
                r={6}
                fill={T.azure}
                fillOpacity={0.18}
              />
            </svg>
          </div>
        )}

        {/* LinkedIn link */}
        {linkedinUrl && (
          <div
            style={{
              marginTop: 14,
              paddingTop: 14,
              borderTop: `1px solid ${T.hair}`,
            }}
          >
            <Link
              href={linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 30,
                height: 30,
                backgroundColor: "#0077b5",
                borderRadius: 6,
                color: "white",
                textDecoration: "none",
              }}
            >
              <svg
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </Link>
          </div>
        )}
      </div>
    </LinkPanel>
  );
}
