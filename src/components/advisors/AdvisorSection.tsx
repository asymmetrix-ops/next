"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { FollowedOnlyEmptyState } from "@/components/FollowedOnlyEmptyState";
import { InlineFollowButton } from "@/components/InlineFollowButton";
import { ColumnsControlRoom } from "@/components/companies/ColumnsControlRoom";
import type { AdvisorListItem, AdvisorsSearchFilters } from "@/app/advisors/actions";
import {
  createDefaultAdvisorFilters,
  advisorsFiltersToSearchParams,
} from "@/lib/advisorsFilterPayload";
import {
  ADVISORS_COLUMN_CATEGORIES,
  CANONICAL_ADVISOR_COLUMN_KEYS,
  DEFAULT_VISIBLE_ADVISOR_COLUMN_KEYS,
  PROD_DEFAULT_ADVISOR_COLUMN_KEYS,
  advisorColumnKeysToVisibility,
  advisorVisibilityToColumnKeys,
  enforceAdvisorColumnKeyOrder,
  getEffectiveFrozenAdvisorColumnKeys,
  reorderAdvisorColumnKeys,
} from "@/components/advisors/advisorsColumnCategories";
import { FILTER_PINNED_TOOLTIP } from "@/components/advisors/advisorsColumnFilterMap";
import {
  getAdvisorColumnSortKind,
  getAdvisorServerSortColumn,
} from "@/components/advisors/advisorsTableSort";
import { SearchEntityDescription } from "@/components/search/SearchEntityDescription";
import { SearchEntityIdentityCell } from "@/components/search/SearchEntityIdentityCell";
import { SEARCH_TABLE_STYLES } from "@/components/search/searchTableStyles";
import {
  buildStickyColumnOffsets,
  getSearchTableColumnClassName,
  getStickyColumnStyle,
  SearchTablePinIndicator,
} from "@/components/search/searchTableUtils";

export type Advisor = AdvisorListItem;
export type Filters = AdvisorsSearchFilters;

const ADVISORS_COLUMNS_STORAGE_KEY = "advisors-search-column-keys-v1";

interface AdvisorColumnDefinition {
  key: string;
  label: string;
  wrap?: boolean;
  minWidth?: number;
}

const ALL_ADVISOR_COLUMNS: AdvisorColumnDefinition[] = [
  { key: "name", label: "Advisor", minWidth: 200 },
  { key: "description", label: "Description", wrap: true, minWidth: 280 },
  { key: "events_advised", label: "# Corporate Events Advised", minWidth: 150 },
  { key: "sectors", label: "Advised D&A Sectors", wrap: true, minWidth: 180 },
  { key: "linkedin_members", label: "LinkedIn Members", minWidth: 130 },
  { key: "country", label: "Country", minWidth: 120 },
  { key: "follow", label: "My Portfolio", minWidth: 120 },
];

const COLUMN_MAP = new Map(ALL_ADVISOR_COLUMNS.map((column) => [column.key, column]));

const formatNumber = (value: unknown): string => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return num.toLocaleString();
};

function getValidColumnKeys(keys: string[]): string[] {
  return enforceAdvisorColumnKeyOrder(
    keys.filter((key) => CANONICAL_ADVISOR_COLUMN_KEYS.includes(key))
  );
}

function escapeCsvField(value: string): string {
  const s = String(value ?? "").trim();
  if (s.includes('"') || s.includes("\n") || s.includes(",")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export const AdvisorSection = ({
  advisors,
  loading,
  error,
  pagination,
  fetchAdvisors,
  currentFilters,
  filterPinnedColumnKeys = [],
  externalShowColumnsModal,
  externalSetShowColumnsModal,
  onColumnsCountChange,
  onRegisterExportCSV,
  isPortfolioOnlyFilter = false,
  sortColumnKey = null,
  sortDirection = "desc",
  onSortColumn,
  onSortClear,
}: {
  advisors: Advisor[];
  loading: boolean;
  error: string | null;
  pagination: {
    curPage: number;
    nextPage: number | null;
    prevPage: number | null;
    pageTotal: number;
    itemsTotal: number;
  };
  fetchAdvisors: (
    page?: number,
    filters?: Filters,
    countsFilters?: Filters
  ) => Promise<void>;
  currentFilters: Filters | undefined;
  filterPinnedColumnKeys?: string[];
  externalShowColumnsModal?: boolean;
  externalSetShowColumnsModal?: (value: boolean) => void;
  onColumnsCountChange?: (count: number) => void;
  onRegisterExportCSV?: (fn: () => void) => void;
  isPortfolioOnlyFilter?: boolean;
  sortColumnKey?: string | null;
  sortDirection?: "asc" | "desc";
  onSortColumn?: (columnKey: string) => void;
  onSortClear?: () => void;
}) => {
  const router = useRouter();
  const headerDidDragRef = useRef(false);
  const [internalShowColumnsModal, setInternalShowColumnsModal] = useState(false);
  const [expandedSectors, setExpandedSectors] = useState<Record<number, boolean>>({});
  const showColumnsModal =
    externalShowColumnsModal !== undefined
      ? externalShowColumnsModal
      : internalShowColumnsModal;
  const setShowColumnsModal =
    externalSetShowColumnsModal ?? setInternalShowColumnsModal;
  const [columnPrefsLoaded, setColumnPrefsLoaded] = useState(false);
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[]>(
    DEFAULT_VISIBLE_ADVISOR_COLUMN_KEYS
  );
  const [headerDragKey, setHeaderDragKey] = useState<string | null>(null);
  const [headerDragOverKey, setHeaderDragOverKey] = useState<string | null>(null);

  const frozenColumnKeys = useMemo(
    () => getEffectiveFrozenAdvisorColumnKeys(filterPinnedColumnKeys),
    [filterPinnedColumnKeys]
  );

  const stickyColumnOffsets = useMemo(
    () => buildStickyColumnOffsets(frozenColumnKeys, ALL_ADVISOR_COLUMNS),
    [frozenColumnKeys]
  );

  useEffect(() => {
    if (filterPinnedColumnKeys.length === 0) return;
    setSelectedColumnKeys((current) =>
      enforceAdvisorColumnKeyOrder(
        Array.from(new Set([...current, ...filterPinnedColumnKeys])),
        filterPinnedColumnKeys
      )
    );
  }, [filterPinnedColumnKeys]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(ADVISORS_COLUMNS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSelectedColumnKeys(
            getValidColumnKeys(
              parsed.filter((key): key is string => typeof key === "string")
            )
          );
        }
      }
    } catch (storageError) {
      console.warn("Unable to load advisor column preferences:", storageError);
    } finally {
      setColumnPrefsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!columnPrefsLoaded) return;
    try {
      window.localStorage.setItem(
        ADVISORS_COLUMNS_STORAGE_KEY,
        JSON.stringify(selectedColumnKeys)
      );
    } catch (storageError) {
      console.warn("Unable to save advisor column preferences:", storageError);
    }
  }, [selectedColumnKeys, columnPrefsLoaded]);

  const selectedColumns = useMemo(
    () =>
      selectedColumnKeys
        .map((key) => COLUMN_MAP.get(key))
        .filter((column): column is AdvisorColumnDefinition => Boolean(column)),
    [selectedColumnKeys]
  );

  useEffect(() => {
    onColumnsCountChange?.(selectedColumns.length);
  }, [selectedColumns.length, onColumnsCountChange]);

  useEffect(() => {
    if (sortColumnKey && !selectedColumnKeys.includes(sortColumnKey)) {
      onSortClear?.();
    }
  }, [selectedColumnKeys, sortColumnKey, onSortClear]);

  const handleAdvisorClick = useCallback(
    (id: number) => {
      router.push(`/advisor/${id}`);
    },
    [router]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      const filters = currentFilters ?? createDefaultAdvisorFilters();
      void fetchAdvisors(page, { ...filters, page });
    },
    [currentFilters, fetchAdvisors]
  );

  const handleSortColumn = useCallback(
    (columnKey: string) => {
      if (!getAdvisorServerSortColumn(columnKey) || !onSortColumn) return;
      onSortColumn(columnKey);
    },
    [onSortColumn]
  );

  const handleReorderTableColumns = useCallback(
    (dragKey: string, dropKey: string) => {
      setSelectedColumnKeys((current) =>
        enforceAdvisorColumnKeyOrder(
          reorderAdvisorColumnKeys(current, dragKey, dropKey, filterPinnedColumnKeys),
          filterPinnedColumnKeys
        )
      );
    },
    [filterPinnedColumnKeys]
  );

  const isFrozenColumnKey = useCallback(
    (columnKey: string) => frozenColumnKeys.includes(columnKey),
    [frozenColumnKeys]
  );

  const exportToCsv = useCallback(async () => {
    const filters = currentFilters ?? createDefaultAdvisorFilters();
    const itemsTotal = pagination.itemsTotal;
    if (itemsTotal <= 0) return;

    try {
      const token = localStorage.getItem("asymmetrix_auth_token");
      const params = advisorsFiltersToSearchParams({
        ...filters,
        page: 1,
        per_page: itemsTotal,
      });
      const url = `https://xdil-abvj-o7rq.e2.xano.io/api:Cd_uVQYn:develop/get_all_advisors_list?${params.toString()}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (!response.ok) throw new Error(`API request failed: ${response.statusText}`);

      const raw = (await response.json()) as {
        items?: Advisor[];
        result1?: { items?: Advisor[] };
        Advisors_companies?: { items?: Advisor[] };
      };
      const allAdvisors =
        raw.items ?? raw.result1?.items ?? raw.Advisors_companies?.items ?? [];
      const baseUrl = window.location.origin;
      const headers = [
        "Advisor Name",
        "Asymmetrix link",
        "Description",
        "Number of corporate events advised",
        "Advised sectors",
        "Country",
      ];
      const rows = allAdvisors.map((advisor) =>
        [
          escapeCsvField(advisor.name ?? ""),
          escapeCsvField(`${baseUrl}/advisor/${advisor.id}`),
          escapeCsvField(advisor.description ?? ""),
          String(advisor.events_advised ?? 0),
          escapeCsvField(advisor.sectors ?? ""),
          escapeCsvField(advisor.country ?? ""),
        ].join(",")
      );
      const csv = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const urlObj = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = urlObj;
      a.download = `advisors-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(urlObj);
    } catch (exportError) {
      console.error("Export CSV failed:", exportError);
    }
  }, [currentFilters, pagination.itemsTotal]);

  useEffect(() => {
    onRegisterExportCSV?.(exportToCsv);
  }, [exportToCsv, onRegisterExportCSV]);

  const columnsModalInitial = useMemo(
    () => advisorColumnKeysToVisibility(selectedColumnKeys),
    [selectedColumnKeys]
  );

  const isFilterPinnedColumnKey = useCallback(
    (columnKey: string) => filterPinnedColumnKeys.includes(columnKey),
    [filterPinnedColumnKeys]
  );

  const renderAdvisorCell = (
    columnKey: string,
    advisor: Advisor,
    index: number
  ): React.ReactNode => {
    switch (columnKey) {
      case "name": {
        const id = advisor.id;
        const name = advisor.name || "-";
        return (
          <SearchEntityIdentityCell
            name={name}
            logo={advisor.linkedin_logo}
            href={id ? `/advisor/${id}` : undefined}
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
              handleAdvisorClick(id!);
            }}
          />
        );
      }
      case "description":
        return <SearchEntityDescription description={advisor.description || "-"} />;
      case "events_advised":
        return formatNumber(advisor.events_advised);
      case "sectors": {
        const sectorsText = advisor.sectors || "-";
        const sectorsIsLong = sectorsText.length > 100;
        const isExpanded = !!expandedSectors[index];
        return (
          <div>
            <div className={isExpanded ? "sectors-full" : "sectors-truncated"}>
              {sectorsText}
            </div>
            {sectorsIsLong && (
              <button
                type="button"
                className="expand-sectors"
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  color: "#0075df",
                  textDecoration: "underline",
                  cursor: "pointer",
                  fontSize: 12,
                }}
                onClick={() =>
                  setExpandedSectors((prev) => ({
                    ...prev,
                    [index]: !prev[index],
                  }))
                }
              >
                {isExpanded ? "Show less" : "Show more"}
              </button>
            )}
          </div>
        );
      }
      case "linkedin_members":
        return formatNumber(advisor.linkedin_members);
      case "country":
        return advisor.country || "-";
      case "follow":
        if (!advisor.id) return null;
        return (
          <div
            className="company-follow-cell"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <InlineFollowButton
              followKey="followed_advisors"
              entityId={advisor.id}
              label={advisor.name || ""}
            />
          </div>
        );
      default:
        return "-";
    }
  };

  const generatePaginationButtons = () => {
    const buttons: React.ReactNode[] = [];
    const maxVisible = 7;
    const totalPages =
      pagination.pageTotal ||
      (pagination.nextPage != null
        ? Math.max(pagination.nextPage, pagination.curPage + 1)
        : 0);
    const prevPage = pagination.prevPage ?? pagination.curPage - 1;
    const nextPage = pagination.nextPage ?? pagination.curPage + 1;

    if (totalPages <= 1) return buttons;

    buttons.push(
      <button
        key="previous"
        type="button"
        className="pagination-button pagination-nav"
        onClick={() => handlePageChange(prevPage)}
        disabled={pagination.curPage <= 1}
      >
        Previous
      </button>
    );

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        buttons.push(
          <button
            key={i}
            type="button"
            className={`pagination-button ${i === pagination.curPage ? "active" : ""}`}
            onClick={() => handlePageChange(i)}
          >
            {i}
          </button>
        );
      }
    } else {
      buttons.push(
        <button
          key={1}
          type="button"
          className={`pagination-button ${pagination.curPage === 1 ? "active" : ""}`}
          onClick={() => handlePageChange(1)}
        >
          1
        </button>
      );
      if (pagination.curPage > 3) {
        buttons.push(
          <span key="ellipsis1" className="pagination-ellipsis">
            ...
          </span>
        );
      }
      const start = Math.max(2, pagination.curPage - 1);
      const end = Math.min(totalPages - 1, pagination.curPage + 1);
      for (let i = start; i <= end; i++) {
        buttons.push(
          <button
            key={i}
            type="button"
            className={`pagination-button ${i === pagination.curPage ? "active" : ""}`}
            onClick={() => handlePageChange(i)}
          >
            {i}
          </button>
        );
      }
      if (pagination.curPage < totalPages - 2) {
        buttons.push(
          <span key="ellipsis2" className="pagination-ellipsis">
            ...
          </span>
        );
      }
      buttons.push(
        <button
          key={totalPages}
          type="button"
          className={`pagination-button ${totalPages === pagination.curPage ? "active" : ""}`}
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </button>
      );
    }

    buttons.push(
      <button
        key="next"
        type="button"
        className="pagination-button pagination-nav"
        onClick={() => handlePageChange(nextPage)}
        disabled={pagination.curPage >= totalPages}
      >
        Next
      </button>
    );

    return buttons;
  };

  const columnsModalLayer =
    showColumnsModal &&
    (
      <>
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 199,
            cursor: "default",
          }}
          onClick={() => setShowColumnsModal(false)}
          aria-hidden="true"
        />
        <ColumnsControlRoom
          categories={ADVISORS_COLUMN_CATEGORIES}
          defaultVisibleColumnKeys={PROD_DEFAULT_ADVISOR_COLUMN_KEYS}
          initial={columnsModalInitial}
          initialOrder={selectedColumnKeys}
          filterPinnedColumnKeys={filterPinnedColumnKeys}
          title="Columns"
          onCancel={() => setShowColumnsModal(false)}
          onApply={(visible, order) => {
            const nextKeys = advisorVisibilityToColumnKeys(
              visible,
              order ?? selectedColumnKeys
            );
            setSelectedColumnKeys(
              enforceAdvisorColumnKeyOrder(nextKeys, filterPinnedColumnKeys)
            );
            setShowColumnsModal(false);
          }}
        />
      </>
    );

  if (loading && advisors.length === 0) {
    return (
      <div className="company-section">
        <div className="loading">Loading advisors...</div>
        {columnsModalLayer}
        <style dangerouslySetInnerHTML={{ __html: SEARCH_TABLE_STYLES }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="company-section">
        <div className="error">{error}</div>
        {columnsModalLayer}
        <style dangerouslySetInnerHTML={{ __html: SEARCH_TABLE_STYLES }} />
      </div>
    );
  }

  if (advisors.length === 0 && isPortfolioOnlyFilter) {
    return (
      <div className="company-section">
        <FollowedOnlyEmptyState entity="advisors" />
        {columnsModalLayer}
        <style dangerouslySetInnerHTML={{ __html: SEARCH_TABLE_STYLES }} />
      </div>
    );
  }

  return (
    <div className="company-section">
      <div className="company-table-scroll">
        <table className="company-table">
          <thead>
            <tr>
              {selectedColumns.map((column) => {
                const sortKind = getAdvisorColumnSortKind(column.key);
                const isActive = sortColumnKey === column.key;
                const isDraggable = !isFrozenColumnKey(column.key);
                const isDragging = headerDragKey === column.key;
                const isDragOver =
                  headerDragOverKey === column.key && headerDragKey !== column.key;
                return (
                  <th
                    key={column.key}
                    className={getSearchTableColumnClassName(column, frozenColumnKeys, [
                      sortKind ? "company-table-th-sortable" : undefined,
                      isDraggable ? "company-table-th-draggable" : undefined,
                      isDragging ? "company-table-th-dragging" : undefined,
                      isDragOver ? "company-table-th-drag-over" : undefined,
                    ])}
                    style={{
                      minWidth: column.minWidth,
                      ...getStickyColumnStyle(
                        column.key,
                        stickyColumnOffsets,
                        column.minWidth,
                        true
                      ),
                    }}
                    draggable={isDraggable}
                    onDragStart={
                      isDraggable
                        ? (event) => {
                            headerDidDragRef.current = false;
                            event.dataTransfer.effectAllowed = "move";
                            event.dataTransfer.setData("text/plain", column.key);
                            setHeaderDragKey(column.key);
                            setHeaderDragOverKey(null);
                          }
                        : undefined
                    }
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setHeaderDragOverKey(column.key);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const dragKey =
                        event.dataTransfer.getData("text/plain") || headerDragKey;
                      if (dragKey) {
                        headerDidDragRef.current = true;
                        handleReorderTableColumns(dragKey, column.key);
                      }
                      setHeaderDragKey(null);
                      setHeaderDragOverKey(null);
                    }}
                    onDragEnd={() => {
                      setHeaderDragKey(null);
                      setHeaderDragOverKey(null);
                    }}
                    onClick={
                      sortKind
                        ? () => {
                            if (headerDidDragRef.current) {
                              headerDidDragRef.current = false;
                              return;
                            }
                            handleSortColumn(column.key);
                          }
                        : undefined
                    }
                    aria-sort={
                      sortKind
                        ? isActive
                          ? sortDirection === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                        : undefined
                    }
                  >
                    {column.key === "follow" ? (
                      <span
                        className="company-follow-header-label"
                        style={{ display: "block", textAlign: "left" }}
                      >
                        {column.label}
                      </span>
                    ) : (
                      column.label
                    )}
                    {isFilterPinnedColumnKey(column.key) && (
                      <SearchTablePinIndicator title={FILTER_PINNED_TOOLTIP} />
                    )}
                    {sortKind && isActive && (
                      <span className="company-table-sort-indicator">
                        {sortDirection === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {advisors.length === 0 ? (
              <tr>
                <td colSpan={selectedColumns.length}>No advisors found.</td>
              </tr>
            ) : (
              advisors.map((advisor, index) => (
                <tr key={`${advisor.id ?? index}`}>
                  {selectedColumns.map((column) => (
                    <td
                      key={`${column.key}-${index}`}
                      className={getSearchTableColumnClassName(column, frozenColumnKeys)}
                      style={{
                        minWidth: column.minWidth,
                        ...getStickyColumnStyle(
                          column.key,
                          stickyColumnOffsets,
                          column.minWidth
                        ),
                      }}
                    >
                      {renderAdvisorCell(column.key, advisor, index)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">{generatePaginationButtons()}</div>
      {columnsModalLayer}
      <style dangerouslySetInnerHTML={{ __html: SEARCH_TABLE_STYLES }} />
    </div>
  );
};
