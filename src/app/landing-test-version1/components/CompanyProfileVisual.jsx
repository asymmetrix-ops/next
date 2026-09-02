"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";

const EASE = [0.16, 1, 0.3, 1];

// Illustrative only — a fabricated company profile, not a real client
// record. Mirrors the shape of an Asymmetrix company profile (funding
// history, leadership, product focus, competitive positioning, AI
// defensibility) without exposing proprietary data.
const FUNDING_ROUNDS = [
  { label: "Seed", year: "2018", amount: "$4M" },
  { label: "Series A", year: "2020", amount: "$18M" },
  { label: "Series B", year: "2022", amount: "$46M" },
  { label: "Series C", year: "2024", amount: "$74M" },
];

const PRODUCT_TAGS = ["Market Data", "ESG Analytics", "Risk Scoring"];

const LEADERSHIP = [
  { initials: "CE", role: "CEO" },
  { initials: "CT", role: "CTO" },
  { initials: "CF", role: "CFO" },
];

const FINANCIAL_METRICS = [
  { label: "Revenue", value: "$86M" },
  { label: "EBITDA Margin", value: "24%" },
];

// Illustrative headcount trend, shaped after Asymmetrix's real LinkedIn
// employee-count tracking (total headcount over time, sourced from LinkedIn).
const HEADCOUNT_TREND = [38, 35, 32, 34, 37, 41, 45, 49, 47, 51, 45, 41, 62, 68, 72, 76];
const HEADCOUNT_TOTAL = "147,808";
const HEADCOUNT_YOY = "+21% YoY";
const HEADCOUNT_ASOF = "Jul 2026";

const POSITIONING_PCT = 84;

function T(reduceMotion, duration, delay = 0) {
  return { duration: reduceMotion ? 0 : duration, delay: reduceMotion ? 0 : delay, ease: EASE };
}

function FundingTimeline({ active, reduceMotion }) {
  const w = 100 / (FUNDING_ROUNDS.length - 1);
  return (
    <div className="relative" style={{ height: 44 }}>
      <div className="absolute left-0 right-0 top-[7px] h-px" style={{ background: "rgba(0,11,41,0.1)" }} />
      <motion.div
        className="absolute left-0 top-[7px] h-px origin-left"
        style={{ background: "linear-gradient(90deg, #536FF0, #3E5EDC)" }}
        initial={{ scaleX: 0 }}
        animate={active ? { scaleX: 1 } : undefined}
        transition={T(reduceMotion, 0.8, 0.2)}
      />
      {FUNDING_ROUNDS.map((round, i) => (
        <motion.div
          key={round.label}
          className="absolute flex flex-col items-center"
          style={{ left: `${i * w}%`, transform: "translateX(-50%)" }}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={active ? { opacity: 1, scale: 1 } : undefined}
          transition={T(reduceMotion, 0.35, 0.25 + i * 0.12)}
        >
          <span className="block size-[9px] rounded-full border-2 border-white" style={{ background: "#3E5EDC" }} />
          <span className="mt-2 whitespace-nowrap text-[10px] font-semibold" style={{ color: "#000B29" }}>
            {round.amount}
          </span>
          <span className="whitespace-nowrap text-[9px]" style={{ color: "#8791A8" }}>
            {round.label} · {round.year}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function HeadcountGrowthChart({ active, reduceMotion }) {
  const w = 300;
  const h = 56;
  const min = Math.min(...HEADCOUNT_TREND);
  const max = Math.max(...HEADCOUNT_TREND);
  const step = w / (HEADCOUNT_TREND.length - 1);
  const points = HEADCOUNT_TREND.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / (max - min)) * (h - 6) - 3;
    return [x, y];
  });
  const linePath = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`;
  const [lastX, lastY] = points[points.length - 1];

  return (
    <div className="flex items-center gap-4">
      <div className="min-w-0 shrink-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold tabular-nums" style={{ color: "#000B29" }}>
            {HEADCOUNT_TOTAL}
          </span>
          <span
            className="whitespace-nowrap rounded-full px-2 py-0.5 text-[9px] font-bold"
            style={{ background: "#E7F6EC", color: "#1E8E4F" }}
          >
            {HEADCOUNT_YOY}
          </span>
        </div>
        <span className="whitespace-nowrap text-[10px]" style={{ color: "#8791A8" }}>
          Employees · {HEADCOUNT_ASOF}
        </span>
      </div>
      <svg aria-hidden="true" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-10 flex-1">
        <defs>
          <linearGradient id="cpv-headcount-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#536FF0" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#536FF0" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d={areaPath}
          fill="url(#cpv-headcount-fill)"
          initial={{ opacity: 0 }}
          animate={active ? { opacity: 1 } : undefined}
          transition={T(reduceMotion, 0.5, 0.55)}
        />
        <motion.path
          d={linePath}
          fill="none"
          stroke="#3E5EDC"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={active ? { pathLength: 1 } : undefined}
          transition={T(reduceMotion, 0.9, 0.25)}
        />
        <motion.circle
          cx={lastX}
          cy={lastY}
          r={3.5}
          fill="#3E5EDC"
          stroke="#FFFFFF"
          strokeWidth={1.5}
          initial={{ opacity: 0, scale: 0 }}
          animate={active ? { opacity: 1, scale: 1 } : undefined}
          transition={T(reduceMotion, 0.3, 1.1)}
        />
      </svg>
    </div>
  );
}

function ProfileSection({ label, delay, active, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={active ? { opacity: 1, y: 0 } : undefined}
      transition={T(false, 0.45, delay)}
    >
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#8791A8" }}>
        {label}
      </span>
      {children}
    </motion.div>
  );
}

export function CompanyProfileVisual() {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef(null);
  const inView = useInView(containerRef, { amount: 0.3, once: true });
  const [hasEntered, setHasEntered] = useState(false);
  const entered = hasEntered;

  useEffect(() => {
    if (inView) setHasEntered(true);
  }, [inView]);

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
      <div className="mb-5 flex items-center gap-2">
        <span className="relative flex size-2 items-center justify-center">
          <span className="absolute inline-flex size-full animate-ping rounded-full opacity-60" style={{ background: "#536FF0" }} />
          <span className="relative inline-flex size-2 rounded-full" style={{ background: "#536FF0" }} />
        </span>
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "#5A6272" }}>
          Company profiles · live
        </span>
      </div>

      <motion.div
        className="mb-5 flex items-center gap-3"
        initial={{ opacity: 0, y: 8 }}
        animate={entered ? { opacity: 1, y: 0 } : undefined}
        transition={T(reduceMotion, 0.45, 0.05)}
      >
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
          style={{ background: "linear-gradient(160deg, #536FF0, #203FBF)" }}
        >
          CA
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-bold" style={{ color: "#000B29" }}>
              Company A
            </span>
            <span
              className="shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
              style={{ background: "#F0F3FF", color: "#3E5EDC" }}
            >
              VC-backed
            </span>
          </div>
          <span className="text-xs" style={{ color: "#5A6272" }}>
            Data &amp; Analytics · Series C · Founded 2018
          </span>
        </div>
      </motion.div>

      <motion.div
        className="mb-5 h-px w-full origin-left"
        style={{ background: "rgba(0,11,41,0.08)" }}
        initial={{ scaleX: 0 }}
        animate={entered ? { scaleX: 1 } : undefined}
        transition={T(reduceMotion, 0.6, 0.15)}
      />

      <div className="flex flex-col gap-5">
        <ProfileSection label="Funding History" delay={0.22} active={entered}>
          <FundingTimeline active={entered} reduceMotion={reduceMotion} />
        </ProfileSection>

        <ProfileSection
          label={
            <span className="inline-flex items-center gap-1.5">
              <span
                className="flex size-3.5 items-center justify-center rounded-[3px] text-[7px] font-bold text-white"
                style={{ background: "#0A66C2" }}
              >
                in
              </span>
              LinkedIn Employee Growth
            </span>
          }
          delay={0.28}
          active={entered}
        >
          <HeadcountGrowthChart active={entered} reduceMotion={reduceMotion} />
        </ProfileSection>

        <div className="grid grid-cols-2 gap-5">
          <ProfileSection label="Leadership Team" delay={0.34} active={entered}>
            <div className="flex items-center">
              <div className="flex -space-x-2">
                {LEADERSHIP.map((exec) => (
                  <div
                    key={exec.initials}
                    className="flex size-7 items-center justify-center rounded-full border-2 border-white text-[9px] font-bold text-white"
                    style={{ background: "#536FF0" }}
                  >
                    {exec.initials}
                  </div>
                ))}
              </div>
              <span className="ml-2.5 text-xs" style={{ color: "#5A6272" }}>
                {LEADERSHIP.map((exec) => exec.role).join(" · ")}
              </span>
            </div>
          </ProfileSection>

          <ProfileSection label="Product Focus" delay={0.38} active={entered}>
            <div className="flex flex-wrap gap-1.5">
              {PRODUCT_TAGS.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
                  style={{ background: "#F0F3FF", color: "#3E5EDC" }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </ProfileSection>

          <ProfileSection label="Financial Metrics" delay={0.42} active={entered}>
            <div className="flex gap-5">
              {FINANCIAL_METRICS.map((metric) => (
                <div key={metric.label}>
                  <div className="text-sm font-bold tabular-nums" style={{ color: "#000B29" }}>
                    {metric.value}
                  </div>
                  <span className="text-[10px]" style={{ color: "#8791A8" }}>
                    {metric.label}
                  </span>
                </div>
              ))}
            </div>
          </ProfileSection>

          <ProfileSection label="Competitive Positioning" delay={0.46} active={entered}>
            <div className="flex items-center gap-3">
              <div className="relative h-1.5 flex-1 rounded-full" style={{ background: "#EEF0F7" }}>
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ background: "linear-gradient(90deg, #536FF0, #3E5EDC)" }}
                  initial={{ width: "0%" }}
                  animate={entered ? { width: `${POSITIONING_PCT}%` } : undefined}
                  transition={T(reduceMotion, 0.7, 0.6)}
                />
              </div>
              <span className="shrink-0 text-xs font-semibold" style={{ color: "#000B29" }}>
                Top 15%
              </span>
            </div>
          </ProfileSection>
        </div>
      </div>

      <motion.div
        className="mt-5 rounded-xl p-4"
        style={{ background: "#F0F3FF", border: "1px solid rgba(83,111,240,0.25)" }}
        initial={{ opacity: 0, y: 10 }}
        animate={entered ? { opacity: 1, y: 0 } : undefined}
        transition={T(reduceMotion, 0.45, 0.72)}
      >
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold" style={{ color: "#000B29" }}>
            AI Defensibility
          </span>
          <span className="shrink-0 text-xs font-semibold" style={{ color: "#3E5EDC" }}>
            Strong · 2.4 / 3.0
          </span>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "#5A6272" }}>
          Proprietary datasets and deep workflow integration make this business difficult for generic AI tools to replicate.
        </p>
      </motion.div>
    </div>
  );
}
