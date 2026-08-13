"use client";

import { Button } from "@relume_io/relume-ui";
import { AnimatePresence, motion } from "framer-motion";
import React, { useState } from "react";
import { AIDefensibilityVisual } from "./AIDefensibilityVisual";
import { DashboardMockup } from "./DashboardMockup";
import { DealRadarVisual } from "./DealRadarVisual";
import { FinancialBenchmarkVisual } from "./FinancialBenchmarkVisual";
import { Reveal } from "./Reveal";

const buttonClassName = "landing-btn-secondary h-12 rounded-full px-8";

const FEATURES = [
  {
    id: "financial-intelligence",
    label: "Financial Intelligence",
    description:
      "Asymmetrix gathers hard-to-find proprietary financial data specific to Data & Analytics companies, moving your understanding beyond generic company data providers, and enabling deal sourcing, benchmarking and market intelligence.",
    cta: "Our Coverage",
    stat: { value: "89", caption: "Companies tracked" },
    bars: [40, 65, 50, 80, 60],
  },
  {
    id: "deal-radar",
    label: "Deal Radar",
    description:
      "Know which Data & Analytics companies will transact before the rest of the market does. Asymmetrix provides proprietary intelligence on in-market companies and surfaces deal signals long before a process formally begins.",
    cta: "Product Features",
    stat: { value: "500k+", caption: "Deals recorded" },
    bars: [55, 80, 45, 70, 60],
  },
  {
    id: "ai-defensibility",
    label: "AI defensibility",
    description:
      "Asymmetrix's AI Exposure Index assesses individual data companies' AI risk exposure and defensibility. Our research reports analyse which business models AI disrupts, which it reinforces, and how this is reshaping valuations across the sector.",
    cta: "Contact Us",
    stat: { value: "89", caption: "Companies scored" },
    bars: [40, 65, 50, 85, 55],
  },
];

export function Layout485() {
  const [activeId, setActiveId] = useState(FEATURES[0].id);
  const feature = FEATURES.find((f) => f.id === activeId);

  return (
    <section
      id="relume"
      className="landing-near-black-bg relative overflow-hidden px-[5%] py-16 md:py-24 lg:py-28"
    >
      {/* Glow blobs sit low and to the sides, clear of the headline/tab
          text at the top, so they add depth without hurting contrast. */}
      <div
        className="pointer-events-none absolute -left-40 top-[55%] h-[36rem] w-[36rem] rounded-full bg-[hsl(228,85%,55%)]/30 blur-[110px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-40 bottom-0 h-[34rem] w-[34rem] rounded-full bg-[hsl(228,85%,63%)]/15 blur-[110px]"
        aria-hidden="true"
      />
      <div className="container relative z-10">
        <Reveal className="mx-auto mb-12 flex max-w-[42rem] flex-col items-center text-center text-text-alternative md:mb-16">
          <p className="landing-eyebrow-chip mb-3 rounded-full px-3 py-1 text-sm font-semibold md:mb-4">
            Platform Feature
          </p>
          <h2 className="text-4xl font-bold md:text-5xl">
            Everything you need in one platform
          </h2>
        </Reveal>

        <Reveal delay={0.1} className="mb-10 flex justify-center md:mb-14">
          <div className="landing-tab-pill-track inline-flex flex-wrap justify-center">
            {FEATURES.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveId(f.id)}
                className={
                  "landing-tab-pill whitespace-nowrap px-5 py-2.5 text-sm font-medium transition-all sm:px-7" +
                  (activeId === f.id ? " is-active" : "")
                }
              >
                {activeId === f.id && (
                  <motion.span
                    layoutId="feature-tab-highlight"
                    className="landing-tab-pill-highlight"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                {f.label}
              </button>
            ))}
          </div>
        </Reveal>

        <AnimatePresence mode="wait">
          <motion.div
            key={feature.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 gap-6 lg:grid-cols-2"
          >
            <div className="landing-panel flex flex-col justify-center rounded-[28px] p-8 text-text-alternative sm:p-10">
              <p className="landing-eyebrow-chip mb-3 rounded-full px-3 py-1 text-sm font-semibold">
                Platform Feature
              </p>
              <h3 className="mb-5 text-3xl font-bold md:text-4xl">
                {feature.label}
              </h3>
              <p className="landing-text-secondary md:text-md">
                {feature.description}
              </p>
              <div className="mt-8">
                <Button
                  title={feature.cta}
                  variant="secondary"
                  className={buttonClassName}
                >
                  {feature.cta}
                </Button>
              </div>
            </div>

            <div className="landing-panel flex items-center rounded-[28px] p-8 sm:p-10">
              {feature.id === "financial-intelligence" ? (
                <FinancialBenchmarkVisual />
              ) : feature.id === "deal-radar" ? (
                <DealRadarVisual />
              ) : feature.id === "ai-defensibility" ? (
                <AIDefensibilityVisual />
              ) : (
                <DashboardMockup
                  label={feature.label}
                  stat={feature.stat}
                  bars={feature.bars}
                />
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
