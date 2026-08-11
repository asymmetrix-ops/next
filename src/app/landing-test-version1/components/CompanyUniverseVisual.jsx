"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import React, { useEffect, useRef, useState } from "react";

// Live company universe totals (companies_counts).
const DEFAULT_DATA = {
  all: 6550,
  public: 225,
  peOwned: 671,
  vcBacked: 1881,
  private: 1671,
  subsidiary: 385,
  acquired: 1313,
  other: 404,
};

const CATEGORY_ROWS = [
  { key: "all", label: "All" },
  { key: "public", label: "Public" },
  { key: "peOwned", label: "PE-owned" },
  { key: "vcBacked", label: "VC-backed" },
  { key: "private", label: "Private" },
  { key: "subsidiary", label: "Subsidiary" },
  { key: "acquired", label: "Acquired" },
  { key: "other", label: "Other" },
];

const EASE = [0.16, 1, 0.3, 1];

function easeOutExpo(t) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

// Counts up once when `active` becomes true, then holds the final value.
function useCountUp(target, active, { duration = 1000, delay = 0 } = {}) {
  const [value, setValue] = useState(0);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (!active || hasStartedRef.current) return;
    hasStartedRef.current = true;

    let rafId;
    let startTime;
    const timeoutId = setTimeout(() => {
      const tick = (now) => {
        if (startTime === undefined) startTime = now;
        const progress = Math.min((now - startTime) / duration, 1);
        setValue(Math.round(target * easeOutExpo(progress)));
        if (progress < 1) rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timeoutId);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [active, target, duration, delay]);

  return value;
}

function CategoryRow({ label, value, maxValue, index, active }) {
  const delayS = 0.95 + index * 0.09;
  const pct = Math.max((value / maxValue) * 100, 4);
  const count = useCountUp(value, active, {
    duration: 900,
    delay: delayS * 1000,
  });

  return (
    <motion.div
      className="flex items-center gap-4"
      initial={false}
      animate={{ opacity: active ? 1 : 0, y: active ? 0 : 10 }}
      transition={{ duration: 0.5, delay: delayS, ease: EASE }}
    >
      <span
        className="w-[88px] shrink-0 text-sm font-medium"
        style={{ color: "#000B29" }}
      >
        {label}
      </span>
      <span
        className="relative h-2 flex-1 overflow-hidden rounded-full"
        style={{ background: "#EEF0F7" }}
      >
        <motion.span
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: "linear-gradient(90deg, #536FF0, #3E5EDC)" }}
          initial={false}
          animate={{ width: active ? `${pct}%` : "0%" }}
          transition={{ duration: 0.75, delay: delayS, ease: EASE }}
        />
      </span>
      <span
        className="w-14 shrink-0 text-right text-sm font-semibold tabular-nums"
        style={{ color: "#000B29" }}
      >
        {count.toLocaleString()}
      </span>
    </motion.div>
  );
}

export function CompanyUniverseVisual({ data }) {
  const values = { ...DEFAULT_DATA, ...data };
  const reduceMotion = useReducedMotion();
  const containerRef = useRef(null);
  const inView = useInView(containerRef, { amount: 0.4, once: true });
  const active = inView && !reduceMotion;

  const maxValue = Math.max(...Object.values(values), 1);
  const totalCount = useCountUp(values.all, active, {
    duration: 1100,
    delay: 0,
  });

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-2xl p-6 md:p-8"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(0,11,41,0.08)",
        boxShadow: "0 4px 24px rgba(0,11,41,0.06), 0 1px 2px rgba(0,11,41,0.04)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(83,111,240,0.25), transparent 70%)",
        }}
      />

      <div className="relative mb-6 flex items-center gap-2">
        <span className="relative flex size-2 items-center justify-center">
          <span
            className="absolute inline-flex size-full animate-ping rounded-full opacity-60"
            style={{ background: "#536FF0" }}
          />
          <span
            className="relative inline-flex size-2 rounded-full"
            style={{ background: "#536FF0" }}
          />
        </span>
        <span
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: "#5A6272" }}
        >
          Company universe · live
        </span>
      </div>

      {reduceMotion ? (
        <>
          <div className="mb-8 flex flex-col items-center text-center">
            <span
              className="mb-2 text-xs font-semibold uppercase tracking-[0.14em]"
              style={{ color: "#5A6272" }}
            >
              All Companies
            </span>
            <span className="landing-gradient-text text-6xl font-bold tabular-nums md:text-7xl">
              {values.all.toLocaleString()}
            </span>
          </div>
          <div
            className="mb-6 h-px w-full"
            style={{ background: "rgba(0,11,41,0.08)" }}
          />
          <div className="flex flex-col gap-3">
            {CATEGORY_ROWS.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-4">
                <span
                  className="w-[88px] shrink-0 text-sm font-medium"
                  style={{ color: "#000B29" }}
                >
                  {label}
                </span>
                <span
                  className="relative h-2 flex-1 overflow-hidden rounded-full"
                  style={{ background: "#EEF0F7" }}
                >
                  <span
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: `${Math.max((values[key] / maxValue) * 100, 4)}%`,
                      background: "linear-gradient(90deg, #536FF0, #3E5EDC)",
                    }}
                  />
                </span>
                <span
                  className="w-14 shrink-0 text-right text-sm font-semibold tabular-nums"
                  style={{ color: "#000B29" }}
                >
                  {values[key].toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="relative mb-8 flex flex-col items-center text-center">
            <span
              className="mb-2 text-xs font-semibold uppercase tracking-[0.14em]"
              style={{ color: "#5A6272" }}
            >
              All Companies
            </span>
            <motion.span
              className="landing-gradient-text text-6xl font-bold tabular-nums md:text-7xl"
              initial={false}
              animate={{ opacity: active ? 1 : 0.3, scale: active ? 1 : 0.96 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              {totalCount.toLocaleString()}
            </motion.span>
          </div>

          <motion.div
            className="mb-6 h-px w-full origin-center"
            style={{ background: "rgba(0,11,41,0.08)" }}
            initial={false}
            animate={{ scaleX: active ? 1 : 0 }}
            transition={{ duration: 0.6, delay: 0.85, ease: EASE }}
          />

          <div className="flex flex-col gap-3">
            {CATEGORY_ROWS.map(({ key, label }, index) => (
              <CategoryRow
                key={key}
                label={label}
                value={values[key]}
                maxValue={maxValue}
                index={index}
                active={active}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
