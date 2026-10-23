"use client";

import Link from "next/link";
import React from "react";
import { RxChevronRight } from "react-icons/rx";
import { PRESS_RELEASES, formatPressReleaseDate } from "@/lib/pressReleases";
import { Reveal } from "./Reveal";

export function PressReleasesList() {
  return (
    <section className="landing-navy-bg px-[5%] pb-16 pt-16 md:pb-24 md:pt-20 lg:pb-28 lg:pt-24">
      <div className="container">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          {PRESS_RELEASES.map((release, index) => (
            <Reveal key={release.slug} delay={index * 0.08}>
              <Link
                href={`/press-releases/${release.slug}`}
                className="landing-panel landing-press-card group block overflow-hidden rounded-xl"
              >
                <div className="landing-press-card-accent px-6 md:px-8">
                  <div className="flex flex-wrap items-center gap-2 py-4">
                    <span className="landing-eyebrow-chip rounded-full px-3 py-1 text-xs font-semibold">
                      {release.category}
                    </span>
                    <span className="landing-text-muted text-xs font-medium">
                      {formatPressReleaseDate(release.date)}
                    </span>
                    <span className="landing-text-muted text-xs font-medium">
                      {release.location}
                    </span>
                  </div>
                </div>
                <div className="px-6 py-6 md:px-8 md:py-8">
                  <h2 className="text-xl font-bold text-text-alternative transition-colors group-hover:text-[var(--asymmetrix-blue)] md:text-2xl">
                    {release.title}
                  </h2>
                  <p className="landing-text-secondary mt-3 text-base leading-relaxed md:text-md">
                    {release.strapline}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[var(--asymmetrix-blue-deep)] md:text-base">
                    Read release
                    <RxChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
