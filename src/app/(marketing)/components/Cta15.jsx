"use client";

import Link from "next/link";
import { LandingCalendlyInline } from "./LandingCalendlyInline";
import { Reveal } from "./Reveal";

const LANDING_CONTACT = "/contact-us";

export function Cta15() {
  return (
    <section id="book-a-demo" className="px-[5%] py-16 md:py-24 lg:py-28">
      <div className="landing-glow-border container relative z-10 px-[5%] py-16 md:py-24 lg:py-28">
        <Reveal className="relative z-10 flex flex-col gap-y-10 md:gap-y-12">
          <div className="grid grid-rows-1 items-start gap-y-5 md:grid-cols-2 md:gap-x-12 md:gap-y-8 lg:gap-x-20 lg:gap-y-16">
            <div>
              <h2 className="text-5xl font-bold text-text-alternative md:text-7xl lg:text-8xl">
                Book a demo with us today to see how we can help you
              </h2>
            </div>
            <div>
              <p className="text-text-alternative md:text-md">
                Start with a demo or get in touch with our team
              </p>
              <div className="mt-6 flex flex-wrap gap-4 md:mt-8">
                <Link
                  href={LANDING_CONTACT}
                  className="landing-btn-primary inline-flex h-12 items-center justify-center rounded-full px-8 text-sm font-semibold text-text-alternative"
                >
                  Contact Us
                </Link>
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
