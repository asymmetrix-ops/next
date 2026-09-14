"use client";

import React from "react";
import { LinkPanel, LinkedH, T } from "@/components/redesign/primitives";
import type { CapitalRadarCard as CardData } from "@/types/capital-radar";
import { CapitalRadarTable } from "./CapitalRadarTable";

function formatComputedAt(iso: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: "28px 16px",
        textAlign: "center",
        color: T.muted,
        fontFamily: T.sans,
        fontSize: 12.5,
      }}
    >
      {message}
    </div>
  );
}

export function CapitalRadarCard({
  title,
  card,
  showTimingColumn,
}: {
  title: string;
  card: CardData;
  showTimingColumn: boolean;
}) {
  const computedAt = formatComputedAt(card.computed_at);

  return (
    <LinkPanel fillGridCell>
      <LinkedH right={computedAt ? `Updated ${computedAt}` : undefined}>
        {title}
      </LinkedH>
      {card.rows.length === 0 ? (
        <EmptyState message="No qualifying candidates found." />
      ) : (
        <CapitalRadarTable
          rows={card.rows}
          showTimingColumn={showTimingColumn}
        />
      )}
    </LinkPanel>
  );
}
