"use client";

import React from "react";
import { Reveal } from "./Reveal";

const CLIENT_LOGOS = ["Collingwood", "PLURAL", "eci", "CortenCapital", "Bridgepoint"];

const LogoRow = () => (
  <div className="flex shrink-0 animate-loop-horizontally items-center">
    {CLIENT_LOGOS.map((name, index) => (
      <span
        key={index}
        className="landing-text-muted mx-7 shrink-0 text-xl font-semibold tracking-tight md:mx-10 md:text-2xl"
      >
        {name}
      </span>
    ))}
  </div>
);

export function Logo3() {
  return (
    <section
      id="relume"
      className="landing-near-black-bg overflow-hidden py-12 md:py-16 lg:py-20"
    >
      <Reveal className="container mb-8 w-full max-w-lg px-[5%] md:mb-10 lg:mb-12">
        <h1 className="text-center text-base font-bold leading-[1.2] text-text-alternative md:text-md md:leading-[1.2]">
          Trusted by leading firms across the data and analytics industry
        </h1>
      </Reveal>
      <div className="flex items-center pt-7 md:pt-0">
        <LogoRow />
        <LogoRow />
      </div>
    </section>
  );
}
