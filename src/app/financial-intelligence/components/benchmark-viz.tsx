"use client";

import React from "react";

const FONT = "var(--font-sans)";

export function ordinalSuffix(n: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

function percentileDotColor(pct: number | null): string {
  if (pct == null) return "var(--fg-3)";
  if (pct >= 60) return "var(--ax-positive)";
  if (pct <= 40) return "var(--ax-negative)";
  return "var(--ax-gray-600)";
}

export interface DistBarProps {
  target: number | null;
  min: number | null;
  max: number | null;
  q1: number | null;
  q3: number | null;
  median: number | null;
  percentile: number | null;
  peerValues: number[];
  height?: number;
  showPeers?: boolean;
  formatValue?: (value: number) => string;
}

/** Distribution bar with IQR band, peer dots, median tick, and target dot. */
export function DistBar({
  target,
  min,
  max,
  q1,
  q3,
  median,
  percentile,
  peerValues,
  height = 26,
  showPeers = true,
  formatValue,
}: DistBarProps) {
  if (min == null || max == null) {
    return <div style={{ height, fontFamily: FONT }} />;
  }

  const targetVal = target ?? min;
  const d0 = Math.min(min, targetVal);
  const d1 = Math.max(max, targetVal);
  const pad = (d1 - d0) * 0.08 || 1;
  const lo = d0 - pad;
  const hi = d1 + pad;
  const span = hi - lo || 1;
  const pos = (v: number) => `${((v - lo) / span) * 100}%`;
  const dotColor = percentileDotColor(percentile);
  const fmt = formatValue ?? ((v: number) => String(v));

  return (
    <div style={{ position: "relative", height, width: "100%", fontFamily: FONT }}>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          height: 3,
          transform: "translateY(-50%)",
          background: "var(--ax-gray-100)",
          borderRadius: 2,
        }}
      />
      {q1 != null && q3 != null && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: pos(q1),
            width: `calc(${pos(q3)} - ${pos(q1)})`,
            height: 10,
            transform: "translateY(-50%)",
            background: "var(--ax-gray-200)",
            borderRadius: 3,
          }}
        />
      )}
      {showPeers &&
        peerValues.map((value, index) => (
          <div
            key={`${value}-${index}`}
            style={{
              position: "absolute",
              top: "50%",
              left: pos(value),
              width: 5,
              height: 5,
              transform: "translate(-50%,-50%)",
              borderRadius: "50%",
              background: "var(--ax-gray-400)",
              opacity: 0.6,
            }}
          />
        ))}
      {median != null && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: pos(median),
            width: 2,
            height: 16,
            transform: "translate(-50%,-50%)",
            background: "var(--ax-gray-600)",
          }}
          title={`Median ${fmt(median)}`}
        />
      )}
      {target != null && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: pos(target),
            width: 13,
            height: 13,
            transform: "translate(-50%,-50%)",
            borderRadius: "50%",
            background: dotColor,
            border: "2.5px solid white",
            boxShadow: `0 0 0 1px ${dotColor}`,
          }}
          title={fmt(target)}
        />
      )}
    </div>
  );
}

export interface PercentileBarProps {
  pct: number | null;
  height?: number;
  showNumber?: boolean;
  showScale?: boolean;
}

/** Four-quartile ranking rail with a pinned target knob — matches the
 * FinancialBenchmark design (discrete blue quartile blocks, not a gradient). */
export function PercentileBar({
  pct,
  height = 9,
  showNumber = true,
  showScale = true,
}: PercentileBarProps) {
  const p = pct == null ? null : Math.max(0, Math.min(100, pct));
  const knobD = 17;
  const clampPos = (v: number) =>
    `clamp(${knobD / 2}px, ${v}%, calc(100% - ${knobD / 2}px))`;

  return (
    <div style={{ width: "100%", fontFamily: FONT }}>
      <div style={{ position: "relative" }}>
        {showNumber && p != null && (
          <span
            style={{
              position: "absolute",
              top: -19,
              left: clampPos(p),
              transform: "translateX(-50%)",
              fontSize: 11,
              fontWeight: 800,
              lineHeight: 1,
              color: "var(--ax-cyan-700)",
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
            }}
          >
            {ordinalSuffix(p)}
          </span>
        )}
        <div style={{ position: "relative", height, display: "flex", gap: 3 }}>
          {[0, 1, 2, 3].map((i) => {
            const lo = i * 25;
            const fill =
              p != null && p >= lo + 25
                ? "var(--ax-cyan-500)"
                : p != null && p > lo
                  ? "var(--ax-cyan-200)"
                  : "var(--ax-gray-100)";
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  borderRadius: 2,
                  background: fill,
                }}
              />
            );
          })}
          {p != null && (
            <div
              style={{
                position: "absolute",
                top: -4,
                left: clampPos(p),
                width: knobD,
                height: knobD,
                transform: "translateX(-50%)",
                borderRadius: "50%",
                background: "white",
                border: "2.5px solid var(--ax-cyan-600)",
                boxShadow: "var(--shadow-xs)",
              }}
            />
          )}
        </div>
      </div>
      {showScale && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 7,
            fontSize: 10.5,
            fontWeight: 600,
            color: "var(--ax-gray-400)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <span>0th</span>
          <span>50th (peer median)</span>
          <span>100th</span>
        </div>
      )}
    </div>
  );
}

export interface PctPillProps {
  pct: number | null;
  small?: boolean;
}

/** Ordinal percentile pill with positive / negative / neutral coloring. */
export function PctPill({ pct, small }: PctPillProps) {
  if (pct == null) {
    return <span style={{ color: "var(--fg-4)", fontFamily: FONT }}>—</span>;
  }

  const good = pct >= 67;
  const bad = pct < 34;
  const bg = good
    ? "var(--ax-cyan-50)"
    : bad
      ? "var(--ax-negative-bg)"
      : "var(--ax-gray-50)";
  const fg = good
    ? "var(--ax-cyan-700)"
    : bad
      ? "var(--ax-negative)"
      : "var(--fg-2)";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: 3,
        padding: small ? "2px 7px" : "3px 9px",
        background: bg,
        color: fg,
        borderRadius: "var(--r-pill)",
        fontWeight: 700,
        fontSize: small ? "var(--fs-12)" : "var(--fs-13)",
        fontVariantNumeric: "tabular-nums",
        fontFamily: FONT,
      }}
    >
      {ordinalSuffix(pct)}
      <span style={{ fontSize: small ? 9 : 10, fontWeight: 600, opacity: 0.7 }}>
        pctl
      </span>
    </span>
  );
}
