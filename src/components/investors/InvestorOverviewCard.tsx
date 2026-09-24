"use client";

import React from "react";
import { LinkPanel, LinkedH, KV, T, Pill, Delta, CappedPillTags } from "@/components/redesign/primitives";
import { EMPTY_DISPLAY, isEmptyDisplayValue, normalizeEmptyDisplay } from "@/lib/emptyDisplay";
import { normalizeHoldingPeriodDisplay } from "@/lib/holdingPeriod";

export type InvestorFocusSector = {
  id?: number;
  name: string;
  href?: string;
};

export type InvestorOverviewCardProps = {
  focusSectors?: InvestorFocusSector[];
  type?: string | null;
  yearFounded?: string | number | null;
  website?: string | null;
  websiteLabel?: string | null;
  hq?: string | null;
  linkedinUrl?: string | null;
  ownership?: string | null;
  status?: string | null;
  employees?: number | null;
  employeesYoY?: string | null;
  /** `null` when the investor has zero completed exits — hide the stat entirely in that case. */
  avgHoldingPeriodDisplay?: string | null;
  avgHoldingPeriodCompletedExits?: number | null;
  avgHoldingPeriodLowSampleSize?: boolean;
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

function FocusTags({ sectors }: { sectors: InvestorFocusSector[] }) {
  if (sectors.length === 0) return faintDash();

  return (
    <CappedPillTags
      tone="lavender"
      items={sectors.map((s, i) => ({
        key: s.href ?? `${s.name}-${i}`,
        label: s.name,
        href: s.href,
      }))}
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

export function InvestorOverviewCard({
  focusSectors = [],
  type,
  yearFounded,
  website,
  websiteLabel,
  hq,
  linkedinUrl,
  ownership,
  status,
  employees,
  employeesYoY,
  avgHoldingPeriodDisplay,
  avgHoldingPeriodCompletedExits,
  avgHoldingPeriodLowSampleSize,
  fillGridCell = false,
}: InvestorOverviewCardProps) {
  const hasEmployees = employees != null && employees > 0;

  const rows: { k: string; v: React.ReactNode; show?: boolean }[] = [
    { k: "Focus", show: focusSectors.length > 0, v: <FocusTags sectors={focusSectors} /> },
    { k: "Type", show: !isEmptyDisplayValue(type ?? null), v: displayText(type) },
    { k: "Year Founded", show: !isEmptyDisplayValue(yearFounded ?? null), v: displayText(yearFounded) },
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
    { k: "Ownership", show: !isEmptyDisplayValue(ownership ?? null), v: displayText(ownership) },
    {
      k: "Status",
      v: <StatusTag label={status?.trim() || "Active"} />,
    },
    {
      k: "Employees",
      show: hasEmployees,
      v: (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontFamily: T.mono }}>{employees!.toLocaleString("en-US")}</span>
          {employeesYoY ? <Delta value={employeesYoY} /> : null}
        </span>
      ),
    },
  ];

  const holdingPeriodDisplay = normalizeHoldingPeriodDisplay(avgHoldingPeriodDisplay);
  if (holdingPeriodDisplay) {
    rows.push({
      k: "Avg. holding period",
      v: (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span>{holdingPeriodDisplay}</span>
          {avgHoldingPeriodCompletedExits != null ? (
            <span style={{ color: T.muted, fontSize: 12 }}>
              Based on {avgHoldingPeriodCompletedExits} exit
              {avgHoldingPeriodCompletedExits === 1 ? "" : "s"}
            </span>
          ) : null}
          {avgHoldingPeriodLowSampleSize ? (
            <Pill tone="neutral">Low sample size</Pill>
          ) : null}
        </span>
      ),
    });
  }

  const visible = rows.filter((r) => r.show !== false);

  return (
    <LinkPanel fillGridCell={fillGridCell}>
      <LinkedH showArrow>Overview</LinkedH>
      <div
        style={{
          padding: "2px 14px 8px",
          ...(fillGridCell
            ? { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "flex-start" }
            : {}),
        }}
      >
        {visible.map((row, i) => (
          <KV key={row.k} k={row.k} v={row.v} last={i === visible.length - 1} />
        ))}
      </div>
    </LinkPanel>
  );
}
