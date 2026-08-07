"use client";

import React from "react";
import {
  sourceTypeColor,
  type FiMetricSourceType,
} from "@/lib/financialIntelligence/sourceTypes";
import { formatMetricPercent } from "@/lib/financialIntelligence/calculations";
import type { FiMetricFormat } from "@/lib/financialIntelligence/types";
import { appendMetricCurrency } from "@/lib/buildFinancialMetricsSections";
import { formatMetricMillionsPlain } from "@/lib/formatMetricMillions";
import { usePlatformCurrency } from "@/components/providers/PlatformCurrencyProvider";
import type { Currency } from "@/lib/fxRates";

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

export function fmtFiMetric(
  value: number | null,
  format: FiMetricFormat,
  currencyCode: Currency = "USD"
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (format === "currency") {
    const n = Math.abs(value);
    if (n >= 1000) {
      return appendMetricCurrency(`${Math.round(value / 1000)}b`, currencyCode);
    }
    return appendMetricCurrency(formatMetricMillionsPlain(value), currencyCode);
  }
  if (format === "currency_k") {
    if (Math.abs(value) >= 1_000_000) {
      return appendMetricCurrency(
        formatMetricMillionsPlain(value / 1_000_000),
        currencyCode
      );
    }
    if (Math.abs(value) >= 1000) {
      return appendMetricCurrency(
        `${Math.round(value / 1000)}k`,
        currencyCode
      );
    }
    return appendMetricCurrency(formatMetricMillionsPlain(value), currencyCode);
  }
  if (format === "count") {
    return Math.round(value).toLocaleString("en-US");
  }
  if (format === "percent") {
    return formatMetricPercent(value);
  }
  return `${Math.round(value)}x`;
}

export function SourceColoredValue({
  value,
  format,
  sourceType,
  fontWeight = 600,
  fontSize,
  justify = "flex-end",
}: {
  value: number | null;
  format: FiMetricFormat;
  sourceType?: FiMetricSourceType | null;
  fontWeight?: number;
  fontSize?: number | string;
  justify?: "flex-start" | "flex-end" | "center";
}) {
  const { currency } = usePlatformCurrency();
  const color = sourceType ? sourceTypeColor(sourceType) : "var(--fg-2)";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: justify,
        width: justify === "flex-end" ? "100%" : undefined,
        color,
        fontWeight,
        fontSize,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {fmtFiMetric(value, format, currency)}
    </span>
  );
}
