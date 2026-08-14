"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import React, { useRef, useState } from "react";
import { ContentTypeBadge } from "./ContentTypeBadge";

// Illustrative layout stagger — cards 2 and 3 offset on desktop for visual rhythm.
function mapReportOffset(index) {
  return index === 1 || index === 2;
}

const ENTRANCE_EASE = [0.16, 1, 0.3, 1];
const FOCUS_SPRING = { type: "spring", stiffness: 260, damping: 30, mass: 0.9 };

function ReportCard({
  report,
  index,
  revealed,
  motionEnabled,
  isFocused,
  isDimmed,
  onFocus,
}) {
  const delayS = 0.35 + index * 0.12;

  return (
    <motion.div
      role="article"
      tabIndex={0}
      className={`landing-market-card flex cursor-pointer flex-col gap-2 rounded-xl border p-4 outline-none md:p-5 ${
        report.offset ? "md:mt-8" : ""
      } ${isFocused ? "is-focused" : ""} ${isDimmed ? "is-dimmed" : ""}`}
      initial={{ opacity: 0, y: motionEnabled ? 14 : 0 }}
      animate={{
        opacity: !revealed ? 0 : isDimmed ? 0.64 : 1,
        y: motionEnabled && isFocused ? -4 : 0,
        scale: motionEnabled && isFocused ? 1.012 : 1,
      }}
      transition={
        revealed
          ? isFocused || isDimmed
            ? FOCUS_SPRING
            : { duration: 0.55, delay: delayS, ease: ENTRANCE_EASE }
          : FOCUS_SPRING
      }
      onMouseEnter={() => onFocus(index)}
      onFocus={() => onFocus(index)}
    >
      <ContentTypeBadge contentType={report.tag} className="shrink-0" />
      <p className="landing-market-card-title text-sm font-bold leading-snug md:text-base">
        {report.headline}
      </p>
      {report.meta ? (
        <span className="landing-market-card-meta text-xs">{report.meta}</span>
      ) : null}
    </motion.div>
  );
}

/**
 * @param {{
 *   articles?: import("@/lib/fetchTopViewedLandingArticles").TopViewedLandingArticle[];
 * }} props
 */
export function MarketAnalysisVisual({ articles = [] }) {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef(null);
  const inView = useInView(containerRef, { amount: 0.4, once: true });
  const motionEnabled = !reduceMotion;
  const revealed = inView;
  const [focusedIndex, setFocusedIndex] = useState(null);
  const reports = articles.map((article, index) => ({
    ...article,
    offset: article.offset ?? mapReportOffset(index),
  }));

  const handleFocus = (index) => {
    setFocusedIndex(index);
  };

  const handleClearFocus = () => {
    setFocusedIndex(null);
  };

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

      <div
        className="relative grid grid-cols-1 gap-4 md:grid-cols-2"
        onMouseLeave={handleClearFocus}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            handleClearFocus();
          }
        }}
      >
        {reports.length === 0 ? (
          <p className="col-span-full text-sm" style={{ color: "#8791A8" }}>
            Top research reports will appear here soon.
          </p>
        ) : (
          reports.map((report, index) => (
            <ReportCard
              key={`${report.headline}-${index}`}
              report={report}
              index={index}
              revealed={revealed}
              motionEnabled={motionEnabled}
              isFocused={focusedIndex === index}
              isDimmed={focusedIndex !== null && focusedIndex !== index}
              onFocus={handleFocus}
            />
          ))
        )}
      </div>
    </div>
  );
}
