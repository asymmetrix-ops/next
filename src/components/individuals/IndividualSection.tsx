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
  ADVISORS_TAB_DEFAULT_INDIVIDUAL_COLUMN_KEYS,
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
  getIndividualCurrentCompanies,
} from "@/components/individuals/individualsColumnFields";
import {
  compareIndividualSortValues,
  getIndividualColumnSortKind,
  getIndividualSortValueForColumn,
} from "@/components/individuals/individualsTableSort";
import {
  columnKeyToIndividualsSortBy,
  toggleIndividualsListSort,
  type IndividualsListSortState,
} from "@/components/individuals/individualsListSort";
import { SearchEntityLongText } from "@/components/search/SearchEntityDescription";
import { SearchEntityMultiValueCell } from "@/components/search/SearchEntityMultiValueCell";
import { namesToMultiValueItems } from "@/components/search/searchMultiValueUtils";
import { SearchEntityIdentityCell } from "@/components/search/SearchEntityIdentityCell";
import { BulkPortfolioActionToolbar } from "@/components/search/BulkPortfolioActionToolbar";
import { exportIndividualsList } from "@/lib/listExport/individualsListExport";
import type { ListExportMode, ListExportRequest } from "@/lib/listExport/types";
import { checkExportLimit } from "@/utils/exportLimitCheck";
import { SEARCH_TABLE_STYLES } from "@/components/search/searchTableStyles";
import { SearchTablePagination } from "@/components/search/SearchTablePagination";
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
  { key: "current_roles", label: "Current Roles", wrap: true, minWidth: 150 },
  { key: "corporate_events", label: "Corporate Events", minWidth: 140 },
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
  listSort,
  onServerSortChange,
  filterPinnedColumnKeys = [],
  externalShowColumnsModal,
  externalSetShowColumnsModal,
  onColumnsCountChange,
  onRegisterExportCSV,
  onExportingChange,
  isPortfolioOnlyFilter = false,
  isAdvisorsTab = false,
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
  listSort: IndividualsListSortState;
  onServerSortChange: (nextSort: IndividualsListSortState) => void;
  filterPinnedColumnKeys?: string[];
  externalShowColumnsModal?: boolean;
  externalSetShowColumnsModal?: (value: boolean) => void;
  onColumnsCountChange?: (count: number) => void;
  onRegisterExportCSV?: (fn: (request: ListExportRequest) => Promise<void>) => void;
  onExportingChange?: (exporting: boolean) => void;
  isPortfolioOnlyFilter?: boolean;
  isAdvisorsTab?: boolean;
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
  const [clientSort, setClientSort] = useState<{
    key: string;
    dir: "asc" | "desc";
  } | null>(null);
  const [headerDragKey, setHeaderDragKey] = useState<string | null>(null);
  const [headerDragOverKey, setHeaderDragOverKey] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const exportInFlightRef = useRef(false);
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

  const prevAdvisorsTabRef = useRef(isAdvisorsTab);
  useEffect(() => {
    const enteredAdvisorsTab = isAdvisorsTab && !prevAdvisorsTabRef.current;
    prevAdvisorsTabRef.current = isAdvisorsTab;
    if (!enteredAdvisorsTab) return;
    setSelectedColumnKeys((current) => {
      const merged = enforceIndividualColumnKeyOrder(
        Array.from(
          new Set([
            ...ADVISORS_TAB_DEFAULT_INDIVIDUAL_COLUMN_KEYS,
            ...current,
            ...filterPinnedColumnKeys,
          ])
        ),
        filterPinnedColumnKeys
      );
      const orderedDefaults = ADVISORS_TAB_DEFAULT_INDIVIDUAL_COLUMN_KEYS.filter(
        (key) => merged.includes(key)
      );
      const rest = merged.filter(
        (key) => !ADVISORS_TAB_DEFAULT_INDIVIDUAL_COLUMN_KEYS.includes(key)
      );
      return [...orderedDefaults, ...rest];
    });
  }, [isAdvisorsTab, filterPinnedColumnKeys]);

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
    if (clientSort && !selectedColumnKeys.includes(clientSort.key)) {
      setClientSort(null);
    }
  }, [selectedColumnKeys, clientSort]);

  const displayIndividuals = useMemo(() => {
    if (
      !clientSort ||
      columnKeyToIndividualsSortBy(clientSort.key) ||
      !getIndividualColumnSortKind(clientSort.key)
    ) {
      return individuals;
    }
    const { key, dir } = clientSort;
    return [...individuals].sort((a, b) =>
      compareIndividualSortValues(
        getIndividualSortValueForColumn(a, key),
        getIndividualSortValueForColumn(b, key),
        dir
      )
    );
  }, [individuals, clientSort]);

  useEffect(() => {
    setClientSort(null);
  }, [listSort.sortBy, listSort.sortDir]);

  const handleIndividualClick = useCallback(
    (id: number) => {
      router.push(`/individual/${id}`);
    },
    [router]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      const filters = currentFilters ?? createDefaultIndividualFilters();
      void fetchIndividuals(page, {
        ...filters,
        page,
        sort_by: listSort.sortBy,
        sort_dir: listSort.sortDir,
      });
    },
    [currentFilters, fetchIndividuals, listSort.sortBy, listSort.sortDir]
  );

  const handleSortColumn = useCallback(
    (columnKey: string) => {
      const serverSortBy = columnKeyToIndividualsSortBy(columnKey);
      if (serverSortBy) {
        setClientSort(null);
        onServerSortChange(
          toggleIndividualsListSort(listSort, serverSortBy)
        );
        return;
      }

      if (!getIndividualColumnSortKind(columnKey)) return;
      setClientSort((current) => {
        if (current?.key !== columnKey) return { key: columnKey, dir: "asc" };
        return { key: columnKey, dir: current.dir === "asc" ? "desc" : "asc" };
      });
    },
    [listSort, onServerSortChange]
  );

  const getColumnSortIndicator = useCallback(
    (columnKey: string): { active: boolean; dir: "asc" | "desc" } => {
      const serverSortBy = columnKeyToIndividualsSortBy(columnKey);
      if (serverSortBy) {
        return {
          active: listSort.sortBy === serverSortBy,
          dir: listSort.sortDir,
        };
      }
      return {
        active: clientSort?.key === columnKey,
        dir: clientSort?.dir ?? "asc",
      };
    },
    [listSort.sortBy, listSort.sortDir, clientSort]
  );

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
        return (
          <SearchEntityIdentityCell
            name={name}
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
        const companies = getIndividualCurrentCompanies(individual);
        if (companies.length === 0) return "-";
        return (
          <SearchEntityMultiValueCell
            items={companies.map((company, index) => {
              const companyId = company.employee_new_company_id;
              const href =
                companyId > 0 ? `/company/${companyId}` : undefined;
              return {
                key: `company-${companyId}-${index}`,
                name: company.company_name,
                href,
                isCompany: true,
              };
            })}
          />
        );
      }
      case "corporate_events": {
        const id = individual.id;
        const count = individual.corporate_events_count ?? 0;
        const href = id ? `/individual/${id}#corporate-events` : undefined;
        if (!href) return count.toLocaleString();
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
            {count.toLocaleString()}
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

  const handleListExport = useCallback(
    async (request: ListExportRequest) => {
      if (exportInFlightRef.current) return;

      exportInFlightRef.current = true;
      setExporting(true);

      try {
        const limitCheck = await checkExportLimit();
        if (!limitCheck.canExport) return;

        const { mode, scope } = request;
        const exportTotalCount = pagination.itemsTotal || 0;
        if (scope === "full_list" && exportTotalCount <= 0) {
          console.error("Individuals export aborted: match count is not available yet.");
          return;
        }

        const selectedIdsForExport =
          scope === "selected"
            ? request.selectedIds?.length
              ? request.selectedIds
              : selectedIdList
            : undefined;

        await exportIndividualsList(
          {
            mode,
            scope,
            selectedIds: selectedIdsForExport,
          },
          currentFilters ?? createDefaultIndividualFilters(),
          selectedColumnKeys,
          scope === "full_list" ? exportTotalCount : undefined
        );
      } catch (exportError) {
        console.error("Individual export failed:", exportError);
      } finally {
        exportInFlightRef.current = false;
        setExporting(false);
      }
    },
    [
      currentFilters,
      pagination.itemsTotal,
      selectedColumnKeys,
      selectedIdList,
    ]
  );

  const handleSelectedListExport = useCallback(
    (mode: ListExportMode) =>
      handleListExport({ mode, scope: "selected" }),
    [handleListExport]
  );

  const handleExportRequest = useCallback(
    async (request: ListExportRequest) => {
      await handleListExport(request);
    },
    [handleListExport]
  );

  useEffect(() => {
    onExportingChange?.(exporting);
  }, [exporting, onExportingChange]);

  useEffect(() => {
    onRegisterExportCSV?.(handleExportRequest);
  }, [handleExportRequest, onRegisterExportCSV]);

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
          exporting={exporting}
          onExport={handleSelectedListExport}
          exportSingleMode="all_columns"
        />
      )}
      <div
        className="company-table-scroll"
        style={{
          position: "relative",
          opacity: loading && individuals.length > 0 ? 0.55 : 1,
          transition: "opacity 0.15s ease",
        }}
      >
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
                const { active: isActive, dir: sortDir } =
                  getColumnSortIndicator(column.key);
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
                          ? sortDir === "asc"
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
                        {sortDir === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {displayIndividuals.length === 0 ? (
              <tr>
                <td colSpan={selectedColumns.length + (selectionEnabled ? 1 : 0)}>
                  No individuals found.
                </td>
              </tr>
            ) : (
              displayIndividuals.map((individual, index) => {
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

      <SearchTablePagination
        curPage={pagination.curPage}
        pageTotal={pagination.pageTotal}
        nextPage={pagination.nextPage}
        onPageChange={handlePageChange}
        disabled={loading}
      />
      {columnsModalLayer}
      <style dangerouslySetInnerHTML={{ __html: SEARCH_TABLE_STYLES }} />
    </div>
  );
};
