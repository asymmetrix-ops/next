"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const LANDING_HOME = "/landing-test-version1";

function scrollToHash(hash) {
  const sectionId = hash.replace(/^#/, "");
  if (!sectionId) return;

  const element = document.getElementById(sectionId);
  if (!element) return;

  element.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function LandingHashScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== LANDING_HOME) return;

    const run = () => scrollToHash(window.location.hash);

    run();
    const timeout = window.setTimeout(run, 150);

    window.addEventListener("hashchange", run);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("hashchange", run);
    };
  }, [pathname]);

  return null;
}
