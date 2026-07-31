"use client";

import { Button } from "@relume_io/relume-ui";
import React, { useState } from "react";
import { DashboardMockup } from "./DashboardMockup";

const buttonClassName =
  "border-2 border-background-alternative bg-white/5 text-text-alternative hover:bg-white/15";

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
      className="landing-navy-bg relative overflow-hidden px-[5%] py-16 md:py-24 lg:py-28"
    >
      {/* Glow blobs sit low and to the sides, clear of the headline/tab
          text at the top, so they add depth without hurting contrast. */}
      <div
        className="pointer-events-none absolute -left-40 top-[55%] h-[36rem] w-[36rem] rounded-full bg-[hsl(228,85%,55%)]/30 blur-[110px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-40 bottom-0 h-[34rem] w-[34rem] rounded-full bg-[hsl(268,85%,60%)]/25 blur-[110px]"
        aria-hidden="true"
      />
      <div className="container relative z-10">
        <div className="mx-auto mb-12 max-w-[42rem] text-center text-text-alternative md:mb-16">
          <p className="mb-3 font-semibold md:mb-4">Platform Feature</p>
          <h2 className="text-4xl font-bold md:text-5xl">
            Everything you need in one platform
          </h2>
        </div>

        <div className="mb-10 flex justify-center md:mb-14">
          <div className="landing-tab-pill-track inline-flex flex-wrap justify-center gap-1 rounded-full p-1">
            {FEATURES.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveId(f.id)}
                className={
                  "landing-tab-pill whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-medium transition-all sm:px-7" +
                  (activeId === f.id ? " is-active" : "")
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="landing-panel flex flex-col justify-center rounded-[28px] p-8 text-text-alternative sm:p-10">
            <p className="mb-3 font-semibold text-background-alternative">
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
            <DashboardMockup
              label={feature.label}
              stat={feature.stat}
              bars={feature.bars}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
