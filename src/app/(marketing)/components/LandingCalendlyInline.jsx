"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import {
  CALENDLY_URL,
  ensureCalendlyReady,
  prefetchCalendly,
} from "@/lib/calendlyWidget";

export function LandingCalendlyPrefetch() {
  useEffect(() => {
    const handlePointerEnter = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-calendly-trigger]")) {
        prefetchCalendly();
      }
    };

    document.addEventListener("pointerenter", handlePointerEnter, true);
    return () => {
      document.removeEventListener("pointerenter", handlePointerEnter, true);
    };
  }, []);

  return null;
}

export function LandingCalendlyInline({ height = 700, className = "" }) {
  const mountRef = useRef(null);
  const initializedRef = useRef(false);
  const inView = useInView(mountRef, { once: true, amount: 0.2 });
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!inView || initializedRef.current) return undefined;

    let cancelled = false;
    setIsLoading(true);

    ensureCalendlyReady()
      .then(() => {
        if (cancelled || initializedRef.current) return;

        const mountNode = mountRef.current;
        const Calendly = window.Calendly;
        if (!mountNode || !Calendly) return;

        initializedRef.current = true;
        Calendly.initInlineWidget({
          url: CALENDLY_URL,
          parentElement: mountNode,
          resize: true,
        });
        setIsReady(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [inView]);

  return (
    <div
      className={`calendly-embed landing-calendly-inline relative w-full overflow-hidden rounded-2xl border border-white/10 bg-white ${className}`.trim()}
      style={{ minWidth: 320, minHeight: height }}
    >
      {!isReady ? (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center px-6 text-center text-sm"
          style={{ color: "#5A6272" }}
          aria-hidden={!isLoading}
        >
          {isLoading ? "Loading scheduler…" : "Scheduler loads when visible"}
        </div>
      ) : null}
      <div ref={mountRef} className="h-full min-h-[inherit] w-full" />
    </div>
  );
}
