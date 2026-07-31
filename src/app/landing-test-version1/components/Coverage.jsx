"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@relume_io/relume-ui";
import React from "react";
import { DashboardMockup } from "./DashboardMockup";

const TABS = [
  {
    value: "company-profiles",
    trigger: "Company profiles",
    label: "Monitor",
    heading: "Company profiles",
    description:
      "Every company profile encompasses funding history, leadership team composition, product focus, and competitive positioning. Our cutting-edge analysis includes an assessment of each company's defensibility in the AI era.",
    stat: { value: "89", caption: "Companies tracked" },
    bars: [40, 65, 50, 80, 60],
  },
  {
    value: "sector-intelligence",
    trigger: "Sector intelligence",
    label: "Classify",
    heading: "Sector intelligence",
    description:
      "Every company sits within a single, consistent taxonomy spanning data, research and content sub-sectors — benchmark peers, track sector-level M&A activity, and see how the boundaries are shifting as business models converge.",
    stat: { value: "40+", caption: "Sub-sectors mapped" },
    bars: [55, 45, 70, 50, 35],
  },
  {
    value: "investors-advisors",
    trigger: "Investors & Advisors",
    label: "Track",
    heading: "Investors & Advisors",
    description:
      "Follow the PE firms, venture investors and M&A advisors active in the space — their portfolios, mandates and deal history — so you always know who is transacting and who is advising them.",
    stat: { value: "20k+", caption: "Investors covered" },
    bars: [30, 60, 45, 75, 55],
  },
  {
    value: "deal-tracking",
    trigger: "Deal tracking",
    label: "Source",
    heading: "Deal tracking",
    description:
      "See in-market companies and live processes surfaced through proprietary deal signals, long before a transaction is formally announced.",
    stat: { value: "500k+", caption: "Deals recorded" },
    bars: [65, 50, 80, 40, 70],
  },
  {
    value: "market-analysis",
    trigger: "Market analysis",
    label: "Analyse",
    heading: "Market analysis",
    description:
      "Go beyond the data with research reports and market commentary that explain what's driving valuations, consolidation and disruption across the Data & Analytics sector.",
    stat: { value: "11k+", caption: "Advisors indexed" },
    bars: [45, 70, 55, 65, 40],
  },
];

export function Coverage() {
  return (
    <section
      id="relume"
      className="landing-navy-bg px-[5%] py-16 md:py-24 lg:py-28"
    >
      <div className="container">
        <div className="mx-auto mb-12 flex w-full max-w-lg flex-col items-center text-center text-text-alternative md:mb-18 lg:mb-20">
          <p className="landing-eyebrow-chip mb-3 rounded-full px-3 py-1 text-sm font-semibold md:mb-4">
            Coverage
          </p>
          <h2 className="mb-5 text-5xl font-bold md:mb-6 md:text-7xl lg:text-8xl">
            All of the data tracked in one place
          </h2>
          <p className="landing-text-secondary md:text-md">
            Asymmetrix monitors the full spectrum of the data and analytics
            market, from early-stage startups to public companies. These are
            features in our platform exclusive to our clients.
          </p>
        </div>
        <Tabs
          defaultValue="company-profiles"
          className="flex flex-col justify-center"
        >
          <TabsList className="no-scrollbar mb-12 ml-[-5vw] flex w-screen items-center justify-start overflow-scroll pl-[5vw] md:mb-16 md:ml-0 md:w-full md:justify-center md:overflow-hidden md:pl-0">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="landing-tab-trigger whitespace-nowrap border px-4"
              >
                {tab.trigger}
              </TabsTrigger>
            ))}
          </TabsList>
          {TABS.map((tab) => (
            <TabsContent
              key={tab.value}
              value={tab.value}
              className="data-[state=active]:animate-tabs"
            >
              <div className="grid grid-cols-1 items-center gap-x-12 gap-y-8 text-text-alternative md:grid-cols-2 md:gap-x-20">
                <div>
                  <p className="landing-eyebrow-chip mb-3 rounded-full px-3 py-1 text-sm font-semibold md:mb-4">
                    {tab.label}
                  </p>
                  <h3 className="mb-5 text-3xl font-bold md:mb-6 md:text-4xl lg:text-5xl">
                    {tab.heading}
                  </h3>
                  <p className="landing-text-secondary md:text-md">
                    {tab.description}
                  </p>
                </div>
                <DashboardMockup
                  label={tab.heading}
                  stat={tab.stat}
                  bars={tab.bars}
                />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
