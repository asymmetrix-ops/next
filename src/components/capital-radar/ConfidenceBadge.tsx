"use client";

import React from "react";
import { Pill } from "@/components/redesign/primitives";
import type { CapitalRadarConfidence } from "@/types/capital-radar";

const CONFIDENCE_LABEL: Record<CapitalRadarConfidence, string> = {
  high: "High confidence",
  limited_data: "Limited data",
};

export function ConfidenceBadge({ level }: { level: CapitalRadarConfidence }) {
  const tone = level === "high" ? "emerald" : "warn";
  return (
    <Pill
      tone={tone}
      style={{ height: 20, fontSize: 10.5, padding: "0 8px", whiteSpace: "nowrap" }}
    >
      {CONFIDENCE_LABEL[level] ?? level}
    </Pill>
  );
}
