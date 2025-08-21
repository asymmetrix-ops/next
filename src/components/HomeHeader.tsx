"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function HomeHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, []);

  return (
    <header
      style={{
        background:
          "linear-gradient(90deg, #1f3a93 0%, #0b1a3c 50%, #040b1c 100%)",
        color: "#fff",
        height: 64,
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        position: "relative",
      }}
    >
      <style jsx>{`
        @media (min-width: 768px) {
          .desktop-only {
            display: flex;
          }
          .mobile-only {
            display: none;
          }
        }
        @media (max-width: 767px) {
          .desktop-only {
            display: none;
          }
          .mobile-only {
            display: flex;
          }
        }
      `}</style>
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src="https://www.asymmetrixintelligence.com/images/logo.svg"
            alt="Asymmetrix Logo"
            width={28}
            height={28}
            style={{ borderRadius: "50%" }}
          />
          <span style={{ fontWeight: 700, letterSpacing: 0.5 }}>
            ASYMMETRIX
          </span>
        </div>

        <nav className="desktop-only" style={{ alignItems: "center", gap: 24 }}>
          <a
            href="https://asymmetrix.substack.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#fff", textDecoration: "none" }}
          >
            Substack
          </a>
          <Link
            href="/about-us"
            style={{ color: "#fff", textDecoration: "none" }}
          >
            About Us
          </Link>
          <Link
            href="/login"
            style={{ color: "#fff", textDecoration: "none", fontWeight: 600 }}
          >
            Log in
          </Link>
        </nav>

        <button
          aria-label="Open menu"
          className="mobile-only"
          onClick={() => setIsMenuOpen((v) => !v)}
          style={{
            appearance: "none",
            background: "transparent",
            border: 0,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: 8,
          }}
        >
          <span
            style={{
              width: 18,
              height: 2,
              background: "#fff",
              position: "relative",
              display: "inline-block",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: -6,
                height: 2,
                background: "#fff",
              }}
            />
            <span
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: -6,
                height: 2,
                background: "#fff",
              }}
            />
          </span>
        </button>
      </div>

      {isMenuOpen && (
        <div
          className="mobile-only"
          style={{
            position: "absolute",
            top: 64,
            left: 0,
            right: 0,
            background: "#0b1a3c",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            flexDirection: "column",
            padding: "12px 16px",
            gap: 8,
            zIndex: 50,
          }}
        >
          <a
            href="https://asymmetrix.substack.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#fff",
              textDecoration: "none",
              padding: "10px 4px",
            }}
            onClick={() => setIsMenuOpen(false)}
          >
            Substack
          </a>
          <Link
            href="/about-us"
            style={{
              color: "#fff",
              textDecoration: "none",
              padding: "10px 4px",
            }}
            onClick={() => setIsMenuOpen(false)}
          >
            About Us
          </Link>
          <Link
            href="/login"
            style={{
              color: "#fff",
              textDecoration: "none",
              fontWeight: 600,
              padding: "10px 4px",
            }}
            onClick={() => setIsMenuOpen(false)}
          >
            Log in
          </Link>
        </div>
      )}
    </header>
  );
}
