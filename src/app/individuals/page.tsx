"use client";

import React, {
  Suspense,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
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
  DEFAULT_INDIVIDUALS_LIST_SORT,
  applyIndividualsListSortToSearchParams,
  mergeSortIntoIndividualFilters,
  parseIndividualsListSortFromSearchParams,
  type IndividualsListSortState,
} from "@/components/individuals/individualsListSort";
import {
  fetchIndividualsServer,
  fetchIndividualsCountsServer,
  fetchJobTitlesServer,
} from "./actions";
import { authService } from "@/lib/auth";
import { useEntitySelection } from "@/components/search/useEntitySelection";
import type { ListExportRequest } from "@/lib/listExport/types";

const useIndividualsAPI = (
  initialListSort: IndividualsListSortState = DEFAULT_INDIVIDUALS_LIST_SORT
) => {
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
  const [advisorsTabCount, setAdvisorsTabCount] = useState(0);
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
          if (
            typeof data.advisorsTabCount === "number" &&
            Number.isFinite(data.advisorsTabCount)
          ) {
            setAdvisorsTabCount(data.advisorsTabCount);
          }
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
    const defaults = mergeSortIntoIndividualFilters(
      createDefaultIndividualFilters(),
      initialListSort
    );
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
    advisorsTabCount,
  };
};

function IndividualsPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialListSort = useMemo(
    () =>
      parseIndividualsListSortFromSearchParams(
        new URLSearchParams(searchParams.toString())
      ) ?? DEFAULT_INDIVIDUALS_LIST_SORT,
    [searchParams]
  );

  const {
    individuals,
    loading,
    error,
    pagination,
    summaryCounts,
    jobTitles,
    fetchIndividuals,
    currentFilters,
    advisorsTabCount,
  } = useIndividualsAPI(initialListSort);

  const [listSort, setListSort] =
    useState<IndividualsListSortState>(initialListSort);
  useEffect(() => {
    setListSort(initialListSort);
  }, [initialListSort]);

  const currentFiltersRef = useRef(currentFilters);
  currentFiltersRef.current = currentFilters;

  const syncListSortToUrl = useCallback(
    (sort: IndividualsListSortState) => {
      const params = applyIndividualsListSortToSearchParams(
        new URLSearchParams(searchParams.toString()),
        sort
      );
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const syncListSort = useCallback(
    (sort: IndividualsListSortState) => {
      setListSort(sort);
      syncListSortToUrl(sort);
    },
    [syncListSortToUrl]
  );

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
  const exportCSVRef = useRef<
    ((request: ListExportRequest) => Promise<void>) | null
  >(null);
  const [exporting, setExporting] = useState(false);

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

  const handleServerSortChange = useCallback(
    (nextSort: IndividualsListSortState) => {
      syncListSort(nextSort);
      const base =
        currentFiltersRef.current ?? createDefaultIndividualFilters();
      void fetchIndividuals(
        1,
        mergeSortIntoIndividualFilters({ ...base, page: 1 }, nextSort)
      );
    },
    [fetchIndividuals, syncListSort]
  );

  const handleFilterColumnsChange = useCallback(
    ({
      filterIds,
      roleTabActive,
    }: {
      filterIds: string[];
      roleTabActive: boolean;
    }) => {
      setFilterPinnedColumnKeys(
        getColumnKeysForActiveFilters(filterIds, roleTabActive)
      );
    },
    []
  );

  const filtersKey = useMemo(
    () => JSON.stringify(currentFilters ?? {}),
    [currentFilters]
  );
  const {
    selectedIds: selectedEntityIds,
    toggleSelection: toggleEntitySelection,
    togglePageSelection,
    clearSelection,
  } = useEntitySelection(filtersKey);

  return (
    <AppShell>
    <div className="min-h-screen">
      <IndividualDashboard
        onSearch={handleSearch}
        onFilterColumnsChange={handleFilterColumnsChange}
        initialSearch={initialSearch}
        summaryCounts={summaryCounts}
        jobTitles={jobTitles}
        listSort={listSort}
        onSyncListSort={syncListSort}
        advisorsTabCount={advisorsTabCount}
        listItemsTotal={pagination.itemsTotal}
        onColumnsClick={() => setShowColumnsModal((value) => !value)}
        onExport={(mode) =>
          exportCSVRef.current?.({ mode, scope: "full_list" })
        }
        exporting={exporting}
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
        listSort={listSort}
        onServerSortChange={handleServerSortChange}
        filterPinnedColumnKeys={filterPinnedColumnKeys}
        externalShowColumnsModal={showColumnsModal}
        externalSetShowColumnsModal={setShowColumnsModal}
        onColumnsCountChange={setColumnsCount}
        onRegisterExportCSV={(fn) => {
          exportCSVRef.current = fn;
        }}
        onExportingChange={setExporting}
        isPortfolioOnlyFilter={isPortfolioOnlyFilter}
        isAdvisorsTab={Boolean(currentFilters?.advisors_only)}
        selectedEntityIds={selectedEntityIds}
        onToggleEntitySelection={toggleEntitySelection}
        onTogglePageSelection={togglePageSelection}
        onClearSelection={clearSelection}
      />
      <Footer />
    </div>
    </AppShell>
  );
}

export default function IndividualsPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="min-h-screen">
            <div className="company-section">
              <div className="loading">Loading individuals...</div>
            </div>
            <Footer />
          </div>
        </AppShell>
      }
    >
      <IndividualsPageInner />
    </Suspense>
  );
}
