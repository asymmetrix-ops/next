"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/components/providers/AuthProvider";
import { CorporateEventsDashboard } from "@/components/corporate-events/CorporateEventsDashboard";
import {
  CorporateEventsSearchSection,
  type Filters,
} from "@/components/corporate-events/CorporateEventsSearchSection";
import { createDefaultCorporateEventFilters } from "@/lib/corporateEventsFilterPayload";
import { DEFAULT_VISIBLE_CORPORATE_EVENT_COLUMN_KEYS } from "@/components/corporate-events/corporateEventsColumnCategories";
import { getColumnKeysForActiveFilters } from "@/components/corporate-events/corporateEventsColumnFilterMap";
import {
  EMPTY_CORPORATE_EVENTS_SUMMARY_STATS,
  type CorporateEventsSummaryStats,
} from "@/components/corporate-events/corporateEventsFilterConfig";
import { fetchCorporateEventsServer, fetchCorporateEventsCountsServer } from "./actions";
import type { CorporateEventListItem } from "./actions";

const useCorporateEventsAPI = (userId: number | null) => {
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

  const scheduleCountsFetch = useCallback((countsFilters: Filters) => {
    if (countsTimeoutRef.current) clearTimeout(countsTimeoutRef.current);
    countsTimeoutRef.current = setTimeout(() => {
      const countsRequestId = ++lastCountsRequestIdRef.current;
      void fetchCorporateEventsCountsServer({
        ...countsFilters,
        user_id: userId,
        deal_types: [],
      })
        .then((countsData) => {
          if (countsRequestId !== lastCountsRequestIdRef.current || !countsData) {
            return;
          }
          setSummaryStats((current) => ({
            ...countsData,
            totalCount:
              countsData.totalCount > 0 ? countsData.totalCount : current.totalCount,
          }));
        })
        .catch((countsError) => {
          console.error("Error fetching corporate event counts:", countsError);
        });
    }, 400);
  }, [userId]);

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
          if (
            page === 1 &&
            filtersToUse.deal_types.length === 0 &&
            data.itemTotal > 0
          ) {
            setSummaryStats((current) => ({
              ...current,
              totalCount:
                current.totalCount > 0 ? current.totalCount : data.itemTotal,
            }));
          }
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

  useEffect(() => {
    const defaults = createDefaultCorporateEventFilters();
    fetchCorporateEvents(1, defaults, defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return {
    events,
    loading,
    error,
    pagination,
    summaryStats,
    fetchCorporateEvents,
    currentFilters,
  };
};

function CorporateEventsPageInner() {
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
  } = useCorporateEventsAPI(userId);

  const [isPortfolioOnlyFilter, setIsPortfolioOnlyFilter] = useState(false);
  const [filterPinnedColumnKeys, setFilterPinnedColumnKeys] = useState<string[]>(
    []
  );
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [columnsCount, setColumnsCount] = useState(
    DEFAULT_VISIBLE_CORPORATE_EVENT_COLUMN_KEYS.length
  );
  const [initialSearch, setInitialSearch] = useState<string | undefined>(
    undefined
  );
  const exportCSVRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setInitialSearch(params.get("search") || undefined);
  }, []);

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
    <div className="min-h-screen">
      <Header />
      <CorporateEventsDashboard
        onSearch={handleSearch}
        onFilterColumnsChange={handleFilterColumnsChange}
        initialSearch={initialSearch}
        summaryStats={summaryStats}
        userId={userId}
        onColumnsClick={() => setShowColumnsModal((value) => !value)}
        onExportCSVClick={() => exportCSVRef.current?.()}
        columnsActive={showColumnsModal}
        columnsCount={columnsCount}
      />
      <CorporateEventsSearchSection
        events={events}
        loading={loading}
        error={error}
        pagination={pagination}
        fetchCorporateEvents={fetchCorporateEvents}
        currentFilters={currentFilters}
        filterPinnedColumnKeys={filterPinnedColumnKeys}
        externalShowColumnsModal={showColumnsModal}
        externalSetShowColumnsModal={setShowColumnsModal}
        onColumnsCountChange={setColumnsCount}
        onRegisterExportCSV={(fn) => {
          exportCSVRef.current = fn;
        }}
        isPortfolioOnlyFilter={isPortfolioOnlyFilter}
      />
      <Footer />
    </div>
  );
}

export default function CorporateEventsPage() {
  return <CorporateEventsPageInner />;
}
