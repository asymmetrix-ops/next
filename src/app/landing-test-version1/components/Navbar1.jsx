"use client";

import { Button, useMediaQuery } from "@relume_io/relume-ui";
import { motion } from "framer-motion";
import React, { useState } from "react";
import { openCalendlyPopup } from "@/lib/calendlyWidget";

const useRelume = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 991px)");
  const toggleMobileMenu = () => setIsMobileMenuOpen((prev) => !prev);
  const openOnMobileDropdownMenu = () => {
    setIsDropdownOpen((prev) => !prev);
  };
  const openOnDesktopDropdownMenu = () => {
    if (!isMobile) setIsDropdownOpen(true);
  };
  const closeOnDesktopDropdownMenu = () => {
    if (!isMobile) setIsDropdownOpen(false);
  };
  const animateMobileMenu = isMobileMenuOpen ? "open" : "close";
  const animateMobileMenuButtonSpan = isMobileMenuOpen
    ? ["open", "rotatePhase"]
    : "closed";
  const animateDropdownMenu = isDropdownOpen ? "open" : "close";
  const animateDropdownMenuIcon = isDropdownOpen ? "rotated" : "initial";
  return {
    toggleMobileMenu,
    openOnDesktopDropdownMenu,
    closeOnDesktopDropdownMenu,
    openOnMobileDropdownMenu,
    animateMobileMenu,
    animateMobileMenuButtonSpan,
    animateDropdownMenu,
    animateDropdownMenuIcon,
  };
};

export function Navbar1() {
  const useActive = useRelume();
  return (
    <section
      id="relume"
      className="landing-navbar landing-navy-bg flex w-full items-center overflow-visible border-b lg:min-h-18 lg:px-[5%]"
    >
      <div className="size-full lg:flex lg:items-center lg:justify-between">
        <div className="flex min-h-16 items-center justify-between px-[5%] md:min-h-18 lg:min-h-full lg:px-0">
          <a href="/landing-test-version1">
            <img src="/icons/logo.svg" alt="Asymmetrix" className="h-8 md:h-9" />
          </a>
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={useActive.animateMobileMenu === "open"}
            className="-mr-2 flex size-12 flex-col items-center justify-center lg:hidden"
            onClick={useActive.toggleMobileMenu}
          >
            <motion.span
              className="landing-navbar-icon my-[3px] h-0.5 w-6"
              animate={useActive.animateMobileMenuButtonSpan}
              variants={{
                open: { translateY: 8, transition: { delay: 0.1 } },
                rotatePhase: { rotate: -45, transition: { delay: 0.2 } },
                closed: {
                  translateY: 0,
                  rotate: 0,
                  transition: { duration: 0.2 },
                },
              }}
            />
            <motion.span
              className="landing-navbar-icon my-[3px] h-0.5 w-6"
              animate={useActive.animateMobileMenu}
              variants={{
                open: { width: 0, transition: { duration: 0.1 } },
                closed: {
                  width: "1.5rem",
                  transition: { delay: 0.3, duration: 0.2 },
                },
              }}
            />
            <motion.span
              className="landing-navbar-icon my-[3px] h-0.5 w-6"
              animate={useActive.animateMobileMenuButtonSpan}
              variants={{
                open: { translateY: -8, transition: { delay: 0.1 } },
                rotatePhase: { rotate: 45, transition: { delay: 0.2 } },
                closed: {
                  translateY: 0,
                  rotate: 0,
                  transition: { duration: 0.2 },
                },
              }}
            />
          </button>
        </div>
        <motion.div
          variants={{
            open: { height: "var(--height-open, 100dvh)" },
            close: { height: "var(--height-closed, 0)" },
          }}
          initial="close"
          exit="close"
          animate={useActive.animateMobileMenu}
          transition={{ duration: 0.4 }}
          className="overflow-hidden px-[5%] lg:flex lg:items-center lg:overflow-visible lg:px-0 lg:[--height-closed:auto] lg:[--height-open:auto]"
        >
          <a
            href="/landing-test-version1/about-us"
            className="landing-text-secondary block py-3 text-md transition-colors first:pt-7 hover:text-text-alternative lg:px-4 lg:py-2 lg:text-base first:lg:pt-2"
          >
            About Us
          </a>
          <a
            href="/landing-test-version1/press-releases"
            className="landing-text-secondary block py-3 text-md transition-colors first:pt-7 hover:text-text-alternative lg:px-4 lg:py-2 lg:text-base first:lg:pt-2"
          >
            Press Releases
          </a>
          <a
            href="/landing-test-version1/contact-us"
            className="landing-text-secondary block py-3 text-md transition-colors first:pt-7 hover:text-text-alternative lg:px-4 lg:py-2 lg:text-base first:lg:pt-2"
          >
            Contact Us
          </a>
          <div className="landing-navbar-actions mt-6 flex flex-col items-center gap-3 py-2 lg:ml-4 lg:mt-0 lg:flex-row lg:gap-4 lg:py-3">
            <a
              href="/login"
              className="landing-btn-secondary inline-flex h-11 w-full items-center justify-center rounded-full px-6 text-sm font-semibold lg:w-auto"
            >
              Log in
            </a>
            <Button
              title="Talk to Sales"
              variant="secondary"
              size="sm"
              data-calendly-trigger
              className="landing-btn-primary landing-btn-primary-nav h-11 w-full rounded-full text-text-alternative lg:w-auto"
              onClick={() => {
                void openCalendlyPopup();
              }}
            >
              Talk to Sales
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
