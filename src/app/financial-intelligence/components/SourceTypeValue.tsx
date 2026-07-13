"use client";

import React from "react";
import {
  sourceTypeColor,
  type FiMetricSourceType,
} from "@/lib/financialIntelligence/sourceTypes";
import type { FiMetricFormat } from "@/lib/financialIntelligence/types";

export function SourceTypeDot({
  type,
  title,
  size = 7,
}: {
  type: FiMetricSourceType | null | undefined;
  title?: string;
  size?: number;
}) {
  if (!type) return null;
  return (
    <span
      title={title ?? `${type} data`}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: sourceTypeColor(type),
        flexShrink: 0,
        display: "inline-block",
      }}
    />
  );
}

export function fmtFiMetric(value: number | null, format: FiMetricFormat): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (format === "currency") {
    const n = Math.abs(value);
    if (n >= 1000) return `$${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}b`;
    return `$${value.toFixed(n >= 100 ? 0 : 1)}m`;
  }
  if (format === "currency_k") {
    if (Math.abs(value) >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}m`;
    }
    if (Math.abs(value) >= 1000) {
      return `$${Math.round(value / 1000)}k`;
    }
    return `$${Math.round(value).toLocaleString()}`;
  }
  if (format === "count") {
    return Math.round(value).toLocaleString("en-US");
  }
  if (format === "percent") {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
  }
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}x`;
}

export function SourceColoredValue({
  value,
  format,
  sourceType,
  dotAfter = true,
  fontWeight = 600,
  fontSize,
  justify = "flex-end",
}: {
  value: number | null;
  format: FiMetricFormat;
  sourceType?: FiMetricSourceType | null;
  dotAfter?: boolean;
  fontWeight?: number;
  fontSize?: number | string;
  justify?: "flex-start" | "flex-end" | "center";
}) {
  const color = sourceType ? sourceTypeColor(sourceType) : "var(--fg-2)";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: justify,
        gap: 6,
        width: justify === "flex-end" ? "100%" : undefined,
        color,
        fontWeight,
        fontSize,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {!dotAfter && <SourceTypeDot type={sourceType} />}
      <span>{fmtFiMetric(value, format)}</span>
      {dotAfter && <SourceTypeDot type={sourceType} />}
    </span>
  );
}
