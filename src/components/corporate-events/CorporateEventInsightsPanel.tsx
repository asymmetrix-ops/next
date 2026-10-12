"use client";

import React, { useEffect, useState } from "react";
import { T } from "@/components/redesign/primitives";
import { InsightsAnalysisCard } from "@/components/InsightsAnalysisCard";
import type { ContentArticle } from "@/types/insightsAnalysis";

const CONTENT_DETAIL_URL = "https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu/content";
const ENRICH_FIELDS = [
  "companies_mentioned",
  "sectors",
  "companies_of_focus",
  "primary_company",
  "Transaction_status",
  "Content_Type",
] as const;

// Module-level cache so the same article isn't re-fetched across sections/renders.
const detailCache = new Map<number, Promise<Record<string, unknown> | null>>();

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function isEmptyValue(v: unknown): boolean {
  return v == null || v === "" || (Array.isArray(v) && v.length === 0);
}

function fetchArticleDetail(id: number): Promise<Record<string, unknown> | null> {
  const cached = detailCache.get(id);
  if (cached) return cached;
  const request = (async () => {
    try {
      const token = localStorage.getItem("asymmetrix_auth_token");
      if (!token) return null;
      const res = await fetch(`${CONTENT_DETAIL_URL}/${id}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (!res.ok) return null;
      const json: unknown = await res.json();
      const raw = Array.isArray(json) ? json[0] : json;
      return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  })();
  detailCache.set(id, request);
  return request;
}

/**
 * The corporate-event content endpoints return a slim payload (no companies or
 * sectors), so the shared I&A card would render without its coverage rows and
 * company-count chip. Backfill those fields from the article detail endpoint.
 */
function useEnrichedArticles(articles: ContentArticle[]): ContentArticle[] {
  const [details, setDetails] = useState<Record<number, Record<string, unknown>>>({});

  useEffect(() => {
    let cancelled = false;
    articles.forEach((a) => {
      if (typeof a?.id !== "number") return;
      const id = a.id;
      if (!ENRICH_FIELDS.some((k) => isEmptyValue((a as unknown as Record<string, unknown>)[k]))) return;
      fetchArticleDetail(id).then((d) => {
        if (!cancelled && d) setDetails((prev) => (prev[id] ? prev : { ...prev, [id]: d }));
      });
    });
    return () => {
      cancelled = true;
    };
  }, [articles]);

  return articles.map((a) => {
    const d = typeof a?.id === "number" ? details[a.id] : undefined;
    if (!d) return a;
    const merged = { ...a } as unknown as Record<string, unknown>;
    for (const k of ENRICH_FIELDS) {
      if (isEmptyValue(merged[k]) && !isEmptyValue(d[k])) merged[k] = parseMaybeJson(d[k]);
    }
    return merged as unknown as ContentArticle;
  });
}

type Props = {
  title: string;
  insights: ContentArticle[];
  fillGridCell?: boolean;
};

export function CorporateEventInsightsPanel({ title, insights, fillGridCell = false }: Props) {
  const enriched = useEnrichedArticles(insights);
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
        {enriched.map((article, index) => (
          <InsightsAnalysisCard key={article.id ?? index} article={article} />
        ))}
      </div>
    </div>
  );
}
