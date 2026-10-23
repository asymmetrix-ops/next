"use client";

import React from "react";
import { Reveal } from "./Reveal";

export function AboutHero() {
  return (
    <section className="landing-hero-bg px-[5%] pb-12 pt-16 md:pb-16 md:pt-20 lg:pb-20">
      <div className="container">
        <Reveal className="mx-auto flex w-full max-w-3xl flex-col items-center text-center text-text-alternative">
          <p className="landing-eyebrow-chip mb-3 rounded-full px-3 py-1 text-sm font-semibold md:mb-4">
            About Us
          </p>
          <h1 className="mb-5 text-5xl font-bold leading-[1.05] md:mb-6 md:text-7xl lg:text-8xl">
            Our Vision
          </h1>
          <p className="max-w-2xl text-base text-text-alternative md:text-md">
            Asymmetrix was founded in January 2024 to solve a critical
            problem: the Data &amp; Analytics sector had no reliable source of
            truth for the investors, advisors and corporations who operate
            within it.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
