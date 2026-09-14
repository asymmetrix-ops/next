"use client";

import React from "react";
import { T, tableColHeaderStyle } from "@/components/redesign/primitives";
import type { CapitalRadarRow as RowData } from "@/types/capital-radar";
import { CapitalRadarRow } from "./CapitalRadarRow";

const thStyle: React.CSSProperties = {
  ...tableColHeaderStyle,
  fontSize: 9.5,
  textAlign: "left",
  padding: "6px 10px",
  background: T.paper,
  borderBottom: `1px solid ${T.hair}`,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  position: "sticky",
  top: 0,
  zIndex: 1,
};

/**
 * Explicit widths (must sum to 100) for the two column-count variants of the
 * table so table-layout:fixed never over/under-allocates and columns can't
 * bleed into each other.
 */
const COLUMNS_WITH_TIMING = [
  { key: "name", label: "Name", width: 19 },
  { key: "type", label: "Type", width: 10 },
  { key: "score", label: "Score", width: 6 },
  { key: "overlap", label: "Overlap", width: 8 },
  { key: "sector", label: "Sector fit", width: 11 },
  { key: "hq", label: "HQ", width: 11 },
  { key: "timing", label: "Last inv.", width: 9 },
  { key: "confidence", label: "Confidence", width: 12 },
  { key: "why", label: "Why selected", width: 14 },
] as const;

const COLUMNS_WITHOUT_TIMING = [
  { key: "name", label: "Name", width: 21 },
  { key: "type", label: "Type", width: 11 },
  { key: "score", label: "Score", width: 7 },
  { key: "overlap", label: "Overlap", width: 9 },
  { key: "sector", label: "Sector fit", width: 12 },
  { key: "hq", label: "HQ", width: 12 },
  { key: "confidence", label: "Confidence", width: 13 },
  { key: "why", label: "Why selected", width: 15 },
] as const;

export function CapitalRadarTable({
  rows,
  showTimingColumn,
}: {
  rows: RowData[];
  showTimingColumn: boolean;
}) {
  const columns = showTimingColumn ? COLUMNS_WITH_TIMING : COLUMNS_WITHOUT_TIMING;

  return (
    <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: 320 }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
          fontFamily: T.sans,
          fontSize: 11.5,
        }}
      >
        <colgroup>
          {columns.map((col) => (
            <col key={col.key} style={{ width: `${col.width}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={thStyle}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <CapitalRadarRow
              key={row.id}
              row={row}
              showTimingColumn={showTimingColumn}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
