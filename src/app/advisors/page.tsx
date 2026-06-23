"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { AdvisorDashboard } from "@/components/advisors/AdvisorDashboard";
import {
  AdvisorSection,
  type Advisor,
  type Filters,
} from "@/components/advisors/AdvisorSection";
import { createDefaultAdvisorFilters } from "@/lib/advisorsFilterPayload";
import { DEFAULT_VISIBLE_ADVISOR_COLUMN_KEYS } from "@/components/advisors/advisorsColumnCategories";
import { getColumnKeysForActiveFilters } from "@/components/advisors/advisorsColumnFilterMap";
import {
  EMPTY_ADVISORS_ROLE_COUNTS,
  type AdvisorsRoleCounts,
} from "@/components/advisors/advisorsFilterConfig";
import {
  fetchAdvisorsServer,
  fetchAdvisorsCountsServer,
} from "./actions";

const useAdvisorsAPI = () => {
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastRequestIdRef = useRef(0);
  const lastCountsRequestIdRef = useRef(0);
  const countsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentFiltersRef = useRef<Filters | undefined>(undefined);
  const [currentFilters, setCurrentFilters] = useState<Filters | undefined>(
    undefined
  );
  const [pagination, setPagination] = useState({
    curPage: 1,
    nextPage: null as number | null,
    prevPage: null as number | null,
    pageTotal: 0,
    itemsTotal: 0,
  });
  const [roleCounts, setRoleCounts] =
    useState<AdvisorsRoleCounts>(EMPTY_ADVISORS_ROLE_COUNTS);

  const scheduleCountsFetch = useCallback((countsFilters: Filters) => {
    if (countsTimeoutRef.current) clearTimeout(countsTimeoutRef.current);
    countsTimeoutRef.current = setTimeout(() => {
      const countsRequestId = ++lastCountsRequestIdRef.current;
      void fetchAdvisorsCountsServer(countsFilters)
        .then((countsData) => {
          if (countsRequestId !== lastCountsRequestIdRef.current || !countsData) {
            return;
          }
          setRoleCounts((current) => ({
            ...countsData,
            totalCount: current.totalCount || countsData.totalCount,
          }));
        })
        .catch((countsError) => {
          console.error("Error fetching advisor role counts:", countsError);
        });
    }, 400);
  }, []);

  const fetchAdvisors = useCallback(
    async (page: number = 1, filters?: Filters) => {
      const requestId = ++lastRequestIdRef.current;
      setLoading(true);
      setError(null);

      if (filters !== undefined) {
        currentFiltersRef.current = filters;
        setCurrentFilters(filters);
      }

      const filtersToUse =
        filters !== undefined
          ? filters
          : currentFiltersRef.current ?? createDefaultAdvisorFilters();

      try {
        if (page === 1) {
          scheduleCountsFetch(filtersToUse);
        }

        const data = await fetchAdvisorsServer({ ...filtersToUse, page });

        if (!data) {
          throw new Error("Failed to fetch advisors - authentication required");
        }

        if (requestId === lastRequestIdRef.current) {
          setAdvisors(data.items);
          setPagination({
            curPage: data.curPage,
            nextPage: data.nextPage,
            prevPage: data.prevPage,
            pageTotal: data.pageTotal,
            itemsTotal: data.itemsTotal,
          });
          if (page === 1) {
            setRoleCounts((current) => ({
              ...current,
              totalCount: data.itemsTotal,
            }));
          }
        }
      } catch (err) {
        if (requestId === lastRequestIdRef.current) {
          setError(
            err instanceof Error ? err.message : "Failed to fetch advisors"
          );
        }
        console.error("Error fetching advisors:", err);
      } finally {
        if (requestId === lastRequestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [scheduleCountsFetch]
  );

  useEffect(() => {
    fetchAdvisors(1, createDefaultAdvisorFilters());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    advisors,
    loading,
    error,
    pagination,
    roleCounts,
    fetchAdvisors,
    currentFilters,
  };
};

function AdvisorsPageInner() {
  const {
    advisors,
    loading,
    error,
    pagination,
    roleCounts,
    fetchAdvisors,
    currentFilters,
  } = useAdvisorsAPI();

  const [isPortfolioOnlyFilter, setIsPortfolioOnlyFilter] = useState(false);
  const [filterPinnedColumnKeys, setFilterPinnedColumnKeys] = useState<string[]>(
    []
  );
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [columnsCount, setColumnsCount] = useState(
    DEFAULT_VISIBLE_ADVISOR_COLUMN_KEYS.length
  );
  const [initialSearch, setInitialSearch] = useState<string | undefined>(
    undefined
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setInitialSearch(params.get("search") || undefined);
  }, []);

  const handleSearch = useCallback(
    (listFilters: Filters, _countsFilters: Filters, portfolioOnly?: boolean) => {
      setIsPortfolioOnlyFilter(Boolean(portfolioOnly));
      void fetchAdvisors(1, listFilters);
    },
    [fetchAdvisors]
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
      <AdvisorDashboard
        onSearch={handleSearch}
        onFilterColumnsChange={handleFilterColumnsChange}
        initialSearch={initialSearch}
        roleCounts={roleCounts}
        onColumnsClick={() => setShowColumnsModal((value) => !value)}
        columnsActive={showColumnsModal}
        columnsCount={columnsCount}
      />
      <AdvisorSection
        advisors={advisors}
        loading={loading}
        error={error}
        pagination={pagination}
        fetchAdvisors={fetchAdvisors}
        currentFilters={currentFilters}
        filterPinnedColumnKeys={filterPinnedColumnKeys}
        externalShowColumnsModal={showColumnsModal}
        externalSetShowColumnsModal={setShowColumnsModal}
        onColumnsCountChange={setColumnsCount}
        isPortfolioOnlyFilter={isPortfolioOnlyFilter}
      />
      <Footer />
    </div>
  );
}

export default function AdvisorsPage() {
  return <AdvisorsPageInner />;
}
