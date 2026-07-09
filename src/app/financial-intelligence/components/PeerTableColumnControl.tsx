"use client";

import React, { useState } from "react";
import {
  FIN_COLUMN_CATEGORIES,
  FIN_COLUMN_DEFAULT_VISIBILITY,
  FIN_COLUMN_ORDER,
} from "@/app/financials-tsx/financials-columns";

export function buildDefaultPeerColumnVisibility(): Record<string, boolean> {
  return { ...FIN_COLUMN_DEFAULT_VISIBILITY };
}

export function visiblePeerColumnIds(visibility: Record<string, boolean>): string[] {
  return FIN_COLUMN_ORDER.filter((id) => visibility[id]);
}

interface PeerTableColumnControlProps {
  visibility: Record<string, boolean>;
  onChange: (visibility: Record<string, boolean>) => void;
}

export function PeerTableColumnControl({
  visibility,
  onChange,
}: PeerTableColumnControlProps) {
  const [open, setOpen] = useState(false);

  const optionalCount = FIN_COLUMN_ORDER.filter(
    (id) => !FIN_COLUMN_DEFAULT_VISIBILITY[id] && visibility[id]
  ).length;

  const toggle = (id: string, locked?: boolean) => {
    if (locked) return;
    onChange({ ...visibility, [id]: !visibility[id] });
  };

  const resetDefaults = () => {
    onChange(buildDefaultPeerColumnVisibility());
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 10px",
          borderRadius: "var(--r-md)",
          border: "1px solid var(--border-1)",
          background: open ? "var(--ax-gray-25)" : "white",
          color: "var(--fg-2)",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "var(--font-sans)",
        }}
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <path
            d="M2 4h12M2 8h12M2 12h8"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
        Columns
        {optionalCount > 0 && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "var(--ax-cyan-700)",
              background: "var(--ax-cyan-50)",
              padding: "1px 6px",
              borderRadius: 999,
            }}
          >
            +{optionalCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 998 }}
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              right: 0,
              zIndex: 999,
              width: 320,
              maxHeight: 420,
              overflow: "auto",
              background: "white",
              border: "1px solid var(--border-1)",
              borderRadius: "var(--r-lg)",
              boxShadow: "var(--shadow-popover)",
              padding: "12px 14px",
              fontFamily: "var(--font-sans)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--fg-1)" }}>
                  Table columns
                </div>
                <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 2 }}>
                  Default columns stay on; add optional metrics below.
                </div>
              </div>
              <button
                type="button"
                onClick={resetDefaults}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--fg-link)",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Reset
              </button>
            </div>

            {FIN_COLUMN_CATEGORIES.map((category) => (
              <div key={category.id} style={{ marginBottom: 12 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--fg-4)",
                    marginBottom: 6,
                  }}
                >
                  {category.name}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {category.columns.map((col) => {
                    const checked = Boolean(visibility[col.id]);
                    const isDefault = Boolean(col.defaultVisible);
                    return (
                      <label
                        key={col.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 12,
                          color: col.locked ? "var(--fg-3)" : "var(--fg-1)",
                          cursor: col.locked ? "default" : "pointer",
                          opacity: col.locked ? 0.7 : 1,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={col.locked}
                          onChange={() => toggle(col.id, col.locked)}
                        />
                        <span style={{ flex: 1 }}>{col.label}</span>
                        {isDefault && (
                          <span style={{ fontSize: 10, color: "var(--fg-4)" }}>default</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
