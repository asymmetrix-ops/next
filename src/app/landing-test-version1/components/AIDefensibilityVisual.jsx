"use client";

import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import React, { useEffect, useMemo, useRef, useState } from "react";

const EASE = [0.16, 1, 0.3, 1];
const MAX_SCORE = 3;
const SIZE = 300;
const PAD_H = 140;
const PAD_V = 54;
const AUTO_CYCLE_MS = 2600;

// Illustrative only — a fabricated defensibility shape, not a real company's
// AI Exposure Index score. Mirrors the platform's real radar (axis set +
// 0–3 scoring + per-factor commentary) without exposing proprietary output.
const AXES = [
  {
    key: "data_moat",
    label: "Data Moat",
    score: 2.4,
    blurb:
      "The strongest data businesses own something a competitor cannot simply acquire elsewhere — proprietary, exclusively licensed, or generated through the company's own operations.",
  },
  {
    key: "replicability",
    label: "Replicability",
    score: 1.6,
    blurb:
      "Where a workflow or dataset could plausibly be rebuilt by a well-resourced competitor or an AI tool, defensibility rests elsewhere in the business.",
  },
  {
    key: "authority",
    label: "Authority · Source of Truth",
    score: 2.1,
    blurb:
      "Being the recognised reference point for a metric or dataset — the source others cite — is difficult for a generative model to displace.",
  },
  {
    key: "accuracy",
    label: "Accuracy Matters",
    score: 2.7,
    blurb:
      "In domains where an incorrect answer is costly, buyers pay for verified accuracy rather than a plausible-sounding AI summary.",
  },
  {
    key: "historical_data",
    label: "Historical Data",
    score: 2.9,
    blurb:
      "Long, consistently-collected time series are hard to backfill — a new entrant or AI tool cannot generate history that was never recorded.",
  },
  {
    key: "decision_stakes",
    label: "Size of Decision · Value at Stake",
    score: 2.3,
    blurb:
      "The higher the cost of being wrong, the more a buyer relies on an established, accountable provider rather than a generic model output.",
  },
  {
    key: "human_judgement",
    label: "Human Judgement · Expert Commentary",
    score: 1.9,
    blurb:
      "Analysis that depends on experienced judgement calls — not just pattern-matching on public data — is the slowest layer for AI to substitute.",
  },
  {
    key: "workflow_moat",
    label: "Workflow Moat",
    score: 2.0,
    blurb:
      "Deep integration into a customer's daily workflow raises switching costs well beyond the value of the underlying data alone.",
  },
];

function tierForScore(score) {
  if (score >= 2.2) return { label: "Strong", tone: "#3E5EDC" };
  if (score >= 1.2) return { label: "Moderate", tone: "#536FF0" };
  return { label: "Low", tone: "#8791A8" };
}

function wrapLabel(label) {
  if (label.includes(" · ")) return label.split(" · ").map((part) => part.trim());
  const maxChars = 13;
  const words = label.split(/\s+/);
  const lines = [];
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

function T(reduceMotion, duration, delay = 0) {
  return { duration: reduceMotion ? 0 : duration, delay: reduceMotion ? 0 : delay, ease: EASE };
}

function RadarChart({ axes, active, entered, reduceMotion, onPick }) {
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const R = SIZE * 0.34;
  const N = axes.length;
  const angleFor = (i) => -Math.PI / 2 + (i / N) * Math.PI * 2;
  const point = (i, r) => {
    const a = angleFor(i);
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };

  const rings = [];
  for (let s = 1; s <= MAX_SCORE; s += 1) {
    const r = (s / MAX_SCORE) * R;
    const pts = axes.map((_, i) => point(i, r).join(",")).join(" ");
    rings.push(
      <polygon
        key={s}
        points={pts}
        fill={s === MAX_SCORE ? "#F0F3FF" : "transparent"}
        fillOpacity={s === MAX_SCORE ? 0.5 : 0}
        stroke={s === MAX_SCORE ? "rgba(83,111,240,0.35)" : "rgba(0,11,41,0.09)"}
        strokeWidth={1}
        strokeDasharray={s === MAX_SCORE ? undefined : "2 4"}
      />,
    );
  }

  const spokes = axes.map((ax, i) => {
    const [x, y] = point(i, R);
    return <line key={ax.key} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(0,11,41,0.08)" strokeWidth={1} />;
  });

  const dataPoints = axes.map((ax, i) => point(i, (ax.score / MAX_SCORE) * R));
  const polygonPoints = dataPoints.map((p) => p.join(",")).join(" ");

  const dots = axes.map((ax, i) => {
    const [x, y] = dataPoints[i];
    const isActive = active === ax.key;
    return (
      <g key={ax.key} style={{ cursor: "pointer" }} onClick={() => onPick(ax.key)}>
        <circle cx={x} cy={y} r={12} fill="transparent" />
        <circle cx={x} cy={y} r={isActive ? 9 : 6} fill="#3E5EDC" opacity={isActive ? 0.18 : 0} style={{ transition: "opacity 0.25s ease" }} />
        <circle cx={x} cy={y} r={isActive ? 4.5 : 3.4} fill="#3E5EDC" stroke="#FFFFFF" strokeWidth={1.5} style={{ transition: "r 0.2s ease" }} />
      </g>
    );
  });

  const labels = axes.map((ax, i) => {
    const a = angleFor(i);
    const lr = R + 42;
    const lx = cx + Math.cos(a) * lr;
    const ly = cy + Math.sin(a) * lr;
    const anchor = Math.abs(Math.cos(a)) < 0.2 ? "middle" : Math.cos(a) > 0 ? "start" : "end";
    const isActive = active === ax.key;
    const lines = wrapLabel(ax.label);
    const lineHeight = 16;
    const totalH = lines.length * lineHeight;
    const startDy = -(totalH / 2) + lineHeight / 2;

    return (
      <g key={`lbl-${ax.key}`} style={{ cursor: "pointer" }} onClick={() => onPick(ax.key)}>
        <text
          x={lx}
          y={ly}
          textAnchor={anchor}
          fontSize={13}
          fontWeight={isActive ? 700 : 600}
          fill={isActive ? "#000B29" : "#5A6272"}
          style={{ transition: "fill 0.2s ease" }}
        >
          {lines.map((line, li) => (
            <tspan key={li} x={lx} dy={li === 0 ? startDy : lineHeight}>
              {line}
            </tspan>
          ))}
        </text>
      </g>
    );
  });

  return (
    <svg
      aria-hidden="true"
      viewBox={`${-PAD_H} ${-PAD_V} ${SIZE + 2 * PAD_H} ${SIZE + 2 * PAD_V}`}
      width="100%"
      height={SIZE}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block" }}
    >
      <motion.g initial={{ opacity: 0 }} animate={entered ? { opacity: 1 } : undefined} transition={T(reduceMotion, 0.5, 0.1)}>
        {rings}
        {spokes}
      </motion.g>

      <motion.g
        initial={{ opacity: 0, scale: 0.5 }}
        animate={entered ? { opacity: 1, scale: 1 } : undefined}
        transition={T(reduceMotion, 0.7, 0.45)}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        <polygon points={polygonPoints} fill="#3E5EDC" fillOpacity={0.16} stroke="#3E5EDC" strokeOpacity={0.85} strokeWidth={1.6} strokeLinejoin="round" />
      </motion.g>

      <motion.g initial={{ opacity: 0 }} animate={entered ? { opacity: 1 } : undefined} transition={T(reduceMotion, 0.4, 0.9)}>
        {dots}
      </motion.g>

      <motion.g initial={{ opacity: 0 }} animate={entered ? { opacity: 1 } : undefined} transition={T(reduceMotion, 0.5, 1.05)}>
        {labels}
      </motion.g>
    </svg>
  );
}

export function AIDefensibilityVisual() {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef(null);
  const inView = useInView(containerRef, { amount: 0.3, once: true });
  const [hasEntered, setHasEntered] = useState(false);
  const [active, setActive] = useState(AXES[0].key);
  const [paused, setPaused] = useState(false);
  const entered = hasEntered;

  useEffect(() => {
    if (inView) setHasEntered(true);
  }, [inView]);

  useEffect(() => {
    if (!entered || reduceMotion || paused) return undefined;
    const id = window.setInterval(() => {
      setActive((current) => {
        const idx = AXES.findIndex((a) => a.key === current);
        return AXES[(idx + 1) % AXES.length].key;
      });
    }, AUTO_CYCLE_MS);
    return () => window.clearInterval(id);
  }, [entered, reduceMotion, paused]);

  const avgScore = useMemo(() => AXES.reduce((sum, a) => sum + a.score, 0) / AXES.length, []);
  const headlineTier = tierForScore(avgScore);
  const activeAxis = AXES.find((a) => a.key === active) ?? AXES[0];
  const axisTier = tierForScore(activeAxis.score);

  const handlePick = (key) => setActive(key);

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative w-full overflow-hidden rounded-2xl p-6 md:p-7"
      style={{
        background: "linear-gradient(160deg, #FFFFFF 0%, #F7F8FC 100%)",
        border: "1px solid rgba(0,11,41,0.08)",
        boxShadow: "0 4px 24px rgba(0,11,41,0.06)",
      }}
    >
      <div className="relative mb-2 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2 items-center justify-center">
            <span className="absolute inline-flex size-full animate-ping rounded-full opacity-60" style={{ background: "#536FF0" }} />
            <span className="relative inline-flex size-2 rounded-full" style={{ background: "#536FF0" }} />
          </span>
          <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "#5A6272" }}>
            AI Index · live
          </span>
        </div>
        <span
          className="whitespace-nowrap rounded-full px-3 py-1 text-right text-xs font-semibold"
          style={{ background: "#F0F3FF", color: headlineTier.tone }}
        >
          {headlineTier.label} · {avgScore.toFixed(1)} / {MAX_SCORE.toFixed(1)}
        </span>
      </div>

      <div className="flex justify-center">
        <RadarChart axes={AXES} active={active} entered={entered} reduceMotion={reduceMotion} onPick={handlePick} />
      </div>

      <div className="relative mt-1" style={{ minHeight: 118 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeAxis.key}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
            transition={T(reduceMotion, 0.3)}
            className="rounded-xl p-4"
            style={{ background: "#F0F3FF", border: "1px solid rgba(83,111,240,0.25)" }}
          >
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="text-[13px] font-semibold" style={{ color: "#000B29" }}>
                {activeAxis.label}
              </span>
              <span className="shrink-0 text-xs font-semibold" style={{ color: axisTier.tone }}>
                {axisTier.label} · {activeAxis.score.toFixed(1)} / {MAX_SCORE.toFixed(1)}
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "#5A6272" }}>
              {activeAxis.blurb}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
