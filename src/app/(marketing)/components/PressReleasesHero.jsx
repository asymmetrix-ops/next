"use client";

import React from "react";
import { Reveal } from "./Reveal";

export function PressReleasesHero({ title, description }) {
  return (
    <section className="landing-hero-bg px-[5%] pb-12 pt-16 md:pb-16 md:pt-20 lg:pb-20">
      <div className="container">
        <Reveal className="mx-auto flex w-full max-w-3xl flex-col items-center text-center text-text-alternative">
          <p className="landing-eyebrow-chip mb-3 rounded-full px-3 py-1 text-sm font-semibold md:mb-4">
            Newsroom
          </p>
          <h1 className="mb-5 text-5xl font-bold leading-[1.05] md:mb-6 md:text-7xl lg:text-8xl">
            {title}
          </h1>
          {description ? (
            <p className="landing-text-secondary max-w-2xl text-base md:text-md">
              {description}
            </p>
          ) : null}
        </Reveal>
      </div>
    </section>
  );
}
