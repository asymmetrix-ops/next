"use client";

import { Button } from "@relume_io/relume-ui";
import React from "react";

export function Header114() {
  return (
    <section id="relume" className="relative px-[5%]">
      <div className="container flex max-h-[60rem] min-h-svh">
        <div className="py-16 md:py-24 lg:py-28">
          <div className="relative z-10 grid h-full auto-cols-fr grid-cols-1 gap-12 md:grid-cols-2 md:gap-20">
            <div className="flex flex-col justify-start md:justify-center">
              <h1 className="text-6xl font-bold text-text-alternative md:text-9xl lg:text-10xl">
                Intelligence on the Data & Analytics Market
              </h1>
              <div className="mt-6 flex flex-wrap gap-4 md:mt-8">
                <Button title="Book a demo">Book a demo</Button>
                <Button title="Explore the data" variant="secondary-alt">
                  Explore the data
                </Button>
              </div>
            </div>
            <div className="mx-[7.5%] flex flex-col justify-end">
              <p className="text-text-alternative md:text-md">
                Asymmetrix is the source of truth for the Data & Analytics
                industry. Track companies, deals, and sub-sectors globally in
                real time. Built for PE firms, M&A advisors, and corporates and
                industry participants who need an in-depth view of the market’s
                most dynamic space.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute inset-0 z-0 landing-hero-bg" aria-hidden="true" />
    </section>
  );
}
