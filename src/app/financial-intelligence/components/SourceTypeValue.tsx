"use client";

import React from "react";
import {
  resolveSourceLabelBucket,
  sourceTypeColor,
  type FiMetricSourceType,
} from "@/lib/financialIntelligence/sourceTypes";
import { formatMetricPercent } from "@/lib/financialIntelligence/calculations";
import type { FiMetricFormat } from "@/lib/financialIntelligence/types";
import { appendMetricCurrency } from "@/lib/buildFinancialMetricsSections";
import { formatMetricMillionsPlain } from "@/lib/formatMetricMillions";
import { convertFiMetricForDisplay } from "@/lib/financialIntelligence/fxDisplay";
import { usePlatformCurrency } from "@/components/providers/PlatformCurrencyProvider";
import type { Currency, FXRates } from "@/lib/fxRates";

function resolveDisplayCurrencyCode(code: string): Currency {
  const normalized = code.trim().toUpperCase();
  if (normalized === "USD" || normalized === "EUR" || normalized === "GBP") {
    return normalized;
  }
  return "USD";
}

export function SourceTypeDot({
  type,
  title,
  size = 7,
}: {
  type: FiMetricSourceType | string | null | undefined;
  title?: string;
  size?: number;
}) {
  const bucket = typeof type === "string" ? resolveSourceLabelBucket(type) : type;
  if (!bucket && !type) return null;
  const color = sourceTypeColor(type);
  const label = typeof type === "string" && type.trim() ? type : bucket;
  if (!label) return null;
  return (
    <span
      title={title ?? `${label} data`}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
        display: "inline-block",
      }}
    />
  );
}

export function FilteredMetricPlaceholder({ title }: { title?: string }) {
  return (
    <span
      style={{
        color: "var(--fg-4)",
        fontWeight: 600,
        fontVariantNumeric: "tabular-nums",
      }}
      title={title ?? "Hidden by data source filter"}
    >
      —
    </span>
  );
}

export function fmtFiMetric(
  value: number | null,
  format: FiMetricFormat,
  currencyCode: Currency | string = "USD",
  _fxRates: FXRates | null = null
): string {
  const displayCurrency = resolveDisplayCurrencyCode(String(currencyCode));
  const displayValue = convertFiMetricForDisplay(value, format, displayCurrency, _fxRates);
  if (displayValue == null || !Number.isFinite(displayValue)) return "—";
  if (format === "currency") {
    const n = Math.abs(displayValue);
    if (n >= 1000) {
      return appendMetricCurrency(`${Math.round(displayValue / 1000)}b`, displayCurrency);
    }
    const plain = formatMetricMillionsPlain(displayValue);
    if (plain === "—") return plain;
    return appendMetricCurrency(`${plain}m`, displayCurrency);
  }
  if (format === "currency_k") {
    if (Math.abs(displayValue) >= 1_000_000) {
      return appendMetricCurrency(
        formatMetricMillionsPlain(displayValue / 1_000_000),
        displayCurrency
      );
    }
    if (Math.abs(displayValue) >= 1000) {
      return appendMetricCurrency(
        `${Math.round(displayValue / 1000)}k`,
        displayCurrency
      );
    }
    return appendMetricCurrency(formatMetricMillionsPlain(displayValue), displayCurrency);
  }
  if (format === "count") {
    return Math.round(displayValue).toLocaleString("en-US");
  }
  if (format === "percent") {
    return formatMetricPercent(displayValue);
  }
  return `${Math.round(displayValue)}x`;
}

export function SourceColoredValue({
  value,
  format,
  sourceType,
  fontWeight = 600,
  fontSize,
  justify = "flex-end",
  hiddenBySourceFilter = false,
  displayCurrencyCode,
}: {
  value: number | null;
  format: FiMetricFormat;
  sourceType?: FiMetricSourceType | string | null;
  fontWeight?: number;
  fontSize?: number | string;
  justify?: "flex-start" | "flex-end" | "center";
  hiddenBySourceFilter?: boolean;
  displayCurrencyCode?: string;
}) {
  const { currency } = usePlatformCurrency();
  const resolvedCurrency = displayCurrencyCode ?? currency;

  if (value == null && hiddenBySourceFilter) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: justify,
          width: justify === "flex-end" ? "100%" : undefined,
          fontSize,
        }}
      >
        <FilteredMetricPlaceholder />
      </span>
    );
  }

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
      {fmtFiMetric(value, format, resolvedCurrency)}
    </span>
  );
}
