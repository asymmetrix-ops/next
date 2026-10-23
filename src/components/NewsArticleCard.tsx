"use client";

import React from "react";
import { useRouter } from "next/navigation";
import type { ContentArticle } from "@/types/insightsAnalysis";
import { getContentTypeBadgeStyle } from "@/lib/contentTypeBadge";
import {
  decodeHtmlEntities,
  formatArticleDate,
  getArticleByline,
  getArticleCorrections,
} from "@/lib/contentArticleDisplay";
import { ArticleCorrectionNotice } from "@/components/ArticleCorrectionNotice";
import { hasInsightSummary } from "@/lib/insightSummary";

type NewsArticleCardProps = {
  article: ContentArticle;
  className?: string;
  onViewSummary?: (article: ContentArticle) => void;
};

export function NewsArticleCard({
  article,
  className,
  onViewSummary,
}: NewsArticleCardProps) {
  const router = useRouter();

  const headline = decodeHtmlEntities(article.Headline || "") || "-";
  const strapline = decodeHtmlEntities(article.Strapline || "");
  const byline = getArticleByline(article);
  const corrections = getArticleCorrections(article);

  const showSummaryBtn = !!onViewSummary && hasInsightSummary(article.summary);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    ) {
      return;
    }
    e.preventDefault();
    router.push(`/article/${article.id}`);
  };

  return (
    <a
      href={`/article/${article.id}`}
      className={className}
      onClick={handleClick}
      style={{
        display: "block",
        background: "linear-gradient(180deg, #ffffff 0%, #fffafb 100%)",
        borderRadius: 8,
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
        padding: "14px 16px 14px 18px",
        border: "1px solid #fecdd3",
        borderLeft: "4px solid #e11d48",
        cursor: "pointer",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        textDecoration: "none",
        color: "inherit",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(225, 29, 72, 0.12)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.08)";
      }}
    >
      <div style={{ marginBottom: 10 }}>
        <span style={getContentTypeBadgeStyle("News")}>News</span>
        {byline ? (
          <p
            style={{
              fontSize: 13,
              color: "#6b7280",
              margin: "8px 0 0 0",
              fontStyle: "italic",
            }}
          >
            {byline}
          </p>
        ) : null}
      </div>

      <h3
        style={{
          fontSize: 17,
          fontWeight: 700,
          color: "#1a202c",
          margin: "0 0 8px 0",
          lineHeight: 1.35,
        }}
      >
        {headline}
      </h3>

      {strapline ? (
        <p
          style={{
            fontSize: 14,
            color: "#374151",
            lineHeight: 1.5,
            margin: "0 0 8px 0",
            fontWeight: 500,
          }}
        >
          {strapline}
        </p>
      ) : null}

      <p
        style={{
          fontSize: 13,
          color: "#6b7280",
          margin: strapline ? "0 0 8px 0" : "0 0 8px 0",
          fontWeight: 500,
        }}
      >
        {formatArticleDate(article.Publication_Date)}
      </p>

      {corrections.length > 0 ? (
        <ArticleCorrectionNotice corrections={corrections} variant="card" />
      ) : null}

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10 }}>
        <span
          style={{
            display: "inline-block",
            fontSize: 13,
            fontWeight: 600,
            color: "#0075df",
            textDecoration: "underline",
          }}
        >
          Read more
        </span>
        {showSummaryBtn ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onViewSummary?.(article);
            }}
            style={{
              background: "none",
              border: "1px solid #d1d5db",
              borderRadius: 4,
              cursor: "pointer",
              color: "#374151",
              fontSize: 11.5,
              fontWeight: 500,
              padding: "2px 8px",
              lineHeight: 1.5,
            }}
          >
            View summary
          </button>
        ) : null}
      </div>
    </a>
  );
}

export default NewsArticleCard;
