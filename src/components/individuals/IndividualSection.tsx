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
import type { Individual } from "@/types/individuals";
import type { IndividualsSearchFilters } from "@/app/individuals/actions";
import { createDefaultIndividualFilters } from "@/lib/individualsFilterPayload";
import {
  CANONICAL_INDIVIDUAL_COLUMN_KEYS,
  DEFAULT_VISIBLE_INDIVIDUAL_COLUMN_KEYS,
  INDIVIDUALS_COLUMN_CATEGORIES,
  PROD_DEFAULT_INDIVIDUAL_COLUMN_KEYS,
  enforceIndividualColumnKeyOrder,
  getEffectiveFrozenIndividualColumnKeys,
  individualColumnKeysToVisibility,
  individualVisibilityToColumnKeys,
  reorderIndividualColumnKeys,
} from "@/components/individuals/individualsColumnCategories";
import { FILTER_PINNED_TOOLTIP } from "@/components/individuals/individualsColumnFilterMap";
import {
  formatIndividualLocation,
  resolveIndividualCompanyHref,
} from "@/components/individuals/individualsColumnFields";
import {
  compareIndividualSortValues,
  getIndividualColumnSortKind,
  getIndividualSortValueForColumn,
} from "@/components/individuals/individualsTableSort";
import { SearchEntityLongText } from "@/components/search/SearchEntityDescription";
import { SearchEntityMultiValueCell } from "@/components/search/SearchEntityMultiValueCell";
import { namesToMultiValueItems } from "@/components/search/searchMultiValueUtils";
import { SearchEntityIdentityCell } from "@/components/search/SearchEntityIdentityCell";
import { BulkPortfolioActionToolbar } from "@/components/search/BulkPortfolioActionToolbar";
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

export type Filters = IndividualsSearchFilters;

const INDIVIDUALS_COLUMNS_STORAGE_KEY = "individuals-search-column-keys-v1";

interface IndividualColumnDefinition {
  key: string;
  label: string;
  wrap?: boolean;
  minWidth?: number;
}

const ALL_INDIVIDUAL_COLUMNS: IndividualColumnDefinition[] = [
  { key: "name", label: "Name", minWidth: 220 },
  { key: "current_company", label: "Current Companies", minWidth: 180 },
  { key: "current_roles", label: "Current Roles", wrap: true, minWidth: 180 },
  { key: "location", label: "Location", wrap: true, minWidth: 200 },
  { key: "follow", label: "My Portfolio", minWidth: 120 },
];

const COLUMN_MAP = new Map(
  ALL_INDIVIDUAL_COLUMNS.map((column) => [column.key, column])
);

function getValidColumnKeys(keys: string[]): string[] {
  return enforceIndividualColumnKeyOrder(
    keys.filter((key) => CANONICAL_INDIVIDUAL_COLUMN_KEYS.includes(key))
  );
}

export const IndividualSection = ({
  individuals,
  loading,
  error,
  pagination,
  fetchIndividuals,
  currentFilters,
  filterPinnedColumnKeys = [],
  externalShowColumnsModal,
  externalSetShowColumnsModal,
  onColumnsCountChange,
  isPortfolioOnlyFilter = false,
  selectedEntityIds,
  onToggleEntitySelection,
  onTogglePageSelection,
  onClearSelection,
}: {
  individuals: Individual[];
  loading: boolean;
  error: string | null;
  pagination: {
    curPage: number;
    nextPage: number | null;
    prevPage: number | null;
    pageTotal: number;
    itemsTotal: number;
  };
  fetchIndividuals: (page?: number, filters?: Filters) => Promise<void>;
  currentFilters: Filters | undefined;
  filterPinnedColumnKeys?: string[];
  externalShowColumnsModal?: boolean;
  externalSetShowColumnsModal?: (value: boolean) => void;
  onColumnsCountChange?: (count: number) => void;
  isPortfolioOnlyFilter?: boolean;
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
    DEFAULT_VISIBLE_INDIVIDUAL_COLUMN_KEYS
  );
  const [sortState, setSortState] = useState<{
    key: string;
    dir: "asc" | "desc";
  } | null>(null);
  const [headerDragKey, setHeaderDragKey] = useState<string | null>(null);
  const [headerDragOverKey, setHeaderDragOverKey] = useState<string | null>(null);
  const selectionEnabled = isSearchTableSelectionEnabled({
    selectedEntityIds,
    onToggleEntitySelection,
    onTogglePageSelection,
  });

  const pageEntityIds = useMemo(
    () =>
      individuals
        .map((individual) => individual.id)
        .filter((id): id is number => typeof id === "number" && id > 0),
    [individuals]
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
    () => getEffectiveFrozenIndividualColumnKeys(filterPinnedColumnKeys),
    [filterPinnedColumnKeys]
  );

  const stickyColumnOffsets = useMemo(
    () =>
      buildStickyColumnOffsets(
        frozenColumnKeys,
        ALL_INDIVIDUAL_COLUMNS,
        selectionEnabled ? SEARCH_TABLE_SELECT_COLUMN_WIDTH : 0
      ),
    [frozenColumnKeys, selectionEnabled]
  );

  useEffect(() => {
    if (filterPinnedColumnKeys.length === 0) return;
    setSelectedColumnKeys((current) =>
      enforceIndividualColumnKeyOrder(
        Array.from(new Set([...current, ...filterPinnedColumnKeys])),
        filterPinnedColumnKeys
      )
    );
  }, [filterPinnedColumnKeys]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(INDIVIDUALS_COLUMNS_STORAGE_KEY);
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
      console.warn("Unable to load individual column preferences:", storageError);
    } finally {
      setColumnPrefsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!columnPrefsLoaded) return;
    try {
      window.localStorage.setItem(
        INDIVIDUALS_COLUMNS_STORAGE_KEY,
        JSON.stringify(selectedColumnKeys)
      );
    } catch (storageError) {
      console.warn("Unable to save individual column preferences:", storageError);
    }
  }, [selectedColumnKeys, columnPrefsLoaded]);

  const selectedColumns = useMemo(
    () =>
      selectedColumnKeys
        .map((key) => COLUMN_MAP.get(key))
        .filter((column): column is IndividualColumnDefinition => Boolean(column)),
    [selectedColumnKeys]
  );

  useEffect(() => {
    onColumnsCountChange?.(selectedColumns.length);
  }, [selectedColumns.length, onColumnsCountChange]);

  useEffect(() => {
    if (sortState && !selectedColumnKeys.includes(sortState.key)) {
      setSortState(null);
    }
  }, [selectedColumnKeys, sortState]);

  const sortedIndividuals = useMemo(() => {
    if (!sortState || !getIndividualColumnSortKind(sortState.key)) {
      return individuals;
    }
    const { key, dir } = sortState;
    return [...individuals].sort((a, b) =>
      compareIndividualSortValues(
        getIndividualSortValueForColumn(a, key),
        getIndividualSortValueForColumn(b, key),
        dir
      )
    );
  }, [individuals, sortState]);

  const handleIndividualClick = useCallback(
    (id: number) => {
      router.push(`/individual/${id}`);
    },
    [router]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      const filters = currentFilters ?? createDefaultIndividualFilters();
      void fetchIndividuals(page, { ...filters, page });
    },
    [currentFilters, fetchIndividuals]
  );

  const handleSortColumn = useCallback((columnKey: string) => {
    if (!getIndividualColumnSortKind(columnKey)) return;
    setSortState((current) => {
      if (current?.key !== columnKey) return { key: columnKey, dir: "asc" };
      return { key: columnKey, dir: current.dir === "asc" ? "desc" : "asc" };
    });
  }, []);

  const handleReorderTableColumns = useCallback(
    (dragKey: string, dropKey: string) => {
      setSelectedColumnKeys((current) =>
        enforceIndividualColumnKeyOrder(
          reorderIndividualColumnKeys(current, dragKey, dropKey, filterPinnedColumnKeys),
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

  const columnsModalInitial = useMemo(
    () => individualColumnKeysToVisibility(selectedColumnKeys),
    [selectedColumnKeys]
  );

  const isFilterPinnedColumnKey = useCallback(
    (columnKey: string) => filterPinnedColumnKeys.includes(columnKey),
    [filterPinnedColumnKeys]
  );

  const renderIndividualCell = (
    columnKey: string,
    individual: Individual
  ): React.ReactNode => {
    switch (columnKey) {
      case "name": {
        const id = individual.id;
        const name = individual.advisor_individuals || "-";
        const location = formatIndividualLocation(individual._locations_individual);
        const subtitle = location !== "-" ? location : undefined;
        return (
          <SearchEntityIdentityCell
            name={name}
            subtitle={subtitle}
            href={id ? `/individual/${id}` : undefined}
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
              handleIndividualClick(id!);
            }}
          />
        );
      }
      case "current_company": {
        const href = resolveIndividualCompanyHref(individual);
        const company = individual.current_company;
        if (!company) return "-";
        if (!href) return company;
        return (
          <a
            href={href}
            className="company-website-link"
            style={{ color: "#3b82f6", textDecoration: "none" }}
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
              router.push(href);
            }}
          >
            {company}
          </a>
        );
      }
      case "current_roles":
        return (
          <SearchEntityMultiValueCell
            items={namesToMultiValueItems(
              individual.current_roles?.map((role) => role.job_title) ?? [],
              "role"
            )}
          />
        );
      case "location":
        return (
          <SearchEntityLongText
            text={formatIndividualLocation(individual._locations_individual)}
          />
        );
      case "follow":
        if (!individual.id) return null;
        return (
          <div
            className="company-follow-cell"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <InlineFollowButton
              followKey="followed_individuals"
              entityId={individual.id}
              label={individual.advisor_individuals || ""}
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
    const totalPages = pagination.pageTotal || 0;
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
          categories={INDIVIDUALS_COLUMN_CATEGORIES}
          defaultVisibleColumnKeys={PROD_DEFAULT_INDIVIDUAL_COLUMN_KEYS}
          initial={columnsModalInitial}
          initialOrder={selectedColumnKeys}
          filterPinnedColumnKeys={filterPinnedColumnKeys}
          title="Columns"
          onCancel={() => setShowColumnsModal(false)}
          onApply={(visible, order) => {
            const nextKeys = individualVisibilityToColumnKeys(
              visible,
              order ?? selectedColumnKeys
            );
            setSelectedColumnKeys(
              enforceIndividualColumnKeyOrder(nextKeys, filterPinnedColumnKeys)
            );
            setShowColumnsModal(false);
          }}
        />
      </>
    );

  if (loading && individuals.length === 0) {
    return (
      <div className="company-section">
        <div className="loading">Loading individuals...</div>
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

  if (individuals.length === 0 && isPortfolioOnlyFilter) {
    return (
      <div className="company-section">
        <FollowedOnlyEmptyState entity="individuals" />
        {columnsModalLayer}
        <style dangerouslySetInnerHTML={{ __html: SEARCH_TABLE_STYLES }} />
      </div>
    );
  }

  return (
    <div className="company-section">
      {selectionEnabled && selectedEntityIds!.size > 0 && onClearSelection && (
        <BulkPortfolioActionToolbar
          entityType="individual"
          entityIds={selectedIdList}
          onClearSelection={onClearSelection}
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
                  ariaLabel="Select all individuals on this page"
                />
              )}
              {selectedColumns.map((column) => {
                const sortKind = getIndividualColumnSortKind(column.key);
                const isActive = sortState?.key === column.key;
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
                          ? sortState?.dir === "asc"
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
                        {sortState?.dir === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedIndividuals.length === 0 ? (
              <tr>
                <td colSpan={selectedColumns.length + (selectionEnabled ? 1 : 0)}>
                  No individuals found.
                </td>
              </tr>
            ) : (
              sortedIndividuals.map((individual, index) => {
                const entityId = individual.id;
                const isRowSelected =
                  typeof entityId === "number" && selectedEntityIds?.has(entityId);
                return (
                <tr
                  key={`${individual.id ?? index}`}
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
                        ariaLabel={`Select ${individual.advisor_individuals || "individual"}`}
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
                      {renderIndividualCell(column.key, individual)}
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
