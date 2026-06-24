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
import { fetchCorporateEventsServer } from "./actions";
import type { CorporateEventListItem } from "./actions";

const useCorporateEventsAPI = (userId: number | null) => {
  const [events, setEvents] = useState<CorporateEventListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastRequestIdRef = useRef(0);
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

  const fetchCorporateEvents = useCallback(
    async (page: number = 1, filters?: Filters, countsFilters?: Filters) => {
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
      const resolvedFilters: Filters = {
        ...filtersToUse,
        user_id: userId,
        Page: page,
      };

      try {
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
          setSummaryStats(data.summaryStats);
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
    [userId]
  );

  useEffect(() => {
    fetchCorporateEvents(1, createDefaultCorporateEventFilters());
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
    (listFilters: Filters, countsFilters: Filters, portfolioOnly?: boolean) => {
      setIsPortfolioOnlyFilter(Boolean(portfolioOnly));
      void fetchCorporateEvents(1, listFilters, countsFilters);
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
