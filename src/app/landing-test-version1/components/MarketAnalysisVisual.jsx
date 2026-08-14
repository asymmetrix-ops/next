"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import React, { useRef } from "react";

// Illustrative report cards — real categories used across Asymmetrix
// research, distinct from the Substack tags shown lower on the page
// (Markets/Strategy/Deals) so the two sections don't read as duplicates.
const REPORTS = [
  {
    tag: "Sector Analysis",
    headline: "Why data pureplays are consolidating faster than software",
    meta: "Market Commentary · 3 days ago",
    offset: false,
  },
  {
    tag: "Deal Perspective",
    headline: "Inside the Northbridge / Signalwave process",
    meta: "Deal Perspective · 1 week ago",
    offset: true,
  },
  {
    tag: "Executive Interview",
    headline: "What buyers want from AI-native data vendors",
    meta: "Executive Interview · 2 weeks ago",
    offset: true,
  },
  {
    tag: "Valuation Watch",
    headline: "The multiple compression nobody priced in",
    meta: "Valuation Watch · 3 weeks ago",
    offset: false,
  },
];

const EASE = [0.16, 1, 0.3, 1];

function ReportCard({ report, index, active }) {
  const delayS = 0.35 + index * 0.12;
  return (
    <motion.div
      className={`flex flex-col gap-2 rounded-xl border p-4 md:p-5 ${
        report.offset ? "md:mt-8" : ""
      }`}
      style={{
        borderColor: "rgba(0,11,41,0.08)",
        background: "#FAFBFF",
      }}
      initial={{ opacity: 0, y: 16 }}
      animate={active ? { opacity: 1, y: 0 } : undefined}
      whileHover={{ y: -3, borderColor: "rgba(83,111,240,0.35)" }}
      transition={{ duration: 0.5, delay: delayS, ease: EASE }}
    >
      <span
        className="w-fit rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
        style={{ background: "#F0F3FF", color: "#3E5EDC" }}
      >
        {report.tag}
      </span>
      <p
        className="text-sm font-bold leading-snug md:text-base"
        style={{ color: "#000B29" }}
      >
        {report.headline}
      </p>
      <span className="text-xs" style={{ color: "#8791A8" }}>
        {report.meta}
      </span>
    </motion.div>
  );
}

export function MarketAnalysisVisual() {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef(null);
  const inView = useInView(containerRef, { amount: 0.4, once: true });
  const active = inView && !reduceMotion;

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-2xl p-6 md:p-8"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(0,11,41,0.08)",
        boxShadow: "0 4px 24px rgba(0,11,41,0.06), 0 1px 2px rgba(0,11,41,0.04)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full opacity-40 blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(83,111,240,0.25), transparent 70%)",
        }}
      />

      <div className="relative mb-6 flex items-center gap-2">
        <span className="relative flex size-2 items-center justify-center">
          <span
            className="absolute inline-flex size-full animate-ping rounded-full opacity-60"
            style={{ background: "#536FF0" }}
          />
          <span className="relative inline-flex size-2 rounded-full" style={{ background: "#536FF0" }} />
        </span>
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "#5A6272" }}>
          Research feed · weekly
        </span>
      </div>

      <div className="relative grid grid-cols-1 gap-4 md:grid-cols-2">
        {REPORTS.map((report, index) => (
          <ReportCard key={report.headline} report={report} index={index} active={active} />
        ))}
      </div>
    </div>
  );
}
