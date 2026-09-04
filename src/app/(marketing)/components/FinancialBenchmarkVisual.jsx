"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";

const EASE = [0.16, 1, 0.3, 1];
const PEER_COUNT = 24;

// Illustrative only — a fabricated target-vs-peer benchmark shape, not a
// real company's financial data. Mirrors the platform's real Financial
// Intelligence benchmark (target value plotted against a peer range +
// median, with a resulting percentile) without exposing proprietary output.
const METRICS = [
  { key: "revenue_growth", label: "Revenue Growth", min: 8, max: 52, median: 22, target: 34, percentile: 78, format: (v) => `${v}%` },
  { key: "ebitda_margin", label: "EBITDA Margin", min: 5, max: 40, median: 19, target: 28, percentile: 82, format: (v) => `${v}%` },
  { key: "rule_of_40", label: "Rule of 40", min: 15, max: 70, median: 38, target: 62, percentile: 88, format: (v) => v },
  { key: "nrr", label: "Net Revenue Retention", min: 95, max: 135, median: 109, target: 118, percentile: 71, format: (v) => `${v}%` },
  { key: "revenue_per_employee", label: "Revenue per Employee", min: 120, max: 420, median: 240, target: 310, percentile: 65, format: (v) => `$${v}k` },
];

function T(reduceMotion, duration, delay = 0) {
  return { duration: reduceMotion ? 0 : duration, delay: reduceMotion ? 0 : delay, ease: EASE };
}

function pctAlong(value, min, max) {
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

function easeOutExpo(t) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function useCountUp(target, active, { duration = 900, delay = 0 } = {}) {
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!active || startedRef.current) return;
    startedRef.current = true;
    let rafId;
    let startTime;
    const timeoutId = window.setTimeout(() => {
      const tick = (now) => {
        if (startTime === undefined) startTime = now;
        const progress = Math.min((now - startTime) / duration, 1);
        setValue(target * easeOutExpo(progress));
        if (progress < 1) rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    }, delay);
    return () => {
      window.clearTimeout(timeoutId);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [active, target, duration, delay]);

  return value;
}

function CompositeRing({ percentile, active, reduceMotion }) {
  const size = 132;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const displayValue = useCountUp(percentile, active, { duration: 1000 });
  const offset = circumference * (1 - (active ? percentile : 0) / 100);

  return (
    <div className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg aria-hidden="true" width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF0F7" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#3E5EDC"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: reduceMotion ? offset : active ? offset : circumference }}
          transition={T(reduceMotion, 1.1, 0.3)}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold tabular-nums" style={{ color: "#000B29" }}>
          {Math.round(displayValue)}
          <span className="text-sm font-semibold" style={{ color: "#5A6272" }}>
            th
          </span>
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#5A6272" }}>
          Percentile
        </span>
      </div>
    </div>
  );
}

function MetricRow({ metric, index, active }) {
  const targetPct = pctAlong(metric.target, metric.min, metric.max);
  const medianPct = pctAlong(metric.median, metric.min, metric.max);
  const displayTarget = useCountUp(metric.target, active, { duration: 700, delay: 500 + index * 90 });
  const delay = 0.55 + index * 0.09;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={active ? { opacity: 1, y: 0 } : undefined}
      transition={T(false, 0.45, delay)}
      className="flex flex-col gap-1.5"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium" style={{ color: "#5A6272" }}>
          {metric.label}
        </span>
        <span className="shrink-0 text-xs font-semibold tabular-nums" style={{ color: "#000B29" }}>
          {metric.format(Math.round(displayTarget))}
          <span className="ml-1.5 font-medium" style={{ color: "#3E5EDC" }}>
            · {metric.percentile}th
          </span>
        </span>
      </div>

      <div className="relative h-2 rounded-full" style={{ background: "#EEF0F7" }}>
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: "linear-gradient(90deg, rgba(83,111,240,0.35), rgba(62,94,220,0.35))" }}
          initial={{ width: "0%" }}
          animate={active ? { width: `${targetPct}%` } : undefined}
          transition={T(false, 0.7, delay + 0.05)}
        />
        <motion.div
          className="absolute top-1/2 h-3 w-[2px] -translate-y-1/2 rounded-full"
          style={{ background: "#8791A8" }}
          initial={{ opacity: 0 }}
          animate={active ? { opacity: 0.7, left: `${medianPct}%` } : undefined}
          transition={T(false, 0.4, delay + 0.15)}
        />
        <motion.div
          className="absolute top-1/2 size-3.5 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-white shadow"
          style={{ background: "#3E5EDC" }}
          initial={{ left: "0%", opacity: 0 }}
          animate={active ? { left: `${targetPct}%`, opacity: 1 } : undefined}
          transition={T(false, 0.75, delay + 0.1)}
        />
      </div>
    </motion.div>
  );
}

export function FinancialBenchmarkVisual() {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef(null);
  const inView = useInView(containerRef, { amount: 0.3, once: true });
  const [hasEntered, setHasEntered] = useState(false);
  const entered = hasEntered;

  useEffect(() => {
    if (inView) setHasEntered(true);
  }, [inView]);

  const compositePercentile = Math.round(METRICS.reduce((sum, m) => sum + m.percentile, 0) / METRICS.length);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-2xl p-6 md:p-7"
      style={{
        background: "linear-gradient(160deg, #FFFFFF 0%, #F7F8FC 100%)",
        border: "1px solid rgba(0,11,41,0.08)",
        boxShadow: "0 4px 24px rgba(0,11,41,0.06)",
      }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2 items-center justify-center">
            <span className="absolute inline-flex size-full animate-ping rounded-full opacity-60" style={{ background: "#536FF0" }} />
            <span className="relative inline-flex size-2 rounded-full" style={{ background: "#536FF0" }} />
          </span>
          <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "#5A6272" }}>
            Financial Intelligence · live
          </span>
        </div>
        <span className="whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "#F0F3FF", color: "#3E5EDC" }}>
          vs {PEER_COUNT} peers
        </span>
      </div>

      <div className="mb-5 flex items-center gap-5">
        <CompositeRing percentile={compositePercentile} active={entered && !reduceMotion} reduceMotion={reduceMotion} />
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold" style={{ color: "#000B29" }}>
            Target Company
          </span>
          <span className="text-xs leading-relaxed" style={{ color: "#5A6272" }}>
            Composite percentile across headline metrics, benchmarked against {PEER_COUNT} Data &amp; Analytics peers.
          </span>
        </div>
      </div>

      <motion.div
        className="mb-5 h-px w-full origin-left"
        style={{ background: "rgba(0,11,41,0.08)" }}
        initial={{ scaleX: 0 }}
        animate={entered ? { scaleX: 1 } : undefined}
        transition={T(reduceMotion, 0.6, 0.35)}
      />

      <div className="flex flex-col gap-4">
        {METRICS.map((metric, index) => (
          <MetricRow key={metric.key} metric={metric} index={index} active={entered} />
        ))}
      </div>

      <div className="mt-4 flex items-center gap-4 text-[10px]" style={{ color: "#8791A8" }}>
        <span className="flex items-center gap-1.5">
          <span className="inline-block size-2.5 rounded-full border-2 border-white" style={{ background: "#3E5EDC" }} />
          Target
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-[2px] rounded-full" style={{ background: "#8791A8" }} />
          Peer median
        </span>
        <span>Bar = peer range</span>
      </div>
    </div>
  );
}
