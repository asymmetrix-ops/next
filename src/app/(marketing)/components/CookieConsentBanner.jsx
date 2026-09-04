"use client";

import React, { useEffect, useState } from "react";

const STORAGE_KEY = "asymmetrix_cookie_consent";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) setVisible(true);
    } catch {
      // localStorage unavailable (e.g. blocked) — fail open, show once.
      setVisible(true);
    }
  }, []);

  const respond = (value) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore write failures
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="landing-panel landing-cookie-banner fixed inset-x-4 bottom-4 z-[60] mx-auto max-w-3xl rounded-2xl p-5 sm:inset-x-6 sm:bottom-6 sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="landing-text-secondary text-sm leading-relaxed sm:text-base">
          We use cookies to improve your experience and understand how our
          site is used. Read our{" "}
          <a
            href="/privacy-policy"
            className="underline transition-colors hover:text-[var(--asymmetrix-blue)]"
          >
            privacy policy
          </a>{" "}
          to learn more.
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={() => respond("declined")}
            className="landing-btn-secondary h-10 rounded-full px-5 text-sm font-semibold"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => respond("accepted")}
            className="landing-btn-primary h-10 rounded-full px-5 text-sm font-semibold text-text-alternative"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
