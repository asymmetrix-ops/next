"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import React, { useRef } from "react";

const ENTRANCE_EASE = [0.16, 1, 0.3, 1];

// Illustrative only — fabricated news items, not real companies or events.
// Mirrors the platform's News card design: sub-type tag, headline, About
// text, byline, date. Update once the News card design is finalised.
const NEWS_ITEMS = [
  {
    subType: "Funding News",
    headline: "Fabricated Analytics Co. raises $40m Series C",
    about:
      "About: the round values the company at $210m and will fund expansion into supply-chain data.",
    byline: "by Asymmetrix News Desk",
    date: "2 days ago",
  },
  {
    subType: "Personnel News",
    headline: "Sample Data Group appoints new Chief Data Officer",
    about:
      "About: the appointment follows the company's acquisition of a smaller ESG data provider earlier this year.",
    byline: "by Asymmetrix News Desk",
    date: "5 days ago",
  },
];

function T(reduceMotion, duration, delay = 0) {
  return { duration: reduceMotion ? 0 : duration, delay: reduceMotion ? 0 : delay, ease: ENTRANCE_EASE };
}

function NewsCard({ item, index, revealed, reduceMotion }) {
  return (
    <motion.div
      role="article"
      className="flex flex-col gap-2 rounded-lg border-l-4 p-4"
      style={{
        background: "linear-gradient(180deg, #ffffff 0%, #fffafb 100%)",
        borderColor: "#e11d48",
        borderTopColor: "rgba(0,11,41,0.08)",
        borderRightColor: "rgba(0,11,41,0.08)",
        borderBottomColor: "rgba(0,11,41,0.08)",
        borderTopWidth: 1,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      }}
      initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }}
      animate={revealed ? { opacity: 1, y: 0 } : undefined}
      transition={T(reduceMotion, 0.5, 0.2 + index * 0.12)}
    >
      <span
        className="w-fit rounded-full px-2.5 py-1 text-xs font-semibold"
        style={{ background: "#fff1f2", color: "#9f1239", border: "1px solid #fecdd3" }}
      >
        {item.subType}
      </span>
      <p className="text-sm font-bold leading-snug md:text-base" style={{ color: "#1a202c" }}>
        {item.headline}
      </p>
      <p className="text-xs leading-relaxed" style={{ color: "#374151" }}>
        {item.about}
      </p>
      <div className="flex items-center justify-between gap-3 text-xs" style={{ color: "#6b7280" }}>
        <span>{item.byline}</span>
        <span>{item.date}</span>
      </div>
    </motion.div>
  );
}

export function NewsVisual() {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef(null);
  const inView = useInView(containerRef, { amount: 0.4, once: true });

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
      <div className="relative mb-6 flex items-center gap-2">
        <span className="relative flex size-2 items-center justify-center">
          <span
            className="absolute inline-flex size-full animate-ping rounded-full opacity-60"
            style={{ background: "#536FF0" }}
          />
          <span className="relative inline-flex size-2 rounded-full" style={{ background: "#536FF0" }} />
        </span>
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "#5A6272" }}>
          News
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {NEWS_ITEMS.map((item, index) => (
          <NewsCard
            key={item.headline}
            item={item}
            index={index}
            revealed={inView}
            reduceMotion={reduceMotion}
          />
        ))}
      </div>
    </div>
  );
}
