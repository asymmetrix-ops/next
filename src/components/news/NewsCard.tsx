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
  getProcessStageTone,
  researchPillStyleFromTone,
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
 * Link to the related I&A piece: a distinct, clearly clickable pill (bulb +
 * label naming the piece's type, e.g. "Read our Company Analysis"), tinted to
 * match so it reads as a separate action from the article link underneath it.
 * Same look everywhere it appears (Top Stories, Recent News, and the
 * daily/weekly email templates).
 */
function IaLink({ ia }: { ia: NonNullable<NewsArticle["related_ia"]> }) {
  const type = useIaType(ia.id, ia.contentType);
  const tone = type ? getInsightsTypeTone(type) : NEUTRAL_TONE;
  const label = type ? `Read our ${type}` : "Read our analysis";
  const headline = ia.headline ? decodeHtmlEntities(ia.headline) : "";

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

/** Max primary sectors shown before collapsing the rest into a "+n" tag. */
const SECTOR_TAG_CAP = 3;

/**
 * Primary sectors of the company of focus: up to 3, on their own row below
 * the company/status line. Extra sectors collapse into a "+n" button — same
 * click-to-expand pattern as the Parties column on Corporate Events
 * (`PartyLinks`): click it to reveal the rest inline, click "Show less" to
 * collapse again.
 */
function SectorTags({ sectors }: { sectors: string[] }) {
  const [expanded, setExpanded] = useState(false);
  if (sectors.length === 0) return null;
  const overflowCount = Math.max(0, sectors.length - SECTOR_TAG_CAP);
  const visibleSectors = expanded ? sectors : sectors.slice(0, SECTOR_TAG_CAP);
  return (
    <div className="nw-tags">
      {visibleSectors.map((sector) => (
        <span className="nw-sector" key={sector}>
          {sector}
        </span>
      ))}
      {overflowCount > 0 && !expanded && (
        <button
          type="button"
          className="nw-sector-more"
          aria-expanded={false}
          aria-label={`Show ${overflowCount} more sectors`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setExpanded(true);
          }}
        >
          +{overflowCount}
        </button>
      )}
      {expanded && overflowCount > 0 && (
        <button
          type="button"
          className="nw-sector-less"
          aria-expanded={true}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setExpanded(false);
          }}
        >
          Show less
        </button>
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
  const subTone = subType ? getNewsSubtypeTone(subType) : null;
  const ia = article.related_ia;
  const hasSeries = !!seriesLinks && seriesLinks.length > 0;

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
            <span style={dotPillStyleFromTone(subTone)}>{subType}</span>
          ) : (
            <span className="nw-badge">News</span>
          )}
          <span>{formatArticleDate(article.Publication_Date)}</span>
        </div>

        <h3 className="nw-card-title">
          <Link href={`/article/${article.id}`} title={headline}>
            {headline}
          </Link>
        </h3>

        {strap ? (
          <p className="nw-strap">{strap}</p>
        ) : variant === "feed" ? (
          // Tiles reserve two description lines, so the rows below line up across tiles.
          <p className="nw-strap" aria-hidden="true">
            &nbsp;
          </p>
        ) : null}

        {focus ? (
          <span className="nw-company">
            <Link href={`/company/${focus.id}`} className="nw-company-link">
              {focus.name}
            </Link>
            {iso2 && <CountryFlagImg iso2={iso2} size={COUNTRY_FLAG_INLINE_SIZE_PX * 1.25} />}
            {article.focus_tags?.processStage && (
              <span style={researchPillStyleFromTone(getProcessStageTone(article.focus_tags.processStage))}>
                {article.focus_tags.processStage}
              </span>
            )}
          </span>
        ) : (
          variant === "feed" && <span className="nw-company" aria-hidden="true" />
        )}

        {article.focus_tags && <SectorTags sectors={article.focus_tags.primarySectors} />}

        {(ia || hasSeries) && (
          <div className="nw-card-foot">
            {hasSeries && <SeriesTag links={seriesLinks!} />}
            {ia && <IaLink ia={ia} />}
          </div>
        )}
      </div>
    </article>
  );
}
