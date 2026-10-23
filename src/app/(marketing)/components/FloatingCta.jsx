"use client";

import React from "react";
import { RxCalendar } from "react-icons/rx";
import { openCalendlyPopup } from "@/lib/calendlyWidget";

export function FloatingCta() {
  return (
    <button
      type="button"
      data-calendly-trigger
      aria-label="Book a demo"
      onClick={() => {
        void openCalendlyPopup();
      }}
      className="landing-btn-primary landing-floating-cta fixed bottom-4 right-4 z-50 inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-xs font-semibold text-text-alternative sm:bottom-6 sm:right-6 sm:h-12 sm:px-7 sm:text-sm"
    >
      <RxCalendar className="size-4 shrink-0 sm:hidden" />
      <span className="hidden sm:inline">Book a demo</span>
    </button>
  );
}
