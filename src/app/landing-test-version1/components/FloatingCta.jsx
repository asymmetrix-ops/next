"use client";

import React from "react";
import { openCalendlyPopup } from "@/lib/calendlyWidget";

export function FloatingCta() {
  return (
    <button
      type="button"
      data-calendly-trigger
      onClick={() => {
        void openCalendlyPopup();
      }}
      className="landing-btn-primary landing-floating-cta fixed bottom-6 right-6 z-50 inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-semibold text-text-alternative sm:px-7"
    >
      Book a demo
    </button>
  );
}
