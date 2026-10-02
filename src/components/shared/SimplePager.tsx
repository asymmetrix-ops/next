"use client";

import React from "react";
import { T } from "@/components/redesign/primitives";

type Props = {
  page: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
};

const btn = (disabled: boolean): React.CSSProperties => ({
  padding: "4px 10px",
  borderRadius: 6,
  border: `1px solid ${T.divider}`,
  background: T.paper,
  color: disabled ? T.muted : T.azure,
  fontFamily: T.sans,
  fontSize: 12.5,
  fontWeight: 500,
  cursor: disabled ? "default" : "pointer",
  opacity: disabled ? 0.55 : 1,
});

export function SimplePager({ page, perPage, total, onPageChange }: Props) {
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  if (total <= perPage) return null;
  const from = (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 16px",
        borderTop: `1px solid ${T.hair}`,
        fontFamily: T.sans,
        fontSize: 12,
        color: T.muted,
      }}
    >
      <span>
        {from}–{to} of {total}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          style={btn(page <= 1)}
        >
          Previous
        </button>
        <span>
          Page {page} of {pageCount}
        </span>
        <button
          type="button"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          style={btn(page >= pageCount)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
