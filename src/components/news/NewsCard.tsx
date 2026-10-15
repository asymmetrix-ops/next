"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LightBulbIcon } from "@heroicons/react/24/outline";
import { CountryFlagImg } from "@/components/corporate-events/CorporateEventPartyLink";
import { COUNTRY_FLAG_INLINE_SIZE_PX } from "@/lib/dealRadar";
import { getInsightHqCountryIso2 } from "@/lib/insightCountry";
import { decodeHtmlEntities, formatArticleDate } from "@/lib/contentArticleDisplay";
import { fetchIaContentType, type NewsArticle, type NewsRef } from "@/lib/news";
import {
  dotPillStyleFromTone,
  getInsightsTypeTone,
  getNewsSubtypeTone,
} from "@/lib/tagColors";

type Props = {
  article: NewsArticle;
  variant?: "top" | "feed";
  /** Label linking the two Top Stories under Rule A. */
  relation?: "follow-up" | "previously";
  /** Other articles in this article's series. */
  seriesLinks?: NewsRef[];
};

const NEUTRAL_TONE = { text: "#566078", fill: "#EFF2F8", border: "#E4E8F2" };

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

/** The I&A piece's type: from the feed when provided, otherwise looked up once. */
function useIaType(id: number, provided?: string) {
  const [type, setType] = useState(provided || "");
  useEffect(() => {
    if (provided) {
      setType(provided);
      return;
    }
    let cancelled = false;
    fetchIaContentType(id).then((t) => !cancelled && setType(t));
    return () => {
      cancelled = true;
    };
  }, [id, provided]);
  return type;
}

/**
 * Link to the related I&A piece: the bulb in the piece type's color, labelled
 * "Read our <type>" (e.g. Company Analysis is green). Top Stories cards have
 * room, so they also show the piece's headline.
 */
function IaLink({ ia, expanded }: { ia: NonNullable<NewsArticle["related_ia"]>; expanded: boolean }) {
  const type = useIaType(ia.id, ia.contentType);
  const tone = type ? getInsightsTypeTone(type) : NEUTRAL_TONE;
  const label = type ? `Read our ${type}` : "Read our analysis";
  const headline = ia.headline ? decodeHtmlEntities(ia.headline) : "";

  if (expanded) {
    return (
      <Link
        href={`/article/${ia.id}`}
        className="nw-ia-panel"
        style={{ background: tone.fill, borderColor: tone.border }}
      >
        <LightBulbIcon aria-hidden="true" style={{ color: tone.text }} />
        <span className="nw-ia-panel-text">
          <span className="nw-ia-panel-label" style={{ color: tone.text }}>{label}</span>
          {headline && <span className="nw-ia-panel-headline">{headline}</span>}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={`/article/${ia.id}`}
      className="nw-ia"
      style={{ background: tone.fill, borderColor: tone.border, color: tone.text }}
      title={headline ? `${label}: ${headline}` : label}
    >
      <LightBulbIcon aria-hidden="true" />
      {label}
    </Link>
  );
}

export default function NewsCard({ article, variant = "feed", relation, seriesLinks }: Props) {
  const headline = decodeHtmlEntities(article.Headline || "") || "-";
  const strap = decodeHtmlEntities(article.Strapline || "");
  const focus = article.companies_of_focus?.[0];
  const iso2 = focus ? getInsightHqCountryIso2(article) : null;
  const subType = (article.News_Sub_Type || article.news_sub_type || "").trim();
  const subTone = subType ? getNewsSubtypeTone(subType) : null;
  const ia = article.related_ia;
  const hasSeries = !!seriesLinks && seriesLinks.length > 0;
  const iaInFooter = !!ia && variant !== "top";

  return (
    <article
      className={`nw-card nw-card-${variant}`}
      style={subTone?.dot ? ({ ["--nw-accent" as string]: subTone.dot } as React.CSSProperties) : undefined}
    >
      <div className="nw-card-body">
        <div className="nw-card-meta">
          {relation === "follow-up" && <span className="nw-badge nw-badge-link">Follow-up</span>}
          {relation === "previously" && <span className="nw-badge nw-badge-prev">Previously</span>}
          {subTone ? (
            <span style={dotPillStyleFromTone(subTone)}>
              <span
                aria-hidden="true"
                style={{ width: 6, height: 6, borderRadius: 999, background: subTone.dot, flexShrink: 0 }}
              />
              {subType}
            </span>
          ) : (
            <span className="nw-badge">News</span>
          )}
          <span>{formatArticleDate(article.Publication_Date)}</span>
        </div>

        <h3 className="nw-card-title">
          <Link href={`/article/${article.id}`}>{headline}</Link>
        </h3>

        {strap && <p className="nw-strap">{strap}</p>}

        {focus && (
          <span className="nw-company">
            {focus.name}
            {iso2 && <CountryFlagImg iso2={iso2} size={COUNTRY_FLAG_INLINE_SIZE_PX * 1.25} />}
          </span>
        )}

        {ia && variant === "top" && <IaLink ia={ia} expanded />}

        {(iaInFooter || hasSeries) && (
          <div className="nw-card-foot">
            {hasSeries && <SeriesTag links={seriesLinks!} />}
            {iaInFooter && <IaLink ia={ia!} expanded={false} />}
          </div>
        )}
      </div>
    </article>
  );
}
