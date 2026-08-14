"use client";

import { LandingCalendlyInline } from "./LandingCalendlyInline";
import { Reveal } from "./Reveal";
import { Button } from "@relume_io/relume-ui";
import { openCalendlyPopup } from "@/lib/calendlyWidget";

export function Cta15() {
  return (
    <section id="book-a-demo" className="px-[5%] py-16 md:py-24 lg:py-28">
      <div className="landing-glow-border container relative z-10 px-[5%] py-16 md:py-24 lg:py-28">
        <Reveal className="relative z-10 flex flex-col gap-y-10 md:gap-y-12">
          <div className="grid grid-rows-1 items-start gap-y-5 md:grid-cols-2 md:gap-x-12 md:gap-y-8 lg:gap-x-20 lg:gap-y-16">
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
                <Button
                  title="Book a call"
                  data-calendly-trigger
                  className="landing-btn-primary h-12 rounded-full px-8"
                  onClick={() => {
                    void openCalendlyPopup();
                  }}
                >
                  Book a call
                </Button>
                <Button
                  title="Contact Us"
                  data-calendly-trigger
                  variant="secondary-alt"
                  className="landing-btn-secondary h-12 rounded-full px-8"
                  onClick={() => {
                    void openCalendlyPopup();
                  }}
                >
                  Contact Us
                </Button>
              </div>
            </div>
          </div>
          <LandingCalendlyInline height={700} />
        </Reveal>
        <div
          className="absolute inset-0 z-0 landing-hero-bg"
          aria-hidden="true"
        />
      </div>
    </section>
  );
}
