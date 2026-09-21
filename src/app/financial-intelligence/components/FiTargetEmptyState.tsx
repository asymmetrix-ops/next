"use client";

import React from "react";
import { Squares2X2Icon } from "@heroicons/react/24/outline";

const STEPS = [
  "Search for a company in the target field above.",
  "Review the default peer set and adjust filters if needed.",
  "Compare benchmark metrics and export or save your view.",
] as const;

export function FiTargetEmptyState() {
  return (
    <section
      aria-labelledby="fi-empty-state-title"
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "min(56vh, 520px)",
        width: "100%",
        padding: "24px 0 8px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          padding: "40px 32px",
          borderRadius: "var(--r-xl)",
          border: "1px solid var(--border-1)",
          background: "var(--ax-gray-0)",
          boxShadow: "var(--shadow-md)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            margin: "0 auto 20px",
            borderRadius: "var(--r-pill)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--ax-cyan-50)",
            border: "1px solid var(--ax-cyan-100)",
            color: "var(--ax-cyan-700)",
          }}
          aria-hidden
        >
          <Squares2X2Icon className="h-7 w-7" strokeWidth={1.75} />
        </div>

        <p
          className="ax-eyebrow"
          style={{ marginBottom: 8, color: "var(--ax-cyan-700)" }}
        >
          Financial Intelligence
        </p>
        <h2
          id="fi-empty-state-title"
          style={{
            margin: "0 0 10px",
            fontSize: "var(--fs-24)",
            lineHeight: "var(--lh-snug)",
            fontWeight: "var(--fw-bold)",
            color: "var(--fg-1)",
            letterSpacing: "var(--ls-snug)",
          }}
        >
          Select a target company
        </h2>
        <p
          style={{
            margin: "0 0 24px",
            fontSize: "var(--fs-15)",
            lineHeight: "var(--lh-relaxed)",
            color: "var(--fg-3)",
          }}
        >
          Pick a company to load its financial profile, benchmark against peers, and
          explore comparative metrics.
        </p>

        <ol
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {STEPS.map((step, index) => (
            <li
              key={step}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                fontSize: "var(--fs-13)",
                lineHeight: "var(--lh-normal)",
                color: "var(--fg-2)",
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  width: 22,
                  height: 22,
                  borderRadius: "var(--r-pill)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "var(--fs-12)",
                  fontWeight: "var(--fw-bold)",
                  color: "var(--ax-cyan-800)",
                  background: "var(--ax-cyan-50)",
                  border: "1px solid var(--ax-cyan-200)",
                }}
              >
                {index + 1}
              </span>
              <span style={{ paddingTop: 2 }}>{step}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
