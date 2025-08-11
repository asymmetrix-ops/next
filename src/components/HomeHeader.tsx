"use client";

import Link from "next/link";

export default function HomeHeader() {
  return (
    <header
      style={{
        background:
          "linear-gradient(90deg, #1f3a93 0%, #0b1a3c 50%, #040b1c 100%)",
        color: "#fff",
        height: 80,
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img
            src="https://www.asymmetrixintelligence.com/images/logo.svg"
            alt="Asymmetrix Logo"
            width={28}
            height={28}
            style={{ borderRadius: "50%" }}
          />
          <nav style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <span style={{ fontWeight: 700, letterSpacing: 0.5 }}>
              ASYMMETRIX
            </span>
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
          </nav>
        </div>
        <div>
          <Link
            href="/login"
            style={{ color: "#fff", textDecoration: "none", fontWeight: 600 }}
          >
            Log in
          </Link>
        </div>
      </div>
    </header>
  );
}
