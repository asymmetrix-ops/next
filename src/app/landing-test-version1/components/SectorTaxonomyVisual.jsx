"use client";

import { AnimatePresence, animate as animateValue, motion, useInView, useMotionValue, useReducedMotion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";

const EASE = [0.16, 1, 0.3, 1];
const AUTO_CYCLE_MS = 2400;
const TOTAL_PRIMARY = 42;
const TOTAL_SECONDARY = 908;
const AREA_PADDING = 24;

// Illustrative subset only — 14 of the platform's 42 real primary sectors,
// with fabricated secondary-sector counts and example sub-sector labels.
// Shape mirrors the real taxonomy (primary sector → N secondary sectors)
// without exposing the proprietary full breakdown.
const SECTORS = [
  { id: "financial", label: "Financial Data & Credit", count: 62, examples: ["Credit Bureaus", "Market Data", "Trade & Position Data"] },
  { id: "grc", label: "Regulatory, GRC & Credit", count: 54, examples: ["KYC / AML", "Regulatory Reporting", "Risk Management"] },
  { id: "cyber", label: "Cyber Security", count: 41, examples: ["Threat Intelligence", "Identity & Access Data", "Vulnerability Data"] },
  { id: "digital-infra", label: "Digital Infrastructure", count: 48, examples: ["Cloud & Hosting Data", "Network Monitoring", "IT Asset Data"] },
  { id: "ehss", label: "EHSS", count: 33, examples: ["Safety Incident Data", "Environmental Monitoring", "Occupational Health"] },
  { id: "esg", label: "ESG & Sustainability", count: 45, examples: ["Carbon & Emissions Data", "ESG Ratings", "Supply Chain Sustainability"] },
  { id: "marketing", label: "Marketing & Advertising Data", count: 58, examples: ["Ad Intelligence", "Consumer Behaviour", "Attribution Data"] },
  { id: "real-estate", label: "Real Estate & Property Data", count: 37, examples: ["Property Valuation", "Land Registry Data", "Construction Data"] },
  { id: "people", label: "People & Workforce Data", count: 40, examples: ["Compensation Benchmarking", "Talent Analytics", "Workforce Planning"] },
  { id: "supply-chain", label: "Supply Chain & Logistics", count: 44, examples: ["Freight & Shipping Data", "Inventory Intelligence", "Supplier Risk"] },
  { id: "healthcare", label: "Healthcare & Life Sciences", count: 52, examples: ["Clinical Data", "Pharma R&D Data", "Patient Outcomes"] },
  { id: "insurance", label: "Insurance Data & Analytics", count: 35, examples: ["Underwriting Data", "Claims Analytics", "Actuarial Data"] },
  { id: "legal", label: "Legal & Professional Services", count: 30, examples: ["Case Law Data", "Contract Analytics", "Regulatory Filings"] },
  { id: "media", label: "Media, Sports & Entertainment", count: 28, examples: ["Audience Analytics", "Sports Performance Data", "Content Licensing"] },
];

function T(reduceMotion, duration, delay = 0) {
  return { duration: reduceMotion ? 0 : duration, delay: reduceMotion ? 0 : delay, ease: EASE };
}

function pseudoRandom(seed) {
  const v = Math.sin(seed) * 43758.5453;
  return v - Math.floor(v);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Greedy front-chain circle packing: place the largest circle at the
// origin, then for each subsequent circle test candidate positions tangent
// to every already-placed circle and keep whichever doesn't overlap and
// sits closest to the origin — a simplified, dependency-free version of the
// classic bubble-packing algorithm (no d3 required). Coordinates come out
// centered on (0,0) in real CSS pixels, which is what lets drag track the
// cursor 1:1 later — no viewBox/transform scaling in between.
function packCircles(items) {
  const sorted = [...items].sort((a, b) => b.r - a.r);
  const placed = [];
  sorted.forEach((item, i) => {
    if (i === 0) {
      placed.push({ ...item, x: 0, y: 0 });
      return;
    }
    let best = null;
    placed.forEach((anchor) => {
      const steps = 48;
      for (let s = 0; s < steps; s += 1) {
        const angle = (s / steps) * Math.PI * 2;
        const dist = anchor.r + item.r + 3;
        const cx = anchor.x + Math.cos(angle) * dist;
        const cy = anchor.y + Math.sin(angle) * dist;
        const overlaps = placed.some((q) => distance({ x: cx, y: cy }, q) < q.r + item.r - 1);
        if (overlaps) continue;
        const distFromOrigin = Math.hypot(cx, cy);
        if (!best || distFromOrigin < best.distFromOrigin) {
          best = { x: cx, y: cy, distFromOrigin };
        }
      }
    });
    placed.push({ ...item, x: best.x, y: best.y });
  });
  return placed;
}

const PACKED = (() => {
  const items = SECTORS.map((s) => ({ ...s, r: 22 + Math.sqrt(s.count) * 4.6 }));
  const packed = packCircles(items);
  const minX = Math.min(...packed.map((p) => p.x - p.r));
  const maxX = Math.max(...packed.map((p) => p.x + p.r));
  const minY = Math.min(...packed.map((p) => p.y - p.r));
  const maxY = Math.max(...packed.map((p) => p.y + p.r));
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return {
    nodes: packed.map((p) => ({ ...p, x: p.x - cx, y: p.y - cy })),
    width: maxX - minX,
    height: maxY - minY,
  };
})();

const TONES = ["#3E5EDC", "#536FF0", "#203FBF", "#6B82F2"];

function Bubble({ node, index, entered, reduceMotion, isActive, containerRef, onPick }) {
  const startAngle = (index / SECTORS.length) * Math.PI * 2 + pseudoRandom(index * 5.3) * 0.6;
  const startRadius = 340 + pseudoRandom(index * 9.1 + 2) * 60;
  const tone = TONES[index % TONES.length];
  const fontSize = node.r > 52 ? 11.5 : node.r > 40 ? 10 : 8.8;

  // x/y/opacity are plain motion values, animated ONCE imperatively (below)
  // rather than via the `animate` prop. That decouples the entrance tween
  // from React's render cycle entirely: once it completes, these motion
  // values just sit at rest and `drag` is free to nudge them without any
  // re-render ever fighting for control (the previous prop-driven approach
  // kept re-issuing the same target on every re-render — e.g. every
  // auto-cycle tick — which fought both the entrance tween and later drags).
  const x = useMotionValue(Math.cos(startAngle) * startRadius);
  const y = useMotionValue(Math.sin(startAngle) * startRadius);
  const opacity = useMotionValue(0);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    if (!entered || hasAnimatedRef.current) return;
    hasAnimatedRef.current = true;
    const delay = reduceMotion ? 0 : 0.15 + index * 0.05;
    animateValue(x, node.x, { duration: reduceMotion ? 0 : 0.9, delay, ease: EASE });
    animateValue(y, node.y, { duration: reduceMotion ? 0 : 0.9, delay, ease: EASE });
    animateValue(opacity, 1, { duration: reduceMotion ? 0 : 0.3, delay: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- node/index/reduceMotion are stable for a given bubble
  }, [entered]);

  return (
    <motion.div
      drag
      dragConstraints={containerRef}
      dragElastic={0.15}
      dragMomentum={false}
      whileDrag={{ scale: 1.1, zIndex: 30, boxShadow: "0 12px 28px rgba(0,11,41,0.18)" }}
      initial={{ scale: 0.5 }}
      animate={{ scale: isActive ? 1.06 : 1 }}
      transition={{ duration: 0.25, ease: EASE }}
      onTap={() => onPick(node.id)}
      className="absolute flex select-none flex-col items-center justify-center rounded-full text-center"
      style={{
        x,
        y,
        opacity,
        left: "50%",
        top: "50%",
        width: node.r * 2,
        height: node.r * 2,
        marginLeft: -node.r,
        marginTop: -node.r,
        border: `${isActive ? 2 : 1.2}px solid ${tone}`,
        cursor: "grab",
        zIndex: isActive ? 20 : 1,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{ background: tone, opacity: isActive ? 0.24 : 0.13, transition: "opacity 0.2s ease" }}
      />
      <span
        className="pointer-events-none relative px-2 font-bold leading-tight"
        style={{ fontSize, color: "#000B29" }}
      >
        {node.label}
      </span>
      {node.r > 30 && (
        <span className="pointer-events-none relative mt-0.5 px-2 font-semibold" style={{ fontSize: 8, color: "#5A6272" }}>
          {node.count} sub-sectors
        </span>
      )}
    </motion.div>
  );
}

export function SectorTaxonomyVisual() {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef(null);
  const inView = useInView(containerRef, { amount: 0.3, once: true });
  const [hasEntered, setHasEntered] = useState(false);
  const [activeId, setActiveId] = useState(SECTORS[0].id);
  const [paused, setPaused] = useState(false);
  const entered = hasEntered;

  useEffect(() => {
    if (inView) setHasEntered(true);
  }, [inView]);

  useEffect(() => {
    if (!entered || reduceMotion || paused) return undefined;
    const id = window.setInterval(() => {
      setActiveId((current) => {
        const idx = SECTORS.findIndex((s) => s.id === current);
        return SECTORS[(idx + 1) % SECTORS.length].id;
      });
    }, AUTO_CYCLE_MS);
    return () => window.clearInterval(id);
  }, [entered, reduceMotion, paused]);

  const activeSector = SECTORS.find((s) => s.id === activeId) ?? SECTORS[0];
  const areaHeight = PACKED.height + AREA_PADDING * 2;

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl"
      style={{
        background: "linear-gradient(160deg, #FFFFFF 0%, #F7F8FC 100%)",
        border: "1px solid rgba(0,11,41,0.08)",
        boxShadow: "0 4px 24px rgba(0,11,41,0.06)",
      }}
    >
      <div className="flex items-center justify-between gap-3 px-6 pt-6">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2 items-center justify-center">
            <span className="absolute inline-flex size-full animate-ping rounded-full opacity-60" style={{ background: "#536FF0" }} />
            <span className="relative inline-flex size-2 rounded-full" style={{ background: "#536FF0" }} />
          </span>
          <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "#5A6272" }}>
            Sector Intelligence · live
          </span>
        </div>
        <span className="whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "#F0F3FF", color: "#3E5EDC" }}>
          {TOTAL_PRIMARY} primary · {TOTAL_SECONDARY} secondary
        </span>
      </div>

      <div
        ref={containerRef}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        className="relative mx-auto mt-2 w-full"
        style={{ height: areaHeight, maxWidth: PACKED.width + AREA_PADDING * 2 }}
      >
        {PACKED.nodes.map((node, index) => (
          <Bubble
            key={node.id}
            node={node}
            index={index}
            entered={entered}
            reduceMotion={reduceMotion}
            isActive={activeId === node.id}
            containerRef={containerRef}
            onPick={setActiveId}
          />
        ))}
      </div>

      <div className="border-t px-5 py-3" style={{ borderColor: "rgba(0,11,41,0.08)" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSector.id}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
            transition={T(reduceMotion, 0.3)}
            className="flex flex-wrap items-baseline justify-between gap-2"
          >
            <div className="min-w-0">
              <span className="text-[13px] font-semibold" style={{ color: "#000B29" }}>
                {activeSector.label}
              </span>
              <span className="ml-2 text-xs font-medium" style={{ color: "#5A6272" }}>
                {activeSector.examples.join(" · ")}
              </span>
            </div>
            <span className="shrink-0 text-xs font-semibold" style={{ color: "#3E5EDC" }}>
              {activeSector.count} sub-sectors
            </span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
