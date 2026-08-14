"use client";

import React from "react";
import { Reveal } from "./Reveal";

const CLIENT_LOGOS = [
  { name: "Bridgepoint", src: "/client_logos/Bridgepoint_Logo_185C.png" },
  { name: "Cardean Bell", src: "/client_logos/Cardean_Bell_Assets-Primary-Positive-300x300.png" },
  { name: "FPE", src: "/client_logos/FPE-Logo.png" },
  { name: "Perwyn", src: "/client_logos/Perwyn logo.jpg" },
  { name: "Burghclere", src: "/client_logos/burghclere.png" },
  { name: "Collingwood", src: "/client_logos/collingwood-trim.png" },
  { name: "eci", src: "/client_logos/eci.jpg" },
  { name: "Endicott", src: "/client_logos/endicott.svg" },
  { name: "Mayfair Equity Partners", src: "/client_logos/mayfair.png" },
  { name: "Motive Partners", src: "/client_logos/motive-trim.png" },
  { name: "Plural", src: "/client_logos/plural.png" },
  { name: "Raymond James", src: "/client_logos/raymond-james-trim.jpg" },
];

const LogoRow = () => (
  <div className="flex shrink-0 animate-loop-horizontally items-center">
    {CLIENT_LOGOS.map((logo, index) => (
      <span
        key={index}
        className="mx-4 flex h-14 w-[132px] shrink-0 items-center justify-center rounded-lg bg-white p-3 shadow-[0_2px_10px_rgba(0,0,0,0.12)] md:mx-5 md:h-16 md:w-[152px]"
      >
        <img
          src={logo.src}
          alt={logo.name}
          className="max-h-full max-w-full object-contain"
        />
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
