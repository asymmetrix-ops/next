"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { RxChevronLeft, RxChevronRight } from "react-icons/rx";
import { Reveal } from "./Reveal";

const AUTO_ADVANCE_MS = 7000;
const EASE = [0.16, 1, 0.3, 1];
const SWIPE_THRESHOLD = 80;

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
];

const SLIDE_VARIANTS = {
  enter: (direction) => ({ opacity: 0, x: direction > 0 ? 48 : -48 }),
  center: { opacity: 1, x: 0 },
  exit: (direction) => ({ opacity: 0, x: direction > 0 ? -48 : 48 }),
};

function TestimonialCard({ testimonial, direction, draggable, onDragEnd }) {
  return (
    <motion.div
      custom={direction}
      variants={SLIDE_VARIANTS}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.45, ease: EASE }}
      drag={draggable ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      onDragEnd={onDragEnd}
      whileDrag={{ cursor: "grabbing" }}
      style={{ cursor: draggable ? "grab" : "default" }}
      className="landing-panel flex min-h-[220px] flex-col rounded-[28px] p-6 text-center text-text-alternative md:min-h-[180px] md:flex-row md:items-center md:gap-8 md:p-8 md:text-left"
    >
      <div className="mb-4 flex shrink-0 items-start justify-center text-4xl font-bold leading-none text-background-alternative md:mb-0 md:justify-start">
        &ldquo;
      </div>
      <blockquote className="flex-1">
        <span className="text-base font-bold leading-relaxed md:text-lg">
          &ldquo;{testimonial.quote}&rdquo;
        </span>
      </blockquote>
      <div className="mt-6 flex shrink-0 flex-col items-center justify-center self-center md:mt-0 md:w-44">
        <div className="mb-3 flex size-12 min-h-12 min-w-12 items-center justify-center rounded-full bg-background-alternative text-sm font-semibold">
          {testimonial.initials}
        </div>
        <p className="text-center text-sm font-semibold">{testimonial.name}</p>
        <p className="landing-text-secondary text-center text-xs md:text-sm">
          {testimonial.title}
        </p>
      </div>
    </motion.div>
  );
}

export function Testimonial1() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const reduceMotion = useReducedMotion();
  const total = TESTIMONIALS.length;
  const progressRef = useRef(0);

  // Resets the active dot's fill whenever the slide changes. Kept separate
  // from the ticking effect below so pausing/resuming never resets progress.
  useEffect(() => {
    progressRef.current = reduceMotion ? 1 : 0;
    setProgress(progressRef.current);
  }, [activeIndex, reduceMotion]);

  // Ticks the fill on a fixed-step interval rather than requestAnimationFrame
  // — rAF gets throttled/suspended by the browser once a tab is treated as
  // backgrounded, which would freeze the bar; setInterval keeps advancing.
  useEffect(() => {
    if (reduceMotion || isPaused) return undefined;

    const stepMs = 50;
    const increment = stepMs / AUTO_ADVANCE_MS;
    const id = window.setInterval(() => {
      progressRef.current = Math.min(progressRef.current + increment, 1);
      setProgress(progressRef.current);
    }, stepMs);

    return () => window.clearInterval(id);
  }, [isPaused, reduceMotion, activeIndex]);

  const goTo = useCallback(
    (index, dir) => {
      setDirection(dir);
      setActiveIndex((index + total) % total);
    },
    [total],
  );

  const goNext = useCallback(() => {
    goTo(activeIndex + 1, 1);
  }, [activeIndex, goTo]);

  const goPrev = useCallback(() => {
    goTo(activeIndex - 1, -1);
  }, [activeIndex, goTo]);

  useEffect(() => {
    if (reduceMotion || isPaused) return undefined;

    const timer = window.setInterval(() => {
      setDirection(1);
      setActiveIndex((current) => (current + 1) % total);
    }, AUTO_ADVANCE_MS);

    return () => window.clearInterval(timer);
  }, [isPaused, reduceMotion, total]);

  const handleDragEnd = (_event, info) => {
    if (info.offset.x <= -SWIPE_THRESHOLD) {
      goNext();
    } else if (info.offset.x >= SWIPE_THRESHOLD) {
      goPrev();
    }
  };

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
          <motion.div layout className="relative mx-auto max-w-6xl overflow-hidden">
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <TestimonialCard
                key={activeTestimonial.id}
                testimonial={activeTestimonial}
                direction={direction}
                draggable={!reduceMotion}
                onDragEnd={handleDragEnd}
              />
            </AnimatePresence>
          </motion.div>

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
                  onClick={() => goTo(index, index > activeIndex ? 1 : -1)}
                  className={`relative h-2.5 overflow-hidden rounded-full transition-[width] duration-300 ${
                    index === activeIndex
                      ? "w-10 bg-[#000B29]/10"
                      : "w-2.5 bg-[#000B29]/15 hover:bg-[#000B29]/25"
                  }`}
                >
                  {index === activeIndex && (
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-background-alternative"
                      style={{ width: `${progress * 100}%` }}
                    />
                  )}
                </button>
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
        </Reveal>
      </div>
    </section>
  );
}
