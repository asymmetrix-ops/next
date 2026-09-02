"use client";

import React from "react";
import { Reveal } from "./Reveal";

export function PressReleasesList() {
  return (
    <section className="landing-navy-bg px-[5%] pb-16 pt-16 md:pb-24 md:pt-20 lg:pb-28 lg:pt-24">
      <div className="container">
        <Reveal className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
          <p className="landing-eyebrow-chip mb-3 rounded-full px-3 py-1 text-sm font-semibold md:mb-4">
            Newsroom
          </p>
          <h2 className="mb-4 text-3xl font-bold text-text-alternative md:text-4xl">
            Coming soon
          </h2>
          <p className="landing-text-secondary text-base md:text-md">
            Our press releases will be published here shortly. Check back soon
            for official announcements from Asymmetrix.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
