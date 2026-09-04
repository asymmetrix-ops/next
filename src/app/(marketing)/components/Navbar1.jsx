"use client";

import { Button, useMediaQuery } from "@relume_io/relume-ui";
import { motion } from "framer-motion";
import Link from "next/link";
import React, { useState } from "react";
import { openCalendlyPopup } from "@/lib/calendlyWidget";

const LANDING_HOME = "";

const NAV_LINK_CLASS =
  "landing-text-secondary block py-3 text-md transition-colors first:pt-7 hover:text-text-alternative lg:px-4 lg:py-2 lg:text-base first:lg:pt-2";

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
    isMobileMenuOpen,
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
  const closeMobileMenu = () => {
    if (useActive.isMobileMenuOpen) {
      useActive.toggleMobileMenu();
    }
  };

  return (
    <section
      id="relume"
      className="landing-navbar landing-navy-bg flex w-full items-center overflow-visible border-b lg:min-h-18 lg:px-[5%]"
    >
      <div className="size-full lg:flex lg:items-center lg:justify-between">
        <div className="flex min-h-16 items-center justify-between px-[5%] md:min-h-18 lg:min-h-full lg:px-0">
          <Link href="/">
            <img src="/icons/logo.svg" alt="Asymmetrix" className="h-8 md:h-9" />
          </Link>
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
          <Link href="/" className={NAV_LINK_CLASS} onClick={closeMobileMenu}>
            Home
          </Link>
          <Link
            href={`${LANDING_HOME}/about-us`}
            className={NAV_LINK_CLASS}
            onClick={closeMobileMenu}
          >
            About Us
          </Link>
          <Link
            href="/mcp-tracker"
            className={NAV_LINK_CLASS}
            onClick={closeMobileMenu}
          >
            MCP Tracker
          </Link>
          <Link
            href={`${LANDING_HOME}/press-releases`}
            className={NAV_LINK_CLASS}
            onClick={closeMobileMenu}
          >
            Press Releases
          </Link>
          <Link
            href={`${LANDING_HOME}/contact-us`}
            className={NAV_LINK_CLASS}
            onClick={closeMobileMenu}
          >
            Contact Us
          </Link>
          <div className="landing-navbar-actions mt-6 flex flex-col items-center gap-3 py-2 lg:ml-4 lg:mt-0 lg:flex-row lg:gap-4 lg:py-3">
            <a
              href="/login"
              className="landing-btn-login-nav inline-flex h-11 w-full items-center justify-center rounded-full px-8 text-sm font-semibold lg:w-auto"
            >
              Log In
            </a>
            <Button
              title="Talk to Sales"
              variant="secondary"
              size="sm"
              data-calendly-trigger
              className="landing-btn-primary landing-btn-primary-nav h-11 w-full rounded-full px-8 text-text-alternative lg:w-auto"
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
