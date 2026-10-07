import React from "react";
import type { MultipleBasis } from "./transactionCompsTypes";

/** UI labels for the basis tag. Keep every label here; final wording is pending from Alex G. */
export const BASIS_LABELS: Record<MultipleBasis, string> = {
  LTM: "LTM",
  LFY: "LFY",
  "LFY-1": "LFY-1",
  Fwd: "Fwd",
};

/** Small tag showing the period a multiple is based on. Renders nothing without a basis. */
export function MultipleBasisTag({ basis }: { basis?: MultipleBasis | null }) {
  if (!basis) return null;
  return (
    <span
      style={{
        marginLeft: 6,
        padding: "1px 4px",
        borderRadius: 4,
        background: "#F1F3F9",
        color: "#6B7488",
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.4,
      }}
    >
      {BASIS_LABELS[basis] ?? basis}
    </span>
  );
}
