"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { InvestorDashboard } from "@/components/investors/InvestorDashboard";
import {
  InvestorSection,
  type Investor,
  type Filters,
} from "@/components/investors/InvestorSection";
import { createDefaultInvestorFilters } from "@/lib/investorsFilterPayload";
import { DEFAULT_VISIBLE_INVESTOR_COLUMN_KEYS } from "@/components/investors/investorsColumnCategories";
import { getColumnKeysForActiveFilters } from "@/components/investors/investorsColumnFilterMap";
import {
  EMPTY_INVESTOR_TYPE_COUNTS,
  type InvestorsTypeCounts,
  type InvestorTypeOption,
} from "@/components/investors/investorsFilterConfig";
import {
  fetchInvestorsServer,
  fetchInvestorTypesServer,
} from "./actions";

const useInvestorsAPI = () => {
  const [investors, setInvestors] = useState<Investor[]>([]);
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
  const [typeCounts, setTypeCounts] =
    useState<InvestorsTypeCounts>(EMPTY_INVESTOR_TYPE_COUNTS);
  const [investorTypes, setInvestorTypes] = useState<InvestorTypeOption[]>([]);

  const scheduleCountsFetch = useCallback((countsFilters: Filters) => {
    if (countsTimeoutRef.current) clearTimeout(countsTimeoutRef.current);
    countsTimeoutRef.current = setTimeout(() => {
      const countsRequestId = ++lastCountsRequestIdRef.current;
      void fetchInvestorsServer({ ...countsFilters, page: 1 })
        .then((countsData) => {
          if (countsRequestId !== lastCountsRequestIdRef.current || !countsData) {
            return;
          }
          setTypeCounts(countsData.typeCounts);
        })
        .catch((countsError) => {
          console.error("Error fetching investor type counts:", countsError);
        });
    }, 400);
  }, []);

  const fetchInvestors = useCallback(
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
          : currentFiltersRef.current ?? createDefaultInvestorFilters();
      const countsFiltersToUse =
        countsFilters ?? currentCountsFiltersRef.current ?? filtersToUse;

      try {
        if (page === 1) {
          scheduleCountsFetch(countsFiltersToUse);
        }

        const data = await fetchInvestorsServer({ ...filtersToUse, page });

        if (!data) {
          throw new Error("Failed to fetch investors - authentication required");
        }

        if (requestId === lastRequestIdRef.current) {
          setInvestors(data.items);
          setPagination({
            curPage: data.curPage,
            nextPage: data.nextPage,
            prevPage: data.prevPage,
            pageTotal: data.pageTotal,
            itemsTotal: data.itemsTotal,
          });
          if (page === 1) {
            setTypeCounts(data.typeCounts);
          }
        }
      } catch (err) {
        if (requestId === lastRequestIdRef.current) {
          setError(
            err instanceof Error ? err.message : "Failed to fetch investors"
          );
        }
        console.error("Error fetching investors:", err);
      } finally {
        if (requestId === lastRequestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [scheduleCountsFetch]
  );

  useEffect(() => {
    void fetchInvestorTypesServer().then(setInvestorTypes).catch(console.error);
    fetchInvestors(1, createDefaultInvestorFilters());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    investors,
    loading,
    error,
    pagination,
    typeCounts,
    investorTypes,
    fetchInvestors,
    currentFilters,
  };
};

function InvestorsPageInner() {
  const {
    investors,
    loading,
    error,
    pagination,
    typeCounts,
    investorTypes,
    fetchInvestors,
    currentFilters,
  } = useInvestorsAPI();

  const [isPortfolioOnlyFilter, setIsPortfolioOnlyFilter] = useState(false);
  const [filterPinnedColumnKeys, setFilterPinnedColumnKeys] = useState<string[]>(
    []
  );
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [columnsCount, setColumnsCount] = useState(
    DEFAULT_VISIBLE_INVESTOR_COLUMN_KEYS.length
  );
  const [initialSearch, setInitialSearch] = useState<string | undefined>(
    undefined
  );
  const [initialInvestorTypeId, setInitialInvestorTypeId] = useState<
    number | undefined
  >(undefined);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setInitialSearch(params.get("search") || undefined);
    const typeId = Number(params.get("investorTypeId"));
    if (Number.isFinite(typeId) && typeId > 0) {
      setInitialInvestorTypeId(typeId);
    }
  }, []);

  const handleSearch = useCallback(
    (listFilters: Filters, countsFilters: Filters, portfolioOnly?: boolean) => {
      setIsPortfolioOnlyFilter(Boolean(portfolioOnly));
      void fetchInvestors(1, listFilters, countsFilters);
    },
    [fetchInvestors]
  );

  const handleFilterColumnsChange = useCallback(
    ({
      filterIds,
      investorTypeTabActive,
    }: {
      filterIds: string[];
      investorTypeTabActive: boolean;
    }) => {
      setFilterPinnedColumnKeys(
        getColumnKeysForActiveFilters(filterIds, investorTypeTabActive)
      );
    },
    []
  );

  return (
    <div className="min-h-screen">
      <Header />
      <InvestorDashboard
        onSearch={handleSearch}
        onFilterColumnsChange={handleFilterColumnsChange}
        initialSearch={initialSearch}
        initialInvestorTypeId={initialInvestorTypeId}
        typeCounts={typeCounts}
        investorTypes={investorTypes}
        onColumnsClick={() => setShowColumnsModal((value) => !value)}
        columnsActive={showColumnsModal}
        columnsCount={columnsCount}
      />
      <InvestorSection
        investors={investors}
        loading={loading}
        error={error}
        pagination={pagination}
        fetchInvestors={fetchInvestors}
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

export default function InvestorsPage() {
  return <InvestorsPageInner />;
}
