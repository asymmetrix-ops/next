"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchCompaniesCountsServer,
  fetchCompaniesServer,
  type CompaniesFilters,
} from "@/app/companies/actions";
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
import { DEFAULT_VISIBLE_COMPANY_COLUMN_KEYS } from "@/components/companies/companiesColumnCategories";
import { getColumnKeysForActiveFilters } from "@/components/companies/companiesColumnFilterMap";
import {
  EMPTY_OWNERSHIP_COUNTS,
  type CompaniesOwnershipCounts,
} from "@/components/companies/companiesFilterConfig";
import { buildCompaniesSearchPayload } from "@/lib/companiesFilterPayload";
import type { FilterBarState } from "@/components/companies/CompaniesFilterBar";

export type ScopedCompaniesPanelProps = {
  primarySectorId?: number;
  secondarySectorId?: number;
  fixedOwnershipTypeIds?: number[];
  hideOwnershipTabs?: boolean;
  excludeFilterIds?: string[];
  embedded?: boolean;
  enableColumnControl?: boolean;
  enableFilterControl?: boolean;
  enableExport?: boolean;
  enableRowSelection?: boolean;
  uncappedExport?: boolean;
  columnsStorageKey?: string;
  columnsStorageScope?: ColumnStorageScope;
  defaultColumnKeys?: readonly string[];
  /** Lock primary sector filter chip and primary_sectors column (sector-scoped public lists). */
  lockSectorScope?: boolean;
};

function useScopedCompaniesSearch() {
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

  const scheduleCountsFetch = useCallback((countsFilters: CompaniesFilters) => {
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

      const filtersToUse =
        filters !== undefined ? filters : currentFiltersRef.current ?? createDefaultFilters();
      const countsFiltersToUse =
        countsFilters ??
        currentCountsFiltersRef.current ??
        filtersToUse;

      try {
        const serverFilters: CompaniesFilters = {
          ...filtersToUse,
          columns: requestColumnsRef.current,
        };
        const countsServerFilters: CompaniesFilters = {
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
          setPagination({
            itemsReceived: data.result1?.itemsReceived || 0,
            curPage: data.result1?.curPage || 1,
            nextPage: data.result1?.nextPage || null,
            prevPage: data.result1?.prevPage || null,
            offset: data.result1?.offset || 0,
            perPage: data.result1?.perPage || 20,
            pageTotal: data.result1?.pageTotal || 0,
            totalCount: data.result1?.itemsReceived || 0,
          });
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
    [scheduleCountsFetch]
  );

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
}

export function ScopedCompaniesPanel({
  primarySectorId,
  secondarySectorId,
  fixedOwnershipTypeIds,
  hideOwnershipTabs = false,
  excludeFilterIds = [],
  embedded = false,
  enableColumnControl = true,
  enableFilterControl = true,
  enableExport = true,
  enableRowSelection = true,
  uncappedExport = false,
  columnsStorageKey,
  columnsStorageScope = "session",
  defaultColumnKeys = DEFAULT_VISIBLE_COMPANY_COLUMN_KEYS,
  lockSectorScope = false,
}: ScopedCompaniesPanelProps) {
  const {
    companies,
    loading,
    error,
    pagination,
    ownershipCounts,
    fetchCompanies,
    setRequestColumns,
    currentFilters,
  } = useScopedCompaniesSearch();

  const scopedPrimarySectorIds = useMemo(
    () => (primarySectorId != null ? [primarySectorId] : []),
    [primarySectorId]
  );
  const scopedSecondarySectorIds = useMemo(
    () => (secondarySectorId != null ? [secondarySectorId] : []),
    [secondarySectorId]
  );

  const mergedExcludeFilterIds = useMemo(() => {
    const ids = [...excludeFilterIds];
    if (
      primarySectorId != null &&
      !lockSectorScope &&
      !ids.includes("primary_sector")
    ) {
      ids.push("primary_sector");
    }
    if (secondarySectorId != null && !ids.includes("secondary_sector")) {
      ids.push("secondary_sector");
    }
    return ids;
  }, [excludeFilterIds, primarySectorId, secondarySectorId, lockSectorScope]);

  const [isPortfolioOnlyFilter, setIsPortfolioOnlyFilter] = useState(false);

  const handleSearch = useCallback(
    (listFilters: Filters, countsFilters: Filters, portfolioOnly?: boolean) => {
      setIsPortfolioOnlyFilter(Boolean(portfolioOnly));
      fetchCompanies(1, listFilters, countsFilters);
    },
    [fetchCompanies]
  );

  const [filterPinnedColumnKeys, setFilterPinnedColumnKeys] = useState<string[]>(
    () => {
      const keys: string[] = [];
      if (fixedOwnershipTypeIds != null) keys.push("ownership");
      if (lockSectorScope && primarySectorId != null) keys.push("primary_sectors");
      return keys;
    }
  );

  const handleFilterColumnsChange = useCallback(
    ({
      filters,
      ownershipTabActive,
    }: {
      filters: Array<{ id: string; value: unknown }>;
      ownershipTabActive: boolean;
    }) => {
      if (!enableColumnControl) return;
      const next = getColumnKeysForActiveFilters(filters, ownershipTabActive);
      if (fixedOwnershipTypeIds != null && !next.includes("ownership")) {
        next.unshift("ownership");
      }
      if (lockSectorScope && primarySectorId != null && !next.includes("primary_sectors")) {
        next.unshift("primary_sectors");
      }
      setFilterPinnedColumnKeys(next);
    },
    [enableColumnControl, fixedOwnershipTypeIds, lockSectorScope, primarySectorId]
  );

  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [columnsCount, setColumnsCount] = useState(defaultColumnKeys.length);
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

  const emptySelectionSet = useMemo(() => new Set<number>(), []);
  const noopToggle = useCallback(() => {}, []);
  const noopTogglePage = useCallback(() => {}, []);

  const matchCountOverride =
    fixedOwnershipTypeIds != null ? pagination.itemsReceived : undefined;

  const emptyFilterState = useMemo<FilterBarState>(
    () => ({
      filters: [],
      viewId: null,
      searchText: "",
      filterLogic: "and",
    }),
    []
  );

  const buildScopedFilters = useCallback((): Filters => {
    return buildCompaniesSearchPayload({
      state: emptyFilterState,
      primarySectors: [],
      secondarySectors: [],
      ownershipTypes: [],
      ownershipTypeIds: fixedOwnershipTypeIds,
      scopedPrimarySectorIds,
      scopedSecondarySectorIds,
    });
  }, [
    emptyFilterState,
    fixedOwnershipTypeIds,
    scopedPrimarySectorIds,
    scopedSecondarySectorIds,
  ]);

  const scopeKey = useMemo(
    () =>
      JSON.stringify({
        primarySectorId,
        secondarySectorId,
        fixedOwnershipTypeIds,
      }),
    [primarySectorId, secondarySectorId, fixedOwnershipTypeIds]
  );

  useEffect(() => {
    if (primarySectorId == null && secondarySectorId == null) return;
    const filters = buildScopedFilters();
    fetchCompanies(1, filters, filters);
  }, [scopeKey, buildScopedFilters, fetchCompanies, primarySectorId, secondarySectorId]);

  const resolvedColumnsStorageKey =
    columnsStorageKey ??
    `sector-companies-column-keys-${primarySectorId ?? secondarySectorId ?? "scoped"}-${
      fixedOwnershipTypeIds?.join("-") ?? "all"
    }`;

  return (
    <div
      className={
        embedded
          ? "overflow-hidden bg-white rounded-xl border shadow-lg border-slate-200/60 px-5"
          : "min-h-screen"
      }
    >
      {(enableFilterControl || enableColumnControl || enableExport) && (
        <CompanyDashboard
          onSearch={enableFilterControl ? handleSearch : undefined}
          onFilterColumnsChange={handleFilterColumnsChange}
          ownershipCounts={ownershipCounts}
          onColumnsClick={
            enableColumnControl ? () => setShowColumnsModal((v) => !v) : undefined
          }
          onExport={
            enableExport
              ? (mode) =>
                  exportCSVRef.current?.({ mode, scope: "full_list" })
              : undefined
          }
          exporting={exporting}
          columnsCount={columnsCount}
          columnsActive={showColumnsModal}
          hidePageHeader={embedded}
          hideOwnershipTabs={hideOwnershipTabs || fixedOwnershipTypeIds != null}
          excludeFilterIds={mergedExcludeFilterIds}
          matchCountOverride={matchCountOverride}
          scopedPrimarySectorIds={scopedPrimarySectorIds}
          scopedSecondarySectorIds={scopedSecondarySectorIds}
          fixedOwnershipTypeIds={fixedOwnershipTypeIds}
          embedded={embedded}
          hideFilterBar={!enableFilterControl}
          lockPrimarySectorFilter={lockSectorScope}
          selectedCount={enableRowSelection ? selectedCompanyIds.size : 0}
        />
      )}
      <CompanySection
        companies={companies}
        loading={loading}
        error={error}
        pagination={pagination}
        ownershipCounts={ownershipCounts}
        fetchCompanies={fetchCompanies}
        setRequestColumns={setRequestColumns}
        currentFilters={currentFilters}
        filterPinnedColumnKeys={enableColumnControl ? filterPinnedColumnKeys : []}
        externalShowColumnsModal={enableColumnControl ? showColumnsModal : false}
        externalSetShowColumnsModal={
          enableColumnControl ? setShowColumnsModal : undefined
        }
        onColumnsCountChange={setColumnsCount}
        onRegisterExportCSV={
          enableExport
            ? (fn) => {
                exportCSVRef.current = fn;
              }
            : undefined
        }
        onExportingChange={setExporting}
        selectedCompanyIds={
          enableRowSelection ? selectedCompanyIds : emptySelectionSet
        }
        onToggleCompanySelection={
          enableRowSelection ? toggleCompanySelection : noopToggle
        }
        onTogglePageSelection={
          enableRowSelection ? togglePageSelection : noopTogglePage
        }
        onClearSelection={enableRowSelection ? clearSelection : () => {}}
        isPortfolioOnlyFilter={isPortfolioOnlyFilter}
        embedded={embedded}
        columnsStorageKey={resolvedColumnsStorageKey}
        columnsStorageScope={columnsStorageScope}
        defaultColumnKeys={defaultColumnKeys}
        uncappedExport={uncappedExport}
        enableColumnControl={enableColumnControl}
      />
    </div>
  );
}
