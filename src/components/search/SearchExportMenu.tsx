"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { ListExportMode } from "@/lib/listExport/types";
import {
  SEARCH_HEADER_ACTION_BUTTON_STYLE,
  SearchExportCsvIcon,
} from "@/components/search/searchHeaderActions";

const MENU_STYLES = `
  .search-export-menu-wrap {
    position: relative;
    display: inline-flex;
  }
  .search-export-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    min-width: 220px;
    background: #fff;
    border: 1px solid #E4E8F2;
    border-radius: 12px;
    box-shadow: 0 4px 10px rgba(16, 28, 70, 0.07), 0 20px 48px rgba(16, 28, 70, 0.10);
    padding: 6px;
    z-index: 40;
  }
  .search-export-menu-item {
    display: block;
    width: 100%;
    text-align: left;
    border: none;
    background: transparent;
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 13px;
    font-weight: 500;
    color: #3D4657;
    cursor: pointer;
  }
  .search-export-menu-item:hover:not(:disabled) {
    background: #F1F4FE;
  }
  .search-export-menu-item:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .search-export-menu-item-desc {
    display: block;
    margin-top: 2px;
    font-size: 11px;
    font-weight: 400;
    color: #6B7488;
  }
`;

export function SearchExportMenu({
  onExport,
  disabled = false,
  exporting = false,
  label = "Export",
  compact = false,
}: {
  onExport: (mode: ListExportMode) => void | Promise<void>;
  disabled?: boolean;
  exporting?: boolean;
  label?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleSelect = useCallback(
    async (mode: ListExportMode) => {
      setOpen(false);
      await onExport(mode);
    },
    [onExport]
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: MENU_STYLES }} />
      <div className="search-export-menu-wrap" ref={wrapRef}>
        <button
          type="button"
          style={{
            ...SEARCH_HEADER_ACTION_BUTTON_STYLE,
            ...(compact ? { height: 32, padding: "0 12px", fontSize: 12 } : {}),
            opacity: disabled ? 0.6 : 1,
          }}
          onClick={() => setOpen((value) => !value)}
          disabled={disabled || exporting}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <SearchExportCsvIcon />
          {exporting ? "Exporting..." : label}
        </button>
        {open && (
          <div className="search-export-menu" role="menu">
            <button
              type="button"
              className="search-export-menu-item"
              role="menuitem"
              disabled={exporting}
              onClick={() => void handleSelect("all_columns")}
            >
              Export all columns
              <span className="search-export-menu-item-desc">
                Two-sheet XLSX with Directory
              </span>
            </button>
            <button
              type="button"
              className="search-export-menu-item"
              role="menuitem"
              disabled={exporting}
              onClick={() => void handleSelect("visible_columns")}
            >
              Export visible columns only
              <span className="search-export-menu-item-desc">
                Single-sheet XLSX
              </span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
