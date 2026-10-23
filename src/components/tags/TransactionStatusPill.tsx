"use client";

import type { CSSProperties } from "react";
import {
  formatTransactionStatusLabel,
  getTransactionStatusPillStyle,
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
  return (
    <span
      className={className}
      style={{
        ...getTransactionStatusPillStyle(status),
        ...(allowWrap
          ? {
              whiteSpace: "normal",
              textAlign: "center",
            }
          : null),
        ...style,
      }}
    >
      {formatTransactionStatusLabel(status)}
    </span>
  );
}
