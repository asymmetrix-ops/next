"use client";

import React from "react";
import { LinkPanel, LinkedH, KV, T, Pill } from "@/components/redesign/primitives";
import { LinkedInProfileButton } from "@/components/redesign/LinkedInProfileButton";
import { EMPTY_DISPLAY, normalizeEmptyDisplay } from "@/lib/emptyDisplay";

export type AdvisorOverviewCardProps = {
  type?: string | null;
  focus?: string[];
  yearFounded?: string | number | null;
  website?: string | null;
  websiteLabel?: string | null;
  hq?: string | null;
  linkedinUrl?: string | null;
  ownership?: string | null;
  ticker?: string | null;
  status?: string | null;
  transactionsAdvised?: number | null;
  fillGridCell?: boolean;
};

const EM = EMPTY_DISPLAY;

function faintDash() {
  return <span style={{ color: T.faint }}>{EM}</span>;
}

function displayText(value: string | number | null | undefined): React.ReactNode {
  if (value === null || value === undefined) return faintDash();
  if (typeof value === "number") return String(value);
  const normalized = normalizeEmptyDisplay(value);
  return normalized === EM ? faintDash() : normalized;
}

function FocusTags({ items }: { items: string[] }) {
  if (items.length === 0) return faintDash();

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
      {items.map((label) => (
        <Pill key={label} tone="coral">
          {label}
        </Pill>
      ))}
    </div>
  );
}

function StatusTag({ label }: { label: string }) {
  const normalized = label.trim();
  if (!normalized || normalized === EM) return faintDash();

  const lower = normalized.toLowerCase();
  const tone =
    lower.includes("active") || lower.includes("operating")
      ? "up"
      : lower.includes("inactive") || lower.includes("closed")
        ? "down"
        : "neutral";

  return <Pill tone={tone}>{normalized}</Pill>;
}

function OwnershipValue({
  ownership,
  ticker,
}: {
  ownership?: string | null;
  ticker?: string | null;
}) {
  const ownershipText = ownership?.trim();
  const tickerText = ticker?.trim();

  if (!ownershipText && !tickerText) return faintDash();

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      {ownershipText ? <span>{ownershipText}</span> : null}
      {tickerText ? (
        <span style={{ fontFamily: T.mono, color: T.body }}>{tickerText}</span>
      ) : null}
    </span>
  );
}

export function AdvisorOverviewCard({
  type,
  focus = [],
  yearFounded,
  website,
  websiteLabel,
  hq,
  linkedinUrl,
  ownership,
  ticker,
  status,
  transactionsAdvised,
  fillGridCell = false,
}: AdvisorOverviewCardProps) {
  const rows: { k: string; v: React.ReactNode }[] = [
    { k: "Type", v: displayText(type) },
    { k: "Focus", v: <FocusTags items={focus} /> },
    { k: "Year founded", v: displayText(yearFounded) },
    { k: "HQ", v: displayText(hq) },
    {
      k: "Website",
      v: website?.trim() ? (
        <a
          href={/^https?:\/\//i.test(website.trim()) ? website.trim() : `https://${website.trim()}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: T.azure, textDecoration: "none" }}
        >
          {websiteLabel || website.trim()}
        </a>
      ) : (
        faintDash()
      ),
    },
    {
      k: "LinkedIn",
      v: linkedinUrl?.trim() ? (
        <LinkedInProfileButton href={linkedinUrl.trim()} />
      ) : (
        faintDash()
      ),
    },
    {
      k: "Ownership",
      v: <OwnershipValue ownership={ownership} ticker={ticker} />,
    },
    {
      k: "Status",
      v: <StatusTag label={status?.trim() || "Active"} />,
    },
    {
      k: "D&A transactions advised",
      v:
        transactionsAdvised != null ? (
          <span style={{ fontFamily: T.mono }}>{transactionsAdvised.toLocaleString("en-US")}</span>
        ) : (
          faintDash()
        ),
    },
  ];

  return (
    <LinkPanel fillGridCell={fillGridCell}>
      <LinkedH showArrow>Overview</LinkedH>
      <div
        style={{
          padding: "2px 14px 8px",
          ...(fillGridCell
            ? {
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start",
              }
            : {}),
        }}
      >
        {rows.map((row, i) => (
          <KV key={row.k} k={row.k} v={row.v} last={i === rows.length - 1} />
        ))}
      </div>
    </LinkPanel>
  );
}
