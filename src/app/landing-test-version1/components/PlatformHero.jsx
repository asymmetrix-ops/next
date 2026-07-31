"use client";

import React, { useState } from "react";
import { DashboardMockup } from "./DashboardMockup";

// NOTE: the "Company Data" tab video is temporarily borrowed from gain.ai's
// public marketing site (see public/landing-test-version1/PLACEHOLDER-ASSETS.md)
// purely so this layout can be walked through internally — replace it with a
// real Asymmetrix product recording before this page is ever made public.
// The other two tabs use an abstract placeholder graphic instead of gain's
// image assets, because those files turned out to be unrelated PE-firm logos
// (Partners Group / Lincoln International) rather than product screenshots.
const TABS = [
  {
    id: "company-data",
    label: "Company Data",
    eyebrow: "Company Data",
    title: "Investment-grade intelligence, interlinked & proprietary",
    description:
      "The deepest Data & Analytics market graph — covering every company, its funding history, leadership team and product focus, all richly interconnected.",
    video: "/landing-test-version1/videos/hero-demo.mp4",
    poster: "/landing-test-version1/images/hero-mockup.webp",
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
          <span className="landing-trust-pill mb-8 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm">
            Data & Analytics market intelligence
          </span>

          <h1 className="text-balance text-5xl font-bold leading-[1.05] text-text-alternative md:text-7xl lg:text-8xl">
            Intelligence on the{" "}
            <span className="landing-gradient-text">Data & Analytics Market</span>
          </h1>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <a
              href="#"
              className="inline-flex h-12 min-w-[180px] items-center justify-center rounded-full bg-background-alternative px-8 text-sm font-semibold text-text-alternative shadow-lg transition-opacity hover:opacity-90"
            >
              Book a demo
            </a>
            <a
              href="#"
              className="inline-flex h-12 min-w-[180px] items-center justify-center rounded-full border border-white/30 px-8 text-sm font-semibold text-text-alternative transition-colors hover:bg-white/10"
            >
              Explore the data
            </a>
          </div>
        </div>

        <div className="mx-auto mt-16 max-w-[80rem]">
          <p className="landing-text-secondary text-center text-sm font-semibold uppercase tracking-[0.12em]">
            One integrated data & intelligence platform
          </p>

          <div className="mt-6 flex justify-center">
            <div className="landing-tab-pill-track inline-flex rounded-full p-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={
                    "landing-tab-pill rounded-full px-5 py-2.5 text-sm font-medium transition-all sm:px-7" +
                    (activeTab === tab.id ? " is-active" : "")
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="landing-panel mt-8 rounded-[28px] p-6 sm:p-8">
            <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-10">
              <div className="text-left text-text-alternative">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-background-alternative">
                  {content.eyebrow}
                </p>
                <h2 className="mt-3 text-2xl font-bold leading-tight sm:text-3xl">
                  {content.title}
                </h2>
                <p className="landing-text-secondary mt-4 text-base leading-relaxed sm:text-lg">
                  {content.description}
                </p>
              </div>

              {content.video ? (
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                  <video
                    key={content.video}
                    autoPlay
                    loop
                    muted
                    playsInline
                    poster={content.poster}
                    className="h-auto w-full"
                  >
                    <source src={content.video} type="video/mp4" />
                  </video>
                </div>
              ) : (
                <DashboardMockup
                  label={content.eyebrow}
                  stat={content.stat}
                  bars={content.bars}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
