"use client";

import { Button } from "@relume_io/relume-ui";
import Link from "next/link";
import React from "react";
import { RxChevronRight } from "react-icons/rx";
import { formatPressReleaseDate } from "@/lib/pressReleases";
import { Reveal } from "./Reveal";

/**
 * @param {{ releases: import("@/lib/pressReleases").PressRelease[] }} props
 */
export function PressReleasesList({ releases }) {
  return (
    <section className="landing-navy-bg px-[5%] pb-16 pt-16 md:pb-24 md:pt-20 lg:pb-28 lg:pt-24">
      <div className="container">
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          {releases.map((release, index) => {
            const formattedDate = formatPressReleaseDate(release.date);
            const href = `/landing-test-version1/press-releases/${release.slug}`;

            return (
              <Reveal key={release.slug} delay={index * 0.05} className="h-full">
                <article className="landing-panel landing-press-card flex h-full flex-col overflow-hidden rounded-xl p-0">
                  <div className="landing-press-card-accent flex-1 border-b border-[var(--asymmetrix-divider)] px-5 py-4 md:px-6 md:py-5">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="landing-eyebrow-chip rounded-full px-3 py-1 text-xs font-semibold md:text-sm">
                        {release.category}
                      </span>
                      <span className="landing-text-muted text-xs font-medium md:text-sm">
                        {formattedDate}
                      </span>
                    </div>
                    <Link href={href} className="group block">
                      <h2 className="text-xl font-bold leading-snug text-text-alternative transition-colors group-hover:text-[var(--asymmetrix-blue-deep)] md:text-2xl">
                        {release.title}
                      </h2>
                    </Link>
                    <p className="landing-text-secondary mt-3 text-sm leading-relaxed md:text-base">
                      {release.strapline}
                    </p>
                  </div>
                  <div className="flex items-center justify-between px-5 py-4 md:px-6">
                    <p className="landing-text-muted text-xs md:text-sm">
                      {release.location}
                    </p>
                    <Link href={href} className="inline-flex">
                      <Button
                        title="Read release"
                        variant="secondary"
                        size="sm"
                        iconRight={<RxChevronRight />}
                        className="landing-btn-secondary flex h-8 w-fit items-center justify-center gap-x-1.5 rounded-full px-3.5 text-sm"
                      >
                        Read
                      </Button>
                    </Link>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
