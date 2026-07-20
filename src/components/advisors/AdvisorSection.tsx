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
import { SearchEntityLongText } from "@/components/search/SearchEntityDescription";
import { SearchEntityMultiValueCell } from "@/components/search/SearchEntityMultiValueCell";
import { buildAdvisorSectorItems } from "@/components/search/searchEntityLinkUtils";
import { SearchEntityIdentityCell } from "@/components/search/SearchEntityIdentityCell";
import { getAdvisorFieldAliasesForColumn } from "@/components/advisors/advisorsColumnFields";
import { readLogoFromRecord } from "@/lib/companyLogo";
import { BulkPortfolioActionToolbar } from "@/components/search/BulkPortfolioActionToolbar";
import { exportAdvisorsList } from "@/lib/listExport/advisorsListExport";
import type { ListExportMode, ListExportRequest } from "@/lib/listExport/types";
import { checkExportLimit } from "@/utils/exportLimitCheck";
import { SEARCH_TABLE_STYLES } from "@/components/search/searchTableStyles";
import {
  isSearchTableSelectionEnabled,
  SEARCH_TABLE_SELECT_COLUMN_WIDTH,
  SearchTableSelectCell,
  SearchTableSelectHeader,
  type SearchTableSelectionProps,
} from "@/components/search/searchTableSelection";
import { usePageSelectionState } from "@/components/search/useEntitySelection";
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
  { key: "name", label: "Advisor", minWidth: 220 },
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
  onExportingChange,
  isPortfolioOnlyFilter = false,
  sortColumnKey = null,
  sortDirection = "desc",
  onSortColumn,
  onSortClear,
  selectedEntityIds,
  onToggleEntitySelection,
  onTogglePageSelection,
  onClearSelection,
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
  onRegisterExportCSV?: (fn: (request: ListExportRequest) => Promise<void>) => void;
  onExportingChange?: (exporting: boolean) => void;
  isPortfolioOnlyFilter?: boolean;
  sortColumnKey?: string | null;
  sortDirection?: "asc" | "desc";
  onSortColumn?: (columnKey: string) => void;
  onSortClear?: () => void;
} & SearchTableSelectionProps & {
  onClearSelection?: () => void;
}) => {
  const router = useRouter();
  const headerDidDragRef = useRef(false);
  const [internalShowColumnsModal, setInternalShowColumnsModal] = useState(false);
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
  const selectionEnabled = isSearchTableSelectionEnabled({
    selectedEntityIds,
    onToggleEntitySelection,
    onTogglePageSelection,
  });

  const pageEntityIds = useMemo(
    () =>
      advisors
        .map((advisor) => advisor.id)
        .filter((id): id is number => typeof id === "number" && id > 0),
    [advisors]
  );

  const pageSelectionState = usePageSelectionState(
    pageEntityIds,
    selectedEntityIds ?? new Set()
  );

  const selectedIdList = useMemo(
    () => (selectedEntityIds ? Array.from(selectedEntityIds) : []),
    [selectedEntityIds]
  );

  const frozenColumnKeys = useMemo(
    () => getEffectiveFrozenAdvisorColumnKeys(filterPinnedColumnKeys),
    [filterPinnedColumnKeys]
  );

  const stickyColumnOffsets = useMemo(
    () =>
      buildStickyColumnOffsets(
        frozenColumnKeys,
        ALL_ADVISOR_COLUMNS,
        selectionEnabled ? SEARCH_TABLE_SELECT_COLUMN_WIDTH : 0
      ),
    [frozenColumnKeys, selectionEnabled]
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

  const [exporting, setExporting] = useState(false);

  const handleListExport = useCallback(
    async (mode: ListExportMode, scope: ListExportRequest["scope"]) => {
      try {
        const limitCheck = await checkExportLimit();
        if (!limitCheck.canExport) return;

        setExporting(true);
        await exportAdvisorsList(
          {
            mode,
            scope,
            selectedIds:
              scope === "selected" ? selectedIdList : undefined,
          },
          currentFilters ?? createDefaultAdvisorFilters(),
          selectedColumnKeys
        );
      } catch (exportError) {
        console.error("Advisor export failed:", exportError);
      } finally {
        setExporting(false);
      }
    },
    [currentFilters, selectedColumnKeys, selectedIdList]
  );

  const handleExportRequest = useCallback(
    async (request: ListExportRequest) => {
      await handleListExport(request.mode, request.scope);
    },
    [handleListExport]
  );

  useEffect(() => {
    onExportingChange?.(exporting);
  }, [exporting, onExportingChange]);

  useEffect(() => {
    onRegisterExportCSV?.(handleExportRequest);
  }, [handleExportRequest, onRegisterExportCSV]);

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
    advisor: Advisor
  ): React.ReactNode => {
    switch (columnKey) {
      case "name": {
        const id = advisor.id;
        const name = advisor.name || "-";
        return (
          <SearchEntityIdentityCell
            name={name}
            logo={readLogoFromRecord(advisor, getAdvisorFieldAliasesForColumn("logo"))}
            subtitle={advisor.country?.trim() || undefined}
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
        return <SearchEntityLongText text={advisor.description || "-"} />;
      case "events_advised":
        return formatNumber(advisor.events_advised);
      case "sectors":
        return (
          <SearchEntityMultiValueCell
            items={buildAdvisorSectorItems(
              advisor.sectors,
              `advisor-${advisor.id ?? "row"}`
            )}
            maxVisible={10}
          />
        );
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
      {selectionEnabled && selectedEntityIds!.size > 0 && onClearSelection && (
        <BulkPortfolioActionToolbar
          entityType="advisor"
          entityIds={selectedIdList}
          onClearSelection={onClearSelection}
          exporting={exporting}
          onExport={(mode) => handleListExport(mode, "selected")}
        />
      )}
      <div className="company-table-scroll">
        <table className="company-table">
          <thead>
            <tr>
              {selectionEnabled && onTogglePageSelection && (
                <SearchTableSelectHeader
                  pageIds={pageEntityIds}
                  pageSelectionState={pageSelectionState}
                  onTogglePageSelection={onTogglePageSelection}
                  ariaLabel="Select all advisors on this page"
                />
              )}
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
                <td colSpan={selectedColumns.length + (selectionEnabled ? 1 : 0)}>
                  No advisors found.
                </td>
              </tr>
            ) : (
              advisors.map((advisor, index) => {
                const entityId = advisor.id;
                const isRowSelected =
                  typeof entityId === "number" && selectedEntityIds?.has(entityId);
                return (
                <tr
                  key={`${advisor.id ?? index}`}
                  className={isRowSelected ? "company-table-row-selected" : undefined}
                >
                  {selectionEnabled &&
                    onToggleEntitySelection &&
                    typeof entityId === "number" &&
                    entityId > 0 && (
                      <SearchTableSelectCell
                        entityId={entityId}
                        selected={Boolean(isRowSelected)}
                        onToggle={onToggleEntitySelection}
                        ariaLabel={`Select ${advisor.name || "advisor"}`}
                      />
                    )}
                  {selectionEnabled &&
                    (typeof entityId !== "number" || entityId <= 0) && (
                      <td
                        className="company-table-select-cell"
                        style={{
                          minWidth: SEARCH_TABLE_SELECT_COLUMN_WIDTH,
                          width: SEARCH_TABLE_SELECT_COLUMN_WIDTH,
                        }}
                      />
                    )}
                  {selectedColumns.map((column) => (
                    <td
                      key={`${column.key}-${index}`}
                      className={getSearchTableColumnClassName(column, frozenColumnKeys)}
                      style={{
                        minWidth: column.minWidth,
                        ...getStickyColumnStyle(
                          column.key,
                          stickyColumnOffsets,
                          column.minWidth,
                          false,
                          Boolean(isRowSelected)
                        ),
                      }}
                    >
                      {renderAdvisorCell(column.key, advisor)}
                    </td>
                  ))}
                </tr>
              );
              })
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
