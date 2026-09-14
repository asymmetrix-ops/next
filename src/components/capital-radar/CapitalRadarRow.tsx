"use client";

import React from "react";
import { resolveCompanyLogoSrc } from "@/lib/companyLogo";
import { T } from "@/components/redesign/primitives";
import type { CapitalRadarRow as RowData } from "@/types/capital-radar";
import { ConfidenceBadge } from "./ConfidenceBadge";

const cellStyle: React.CSSProperties = {
  fontFamily: T.sans,
  fontSize: 11.5,
  color: T.body,
  padding: "7px 10px",
  verticalAlign: "middle",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

export function CapitalRadarRow({
  row,
  showTimingColumn,
}: {
  row: RowData;
  showTimingColumn: boolean;
}) {
  const logoSrc = resolveCompanyLogoSrc(row.logo_url ?? undefined);

  return (
    <tr style={{ borderBottom: `1px solid ${T.hair}` }}>
      <td style={{ ...cellStyle, textAlign: "left" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          {logoSrc ? (
            <img
              src={logoSrc}
              alt=""
              width={16}
              height={16}
              style={{
                borderRadius: 3,
                objectFit: "contain",
                flexShrink: 0,
              }}
            />
          ) : (
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: 3,
                background: T.inset,
                flexShrink: 0,
              }}
            />
          )}
          <span
            title={row.name}
            style={{
              fontWeight: 600,
              color: T.ink,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              minWidth: 0,
            }}
          >
            {row.name}
          </span>
          {row.reordered ? (
            <span
              title={row.reorder_reason ?? "Re-ordered from the default ranking"}
              style={{ fontSize: 10, color: T.muted, flexShrink: 0 }}
            >
              ↕
            </span>
          ) : null}
        </div>
      </td>
      <td style={cellStyle} title={row.type || undefined}>
        {row.type || "—"}
      </td>
      <td
        style={{
          ...cellStyle,
          fontFamily: T.mono,
          fontVariantNumeric: "tabular-nums",
          fontWeight: 600,
          color: T.ink,
        }}
      >
        {Number.isFinite(row.match_score) ? Math.round(row.match_score) : "—"}
      </td>
      <td style={{ ...cellStyle, fontVariantNumeric: "tabular-nums" }}>
        {row.peer_overlap_count ?? "—"}
      </td>
      <td style={cellStyle} title={row.sector_fit || undefined}>
        {row.sector_fit || "—"}
      </td>
      <td style={cellStyle} title={row.hq_country ?? undefined}>
        {row.hq_country ?? "—"}
      </td>
      {showTimingColumn && (
        <td style={cellStyle}>{row.time_since_last_investment ?? "—"}</td>
      )}
      <td style={{ ...cellStyle, overflow: "visible" }}>
        <ConfidenceBadge level={row.confidence} />
      </td>
      <td style={cellStyle} title={row.why_selected || undefined}>
        {row.why_selected || "—"}
      </td>
    </tr>
  );
}
