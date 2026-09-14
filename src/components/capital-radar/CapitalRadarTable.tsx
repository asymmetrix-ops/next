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
  position: "sticky",
  top: 0,
  zIndex: 1,
};

/** Fixed layout so every row aligns and long text truncates instead of wrapping. */
const COLUMNS_BASE = [
  { key: "name", label: "Name", width: "22%" },
  { key: "type", label: "Type", width: "13%" },
  { key: "score", label: "Score", width: "9%" },
  { key: "overlap", label: "Overlap", width: "10%" },
  { key: "sector", label: "Sector fit", width: "14%" },
  { key: "hq", label: "HQ", width: "14%" },
] as const;

export function CapitalRadarTable({
  rows,
  showTimingColumn,
}: {
  rows: RowData[];
  showTimingColumn: boolean;
}) {
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
          {COLUMNS_BASE.map((col) => (
            <col key={col.key} style={{ width: col.width }} />
          ))}
          {showTimingColumn && <col style={{ width: "10%" }} />}
          <col style={{ width: showTimingColumn ? "9%" : "12%" }} />
          <col />
        </colgroup>
        <thead>
          <tr>
            {COLUMNS_BASE.map((col) => (
              <th key={col.key} style={thStyle}>
                {col.label}
              </th>
            ))}
            {showTimingColumn && <th style={thStyle}>Last inv.</th>}
            <th style={thStyle}>Confidence</th>
            <th style={thStyle}>Why selected</th>
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
