"use client";

import React from "react";
import type { FiBenchmarkMetricRow, FiHeadlineMetric } from "@/lib/financialIntelligence/types";
import { DistBar, PercentileBar, PctPill } from "./benchmark-viz";

const FONT = "var(--font-sans)";

function fmtMetric(
  value: number | null,
  format: "percent" | "multiple" | "currency"
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (format === "currency") {
    const n = Math.abs(value);
    if (n >= 1000) return `$${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}b`;
    return `$${value.toFixed(0)}m`;
  }
  if (format === "percent") {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
  }
  return `${value.toFixed(1)}x`;
}

function fmtDelta(
  delta: number | null,
  format: "percent" | "multiple" | "currency",
  higherIsBetter: boolean
): { text: string; positive: boolean | null } {
  if (delta == null || !Number.isFinite(delta)) return { text: "—", positive: null };
  const sign = delta > 0 ? "+" : "";
  let text: string;
  if (format === "percent") text = `${sign}${delta.toFixed(1)}pts vs median`;
  else if (format === "currency") text = `${sign}$${Math.abs(delta).toFixed(0)}m vs median`;
  else text = `${sign}${delta.toFixed(1)}x vs median`;
  const positive = higherIsBetter ? delta >= 0 : delta <= 0;
  return { text, positive };
}

interface CompositeHeroProps {
  compositePercentile: number | null;
  targetName?: string;
  peerCount?: number;
}

export function CompositeHero({
  compositePercentile,
  targetName,
  peerCount,
}: CompositeHeroProps) {
  const score = compositePercentile ?? 0;
  return (
    <div
      style={{
        background: "linear-gradient(165deg, var(--ax-cyan-900), var(--ax-cyan-950))",
        color: "white",
        borderRadius: "var(--r-lg)",
        padding: "16px 18px",
        minHeight: 132,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        fontFamily: FONT,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.6)",
          }}
        >
          Composite percentile
        </div>
        {targetName != null && peerCount != null && (
          <div style={{ fontSize: "var(--fs-12)", color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
            {targetName} vs {peerCount} peers
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 10 }}>
        <span
          style={{
            fontSize: "var(--fs-40)",
            fontWeight: 800,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {compositePercentile ?? "—"}
        </span>
        {compositePercentile != null && (
          <span style={{ fontSize: "var(--fs-16)", fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
            / 100
          </span>
        )}
      </div>
      <div
        style={{
          marginTop: 10,
          height: 6,
          background: "rgba(255,255,255,0.15)",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${score}%`,
            height: "100%",
            background: "var(--ax-cyan-400)",
            borderRadius: 3,
          }}
        />
      </div>
    </div>
  );
}

export function HeadlineMetricCards({ metrics }: { metrics: FiHeadlineMetric[] }) {
  return (
    <>
      {metrics.map((metric) => {
        const delta = fmtDelta(metric.deltaVsMedian, metric.format, metric.higherIsBetter);
        return (
          <div
            key={metric.key}
            style={{
              background: "white",
              border: "1px solid var(--border-1)",
              borderRadius: "var(--r-lg)",
              padding: "14px 16px",
              minHeight: 132,
              display: "flex",
              flexDirection: "column",
              fontFamily: FONT,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div
                style={{
                  fontSize: "var(--fs-13)",
                  fontWeight: 600,
                  color: "var(--fg-3)",
                }}
              >
                {metric.label}
              </div>
              <PctPill pct={metric.percentile} small />
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
              <span
                style={{
                  fontSize: "var(--fs-28)",
                  fontWeight: 700,
                  color: "var(--fg-1)",
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-0.01em",
                }}
              >
                {fmtMetric(metric.targetValue, metric.format)}
              </span>
              {delta.positive != null && (
                <span
                  style={{
                    fontSize: "var(--fs-13)",
                    fontWeight: 600,
                    color: delta.positive ? "var(--ax-positive)" : "var(--ax-negative)",
                  }}
                >
                  {delta.text.split(" vs")[0]}{" "}
                  <span style={{ color: "var(--fg-4)", fontWeight: 500 }}>vs median</span>
                </span>
              )}
            </div>
            <div style={{ marginTop: 14 }}>
              <PercentileBar pct={metric.percentile} />
            </div>
          </div>
        );
      })}
    </>
  );
}

interface BenchmarkTableProps {
  rows: FiBenchmarkMetricRow[];
  targetName: string;
}

export function BenchmarkTable({ rows, targetName }: BenchmarkTableProps) {
  const th: React.CSSProperties = {
    padding: "10px 16px",
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "var(--fg-3)",
    borderBottom: "1px solid var(--border-1)",
    background: "var(--ax-gray-25)",
    fontFamily: FONT,
  };

  return (
    <div
      style={{
        background: "white",
        border: "1px solid var(--border-1)",
        borderRadius: "var(--r-lg)",
        overflow: "auto",
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "180px 92px 92px 1fr 96px 92px",
          alignItems: "center",
          minWidth: 720,
        }}
      >
        <div style={{ ...th }}>Metric</div>
        <div style={{ ...th, textAlign: "right" }}>{targetName}</div>
        <div style={{ ...th, textAlign: "right" }}>Peer median</div>
        <div style={{ ...th, paddingLeft: 16 }}>Distribution</div>
        <div style={{ ...th, textAlign: "center" }}>Percentile</div>
        <div style={{ ...th, textAlign: "center" }}>Rank</div>

        {rows.map((row, index) => {
          const delta = fmtDelta(row.deltaVsMedian, row.format, row.higherIsBetter);
          const isLast = index === rows.length - 1;
          const cellBorder = isLast ? "none" : "1px solid var(--ax-gray-100)";

          return (
            <React.Fragment key={String(row.key)}>
              <div
                style={{
                  padding: "10px 16px",
                  borderBottom: cellBorder,
                  fontSize: "var(--fs-13)",
                  color: "var(--fg-2)",
                }}
              >
                <div style={{ fontWeight: 600, color: "var(--fg-1)" }}>{row.label}</div>
                <div style={{ fontSize: 10, color: "var(--fg-4)", marginTop: 2 }}>
                  {row.higherIsBetter ? "↑ better" : "↓ cheaper"}
                </div>
              </div>
              <div
                style={{
                  padding: "10px 16px",
                  borderBottom: cellBorder,
                  textAlign: "right",
                  fontWeight: 600,
                  fontSize: "var(--fs-13)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {fmtMetric(row.targetValue, row.format)}
              </div>
              <div
                style={{
                  padding: "10px 16px",
                  borderBottom: cellBorder,
                  textAlign: "right",
                  color: "var(--fg-3)",
                  fontSize: "var(--fs-13)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <div>{fmtMetric(row.peerMedian, row.format)}</div>
                {delta.positive != null && (
                  <div
                    style={{
                      fontSize: 10,
                      marginTop: 2,
                      color: delta.positive ? "var(--ax-positive)" : "var(--ax-negative)",
                    }}
                  >
                    {delta.text.split(" vs")[0]}
                  </div>
                )}
              </div>
              <div style={{ padding: "10px 16px", borderBottom: cellBorder, paddingLeft: 16 }}>
                <DistBar
                  target={row.targetValue}
                  min={row.min}
                  max={row.max}
                  q1={row.q1}
                  q3={row.q3}
                  median={row.peerMedian}
                  percentile={row.percentile}
                  peerValues={row.peerValues}
                  formatValue={(v) => fmtMetric(v, row.format)}
                />
              </div>
              <div
                style={{
                  padding: "10px 16px",
                  borderBottom: cellBorder,
                  textAlign: "center",
                }}
              >
                <PctPill pct={row.percentile} />
              </div>
              <div
                style={{
                  padding: "10px 16px",
                  borderBottom: cellBorder,
                  textAlign: "center",
                  fontSize: "var(--fs-13)",
                  color: "var(--fg-2)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {row.rank != null && row.rankTotal != null ? (
                  <>
                    <strong style={{ color: "var(--fg-1)", fontWeight: 700 }}>#{row.rank}</strong>{" "}
                    <span style={{ color: "var(--fg-4)" }}>/ {row.rankTotal}</span>
                  </>
                ) : (
                  "—"
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "10px 16px",
          fontSize: 11.5,
          color: "var(--fg-3)",
          flexWrap: "wrap",
          borderTop: "1px solid var(--border-1)",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 13,
              height: 13,
              borderRadius: "50%",
              background: "var(--ax-positive)",
              border: "2px solid white",
              boxShadow: "0 0 0 1px var(--ax-positive)",
            }}
          />
          Target
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "var(--ax-gray-400)",
            }}
          />
          Peer
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 2, height: 12, background: "var(--ax-gray-600)" }} />
          Median
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 20, height: 8, background: "var(--ax-gray-200)", borderRadius: 2 }} />
          IQR (Q1–Q3)
        </span>
      </div>
    </div>
  );
}

/** @deprecated Use CompositeHero + HeadlineMetricCards */
export function HeadStatCards({
  compositePercentile,
  peerCount,
  isDefaultMode,
  targetFinancialYear,
}: {
  compositePercentile: number | null;
  peerCount: number;
  isDefaultMode: boolean;
  targetFinancialYear: number | null;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, fontFamily: FONT }}>
      <CompositeHero compositePercentile={compositePercentile} />
      <div style={{ gridColumn: "span 2", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ background: "white", border: "1px solid var(--border-1)", borderRadius: "var(--r-lg)", padding: 16 }}>
          <div style={{ fontSize: 10, color: "var(--fg-3)", fontWeight: 700 }}>PEERS</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{peerCount}</div>
          <div style={{ fontSize: 12, color: "var(--fg-3)" }}>
            {isDefaultMode ? "Default peer set" : "Filtered peer set"}
          </div>
        </div>
        <div style={{ background: "white", border: "1px solid var(--border-1)", borderRadius: "var(--r-lg)", padding: 16 }}>
          <div style={{ fontSize: 10, color: "var(--fg-3)", fontWeight: 700 }}>TARGET FY</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>
            {targetFinancialYear ? `FY${targetFinancialYear}` : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
