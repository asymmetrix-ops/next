"use client";
/**
 * AIRiskCard — hand-built SVG radar chart (AI Defensibility Index).
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

export const AI_DEFENSIBILITY_INDEX_TITLE = "AI Defensibility Index";

export type AIRiskAxis = {
  key: string;
  label: string;
  score: number;
  tier: string;
  blurb: string;
  /** Company-specific reasoning stored with this factor's rating (empty if none). */
  rationale?: string;
};

type FactorTip = { key: string; kind: "info" | "rationale"; x: number; y: number };

function resolveFactorDescription(axis: AIRiskAxis): string | undefined {
  return (
    getAiExposureFactorDescription(axis.key) ??
    getAiExposureFactorDescription(
      axis.label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
    )
  );
}

const DEFENSIBILITY_TONE = {
  fg: "#0F7040",
  fill: "#17A05C",
  bg: "#E4F5EC",
  ring: "#17A05C",
} as const;

type FactorTooltipProps = {
  axis: AIRiskAxis;
  kind: "info" | "rationale";
  description?: string;
  x: number;
  y: number;
};

function FactorTooltip({ axis, kind, description, x, y }: FactorTooltipProps) {
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
  }, [x, y, kind, description, axis.rationale]);

  if (!mounted) return null;

  return createPortal(
    <div
      ref={ref}
      role="tooltip"
      className="fixed z-[10000] w-[min(20rem,calc(100vw-2rem))] break-words rounded-lg border border-gray-200 bg-white shadow-xl pointer-events-none"
      style={{
        left: layout.x,
        top: layout.y,
        transform: layout.above
          ? "translate(-50%, -100%)"
          : "translate(-50%, 0)",
      }}
    >
      {kind === "info" ? (
        <>
          <div className="border-b border-gray-100 px-4 py-3">
            <div className="text-sm font-semibold text-gray-900">
              {AI_DEFENSIBILITY_INDEX_TITLE}
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="text-sm font-semibold text-gray-900">
              {axis.label}
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-gray-600">
              {description}
            </p>
          </div>
        </>
      ) : (
        <div className="px-4 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-sm font-semibold text-gray-900">
              {axis.label}
            </div>
            <span
              className="shrink-0 text-xs font-semibold"
              style={{ color: DEFENSIBILITY_TONE.fg }}
            >
              {axis.tier}
            </span>
          </div>
          {axis.rationale ? (
            <p className="mt-2 text-[13px] leading-relaxed text-gray-600">
              {axis.rationale}
            </p>
          ) : null}
        </div>
      )}
    </div>,
    document.body
  );
}

type RadarChartProps = {
  axes: AIRiskAxis[];
  active: string;
  tip: FactorTip | null;
  onPick?: (key: string) => void;
  /** Show (with a viewport position) or hide (null) a factor tooltip. */
  onTip?: (
    next: { key: string; kind: FactorTip["kind"]; x: number; y: number } | null
  ) => void;
  size?: number;
  maxScore?: number;
};

const LABEL_FONT_SIZE = 14;
const LABEL_LINE_HEIGHT = 17;

// Extra viewBox space (in SVG user units) reserved for axis labels on each side.
const RADAR_PAD_H = 156;
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
  tip,
  onPick,
  onTip,
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

  // Hover only for mouse; touch/pen taps toggle a pinned tooltip.
  const lastPointerType = React.useRef<string>("mouse");
  const tipHandlers = (key: string, kind: FactorTip["kind"]) => ({
    "data-ai-tip": "",
    onPointerDown: (e: React.PointerEvent) => {
      lastPointerType.current = e.pointerType;
    },
    onPointerEnter: (e: React.PointerEvent) => {
      lastPointerType.current = e.pointerType;
      if (e.pointerType === "mouse")
        onTip?.({ key, kind, x: e.clientX, y: e.clientY });
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse")
        onTip?.({ key, kind, x: e.clientX, y: e.clientY });
    },
    onPointerLeave: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") onTip?.(null);
    },
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      if (kind === "rationale") onPick?.(key);
      if (lastPointerType.current === "mouse" && kind === "rationale") return;
      if (tip?.key === key && tip.kind === kind) onTip?.(null);
      else onTip?.({ key, kind, x: e.clientX, y: e.clientY });
    },
  });

  // Measure real rendered line widths (SVG user units) so icons sit flush
  // against the text regardless of font or viewBox scaling.
  const textRefs = React.useRef<Record<string, SVGTextElement | null>>({});
  const [lineW, setLineW] = React.useState<Record<string, number[]>>({});
  const axesSig = axes.map((a) => a.key + a.label).join("|");
  React.useLayoutEffect(() => {
    const measure = () => {
      const next: Record<string, number[]> = {};
      for (const [key, el] of Object.entries(textRefs.current)) {
        if (!el) continue;
        next[key] = Array.from(el.querySelectorAll("tspan")).map((t) =>
          (t as SVGTSpanElement).getComputedTextLength()
        );
      }
      setLineW((prev) =>
        JSON.stringify(prev) === JSON.stringify(next) ? prev : next
      );
    };
    measure();
    document.fonts?.ready.then(measure).catch(() => {});
  }, [axesSig, size]);

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
        stroke={s === maxScore ? "#C6D1FB" : T.hair}
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
        {...tipHandlers(ax.key, "rationale")}
      >
        <circle cx={x} cy={y} r={12} fill="transparent" />
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
    const isTooltip = tip?.key === ax.key;
    const lines = wrapLabel(ax.label);
    const totalH = lines.length * LABEL_LINE_HEIGHT;
    const startDy = -(totalH / 2) + LABEL_LINE_HEIGHT / 2;
    const hitW =
      lineW[ax.key] && lineW[ax.key].length
        ? Math.max(...lineW[ax.key])
        : Math.max(...lines.map((line) => line.length)) * (LABEL_FONT_SIZE * 0.58);
    const hitH = totalH + 8;

    return (
      <g
        key={`lbl-${ax.key}`}
        style={{ cursor: "default" }}
        {...tipHandlers(ax.key, "rationale")}
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
          ref={(el) => {
            textRefs.current[ax.key] = el;
          }}
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

  // Grow horizontal padding if a measured label + icon would overhang the viewBox.
  let padH = RADAR_PAD_H;
  axes.forEach((ax, i) => {
    const ws = lineW[ax.key];
    if (!ws?.length) return;
    const cos = Math.cos(angleFor(i));
    const lx = cx + cos * (R + 38);
    const w = Math.max(...ws);
    const reach = 11 + 7 + 6; // icon gap + icon radius + margin
    const left = Math.abs(cos) < 0.2 ? lx - w / 2 : cos > 0 ? lx : lx - w;
    const right = left + w;
    padH = Math.max(padH, reach - left, right + reach - size);
  });

  const icons = axes.map((ax, i) => {
    if (!resolveFactorDescription(ax)) return null;
    const a = angleFor(i);
    const lr = R + 38;
    const lx = cx + Math.cos(a) * lr;
    const ly = cy + Math.sin(a) * lr;
    const cos = Math.cos(a);
    const lines = wrapLabel(ax.label);
    // Baselines are centred on ly, so the glyphs' visual centre is ~5 above it.
    const firstY = ly - 5;
    // Widest line, so the icon clears every line of a multi-line label.
    const firstW = lineW[ax.key]?.length
      ? Math.max(...lineW[ax.key])
      : Math.max(...lines.map((l) => l.length)) * (LABEL_FONT_SIZE * 0.58);
    const ix =
      Math.abs(cos) < 0.2
        ? lx + firstW / 2 + 11
        : cos > 0
          ? lx + firstW + 11
          : lx - firstW - 11;
    const isOpen = tip?.key === ax.key && tip.kind === "info";
    return (
      <g
        key={`info-${ax.key}`}
        role="button"
        tabIndex={0}
        aria-label={`About ${ax.label}`}
        style={{ cursor: "help", outline: "none" }}
        {...tipHandlers(ax.key, "info")}
        onFocus={(e) => {
          const r = (e.currentTarget as SVGGElement).getBoundingClientRect();
          onTip?.({
            key: ax.key,
            kind: "info",
            x: r.left + r.width / 2,
            y: r.top,
          });
        }}
        onBlur={() => onTip?.(null)}
      >
        <circle cx={ix} cy={firstY} r={10} fill="transparent" />
        <circle
          cx={ix}
          cy={firstY}
          r={6.5}
          fill="#fff"
          stroke={isOpen ? T.ink : T.muted}
          strokeWidth={1.2}
        />
        <text
          x={ix}
          y={firstY}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily={T.sans}
          fontSize={9}
          fontWeight={700}
          fill={isOpen ? T.ink : T.muted}
          style={{ pointerEvents: "none" }}
        >
          i
        </text>
      </g>
    );
  });

  return (
    <svg
      viewBox={`${-padH} ${-RADAR_PAD_V} ${size + 2 * padH} ${size + 2 * RADAR_PAD_V}`}
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
      {icons}
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
  const [tip, setTip] = useState<FactorTip | null>(null);
  const chartWrapRef = React.useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);

  // Dismiss a pinned (touch) tooltip when tapping anywhere else.
  React.useEffect(() => {
    if (!tip) return;
    const onDown = (e: PointerEvent) => {
      if (!(e.target as Element | null)?.closest?.("[data-ai-tip]")) {
        setTip(null);
      }
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [tip]);

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
  const tooltipAxis = tip ? axes.find((a) => a.key === tip.key) : undefined;
  const tooltipDescription = tooltipAxis
    ? resolveFactorDescription(tooltipAxis)
    : undefined;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: T.panel,
        border: `1px solid ${hover ? "#C6D1FB" : T.divider}`,
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
          {AI_DEFENSIBILITY_INDEX_TITLE}
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
          onMouseLeave={() => setTip(null)}
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
            tip={tip}
            onPick={setActive}
            onTip={setTip}
            size={300}
          />
          {tip && tooltipAxis && (tip.kind === "rationale" || tooltipDescription) ? (
            <FactorTooltip
              axis={tooltipAxis}
              kind={tip.kind}
              description={tooltipDescription}
              x={tip.x}
              y={tip.y}
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
