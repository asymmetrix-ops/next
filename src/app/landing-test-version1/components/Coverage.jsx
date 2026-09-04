"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@relume_io/relume-ui";
import React from "react";
import { AIDefensibilityVisual } from "./AIDefensibilityVisual";
import { CompanyProfileVisual } from "./CompanyProfileVisual";
import { DashboardMockup } from "./DashboardMockup";
import { DealRadarVisual } from "./DealRadarVisual";
import { DealTrackingVisual } from "./DealTrackingVisual";
import { FinancialBenchmarkVisual } from "./FinancialBenchmarkVisual";
import { InvestorPortfolioVisual } from "./InvestorPortfolioVisual";
import { Reveal } from "./Reveal";

const TABS = [
  {
    value: "ai-defensibility",
    trigger: "AI Defensibility",
    label: "Defend",
    heading: "AI Defensibility",
    description:
      "Asymmetrix's AI Exposure Index assesses individual data companies' AI risk exposure and defensibility. Our research reports analyse which business models AI disrupts, which it reinforces, and how this is reshaping valuations across the sector.",
  },
  {
    value: "company-profiles",
    trigger: "Company Profiles",
    label: "Monitor",
    heading: "Company Profiles",
    description:
      "Every company profile encompasses funding history, leadership team composition, product focus, and competitive positioning. Our cutting-edge analysis includes an assessment of each company's defensibility in the AI era.",
  },
  {
    value: "deal-radar",
    trigger: "Deal Radar",
    label: "Surface",
    heading: "Deal Radar",
    description:
      "Know which Data & Analytics companies will transact before the rest of the market does. Asymmetrix provides proprietary intelligence on in-market companies and surfaces deal signals long before a process formally begins.",
  },
  {
    value: "deal-tracking",
    trigger: "Deal Tracking",
    label: "Source",
    heading: "Deal Tracking",
    description:
      "See in-market companies and live processes surfaced through proprietary deal signals, long before a transaction is formally announced.",
    stat: { value: "5,708", caption: "Corporate events tracked" },
  },
  {
    value: "financial-intelligence",
    trigger: "Financial Intelligence",
    label: "Benchmark",
    heading: "Financial Intelligence",
    description:
      "Asymmetrix gathers hard-to-find proprietary financial data specific to Data & Analytics companies, moving your understanding beyond generic company data providers, and enabling deal sourcing, benchmarking and market intelligence.",
  },
  {
    value: "investors-advisors",
    trigger: "Investors & Advisors",
    label: "Track",
    heading: "Investors & Advisors",
    description:
      "Follow the PE firms, venture investors and M&A advisors active in the space — their portfolios, mandates and deal history — so you always know who is transacting and who is advising them.",
    stat: { value: "3,636", caption: "Investors covered" },
  },
];

export function Coverage() {
  return (
    <section
      id="coverage"
      className="landing-navy-bg px-[5%] py-16 md:py-24 lg:py-28"
    >
      <div className="container">
        <Reveal className="mx-auto mb-12 flex w-full max-w-lg flex-col items-center text-center text-text-alternative md:mb-18 lg:mb-20">
          <p className="landing-eyebrow-chip mb-3 rounded-full px-3 py-1 text-sm font-semibold md:mb-4">
            Coverage
          </p>
          <h2 className="mb-5 text-5xl font-bold md:mb-6 md:text-7xl lg:text-8xl">
            All of the data tracked in one place
          </h2>
          <p className="landing-text-secondary md:text-md">
            Asymmetrix monitors the full spectrum of the Data &amp; Analytics
            market, from early-stage startups to public companies. These
            features are exclusive to our clients.
          </p>
        </Reveal>
        <Tabs
          defaultValue="ai-defensibility"
          className="flex flex-col justify-center"
        >
          <TabsList className="landing-tab-track-list no-scrollbar ml-[-5vw] flex w-screen items-center justify-start overflow-scroll pl-[5vw] md:mb-16 md:ml-auto md:mr-auto md:w-fit md:justify-center md:overflow-hidden md:pl-0">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="landing-tab-trigger whitespace-nowrap px-4"
              >
                {tab.trigger}
              </TabsTrigger>
            ))}
          </TabsList>
          <p className="landing-tab-scroll-hint mb-12">← swipe to see all features →</p>
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
                {tab.value === "company-profiles" ? (
                  <CompanyProfileVisual />
                ) : tab.value === "deal-radar" ? (
                  <DealRadarVisual />
                ) : tab.value === "deal-tracking" ? (
                  <DealTrackingVisual />
                ) : tab.value === "financial-intelligence" ? (
                  <FinancialBenchmarkVisual />
                ) : tab.value === "ai-defensibility" ? (
                  <AIDefensibilityVisual />
                ) : tab.value === "investors-advisors" ? (
                  <InvestorPortfolioVisual />
                ) : (
                  <DashboardMockup
                    label={tab.heading}
                    stat={tab.stat}
                    bars={tab.bars}
                  />
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
