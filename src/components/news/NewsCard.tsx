"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LightBulbIcon } from "@heroicons/react/24/outline";
import { CountryFlagImg } from "@/components/corporate-events/CorporateEventPartyLink";
import { COUNTRY_FLAG_INLINE_SIZE_PX } from "@/lib/dealRadar";
import { getInsightHqCountryIso2 } from "@/lib/insightCountry";
import { decodeHtmlEntities, formatArticleDate } from "@/lib/contentArticleDisplay";
import type { NewsArticle, NewsRef } from "@/lib/news";

type Props = {
  article: NewsArticle;
  variant?: "top" | "feed";
  /** Label linking the two Top Stories under Rule A. */
  relation?: "follow-up" | "previously";
  /** Other articles in this article's series. */
  seriesLinks?: NewsRef[];
};

function SeriesTag({ links }: { links: NewsRef[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="nw-series" ref={ref}>
      <button type="button" className="nw-series-btn" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((v) => !v)}>
        Series · {links.length + 1}
        <span aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="nw-series-pop" role="group" aria-label="Articles in this series">
          <div className="nw-series-pop-title">Also in this series</div>
          {links.map((l) => (
            <Link key={l.id} href={`/article/${l.id}`}>
              {decodeHtmlEntities(l.headline)}
              {l.publication_date && <small>{formatArticleDate(l.publication_date)}</small>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NewsCard({ article, variant = "feed", relation, seriesLinks }: Props) {
  const headline = decodeHtmlEntities(article.Headline || "") || "-";
  const strap = decodeHtmlEntities(article.Strapline || "");
  const focus = article.companies_of_focus?.[0];
  const iso2 = focus ? getInsightHqCountryIso2(article) : null;
  const subType = (article.News_Sub_Type || article.news_sub_type || "").trim();
  const ia = article.related_ia;
  const hasSeries = !!seriesLinks && seriesLinks.length > 0;

  return (
    <article className={`nw-card nw-card-${variant}`}>
      <div className="nw-card-body">
        <div className="nw-card-meta">
          {relation === "follow-up" && <span className="nw-badge nw-badge-link">Follow-up</span>}
          {relation === "previously" && <span className="nw-badge nw-badge-prev">Previously</span>}
          <span className="nw-badge">{subType || "News"}</span>
          <span>{formatArticleDate(article.Publication_Date)}</span>
        </div>

        <h3 className="nw-card-title">
          <Link href={`/article/${article.id}`}>{headline}</Link>
        </h3>

        {strap && <p className="nw-strap">{strap}</p>}

        {focus && (
          <span className="nw-company">
            {iso2 && <CountryFlagImg iso2={iso2} size={COUNTRY_FLAG_INLINE_SIZE_PX * 1.25} />}
            {focus.name}
          </span>
        )}

        {(ia || hasSeries) && (
          <div className="nw-card-foot">
            {hasSeries && <SeriesTag links={seriesLinks!} />}
            {ia && (
              <Link
                href={`/article/${ia.id}`}
                className="nw-ia"
                title={ia.headline ? `Insights & Analysis: ${decodeHtmlEntities(ia.headline)}` : "Related Insights & Analysis"}
              >
                <LightBulbIcon aria-hidden="true" />
                I&amp;A available
              </Link>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
