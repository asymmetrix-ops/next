"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import React, { useRef, useState } from "react";
import { ContentTypeBadge } from "./ContentTypeBadge";
import { CountryFlagImg } from "@/components/corporate-events/CorporateEventPartyLink";
import { COUNTRY_FLAG_INLINE_SIZE_PX } from "@/lib/dealRadar";

const CARD_FLAG_SIZE_PX = COUNTRY_FLAG_INLINE_SIZE_PX * 1.3;

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
  const delayS = 0.3 + index * 0.1;

  return (
    <motion.div
      role="article"
      tabIndex={0}
      className={`landing-market-card flex cursor-pointer flex-col gap-3 rounded-xl border p-4 outline-none md:p-5 ${
        isFocused ? "is-focused" : ""
      } ${isDimmed ? "is-dimmed" : ""}`}
      initial={{ opacity: 0, y: motionEnabled ? 14 : 0 }}
      animate={{
        opacity: !revealed ? 0 : isDimmed ? 0.64 : 1,
        y: motionEnabled && isFocused ? -3 : 0,
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
      <div className="flex items-center justify-between gap-3">
        <ContentTypeBadge contentType={report.tag} className="shrink-0" />
        {report.meta ? (
          <span className="landing-market-card-meta shrink-0 text-xs font-medium">
            {report.meta}
          </span>
        ) : null}
      </div>
      <p className="landing-market-card-title flex items-center gap-2 text-base font-bold leading-snug md:text-lg">
        <span>{report.headline}</span>
        {report.countryIso2 ? (
          <CountryFlagImg iso2={report.countryIso2} size={CARD_FLAG_SIZE_PX} />
        ) : null}
      </p>
      {report.strapline ? (
        <p className="landing-market-card-strapline text-sm leading-relaxed">
          {report.strapline}
        </p>
      ) : null}
      {report.sectorName || report.byline ? (
        <div className="landing-market-card-footer flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {report.sectorName ? (
            <span className="landing-market-card-sector rounded-full px-2.5 py-0.5 font-medium">
              {report.sectorName}
            </span>
          ) : null}
          {report.byline ? <span>{report.byline}</span> : null}
        </div>
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
  const reports = articles;

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
          Research feed · daily
        </span>
      </div>

      <div
        className="landing-market-list relative flex flex-col gap-3"
        onMouseLeave={handleClearFocus}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            handleClearFocus();
          }
        }}
      >
        {reports.length === 0 ? (
          <p className="text-sm" style={{ color: "#8791A8" }}>
            Top research reports will appear here soon.
          </p>
        ) : (
          reports.map((report, index) => (
            <ReportCard
              key={report.id ?? `${report.headline}-${index}`}
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
