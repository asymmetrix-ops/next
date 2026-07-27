"use client";

import Link from "next/link";
import { useEffect } from "react";
import { parseSummaryItems } from "@/lib/insightSummary";
import { T } from "@/components/redesign/primitives";

type InsightSummaryArticle = {
  id: number;
  Headline?: string;
  summary?: unknown;
};

type Props = {
  article: InsightSummaryArticle;
  onClose: () => void;
  articleHref?: string;
  footerLinkLabel?: string;
};

export function InsightSummaryModal({
  article,
  onClose,
  articleHref,
  footerLinkLabel = "Open full report →",
}: Props) {
  const items = parseSummaryItems(article.summary);
  const headline = article.Headline?.trim() || "";
  const href = articleHref ?? `/article/${article.id}`;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15,17,21,0.45)",
        zIndex: 1200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="insight-summary-title"
        style={{
          background: T.panel,
          borderRadius: 12,
          padding: "24px 28px",
          width: "100%",
          maxWidth: 560,
          maxHeight: "80vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
          fontFamily: T.sans,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 18,
            gap: 12,
          }}
        >
          <Link
            id="insight-summary-title"
            href={href}
            prefetch={false}
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: T.ink,
              lineHeight: 1.45,
              flex: 1,
              textDecoration: "none",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = T.azure;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = T.ink;
            }}
          >
            {headline}
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 20,
              color: T.muted,
              lineHeight: 1,
              padding: "0 4px",
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: T.muted,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 12,
          }}
        >
          Summary
        </div>

        <ul
          style={{
            margin: 0,
            paddingLeft: 20,
            listStyleType: "disc",
            listStylePosition: "outside",
          }}
        >
          {items.map((item, i) => (
            <li
              key={i}
              style={{
                fontSize: 13,
                lineHeight: 1.6,
                color: T.body,
                marginBottom: i < items.length - 1 ? 10 : 0,
                display: "list-item",
              }}
              dangerouslySetInnerHTML={{ __html: item }}
            />
          ))}
        </ul>

        <div
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: `1px solid ${T.hair}`,
          }}
        >
          <Link
            href={href}
            prefetch={false}
            style={{
              color: T.azure,
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            {footerLinkLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
