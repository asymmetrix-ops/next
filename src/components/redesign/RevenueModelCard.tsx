"use client";
/**
 * RevenueModelCard — redesign/RevenueModelCard.jsx converted to TypeScript.
 * Revenue stream rows with Main / Secondary / Minor weighting pill.
 */
import React from "react";
import { LinkPanel, LinkedH, WeightChip, T } from "./primitives";

export type RevenueModelRow = {
  /** Revenue stream name, e.g. "Subscription", "One-time license" */
  name: string;
  /** "Main" | "Secondary" | "Minor" | "" */
  weight?: string;
};

type Props = {
  rows: RevenueModelRow[];
  fillGridCell?: boolean;
};

export function RevenueModelCard({ rows, fillGridCell = false }: Props) {
  if (rows.length === 0) return null;

  return (
    <LinkPanel fillGridCell={fillGridCell}>
      <LinkedH>Revenue model</LinkedH>
      <div style={{ padding: "8px 16px 14px", flex: 1, minHeight: 0 }}>
        {rows.map((row, i) => (
          <div
            key={row.name}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "9px 0",
              borderBottom:
                i < rows.length - 1 ? `1px solid ${T.hair}` : "none",
              fontSize: 12.5,
            }}
          >
            <div style={{ color: T.body }}>{row.name}</div>
            <WeightChip weight={row.weight || ""} hideMinor />
          </div>
        ))}
      </div>
    </LinkPanel>
  );
}
