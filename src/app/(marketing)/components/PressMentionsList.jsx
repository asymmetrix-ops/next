"use client";

import React from "react";
import { RxArrowTopRight } from "react-icons/rx";
import { PRESS_MENTIONS } from "@/lib/pressMentions";
import { Reveal } from "./Reveal";

export function PressMentionsList() {
  if (PRESS_MENTIONS.length === 0) return null;

  return (
    <section
      id="press-mentions"
      aria-labelledby="press-mentions-heading"
      className="landing-navy-bg px-[5%] pb-16 md:pb-24 lg:pb-28"
    >
      <div className="container">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <Reveal>
            <h2
              id="press-mentions-heading"
              className="text-3xl font-bold text-text-alternative md:text-4xl"
            >
              Press Mentions
            </h2>
            <p className="landing-text-secondary mt-3 text-base md:text-md">
              Where Asymmetrix and our research are featured in the press and on
              other websites.
            </p>
          </Reveal>
          <ul className="flex flex-col gap-4">
            {PRESS_MENTIONS.map((mention, index) => (
              <li key={mention.url}>
                <Reveal delay={index * 0.08}>
                  <a
                    href={mention.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="landing-panel landing-press-card group block overflow-hidden rounded-xl"
                  >
                    <div className="px-6 py-6 md:px-8 md:py-7">
                    <span className="landing-eyebrow-chip rounded-full px-3 py-1 text-xs font-semibold">
                      {mention.source}
                    </span>
                    <h3 className="mt-3 text-lg font-bold text-text-alternative transition-colors group-hover:text-[var(--asymmetrix-blue)] md:text-xl">
                      {mention.title}
                    </h3>
                    <p className="landing-text-secondary mt-2 text-base leading-relaxed">
                      {mention.description}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--asymmetrix-blue-deep)]">
                      Read on {mention.source}
                      <RxArrowTopRight className="size-4" />
                    </span>
                    </div>
                  </a>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
