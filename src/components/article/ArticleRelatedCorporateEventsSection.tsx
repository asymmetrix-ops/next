"use client";

import React from "react";
import Link from "next/link";
import type { ArticleRelatedCorporateEvent } from "@/lib/articleRelatedCorporateEvents";

function formatEventDate(iso?: string): string {
  if (!iso?.trim()) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

type Props = {
  events: ArticleRelatedCorporateEvent[];
  variant?: "main" | "sidebar";
};

export function ArticleRelatedCorporateEventsSection({
  events,
  variant = "main",
}: Props) {
  if (!events.length) return null;

  if (variant === "sidebar") {
    return (
      <div className="card">
        <header>
          <h2>Related Corporate Event</h2>
        </header>
        <div className="chipset">
          {events.map((ev) => {
            const label = (ev.description || "View event").trim();
            return (
              <Link
                key={ev.id}
                href={`/corporate-event/${ev.id}`}
                className="lp-chip"
                prefetch={false}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <section className="article-related-ce" aria-label="Related corporate events">
      <h2 className="article-related-ce-title">Related Corporate Event</h2>
      <div className="article-related-ce-list">
        {events.map((ev) => {
          const label = (ev.description || "View corporate event").trim();
          const date = formatEventDate(ev.announcement_date || ev.closed_date);
          const dealType = (ev.deal_type || "").trim();
          const target = (ev.target?.name || "").trim();
          const status = (ev.deal_status || "").trim();

          return (
            <Link
              key={ev.id}
              href={`/corporate-event/${ev.id}`}
              className="article-related-ce-card"
              prefetch={false}
            >
              <div className="article-related-ce-card-title">{label}</div>
              <dl className="article-related-ce-meta">
                {date ? (
                  <>
                    <dt>Date</dt>
                    <dd>{date}</dd>
                  </>
                ) : null}
                {dealType ? (
                  <>
                    <dt>Deal type</dt>
                    <dd>{dealType}</dd>
                  </>
                ) : null}
                {target ? (
                  <>
                    <dt>Target</dt>
                    <dd>{target}</dd>
                  </>
                ) : null}
                {status ? (
                  <>
                    <dt>Status</dt>
                    <dd>{status}</dd>
                  </>
                ) : null}
              </dl>
              <span className="article-related-ce-cta">View corporate event →</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
