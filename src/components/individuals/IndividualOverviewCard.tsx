"use client";

import React from "react";
import { LinkPanel, LinkedH, KV, T } from "@/components/redesign/primitives";
import { EMPTY_DISPLAY, normalizeEmptyDisplay } from "@/lib/emptyDisplay";

export type IndividualOverviewCardProps = {
  location?: string | null;
  linkedinUrl?: string | null;
  fillGridCell?: boolean;
};

const EM = EMPTY_DISPLAY;

function faintDash() {
  return <span style={{ color: T.faint }}>{EM}</span>;
}

function displayText(value: string | null | undefined): React.ReactNode {
  if (!value?.trim()) return faintDash();
  const normalized = normalizeEmptyDisplay(value);
  return normalized === EM ? faintDash() : normalized;
}

export function IndividualOverviewCard({
  location,
  linkedinUrl,
  fillGridCell = false,
}: IndividualOverviewCardProps) {
  const rows = [
    { k: "Location", v: displayText(location) },
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
  ];

  return (
    <LinkPanel fillGridCell={fillGridCell}>
      <LinkedH>Overview</LinkedH>
      <div style={{ padding: "2px 14px 8px" }}>
        {rows.map((row, i) => (
          <KV key={row.k} k={row.k} v={row.v} last={i === rows.length - 1} />
        ))}
      </div>
    </LinkPanel>
  );
}
