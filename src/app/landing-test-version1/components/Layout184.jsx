"use client";

import { Button } from "@relume_io/relume-ui";
import React from "react";
import { RxChevronRight } from "react-icons/rx";

export function Layout184() {
  return (
    <section id="relume" className="relative px-[5%] py-16 md:py-24 lg:py-28">
      <div className="container relative z-10 max-w-lg">
        <div className="flex flex-col items-center justify-center text-center">
          <p className="landing-eyebrow-chip mb-3 rounded-full px-3 py-1 text-sm font-semibold md:mb-4">
            About
          </p>
          <h2 className="mb-5 text-5xl font-bold text-text-alternative md:mb-6 md:text-7xl lg:text-8xl">
            We provide real-time data on the most dynamic market
          </h2>
          <p className="text-text-alternative md:text-md">
            Intelligence on Data & Analytics companies was fragmented across
            sources, and the industry itself lacked a consistent definition.
            Asymmetrix provides intelligence on data, research and content
            providers of every shape, size and business model – uniting the
            sector under one taxonomy and giving stakeholders critical
            proprietary data on the companies, deals and people shaping the
            industry
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 md:mt-8">
            <Button
              title="Demo"
              variant="secondary-alt"
              className="landing-btn-secondary"
            >
              Demo
            </Button>
            <Button
              title="Platform Features"
              variant="link-alt"
              size="link"
              iconRight={<RxChevronRight />}
            >
              Platform Features
            </Button>
          </div>
        </div>
      </div>
      <div className="absolute inset-0 z-0 landing-hero-bg" aria-hidden="true" />
    </section>
  );
}
