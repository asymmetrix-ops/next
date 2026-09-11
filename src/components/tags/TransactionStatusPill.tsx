"use client";

import type { CSSProperties } from "react";
import {
  formatTransactionStatusLabel,
  getTransactionStatusPillStyle,
  getTransactionStatusTone,
} from "@/lib/transactionStatusBadge";

type TransactionStatusPillProps = {
  status: string;
  className?: string;
  style?: CSSProperties;
  /** Allow long labels (e.g. Anticipated within 6 months) to wrap in narrow columns. */
  allowWrap?: boolean;
};

export function TransactionStatusPill({
  status,
  className,
  style,
  allowWrap = false,
}: TransactionStatusPillProps) {
  const { dot } = getTransactionStatusTone(status);

  return (
    <span
      className={className}
      style={{
        ...getTransactionStatusPillStyle(status),
        ...(allowWrap
          ? {
              whiteSpace: "normal",
              textAlign: "center",
              alignItems: "flex-start",
            }
          : null),
        ...style,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          backgroundColor: dot,
          flexShrink: 0,
          marginTop: allowWrap ? 5 : 0,
        }}
      />
      {formatTransactionStatusLabel(status)}
    </span>
  );
}
