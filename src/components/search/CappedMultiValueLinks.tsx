"use client";

import React, { useState } from "react";
import { CountryFlagImg } from "@/components/corporate-events/CorporateEventPartyLink";
import { COUNTRY_FLAG_INLINE_SIZE_PX } from "@/lib/dealRadar";
import { DEFAULT_TAG_CAP } from "@/components/redesign/primitives";
import type { SearchMultiValueItem } from "@/components/search/searchMultiValueUtils";

const ENTITY_FLAG_SIZE_PX = COUNTRY_FLAG_INLINE_SIZE_PX * 1.5;

export type CappedMultiValueLinksProps = {
  items: SearchMultiValueItem[];
  max?: number;
  /** Comma-separated row vs one link per line (Deal Radar). */
  layout?: "inline" | "stack";
  flagSize?: number;
  onLinkClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  linkClassName?: string;
  overflowClassName?: string;
  showLessClassName?: string;
  emptyFallback?: React.ReactNode;
};

function renderEntityLabel(item: SearchMultiValueItem, flagSize: number) {
  const flagEl = item.hqIso2 ? (
    <CountryFlagImg iso2={item.hqIso2} size={flagSize} />
  ) : null;

  return (
    <span className="search-multi-value-label">
      {item.name}
      {flagEl}
    </span>
  );
}

function renderLink(
  item: SearchMultiValueItem,
  flagSize: number,
  linkClassName: string,
  onLinkClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void
) {
  if (item.href) {
    return (
      <a
        href={item.href}
        className={linkClassName}
        onClick={(event) => {
          event.stopPropagation();
          if (!onLinkClick) return;
          if (
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
          ) {
            return;
          }
          event.preventDefault();
          onLinkClick(event);
        }}
      >
        {renderEntityLabel(item, flagSize)}
      </a>
    );
  }

  return renderEntityLabel(item, flagSize);
}

export function CappedMultiValueLinks({
  items,
  max = DEFAULT_TAG_CAP,
  layout = "inline",
  flagSize = ENTITY_FLAG_SIZE_PX,
  onLinkClick,
  linkClassName = "search-multi-value-link",
  overflowClassName = "search-multi-value-overflow",
  showLessClassName = "search-multi-value-show-less",
  emptyFallback = <span>-</span>,
}: CappedMultiValueLinksProps) {
  const [expanded, setExpanded] = useState(false);

  const validItems = items.filter((item) => item.name?.trim());
  if (validItems.length === 0) {
    return <>{emptyFallback}</>;
  }

  const overflowCount = Math.max(0, validItems.length - max);
  const visibleItems = expanded ? validItems : validItems.slice(0, max);

  const overflowControl =
    !expanded && overflowCount > 0 ? (
      <button
        type="button"
        className={overflowClassName}
        aria-expanded={false}
        aria-label={`Show ${overflowCount} more`}
        onClick={(event) => {
          event.stopPropagation();
          setExpanded(true);
        }}
      >
        +{overflowCount}
      </button>
    ) : null;

  if (layout === "stack") {
    return (
      <div className="capped-multi-value-stack">
        {visibleItems.map((item, index) => (
          <div
            key={item.key ?? `stack-${item.name}-${index}`}
            className="leading-snug break-normal text-xs"
          >
            {renderLink(item, flagSize, linkClassName, onLinkClick)}
          </div>
        ))}
        {overflowControl}
        {expanded && overflowCount > 0 ? (
          <button
            type="button"
            className={showLessClassName}
            onClick={(event) => {
              event.stopPropagation();
              setExpanded(false);
            }}
          >
            Show less
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <span className="search-multi-value-cell">
      {visibleItems.map((item, index) => (
        <React.Fragment key={item.key ?? `inline-${item.name}-${index}`}>
          {index > 0 ? ", " : null}
          {renderLink(item, flagSize, linkClassName, onLinkClick)}
        </React.Fragment>
      ))}
      {overflowControl ? (
        <>
          {visibleItems.length > 0 ? ", " : null}
          {overflowControl}
        </>
      ) : null}
      {expanded && overflowCount > 0 ? (
        <span className="capped-multi-value-show-less-row">
          <button
            type="button"
            className={showLessClassName}
            onClick={(event) => {
              event.stopPropagation();
              setExpanded(false);
            }}
          >
            Show less
          </button>
        </span>
      ) : null}
    </span>
  );
}
