"use client";

import React from "react";
import { T } from "@/components/redesign/primitives";
import type { DualCurrencyDisplay } from "@/lib/fxDisplay";

export function DualCurrencyValue({
  display,
  nativeDisplay,
  fxTooltip,
  color = T.body,
  muted = false,
  align = "center",
}: DualCurrencyDisplay & {
  color?: string;
  muted?: boolean;
  align?: "left" | "center" | "right";
}) {
  const primaryColor = muted || display === "-" ? T.muted : color;
  const weight = display === "-" ? 400 : 600;

  return (
    <span
      title={fxTooltip ?? undefined}
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems:
          align === "left"
            ? "flex-start"
            : align === "right"
              ? "flex-end"
              : "center",
        gap: 2,
        minWidth: 0,
        textAlign: align,
      }}
    >
      <span
        style={{
          fontFamily: T.sans,
          fontSize: 13,
          fontWeight: weight,
          color: primaryColor,
          lineHeight: 1.25,
        }}
      >
        {display}
      </span>
      {nativeDisplay ? (
        <span
          style={{
            fontFamily: T.sans,
            fontSize: 11,
            fontWeight: 400,
            color: T.muted,
            lineHeight: 1.2,
            whiteSpace: "nowrap",
          }}
        >
          {nativeDisplay}
        </span>
      ) : null}
    </span>
  );
}
