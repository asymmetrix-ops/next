"use client";

import React from "react";
import { Reveal } from "./Reveal";

const VALUES = [
  "Never stop learning",
  "Be client-centric",
  "See a problem, fix a problem",
  "Reflect on your own actions",
  "Give your health the attention it deserves",
];

export function AboutValues() {
  return (
    <section className="landing-near-black-bg px-[5%] py-16 md:py-24 lg:py-28">
      <div className="container grid grid-cols-1 items-center gap-x-12 gap-y-14 md:grid-cols-2 md:gap-x-20">
        <Reveal>
          <p className="landing-eyebrow-chip mb-3 rounded-full px-3 py-1 text-sm font-semibold">
            Values
          </p>
          <h2 className="mb-10 max-w-3xl text-4xl font-bold leading-[1.15] text-text-alternative md:mb-12 md:text-5xl lg:text-6xl">
            At Asymmetrix, we are building a company that prioritises
            innovation and growth whilst still working for everybody.
          </h2>
          <ul className="flex flex-col gap-3 text-base md:text-lg">
            {VALUES.map((value) => (
              <li key={value} className="text-text-alternative">
                {value}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.1} className="flex w-full items-center justify-center">
          <div
            className="relative flex size-64 items-center justify-center rounded-full md:size-96"
            style={{
              background: "linear-gradient(160deg, rgba(83,111,240,0.12) 0%, rgba(83,111,240,0) 70%)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <span
              className="landing-logo-pulse-ring pointer-events-none absolute inset-0 rounded-full"
              style={{ border: "1.5px solid rgba(83,111,240,0.55)" }}
              aria-hidden="true"
            />
            <span
              className="landing-logo-pulse-ring-delay pointer-events-none absolute inset-0 rounded-full"
              style={{ border: "1.5px solid rgba(83,111,240,0.55)" }}
              aria-hidden="true"
            />
            <img
              src="/icons/logo.svg"
              alt="Asymmetrix"
              width={224}
              height={224}
              className="relative z-10 size-40 md:size-56"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
