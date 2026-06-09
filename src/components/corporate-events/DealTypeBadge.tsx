"use client";

import React from "react";
import { dealTypeBadgeStyle } from "@/lib/corporateEventDealTypeBadge";

export function DealTypeBadge({
  dealType,
  style,
}: {
  dealType: string;
  style?: React.CSSProperties;
}) {
  return (
    <span style={{ ...dealTypeBadgeStyle(), ...style }}>{dealType}</span>
  );
}
