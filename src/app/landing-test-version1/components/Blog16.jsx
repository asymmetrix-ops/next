"use client";

import {
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@relume_io/relume-ui";
import React from "react";
import { RxChevronRight } from "react-icons/rx";
import { ContentTypeBadge } from "./ContentTypeBadge";
import { Reveal } from "./Reveal";

const DEFAULT_THUMBNAIL = "/images/asymmetrix-video-thumbnail.png";

const EMPTY_SUBSTACK_TABS = {
  latest: [],
  top: [],
};

function formatPublicationDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function externalLinkProps(href) {
  if (!href || href.startsWith("/")) return {};
  return { target: "_blank", rel: "noopener noreferrer" };
}

function ArticleCard({ article }) {
  const titleHref = article.href || "#";
  const formattedDate = formatPublicationDate(article.publicationDate);
  const thumbnailSrc = article.thumbnailUrl || DEFAULT_THUMBNAIL;
  const linkProps = externalLinkProps(article.href);

  return (
    <article className="landing-panel landing-blog-card flex h-full flex-col overflow-hidden rounded-xl p-0">
      <a
        href={titleHref}
        className="block w-full shrink-0"
        {...linkProps}
        {...(article.href ? {} : { "aria-disabled": true, tabIndex: -1 })}
      >
        <div
          className={`landing-blog-thumb w-full overflow-hidden ${
            article.coverImageIsSquare
              ? "landing-blog-thumb-square"
              : "landing-blog-thumb-wide"
          }`}
        >
          <img
            src={thumbnailSrc}
            alt=""
            className="landing-blog-thumb-image"
            loading="lazy"
          />
        </div>
      </a>
      <div className="flex flex-1 flex-col items-start p-3 md:p-4">
        <div className="landing-blog-card-meta mb-1.5 flex w-full min-h-6 flex-wrap items-center gap-2">
          <ContentTypeBadge contentType={article.contentType} />
          {formattedDate ? (
            <p className="inline text-xs font-semibold text-text-alternative md:text-sm">
              {formattedDate}
            </p>
          ) : (
            <span className="inline-block min-h-4 flex-1" aria-hidden />
          )}
        </div>

        <a className="mb-1.5 block w-full" href={titleHref} {...linkProps}>
          <h3 className="landing-blog-card-title text-base font-bold leading-snug text-text-alternative md:text-lg">
            {article.headline}
          </h3>
        </a>

        <p className="landing-blog-card-strapline landing-text-secondary w-full flex-1 text-sm leading-relaxed">
          {article.strapline || "\u00a0"}
        </p>

        <div className="landing-blog-card-footer mt-auto w-full pt-2">
          {article.href ? (
            <a href={article.href} className="inline-flex" {...linkProps}>
              <Button
                title="Read"
                variant="secondary"
                size="sm"
                iconRight={<RxChevronRight />}
                className="landing-btn-secondary flex h-8 w-fit items-center justify-center gap-x-1.5 rounded-full px-3.5 text-sm"
              >
                Read
              </Button>
            </a>
          ) : (
            <span className="inline-block h-8" aria-hidden />
          )}
        </div>
      </div>
    </article>
  );
}

function ArticleGrid({ articles, emptyMessage }) {
  if (!articles?.length) {
    return (
      <p className="landing-text-secondary text-center md:text-md">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 md:gap-4 lg:grid-cols-4 lg:gap-5">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
}

/**
 * @param {{
 *   substackTabs?: import("@/lib/fetchSubstackArchive").SubstackArchiveTabs;
 * }} props
 */
export function Blog16({ substackTabs = EMPTY_SUBSTACK_TABS }) {
  return (
    <section
      id="relume"
      className="landing-navy-bg px-[5%] py-16 md:py-24 lg:py-28"
    >
      <div className="container">
        <Reveal className="mb-12 md:mb-18 lg:mb-20">
          <div className="mx-auto flex w-full max-w-lg flex-col items-center text-center text-text-alternative">
            <p className="landing-eyebrow-chip mb-3 rounded-full px-3 py-1 text-sm font-semibold md:mb-4">
              Substack
            </p>
            <h1 className="mb-5 text-6xl font-bold md:mb-6 md:text-9xl lg:text-10xl">
              What&apos;s worth reading
            </h1>
            <p className="landing-text-secondary md:text-md">
              Our substack is updated weekly
            </p>
          </div>
        </Reveal>
        <Tabs defaultValue="latest" className="flex flex-col justify-center">
          <TabsList className="landing-tab-track-list no-scrollbar mb-12 ml-[-5vw] flex w-screen items-center justify-start overflow-scroll pl-[5vw] md:mb-16 md:ml-auto md:mr-auto md:w-fit md:justify-center md:overflow-hidden md:pl-0">
            <TabsTrigger
              value="latest"
              className="landing-tab-trigger whitespace-nowrap px-4"
            >
              Latest
            </TabsTrigger>
            <TabsTrigger
              value="top"
              className="landing-tab-trigger whitespace-nowrap px-4"
            >
              Top
            </TabsTrigger>
          </TabsList>

          <TabsContent value="latest" className="data-[state=active]:animate-tabs">
            <ArticleGrid
              articles={substackTabs.latest}
              emptyMessage="No Substack posts available."
            />
          </TabsContent>

          <TabsContent value="top" className="data-[state=active]:animate-tabs">
            <ArticleGrid
              articles={substackTabs.top}
              emptyMessage="No top Substack posts available."
            />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
