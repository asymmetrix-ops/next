"use client";

import { Button } from "@relume_io/relume-ui";
import React from "react";

export function Cta15() {
  return (
    <section id="relume" className="px-[5%] py-16 md:py-24 lg:py-28">
      <div className="landing-glow-border container relative z-10 px-[5%] py-16 md:py-24 lg:py-28">
        <div className="relative z-10 grid grid-rows-1 items-start gap-y-5 md:grid-cols-2 md:gap-x-12 md:gap-y-8 lg:gap-x-20 lg:gap-y-16">
          <div>
            <h1 className="text-5xl font-bold text-text-alternative md:text-7xl lg:text-8xl">
              Book a demo with us today to see how we can help you
            </h1>
          </div>
          <div>
            <p className="text-text-alternative md:text-md">
              Start with a demo or explore
            </p>
            <div className="mt-6 flex flex-wrap gap-4 md:mt-8">
              <Button title="Calendly">Calendly</Button>
              <Button title="Contact Us" variant="secondary-alt">
                Contact Us
              </Button>
            </div>
          </div>
        </div>
        <div
          className="absolute inset-0 z-0 landing-hero-bg"
          aria-hidden="true"
        />
      </div>
    </section>
  );
}
