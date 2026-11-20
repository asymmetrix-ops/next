"use client";

import React, { useEffect, useMemo, useState } from "react";
import { InsightsCard } from "@/components/redesign/InsightsCard";
import { hasInsightSummary } from "@/lib/insightSummary";
import type { ContentArticle } from "@/types/insightsAnalysis";

const CONTENT_DETAIL_URL = "https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu/content";
const ENRICH_FIELDS = [
  "companies_mentioned",
  "sectors",
  "companies_of_focus",
  "primary_company",
  "Transaction_status",
  "Content_Type",
  "Strapline",
] as const;
const PREVIEW_COUNT = 2;

// Module-level cache so the same article isn't re-fetched across renders.
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

function needsDetail(article: ContentArticle): boolean {
  const rec = article as unknown as Record<string, unknown>;
  return ENRICH_FIELDS.some((k) => isEmptyValue(rec[k])) || !hasInsightSummary(rec.summary);
}

// Backfill type, strapline and summary from the article detail when the list payload lacks them
function useEnrichedArticles(articles: ContentArticle[]): ContentArticle[] {
  const [details, setDetails] = useState<Record<number, Record<string, unknown>>>({});

  useEffect(() => {
    let cancelled = false;
    articles.forEach((a) => {
      if (typeof a?.id !== "number" || !needsDetail(a)) return;
      const id = a.id;
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
    const detailSummary = parseMaybeJson(d.summary);
    if (!hasInsightSummary(merged.summary) && hasInsightSummary(detailSummary)) {
      merged.summary = detailSummary;
    }
    return merged as unknown as ContentArticle;
  });
}

const byNewest = (a: ContentArticle, b: ContentArticle) =>
  String(b.Publication_Date ?? "").localeCompare(String(a.Publication_Date ?? ""));

type Props = {
  eventInsights: ContentArticle[];
  sectorInsights: ContentArticle[];
  primarySectorIds: number[];
  fillGridCell?: boolean;
};

export function CorporateEventInsightsPanel({
  eventInsights,
  sectorInsights,
  primarySectorIds,
  fillGridCell = false,
}: Props) {
  // Event pieces first, then sector pieces, newest first in each, no repeats
  const merged = useMemo(() => {
    const seen = new Set<number>();
    return [...[...eventInsights].sort(byNewest), ...[...sectorInsights].sort(byNewest)].filter(
      (article) => {
        if (typeof article?.id !== "number") return true;
        if (seen.has(article.id)) return false;
        seen.add(article.id);
        return true;
      }
    );
  }, [eventInsights, sectorInsights]);
  const enriched = useEnrichedArticles(merged);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [merged.length]);

  if (merged.length === 0) return null;

  const total = enriched.length;
  const start = (page - 1) * PREVIEW_COUNT;
  const browseAllHref =
    primarySectorIds.length > 0
      ? `/insights-analysis?primary_sectors_ids=${primarySectorIds.join(",")}`
      : "/insights-analysis";

  return (
    <InsightsCard
      fillGridCell={fillGridCell}
      articles={enriched.slice(start, start + PREVIEW_COUNT)}
      loading={false}
      totalCount={total}
      rangeStart={start + 1}
      rangeEnd={Math.min(start + PREVIEW_COUNT, total)}
      canPrev={page > 1}
      canNext={start + PREVIEW_COUNT < total}
      onPrev={() => setPage((p) => Math.max(1, p - 1))}
      onNext={() => setPage((p) => p + 1)}
      browseAllHref={browseAllHref}
      previewCount={PREVIEW_COUNT}
    />
  );
}
