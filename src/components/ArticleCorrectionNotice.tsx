"use client";

import React from "react";
import type { ContentCorrection } from "@/types/insightsAnalysis";
import { formatCorrectionTimestamp } from "@/lib/contentArticleDisplay";

type ArticleCorrectionNoticeProps = {
  corrections: ContentCorrection[];
  variant?: "card" | "banner";
  className?: string;
};

export function ArticleCorrectionNotice({
  corrections,
  variant = "card",
  className,
}: ArticleCorrectionNoticeProps) {
  if (!corrections.length) return null;

  const isBanner = variant === "banner";

  return (
    <div
      className={className}
      style={{
        marginTop: isBanner ? 0 : 10,
        marginBottom: isBanner ? 24 : 0,
        padding: isBanner ? "12px 14px" : "8px 10px",
        borderRadius: 8,
        border: "1px solid #fcd34d",
        backgroundColor: "#fffbeb",
        color: "#92400e",
      }}
      role="note"
      aria-label="Article correction"
    >
      <div
        style={{
          fontSize: isBanner ? 13 : 12,
          fontWeight: 700,
          letterSpacing: "0.02em",
          textTransform: "uppercase",
          marginBottom: corrections.length > 1 || corrections.some((c) => c.note) ? 6 : 0,
        }}
      >
        Updated
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {corrections.map((correction, index) => {
          const timestamp = formatCorrectionTimestamp(correction.updated_at);
          return (
            <div key={`${correction.updated_at}-${index}`}>
              {timestamp ? (
                <div
                  style={{
                    fontSize: isBanner ? 14 : 12,
                    fontWeight: 600,
                    marginBottom: correction.note ? 4 : 0,
                  }}
                >
                  {timestamp}
                </div>
              ) : null}
              {correction.note ? (
                <div
                  style={{
                    fontSize: isBanner ? 14 : 12,
                    lineHeight: 1.5,
                    color: "#78350f",
                  }}
                >
                  {correction.note}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ArticleCorrectionNotice;
