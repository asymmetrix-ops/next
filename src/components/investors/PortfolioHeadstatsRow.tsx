"use client";

import React from "react";
import type { PortfolioHeadstatTile } from "@/app/investors/[id]/portfolioActions";
import { T } from "@/components/redesign/primitives";
import { formatPlatformMetricMillions } from "@/lib/formatPlatformCurrency";
import type { Currency } from "@/lib/fxRates";
import { DEFAULT_PLATFORM_CURRENCY } from "@/lib/platformCurrency";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  GBP: "£",
  EUR: "€",
};

interface PortfolioHeadstatsRowProps {
  medianRevenue?: PortfolioHeadstatTile | null;
  medianEbitda?: PortfolioHeadstatTile | null;
  medianFte?: PortfolioHeadstatTile | null;
  loading?: boolean;
  currencyCode?: Currency;
}

function millionsMetricLabel(base: string, currencyCode: Currency): string {
  const sym = CURRENCY_SYMBOLS[currencyCode] ?? currencyCode;
  return `${base} (${sym}m)`;
}

function formatTileValue(
  tile: PortfolioHeadstatTile | null | undefined,
  currencyCode: Currency
): string {
  if (!tile || tile.n_companies === 0) return "—";
  const display = tile.display;
  if (display === "—" || display == null) return "—";
  return formatPlatformMetricMillions(display, currencyCode);
}

function tileFootnote(tile: PortfolioHeadstatTile | null | undefined): string | null {
  if (!tile || tile.n_companies === 0) return null;
  if (tile.low_sample || tile.n_companies < 3) {
    return `Based on ${tile.n_companies} ${tile.n_companies === 1 ? "company" : "companies"}`;
  }
  return null;
}

function formatCountTileValue(
  tile: PortfolioHeadstatTile | null | undefined
): string {
  if (!tile || tile.n_companies === 0) return "—";
  const display = tile.display;
  if (display === "—" || display == null) return "—";
  if (typeof display === "number") {
    if (Number.isInteger(display)) return display.toLocaleString();
    return display.toLocaleString(undefined, { maximumFractionDigits: 1 });
  }
  return String(display);
}

function StatTile({
  label,
  tile,
  loading,
  currencyCode,
}: {
  label: string;
  tile: PortfolioHeadstatTile | null | undefined;
  loading?: boolean;
  currencyCode?: Currency;
}) {
  const footnote = tileFootnote(tile);
  const value = currencyCode
    ? formatTileValue(tile, currencyCode)
    : formatCountTileValue(tile);

  return (
    <div
      style={{
        flex: "1 1 0",
        minWidth: 180,
        background: "#fff",
        border: `1px solid ${T.divider}`,
        borderRadius: 10,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <span
        style={{
          fontFamily: T.sans,
          fontSize: 12,
          fontWeight: 600,
          color: T.muted,
          letterSpacing: "0.02em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: T.sans,
          fontSize: 24,
          fontWeight: 600,
          color: T.ink,
          letterSpacing: "-0.4px",
          lineHeight: 1.2,
        }}
      >
        {loading ? "…" : value}
      </span>
      {footnote && !loading && (
        <span
          style={{
            fontFamily: T.sans,
            fontSize: 11.5,
            color: T.muted,
          }}
        >
          {footnote}
        </span>
      )}
    </div>
  );
}

export function PortfolioHeadstatsRow({
  medianRevenue,
  medianEbitda,
  medianFte,
  loading = false,
  currencyCode = DEFAULT_PLATFORM_CURRENCY,
}: PortfolioHeadstatsRowProps) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 16,
      }}
    >
      <StatTile
        label={millionsMetricLabel("Median Revenue", currencyCode)}
        tile={medianRevenue}
        loading={loading}
        currencyCode={currencyCode}
      />
      <StatTile
        label={millionsMetricLabel("Median EBITDA", currencyCode)}
        tile={medianEbitda}
        loading={loading}
        currencyCode={currencyCode}
      />
      <StatTile label="Median FTE" tile={medianFte} loading={loading} />
    </div>
  );
}
