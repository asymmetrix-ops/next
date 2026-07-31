"use client";

import React from "react";

export function Testimonial1() {
  return (
    <section
      id="relume"
      className="landing-navy-bg px-[5%] py-16 md:py-24 lg:py-28"
    >
      <div className="container">
        <div className="mx-auto max-w-[42rem]">
          <div className="landing-panel relative overflow-hidden rounded-[28px] p-8 text-center text-text-alternative sm:p-12">
            <div className="mb-6 text-5xl font-bold leading-none text-background-alternative md:mb-8">
              &ldquo;
            </div>
            <blockquote className="text-xl font-bold md:text-2xl">
              &ldquo;Asymmetrix gave us visibility into deal flow we
              didn&apos;t know existed. We&apos;ve closed two investments we
              would have missed entirely.&rdquo;
            </blockquote>
            <div className="mt-6 flex flex-col items-center justify-center md:mt-8">
              <div className="mb-3 flex size-16 min-h-16 min-w-16 items-center justify-center rounded-full bg-background-alternative text-lg font-semibold md:mb-4">
                JM
              </div>
              <p className="font-semibold">James Mitchell</p>
              <p className="landing-text-secondary">Partner, Insight Capital</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
