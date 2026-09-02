"use client";

import React from "react";
import Image from "next/image";
import { Reveal } from "./Reveal";

const CLIENT_LOGOS = [
  { src: "/client_logos/collingwood-trim.png", alt: "Collingwood", width: 392, height: 84 },
  { src: "/client_logos/plural.png", alt: "PLURAL", large: true, width: 240, height: 242 },
  { src: "/client_logos/eci.png", alt: "ECI", width: 773, height: 469 },
  { src: "/client_logos/Bridgepoint_Logo_185C.png", alt: "Bridgepoint", width: 3929, height: 793 },
  { src: "/client_logos/endicott.svg", alt: "Endicott", width: 743, height: 178 },
  { src: "/client_logos/motive-trim.png", alt: "Motive", large: true, width: 957, height: 843 },
  { src: "/client_logos/mayfair.png", alt: "Mayfair", width: 721, height: 176 },
  { src: "/client_logos/burghclere.png", alt: "Burghclere", width: 1098, height: 323 },
  { src: "/client_logos/FPE-Logo.png", alt: "FPE", width: 680, height: 302 },
  { src: "/client_logos/Perwyn logo.png", alt: "Perwyn", width: 2644, height: 360 },
  { src: "/client_logos/raymond-james-trim.png", alt: "Raymond James", width: 594, height: 203 },
  {
    src: "/client_logos/Cardean_Bell_Assets-Primary-Positive-300x300.png",
    alt: "Cardean Bell",
    large: true,
    width: 300,
    height: 300,
  },
  {
    src: "/client_logos/Financial_Times_idRlWoph_N_0.png",
    alt: "Financial Times",
    width: 820,
    height: 67,
  },
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
        <Image
          src={logo.src}
          alt={ariaHidden ? "" : logo.alt}
          width={logo.width}
          height={logo.height}
          className={
            "landing-logo-strip-image" +
            (logo.large ? " landing-logo-strip-image-lg" : "")
          }
          loading="lazy"
          sizes="200px"
        />
      </div>
    ))}
  </div>
);

export function Logo3({
  id = "clients",
  showHeading = true,
  heading = "Trusted by leading firms across the Data & Analytics industry",
}) {
  return (
    <section
      id={id}
      className="landing-near-black-bg overflow-hidden py-12 md:py-16 lg:py-20"
    >
      {showHeading ? (
        <Reveal className="container mb-8 w-full max-w-lg px-[5%] md:mb-10 lg:mb-12">
          <h2 className="text-center text-base font-bold leading-[1.2] text-text-alternative md:text-md md:leading-[1.2]">
            {heading}
          </h2>
        </Reveal>
      ) : null}
      <div className="overflow-hidden pt-7 md:pt-0">
        <div className="landing-logo-strip-track flex w-max items-center">
          <LogoRow />
          <LogoRow ariaHidden />
        </div>
      </div>
    </section>
  );
}
