"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CompaniesFilterBar,
  type FilterBarState,
} from "@/components/companies/CompaniesFilterBar";
import { ColumnsControlRoom } from "@/components/companies/ColumnsControlRoom";
import { SearchColumnsButton } from "@/components/search/SearchColumnsButton";
import { SearchExportMenu } from "@/components/search/SearchExportMenu";
import { EXPORT_ALL_ENTITIES_CAP, type ListExportMode } from "@/lib/listExport/types";
import { exportTransactionCompsList } from "@/lib/listExport/transactionCompsListExport";
import { locationsService } from "@/lib/locationsService";
import { BulkPortfolioActionToolbar } from "@/components/search/BulkPortfolioActionToolbar";
import { SearchTablePagination } from "@/components/search/SearchTablePagination";
import {
  fetchTransactionCompsOptionsServer,
  fetchTransactionCompsServer,
} from "@/app/transaction-comps/actions";
import {
  SEARCH_DASHBOARD_ACTIONS,
  SEARCH_DASHBOARD_FILTER_INNER,
  SEARCH_DASHBOARD_FILTER_SHELL,
  SEARCH_DASHBOARD_HEADER_ROW,
  SEARCH_DASHBOARD_INNER,
  SEARCH_DASHBOARD_SHELL,
  SEARCH_DASHBOARD_TITLE,
} from "@/components/search/searchDashboardLayout";
import {
  ALL_TRANSACTION_COMPS_COLUMN_KEYS,
  DEFAULT_TRANSACTION_COMPS_COLUMN_KEYS,
  TRANSACTION_COMPS_COLUMNS_STORAGE_KEY,
  TRANSACTION_COMPS_COLUMN_CATEGORIES,
  normalizeTransactionCompsColumnKeys,
  transactionCompsKeysToVisibility,
  transactionCompsVisibilityToKeys,
} from "./transactionCompsColumns";
import {
  TRANSACTION_COMPS_FILTER_CATEGORIES,
  buildTransactionCompsFilterDefs,
  filterStateToQuery,
  type TransactionCompsFilterOptions,
} from "./transactionCompsFilterConfig";
import { TransactionCompsTable } from "./TransactionCompsTable";
import {
  DEFAULT_TRANSACTION_COMPS_QUERY,
  type TransactionCompRow,
} from "./transactionCompsTypes";

const EMPTY_FILTER_STATE: FilterBarState = {
  filters: [],
  viewId: null,
  searchText: "",
  filterLogic: "and",
};

const SUB_TABS = [
  { id: "list", label: "List view", soon: false },
  { id: "comp_set", label: "Comp Set", soon: true },
  { id: "comp_identifier", label: "Comp identifier", soon: true },
];

const PER_PAGE = DEFAULT_TRANSACTION_COMPS_QUERY.perPage;

export function TransactionCompsView() {
  const [filterState, setFilterState] = useState<FilterBarState>(EMPTY_FILTER_STATE);
  const [options, setOptions] = useState<TransactionCompsFilterOptions>({
    sectors: [],
    secondarySectors: [],
    ownershipTypes: [],
    countries: [],
    acquirers: [],
    corporateEvents: [],
  });

  const [rows, setRows] = useState<TransactionCompRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("deal_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [columnKeys, setColumnKeys] = useState<string[]>(DEFAULT_TRANSACTION_COMPS_COLUMN_KEYS);
  const [columnPrefsLoaded, setColumnPrefsLoaded] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [exporting, setExporting] = useState(false);
  const requestIdRef = useRef(0);

  // Column prefs persist across sessions.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(TRANSACTION_COMPS_COLUMNS_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : null;
      if (Array.isArray(parsed)) {
        setColumnKeys(
          normalizeTransactionCompsColumnKeys(
            parsed.filter((k): k is string => typeof k === "string")
          )
        );
      }
    } catch {
      /* fall back to defaults */
    }
    setColumnPrefsLoaded(true);
  }, []);

  useEffect(() => {
    if (!columnPrefsLoaded) return;
    try {
      window.localStorage.setItem(TRANSACTION_COMPS_COLUMNS_STORAGE_KEY, JSON.stringify(columnKeys));
    } catch {
      /* storage unavailable */
    }
  }, [columnKeys, columnPrefsLoaded]);

  useEffect(() => {
    Promise.allSettled([
      locationsService.getPrimarySectors(),
      locationsService.getAllSecondarySectors(),
      locationsService.getOwnershipTypes(),
      locationsService.getCountries(),
      fetchTransactionCompsOptionsServer("acquirer"),
      fetchTransactionCompsOptionsServer("corporate_event"),
    ]).then(([sectors, secondary, ownership, countries, acquirers, events]) => {
      setOptions({
        sectors: sectors.status === "fulfilled" ? sectors.value : [],
        secondarySectors: secondary.status === "fulfilled" ? secondary.value : [],
        ownershipTypes: ownership.status === "fulfilled" ? ownership.value : [],
        countries:
          countries.status === "fulfilled"
            ? countries.value.map((c) => c.locations_Country).filter(Boolean)
            : [],
        acquirers: acquirers.status === "fulfilled" ? acquirers.value : [],
        corporateEvents: events.status === "fulfilled" ? events.value : [],
      });
    });
  }, []);

  const filterDefs = useMemo(() => buildTransactionCompsFilterDefs(options), [options]);

  const buildQuery = useCallback(
    (pageNum: number, perPage = PER_PAGE) =>
      filterStateToQuery(filterState, options, { page: pageNum, perPage, sortBy, sortDir }),
    [filterState, options, sortBy, sortDir]
  );

  // Any filter/sort change returns to page 1.
  const queryKey = useMemo(
    () => JSON.stringify({ f: filterState.filters, s: filterState.searchText, sortBy, sortDir }),
    [filterState.filters, filterState.searchText, sortBy, sortDir]
  );
  const lastQueryKeyRef = useRef(queryKey);
  useEffect(() => {
    if (lastQueryKeyRef.current !== queryKey) {
      lastQueryKeyRef.current = queryKey;
      setPage(1);
    }
  }, [queryKey]);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    const timer = setTimeout(async () => {
      try {
        const data = await fetchTransactionCompsServer(buildQuery(page));
        if (requestId !== requestIdRef.current) return;
        if (!data) throw new Error("Failed to load transaction comps - authentication required");
        setRows(data.items);
        setTotal(data.total);
        setSelectedIds(new Set());
      } catch (e) {
        if (requestId === requestIdRef.current) {
          setError(e instanceof Error ? e.message : "Failed to load transaction comps");
        }
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, queryKey, options]);

  const handleSort = useCallback(
    (apiSortBy: string) => {
      if (apiSortBy === sortBy) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      else {
        setSortBy(apiSortBy);
        setSortDir("desc");
      }
    },
    [sortBy]
  );

  const toggleRow = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(
    (checked: boolean) =>
      setSelectedIds(checked ? new Set(rows.map((r) => r.company_id)) : new Set()),
    [rows]
  );

  const exportList = useCallback(
    async (mode: ListExportMode) => {
      setExporting(true);
      try {
        const source =
          selectedIds.size > 0
            ? rows.filter((r) => selectedIds.has(r.company_id))
            : (await fetchTransactionCompsServer(buildQuery(1, EXPORT_ALL_ENTITIES_CAP)))?.items ?? [];
        await exportTransactionCompsList(
          { mode, scope: selectedIds.size > 0 ? "selected" : "full_list" },
          source,
          columnKeys
        );
      } catch (e) {
        console.error("Transaction comps export failed:", e);
      } finally {
        setExporting(false);
      }
    },
    [buildQuery, columnKeys, rows, selectedIds]
  );

  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="bg-white">
      <div style={SEARCH_DASHBOARD_SHELL}>
        <div style={SEARCH_DASHBOARD_INNER}>
          <div style={SEARCH_DASHBOARD_HEADER_ROW}>
            <div>
              <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.09em] text-gray-400">
                Transaction Comps
              </div>
              <h1 style={SEARCH_DASHBOARD_TITLE}>Transaction Comps</h1>
            </div>
            <div style={SEARCH_DASHBOARD_ACTIONS}>
              <SearchColumnsButton
                active={showColumns}
                count={columnKeys.length}
                total={ALL_TRANSACTION_COMPS_COLUMN_KEYS.length}
                onClick={() => setShowColumns((v) => !v)}
              />
              <SearchExportMenu onExport={exportList} exporting={exporting} disabled={total === 0} />
            </div>
          </div>

          <div className="flex gap-1">
            {SUB_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                disabled={tab.soon}
                aria-current={tab.id === "list" ? "page" : undefined}
                title={tab.soon ? "Coming soon" : undefined}
                className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold ${
                  tab.id === "list"
                    ? "border-blue-600 text-blue-700"
                    : "cursor-not-allowed border-transparent text-gray-400"
                }`}
              >
                {tab.label}
                {tab.soon && (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                    Soon
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={SEARCH_DASHBOARD_FILTER_SHELL}>
        <div style={SEARCH_DASHBOARD_FILTER_INNER}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <CompaniesFilterBar
                filterDefs={filterDefs}
                filterCategories={TRANSACTION_COMPS_FILTER_CATEGORIES}
                state={filterState}
                onStateChange={setFilterState}
                totalCount={total}
                entityLabel="transactions"
              />
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="px-7 py-10 text-red-600">{error}</div>
      ) : (
        <div className="px-7 py-4">
          {selectedIds.size > 0 && (
            <BulkPortfolioActionToolbar
              entityType="company"
              exportOnly
              entityIds={Array.from(selectedIds)}
              onClearSelection={() => setSelectedIds(new Set())}
              exporting={exporting}
              onExport={exportList}
            />
          )}
          <TransactionCompsTable
            rows={rows}
            columnKeys={columnKeys}
            loading={loading}
            selectedIds={selectedIds}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
            onToggleRow={toggleRow}
            onToggleAll={toggleAll}
          />
          <SearchTablePagination
            curPage={page}
            pageTotal={pageCount}
            nextPage={page < pageCount ? page + 1 : null}
            onPageChange={(next) => {
              if (next >= 1 && next <= pageCount && next !== page && !loading) setPage(next);
            }}
            disabled={loading}
          />
        </div>
      )}

      {showColumns && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 199 }}
            onClick={() => setShowColumns(false)}
            aria-hidden="true"
          />
          <ColumnsControlRoom
            categories={TRANSACTION_COMPS_COLUMN_CATEGORIES}
            defaultVisibleColumnKeys={DEFAULT_TRANSACTION_COMPS_COLUMN_KEYS}
            initial={transactionCompsKeysToVisibility(columnKeys)}
            initialOrder={columnKeys}
            title="Columns"
            reorderHint="Drag rows to reorder. Company stays fixed as the first column."
            onCancel={() => setShowColumns(false)}
            onApply={(visible, order) => {
              setColumnKeys(transactionCompsVisibilityToKeys(visible, order ?? columnKeys));
              setShowColumns(false);
            }}
          />
        </>
      )}
    </div>
  );
}
