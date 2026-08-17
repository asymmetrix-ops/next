"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import React, { useCallback, useEffect, useState } from "react";
import { RxChevronLeft, RxChevronRight } from "react-icons/rx";
import { Reveal } from "./Reveal";

const AUTO_ADVANCE_MS = 7000;
const EASE = [0.16, 1, 0.3, 1];

const TESTIMONIALS = [
  {
    id: "motive-partners",
    quote:
      "We use a range of intelligence platforms across our investment process, and Asymmetrix stands out for its purpose-built approach to the way investors evaluate and track the Data & Analytics sector.",
    initials: "CT",
    name: "Charles Teschner",
    title: "Motive Partners",
  },
  {
    id: "raymond-james",
    quote:
      "Asymmetrix provides proprietary data on proprietary data businesses and is the go to source for actionable intelligence.",
    initials: "GW",
    name: "George Watson",
    title: "Raymond James",
  },
  {
    id: "endicott",
    quote:
      "The team at Asymmetrix do a fantastic job covering the data and information services world. Their subject matter expertise, strong network, and importantly, understanding of the nuances in this sector, shine through in the content, including accurate and detailed company classifications, market maps and overviews, and deal briefs and rumor coverage. Asymmetrix has quickly become a go-to resource for our team at Endicott.",
    initials: "MC",
    name: "Mike Chinn",
    title: "Endicott",
  },
  {
    id: "ey-anonymised",
    quote:
      "Asymmetrix is an invaluable intelligence tool and data set for our team",
    initials: "EY",
    name: "Corporate Finance / M&A Partner",
    title: "EY (Anonymised)",
  },
];

function TestimonialCard({ testimonial }) {
  return (
    <div className="landing-panel relative flex min-h-[280px] flex-col overflow-hidden rounded-[28px] p-6 text-center text-text-alternative md:min-h-[240px] md:flex-row md:items-center md:gap-8 md:p-8 md:text-left">
      <div className="mb-4 text-4xl font-bold leading-none text-background-alternative md:mb-0 md:shrink-0">
        &ldquo;
      </div>
      <blockquote className="flex-1 text-base font-bold leading-relaxed md:text-lg">
        &ldquo;{testimonial.quote}&rdquo;
      </blockquote>
      <div className="mt-6 flex shrink-0 flex-col items-center justify-center md:mt-0 md:w-44">
        <div className="mb-3 flex size-12 min-h-12 min-w-12 items-center justify-center rounded-full bg-background-alternative text-sm font-semibold">
          {testimonial.initials}
        </div>
        <p className="text-sm font-semibold">{testimonial.name}</p>
        <p className="landing-text-secondary text-xs md:text-sm">
          {testimonial.title}
        </p>
      </div>
    </div>
  );
}

export function Testimonial1() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const reduceMotion = useReducedMotion();

  const goTo = useCallback((index) => {
    setActiveIndex((index + TESTIMONIALS.length) % TESTIMONIALS.length);
  }, []);

  const goNext = useCallback(() => {
    goTo(activeIndex + 1);
  }, [activeIndex, goTo]);

  const goPrev = useCallback(() => {
    goTo(activeIndex - 1);
  }, [activeIndex, goTo]);

  useEffect(() => {
    if (reduceMotion || isPaused) return undefined;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % TESTIMONIALS.length);
    }, AUTO_ADVANCE_MS);

    return () => window.clearInterval(timer);
  }, [isPaused, reduceMotion]);

  const activeTestimonial = TESTIMONIALS[activeIndex];

  return (
    <section
      id="testimonials"
      className="landing-near-black-bg px-[5%] py-12 md:py-16"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsPaused(false);
        }
      }}
    >
      <div className="container">
        <Reveal>
          <div className="relative mx-auto max-w-6xl">
            <div className="overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeTestimonial.id}
                  initial={
                    reduceMotion ? false : { opacity: 0, x: 24 }
                  }
                  animate={{ opacity: 1, x: 0 }}
                  exit={
                    reduceMotion ? undefined : { opacity: 0, x: -24 }
                  }
                  transition={{ duration: 0.45, ease: EASE }}
                >
                  <TestimonialCard testimonial={activeTestimonial} />
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-6 flex items-center justify-center gap-3 md:gap-4">
              <button
                type="button"
                aria-label="Previous testimonial"
                onClick={goPrev}
                className="landing-btn-secondary inline-flex size-10 items-center justify-center rounded-full"
              >
                <RxChevronLeft className="size-5" />
              </button>

              <div className="flex items-center gap-2">
                {TESTIMONIALS.map((testimonial, index) => (
                  <button
                    key={testimonial.id}
                    type="button"
                    aria-label={`Show testimonial from ${testimonial.name}`}
                    aria-current={index === activeIndex ? "true" : undefined}
                    onClick={() => goTo(index)}
                    className={`h-2.5 rounded-full transition-all ${
                      index === activeIndex
                        ? "w-8 bg-background-alternative"
                        : "w-2.5 bg-white/25 hover:bg-white/40"
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                aria-label="Next testimonial"
                onClick={goNext}
                className="landing-btn-secondary inline-flex size-10 items-center justify-center rounded-full"
              >
                <RxChevronRight className="size-5" />
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
