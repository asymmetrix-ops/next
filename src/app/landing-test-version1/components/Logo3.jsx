"use client";

import React from "react";
import { Reveal } from "./Reveal";

const CLIENT_LOGOS = [
  { src: "/client_logos/collingwood-trim.png", alt: "Collingwood" },
  { src: "/client_logos/plural.png", alt: "PLURAL" },
  { src: "/client_logos/eci.png", alt: "ECI" },
  { src: "/client_logos/Bridgepoint_Logo_185C.png", alt: "Bridgepoint" },
  { src: "/client_logos/endicott.svg", alt: "Endicott" },
  { src: "/client_logos/motive-trim.png", alt: "Motive" },
  { src: "/client_logos/mayfair.png", alt: "Mayfair" },
  { src: "/client_logos/burghclere.png", alt: "Burghclere" },
  { src: "/client_logos/FPE-Logo.png", alt: "FPE" },
  { src: "/client_logos/Perwyn logo.png", alt: "Perwyn" },
  { src: "/client_logos/raymond-james-trim.png", alt: "Raymond James" },
  { src: "/client_logos/Cardean_Bell_Assets-Primary-Positive-300x300.png", alt: "Cardean Bell" },
  { src: "/client_logos/Financial_Times_idRlWoph_N_0.png", alt: "Financial Times" },
];

const LogoRow = ({ ariaHidden = false }) => (
  <div
    className="flex shrink-0 items-center"
    aria-hidden={ariaHidden || undefined}
  >
    {CLIENT_LOGOS.map((logo) => (
      <div
        key={logo.src}
        className="mx-7 flex shrink-0 items-center justify-center md:mx-10"
      >
        <img
          src={logo.src}
          alt={ariaHidden ? "" : logo.alt}
          className="landing-logo-strip-image"
          loading="lazy"
          decoding="async"
        />
      </div>
    ))}
  </div>
);

export function Logo3() {
  return (
    <section
      id="clients"
      className="landing-near-black-bg overflow-hidden py-12 md:py-16 lg:py-20"
    >
      <Reveal className="container mb-8 w-full max-w-lg px-[5%] md:mb-10 lg:mb-12">
        <h1 className="text-center text-base font-bold leading-[1.2] text-text-alternative md:text-md md:leading-[1.2]">
          Trusted by leading firms across the data and analytics industry
        </h1>
      </Reveal>
      <div className="overflow-hidden pt-7 md:pt-0">
        <div className="landing-logo-strip-track flex w-max items-center">
          <LogoRow />
          <LogoRow ariaHidden />
        </div>
      </div>
    </section>
  );
}
