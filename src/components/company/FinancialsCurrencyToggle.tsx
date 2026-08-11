"use client";

import React from "react";
import { T } from "@/components/redesign/primitives";
import type { CurrencyDisplayMode, FxToggleConfig } from "@/lib/financialsCurrencyToggle";

export function FinancialsCurrencyToggle({
  config,
  mode,
  onChange,
}: {
  config: FxToggleConfig;
  mode: CurrencyDisplayMode;
  onChange: (mode: CurrencyDisplayMode) => void;
}) {
  const options: Array<{
    mode: CurrencyDisplayMode;
    symbol: string;
    label: string;
  }> = [
    {
      mode: "preferred",
      symbol: config.preferredSymbol,
      label: config.preferredCode,
    },
    {
      mode: "native",
      symbol: config.nativeSymbol,
      label: config.nativeCode,
    },
  ];

  return (
    <div
      role="group"
      aria-label="Display currency"
      style={{
        display: "inline-flex",
        borderRadius: T.r,
        border: `1px solid ${T.hair}`,
        overflow: "hidden",
        background: T.panel,
      }}
    >
      {options.map((option) => {
        const active = mode === option.mode;
        return (
          <button
            key={option.mode}
            type="button"
            aria-pressed={active}
            aria-label={`Show values in ${option.label}`}
            title={option.label}
            onClick={() => onChange(option.mode)}
            style={{
              minWidth: 36,
              padding: "7px 12px",
              border: "none",
              borderRight:
                option.mode === "preferred" ? `1px solid ${T.hair}` : "none",
              background: active ? T.ink : "transparent",
              color: active ? "#fff" : T.body,
              fontFamily: T.sans,
              fontSize: 14,
              fontWeight: 600,
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            {option.symbol}
          </button>
        );
      })}
    </div>
  );
}
