"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ARTICLE_TABLE_ALL_COLUMNS,
  ARTICLE_TABLE_COL_GROUPS,
  ARTICLE_TABLE_WRAP_COLS,
  type ArticleTableCompanyRow,
} from "@/lib/articleCustomCompanyTableColumns";
import { SEARCH_TABLE_STYLES } from "@/components/search/searchTableStyles";
import { SearchEntityIdentityCell } from "@/components/search/SearchEntityIdentityCell";
import { SearchEntityMultiValueCell } from "@/components/search/SearchEntityMultiValueCell";
import {
  namesToMultiValueItems,
  splitCommaSeparatedValues,
} from "@/components/search/searchMultiValueUtils";
import { formatWebsiteLabel } from "@/lib/websiteUrl";
import { ColumnsControlRoom } from "@/components/companies/ColumnsControlRoom";
import { SearchColumnsButton } from "@/components/search/SearchColumnsButton";
import type { CompanyColumnCategory } from "@/components/companies/companiesColumnCategories";
import {
  CARD_TITLE_STYLE,
  T,
} from "@/components/redesign/primitives";

type CustomCompanyTableModalProps = {
  onClose: () => void;
  tableLoading: boolean;
  tableRows: ArticleTableCompanyRow[];
  selectedCompanyIds: Set<number>;
  onSelectedCompanyIdsChange: (next: Set<number>) => void;
  selectedColumnKeys: Set<string>;
  onSelectedColumnKeysChange: (next: Set<string>) => void;
  getCellValue: (row: ArticleTableCompanyRow, key: string) => string;
  onExportCsv: () => void;
};

const ARTICLE_COLUMN_CATEGORIES: CompanyColumnCategory[] = [
  {
    id: "identity",
    name: "Identity",
    columns: [
      {
        id: "name",
        columnKey: "name",
        label: "Company Name",
        type: "text",
        locked: true,
        defaultVisible: true,
      },
    ],
  },
  ...ARTICLE_TABLE_COL_GROUPS.map((group) => ({
    id: group.group.toLowerCase().replace(/\s+/g, "-"),
    name: group.group,
    columns: group.cols.map((col) => ({
      id: col.key,
      columnKey: col.key,
      label: col.label,
      type: "text" as const,
      defaultVisible: true,
    })),
  })),
];

const MULTI_VALUE_COLS = new Set(["primary_sectors", "secondary_sectors", "investors"]);

const MODAL_STYLES = `
  .cct-overlay {
    position: fixed;
    inset: 0;
    z-index: 80;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: rgba(15, 23, 42, 0.45);
    font-family: ${T.sans};
  }
  .cct-shell {
    display: flex;
    flex-direction: column;
    width: min(96vw, calc(100vw - 32px));
    max-width: 1920px;
    max-height: 92vh;
    overflow: hidden;
    background: ${T.panel};
    border: 1px solid ${T.divider};
    border-radius: ${T.rLg}px;
    box-shadow: 0 1px 3px rgba(16, 28, 70, 0.06), 0 24px 64px rgba(16, 28, 70, 0.14);
  }
  .cct-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    padding: 12px 16px;
    border-bottom: 1px solid ${T.hair};
    flex-shrink: 0;
  }
  .cct-header-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .cct-meta {
    font-size: 12px;
    color: ${T.faint};
    font-variant-numeric: tabular-nums;
  }
  .cct-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    min-height: 0;
    flex: 1;
  }
  @media (max-width: 900px) {
    .cct-layout {
      grid-template-columns: 1fr;
    }
    .cct-sidebar {
      border-right: none !important;
      border-bottom: 1px solid ${T.hair};
      max-height: 38vh;
    }
  }
  .cct-sidebar {
    border-right: 1px solid ${T.hair};
    background: ${T.paper};
    padding: 14px 16px;
    overflow: auto;
  }
  .cct-sidebar-section {
    margin-bottom: 18px;
  }
  .cct-sidebar-section:last-child {
    margin-bottom: 0;
  }
  .cct-sidebar-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 10px;
  }
  .cct-sidebar-title {
    margin: 0;
    font-size: 10.5px;
    font-weight: 600;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    color: ${T.muted};
  }
  .cct-link-btn {
    border: none;
    background: transparent;
    color: ${T.azure};
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
    font-family: inherit;
  }
  .cct-link-btn:hover {
    text-decoration: underline;
  }
  .cct-checklist {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .cct-check {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 13px;
    color: ${T.body};
    cursor: pointer;
    line-height: 1.35;
  }
  .cct-check input {
    margin-top: 3px;
    accent-color: ${T.azure};
    cursor: pointer;
    flex-shrink: 0;
  }
  .cct-group-label {
    margin: 10px 0 6px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.35px;
    text-transform: uppercase;
    color: ${T.faint};
  }
  .cct-group-label:first-of-type {
    margin-top: 4px;
  }
  .cct-preview {
    padding: 14px 16px;
    overflow: auto;
    min-width: 0;
    background: ${T.panel};
  }
  .cct-preview .company-table-scroll {
    max-height: min(68vh, calc(92vh - 200px));
  }
  .cct-preview .company-table tbody .company-table-select-cell input[type="checkbox"] {
    opacity: 1;
  }
  .cct-empty {
    margin: 0;
    font-size: 13px;
    color: ${T.muted};
  }
  .cct-close-x {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 1px solid ${T.divider};
    border-radius: ${T.r}px;
    background: ${T.panel};
    color: ${T.muted};
    cursor: pointer;
    font-size: 18px;
    line-height: 1;
    font-family: inherit;
  }
  .cct-close-x:hover {
    background: ${T.inset};
    color: ${T.ink};
  }
  .cct-header .company-columns-button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

export function CustomCompanyTableModal({
  onClose,
  tableLoading,
  tableRows,
  selectedCompanyIds,
  onSelectedCompanyIdsChange,
  selectedColumnKeys,
  onSelectedColumnKeysChange,
  getCellValue,
  onExportCsv,
}: CustomCompanyTableModalProps) {
  const selectedCount = tableRows.filter((r) => selectedCompanyIds.has(r.id)).length;
  const columnCount = selectedColumnKeys.size + 1;
  const exportDisabled = selectedCount === 0 || selectedColumnKeys.size === 0;

  const [showColumns, setShowColumns] = useState(false);

  // Follow the user's chosen order (Set keeps insertion order), not the config order.
  const activeColumns = useMemo(() => {
    const byKey = new Map(ARTICLE_TABLE_ALL_COLUMNS.map((c) => [c.key, c]));
    return Array.from(selectedColumnKeys).flatMap((key) => {
      const col = byKey.get(key);
      return col ? [col] : [];
    });
  }, [selectedColumnKeys]);

  const columnVisibility = useMemo(() => {
    const out: Record<string, boolean> = { name: true };
    for (const col of ARTICLE_TABLE_ALL_COLUMNS) {
      out[col.key] = selectedColumnKeys.has(col.key);
    }
    return out;
  }, [selectedColumnKeys]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const allCompaniesSelected =
    tableRows.length > 0 && tableRows.every((r) => selectedCompanyIds.has(r.id));

  return (
    <div
      className="cct-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cct-title"
      onClick={onClose}
    >
      <style dangerouslySetInnerHTML={{ __html: SEARCH_TABLE_STYLES + MODAL_STYLES }} />
      <div className="cct-shell" onClick={(e) => e.stopPropagation()}>
        <header className="cct-header">
          <h3 id="cct-title" style={{ ...CARD_TITLE_STYLE, fontSize: 15, margin: 0 }}>
            Custom Company Table
          </h3>
          <div className="cct-header-actions">
            <span className="cct-meta">
              {selectedCount} companies · {columnCount} columns
            </span>
            <SearchColumnsButton
              active={showColumns}
              count={columnCount}
              total={ARTICLE_TABLE_ALL_COLUMNS.length + 1}
              onClick={() => setShowColumns((v) => !v)}
            />
            <button
              type="button"
              className="company-columns-button primary"
              onClick={onExportCsv}
              disabled={exportDisabled}
            >
              Export CSV
            </button>
            <button type="button" className="company-columns-button" onClick={onClose}>
              Close
            </button>
            <button
              type="button"
              className="cct-close-x"
              onClick={onClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </header>

        <div className="cct-layout">
          <div className="cct-preview">
            {tableLoading ? (
              <p className="cct-empty">Preparing table data…</p>
            ) : (
              <div className="company-table-scroll">
                <table className="company-table">
                  <thead>
                    <tr>
                      <th
                        className="company-table-select-cell"
                        style={{ minWidth: 44, width: 44, textAlign: "center", background: "#F5F7FD" }}
                      >
                        <input
                          type="checkbox"
                          checked={allCompaniesSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = !allCompaniesSelected && selectedCount > 0;
                          }}
                          onChange={() =>
                            onSelectedCompanyIdsChange(
                              allCompaniesSelected
                                ? new Set()
                                : new Set(tableRows.map((r) => r.id))
                            )
                          }
                          aria-label="Select all companies"
                        />
                      </th>
                      <th className="company-table-sticky-frozen" style={{ left: 44 }}>
                        Company Name
                      </th>
                      {activeColumns.map((column) => (
                        <th
                          key={column.key}
                          className={
                            ARTICLE_TABLE_WRAP_COLS.has(column.key)
                              ? "company-table-cell-wrap"
                              : undefined
                          }
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row) => {
                      const isSelected = selectedCompanyIds.has(row.id);
                      return (
                        <tr
                          key={row.id}
                          className={isSelected ? "company-table-row-selected" : undefined}
                        >
                          <td
                            className="company-table-select-cell"
                            style={{ minWidth: 44, width: 44, textAlign: "center" }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                const next = new Set(selectedCompanyIds);
                                if (e.target.checked) next.add(row.id);
                                else next.delete(row.id);
                                onSelectedCompanyIdsChange(next);
                              }}
                              aria-label={`Select ${row.name}`}
                            />
                          </td>
                          <td className="company-table-sticky-frozen" style={{ left: 44 }}>
                            <SearchEntityIdentityCell
                              name={row.name}
                              logo={row.logo}
                              subtitle={row.loc !== "-" ? row.loc : undefined}
                              href={`/company/${row.id}`}
                            />
                          </td>
                          {activeColumns.map((column) => {
                            const value = getCellValue(row, column.key);
                            const isWebsite = column.key === "url";
                            const wrap = ARTICLE_TABLE_WRAP_COLS.has(column.key);
                            return (
                              <td
                                key={`${row.id}-${column.key}`}
                                className={wrap ? "company-table-cell-wrap" : undefined}
                              >
                                {isWebsite &&
                                value &&
                                value !== "-" &&
                                /^https?:\/\//i.test(value) ? (
                                  <a
                                    href={value}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="company-website-link"
                                    style={{ color: "#3b82f6", textDecoration: "none" }}
                                  >
                                    {formatWebsiteLabel(value)}
                                  </a>
                                ) : MULTI_VALUE_COLS.has(column.key) && value !== "-" ? (
                                  <SearchEntityMultiValueCell
                                    items={namesToMultiValueItems(
                                      splitCommaSeparatedValues(value),
                                      `${row.id}-${column.key}`
                                    )}
                                  />
                                ) : (
                                  value
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      {showColumns && (
        <div onClick={(e) => e.stopPropagation()}>
          <ColumnsControlRoom
            initial={columnVisibility}
            initialOrder={["name", ...activeColumns.map((c) => c.key)]}
            categories={ARTICLE_COLUMN_CATEGORIES}
            defaultVisibleColumnKeys={ARTICLE_TABLE_ALL_COLUMNS.map((c) => c.key)}
            reorderHint="Drag rows to reorder. Company Name stays fixed as the first column."
            onCancel={() => setShowColumns(false)}
            onApply={(visible, order) => {
              const ordered = (order ?? []).filter(
                (key) => key !== "name" && visible[key] !== false
              );
              onSelectedColumnKeysChange(new Set(ordered));
              setShowColumns(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
