"use client";

import React, { useCallback, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { SearchMultiValueItem } from "@/components/search/searchMultiValueUtils";

const DEFAULT_MAX_VISIBLE = 10;

type SearchEntityMultiValueCellProps = {
  items: SearchMultiValueItem[];
  maxVisible?: number;
  onLinkClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
};

function renderInlineValue(
  item: SearchMultiValueItem,
  onLinkClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void
) {
  if (item.href) {
    return (
      <a
        href={item.href}
        className="search-multi-value-link"
        onClick={(event) => {
          event.stopPropagation();
          if (onLinkClick) {
            event.preventDefault();
            onLinkClick(event);
          }
        }}
      >
        {item.name}
      </a>
    );
  }

  return <span>{item.name}</span>;
}

export function SearchEntityMultiValueCell({
  items,
  maxVisible = DEFAULT_MAX_VISIBLE,
  onLinkClick,
}: SearchEntityMultiValueCellProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const popoverId = useId();

  const validItems = items.filter((item) => item.name?.trim());

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const popoverWidth = 280;
    const left = Math.min(
      Math.max(8, rect.left),
      window.innerWidth - popoverWidth - 8
    );

    setPosition({
      top: rect.bottom + 6,
      left,
    });
  }, []);

  const openPopover = useCallback(() => {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    updatePosition();
    setOpen(true);
  }, [updatePosition]);

  const scheduleClose = useCallback(() => {
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 120);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  if (validItems.length === 0) {
    return <span>-</span>;
  }

  const visibleItems = validItems.slice(0, maxVisible);
  const hiddenCount = validItems.length - visibleItems.length;

  return (
    <>
      <span className="search-multi-value-cell">
        {visibleItems.map((item, index) => (
          <React.Fragment key={item.key ?? `visible-${item.name}-${index}`}>
            {index > 0 ? ", " : null}
            {renderInlineValue(item, onLinkClick)}
          </React.Fragment>
        ))}
        {hiddenCount > 0 ? (
          <>
            {visibleItems.length > 0 ? ", " : null}
            <span
              ref={triggerRef}
              className="search-multi-value-overflow"
              role="button"
              tabIndex={0}
              aria-describedby={open ? popoverId : undefined}
              onMouseEnter={openPopover}
              onMouseLeave={scheduleClose}
              onFocus={openPopover}
              onBlur={scheduleClose}
            >
              +{hiddenCount}
            </span>
          </>
        ) : null}
      </span>

      {open && hiddenCount > 0 && typeof document !== "undefined"
        ? createPortal(
            <div
              id={popoverId}
              className="search-multi-value-popover"
              style={{ top: position.top, left: position.left }}
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
            >
              <div className="search-multi-value-popover-list">
                {validItems.map((item, index) => (
                  <div
                    key={item.key ?? `popover-${item.name}-${index}`}
                    className="search-multi-value-popover-item"
                  >
                    {renderInlineValue(item, onLinkClick)}
                  </div>
                ))}
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

export const SEARCH_MULTI_VALUE_STYLES = `
  .search-multi-value-cell {
    display: inline;
    line-height: 1.4;
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
  .search-multi-value-link:hover {
    color: #005bb5;
  }
  .search-multi-value-overflow {
    display: inline-flex;
    align-items: center;
    padding: 1px 6px;
    border-radius: 999px;
    background: #f1f5f9;
    color: #475569;
    font-size: 11px;
    font-weight: 600;
    cursor: default;
    white-space: nowrap;
    vertical-align: baseline;
  }
  .search-multi-value-popover {
    position: fixed;
    z-index: 10050;
    width: min(280px, calc(100vw - 16px));
    max-height: min(280px, calc(100vh - 16px));
    overflow: auto;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
    padding: 8px 0;
  }
  .search-multi-value-popover-list {
    display: flex;
    flex-direction: column;
  }
  .search-multi-value-popover-item {
    padding: 6px 12px;
    font-size: 13px;
    line-height: 1.4;
    color: #0f172a;
  }
  .search-multi-value-popover-item:hover {
    background: #f8fafc;
  }
`;
