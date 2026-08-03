"use client";

import React from "react";
import { Reveal } from "./Reveal";

const TESTIMONIALS = [
  {
    quote:
      "Asymmetrix gave us visibility into deal flow we didn't know existed. We've closed two investments we would have missed entirely.",
    initials: "JM",
    name: "James Mitchell",
    title: "Partner, Insight Capital",
  },
  {
    quote:
      "It's turned weeks of manual research into minutes. Asymmetrix is now the first place we look before any process.",
    initials: "SC",
    name: "Sarah Chen",
    title: "Principal, Northbridge Partners",
  },
  {
    quote:
      "The AI Exposure Index alone justified the subscription — we caught a defensibility risk our target hadn't disclosed.",
    initials: "DO",
    name: "David Okafor",
    title: "M&A Director, Falkirk Advisory",
  },
];

export function Testimonial1() {
  return (
    <section
      id="relume"
      className="landing-navy-bg px-[5%] py-16 md:py-24 lg:py-28"
    >
      <div className="container">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((testimonial, index) => (
            <Reveal
              key={testimonial.name}
              delay={index * 0.1}
              className="h-full"
            >
              <div className="landing-panel relative flex h-full flex-col overflow-hidden rounded-[28px] p-8 text-center text-text-alternative">
                <div className="mb-6 text-5xl font-bold leading-none text-background-alternative">
                  &ldquo;
                </div>
                <blockquote className="flex-1 text-lg font-bold">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>
                <div className="mt-6 flex flex-col items-center justify-center">
                  <div className="mb-3 flex size-14 min-h-14 min-w-14 items-center justify-center rounded-full bg-background-alternative text-base font-semibold">
                    {testimonial.initials}
                  </div>
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="landing-text-secondary text-sm">
                    {testimonial.title}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
