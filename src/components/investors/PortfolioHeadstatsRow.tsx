"use client";

import React from "react";
import type { PortfolioHeadstatTile } from "@/app/investors/[id]/portfolioActions";
import { T } from "@/components/redesign/primitives";

interface PortfolioHeadstatsRowProps {
  medianRevenue?: PortfolioHeadstatTile | null;
  medianEbitda?: PortfolioHeadstatTile | null;
  medianFte?: PortfolioHeadstatTile | null;
  loading?: boolean;
}

function formatTileValue(tile: PortfolioHeadstatTile | null | undefined): string {
  if (!tile || tile.n_companies === 0) return "—";
  const display = tile.display;
  if (display === "—" || display == null) return "—";
  if (typeof display === "number") {
    if (Number.isInteger(display)) return display.toLocaleString();
    return display.toLocaleString(undefined, { maximumFractionDigits: 1 });
  }
  return String(display);
}

function tileFootnote(tile: PortfolioHeadstatTile | null | undefined): string | null {
  if (!tile || tile.n_companies === 0) return null;
  if (tile.low_sample || tile.n_companies < 3) {
    return `Based on ${tile.n_companies} ${tile.n_companies === 1 ? "company" : "companies"}`;
  }
  return null;
}

function StatTile({
  label,
  tile,
  loading,
}: {
  label: string;
  tile: PortfolioHeadstatTile | null | undefined;
  loading?: boolean;
}) {
  const footnote = tileFootnote(tile);

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
        {loading ? "…" : formatTileValue(tile)}
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
      <StatTile label="Median Revenue (m)" tile={medianRevenue} loading={loading} />
      <StatTile label="Median EBITDA (m)" tile={medianEbitda} loading={loading} />
      <StatTile label="Median FTE" tile={medianFte} loading={loading} />
    </div>
  );
}
