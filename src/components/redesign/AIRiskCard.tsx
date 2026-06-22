"use client";
/**
 * AIRiskCard — hand-built SVG radar chart (AI Exposure Index: defensibility only).
 * No charting library; click axes to highlight on the radar.
 */
import React, { useState } from "react";
import { createPortal } from "react-dom";
import { T } from "./tokens.jsx";
import {
  AI_SCORE_MAX,
  getAiExposureFactorDescription,
  getAiExposureHeadline,
  sortAiRiskAxesForRadar,
} from "@/lib/companyAiRisks";

export const AI_EXPOSURE_INDEX_TITLE = "AI Exposure Index";

export type AIRiskAxis = {
  key: string;
  label: string;
  score: number;
  tier: string;
  blurb: string;
};

function resolveFactorDescription(axis: AIRiskAxis): string | undefined {
  return (
    getAiExposureFactorDescription(axis.key) ??
    getAiExposureFactorDescription(
      axis.label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
    )
  );
}

const DEFENSIBILITY_TONE = {
  fg: "oklch(40% 0.12 158)",
  fill: "oklch(56% 0.13 158)",
  bg: "oklch(95% 0.05 158)",
  ring: "oklch(60% 0.14 158)",
} as const;

type FactorTooltipProps = {
  axis: AIRiskAxis;
  description: string;
  x: number;
  y: number;
};

function FactorTooltip({ axis, description, x, y }: FactorTooltipProps) {
  const [mounted, setMounted] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const [layout, setLayout] = React.useState<{
    x: number;
    y: number;
    above: boolean;
  }>({ x, y, above: true });

  React.useEffect(() => setMounted(true), []);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const pad = 16;
    const gap = 12;
    const halfW = rect.width / 2;
    const clampedX = Math.min(
      window.innerWidth - halfW - pad,
      Math.max(halfW + pad, x)
    );

    const spaceAbove = y - gap;
    const spaceBelow = window.innerHeight - y - gap;
    const above =
      spaceAbove >= rect.height || spaceAbove >= spaceBelow;

    setLayout({
      x: clampedX,
      y: above ? y - gap : y + gap,
      above,
    });
  }, [x, y, description]);

  if (!mounted) return null;

  return createPortal(
    <div
      ref={ref}
      role="tooltip"
      className="fixed z-[10000] w-[min(22.5rem,calc(100vw-2rem))] rounded-lg border border-gray-200 bg-white shadow-xl pointer-events-none"
      style={{
        left: layout.x,
        top: layout.y,
        transform: layout.above
          ? "translate(-50%, -100%)"
          : "translate(-50%, 0)",
      }}
    >
      <div className="border-b border-gray-100 px-4 py-3">
        <div className="text-sm font-semibold text-gray-900">
          {AI_EXPOSURE_INDEX_TITLE}
        </div>
      </div>
      <div className="px-4 py-3">
        <div className="text-sm font-semibold text-gray-900">{axis.label}</div>
        <p className="mt-2 text-[13px] leading-relaxed text-gray-600">
          {description}
        </p>
      </div>
    </div>,
    document.body
  );
}

type RadarChartProps = {
  axes: AIRiskAxis[];
  active: string;
  tooltipKey: string | null;
  onPick?: (key: string) => void;
  onLabelHover?: (key: string | null, event?: React.MouseEvent) => void;
  size?: number;
  maxScore?: number;
};

const LABEL_FONT_SIZE = 14;
const LABEL_LINE_HEIGHT = 17;

// Extra viewBox space (in SVG user units) reserved for axis labels on each side.
const RADAR_PAD_H = 140;
const RADAR_PAD_V = 58;

function wrapLabel(label: string): string[] {
  if (label.includes(" / ")) {
    return label.split(" / ").map((part) => part.trim());
  }

  const maxChars = 24;
  const words = label.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines.length > 0 ? lines : [label];
}

function RadarChart({
  axes,
  active,
  tooltipKey,
  onPick,
  onLabelHover,
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
    return (
      <line
        key={ax.key}
        x1={cx}
        y1={cy}
        x2={x}
        y2={y}
        stroke={T.divider}
        strokeWidth={1}
      />
    );
  });

  const dataPoints = axes.map((ax, i) => point(i, (ax.score / maxScore) * R));
  const dataPolygon = (
    <polygon
      points={dataPoints.map((p) => p.join(",")).join(" ")}
      fill={DEFENSIBILITY_TONE.fill}
      fillOpacity="0.22"
      stroke={DEFENSIBILITY_TONE.fill}
      strokeOpacity="0.85"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  );

  const dots = axes.map((ax, i) => {
    const [x, y] = dataPoints[i];
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
          fill={DEFENSIBILITY_TONE.fill}
          fillOpacity={isActive ? 0.22 : 0}
        />
        <circle
          cx={x}
          cy={y}
          r={isActive ? 4.5 : 3.6}
          fill={DEFENSIBILITY_TONE.fill}
          stroke="#fff"
          strokeWidth="1.6"
        />
      </g>
    );
  });

  const labels = axes.map((ax, i) => {
    const a = angleFor(i);
    const lr = R + 38;
    const lx = cx + Math.cos(a) * lr;
    const ly = cy + Math.sin(a) * lr;
    const anchor =
      Math.abs(Math.cos(a)) < 0.2
        ? "middle"
        : Math.cos(a) > 0
          ? "start"
          : "end";
    const isActive = active === ax.key;
    const isTooltip = tooltipKey === ax.key;
    const lines = wrapLabel(ax.label);
    const totalH = lines.length * LABEL_LINE_HEIGHT;
    const startDy = -(totalH / 2) + LABEL_LINE_HEIGHT / 2;
    const hitW = Math.max(...lines.map((line) => line.length)) * (LABEL_FONT_SIZE * 0.58);
    const hitH = totalH + 8;

    return (
      <g
        key={`lbl-${ax.key}`}
        style={{ cursor: "default" }}
        onMouseEnter={(e) => onLabelHover?.(ax.key, e)}
        onMouseMove={(e) => onLabelHover?.(ax.key, e)}
        onMouseLeave={() => onLabelHover?.(null)}
        onClick={(e) => {
          e.stopPropagation();
          onPick?.(ax.key);
        }}
      >
        <rect
          x={
            anchor === "middle"
              ? lx - hitW / 2
              : anchor === "end"
                ? lx - hitW
                : lx
          }
          y={ly - hitH / 2}
          width={hitW}
          height={hitH}
          fill="transparent"
        />
        <text
          x={lx}
          y={ly}
          textAnchor={anchor}
          fontFamily={T.sans}
          fontSize={LABEL_FONT_SIZE}
          fontWeight={isActive || isTooltip ? 700 : 600}
          fill={isActive || isTooltip ? T.ink : T.body}
          style={{ letterSpacing: 0.1, pointerEvents: "none" }}
        >
          {lines.map((line, li) => (
            <tspan
              key={li}
              x={lx}
              dy={li === 0 ? startDy : LABEL_LINE_HEIGHT}
            >
              {line}
            </tspan>
          ))}
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
      {dataPolygon}
      {dots}
      {labels}
    </svg>
  );
}

type AIRiskCardProps = {
  axes?: AIRiskAxis[];
  avgDefensibility?: number;
  tier?: string;
  defaultActiveKey?: string;
  /** Stretch to fill a tall grid cell (product row, col 3). */
  fillGridCell?: boolean;
};

export function AIRiskCard({
  axes: axesProp,
  avgDefensibility: avgProp,
  tier: tierProp,
  defaultActiveKey = "data_moat",
  fillGridCell = false,
}: AIRiskCardProps) {
  const axes = React.useMemo(
    () =>
      axesProp?.length ? sortAiRiskAxesForRadar(axesProp) : [],
    [axesProp]
  );
  const hasApiAxes = axes.length > 0;
  const [active, setActive] = useState(defaultActiveKey);
  const [tooltipKey, setTooltipKey] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const chartWrapRef = React.useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);

  const handleLabelHover = React.useCallback(
    (key: string | null, event?: React.MouseEvent) => {
      if (!key || !event) {
        setTooltipKey(null);
        setTooltipPos(null);
        return;
      }
      setTooltipKey(key);
      setTooltipPos({
        x: event.clientX,
        y: event.clientY,
      });
    },
    []
  );

  React.useEffect(() => {
    if (!axes.some((a) => a.key === active)) {
      setActive(axes[0]?.key ?? defaultActiveKey);
    }
  }, [axes, active, defaultActiveKey]);

  if (!hasApiAxes) return null;

  const computedAvg =
    axes.reduce((sum, axis) => sum + axis.score, 0) / axes.length;
  const defAvg = avgProp ?? computedAvg;
  const { label: computedTier, hint: headlineHint } =
    getAiExposureHeadline(defAvg);
  const headlineTier = tierProp?.trim() || computedTier;
  const activeAxis = axes.find((a) => a.key === active) ?? axes[0];
  const tooltipAxis = tooltipKey
    ? axes.find((a) => a.key === tooltipKey)
    : undefined;
  const tooltipDescription = tooltipAxis
    ? resolveFactorDescription(tooltipAxis)
    : undefined;

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
            gap: 6,
            fontFamily: T.sans,
            fontSize: 11.5,
            fontWeight: 600,
            color: T.body,
            flexWrap: "wrap",
            justifyContent: "flex-end",
            maxWidth: "62%",
            textAlign: "right",
            lineHeight: 1.35,
          }}
          title={headlineHint}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: 2,
              background: DEFENSIBILITY_TONE.fill,
              flexShrink: 0,
            }}
          />
          <span>{headlineTier}</span>
          <span
            style={{
              fontFamily: T.mono,
              fontWeight: 500,
              fontVariantNumeric: "tabular-nums",
              color: T.muted,
              flexShrink: 0,
            }}
          >
            {defAvg.toFixed(1)} / {AI_SCORE_MAX.toFixed(1)}
          </span>
        </span>
      </div>

      <div
        style={{
          padding: "8px 12px 8px",
          display: "flex",
          justifyContent: "center",
          flex: fillGridCell ? "0 0 auto" : undefined,
        }}
      >
        <div
          ref={chartWrapRef}
          onMouseLeave={() => {
            setTooltipKey(null);
            setTooltipPos(null);
          }}
          style={{
            position: "relative",
            width: "100%",
            maxWidth: 420,
            overflow: "visible",
          }}
        >
          <RadarChart
            axes={axes}
            active={active}
            tooltipKey={tooltipKey}
            onPick={setActive}
            onLabelHover={handleLabelHover}
            size={300}
          />
          {tooltipKey &&
          tooltipDescription &&
          tooltipPos &&
          tooltipAxis ? (
            <FactorTooltip
              axis={tooltipAxis}
              description={tooltipDescription}
              x={tooltipPos.x}
              y={tooltipPos.y}
            />
          ) : null}
        </div>
      </div>

      {activeAxis?.blurb ? (
        <div
          style={{
            margin: "0 14px 14px",
            padding: "12px 14px",
            borderRadius: T.rLg,
            background: DEFENSIBILITY_TONE.bg,
            border: `1px solid ${DEFENSIBILITY_TONE.ring}`,
            flex: fillGridCell ? "1 1 auto" : undefined,
            minHeight: fillGridCell ? 0 : undefined,
            overflowY: fillGridCell ? "auto" : undefined,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <div
              style={{
                fontFamily: T.sans,
                fontSize: 12.5,
                fontWeight: 600,
                color: T.ink,
                lineHeight: 1.35,
              }}
            >
              {activeAxis.label}
            </div>
            <span
              style={{
                fontFamily: T.mono,
                fontSize: 11,
                fontWeight: 600,
                color: DEFENSIBILITY_TONE.fg,
                flexShrink: 0,
              }}
            >
              {activeAxis.tier} · {activeAxis.score.toFixed(1)} /{" "}
              {AI_SCORE_MAX.toFixed(1)}
            </span>
          </div>
          <div
            style={{
              fontFamily: T.sans,
              fontSize: 12.5,
              lineHeight: 1.55,
              color: T.body,
            }}
          >
            {activeAxis.blurb}
          </div>
        </div>
      ) : null}
    </div>
  );
}
