"use client";

import React from "react";

export type FiBenchmarkMode = "company" | "sector";

export function FiModeTabs({
  mode,
  onModeChange,
}: {
  mode: FiBenchmarkMode;
  onModeChange: (mode: FiBenchmarkMode) => void;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        padding: 3,
        background: "white",
        border: "1px solid var(--border-1)",
        borderRadius: "var(--r-lg)",
        marginBottom: 16,
        boxShadow: "var(--shadow-xs)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <button
        type="button"
        onClick={() => onModeChange("company")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 16px",
          border: "none",
          background: mode === "company" ? "var(--ax-cyan-700)" : "transparent",
          color: mode === "company" ? "white" : "var(--fg-2)",
          fontSize: 13.5,
          fontWeight: 600,
          cursor: "pointer",
          borderRadius: 7,
          boxShadow: mode === "company" ? "var(--shadow-sm)" : "none",
        }}
      >
        Company vs peers
      </button>
      <button
        type="button"
        onClick={() => onModeChange("sector")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 16px",
          border: "none",
          background: mode === "sector" ? "var(--ax-cyan-700)" : "transparent",
          color: mode === "sector" ? "white" : "var(--fg-2)",
          fontSize: 13.5,
          fontWeight: 600,
          cursor: "pointer",
          borderRadius: 7,
          boxShadow: mode === "sector" ? "var(--shadow-sm)" : "none",
        }}
      >
        Sector vs sector
      </button>
    </div>
  );
}

export function FiSectorComingSoon() {
  return (
    <div
      style={{
        padding: 48,
        borderRadius: "var(--r-lg)",
        border: "1px dashed var(--border-1)",
        background: "white",
        textAlign: "center",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--fg-1)", marginBottom: 8 }}>
        Sector vs sector
      </div>
      <div style={{ fontSize: 14, color: "var(--fg-3)" }}>Coming soon</div>
    </div>
  );
}
