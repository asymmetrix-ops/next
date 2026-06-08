"use client";
/**
 * AIRiskCard — hand-built SVG radar chart (AI Exposure Index: risk vs. defensibility).
 * No charting library; click axes to show tier + blurb detail.
 */
import React, { useState } from "react";
import { T } from "./tokens.jsx";
import {
  AI_SCORE_MAX,
  scoreToTierName,
  sortAiRiskAxesForRadar,
} from "@/lib/companyAiRisks";

export const AI_EXPOSURE_INDEX_TITLE = "AI Exposure Index";

/** Headline tiers from mean axis scores (each axis is 1–3). */
export function getAiExposureHeadline(
  defAvg: number,
  riskAvg: number
): { label: string; hint: string } {
  if (defAvg >= 2.5 && riskAvg <= 2) {
    return {
      label: "Strong overall moat vs. AI",
      hint: "Shown when average defensibility is ≥ 2.5/3 and average risk is ≤ 2.0/3.",
    };
  }
  if (defAvg >= 2 && riskAvg <= 2.3) {
    return {
      label: "Resilient — selective AI exposure",
      hint: "Shown when average defensibility is ≥ 2.0/3 and average risk is ≤ 2.3/3.",
    };
  }
  if (defAvg >= 1.5 || riskAvg <= 2.5) {
    return {
      label: "Moderate — partial exposure",
      hint: "Shown when defensibility is ≥ 1.5/3 or risk is ≤ 2.5/3 (and stronger tiers do not apply).",
    };
  }
  return {
    label: "Limited — AI substitution risk",
    hint: "Shown when defensibility is below 1.5/3 and risk is above 2.5/3.",
  };
}

export type AIRiskAxisGroup = "risk" | "def";

export type AIRiskAxis = {
  key: string;
  label: string;
  score: number;
  group: AIRiskAxisGroup;
  tier: string;
  blurb: string;
};

export const AI_RISK_AXES: AIRiskAxis[] = [
  {
    key: "replic",
    label: "Replicability",
    score: 3,
    group: "risk",
    tier: "High",
    blurb:
      "AI can classify merchants and infer spending patterns from partial data, but cannot reconstruct transactions never captured through permissioned card relationships.",
  },
  {
    key: "accuracy",
    label: "Accuracy Matters",
    score: 3,
    group: "risk",
    tier: "High",
    blurb:
      "Outputs inform campaign ROI, audience targeting and merchant-funded offers — users will not swap observed purchase data for AI-generated estimates where budgets are at stake.",
  },
  {
    key: "stakes",
    label: "Value at Stake",
    score: 3,
    group: "risk",
    tier: "High",
    blurb:
      "Dataset supports decisions across media spend, retail-media investment and bank engagement — real purchase evidence outweighs modelled intent.",
  },
  {
    key: "workflow",
    label: "Workflow Moat",
    score: 2,
    group: "def",
    tier: "Moderate",
    blurb:
      "Embedded in marketing workflows via Snowflake Marketplace, AWS Clean Rooms, MS Curate for Commerce — moat deepens with recurring campaign use.",
  },
  {
    key: "authority",
    label: "Authority",
    score: 2,
    group: "def",
    tier: "Moderate",
    blurb:
      "Observed spending behaviour beats survey- or impression-based proxies, but it is not the only source of truth for purchase measurement.",
  },
  {
    key: "history",
    label: "Historical Data",
    score: 3,
    group: "def",
    tier: "High",
    blurb:
      "AI can analyse historical data once it exists, but cannot reconstruct a comparable permissioned transaction history after the fact.",
  },
];

const GROUP_TONE = {
  risk: {
    fg: "oklch(50% 0.18 25)",
    fill: "oklch(62% 0.20 25)",
    bg: "oklch(96% 0.035 25)",
    ring: "oklch(72% 0.14 25)",
    label: "Risk",
  },
  def: {
    fg: "oklch(40% 0.12 158)",
    fill: "oklch(56% 0.13 158)",
    bg: "oklch(95% 0.05 158)",
    ring: "oklch(60% 0.14 158)",
    label: "Defensibility",
  },
} as const;

type Tone = {
  fg: string;
  fill?: string;
  bg: string;
  ring: string;
};

function tierTone(score: number, group?: AIRiskAxisGroup): Tone {
  if (group && GROUP_TONE[group]) return GROUP_TONE[group];
  const s = Math.round(Math.min(AI_SCORE_MAX, Math.max(1, score)));
  if (s >= 3)
    return { fg: T.up, bg: "oklch(95% 0.06 150)", ring: "oklch(65% 0.16 150)" };
  if (s >= 2)
    return { fg: T.signal, bg: T.signalSoft, ring: "oklch(72% 0.13 48)" };
  return { fg: T.down, bg: "oklch(95% 0.05 25)", ring: "oklch(70% 0.14 25)" };
}

type RadarChartProps = {
  axes: AIRiskAxis[];
  active: string;
  onPick?: (key: string) => void;
  size?: number;
  maxScore?: number;
};

// Extra viewBox space (in SVG user units) reserved for axis labels on each side.
const RADAR_PAD_H = 78;
const RADAR_PAD_V = 28;

function RadarChart({
  axes,
  active,
  onPick,
  size = 280,
  maxScore = AI_SCORE_MAX,
}: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.38;
  const N = axes.length;
  const angleFor = (i: number) => -Math.PI / 2 + (i / N) * Math.PI * 2;
  const point = (i: number, r: number): [number, number] => {
    const a = angleFor(i);
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };

  const rings: React.ReactNode[] = [];
  for (let s = 1; s <= maxScore; s++) {
    const r = (s / maxScore) * R;
    const pts = axes.map((_, i) => point(i, r).join(",")).join(" ");
    rings.push(
      <polygon
        key={s}
        points={pts}
        fill={s === maxScore ? T.azureSoft : "transparent"}
        fillOpacity={s === maxScore ? 0.45 : 0}
        stroke={s === maxScore ? "oklch(80% 0.05 258)" : T.hair}
        strokeWidth={1}
        strokeDasharray={s === maxScore ? "0" : "2 3"}
      />
    );
  }

  const spokes = axes.map((ax, i) => {
    const [x, y] = point(i, R);
    const isActive = active === ax.key;
    return (
      <line
        key={ax.key}
        x1={cx}
        y1={cy}
        x2={x}
        y2={y}
        stroke={isActive ? T.azure : T.divider}
        strokeWidth={isActive ? 1.5 : 1}
      />
    );
  });

  const groupRuns: Array<{
    group: AIRiskAxisGroup;
    start: number;
    end: number;
    wraps?: boolean;
  }> = [];
  {
    let cur: (typeof groupRuns)[number] | null = null;
    axes.forEach((ax, i) => {
      if (!cur || cur.group !== ax.group) {
        cur = { group: ax.group, start: i, end: i };
        groupRuns.push(cur);
      } else {
        cur.end = i;
      }
    });
    if (
      groupRuns.length > 1 &&
      groupRuns[0].group === groupRuns[groupRuns.length - 1].group
    ) {
      const last = groupRuns.pop()!;
      groupRuns[0].start = last.start;
      groupRuns[0].wraps = true;
    }
  }

  const wedges = groupRuns.map((run) => {
    const tone = GROUP_TONE[run.group] || GROUP_TONE.def;
    const runIdx: number[] = [];
    if (run.wraps) {
      for (let i = run.start; i < N; i++) runIdx.push(i);
      for (let i = 0; i <= run.end; i++) runIdx.push(i);
    } else {
      for (let i = run.start; i <= run.end; i++) runIdx.push(i);
    }
    const firstIdx = runIdx[0];
    const lastIdx = runIdx[runIdx.length - 1];
    const prevIdx = (firstIdx - 1 + N) % N;
    const nextIdx = (lastIdx + 1) % N;
    const halfStep = Math.PI / N;
    const startAngle = angleFor(firstIdx) - halfStep;
    const endAngle = angleFor(lastIdx) + halfStep;
    const startScore = (axes[prevIdx].score + axes[firstIdx].score) / 2;
    const endScore = (axes[lastIdx].score + axes[nextIdx].score) / 2;

    const pts: [number, number][] = [[cx, cy]];
    pts.push([
      cx + Math.cos(startAngle) * (startScore / maxScore) * R,
      cy + Math.sin(startAngle) * (startScore / maxScore) * R,
    ]);
    runIdx.forEach((i) => pts.push(point(i, (axes[i].score / maxScore) * R)));
    pts.push([
      cx + Math.cos(endAngle) * (endScore / maxScore) * R,
      cy + Math.sin(endAngle) * (endScore / maxScore) * R,
    ]);

    return (
      <polygon
        key={`${run.group}-${run.start}`}
        points={pts.map((p) => p.join(",")).join(" ")}
        fill={tone.fill}
        fillOpacity="0.22"
        stroke={tone.fill}
        strokeOpacity="0.85"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    );
  });

  const dots = axes.map((ax, i) => {
    const [x, y] = point(i, (ax.score / maxScore) * R);
    const tone = tierTone(ax.score, ax.group);
    const isActive = active === ax.key;
    return (
      <g
        key={ax.key}
        style={{ cursor: "pointer" }}
        onClick={(e) => {
          e.stopPropagation();
          onPick?.(ax.key);
        }}
      >
        <circle
          cx={x}
          cy={y}
          r={isActive ? 9 : 6}
          fill={tone.fill || tone.fg}
          fillOpacity={isActive ? 0.22 : 0}
        />
        <circle
          cx={x}
          cy={y}
          r={isActive ? 4.5 : 3.6}
          fill={tone.fill || tone.fg}
          stroke="#fff"
          strokeWidth="1.6"
        />
      </g>
    );
  });

  const labels = axes.map((ax, i) => {
    const a = angleFor(i);
    const lr = R + 22;
    const lx = cx + Math.cos(a) * lr;
    const ly = cy + Math.sin(a) * lr;
    const anchor =
      Math.abs(Math.cos(a)) < 0.2
        ? "middle"
        : Math.cos(a) > 0
          ? "start"
          : "end";
    const isActive = active === ax.key;
    return (
      <g
        key={`lbl-${ax.key}`}
        style={{ cursor: "pointer" }}
        onClick={(e) => {
          e.stopPropagation();
          onPick?.(ax.key);
        }}
      >
        <text
          x={lx}
          y={ly}
          textAnchor={anchor}
          dominantBaseline="middle"
          fontFamily={T.sans}
          fontSize="11"
          fontWeight={isActive ? 700 : 600}
          fill={isActive ? T.ink : T.body}
          style={{ letterSpacing: 0.1 }}
        >
          {ax.label}
        </text>
        <text
          x={lx}
          y={ly + 13}
          textAnchor={anchor}
          dominantBaseline="middle"
          fontFamily={T.sans}
          fontSize="10"
          fill={T.muted}
        >
          {scoreToTierName(ax.score)}
        </text>
      </g>
    );
  });

  return (
    <svg
      viewBox={`${-RADAR_PAD_H} ${-RADAR_PAD_V} ${size + 2 * RADAR_PAD_H} ${size + 2 * RADAR_PAD_V}`}
      width="100%"
      height={size}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block" }}
    >
      {rings}
      {spokes}
      {wedges}
      {dots}
      {labels}
    </svg>
  );
}

type AIRiskCardProps = {
  axes?: AIRiskAxis[];
  defaultActiveKey?: string;
  /** Stretch to fill a tall grid cell (product row, col 3). */
  fillGridCell?: boolean;
};

export function AIRiskCard({
  axes: axesProp,
  defaultActiveKey = "replic",
  fillGridCell = false,
}: AIRiskCardProps) {
  const axes = React.useMemo(
    () =>
      axesProp?.length ? sortAiRiskAxesForRadar(axesProp) : [],
    [axesProp]
  );
  const hasApiAxes = axes.length > 0;
  const [active, setActive] = useState(defaultActiveKey);
  const [hover, setHover] = useState(false);

  React.useEffect(() => {
    if (!axes.some((a) => a.key === active)) {
      setActive(axes[0]?.key ?? defaultActiveKey);
    }
  }, [axes, active, defaultActiveKey]);

  if (!hasApiAxes) return null;

  const activeAxis = axes.find((a) => a.key === active) || axes[0];
  const tone = tierTone(activeAxis.score, activeAxis.group);

  const riskAxes = axes.filter((a) => a.group === "risk");
  const defAxes = axes.filter((a) => a.group === "def");
  const riskAvg =
    riskAxes.length > 0
      ? riskAxes.reduce((s, a) => s + a.score, 0) / riskAxes.length
      : 0;
  const defAvg =
    defAxes.length > 0
      ? defAxes.reduce((s, a) => s + a.score, 0) / defAxes.length
      : 0;
  const { label: headlineTier, hint: headlineHint } = getAiExposureHeadline(
    defAvg,
    riskAvg
  );

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: T.panel,
        border: `1px solid ${hover ? "oklch(82% 0.07 258)" : T.divider}`,
        borderRadius: T.rLg,
        boxShadow: hover ? "0 4px 20px rgba(35,80,200,0.06)" : "none",
        transition:
          "box-shadow 160ms, border-color 160ms, transform 160ms",
        transform: hover ? "translateY(-1px)" : "translateY(0)",
        width: "100%",
        height: fillGridCell ? "100%" : undefined,
        minHeight: fillGridCell ? 0 : undefined,
        flex: fillGridCell ? "1 1 auto" : undefined,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 14px 10px",
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
          {AI_EXPOSURE_INDEX_TITLE}
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            fontFamily: T.mono,
            fontVariantNumeric: "tabular-nums",
          fontSize: 12,
          color: T.muted,
          flexWrap: "wrap",
          justifyContent: "flex-end",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 2,
                background: GROUP_TONE.risk.fill,
              }}
            />
            <span>Risk {riskAvg.toFixed(1)}/{AI_SCORE_MAX}</span>
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 2,
                background: GROUP_TONE.def.fill,
              }}
            />
            <span>Defensibility {defAvg.toFixed(1)}/{AI_SCORE_MAX}</span>
          </span>
        </span>
      </div>

      <div
        style={{
          padding: "10px 16px 4px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: T.azure,
            flexShrink: 0,
            boxShadow: `0 0 0 4px ${T.azureSoft}`,
          }}
        />
        <div
          title={headlineHint}
          style={{
            fontFamily: T.sans,
            fontSize: 13,
            fontWeight: 600,
            color: T.ink,
            letterSpacing: -0.1,
            cursor: "help",
          }}
        >
          {headlineTier}
        </div>
      </div>

      <div
        style={{
          padding: "4px 12px 0",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: 360 }}>
          <RadarChart
            axes={axes}
            active={active}
            onPick={setActive}
            size={300}
          />
        </div>
      </div>

      <div
        style={{
          margin: "6px 16px 14px",
          marginTop: "auto",
          padding: "10px 12px",
          background: tone.bg,
          border: `1px solid ${tone.ring}`,
          borderRadius: 8,
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 6,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <div
            style={{
              fontFamily: T.sans,
            fontSize: 13,
            fontWeight: 600,
            color: T.ink,
            letterSpacing: -0.1,
          }}
        >
          {activeAxis.label}
          </div>
          <div
            style={{
              fontFamily: T.sans,
              fontSize: 10.5,
              fontWeight: 600,
              color: tone.fg,
              background: "#fff",
              padding: "3px 8px",
              borderRadius: 999,
              border: `1px solid ${tone.ring}`,
              whiteSpace: "nowrap",
            }}
          >
            {activeAxis.tier}
          </div>
        </div>
        <div
          style={{
            fontFamily: T.sans,
            fontSize: 13,
            lineHeight: 1.55,
            color: T.body,
          }}
        >
          {activeAxis.blurb}
        </div>
      </div>
    </div>
  );
}
