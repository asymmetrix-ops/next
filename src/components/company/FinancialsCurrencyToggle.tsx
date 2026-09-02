"use client";

import React, { useState } from "react";
import { T } from "@/components/redesign/primitives";
import type { CurrencyDisplayMode, FxToggleConfig } from "@/lib/financialsCurrencyToggle";

const OPTIONS: Array<{
  mode: CurrencyDisplayMode;
  label: "Platform" | "Reported";
}> = [
  { mode: "preferred", label: "Platform" },
  { mode: "native", label: "Reported" },
];

export function buildCurrencyToggleLegend(config: FxToggleConfig): string {
  return `Platform (${config.preferredCode}) converts metrics to your platform currency. Reported (${config.nativeCode}) shows values in the source filing currency.`;
}

export function FinancialsCurrencyToggle({
  config,
  mode,
  onChange,
  compact = false,
}: {
  config: FxToggleConfig;
  mode: CurrencyDisplayMode;
  onChange: (mode: CurrencyDisplayMode) => void;
  compact?: boolean;
}) {
  const [showLegend, setShowLegend] = useState(false);
  const legend = buildCurrencyToggleLegend(config);

  return (
    <span
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShowLegend(true)}
      onMouseLeave={() => setShowLegend(false)}
    >
      <div
        role="group"
        aria-label="Currency display mode"
        aria-describedby={showLegend ? "currency-toggle-legend" : undefined}
        style={{
          display: "inline-flex",
          borderRadius: T.r,
          border: `1px solid ${T.hair}`,
          overflow: "hidden",
          background: T.panel,
        }}
      >
        {OPTIONS.map((option) => {
          const active = mode === option.mode;
          const currencyCode =
            option.mode === "preferred"
              ? config.preferredCode
              : config.nativeCode;

          return (
            <button
              key={option.mode}
              type="button"
              aria-pressed={active}
              aria-label={`Show ${option.label.toLowerCase()} currency (${currencyCode})`}
              onClick={() => onChange(option.mode)}
              style={{
                padding: compact ? "6px 10px" : "7px 12px",
                border: "none",
                borderRight:
                  option.mode === "preferred" ? `1px solid ${T.hair}` : "none",
                background: active ? T.ink : "transparent",
                color: active ? "#fff" : T.body,
                fontFamily: T.sans,
                fontSize: compact ? 11.5 : 12.5,
                fontWeight: 600,
                lineHeight: 1.1,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {showLegend ? (
        <span
          id="currency-toggle-legend"
          role="tooltip"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: compact ? 0 : undefined,
            left: compact ? undefined : 0,
            width: compact ? 240 : 280,
            background: T.ink,
            color: "#fff",
            fontFamily: T.sans,
            fontSize: 11.5,
            lineHeight: 1.45,
            padding: "8px 10px",
            borderRadius: 6,
            boxShadow: "0 4px 18px rgba(0,0,0,0.18)",
            zIndex: 30,
            pointerEvents: "none",
          }}
        >
          {legend}
        </span>
      ) : null}
    </span>
  );
}
