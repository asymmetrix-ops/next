"use client";

import Link from "next/link";
import type { ArticleSeries, ArticleSeriesPart } from "@/types/insightsAnalysis";

/** Short label for a series part link (e.g. "Part 2: Competitive Landscape"). */
export function formatSeriesPartLabel(part: ArticleSeriesPart): string {
  const headline = (part.headline || "").trim();
  const partMatch = headline.match(/part\s+\d+\s*[–—-]\s*(.+)/i);
  const subtitle = partMatch?.[1]?.trim();
  return subtitle
    ? `Part ${part.part_number}: ${subtitle}`
    : `Part ${part.part_number}: ${headline || "Untitled"}`;
}

interface ArticleSeriesNavProps {
  series: ArticleSeries;
  currentArticleId: number;
  /** When "top", renders above article content; "bottom" below. */
  placement?: "top" | "bottom";
}

export function ArticleSeriesNav({
  series,
  currentArticleId,
  placement = "top",
}: ArticleSeriesNavProps) {
  const sortedParts = [...series.parts].sort(
    (a, b) => a.part_number - b.part_number
  );

  if (sortedParts.length <= 1) return null;

  return (
    <nav
      className={`article-series-nav article-series-nav--${placement}`}
      aria-label={`Series navigation, part ${series.current_part} of ${series.total_parts}`}
    >
      <div className="article-series-nav__header">
        <span className="article-series-nav__label">Series</span>
        <span className="article-series-nav__count">
          Part {series.current_part} of {series.total_parts}
        </span>
      </div>
      <ol className="article-series-nav__list">
        {sortedParts.map((part) => {
          const isActive = part.id === currentArticleId;
          const label = formatSeriesPartLabel(part);

          if (isActive) {
            return (
              <li key={part.id} className="article-series-nav__item">
                <span
                  className="article-series-nav__link article-series-nav__link--active"
                  aria-current="page"
                >
                  {label}
                </span>
              </li>
            );
          }

          return (
            <li key={part.id} className="article-series-nav__item">
              <Link
                href={`/article/${part.id}`}
                className="article-series-nav__link"
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ol>
      <style jsx>{`
        .article-series-nav {
          border: 1px solid #ddd6fe;
          background: linear-gradient(180deg, #faf5ff 0%, #f5f3ff 100%);
          border-radius: 12px;
          padding: 16px 18px;
          margin-bottom: 24px;
        }
        .article-series-nav--bottom {
          margin-bottom: 0;
          margin-top: 32px;
        }
        .article-series-nav__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }
        .article-series-nav__label {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #5b21b6;
        }
        .article-series-nav__count {
          font-size: 13px;
          font-weight: 600;
          color: #6d28d9;
          background: #ede9fe;
          border: 1px solid #c4b5fd;
          border-radius: 9999px;
          padding: 4px 10px;
          white-space: nowrap;
        }
        .article-series-nav__list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .article-series-nav__item {
          margin: 0;
        }
        .article-series-nav__link {
          display: block;
          font-size: 14px;
          line-height: 1.45;
          color: #4338ca;
          text-decoration: none;
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid transparent;
          transition: background-color 0.15s ease, border-color 0.15s ease;
        }
        .article-series-nav__link:hover {
          background: #ede9fe;
          border-color: #c4b5fd;
          text-decoration: underline;
        }
        .article-series-nav__link--active {
          font-weight: 700;
          color: #4c1d95;
          background: #ffffff;
          border-color: #a78bfa;
          box-shadow: 0 1px 2px rgba(91, 33, 182, 0.08);
        }
      `}</style>
    </nav>
  );
}

export default ArticleSeriesNav;
