"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import { ColumnsControlRoom } from "@/components/companies/ColumnsControlRoom";
import type { CompanyColumnCategory } from "@/components/companies/companiesColumnCategories";
import { FILTER_PINNED_TOOLTIP } from "./financialScreenerColumnFilterMap";
import {
  DEFAULT_VISIBLE_FINANCIAL_SCREENER_COLUMN_KEYS,
  FROZEN_FINANCIAL_SCREENER_COLUMN_KEYS,
  FINANCIAL_SCREENER_COLUMN_CATEGORIES,
  ALL_FINANCIAL_SCREENER_COLUMN_META,
  columnKeysToVisibility,
  visibilityToColumnKeys,
  enforceColumnKeyOrder,
} from "./financialScreenerColumnCategories";
import {
  compareSortValues,
  getColumnSortKind,
  getSortValueForColumn,
} from "./financialScreenerTableSort";
import { SearchEntityIdentityCell } from "@/components/search/SearchEntityIdentityCell";
import { SearchEntityMultiValueCell } from "@/components/search/SearchEntityMultiValueCell";
import { SEARCH_MULTI_VALUE_STYLES } from "@/components/search/SearchEntityMultiValueCell";
import {
  getScreenerCellValue,
  getOwnershipPillStyle,
  formatScreenerHq,
} from "./financialScreenerFormatters";
import type { FinancialScreenerItem } from "@/app/financials/actions";
import type { FinancialScreenerFilters } from "./financialScreenerFilterPayload";
import { CompaniesCSVExporter } from "@/utils/companiesCSVExport";
import { ExportLimitModal } from "@/components/ExportLimitModal";
import { checkExportLimit, EXPORT_LIMIT } from "@/utils/exportLimitCheck";
import { fetchFinancialScreenerServer } from "@/app/financials/actions";
import { applyClientFilters } from "./financialScreenerFilterPayload";
import { BulkPortfolioActionToolbar } from "@/components/search/BulkPortfolioActionToolbar";
import { SEARCH_BULK_TOOLBAR_STYLES } from "@/components/search/searchTableStyles";

const COLUMN_STORAGE_KEY = "financial-screener-column-keys-v2";
const SELECT_COLUMN_WIDTH = 44;

const COLUMN_MIN_WIDTHS: Partial<Record<string, number>> = {
  company: 220,
  sector: 140,
  ownership: 110,
  fte: 80,
  description: 280,
  revenue: 96,
  revenue_growth: 108,
  ebitda: 96,
  ebitda_margin: 124,
  ebit: 88,
  ev: 80,
  ev_revenue: 116,
  ev_ebit: 96,
  ev_ebitda: 116,
  rev_multiple: 128,
};

interface ColumnDefinition {
  key: string;
  label: string;
  minWidth?: number;
  align: "left" | "center";
}

const LEFT_ALIGNED_COLUMNS = new Set([
  "company",
  "sector",
  "sub_sector",
  "description",
  "hq",
  "url",
]);

const COLUMN_DEFINITIONS: ColumnDefinition[] = ALL_FINANCIAL_SCREENER_COLUMN_META.map(
  (meta) => ({
    key: meta.columnKey,
    label: meta.label,
    minWidth:
      COLUMN_MIN_WIDTHS[meta.columnKey] ??
      (meta.type === "currency" || meta.type === "number" || meta.type === "multiple"
        ? 96
        : 120),
    align: LEFT_ALIGNED_COLUMNS.has(meta.columnKey) ? "left" : "center",
  })
);

const COLUMN_BY_KEY = new Map(
  COLUMN_DEFINITIONS.map((column) => [column.key, column])
);

function buildSimpleCSV(headers: string[], rows: string[][]): string {
  const escape = (value: string) => `"${String(value).replace(/"/g, '""')}"`;
  const lines = [
    headers.map(escape).join(","),
    ...rows.map((row) => row.map(escape).join(",")),
  ];
  return `\uFEFF${lines.join("\r\n")}`;
}

export interface FinancialScreenerSectionProps {
  items: FinancialScreenerItem[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
    nextPage: number | null;
    prevPage: number | null;
  };
  currentFilters?: FinancialScreenerFilters;
  filterPinnedColumnKeys?: string[];
  fetchPage: (page: number, filters?: FinancialScreenerFilters) => void;
  externalShowColumnsModal?: boolean;
  externalSetShowColumnsModal?: (open: boolean) => void;
  onColumnsCountChange?: (count: number) => void;
  onRegisterExportCSV?: (fn: () => void) => void;
  selectedCompanyIds?: Set<number>;
  onToggleCompanySelection?: (id: number) => void;
  onTogglePageSelection?: (ids: number[]) => void;
  onClearSelection?: () => void;
}

export const FinancialScreenerSection = ({
  items,
  loading,
  error,
  pagination,
  currentFilters,
  filterPinnedColumnKeys = [],
  fetchPage,
  externalShowColumnsModal,
  externalSetShowColumnsModal,
  onColumnsCountChange,
  onRegisterExportCSV,
  selectedCompanyIds = new Set(),
  onToggleCompanySelection,
  onTogglePageSelection,
  onClearSelection,
}: FinancialScreenerSectionProps) => {
  const router = useRouter();
  const [internalShowColumnsModal, setInternalShowColumnsModal] = useState(false);
  const showColumnsModal = externalShowColumnsModal ?? internalShowColumnsModal;
  const setShowColumnsModal =
    externalSetShowColumnsModal ?? setInternalShowColumnsModal;

  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(
    DEFAULT_VISIBLE_FINANCIAL_SCREENER_COLUMN_KEYS
  );
  const [sortState, setSortState] = useState<{
    key: string;
    dir: "asc" | "desc";
  }>({ key: "ev", dir: "desc" });

  const [showExportLimitModal, setShowExportLimitModal] = useState(false);
  const [exportsLeft, setExportsLeft] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(COLUMN_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setVisibleColumnKeys(enforceColumnKeyOrder(parsed));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    onColumnsCountChange?.(visibleColumnKeys.length);
  }, [visibleColumnKeys, onColumnsCountChange]);

  const effectiveVisibleKeys = useMemo(() => {
    const merged = new Set(visibleColumnKeys);
    for (const key of filterPinnedColumnKeys) merged.add(key);
    for (const key of FROZEN_FINANCIAL_SCREENER_COLUMN_KEYS) merged.add(key);
    return enforceColumnKeyOrder(Array.from(merged));
  }, [visibleColumnKeys, filterPinnedColumnKeys]);

  const activeColumns = useMemo(
    () =>
      effectiveVisibleKeys
        .map((key) => COLUMN_BY_KEY.get(key))
        .filter((col): col is ColumnDefinition => Boolean(col)),
    [effectiveVisibleKeys]
  );

  const sortedItems = useMemo(() => {
    if (!sortState.key || !getColumnSortKind(sortState.key)) return items;
    const { key, dir } = sortState;
    return [...items].sort((a, b) =>
      compareSortValues(
        getSortValueForColumn(a, key),
        getSortValueForColumn(b, key),
        dir
      )
    );
  }, [items, sortState]);

  const pageIds = useMemo(() => sortedItems.map((item) => item.id), [sortedItems]);
  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedCompanyIds.has(id));

  const handleSort = (columnKey: string) => {
    if (!getColumnSortKind(columnKey)) return;
    setSortState((prev) => {
      if (prev.key === columnKey) {
        return { key: columnKey, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      const kind = getColumnSortKind(columnKey);
      return { key: columnKey, dir: kind === "text" ? "asc" : "desc" };
    });
  };

  const handleApplyColumns = (
    visible: Record<string, boolean>,
    order?: string[]
  ) => {
    const keys = order?.length
      ? visibilityToColumnKeys(visible).filter((key) => order.includes(key))
      : visibilityToColumnKeys(visible);
    const ordered = order?.length
      ? enforceColumnKeyOrder(
          order.filter((key) => keys.includes(key) || visible[key] !== false)
        )
      : keys;
    setVisibleColumnKeys(ordered);
    if (typeof window !== "undefined") {
      localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(ordered));
    }
    setShowColumnsModal(false);
  };

  const handleExportCSV = useCallback(async () => {
    try {
      const limitCheck = await checkExportLimit();
      if (!limitCheck.canExport) {
        setExportsLeft(limitCheck.exportsLeft);
        setShowExportLimitModal(true);
        return;
      }

      const filters = currentFilters ?? { page: 1, per_page: 25 };
      let allItems: FinancialScreenerItem[] = [];
      let page = 1;
      let totalPages = 1;

      do {
        const response = await fetchFinancialScreenerServer({
          ...filters,
          page,
          per_page: 100,
        });
        if (!response) break;
        allItems = allItems.concat(response.items);
        totalPages = response.pagination.total_pages;
        page += 1;
      } while (page <= totalPages);

      const filtered = applyClientFilters(allItems, filters);
      const headers = activeColumns.map((col) => col.label);
      const rows = filtered.map((item) =>
        activeColumns.map((col) => getScreenerCellValue(item, col.key))
      );

      const csv = buildSimpleCSV(headers, rows);
      CompaniesCSVExporter.downloadCSV(csv, "financial_screener");
    } catch (exportError) {
      console.error("Financial screener export failed:", exportError);
    }
  }, [activeColumns, currentFilters]);

  useEffect(() => {
    onRegisterExportCSV?.(handleExportCSV);
  }, [handleExportCSV, onRegisterExportCSV]);

  const renderCell = (item: FinancialScreenerItem, columnKey: string) => {
    if (columnKey === "company") {
      const hqRaw = formatScreenerHq(item);
      const subtitle = hqRaw && hqRaw !== "—" ? hqRaw : undefined;
      return (
        <SearchEntityIdentityCell
          name={item.name}
          logo={item.logo}
          subtitle={subtitle}
          href={`/company/${item.id}`}
          onClick={(e) => {
            if (
              e.defaultPrevented ||
              e.button !== 0 ||
              e.metaKey ||
              e.ctrlKey ||
              e.shiftKey ||
              e.altKey
            ) {
              return;
            }
            e.preventDefault();
            router.push(`/company/${item.id}`);
          }}
        />
      );
    }

    if (columnKey === "sector") {
      const items = (item.primary_sectors ?? [])
        .map((sector, index) => {
          const name = sector.sector_name?.trim();
          if (!name) return null;
          return {
            name,
            href: `/sector/${sector.id}`,
            key: `sector-${sector.id}-${index}`,
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry != null);

      return <SearchEntityMultiValueCell items={items} />;
    }

    if (columnKey === "sub_sector") {
      const items = (item.secondary_sectors ?? [])
        .map((sector, index) => {
          const name = sector.sector_name?.trim();
          if (!name) return null;
          return {
            name,
            href: `/sub-sector/${sector.id}`,
            key: `sub-sector-${sector.id}-${index}`,
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry != null);

      return <SearchEntityMultiValueCell items={items} />;
    }

    if (columnKey === "ownership") {
      const style = getOwnershipPillStyle(item.ownership_type);
      return (
        <span
          style={{
            display: "inline-block",
            padding: "3px 10px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 500,
            background: style.background,
            color: style.color,
          }}
        >
          {item.ownership_type || "—"}
        </span>
      );
    }

    if (columnKey === "revenue_growth") {
      const value = item.financials?.rev_growth_pct;
      const num = value != null ? Number(value) : null;
      const isPositive = num != null && num > 0;
      return (
        <span style={{ color: isPositive ? "#15803d" : "#0f172a", fontWeight: 500 }}>
          {num != null && num > 0 ? `+${num}%` : getScreenerCellValue(item, columnKey)}
        </span>
      );
    }

    const text = getScreenerCellValue(item, columnKey);
    return <span>{text}</span>;
  };

  const columnsModalInitial = useMemo(
    () => columnKeysToVisibility(effectiveVisibleKeys),
    [effectiveVisibleKeys]
  );

  return (
    <div style={{ background: "#fff" }}>
      <style>{`
        .financial-screener-table-scroll {
          overflow-x: auto;
          width: 100%;
        }
        .financial-screener-table {
          width: max-content;
          min-width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 13px;
        }
        .financial-screener-table th,
        .financial-screener-table td {
          padding: 8px 12px;
          border-bottom: 1px solid #e2e8f0;
          white-space: nowrap;
          vertical-align: middle;
          text-align: left;
        }
        .financial-screener-table th {
          background: #f8fafc;
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          position: sticky;
          top: 0;
          z-index: 2;
        }
        .financial-screener-table-th-sortable {
          cursor: pointer;
          user-select: none;
        }
        .financial-screener-table-th-sortable:hover {
          color: #0f172a;
        }
        .financial-screener-table-row:hover td {
          background: #f8fafc;
        }
        .financial-screener-table-row-selected td {
          background: #eff6ff !important;
        }
        .financial-screener-table th.align-center,
        .financial-screener-table td.align-center {
          text-align: center;
        }
        .financial-screener-table-select-cell {
          text-align: center;
          width: 44px;
          min-width: 44px;
        }
        .financial-screener-table tbody .financial-screener-table-select-cell input[type="checkbox"] {
          opacity: 0;
          transition: opacity 0.15s ease;
          cursor: pointer;
        }
        .financial-screener-table tbody tr:hover .financial-screener-table-select-cell input[type="checkbox"],
        .financial-screener-table tbody tr.financial-screener-table-row-selected .financial-screener-table-select-cell input[type="checkbox"],
        .financial-screener-table tbody .financial-screener-table-select-cell input[type="checkbox"]:focus-visible {
          opacity: 1;
        }
        ${SEARCH_BULK_TOOLBAR_STYLES}
        ${SEARCH_MULTI_VALUE_STYLES}
        .financial-screener-table td:has(.search-multi-value-cell) {
          white-space: normal !important;
        }
      `}</style>

      {showColumnsModal && (
        <ColumnsControlRoom
          initial={columnsModalInitial}
          initialOrder={effectiveVisibleKeys}
          filterPinnedColumnKeys={filterPinnedColumnKeys}
          categories={
            FINANCIAL_SCREENER_COLUMN_CATEGORIES as unknown as CompanyColumnCategory[]
          }
          title="Columns"
          subtitle="Choose which financial metrics and firmographics to show."
          onCancel={() => setShowColumnsModal(false)}
          onApply={handleApplyColumns}
        />
      )}

      <div style={{ padding: "0 28px 28px" }}>
        {error ? (
          <div style={{ padding: "24px 0", color: "#dc2626" }}>{error}</div>
        ) : null}

        {selectedCompanyIds.size > 0 && onClearSelection && (
          <BulkPortfolioActionToolbar
            entityType="company"
            entityIds={Array.from(selectedCompanyIds)}
            onClearSelection={onClearSelection}
          />
        )}

        <div className="financial-screener-table-scroll">
          <table className="financial-screener-table">
            <thead>
              <tr>
                <th
                  className="financial-screener-table-select-cell"
                  style={{ width: SELECT_COLUMN_WIDTH, minWidth: SELECT_COLUMN_WIDTH }}
                >
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={() => onTogglePageSelection?.(pageIds)}
                    aria-label="Select all on page"
                  />
                </th>
                {activeColumns.map((column) => {
                  const sortable = Boolean(getColumnSortKind(column.key));
                  const isSorted = sortState.key === column.key;
                  const isPinned =
                    filterPinnedColumnKeys.includes(column.key) &&
                    !(FROZEN_FINANCIAL_SCREENER_COLUMN_KEYS as readonly string[]).includes(
                      column.key
                    );
                  return (
                    <th
                      key={column.key}
                      className={[
                        sortable ? "financial-screener-table-th-sortable" : undefined,
                        column.align === "center" ? "align-center" : undefined,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={{ minWidth: column.minWidth }}
                      onClick={() => sortable && handleSort(column.key)}
                      title={isPinned ? FILTER_PINNED_TOOLTIP : undefined}
                    >
                      {column.label}
                      {isSorted ? (
                        <span style={{ marginLeft: 4 }}>
                          {sortState.dir === "asc" ? "↑" : "↓"}
                        </span>
                      ) : null}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={activeColumns.length + 1}
                    style={{ padding: 32, textAlign: "center", color: "#64748b" }}
                  >
                    Loading companies…
                  </td>
                </tr>
              ) : sortedItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeColumns.length + 1}
                    style={{ padding: 32, textAlign: "center", color: "#64748b" }}
                  >
                    No companies match your filters.
                  </td>
                </tr>
              ) : (
                sortedItems.map((item) => {
                  const selected = selectedCompanyIds.has(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={[
                        "financial-screener-table-row",
                        selected ? "financial-screener-table-row-selected" : undefined,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => router.push(`/new_company/${item.id}`)}
                      style={{ cursor: "pointer" }}
                    >
                      <td
                        className="financial-screener-table-select-cell"
                        onClick={(event) => {
                          event.stopPropagation();
                          onToggleCompanySelection?.(item.id);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => onToggleCompanySelection?.(item.id)}
                          aria-label={`Select ${item.name}`}
                        />
                      </td>
                      {activeColumns.map((column) => (
                        <td
                          key={column.key}
                          className={
                            column.align === "center" ? "align-center" : undefined
                          }
                        >
                          {renderCell(item, column.key)}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && pagination.totalPages > 1 ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 16,
              color: "#64748b",
              fontSize: 13,
            }}
          >
            <span>
              Page {pagination.page} of {pagination.totalPages} ·{" "}
              {pagination.total.toLocaleString()} companies
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                disabled={!pagination.prevPage}
                onClick={() =>
                  pagination.prevPage &&
                  fetchPage(pagination.prevPage, currentFilters)
                }
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "1px solid #e2e8f0",
                  background: "#fff",
                  cursor: pagination.prevPage ? "pointer" : "not-allowed",
                  opacity: pagination.prevPage ? 1 : 0.5,
                }}
              >
                Previous
              </button>
              <button
                disabled={!pagination.nextPage}
                onClick={() =>
                  pagination.nextPage &&
                  fetchPage(pagination.nextPage, currentFilters)
                }
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "1px solid #e2e8f0",
                  background: "#fff",
                  cursor: pagination.nextPage ? "pointer" : "not-allowed",
                  opacity: pagination.nextPage ? 1 : 0.5,
                }}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <ExportLimitModal
        isOpen={showExportLimitModal}
        onClose={() => setShowExportLimitModal(false)}
        exportsLeft={exportsLeft}
        totalExports={EXPORT_LIMIT}
      />
    </div>
  );
};

export function getDefaultFinancialScreenerColumnCount(): number {
  return DEFAULT_VISIBLE_FINANCIAL_SCREENER_COLUMN_KEYS.length;
}
