"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ContentArticle } from "@/types/insightsAnalysis";

interface SeriesArticleCardProps {
  article: ContentArticle;
  formatDate: (dateString: string) => string;
  formatSectors: (
    sectors: Array<Array<{ sector_name: string }>> | undefined
  ) => string;
  formatCompanies: (
    companies: ContentArticle["companies_mentioned"] | undefined
  ) => string;
  badgeClassFor: (contentType?: string) => string;
}

export function SeriesArticleCard({
  article,
  formatDate,
  formatSectors,
  formatCompanies,
  badgeClassFor,
}: SeriesArticleCardProps) {
  const router = useRouter();
  const series = article.series!;

  const sortedParts = useMemo(
    () => [...series.parts].sort((a, b) => a.part_number - b.part_number),
    [series.parts]
  );

  const initialIndex = useMemo(() => {
    const byId = sortedParts.findIndex((p) => p.id === article.id);
    if (byId >= 0) return byId;
    const byPartNumber = sortedParts.findIndex(
      (p) => p.part_number === series.current_part
    );
    return byPartNumber >= 0 ? byPartNumber : 0;
  }, [article.id, series.current_part, sortedParts]);

  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const activePart = sortedParts[activeIndex] ?? sortedParts[0];
  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex < sortedParts.length - 1;

  const navigateToArticle = (articleId: number) => {
    router.push(`/article/${articleId}`);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canGoPrev) setActiveIndex((i) => i - 1);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (canGoNext) setActiveIndex((i) => i + 1);
  };

  const handleCardClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
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
    if (activePart) navigateToArticle(activePart.id);
  };

  const displayHeadline = activePart?.headline || article.Headline;
  const displayDate =
    activePart?.publication_date || article.Publication_Date;

  return (
    <a
      href={activePart ? `/article/${activePart.id}` : `#`}
      className="article-card article-card--series"
      onClick={handleCardClick}
    >
      <div className="series-tile-header">
        <span className="series-part-badge">
          Part {activePart?.part_number ?? series.current_part} of{" "}
          {series.total_parts}
        </span>
        {sortedParts.length > 1 && (
          <div className="series-tile-controls">
            <button
              type="button"
              className="series-tile-arrow"
              onClick={handlePrev}
              disabled={!canGoPrev}
              aria-label="Previous part in series"
            >
              ‹
            </button>
            <button
              type="button"
              className="series-tile-arrow"
              onClick={handleNext}
              disabled={!canGoNext}
              aria-label="Next part in series"
            >
              ›
            </button>
          </div>
        )}
      </div>

      <h3 className="article-title">{displayHeadline || "-"}</h3>

      {article.Transaction_status && (
        <div className="article-transaction-status-row">
          <span className="badge-transaction-status">
            {article.Transaction_status}
          </span>
        </div>
      )}

      <p className="article-date">{formatDate(displayDate)}</p>

      {article.Content_Type && (
        <div className="article-badge-row">
          <span className={badgeClassFor(article.Content_Type)}>
            {article.Content_Type}
          </span>
        </div>
      )}

      <p className="article-summary">
        {article.Strapline || "No summary available"}
      </p>

      <div className="series-part-dots" aria-hidden={sortedParts.length <= 1}>
        {sortedParts.map((part, idx) => (
          <span
            key={part.id}
            className={`series-part-dot${idx === activeIndex ? " active" : ""}`}
          />
        ))}
      </div>

      <div className="article-meta">
        <span className="article-meta-label">Companies:</span>
        <span className="article-meta-value">
          {formatCompanies(article.companies_mentioned)}
        </span>
      </div>

      <div className="article-meta">
        <span className="article-meta-label">Sectors:</span>
        <span className="article-meta-value">
          {formatSectors(article.sectors)}
        </span>
      </div>
    </a>
  );
}

export default SeriesArticleCard;
