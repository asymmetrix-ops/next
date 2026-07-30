"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { CorporateEventsDashboard } from "@/components/corporate-events/CorporateEventsDashboard";
import {
  CorporateEventsSearchSection,
  type Filters,
} from "@/components/corporate-events/CorporateEventsSearchSection";
import {
  buildCorporateEventsCountsSearchPayload,
  buildCorporateEventsSearchPayload,
  createDefaultCorporateEventFilters,
} from "@/lib/corporateEventsFilterPayload";
import { getColumnKeysForActiveFilters } from "@/components/corporate-events/corporateEventsColumnFilterMap";
import {
  EMPTY_CORPORATE_EVENTS_SUMMARY_STATS,
  type CorporateEventsSummaryStats,
} from "@/components/corporate-events/corporateEventsFilterConfig";
import {
  fetchCorporateEventsCountsServer,
  fetchCorporateEventsServer,
  type CorporateEventListItem,
} from "@/app/corporate-events/actions";
import type { FilterBarState } from "@/components/companies/CompaniesFilterBar";
import type { ListExportRequest } from "@/lib/listExport/types";

export type ScopedCorporateEventsPanelProps = {
  primarySectorId: number;
  embedded?: boolean;
};

function useScopedCorporateEventsSearch(userId: number | null) {
  const [events, setEvents] = useState<CorporateEventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastRequestIdRef = useRef(0);
  const lastCountsRequestIdRef = useRef(0);
  const countsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentFiltersRef = useRef<Filters | undefined>(undefined);
  const currentCountsFiltersRef = useRef<Filters | undefined>(undefined);
  const [currentFilters, setCurrentFilters] = useState<Filters | undefined>(
    undefined
  );
  const [pagination, setPagination] = useState({
    itemsReceived: 0,
    curPage: 1,
    nextPage: null as number | null,
    prevPage: null as number | null,
    offset: 0,
    perPage: 50,
    pageTotal: 0,
    itemTotal: 0,
  });
  const [summaryStats, setSummaryStats] =
    useState<CorporateEventsSummaryStats>(EMPTY_CORPORATE_EVENTS_SUMMARY_STATS);

  const scheduleCountsFetch = useCallback(
    (countsFilters: Filters) => {
      if (countsTimeoutRef.current) clearTimeout(countsTimeoutRef.current);
      countsTimeoutRef.current = setTimeout(() => {
        const countsRequestId = ++lastCountsRequestIdRef.current;
        void fetchCorporateEventsCountsServer({
          ...countsFilters,
          user_id: userId,
          deal_types: [],
        })
          .then((countsData) => {
            if (
              countsRequestId !== lastCountsRequestIdRef.current ||
              !countsData
            ) {
              return;
            }
            setSummaryStats((current) => ({
              ...countsData,
              totalCount:
                countsData.totalCount > 0
                  ? countsData.totalCount
                  : current.totalCount,
            }));
          })
          .catch((countsError) => {
            console.error("Error fetching corporate event counts:", countsError);
          });
      }, 400);
    },
    [userId]
  );

  const fetchCorporateEvents = useCallback(
    async (
      page: number = 1,
      filters?: Filters,
      countsFilters?: Filters,
      refreshCounts: boolean = true
    ) => {
      const requestId = ++lastRequestIdRef.current;
      setLoading(true);
      setError(null);

      if (filters !== undefined) {
        currentFiltersRef.current = filters;
        setCurrentFilters(filters);
      }
      if (countsFilters !== undefined) {
        currentCountsFiltersRef.current = countsFilters;
      }

      const filtersToUse =
        filters !== undefined
          ? filters
          : currentFiltersRef.current ?? createDefaultCorporateEventFilters();
      const countsFiltersToUse =
        countsFilters ??
        currentCountsFiltersRef.current ??
        filtersToUse;
      const resolvedFilters: Filters = {
        ...filtersToUse,
        user_id: userId,
        Page: page,
      };

      try {
        if (page === 1 && refreshCounts) {
          scheduleCountsFetch({
            ...countsFiltersToUse,
            user_id: userId,
            deal_types: [],
          });
        }

        const data = await fetchCorporateEventsServer(page, resolvedFilters);

        if (!data) {
          throw new Error(
            "Failed to fetch corporate events - authentication required"
          );
        }

        if (requestId === lastRequestIdRef.current) {
          setEvents(data.items);
          setPagination({
            itemsReceived: data.itemsReceived,
            curPage: data.curPage,
            nextPage: data.nextPage,
            prevPage: data.prevPage,
            offset: data.offset,
            perPage: data.perPage,
            pageTotal: data.pageTotal,
            itemTotal: data.itemTotal,
          });
        }
      } catch (err) {
        if (requestId === lastRequestIdRef.current) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to fetch corporate events"
          );
        }
        console.error("Error fetching corporate events:", err);
      } finally {
        if (requestId === lastRequestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [userId, scheduleCountsFetch]
  );

  return {
    events,
    loading,
    error,
    pagination,
    summaryStats,
    fetchCorporateEvents,
    currentFilters,
  };
}

export function ScopedCorporateEventsPanel({
  primarySectorId,
  embedded = true,
}: ScopedCorporateEventsPanelProps) {
  const { user } = useAuth();
  const userId =
    user?.id != null && Number.isFinite(Number.parseInt(String(user.id), 10))
      ? Number.parseInt(String(user.id), 10)
      : null;

  const {
    events,
    loading,
    error,
    pagination,
    summaryStats,
    fetchCorporateEvents,
    currentFilters,
  } = useScopedCorporateEventsSearch(userId);

  const scopedPrimarySectorIds = useMemo(
    () => [primarySectorId],
    [primarySectorId]
  );

  const [isPortfolioOnlyFilter, setIsPortfolioOnlyFilter] = useState(false);
  const [filterPinnedColumnKeys, setFilterPinnedColumnKeys] = useState<string[]>(
    []
  );
  const exportCSVRef = useRef<
    ((request: ListExportRequest) => Promise<void>) | null
  >(null);
  const [exporting, setExporting] = useState(false);

  const emptyFilterState = useMemo<FilterBarState>(
    () => ({
      filters: [],
      viewId: null,
      searchText: "",
      filterLogic: "and",
    }),
    []
  );

  const buildScopedFilters = useCallback((): Filters => {
    return buildCorporateEventsSearchPayload({
      state: emptyFilterState,
      primarySectors: [],
      secondarySectors: [],
      userId,
      scopedPrimarySectorIds,
    });
  }, [emptyFilterState, userId, scopedPrimarySectorIds]);

  const buildScopedCountsFilters = useCallback((): Filters => {
    return buildCorporateEventsCountsSearchPayload({
      state: emptyFilterState,
      primarySectors: [],
      secondarySectors: [],
      userId,
      scopedPrimarySectorIds,
    });
  }, [emptyFilterState, userId, scopedPrimarySectorIds]);

  useEffect(() => {
    const listFilters = buildScopedFilters();
    const countsFilters = buildScopedCountsFilters();
    fetchCorporateEvents(1, listFilters, countsFilters);
  }, [
    buildScopedFilters,
    buildScopedCountsFilters,
    fetchCorporateEvents,
    primarySectorId,
    userId,
  ]);

  const handleSearch = useCallback(
    (
      listFilters: Filters,
      countsFilters: Filters,
      portfolioOnly?: boolean,
      refreshCounts: boolean = true
    ) => {
      setIsPortfolioOnlyFilter(Boolean(portfolioOnly));
      void fetchCorporateEvents(1, listFilters, countsFilters, refreshCounts);
    },
    [fetchCorporateEvents]
  );

  const handleFilterColumnsChange = useCallback(
    ({ filterIds }: { filterIds: string[] }) => {
      setFilterPinnedColumnKeys(getColumnKeysForActiveFilters(filterIds));
    },
    []
  );

  return (
    <div
      className={
        embedded
          ? "overflow-hidden bg-white rounded-xl border shadow-lg border-slate-200/60"
          : "min-h-screen"
      }
    >
      <div className={embedded ? "px-5" : undefined}>
        <CorporateEventsDashboard
          onSearch={handleSearch}
          onFilterColumnsChange={handleFilterColumnsChange}
          summaryStats={summaryStats}
          userId={userId}
          hidePageHeader={embedded}
          embedded={embedded}
          onExport={(mode) =>
            exportCSVRef.current?.({ mode, scope: "full_list" })
          }
          exporting={exporting}
          excludeFilterIds={["primary_sector"]}
          scopedPrimarySectorIds={scopedPrimarySectorIds}
          matchCountOverride={pagination.itemTotal}
        />
        <CorporateEventsSearchSection
          events={events}
          loading={loading}
          error={error}
          pagination={pagination}
          fetchCorporateEvents={fetchCorporateEvents}
          currentFilters={currentFilters}
          filterPinnedColumnKeys={filterPinnedColumnKeys}
          isPortfolioOnlyFilter={isPortfolioOnlyFilter}
          enableColumnControl={false}
          embedded={embedded}
          onRegisterExportCSV={(fn) => {
            exportCSVRef.current = fn;
          }}
          onExportingChange={setExporting}
        />
      </div>
    </div>
  );
}
