"use client";
/**
 * ProductUsersListCard — numbered list shell matching V3 ProductUsersCard row style (no accordion).
 */
import React from "react";
import { LinkPanel, LinkedH, T } from "./primitives";

type Props = {
  lines: string[];
  fillGridCell?: boolean;
};

export function ProductUsersListCard({
  lines,
  fillGridCell = true,
}: Props) {
  return (
    <LinkPanel fillGridCell={fillGridCell}>
      <LinkedH>Product &amp; Users</LinkedH>
      <div style={{ paddingBottom: 4, flex: 1, minHeight: 0 }}>
        {lines.map((line, i, arr) => (
          <div
            key={`pu-${i}-${line.slice(0, 24)}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              padding: "12px 16px",
              borderBottom:
                i < arr.length - 1 ? `1px solid ${T.hair}` : "none",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                minWidth: 0,
                flex: 1,
              }}
            >
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: T.muted,
                  width: 22,
                  flexShrink: 0,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {i + 1}.
              </span>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: T.ink,
                  lineHeight: 1.35,
                }}
              >
                {line}
              </span>
            </div>
            <span
              style={{
                color: T.faint,
                fontSize: "15px",
                lineHeight: 1,
                flexShrink: 0,
              }}
              aria-hidden
            >
              ›
            </span>
          </div>
        ))}
      </div>
    </LinkPanel>
  );
}
