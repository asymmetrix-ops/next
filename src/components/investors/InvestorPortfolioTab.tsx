"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchCompaniesCountsServer,
  fetchCompaniesServer,
  type CompaniesFilters,
} from "@/app/companies/actions";
import {
  fetchInvestorPortfolioHeadstatsServer,
  fetchInvestorPortfolioIdsServer,
  type InvestorPortfolioHeadstatsResponse,
  type InvestorPortfolioIdsResponse,
} from "@/app/investors/[id]/portfolioActions";
import { CompanyDashboard } from "@/components/companies/CompanyDashboard";
import { useEntitySelection } from "@/components/search/useEntitySelection";
import type { ListExportRequest } from "@/lib/listExport/types";
import type { ColumnStorageScope } from "@/lib/columnPreferencesStorage";
import {
  CompanySection,
  createDefaultFilters,
  type Company,
  type Filters,
} from "@/components/companies/CompanySection";
import { getColumnKeysForActiveFilters } from "@/components/companies/companiesColumnFilterMap";
import {
  EMPTY_OWNERSHIP_COUNTS,
  type CompaniesOwnershipCounts,
} from "@/components/companies/companiesFilterConfig";
import {
  enrichPortfolioListFilters,
  getScopedPortfolioIds,
  type InvestmentStatusFilter,
} from "@/lib/investorPortfolioFilters";
import { PortfolioHeadstatsRow } from "@/components/investors/PortfolioHeadstatsRow";
import { usePlatformCurrency } from "@/components/providers/PlatformCurrencyProvider";
import {
  PORTFOLIO_COLUMN_CATEGORIES,
  PORTFOLIO_DEFAULT_VISIBLE_COLUMN_KEYS,
  getPortfolioProdDefaultColumnKeys,
} from "@/components/investors/investorPortfolioColumns";

export type InvestorPortfolioTabProps = {
  investorId: string;
  investorName: string;
};

function useInvestorPortfolioSearch(
  portfolioIds: InvestorPortfolioIdsResponse | null,
  investmentStatusFilter: InvestmentStatusFilter,
  preferredCurrencyId: number,
  investorId: string
) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastRequestIdRef = useRef(0);
  const lastCountsRequestIdRef = useRef(0);
  const countsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentFiltersRef = useRef<Filters | undefined>(undefined);
  const requestColumnsRef = useRef<string[]>([]);
  const investmentStatusRef = useRef<InvestmentStatusFilter>(investmentStatusFilter);
  investmentStatusRef.current = investmentStatusFilter;
  const [currentFilters, setCurrentFilters] = useState<Filters | undefined>(
    undefined
  );
  const [enrichedFilters, setEnrichedFilters] = useState<Filters | undefined>(
    undefined
  );
  const [pagination, setPagination] = useState({
    itemsReceived: 0,
    curPage: 1,
    nextPage: null as number | null,
    prevPage: null as number | null,
    offset: 0,
    perPage: 20,
    pageTotal: 0,
    totalCount: 0,
  });
  const [ownershipCounts, setOwnershipCounts] =
    useState<CompaniesOwnershipCounts>(EMPTY_OWNERSHIP_COUNTS);
  const [headstats, setHeadstats] =
    useState<InvestorPortfolioHeadstatsResponse | null>(null);
  const [headstatsLoading, setHeadstatsLoading] = useState(false);

  const setRequestColumns = useCallback((columns: string[]) => {
    requestColumnsRef.current = columns;
  }, []);

  const applyInvestmentStatus = useCallback((next: InvestmentStatusFilter) => {
    investmentStatusRef.current = next;
  }, []);

  const enrichFilters = useCallback(
    (userFilters: Filters): Filters => {
      if (!portfolioIds) return userFilters;
      const scopedIds = getScopedPortfolioIds(
        investmentStatusRef.current,
        portfolioIds
      );
      return enrichPortfolioListFilters(
        {
          ...userFilters,
          columns: requestColumnsRef.current,
        },
        scopedIds,
        portfolioIds.current_ids,
        investorId
      );
    },
    [portfolioIds, investorId]
  );

  const scheduleCountsFetch = useCallback(
    (countsFilters: CompaniesFilters) => {
      if (countsTimeoutRef.current) clearTimeout(countsTimeoutRef.current);
      countsTimeoutRef.current = setTimeout(() => {
        const countsRequestId = ++lastCountsRequestIdRef.current;
        void fetchCompaniesCountsServer(countsFilters)
          .then((countsData) => {
            if (countsRequestId !== lastCountsRequestIdRef.current || !countsData) {
              return;
            }
            setOwnershipCounts({
              totalCount: countsData.totalCount || 0,
              publicCompanies: countsData.publicCompanies || 0,
              peOwnedCompanies: countsData.peOwnedCompanies || 0,
              vcOwnedCompanies: countsData.vcOwnedCompanies || 0,
              privateCompanies: countsData.privateCompanies || 0,
              subsidiaryCompanies: countsData.subsidiaryCompanies || 0,
              acquiredCompanies: countsData.acquiredCompanies || 0,
              otherCompanies: countsData.otherCompanies || 0,
            });
          })
          .catch((countsError) => {
            console.error("Error fetching portfolio ownership counts:", countsError);
          });
      }, 400);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (countsTimeoutRef.current) clearTimeout(countsTimeoutRef.current);
    };
  }, []);

  const scheduleHeadstatsFetch = useCallback(
    (userFilters: Filters) => {
      if (!portfolioIds) return;
      setHeadstatsLoading(true);
      void fetchInvestorPortfolioHeadstatsServer({
        currentIds: portfolioIds.current_ids,
        filtersSql: userFilters.filters_sql ?? null,
        preferredCurrencyId,
      })
        .then((data) => {
          if (data) setHeadstats(data);
        })
        .catch((headstatsError) => {
          console.error("Error fetching portfolio headstats:", headstatsError);
        })
        .finally(() => {
          setHeadstatsLoading(false);
        });
    },
    [portfolioIds, preferredCurrencyId]
  );

  const currentCountsFiltersRef = useRef<Filters | undefined>(undefined);
  const currentUserFiltersRef = useRef<Filters | undefined>(undefined);

  const fetchCompanies = useCallback(
    async (page: number = 1, filters?: Filters, countsFilters?: Filters) => {
      if (!portfolioIds) return;

      const requestId = ++lastRequestIdRef.current;
      setLoading(true);
      setError(null);

      const rawUserFilters =
        filters !== undefined
          ? filters
          : currentUserFiltersRef.current ?? createDefaultFilters();
      const rawCountsUserFilters =
        countsFilters ??
        currentCountsFiltersRef.current ??
        rawUserFilters;

      currentUserFiltersRef.current = rawUserFilters;
      currentCountsFiltersRef.current = rawCountsUserFilters;
      setCurrentFilters(rawUserFilters);

      const listFilters = enrichFilters(rawUserFilters);
      const countsListFilters = enrichFilters(rawCountsUserFilters);

      currentFiltersRef.current = listFilters;
      setEnrichedFilters(listFilters);

      try {
        if (page === 1) {
          if (investmentStatusRef.current === "past") {
            scheduleCountsFetch(countsListFilters);
          } else {
            lastCountsRequestIdRef.current += 1;
            if (countsTimeoutRef.current) clearTimeout(countsTimeoutRef.current);
            setOwnershipCounts(EMPTY_OWNERSHIP_COUNTS);
          }
          scheduleHeadstatsFetch(rawUserFilters);
        }

        const data = await fetchCompaniesServer(page, listFilters);

        if (!data) {
          throw new Error("Failed to fetch portfolio companies - authentication required");
        }

        if (requestId === lastRequestIdRef.current) {
          setCompanies((data.result1?.items || []) as Company[]);
          setPagination({
            itemsReceived: data.result1?.itemsReceived || 0,
            curPage: data.result1?.curPage || 1,
            nextPage: data.result1?.nextPage || null,
            prevPage: data.result1?.prevPage || null,
            offset: data.result1?.offset || 0,
            perPage: data.result1?.perPage || 20,
            pageTotal: data.result1?.pageTotal || 0,
            totalCount: (data.result1?.totalCount ?? data.result1?.itemsReceived) || 0,
          });
        }
      } catch (err) {
        if (requestId === lastRequestIdRef.current) {
          setError(
            err instanceof Error ? err.message : "Failed to fetch portfolio companies"
          );
        }
        console.error("Error fetching portfolio companies:", err);
      } finally {
        if (requestId === lastRequestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [portfolioIds, enrichFilters, scheduleCountsFetch, scheduleHeadstatsFetch]
  );

  const skipCurrencyRefetchRef = useRef(true);

  useEffect(() => {
    if (skipCurrencyRefetchRef.current) {
      skipCurrencyRefetchRef.current = false;
      return;
    }
    if (!portfolioIds) return;
    const filters =
      currentUserFiltersRef.current ?? createDefaultFilters();
    scheduleHeadstatsFetch(filters);
    fetchCompanies(pagination.curPage || 1, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferredCurrencyId]);

  return {
    companies,
    loading,
    error,
    pagination,
    ownershipCounts,
    headstats,
    headstatsLoading,
    fetchCompanies,
    setRequestColumns,
    applyInvestmentStatus,
    currentFilters,
    enrichedFilters,
  };
}

export function InvestorPortfolioTab({
  investorId,
  investorName,
}: InvestorPortfolioTabProps) {
  const { currencyId: preferredCurrencyId, currency: platformCurrency } =
    usePlatformCurrency();
  const [portfolioIds, setPortfolioIds] =
    useState<InvestorPortfolioIdsResponse | null>(null);
  const [idsLoading, setIdsLoading] = useState(true);
  const [idsError, setIdsError] = useState<string | null>(null);
  const [investmentStatusFilter, setInvestmentStatusFilter] =
    useState<InvestmentStatusFilter>("current");

  useEffect(() => {
    let cancelled = false;
    setIdsLoading(true);
    setIdsError(null);
    void fetchInvestorPortfolioIdsServer(investorId)
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setIdsError("Unable to load portfolio scope.");
          setPortfolioIds(null);
          return;
        }
        setPortfolioIds(data);
      })
      .catch(() => {
        if (!cancelled) {
          setIdsError("Unable to load portfolio scope.");
        }
      })
      .finally(() => {
        if (!cancelled) setIdsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [investorId]);

  const {
    companies,
    loading,
    error,
    pagination,
    ownershipCounts,
    headstats,
    headstatsLoading,
    fetchCompanies,
    setRequestColumns,
    applyInvestmentStatus,
    currentFilters,
    enrichedFilters,
  } = useInvestorPortfolioSearch(
    portfolioIds,
    investmentStatusFilter,
    preferredCurrencyId,
    investorId
  );

  const initialFetchDoneRef = useRef(false);

  const handleListTabChange = useCallback(
    (tabId: string) => {
      const next: InvestmentStatusFilter = tabId === "past" ? "past" : "current";
      applyInvestmentStatus(next);
      setInvestmentStatusFilter(next);
    },
    [applyInvestmentStatus]
  );

  useEffect(() => {
    if (!portfolioIds || initialFetchDoneRef.current) return;
    initialFetchDoneRef.current = true;
    fetchCompanies(1, createDefaultFilters(), createDefaultFilters());
  }, [portfolioIds, fetchCompanies]);

  const handleSearch = useCallback(
    (listFilters: Filters, countsFilters: Filters) => {
      fetchCompanies(1, listFilters, countsFilters);
    },
    [fetchCompanies]
  );

  const [filterPinnedColumnKeys, setFilterPinnedColumnKeys] = useState<string[]>(
    []
  );

  const handleFilterColumnsChange = useCallback(
    ({
      filters,
      ownershipTabActive,
    }: {
      filters: Array<{ id: string; value: unknown }>;
      ownershipTabActive: boolean;
    }) => {
      const next = getColumnKeysForActiveFilters(filters, ownershipTabActive);
      setFilterPinnedColumnKeys(next);
    },
    []
  );

  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [columnsCount, setColumnsCount] = useState<number>(
    PORTFOLIO_DEFAULT_VISIBLE_COLUMN_KEYS.length
  );
  const exportCSVRef = useRef<
    ((request: ListExportRequest) => Promise<void>) | null
  >(null);
  const [exporting, setExporting] = useState(false);
  const filtersKey = useMemo(
    () =>
      JSON.stringify({
        filters: currentFilters ?? {},
        investmentStatusFilter,
      }),
    [currentFilters, investmentStatusFilter]
  );
  const {
    selectedIds: selectedCompanyIds,
    toggleSelection: toggleCompanySelection,
    togglePageSelection,
    clearSelection,
  } = useEntitySelection(filtersKey);

  const lockedScopeChips = useMemo(
    () => [
      {
        label: "Investor",
        value: `${investorName}'s portfolio`,
      },
    ],
    [investorName]
  );

  const columnsStorageKey = `investor-portfolio-column-keys-v2-${investorId}`;
  const isInactiveTab = investmentStatusFilter === "past";
  const portfolioListTabs = useMemo(
    () => [
      {
        id: "current",
        label: "Active",
        count: portfolioIds?.count_current ?? portfolioIds?.current_ids.length ?? 0,
        dot: "#10b981",
      },
      {
        id: "past",
        label: "Inactive / Exited",
        count: portfolioIds?.count_past ?? portfolioIds?.past_ids.length ?? 0,
        dot: "#64748b",
      },
    ],
    [portfolioIds]
  );

  if (idsLoading) {
    return (
      <div style={{ padding: "32px 0", textAlign: "center", color: "#64748b" }}>
        Loading portfolio…
      </div>
    );
  }

  if (idsError || !portfolioIds) {
    return (
      <div style={{ padding: "32px 0", textAlign: "center", color: "#64748b" }}>
        {idsError ?? "Portfolio unavailable."}
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <PortfolioHeadstatsRow
        medianRevenue={headstats?.median_revenue_m}
        medianEbitda={headstats?.median_ebitda_m}
        medianFte={headstats?.median_fte}
        loading={headstatsLoading && !headstats}
        currencyCode={platformCurrency}
      />

      <div className="overflow-hidden bg-white rounded-xl border shadow-lg border-slate-200/60 px-5">
        <CompanyDashboard
          onSearch={handleSearch}
          onFilterColumnsChange={handleFilterColumnsChange}
          ownershipCounts={ownershipCounts}
          onColumnsClick={() => setShowColumnsModal((v) => !v)}
          onExport={(mode) => exportCSVRef.current?.({ mode, scope: "full_list" })}
          exporting={exporting}
          columnsCount={columnsCount}
          columnsActive={showColumnsModal}
          hidePageHeader
          embedded
          lockedScopeChips={lockedScopeChips}
          listTabs={portfolioListTabs}
          activeListTabId={investmentStatusFilter}
          onListTabChange={handleListTabChange}
          showOwnershipTabsWhenListTabId="past"
          matchCountOverride={
            isInactiveTab
              ? undefined
              : (portfolioIds.count_current ?? portfolioIds.current_ids.length)
          }
        />

        <CompanySection
          companies={companies}
          loading={loading}
          error={error}
          pagination={pagination}
          ownershipCounts={ownershipCounts}
          fetchCompanies={fetchCompanies}
          setRequestColumns={setRequestColumns}
          currentFilters={currentFilters}
          exportFilters={enrichedFilters}
          filterPinnedColumnKeys={filterPinnedColumnKeys}
          externalShowColumnsModal={showColumnsModal}
          externalSetShowColumnsModal={setShowColumnsModal}
          onColumnsCountChange={setColumnsCount}
          onRegisterExportCSV={(fn) => {
            exportCSVRef.current = fn;
          }}
          onExportingChange={setExporting}
          selectedCompanyIds={selectedCompanyIds}
          onToggleCompanySelection={toggleCompanySelection}
          onTogglePageSelection={togglePageSelection}
          onClearSelection={clearSelection}
          embedded
          columnsStorageKey={columnsStorageKey}
          columnsStorageScope={"session" as ColumnStorageScope}
          defaultColumnKeys={PORTFOLIO_DEFAULT_VISIBLE_COLUMN_KEYS}
          portfolioMode
          columnCategories={PORTFOLIO_COLUMN_CATEGORIES}
          prodDefaultColumnKeys={getPortfolioProdDefaultColumnKeys()}
          resetSortOnMount
        />
      </div>
    </div>
  );
}
