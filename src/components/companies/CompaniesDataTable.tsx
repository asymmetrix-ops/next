"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  ALL_COMPANY_COLUMNS,
  type CompanyColumnDefinition,
  type CompanyRow,
} from "./companyColumnDefinitions";
import { COMPANY_TABLE_STYLES } from "./companyTableStyles";
import {
  CANONICAL_COMPANY_COLUMN_KEYS,
  DEFAULT_VISIBLE_COMPANY_COLUMN_KEYS,
  FROZEN_COLUMN_KEYS,
  PROD_DEFAULT_COMPANY_COLUMN_KEYS,
  columnKeysToVisibility,
  enforceColumnKeyOrder,
  getEffectiveFrozenColumnKeys,
  reorderColumnKeys,
  visibilityToColumnKeys,
} from "./companiesColumnCategories";
import { FILTER_PINNED_TOOLTIP } from "./companiesColumnFilterMap";
import {
  getApiColumnsForSelectedKeys,
  getApiColumnsSignature,
} from "./companiesApiColumns";
import {
  compareSortValues,
  getApiSortColumn,
  getColumnSortKind,
  getSortValueForColumn,
} from "./companiesTableSort";

const ColumnsControlRoom = dynamic(
  () =>
    import("./ColumnsControlRoom").then((m) => ({
      default: m.ColumnsControlRoom,
    })),
  { ssr: false }
);

const ALL_COMPANY_COLUMN_KEYS = CANONICAL_COMPANY_COLUMN_KEYS;

const getValidColumnKeys = (
  keys: string[],
  filterPinnedKeys: string[] = []
): string[] => {
  const seen = new Set<string>();
  const valid: string[] = [];
  keys.forEach((key) => {
    const normalizedKey = key === "country" ? "hq" : key;
    if (ALL_COMPANY_COLUMN_KEYS.includes(normalizedKey) && !seen.has(normalizedKey)) {
      seen.add(normalizedKey);
      valid.push(normalizedKey);
    }
  });
  return enforceColumnKeyOrder(
    valid.length > 0 ? valid : [...PROD_DEFAULT_COMPANY_COLUMN_KEYS],
    filterPinnedKeys
  );
};

export type CompaniesSortChangePayload = Pick<
  import("@/lib/filterBuilder").CompanySearchPayload,
  "sort_column" | "sort_direction"
>;

export type CompaniesDataTableProps = {
  companies: CompanyRow[];
  loading?: boolean;
  error?: string | null;
  columnStorageKey: string;
  defaultColumnKeys?: readonly string[];
  filterPinnedColumnKeys?: string[];
  onApiColumnsChange: (apiColumns: string[]) => void;
  onRefetch?: () => void;
  onSortChange?: (payload: CompaniesSortChangePayload) => void;
  syncSortFromFilters?: CompaniesSortChangePayload;
  externalShowColumnsModal?: boolean;
  externalSetShowColumnsModal?: (open: boolean) => void;
  onColumnsCountChange?: (count: number) => void;
  hideSelection?: boolean;
  emptyMessage?: string;
};

export function CompaniesDataTable({
  companies,
  loading = false,
  error = null,
  columnStorageKey,
  defaultColumnKeys = DEFAULT_VISIBLE_COMPANY_COLUMN_KEYS,
  filterPinnedColumnKeys = [],
  onApiColumnsChange,
  onRefetch,
  onSortChange,
  syncSortFromFilters,
  externalShowColumnsModal,
  externalSetShowColumnsModal,
  onColumnsCountChange,
  hideSelection = false,
  emptyMessage = "No companies found.",
}: CompaniesDataTableProps) {
  const router = useRouter();
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const apiColumnsSigRef = useRef<string | null>(null);
  const prevSelectedColumnKeysRef = useRef<string[]>([]);

  const [internalShowColumnsModal, setInternalShowColumnsModal] = useState(false);
  const showColumnsModal =
    externalShowColumnsModal !== undefined
      ? externalShowColumnsModal
      : internalShowColumnsModal;
  const setShowColumnsModal =
    externalSetShowColumnsModal ?? setInternalShowColumnsModal;

  const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[]>(() => {
    if (typeof window === "undefined") return [...defaultColumnKeys];
    try {
      const saved = window.localStorage.getItem(columnStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as unknown;
        if (Array.isArray(parsed)) {
          const valid = getValidColumnKeys(
            parsed.filter((k): k is string => typeof k === "string"),
            filterPinnedColumnKeys
          );
          if (valid.length > 0) return valid;
        }
      }
    } catch {
      // ignore
    }
    return getValidColumnKeys([...defaultColumnKeys], filterPinnedColumnKeys);
  });

  const [sortState, setSortState] = useState<{
    key: string;
    dir: "asc" | "desc";
  } | null>(null);
  const [headerDragKey, setHeaderDragKey] = useState<string | null>(null);
  const [headerDragOverKey, setHeaderDragOverKey] = useState<string | null>(
    null
  );
  const headerDidDragRef = useRef(false);
  const [loadingColumnKeys, setLoadingColumnKeys] = useState<Set<string>>(
    () => new Set()
  );

  useEffect(() => {
    if (filterPinnedColumnKeys.length === 0) return;
    setSelectedColumnKeys((current) => {
      const merged = enforceColumnKeyOrder(
        Array.from(new Set([...current, ...filterPinnedColumnKeys])),
        filterPinnedColumnKeys
      );
      if (
        merged.length === current.length &&
        merged.every((key, index) => key === current[index])
      ) {
        return current;
      }
      return merged;
    });
  }, [filterPinnedColumnKeys]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        columnStorageKey,
        JSON.stringify(selectedColumnKeys)
      );
    } catch (saveError) {
      console.warn("Unable to save column preferences:", saveError);
    }
  }, [columnStorageKey, selectedColumnKeys]);

  useEffect(() => {
    const apiColumns = getApiColumnsForSelectedKeys(selectedColumnKeys);
    onApiColumnsChange(apiColumns);

    const sig = getApiColumnsSignature(selectedColumnKeys);
    if (apiColumnsSigRef.current === sig) return;

    const isInitial = apiColumnsSigRef.current === null;
    if (!isInitial) {
      const prevKeys = new Set(prevSelectedColumnKeysRef.current);
      const addedKeys = selectedColumnKeys.filter(
        (key) => !prevKeys.has(key) && key !== "logo" && key !== "name"
      );
      if (addedKeys.length > 0) {
        setLoadingColumnKeys(new Set(addedKeys));
      }
      onRefetch?.();
    }

    prevSelectedColumnKeysRef.current = selectedColumnKeys;
    apiColumnsSigRef.current = sig;
  }, [selectedColumnKeys, onApiColumnsChange, onRefetch]);

  useEffect(() => {
    if (!loading) {
      setLoadingColumnKeys(new Set());
    }
  }, [loading]);

  useEffect(() => {
    if (syncSortFromFilters?.sort_column) return;
    if (sortState && getApiSortColumn(sortState.key)) {
      setSortState(null);
    }
  }, [
    syncSortFromFilters?.sort_column,
    syncSortFromFilters?.sort_direction,
    sortState,
  ]);

  useEffect(() => {
    if (sortState && !selectedColumnKeys.includes(sortState.key)) {
      setSortState(null);
      onSortChange?.({ sort_column: null, sort_direction: null });
    }
  }, [selectedColumnKeys, sortState, onSortChange]);

  useEffect(() => {
    onColumnsCountChange?.(selectedColumnKeys.length);
  }, [selectedColumnKeys.length, onColumnsCountChange]);

  const selectedColumns = useMemo(() => {
    const columnsByKey = new Map(
      ALL_COMPANY_COLUMNS.map((column) => [column.key, column])
    );
    return getValidColumnKeys(selectedColumnKeys, filterPinnedColumnKeys)
      .map((key) => columnsByKey.get(key))
      .filter((column): column is CompanyColumnDefinition => Boolean(column));
  }, [selectedColumnKeys, filterPinnedColumnKeys]);

  const columnVisibilityInitial = useMemo(
    () => columnKeysToVisibility(selectedColumnKeys),
    [selectedColumnKeys]
  );

  const handleApplyColumnVisibility = useCallback(
    (visible: Record<string, boolean>, order?: string[]) => {
      if (order && order.length > 0) {
        setSelectedColumnKeys(getValidColumnKeys(order, filterPinnedColumnKeys));
      } else {
        setSelectedColumnKeys((current) =>
          getValidColumnKeys(
            visibilityToColumnKeys(visible, current),
            filterPinnedColumnKeys
          )
        );
      }
      setShowColumnsModal(false);
    },
    [filterPinnedColumnKeys, setShowColumnsModal]
  );

  const handleReorderTableColumns = useCallback(
    (dragKey: string, dropKey: string) => {
      setSelectedColumnKeys((current) =>
        getValidColumnKeys(
          reorderColumnKeys(current, dragKey, dropKey, filterPinnedColumnKeys),
          filterPinnedColumnKeys
        )
      );
    },
    [filterPinnedColumnKeys]
  );

  const handleSortColumn = useCallback(
    (columnKey: string) => {
      if (!getColumnSortKind(columnKey)) return;
      setSortState((current) => {
        const next =
          current?.key === columnKey
            ? {
                key: columnKey,
                dir: current.dir === "asc" ? ("desc" as const) : ("asc" as const),
              }
            : { key: columnKey, dir: "asc" as const };
        const apiColumn = getApiSortColumn(columnKey);
        if (apiColumn) {
          onSortChange?.({
            sort_column: apiColumn,
            sort_direction: next.dir,
          });
        }
        return next;
      });
    },
    [onSortChange]
  );

  const sortedCompanies = useMemo(() => {
    if (
      (sortState && getApiSortColumn(sortState.key)) ||
      !sortState ||
      !getColumnSortKind(sortState.key)
    ) {
      return companies;
    }
    const { key, dir } = sortState;
    return [...companies].sort((companyA, companyB) => {
      const rowA = companyA as unknown as Record<string, unknown>;
      const rowB = companyB as unknown as Record<string, unknown>;
      return compareSortValues(
        getSortValueForColumn(rowA, key),
        getSortValueForColumn(rowB, key),
        dir
      );
    });
  }, [companies, sortState]);

  const frozenColumnKeys = useMemo(
    () => getEffectiveFrozenColumnKeys(filterPinnedColumnKeys),
    [filterPinnedColumnKeys]
  );

  const stickyColumnOffsets = useMemo(() => {
    const offsets = new Map<string, number>();
    let left = hideSelection ? 0 : 44;
    for (const key of frozenColumnKeys) {
      offsets.set(key, left);
      const col = ALL_COMPANY_COLUMNS.find((c) => c.key === key);
      left += col?.minWidth ?? (key === "logo" ? 88 : 120);
    }
    return offsets;
  }, [frozenColumnKeys, hideSelection]);

  const getStickyColumnStyle = useCallback(
    (
      columnKey: string,
      minWidth?: number,
      header = false
    ): React.CSSProperties | undefined => {
      const left = stickyColumnOffsets.get(columnKey);
      if (left == null) return undefined;
      return {
        position: "sticky",
        left,
        zIndex: header ? 7 : 3,
        minWidth,
        background: header ? "#f9fafb" : "#fff",
        boxShadow: "2px 0 4px rgba(15, 23, 42, 0.06)",
      };
    },
    [stickyColumnOffsets]
  );

  const isFrozenColumnKey = (key: string) => frozenColumnKeys.includes(key);

  const isFilterPinnedColumnKey = (key: string) =>
    filterPinnedColumnKeys.includes(key) &&
    !(FROZEN_COLUMN_KEYS as readonly string[]).includes(key);

  const getTableColumnClassName = (
    column: CompanyColumnDefinition,
    extra?: string | (string | undefined)[]
  ): string | undefined => {
    const extras = extra == null ? [] : Array.isArray(extra) ? extra : [extra];
    const classes = [
      ...extras,
      column.wrap ? "company-table-cell-wrap" : undefined,
      isFrozenColumnKey(column.key) ? "company-table-sticky-frozen" : undefined,
      column.key === "logo" ? "company-table-sticky-logo" : undefined,
      column.key === "follow" ? "company-table-col-follow" : undefined,
    ].filter(Boolean);
    return classes.length > 0 ? classes.join(" ") : undefined;
  };

  const handleCompanyClick = useCallback(
    (companyId: number) => {
      router.push(`/company/${companyId}`);
    },
    [router]
  );

  const columnsModalLayer = [
    showColumnsModal && (
      <div
        key="columns-backdrop"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 199,
          cursor: "default",
        }}
        onClick={() => setShowColumnsModal(false)}
        aria-hidden
      />
    ),
    showColumnsModal && (
      <ColumnsControlRoom
        key="columns-panel"
        initial={columnVisibilityInitial}
        initialOrder={selectedColumnKeys}
        filterPinnedColumnKeys={filterPinnedColumnKeys}
        onCancel={() => setShowColumnsModal(false)}
        onApply={handleApplyColumnVisibility}
      />
    ),
  ];

  if (error) {
    return (
      <div className="company-section" ref={sectionRef}>
        <div className="py-4 text-center text-red-600">{error}</div>
        {columnsModalLayer}
        <style dangerouslySetInnerHTML={{ __html: COMPANY_TABLE_STYLES }} />
      </div>
    );
  }

  if (loading && companies.length === 0) {
    return (
      <div className="company-section" ref={sectionRef}>
        <div className="py-10 text-center text-slate-500">Loading companies...</div>
        {columnsModalLayer}
        <style dangerouslySetInnerHTML={{ __html: COMPANY_TABLE_STYLES }} />
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="company-section" ref={sectionRef}>
        <div className="py-10 text-center text-slate-500">{emptyMessage}</div>
        {columnsModalLayer}
        <style dangerouslySetInnerHTML={{ __html: COMPANY_TABLE_STYLES }} />
      </div>
    );
  }

  return (
    <div className="company-section" ref={sectionRef}>
      {columnsModalLayer}
      <div className="company-table-scroll" ref={tableScrollRef}>
        <table className="company-table">
          <thead>
            <tr>
              {!hideSelection && (
                <th
                  style={{ minWidth: 44, width: 44, textAlign: "center" }}
                  aria-hidden
                />
              )}
              {selectedColumns.map((column) => {
                const sortKind = getColumnSortKind(column.key);
                const isActive = sortState?.key === column.key;
                const isDraggable = !isFrozenColumnKey(column.key);
                const isDragging = headerDragKey === column.key;
                const isDragOver =
                  headerDragOverKey === column.key &&
                  headerDragKey !== column.key;
                return (
                  <th
                    key={column.key}
                    className={getTableColumnClassName(column, [
                      sortKind ? "company-table-th-sortable" : undefined,
                      isDraggable ? "company-table-th-draggable" : undefined,
                      isDragging ? "company-table-th-dragging" : undefined,
                      isDragOver ? "company-table-th-drag-over" : undefined,
                    ])}
                    style={{
                      minWidth: column.minWidth,
                      ...getStickyColumnStyle(column.key, column.minWidth, true),
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
                        event.dataTransfer.getData("text/plain") ||
                        headerDragKey;
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
                    {column.label}
                    {loadingColumnKeys.has(column.key) && (
                      <span
                        style={{
                          display: "inline-block",
                          marginLeft: 6,
                          width: 36,
                          height: 10,
                          background: "#e2e8f0",
                          borderRadius: 4,
                          verticalAlign: "middle",
                        }}
                        aria-hidden
                      />
                    )}
                    {isFilterPinnedColumnKey(column.key) && (
                      <span
                        title={FILTER_PINNED_TOOLTIP}
                        aria-label={FILTER_PINNED_TOOLTIP}
                        style={{ marginLeft: 4, color: "#64748b" }}
                      >
                        *
                      </span>
                    )}
                    {sortKind && (
                      <span className="company-table-sort-indicator">
                        {isActive
                          ? sortState?.dir === "asc"
                            ? " ▲"
                            : " ▼"
                          : " ⇅"}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedCompanies.map((company, index) => (
              <tr key={company.id ?? index}>
                {!hideSelection && <td />}
                {selectedColumns.map((column) => (
                  <td
                    key={column.key}
                    className={getTableColumnClassName(column)}
                    style={getStickyColumnStyle(column.key, column.minWidth)}
                  >
                    {column.render(company, {
                      index,
                      onCompanyClick: handleCompanyClick,
                    })}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style dangerouslySetInnerHTML={{ __html: COMPANY_TABLE_STYLES }} />
    </div>
  );
}

export { ALL_COMPANY_COLUMN_KEYS };
