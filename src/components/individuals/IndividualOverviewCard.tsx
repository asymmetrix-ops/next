"use client";

import React from "react";
import { LinkPanel, LinkedH, KV, T } from "@/components/redesign/primitives";
import { LinkedInProfileButton } from "@/components/redesign/LinkedInProfileButton";
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
  const rows: { k: string; v: React.ReactNode; show?: boolean }[] = [
    { k: "Location", show: Boolean(location?.trim()), v: displayText(location) },
    {
      k: "LinkedIn",
      show: Boolean(linkedinUrl?.trim()),
      v: linkedinUrl?.trim() ? <LinkedInProfileButton href={linkedinUrl.trim()} /> : null,
    },
  ];

  const visible = rows.filter((r) => r.show !== false);

  return (
    <LinkPanel fillGridCell={fillGridCell}>
      <LinkedH>Overview</LinkedH>
      <div style={{ padding: "2px 14px 8px" }}>
        {visible.map((row, i) => (
          <KV key={row.k} k={row.k} v={row.v} last={i === visible.length - 1} />
        ))}
      </div>
    </LinkPanel>
  );
}
