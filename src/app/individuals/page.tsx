"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { IndividualDashboard } from "@/components/individuals/IndividualDashboard";
import {
  IndividualSection,
  type Filters,
} from "@/components/individuals/IndividualSection";
import type { Individual } from "@/types/individuals";
import { createDefaultIndividualFilters } from "@/lib/individualsFilterPayload";
import { DEFAULT_VISIBLE_INDIVIDUAL_COLUMN_KEYS } from "@/components/individuals/individualsColumnCategories";
import { getColumnKeysForActiveFilters } from "@/components/individuals/individualsColumnFilterMap";
import {
  EMPTY_INDIVIDUALS_SUMMARY_COUNTS,
  type IndividualsSummaryCounts,
  type JobTitleOption,
} from "@/components/individuals/individualsFilterConfig";
import {
  fetchIndividualsServer,
  fetchIndividualsCountsServer,
  fetchJobTitlesServer,
} from "./actions";
import { authService } from "@/lib/auth";

const useIndividualsAPI = () => {
  const [individuals, setIndividuals] = useState<Individual[]>([]);
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
    curPage: 1,
    nextPage: null as number | null,
    prevPage: null as number | null,
    pageTotal: 0,
    itemsTotal: 0,
  });
  const [summaryCounts, setSummaryCounts] = useState<IndividualsSummaryCounts>(
    EMPTY_INDIVIDUALS_SUMMARY_COUNTS
  );
  const [jobTitles, setJobTitles] = useState<JobTitleOption[]>([]);

  const scheduleCountsFetch = useCallback((countsFilters: Filters) => {
    if (countsTimeoutRef.current) clearTimeout(countsTimeoutRef.current);
    countsTimeoutRef.current = setTimeout(() => {
      const countsRequestId = ++lastCountsRequestIdRef.current;
      void fetchIndividualsCountsServer(
        countsFilters,
        authService.getToken()
      )
        .then((countsData) => {
          if (countsRequestId !== lastCountsRequestIdRef.current || !countsData) {
            return;
          }
          setSummaryCounts(countsData);
        })
        .catch((countsError) => {
          console.error("Error fetching individual summary counts:", countsError);
        });
    }, 400);
  }, []);

  const fetchIndividuals = useCallback(
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
          : currentFiltersRef.current ?? createDefaultIndividualFilters();
      const countsFiltersToUse =
        countsFilters ??
        currentCountsFiltersRef.current ??
        filtersToUse;

      try {
        if (page === 1) {
          scheduleCountsFetch(countsFiltersToUse);
        }

        const data = await fetchIndividualsServer(
          { ...filtersToUse, page },
          authService.getToken()
        );

        if (!data) {
          throw new Error(
            authService.getToken()
              ? "Failed to fetch individuals"
              : "Authentication required"
          );
        }

        if (requestId === lastRequestIdRef.current) {
          setIndividuals(data.items);
          setPagination({
            curPage: data.curPage,
            nextPage: data.nextPage,
            prevPage: data.prevPage,
            pageTotal: data.pageTotal,
            itemsTotal: data.itemsTotal,
          });
        }
      } catch (err) {
        if (requestId === lastRequestIdRef.current) {
          setError(
            err instanceof Error ? err.message : "Failed to fetch individuals"
          );
        }
        console.error("Error fetching individuals:", err);
      } finally {
        if (requestId === lastRequestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [scheduleCountsFetch]
  );

  useEffect(() => {
    authService.ensureAuthCookie();
    const token = authService.getToken();
    if (!token) {
      setLoading(false);
      setError("Authentication required");
      return;
    }

    void fetchJobTitlesServer(token).then(setJobTitles).catch(console.error);
    const defaults = createDefaultIndividualFilters();
    fetchIndividuals(1, defaults, defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    individuals,
    loading,
    error,
    pagination,
    summaryCounts,
    jobTitles,
    fetchIndividuals,
    currentFilters,
  };
};

function IndividualsPageInner() {
  const {
    individuals,
    loading,
    error,
    pagination,
    summaryCounts,
    jobTitles,
    fetchIndividuals,
    currentFilters,
  } = useIndividualsAPI();

  const [isPortfolioOnlyFilter, setIsPortfolioOnlyFilter] = useState(false);
  const [filterPinnedColumnKeys, setFilterPinnedColumnKeys] = useState<string[]>(
    []
  );
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [columnsCount, setColumnsCount] = useState(
    DEFAULT_VISIBLE_INDIVIDUAL_COLUMN_KEYS.length
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
    (listFilters: Filters, countsFilters: Filters, portfolioOnly?: boolean) => {
      setIsPortfolioOnlyFilter(Boolean(portfolioOnly));
      void fetchIndividuals(1, listFilters, countsFilters);
    },
    [fetchIndividuals]
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
      <IndividualDashboard
        onSearch={handleSearch}
        onFilterColumnsChange={handleFilterColumnsChange}
        initialSearch={initialSearch}
        summaryCounts={summaryCounts}
        jobTitles={jobTitles}
        onColumnsClick={() => setShowColumnsModal((value) => !value)}
        columnsActive={showColumnsModal}
        columnsCount={columnsCount}
      />
      <IndividualSection
        individuals={individuals}
        loading={loading}
        error={error}
        pagination={pagination}
        fetchIndividuals={fetchIndividuals}
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

export default function IndividualsPage() {
  return <IndividualsPageInner />;
}
