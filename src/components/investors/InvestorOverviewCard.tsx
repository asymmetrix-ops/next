"use client";

import React from "react";
import Link from "next/link";
import { LinkPanel, LinkedH, KV, T, Pill, Delta } from "@/components/redesign/primitives";
import { EMPTY_DISPLAY, normalizeEmptyDisplay } from "@/lib/emptyDisplay";

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
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
      {sectors.map((s) =>
        s.href ? (
          <Link key={`${s.name}-${s.href}`} href={s.href} prefetch={false} style={{ textDecoration: "none" }}>
            <Pill tone="lavender">{s.name}</Pill>
          </Link>
        ) : (
          <Pill key={s.name} tone="lavender">{s.name}</Pill>
        )
      )}
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
  fillGridCell = false,
}: InvestorOverviewCardProps) {
  const rows: { k: string; v: React.ReactNode }[] = [
    { k: "Focus", v: <FocusTags sectors={focusSectors} /> },
    { k: "Type", v: displayText(type) },
    { k: "Year Founded", v: displayText(yearFounded) },
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
        <a
          href={linkedinUrl.trim()}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: T.azure, textDecoration: "none" }}
        >
          LinkedIn
        </a>
      ) : (
        faintDash()
      ),
    },
    { k: "Ownership", v: displayText(ownership) },
    {
      k: "Status",
      v: <StatusTag label={status?.trim() || "Active"} />,
    },
    {
      k: "Employees",
      v: (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {employees != null && employees > 0 ? (
            <>
              <span style={{ fontFamily: T.mono }}>{employees.toLocaleString("en-US")}</span>
              {employeesYoY ? <Delta value={employeesYoY} /> : null}
            </>
          ) : (
            faintDash()
          )}
        </span>
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
            ? { flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "flex-start" }
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
