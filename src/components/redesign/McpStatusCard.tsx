"use client";

import React from "react";
import { formatCompanyMcpDisplay } from "@/lib/companyMcp";
import {
  descriptionBodyStyle,
  LinkPanel,
  LinkedH,
  T,
} from "./primitives";

type Props = {
  status: boolean;
  fillGridCell?: boolean;
};

export function McpStatusCard({ status, fillGridCell = false }: Props) {
  return (
    <LinkPanel
      fillGridCell={fillGridCell}
      style={{ flex: "1 1 200px", minWidth: 0 }}
    >
      <LinkedH>MCP</LinkedH>
      <div style={{ padding: "8px 16px 14px", flex: 1, minHeight: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "9px 0",
          }}
        >
          <span style={{ ...descriptionBodyStyle, fontWeight: 500 }}>
            MCP Implemented
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 10px",
              borderRadius: 999,
              fontFamily: T.sans,
              fontSize: 12,
              fontWeight: 600,
              flexShrink: 0,
              background: status ? T.emeraldSoft : T.inset,
              color: status ? T.emerald : T.muted,
            }}
          >
            {status ? (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                aria-hidden="true"
              >
                <path
                  d="M20 6L9 17l-5-5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : null}
            {formatCompanyMcpDisplay(status)}
          </span>
        </div>
      </div>
    </LinkPanel>
  );
}
