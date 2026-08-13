"use client";

import { AnimatePresence, motion } from "framer-motion";
import React, { useState } from "react";
import { AIDefensibilityVisual } from "./AIDefensibilityVisual";
import { CompanyGraphVisual } from "./CompanyGraphVisual";
import { DashboardMockup } from "./DashboardMockup";
import { DealRadarVisual } from "./DealRadarVisual";

const TABS = [
  {
    id: "company-data",
    label: "Company Data",
    eyebrow: "Company Data",
    title: "Investment-grade intelligence, interlinked & proprietary",
    description:
      "The deepest Data & Analytics market graph — covering every company, its funding history, leadership team and product focus, all richly interconnected.",
  },
  {
    id: "deal-radar",
    label: "Deal Radar",
    eyebrow: "Deal Radar",
    title: "Know which companies will transact before the rest of the market does",
    description:
      "Proprietary intelligence on in-market companies and deal signals, surfaced long before a process formally begins.",
    stat: { value: "500k+", caption: "Deals recorded" },
    bars: [55, 80, 45, 70, 60],
  },
  {
    id: "ai-index",
    label: "AI Index",
    eyebrow: "AI Index",
    title: "Your lens on AI defensibility across Data & Analytics",
    description:
      "The AI Exposure Index assesses individual companies' AI risk exposure and defensibility, so you can see which business models AI disrupts and which it reinforces.",
    stat: { value: "89", caption: "Companies scored" },
    bars: [40, 65, 50, 85, 55],
  },
];

export function PlatformHero() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const content = TABS.find((tab) => tab.id === activeTab);

  return (
    <section className="landing-hero-bg relative overflow-hidden px-[5%] pb-16 pt-16 md:pb-20 md:pt-20">
      <div className="container relative z-10 mx-auto">
        <div className="mx-auto max-w-[56rem] text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <h1 className="text-5xl font-bold leading-[1.05] text-text-alternative md:text-7xl lg:text-8xl">
              Intelligence on the
              <br />
              <span className="landing-gradient-text whitespace-nowrap">
                Data & Analytics Market
              </span>
            </h1>
            <h1
              aria-hidden="true"
              className="landing-shine-overlay pointer-events-none absolute inset-0 select-none text-5xl font-bold leading-[1.05] md:text-7xl lg:text-8xl"
            >
              Intelligence on the
              <br />
              Data & Analytics Market
            </h1>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
          >
            <a
              href="#"
              className="landing-btn-primary inline-flex h-12 min-w-[180px] items-center justify-center rounded-full px-8 text-sm font-semibold text-text-alternative"
            >
              Book a demo
            </a>
            <a
              href="#"
              className="landing-btn-secondary inline-flex h-12 min-w-[180px] items-center justify-center rounded-full border px-8 text-sm font-semibold text-text-alternative transition-colors"
            >
              Explore the data
            </a>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-16 max-w-[80rem]"
        >
          <div className="flex justify-center">
            <div className="landing-tab-pill-track inline-flex">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={
                    "landing-tab-pill px-5 py-2.5 text-sm font-medium transition-all sm:px-7" +
                    (activeTab === tab.id ? " is-active" : "")
                  }
                >
                  {activeTab === tab.id && (
                    <motion.span
                      layoutId="hero-tab-highlight"
                      className="landing-tab-pill-highlight"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="landing-panel mt-8 rounded-[28px] p-6 sm:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={content.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className={
                  "grid items-center gap-8 lg:gap-10 " +
                  (content.id === "company-data"
                    ? "lg:grid-cols-[0.85fr_1.35fr]"
                    : "lg:grid-cols-[1fr_1.1fr]")
                }
              >
                <div className="text-left text-text-alternative">
                  <p className="landing-eyebrow-chip rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]">
                    {content.eyebrow}
                  </p>
                  <h2 className="mt-3 text-2xl font-bold leading-tight sm:text-3xl">
                    {content.title}
                  </h2>
                  <p className="landing-text-secondary mt-4 text-base leading-relaxed sm:text-lg">
                    {content.description}
                  </p>
                </div>

                {content.id === "company-data" ? (
                  <CompanyGraphVisual />
                ) : content.id === "deal-radar" ? (
                  <DealRadarVisual />
                ) : content.id === "ai-index" ? (
                  <AIDefensibilityVisual />
                ) : (
                  <DashboardMockup
                    label={content.eyebrow}
                    stat={content.stat}
                    bars={content.bars}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
