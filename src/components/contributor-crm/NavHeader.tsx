"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

type NavHeaderProps = {
  activeLink?: "login" | "about";
  rightActions?: ReactNode;
};

export function NavHeader({ activeLink, rightActions }: NavHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const loginClass =
    activeLink === "login"
      ? "font-semibold text-blue-600 no-underline hover:text-blue-700"
      : "text-gray-800 no-underline hover:text-blue-700";

  const aboutClass =
    activeLink === "about"
      ? "font-semibold text-blue-600 no-underline hover:text-blue-700"
      : "text-gray-800 no-underline hover:text-blue-700";

  return (
    <header className="relative flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3 text-gray-900 no-underline">
          <Image
            src="/icons/logo.svg"
            alt="Logo"
            width={40}
            height={40}
            style={{ borderRadius: "50%" }}
          />
          <span className="hidden font-bold tracking-wide sm:inline">ASYMMETRIX</span>
        </Link>
      </div>

      <nav className="hidden items-center gap-6 md:flex">
        <a
          href="https://asymmetrixintelligence.substack.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-800 no-underline hover:text-blue-700"
        >
          Substack
        </a>
        <Link href="/about-us" className={aboutClass}>
          About Us
        </Link>
        <Link href="/contributor-crm/login" className={loginClass}>
          Client login
        </Link>
        {rightActions}
      </nav>

      <button
        aria-label={isMenuOpen ? "Close menu" : "Open menu"}
        className="flex h-9 w-9 items-center justify-center rounded-lg md:hidden"
        onClick={() => setIsMenuOpen((v) => !v)}
        style={{ appearance: "none", background: "transparent", border: 0 }}
        type="button"
      >
        <span
          className="relative inline-block"
          style={{ width: 18, height: 2, background: "#111" }}
        >
          <span
            className="absolute left-0 right-0 -top-1.5"
            style={{ height: 2, background: "#111" }}
          />
          <span
            className="absolute left-0 right-0 top-1.5"
            style={{ height: 2, background: "#111" }}
          />
        </span>
      </button>

      {isMenuOpen && (
        <div className="absolute left-0 right-0 top-full z-50 flex flex-col gap-2 border-t border-gray-200 bg-white p-3 md:hidden">
          <a
            href="https://asymmetrixintelligence.substack.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="py-2 text-gray-800 no-underline"
            onClick={() => setIsMenuOpen(false)}
          >
            Substack
          </a>
          <Link
            href="/about-us"
            className={`py-2 ${aboutClass}`}
            onClick={() => setIsMenuOpen(false)}
          >
            About Us
          </Link>
          <Link
            href="/contributor-crm/login"
            className={`py-2 ${loginClass}`}
            onClick={() => setIsMenuOpen(false)}
          >
            Client login
          </Link>
          {rightActions}
        </div>
      )}
    </header>
  );
}
