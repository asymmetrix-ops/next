"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import {
  ARTICLE_TABLE_ALL_COLUMNS,
  ARTICLE_TABLE_COL_GROUPS,
  ARTICLE_TABLE_WRAP_COLS,
  type ArticleTableCompanyRow,
} from "@/lib/articleCustomCompanyTableColumns";
import { SEARCH_TABLE_STYLES } from "@/components/search/searchTableStyles";
import {
  CARD_TITLE_STYLE,
  T,
  finMetricsPeriodHeaderStyle,
  kvLabelStyle,
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
    grid-template-columns: minmax(260px, 300px) minmax(0, 1fr);
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

function SidebarSection({
  title,
  allSelected,
  onToggleAll,
  children,
}: {
  title: string;
  allSelected: boolean;
  onToggleAll: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="cct-sidebar-section">
      <div className="cct-sidebar-head">
        <h4 className="cct-sidebar-title">{title}</h4>
        <button type="button" className="cct-link-btn" onClick={onToggleAll}>
          {allSelected ? "Deselect all" : "Select all"}
        </button>
      </div>
      {children}
    </div>
  );
}

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

  const activeColumns = ARTICLE_TABLE_ALL_COLUMNS.filter((c) =>
    selectedColumnKeys.has(c.key)
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const allCompaniesSelected =
    tableRows.length > 0 && tableRows.every((r) => selectedCompanyIds.has(r.id));
  const allColumnsSelected =
    selectedColumnKeys.size === ARTICLE_TABLE_ALL_COLUMNS.length;

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
          <aside className="cct-sidebar">
            <SidebarSection
              title="Companies"
              allSelected={allCompaniesSelected}
              onToggleAll={() => {
                onSelectedCompanyIdsChange(
                  allCompaniesSelected
                    ? new Set()
                    : new Set(tableRows.map((r) => r.id))
                );
              }}
            >
              {tableRows.length === 0 ? (
                <p className="cct-empty">
                  {tableLoading
                    ? "Loading companies…"
                    : "No companies available for this article."}
                </p>
              ) : (
                <div className="cct-checklist">
                  {tableRows.map((row) => (
                    <label key={row.id} className="cct-check">
                      <input
                        type="checkbox"
                        checked={selectedCompanyIds.has(row.id)}
                        onChange={(e) => {
                          const next = new Set(selectedCompanyIds);
                          if (e.target.checked) next.add(row.id);
                          else next.delete(row.id);
                          onSelectedCompanyIdsChange(next);
                        }}
                      />
                      <span style={kvLabelStyle}>{row.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </SidebarSection>

            <SidebarSection
              title="Columns"
              allSelected={allColumnsSelected}
              onToggleAll={() => {
                onSelectedColumnKeysChange(
                  allColumnsSelected
                    ? new Set()
                    : new Set(ARTICLE_TABLE_ALL_COLUMNS.map((c) => c.key))
                );
              }}
            >
              <div className="cct-checklist">
                {ARTICLE_TABLE_COL_GROUPS.map((group) => (
                  <div key={group.group}>
                    <p className="cct-group-label" style={finMetricsPeriodHeaderStyle}>
                      {group.group}
                    </p>
                    {group.cols.map((column) => (
                      <label key={column.key} className="cct-check">
                        <input
                          type="checkbox"
                          checked={selectedColumnKeys.has(column.key)}
                          onChange={(e) => {
                            const next = new Set(selectedColumnKeys);
                            if (e.target.checked) next.add(column.key);
                            else next.delete(column.key);
                            onSelectedColumnKeysChange(next);
                          }}
                        />
                        <span>{column.label}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </SidebarSection>
          </aside>

          <div className="cct-preview">
            {tableLoading ? (
              <p className="cct-empty">Preparing table data…</p>
            ) : (
              <div className="company-table-scroll">
                <table className="company-table">
                  <thead>
                    <tr>
                      <th className="company-table-sticky-frozen">Company Name</th>
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
                    {tableRows
                      .filter((r) => selectedCompanyIds.has(r.id))
                      .map((row) => (
                        <tr key={row.id}>
                          <td className="company-table-sticky-frozen">
                            <Link
                              href={`/company/${row.id}`}
                              prefetch={false}
                              className="company-table-entity-name company-table-entity-name-link"
                            >
                              {row.name}
                            </Link>
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
                                    style={{ color: T.azure, wordBreak: "break-all" }}
                                  >
                                    {value}
                                  </a>
                                ) : (
                                  value
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
