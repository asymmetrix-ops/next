"use client";

import React from "react";
import { LinkPanel, LinkedH, KV, T, Pill, CappedPillTags } from "@/components/redesign/primitives";
import { EMPTY_DISPLAY, isEmptyDisplayValue, normalizeEmptyDisplay } from "@/lib/emptyDisplay";

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
  /** Tighter layout for narrow grid columns (e.g. advisor profile top row). */
  compact?: boolean;
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

function FocusTags({ items, compact }: { items: string[]; compact?: boolean }) {
  if (items.length === 0) return faintDash();

  const compactPillStyle = compact
    ? { fontSize: 10, height: 20, padding: "0 7px", gap: 4 }
    : undefined;

  return (
    <CappedPillTags
      tone="coral"
      items={items.map((label, i) => ({
        key: `${label}-${i}`,
        label,
      }))}
      wrap={!compact}
      pillStyle={compactPillStyle}
    />
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
  compact = false,
}: AdvisorOverviewCardProps) {
  const hasOwnershipOrTicker = Boolean(ownership?.trim() || ticker?.trim());

  const rows: { k: string; v: React.ReactNode; show?: boolean }[] = [
    { k: "Type", show: !isEmptyDisplayValue(type ?? null), v: displayText(type) },
    { k: "Focus", show: focus.length > 0, v: <FocusTags items={focus} compact={compact} /> },
    { k: "Year founded", show: !isEmptyDisplayValue(yearFounded ?? null), v: displayText(yearFounded) },
    { k: "HQ", show: !isEmptyDisplayValue(hq ?? null), v: displayText(hq) },
    {
      k: "Website",
      show: Boolean(website?.trim()),
      v: website?.trim() ? (
        <a
          href={/^https?:\/\//i.test(website.trim()) ? website.trim() : `https://${website.trim()}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: T.azure, textDecoration: "none" }}
        >
          {websiteLabel || website.trim()}
        </a>
      ) : null,
    },
    {
      k: "LinkedIn",
      show: Boolean(linkedinUrl?.trim()),
      v: linkedinUrl?.trim() ? (
        <a
          href={linkedinUrl.trim()}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: T.azure, textDecoration: "none" }}
        >
          LinkedIn
        </a>
      ) : null,
    },
    {
      k: "Ownership",
      show: hasOwnershipOrTicker,
      v: <OwnershipValue ownership={ownership} ticker={ticker} />,
    },
    {
      k: "Status",
      v: <StatusTag label={status?.trim() || "Active"} />,
    },
    {
      k: compact ? "Transactions" : "D&A transactions advised",
      show: transactionsAdvised != null,
      v: (
        <span style={{ fontFamily: T.mono }}>{transactionsAdvised!.toLocaleString("en-US")}</span>
      ),
    },
  ];

  const visible = rows.filter((r) => r.show !== false);

  return (
    <LinkPanel fillGridCell={fillGridCell}>
      <LinkedH>Overview</LinkedH>
      <div
        style={{
          padding: compact ? "0 10px 6px" : "2px 14px 8px",
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
        {visible.map((row, i) => (
          <KV
            key={row.k}
            k={row.k}
            v={row.v}
            last={i === visible.length - 1}
            style={
              compact
                ? {
                    fontSize: 11.5,
                    lineHeight: 1.4,
                    padding: "2px 0",
                    gap: 6,
                    gridTemplateColumns: "minmax(0, 92px) 1fr",
                  }
                : undefined
            }
          />
        ))}
      </div>
    </LinkPanel>
  );
}
