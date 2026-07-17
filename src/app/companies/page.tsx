"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/components/providers/AuthProvider";
import { buildMcpGuestCompaniesFilters, buildMcpGuestCompaniesCountsFilters } from "@/lib/companiesFilterPayload";
import { CompanyDashboard } from "@/components/companies/CompanyDashboard";
import {
  CompanySection,
  createDefaultFilters,
  type Company,
  type Filters,
} from "@/components/companies/CompanySection";
import { DEFAULT_VISIBLE_COMPANY_COLUMN_KEYS } from "@/components/companies/companiesColumnCategories";
import { getColumnKeysForActiveFilters } from "@/components/companies/companiesColumnFilterMap";
import {
  EMPTY_OWNERSHIP_COUNTS,
  type CompaniesOwnershipCounts,
} from "@/components/companies/companiesFilterConfig";
import {
  fetchCompaniesServer,
  fetchCompaniesCountsServer,
  CompaniesFilters as ServerFilters,
} from "./actions";
import { CompaniesEditContext } from "./CompaniesEditContext";
import { useEntitySelection } from "@/components/search/useEntitySelection";
import type { ListExportRequest } from "@/lib/listExport/types";

const useCompaniesAPI = (isMcpGuest: boolean, authLoading: boolean) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastRequestIdRef = useRef(0);
  const lastCountsRequestIdRef = useRef(0);
  const countsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentFiltersRef = useRef<Filters | undefined>(undefined);
  const requestColumnsRef = useRef<string[]>([]);
  const [currentFilters, setCurrentFilters] = useState<Filters | undefined>(
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

  const setRequestColumns = useCallback((columns: string[]) => {
    requestColumnsRef.current = columns;
  }, []);

  const scheduleCountsFetch = useCallback((countsFilters: ServerFilters) => {
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
          console.error("Error fetching companies counts:", countsError);
        });
    }, 400);
  }, []);

  const currentCountsFiltersRef = useRef<Filters | undefined>(undefined);

  const fetchCompanies = useCallback(
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

      const filtersToUse = isMcpGuest
        ? buildMcpGuestCompaniesFilters()
        : filters !== undefined
          ? filters
          : currentFiltersRef.current ?? createDefaultFilters();
      const countsFiltersToUse = isMcpGuest
        ? buildMcpGuestCompaniesCountsFilters()
        : countsFilters ??
          currentCountsFiltersRef.current ??
          filtersToUse;

      try {
        const serverFilters: ServerFilters = {
          ...filtersToUse,
          columns: requestColumnsRef.current,
        };
        const countsServerFilters: ServerFilters = {
          ...countsFiltersToUse,
          columns: requestColumnsRef.current,
        };

        if (page === 1) {
          scheduleCountsFetch(countsServerFilters);
        }

        const data = await fetchCompaniesServer(page, serverFilters);

        if (!data) {
          throw new Error("Failed to fetch companies - authentication required");
        }

        if (requestId === lastRequestIdRef.current) {
          setCompanies((data.result1?.items || []) as Company[]);
          const totalCount = data.result1?.totalCount ?? 0;
          setPagination({
            itemsReceived: data.result1?.itemsReceived || 0,
            curPage: data.result1?.curPage || 1,
            nextPage: data.result1?.nextPage || null,
            prevPage: data.result1?.prevPage || null,
            offset: data.result1?.offset || 0,
            perPage: data.result1?.perPage || 20,
            pageTotal: data.result1?.pageTotal || 0,
            totalCount,
          });
          if (isMcpGuest && totalCount > 0) {
            setOwnershipCounts((prev) => ({
              ...prev,
              totalCount,
            }));
          }
        }
      } catch (err) {
        if (requestId === lastRequestIdRef.current) {
          setError(
            err instanceof Error ? err.message : "Failed to fetch companies"
          );
        }
        console.error("Error fetching companies:", err);
      } finally {
        if (requestId === lastRequestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [scheduleCountsFetch, isMcpGuest]
  );

  useEffect(() => {
    if (authLoading) return;
    const initialFilters = isMcpGuest
      ? buildMcpGuestCompaniesFilters()
      : createDefaultFilters();
    fetchCompanies(1, initialFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMcpGuest, authLoading]);

  return {
    companies,
    loading,
    error,
    pagination,
    ownershipCounts,
    fetchCompanies,
    setRequestColumns,
    currentFilters,
  };
};

function CompaniesPageInner() {
  const { isMcpGuest, loading: authLoading } = useAuth();
  const {
    companies,
    loading,
    error,
    pagination,
    ownershipCounts,
    fetchCompanies,
    setRequestColumns,
    currentFilters,
  } = useCompaniesAPI(isMcpGuest, authLoading);

  const [isPortfolioOnlyFilter, setIsPortfolioOnlyFilter] = useState(false);

  const handleSearch = useCallback(
    (listFilters: Filters, countsFilters: Filters, portfolioOnly?: boolean) => {
      if (isMcpGuest) return;
      setIsPortfolioOnlyFilter(Boolean(portfolioOnly));
      fetchCompanies(1, listFilters, countsFilters);
    },
    [fetchCompanies, isMcpGuest]
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
      setFilterPinnedColumnKeys(
        getColumnKeysForActiveFilters(filters, ownershipTabActive)
      );
    },
    []
  );

  const [initialSearch, setInitialSearch] = useState<string | undefined>(
    undefined
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const s = params?.get?.("search") || undefined;
      setInitialSearch(s);
    }
  }, []);

  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [columnsCount, setColumnsCount] = useState(
    DEFAULT_VISIBLE_COMPANY_COLUMN_KEYS.length
  );
  const exportCSVRef = useRef<
    ((request: ListExportRequest) => Promise<void>) | null
  >(null);
  const [exporting, setExporting] = useState(false);
  const filtersKey = useMemo(
    () => JSON.stringify(currentFilters ?? {}),
    [currentFilters]
  );
  const {
    selectedIds: selectedCompanyIds,
    toggleSelection: toggleCompanySelection,
    togglePageSelection,
    clearSelection,
  } = useEntitySelection(filtersKey);

  return (
    <div className="min-h-screen">
      <Header />
      <CompanyDashboard
        onSearch={handleSearch}
        onFilterColumnsChange={handleFilterColumnsChange}
        initialSearch={initialSearch}
        ownershipCounts={ownershipCounts}
        onColumnsClick={
          isMcpGuest ? undefined : () => setShowColumnsModal((v) => !v)
        }
        onExport={
          isMcpGuest
            ? undefined
            : (mode) => exportCSVRef.current?.({ mode, scope: "full_list" })
        }
        exporting={exporting}
        columnsCount={columnsCount}
        columnsActive={showColumnsModal}
        guestMode={isMcpGuest}
        matchCountOverride={
          isMcpGuest
            ? pagination.totalCount || ownershipCounts.totalCount
            : undefined
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
        filterPinnedColumnKeys={filterPinnedColumnKeys}
        onEditCompany={React.useContext(CompaniesEditContext)}
        externalShowColumnsModal={isMcpGuest ? false : showColumnsModal}
        externalSetShowColumnsModal={
          isMcpGuest ? undefined : setShowColumnsModal
        }
        onColumnsCountChange={setColumnsCount}
        onRegisterExportCSV={
          isMcpGuest
            ? undefined
            : (fn) => {
                exportCSVRef.current = fn;
              }
        }
        onExportingChange={isMcpGuest ? undefined : setExporting}
        selectedCompanyIds={selectedCompanyIds}
        onToggleCompanySelection={toggleCompanySelection}
        onTogglePageSelection={togglePageSelection}
        onClearSelection={clearSelection}
        isPortfolioOnlyFilter={isPortfolioOnlyFilter}
        readOnlyGuestMode={isMcpGuest}
      />
      {!isMcpGuest && <Footer />}
    </div>
  );
}

export default function CompaniesPage() {
  return <CompaniesPageInner />;
}
