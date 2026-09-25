"use client";

import React from "react";
import { T } from "@/components/redesign/primitives";
import { InsightsAnalysisCard } from "@/components/InsightsAnalysisCard";
import type { ContentArticle } from "@/types/insightsAnalysis";

type Props = {
  title: string;
  insights: ContentArticle[];
  fillGridCell?: boolean;
};

export function CorporateEventInsightsPanel({ title, insights, fillGridCell = false }: Props) {
  if (insights.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minWidth: 0,
        ...(fillGridCell ? { flex: 1, minHeight: 0 } : {}),
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ fontSize: "13.5px", fontWeight: 600, color: T.ink }}>{title}</div>
        <div style={{ fontSize: "11.5px", color: T.muted }}>
          {insights.length} article{insights.length === 1 ? "" : "s"}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          minWidth: 0,
          ...(fillGridCell ? { flex: 1, minHeight: 0, overflow: "auto" } : {}),
        }}
      >
        {insights.map((article, index) => (
          <InsightsAnalysisCard key={article.id ?? index} article={article} />
        ))}
      </div>
    </div>
  );
}
