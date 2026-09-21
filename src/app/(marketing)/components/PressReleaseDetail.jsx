"use client";

import Link from "next/link";
import React from "react";
import { RxArrowLeft } from "react-icons/rx";
import { formatPressReleaseDate } from "@/lib/pressReleases";
import { Reveal } from "./Reveal";

/**
 * @param {{ release: import("@/lib/pressReleases").PressRelease }} props
 */
export function PressReleaseDetail({ release }) {
  const formattedDate = formatPressReleaseDate(release.date);

  return (
    <section className="landing-navy-bg px-[5%] pb-16 pt-16 md:pb-24 md:pt-24 lg:pb-28 lg:pt-28">
      <div className="container">
        <Reveal className="mx-auto w-full max-w-5xl">
          <Link
            href="/press-releases"
            className="landing-text-secondary mb-8 inline-flex items-center gap-2 text-sm font-medium transition-colors hover:text-text-alternative md:mb-10 md:text-base"
          >
            <RxArrowLeft className="size-4" />
            All press releases
          </Link>

          <article className="landing-panel landing-press-detail overflow-hidden rounded-xl">
            <header className="border-b border-[var(--asymmetrix-divider)] px-6 py-8 md:px-10 md:py-10">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="landing-eyebrow-chip rounded-full px-3 py-1 text-xs font-semibold md:text-sm">
                  {release.category}
                </span>
                <span className="landing-text-muted text-xs font-medium md:text-sm">
                  {formattedDate}
                </span>
                <span className="landing-text-muted text-xs font-medium md:text-sm">
                  {release.location}
                </span>
              </div>
              <h1 className="text-3xl font-bold leading-tight text-text-alternative md:text-4xl lg:text-5xl">
                {release.title}
              </h1>
              <p className="mt-4 text-base leading-relaxed text-text-alternative md:text-lg">
                {release.strapline}
              </p>
            </header>

            <div className="landing-press-prose px-6 py-8 md:px-10 md:py-10">
              {release.sections.map((section, index) => {
                if (section.type === "paragraph") {
                  return (
                    <p
                      key={index}
                      className="mb-5 text-base leading-relaxed text-text-alternative last:mb-0 md:text-md"
                    >
                      {section.text}
                    </p>
                  );
                }

                if (section.type === "heading") {
                  return (
                    <h2
                      key={index}
                      className="mb-3 mt-8 text-lg font-bold text-text-alternative first:mt-0 md:text-xl"
                    >
                      {section.text}
                    </h2>
                  );
                }

                if (section.type === "quote") {
                  return (
                    <blockquote
                      key={index}
                      className="landing-press-quote my-8 border-l-4 pl-5 md:pl-6"
                    >
                      <p className="text-base font-medium leading-relaxed text-text-alternative md:text-lg">
                        &ldquo;{section.text}&rdquo;
                      </p>
                      {section.attribution ? (
                        <footer className="mt-3 text-sm text-text-alternative md:text-base">
                          — {section.attribution}
                        </footer>
                      ) : null}
                    </blockquote>
                  );
                }

                if (section.type === "contact") {
                  return (
                    <div
                      key={index}
                      className="landing-press-contact mt-10 rounded-xl px-5 py-4 md:px-6 md:py-5"
                    >
                      <p className="text-sm font-semibold uppercase tracking-wide text-text-alternative">
                        Media contact
                      </p>
                      <p className="mt-2 text-base text-text-alternative">
                        {section.name}
                      </p>
                      <a
                        href={`mailto:${section.email}`}
                        className="mt-1 inline-block text-base font-medium text-[var(--asymmetrix-blue-deep)] transition-colors hover:text-[var(--asymmetrix-blue)]"
                      >
                        {section.email}
                      </a>
                    </div>
                  );
                }

                return null;
              })}
            </div>
          </article>
        </Reveal>
      </div>
    </section>
  );
}
