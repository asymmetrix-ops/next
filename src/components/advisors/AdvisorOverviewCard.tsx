"use client";

import React from "react";
import Link from "next/link";
import { LinkPanel, LinkedH, KV, T, Pill } from "@/components/redesign/primitives";
import { EMPTY_DISPLAY, normalizeEmptyDisplay } from "@/lib/emptyDisplay";

export type AdvisorSector = {
  id?: number;
  name: string;
  href?: string;
};

export type AdvisorOverviewCardProps = {
  advisedDaSectors?: AdvisorSector[];
  yearFounded?: string | number | null;
  website?: string | null;
  websiteLabel?: string | null;
  hq?: string | null;
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

function SectorTags({ sectors }: { sectors: AdvisorSector[] }) {
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

export function AdvisorOverviewCard({
  advisedDaSectors = [],
  yearFounded,
  website,
  websiteLabel,
  hq,
  transactionsAdvised,
  fillGridCell = false,
}: AdvisorOverviewCardProps) {
  const rows: { k: string; v: React.ReactNode; show?: boolean }[] = [
    {
      k: "Advised D&A sector(s)",
      v: <SectorTags sectors={advisedDaSectors} />,
      show: advisedDaSectors.length > 0,
    },
    { k: "Year founded", v: displayText(yearFounded) },
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
    { k: "HQ", v: displayText(hq) },
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

  const visible = rows.filter((r) => r.show !== false);

  return (
    <LinkPanel fillGridCell={fillGridCell}>
      <LinkedH>Overview</LinkedH>
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
