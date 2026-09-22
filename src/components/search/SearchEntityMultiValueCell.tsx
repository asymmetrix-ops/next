"use client";

import React from "react";
import { COUNTRY_FLAG_INLINE_SIZE_PX } from "@/lib/dealRadar";
import type { SearchMultiValueItem } from "@/components/search/searchMultiValueUtils";
import { DEFAULT_TAG_CAP } from "@/components/redesign/primitives";
import { CappedMultiValueLinks } from "@/components/search/CappedMultiValueLinks";

const ENTITY_FLAG_SIZE_PX = COUNTRY_FLAG_INLINE_SIZE_PX * 1.5;

type SearchEntityMultiValueCellProps = {
  items: SearchMultiValueItem[];
  maxVisible?: number;
  flagSize?: number;
  onLinkClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
};

export function SearchEntityMultiValueCell({
  items,
  maxVisible = DEFAULT_TAG_CAP,
  flagSize = ENTITY_FLAG_SIZE_PX,
  onLinkClick,
}: SearchEntityMultiValueCellProps) {
  return (
    <CappedMultiValueLinks
      items={items}
      max={maxVisible}
      layout="inline"
      flagSize={flagSize}
      onLinkClick={onLinkClick}
    />
  );
}

export const SEARCH_MULTI_VALUE_STYLES = `
  .search-multi-value-cell {
    display: inline;
    font-size: 12.5px;
    line-height: 1.6;
    white-space: normal;
    word-break: break-word;
    overflow-wrap: break-word;
    max-width: 320px;
  }
  .search-multi-value-link {
    color: #0075df;
    text-decoration: underline;
    font-weight: 500;
    cursor: pointer;
  }
  .search-multi-value-label {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    vertical-align: middle;
  }
  .search-multi-value-link:hover {
    color: #005bb5;
  }
  .search-multi-value-overflow {
    display: inline-flex;
    align-items: center;
    padding: 1px 6px;
    margin: 0;
    border: none;
    border-radius: 999px;
    background: #f1f5f9;
    color: #475569;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    vertical-align: baseline;
    font-family: inherit;
  }
  .search-multi-value-show-less {
    display: inline-block;
    margin-left: 4px;
    padding: 0;
    border: none;
    background: none;
    color: #2A46EA;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
  }
  .capped-multi-value-stack {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    min-width: 0;
  }
  .capped-multi-value-show-less-row {
    display: block;
    margin-top: 2px;
  }
`;
