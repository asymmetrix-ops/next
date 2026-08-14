"use client";

import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";

const EASE = [0.16, 1, 0.3, 1];
const AUTO_CYCLE_MS = 1500;
const BATCH_SIZE = 8;
const TOTAL_PRIMARY = 42;
const TOTAL_SECONDARY = 908;

// Illustrative — plausible convergence stories in the D&A market (fintech ×
// digital assets, insurtech, proptech, etc). This is the part of the visual
// that actually shows "boundaries shifting as business models converge" —
// the rotating sector pills alone only demonstrate taxonomy breadth, not
// convergence, benchmarking, or M&A tracking.
const CONVERGING_PAIRS = [
  ["Marketing", "Advertising"],
  ["Financial", "Digital Assets"],
  ["Legal", "GRC"],
  ["Insurance", "Healthcare"],
  ["Cyber Security", "Digital Infrastructure"],
  ["ESG", "Real Estate"],
  ["Supply Chain", "Transportation"],
  ["Media", "Sport"],
];

// The platform's real 42 primary sectors (category names only — no
// proprietary counts, deal data, or client-specific breakdowns attached).
const PRIMARY_SECTORS = [
  "Academic Research",
  "Advertising",
  "Automotive",
  "Company Data",
  "Credit",
  "Cyber Security",
  "Digital Infrastructure",
  "EHSS",
  "ESG",
  "Education & Training",
  "Energy & Commodities",
  "Expert Networks",
  "Financial",
  "GIS",
  "GRC",
  "HCM",
  "Healthcare",
  "Industrials",
  "Information Technology",
  "Insurance",
  "Intellectual Property",
  "Legal",
  "Marine & Maritime",
  "Marketing",
  "Marketplace",
  "Media",
  "Not-for-profit",
  "People Data",
  "Pharmaceuticals",
  "Real Estate",
  "Sales",
  "Sport",
  "Supply Chain",
  "Testing Inspection & Certification",
  "Transportation",
  "Travel & Hospitality",
  "Digital Assets",
  "Tax & Accounting",
  "Aerospace & Defence",
  "Retail & Consumer",
  "Business Services",
  "Government & Public Sector",
];

const TONES = ["#3E5EDC", "#536FF0", "#203FBF", "#6B82F2"];

function chunk(items, size) {
  const batches = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

const BATCHES = chunk(PRIMARY_SECTORS, BATCH_SIZE);

function T(reduceMotion, duration, delay = 0) {
  return { duration: reduceMotion ? 0 : duration, delay: reduceMotion ? 0 : delay, ease: EASE };
}

export function SectorTaxonomyVisual() {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef(null);
  const inView = useInView(containerRef, { amount: 0.3, once: true });
  const [hasEntered, setHasEntered] = useState(false);
  const [batchIndex, setBatchIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const entered = hasEntered;

  useEffect(() => {
    if (inView) setHasEntered(true);
  }, [inView]);

  useEffect(() => {
    if (!entered || reduceMotion || paused) return undefined;
    const id = window.setInterval(() => {
      setBatchIndex((current) => (current + 1) % BATCHES.length);
    }, AUTO_CYCLE_MS);
    return () => window.clearInterval(id);
  }, [entered, reduceMotion, paused]);

  const batch = BATCHES[batchIndex];
  const convergingPair = CONVERGING_PAIRS[batchIndex % CONVERGING_PAIRS.length];

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative w-full overflow-hidden rounded-2xl p-6 md:p-8"
      style={{
        background: "linear-gradient(160deg, #FFFFFF 0%, #F7F8FC 100%)",
        border: "1px solid rgba(0,11,41,0.08)",
        boxShadow: "0 4px 24px rgba(0,11,41,0.06)",
      }}
    >
      <div className="mb-6 flex items-center justify-between gap-3">
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

      <div className="relative" style={{ minHeight: 176 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={batchIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={T(reduceMotion, 0.22)}
            className="flex flex-wrap content-start gap-3"
          >
            {batch.map((name, i) => {
              const tone = TONES[i % TONES.length];
              return (
                <motion.span
                  key={name}
                  initial={{ opacity: 0, y: reduceMotion ? 0 : 10, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={T(reduceMotion, 0.28, entered ? 0.02 + i * 0.03 : 0)}
                  className="rounded-full px-4 py-2 text-sm font-semibold"
                  style={{ background: "#F0F3FF", color: tone, border: `1px solid ${tone}33` }}
                >
                  {name}
                </motion.span>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-6 border-t pt-4" style={{ borderColor: "rgba(0,11,41,0.08)" }}>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "#8791A8" }}>
          <motion.span
            animate={reduceMotion ? undefined : { opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: EASE }}
          >
            ⇄
          </motion.span>
          Boundaries converging
        </div>
        <div className="relative mt-1.5" style={{ minHeight: 24 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={batchIndex % CONVERGING_PAIRS.length}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
              transition={T(reduceMotion, 0.22)}
              className="text-sm font-semibold"
              style={{ color: "#000B29" }}
            >
              {convergingPair[0]} <span style={{ color: "#3E5EDC" }}>×</span> {convergingPair[1]}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <span className="text-xs" style={{ color: "#8791A8" }}>
          Benchmark peers and track sector-level M&amp;A activity within each taxonomy node.
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          {BATCHES.map((_, i) => (
            <span
              key={i}
              className="rounded-full transition-all"
              style={{
                width: i === batchIndex ? 14 : 6,
                height: 6,
                background: i === batchIndex ? "#3E5EDC" : "rgba(0,11,41,0.14)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
