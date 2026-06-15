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
import { BulkAddToPortfolioModal } from "@/components/companies/BulkAddToPortfolioModal";
import { FinancialScreenerDashboard } from "@/components/financial-screener/FinancialScreenerDashboard";
import {
  FinancialScreenerSection,
  getDefaultFinancialScreenerColumnCount,
} from "@/components/financial-screener/FinancialScreenerSection";
import { getColumnKeysForActiveFilters } from "@/components/financial-screener/financialScreenerColumnFilterMap";
import {
  EMPTY_FINANCIAL_SCREENER_OWNERSHIP_COUNTS,
  mapApiCountsToOwnershipCounts,
  type FinancialScreenerOwnershipCounts,
} from "@/components/financial-screener/financialScreenerFilterConfig";
import {
  applyClientFilters,
  hasActiveClientFilters,
  type FinancialScreenerFilters,
} from "@/components/financial-screener/financialScreenerFilterPayload";
import {
  fetchFinancialScreenerServer,
  type FinancialScreenerItem,
} from "./actions";

const PER_PAGE = 25;

function useFinancialScreenerAPI() {
  const [items, setItems] = useState<FinancialScreenerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ownershipCounts, setOwnershipCounts] =
    useState<FinancialScreenerOwnershipCounts>(EMPTY_FINANCIAL_SCREENER_OWNERSHIP_COUNTS);
  const [matchCount, setMatchCount] = useState(0);
  const [totalUniverseCount, setTotalUniverseCount] = useState(0);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: PER_PAGE,
    total: 0,
    totalPages: 1,
    nextPage: null as number | null,
    prevPage: null as number | null,
  });

  const currentFiltersRef = useRef<FinancialScreenerFilters>({
    page: 1,
    per_page: PER_PAGE,
    ownership_tab: "all",
  });
  const [currentFilters, setCurrentFilters] = useState<FinancialScreenerFilters>(
    currentFiltersRef.current
  );
  const lastRequestIdRef = useRef(0);

  const fetchScreener = useCallback(
    async (page: number = 1, filters?: FinancialScreenerFilters) => {
      const requestId = ++lastRequestIdRef.current;
      setLoading(true);
      setError(null);

      const filtersToUse: FinancialScreenerFilters = {
        ...(filters ?? currentFiltersRef.current),
        page,
        per_page: PER_PAGE,
      };
      currentFiltersRef.current = filtersToUse;
      setCurrentFilters(filtersToUse);

      try {
        const needsClientFiltering = hasActiveClientFilters(filtersToUse);

        if (needsClientFiltering) {
          let allItems: FinancialScreenerItem[] = [];
          let fetchPage = 1;
          let totalPages = 1;

          do {
            const response = await fetchFinancialScreenerServer({
              ...filtersToUse,
              page: fetchPage,
              per_page: 100,
              ownership_tab: "all",
              query: null,
              filters: filtersToUse.filters,
            });
            if (!response) {
              throw new Error(
                "Failed to fetch financial screener — authentication required"
              );
            }
            if (requestId !== lastRequestIdRef.current) return;

            allItems = allItems.concat(response.items);
            totalPages = response.pagination.total_pages;
            setOwnershipCounts(mapApiCountsToOwnershipCounts(response.counts));
            setTotalUniverseCount(response.counts.total ?? 0);
            fetchPage += 1;
          } while (fetchPage <= totalPages);

          const filtered = applyClientFilters(allItems, filtersToUse);
          const total = filtered.length;
          const totalPagesLocal = Math.max(1, Math.ceil(total / PER_PAGE));
          const safePage = Math.min(page, totalPagesLocal);
          const start = (safePage - 1) * PER_PAGE;
          const pageItems = filtered.slice(start, start + PER_PAGE);

          setItems(pageItems);
          setMatchCount(total);
          setPagination({
            page: safePage,
            perPage: PER_PAGE,
            total,
            totalPages: totalPagesLocal,
            nextPage: safePage < totalPagesLocal ? safePage + 1 : null,
            prevPage: safePage > 1 ? safePage - 1 : null,
          });
        } else {
          const response = await fetchFinancialScreenerServer(filtersToUse);
          if (!response) {
            throw new Error(
              "Failed to fetch financial screener — authentication required"
            );
          }
          if (requestId !== lastRequestIdRef.current) return;

          setItems(response.items);
          setOwnershipCounts(mapApiCountsToOwnershipCounts(response.counts));
          setTotalUniverseCount(response.counts.total ?? 0);
          setMatchCount(response.pagination.total);
          setPagination({
            page: response.pagination.page,
            perPage: response.pagination.per_page,
            total: response.pagination.total,
            totalPages: response.pagination.total_pages,
            nextPage: response.pagination.next_page,
            prevPage: response.pagination.prev_page,
          });
        }
      } catch (err) {
        if (requestId === lastRequestIdRef.current) {
          setError(
            err instanceof Error ? err.message : "Failed to fetch financial screener"
          );
        }
        console.error("Error fetching financial screener:", err);
      } finally {
        if (requestId === lastRequestIdRef.current) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    void fetchScreener(1);
  }, [fetchScreener]);

  return {
    items,
    loading,
    error,
    pagination,
    ownershipCounts,
    matchCount,
    totalUniverseCount,
    fetchScreener,
    currentFilters,
  };
}

export default function FinancialsPage() {
  const {
    items,
    loading,
    error,
    pagination,
    ownershipCounts,
    matchCount,
    totalUniverseCount,
    fetchScreener,
    currentFilters,
  } = useFinancialScreenerAPI();

  const [filterPinnedColumnKeys, setFilterPinnedColumnKeys] = useState<string[]>(
    []
  );
  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [columnsCount, setColumnsCount] = useState(
    getDefaultFinancialScreenerColumnCount()
  );
  const exportCSVRef = useRef<(() => void) | null>(null);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<Set<number>>(
    () => new Set()
  );
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);

  const handleSearch = useCallback(
    (filters: FinancialScreenerFilters) => {
      fetchScreener(1, filters);
    },
    [fetchScreener]
  );

  const handleFilterColumnsChange = useCallback(
    ({
      filterIds,
      ownershipTabActive,
    }: {
      filterIds: string[];
      ownershipTabActive: boolean;
    }) => {
      setFilterPinnedColumnKeys(
        getColumnKeysForActiveFilters(filterIds, ownershipTabActive)
      );
    },
    []
  );

  const filtersKey = useMemo(
    () => JSON.stringify(currentFilters ?? {}),
    [currentFilters]
  );

  useEffect(() => {
    setSelectedCompanyIds(new Set());
  }, [filtersKey]);

  const toggleCompanySelection = useCallback((id: number) => {
    setSelectedCompanyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const togglePageSelection = useCallback((ids: number[]) => {
    setSelectedCompanyIds((prev) => {
      const next = new Set(prev);
      const allSelected = ids.length > 0 && ids.every((id) => next.has(id));
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedCompanyIds(new Set());
  }, []);

  const selectedCompanyIdList = useMemo(
    () => Array.from(selectedCompanyIds),
    [selectedCompanyIds]
  );

  return (
    <div className="min-h-screen">
      <Header />
      <FinancialScreenerDashboard
        onSearch={handleSearch}
        onFilterColumnsChange={handleFilterColumnsChange}
        ownershipCounts={ownershipCounts}
        matchCount={matchCount}
        totalUniverseCount={totalUniverseCount}
        onColumnsClick={() => setShowColumnsModal((v) => !v)}
        onExportCSVClick={() => exportCSVRef.current?.()}
        onAddToPortfolioClick={() => setShowBulkAddModal(true)}
        selectedCount={selectedCompanyIds.size}
        columnsCount={columnsCount}
        columnsActive={showColumnsModal}
      />
      <FinancialScreenerSection
        items={items}
        loading={loading}
        error={error}
        pagination={pagination}
        currentFilters={currentFilters}
        filterPinnedColumnKeys={filterPinnedColumnKeys}
        fetchPage={fetchScreener}
        externalShowColumnsModal={showColumnsModal}
        externalSetShowColumnsModal={setShowColumnsModal}
        onColumnsCountChange={setColumnsCount}
        onRegisterExportCSV={(fn) => {
          exportCSVRef.current = fn;
        }}
        selectedCompanyIds={selectedCompanyIds}
        onToggleCompanySelection={toggleCompanySelection}
        onTogglePageSelection={togglePageSelection}
      />
      <BulkAddToPortfolioModal
        isOpen={showBulkAddModal}
        onClose={() => setShowBulkAddModal(false)}
        companyIds={selectedCompanyIdList}
        onComplete={clearSelection}
      />
      <Footer />
    </div>
  );
}
