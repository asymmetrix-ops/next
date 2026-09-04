"use client";

import { motion, useReducedMotion } from "framer-motion";
import React from "react";

// Shared scroll-reveal wrapper: fades/slides a block in once as it enters
// the viewport. `once: true` so sections don't re-animate on scroll back up.
// Respects prefers-reduced-motion by skipping the offset/transition entirely.
export function Reveal({
  children,
  className = "",
  delay = 0,
  y = 24,
  duration = 0.6,
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
