"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/Footer";
import { useAuth } from "@/components/providers/AuthProvider";
import { usePlatformCurrency } from "@/components/providers/PlatformCurrencyProvider";
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
import type { ListExportRequest } from "@/lib/listExport/types";

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
    itemsTotal: 0,
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
            itemsTotal: data.itemsTotal,
            itemTotal: data.itemsTotal,
          });
          if (
            page === 1 &&
            filtersToUse.deal_types.length === 0 &&
            data.itemsTotal > 0
          ) {
            setSummaryStats((current) => ({
              ...current,
              totalCount:
                current.totalCount > 0 ? current.totalCount : data.itemsTotal,
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
  const { currencyId: preferredCurrencyId } = usePlatformCurrency();
  const preferredCurrencyReadyRef = useRef(false);
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
  const exportCSVRef = useRef<
    ((request: ListExportRequest) => Promise<void>) | null
  >(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setInitialSearch(params.get("search") || undefined);
  }, []);

  // "Advised by" deep link (e.g. from the advisor People card Deals count).
  const advisedByClearedRef = useRef(false);
  const [advisedBy, setAdvisedBy] = useState<{ name: string } | null>(null);

  const readAdvisedByFromUrl = useCallback(() => {
    if (advisedByClearedRef.current || typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const individualId = Number(params.get("advised_by_individual_id"));
    if (!Number.isFinite(individualId) || individualId <= 0) return null;
    const companyId = Number(params.get("advised_by_company_id"));
    return {
      individualId,
      companyId: Number.isFinite(companyId) && companyId > 0 ? companyId : undefined,
      name: params.get("advised_by_name") || `Individual ${individualId}`,
    };
  }, []);

  useEffect(() => {
    const active = readAdvisedByFromUrl();
    setAdvisedBy(active ? { name: active.name } : null);
  }, [readAdvisedByFromUrl]);

  const withAdvisedBy = useCallback(
    (filters: Filters): Filters => {
      const active = readAdvisedByFromUrl();
      if (!active) {
        const {
          advised_by_individual_id: _i,
          advised_by_company_id: _c,
          ...rest
        } = filters;
        void _i;
        void _c;
        return rest as Filters;
      }
      return {
        ...filters,
        advised_by_individual_id: active.individualId,
        advised_by_company_id: active.companyId,
      };
    },
    [readAdvisedByFromUrl]
  );

  const handleSearch = useCallback(
    (
      listFilters: Filters,
      countsFilters: Filters,
      portfolioOnly?: boolean,
      refreshCounts: boolean = true
    ) => {
      setIsPortfolioOnlyFilter(Boolean(portfolioOnly));
      void fetchCorporateEvents(
        1,
        withAdvisedBy(listFilters),
        withAdvisedBy(countsFilters),
        refreshCounts
      );
    },
    [fetchCorporateEvents, withAdvisedBy]
  );

  const clearAdvisedBy = useCallback(() => {
    advisedByClearedRef.current = true;
    setAdvisedBy(null);
    const url = new URL(window.location.href);
    ["advised_by_individual_id", "advised_by_company_id", "advised_by_name"].forEach(
      (key) => url.searchParams.delete(key)
    );
    window.history.replaceState(null, "", url.toString());
    if (currentFilters) {
      const cleaned = withAdvisedBy(currentFilters);
      void fetchCorporateEvents(1, cleaned, cleaned);
    }
  }, [currentFilters, fetchCorporateEvents, withAdvisedBy]);

  useEffect(() => {
    if (!preferredCurrencyReadyRef.current) {
      preferredCurrencyReadyRef.current = true;
      return;
    }
    if (!currentFilters) return;
    void fetchCorporateEvents(1, currentFilters, currentFilters);
    // Only refetch when currency changes; currentFilters is read from the closure above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferredCurrencyId, fetchCorporateEvents]);

  const handleFilterColumnsChange = useCallback(
    ({
      filterIds,
      dealTabActive,
    }: {
      filterIds: string[];
      dealTabActive: boolean;
    }) => {
      setFilterPinnedColumnKeys(
        getColumnKeysForActiveFilters(filterIds, dealTabActive)
      );
    },
    []
  );

  return (
    <AppShell>
    <div className="min-h-screen">
      <CorporateEventsDashboard
        onSearch={handleSearch}
        onFilterColumnsChange={handleFilterColumnsChange}
        initialSearch={initialSearch}
        summaryStats={summaryStats}
        userId={userId}
        onColumnsClick={() => setShowColumnsModal((value) => !value)}
        onExport={(mode) =>
          exportCSVRef.current?.({ mode, scope: "full_list" })
        }
        exporting={exporting}
        columnsActive={showColumnsModal}
        columnsCount={columnsCount}
      />
      {advisedBy ? (
        <div style={{ padding: "0 24px 8px", fontSize: 12.5 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 10px",
              borderRadius: 999,
              background: "#eef5ff",
              color: "#0075df",
              fontWeight: 500,
            }}
          >
            Advised by {advisedBy.name}
            <button
              type="button"
              onClick={clearAdvisedBy}
              aria-label="Clear advised-by filter"
              style={{
                border: "none",
                background: "none",
                color: "inherit",
                cursor: "pointer",
                fontSize: 14,
                lineHeight: 1,
                padding: 0,
              }}
            >
              ×
            </button>
          </span>
        </div>
      ) : null}
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
        onExportingChange={setExporting}
        isPortfolioOnlyFilter={isPortfolioOnlyFilter}
      />
      <Footer />
    </div>
    </AppShell>
  );
}

export default function CorporateEventsPage() {
  return <CorporateEventsPageInner />;
}
