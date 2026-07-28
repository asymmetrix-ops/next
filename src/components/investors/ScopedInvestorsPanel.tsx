"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InvestorDashboard } from "@/components/investors/InvestorDashboard";
import {
  InvestorSection,
  type Investor,
  type Filters,
} from "@/components/investors/InvestorSection";
import { createDefaultInvestorFilters } from "@/lib/investorsFilterPayload";
import {
  SECTOR_MOST_ACTIVE_INVESTOR_COLUMN_KEYS,
} from "@/components/investors/investorsColumnCategories";
import type { InvestorTypeTab } from "@/components/investors/investorsFilterConfig";
import {
  EMPTY_INVESTOR_TYPE_COUNTS,
  type InvestorsTypeCounts,
  type InvestorTypeOption,
} from "@/components/investors/investorsFilterConfig";
import {
  fetchInvestorsServer,
  fetchInvestorTypesServer,
} from "@/app/investors/actions";
import type { FilterBarState } from "@/components/companies/CompaniesFilterBar";
import { buildInvestorsSearchPayload } from "@/lib/investorsFilterPayload";

export type ScopedInvestorsPanelProps = {
  primarySectorId: number;
  investorTypeTab: Exclude<InvestorTypeTab, "all">;
  embedded?: boolean;
  columnsStorageKey?: string;
  defaultColumnKeys?: readonly string[];
};

function useScopedInvestorsSearch() {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastRequestIdRef = useRef(0);
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
  const [typeCounts, setTypeCounts] =
    useState<InvestorsTypeCounts>(EMPTY_INVESTOR_TYPE_COUNTS);
  const [investorTypes, setInvestorTypes] = useState<InvestorTypeOption[]>([]);

  const fetchInvestors = useCallback(
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
          : currentFiltersRef.current ?? createDefaultInvestorFilters();

      try {
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
    []
  );

  useEffect(() => {
    void fetchInvestorTypesServer().then(setInvestorTypes).catch(console.error);
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
}

export function ScopedInvestorsPanel({
  primarySectorId,
  investorTypeTab,
  embedded = true,
  columnsStorageKey,
  defaultColumnKeys = SECTOR_MOST_ACTIVE_INVESTOR_COLUMN_KEYS,
}: ScopedInvestorsPanelProps) {
  const {
    investors,
    loading,
    error,
    pagination,
    typeCounts,
    investorTypes,
    fetchInvestors,
    currentFilters,
  } = useScopedInvestorsSearch();

  const scopedPrimarySectorIds = useMemo(
    () => [primarySectorId],
    [primarySectorId]
  );

  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [columnsCount, setColumnsCount] = useState(defaultColumnKeys.length);

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
    return buildInvestorsSearchPayload({
      state: emptyFilterState,
      primarySectors: [],
      secondarySectors: [],
      investorTypes,
      investorTypeTab,
      scopedPrimarySectorIds,
    });
  }, [emptyFilterState, investorTypes, investorTypeTab, scopedPrimarySectorIds]);

  const scopeKey = useMemo(
    () => JSON.stringify({ primarySectorId, investorTypeTab }),
    [primarySectorId, investorTypeTab]
  );

  useEffect(() => {
    if (investorTypes.length === 0) return;
    const filters = buildScopedFilters();
    fetchInvestors(1, filters);
  }, [scopeKey, buildScopedFilters, fetchInvestors, investorTypes.length]);

  const resolvedColumnsStorageKey =
    columnsStorageKey ??
    `sector-investors-column-keys-${primarySectorId}-${investorTypeTab}`;

  return (
    <div
      className={
        embedded
          ? "overflow-hidden bg-white rounded-xl border shadow-lg border-slate-200/60 px-5"
          : "min-h-screen"
      }
    >
      <InvestorDashboard
        investorTypes={investorTypes}
        typeCounts={typeCounts}
        onColumnsClick={() => setShowColumnsModal((v) => !v)}
        columnsActive={showColumnsModal}
        columnsCount={columnsCount}
        hidePageHeader={embedded}
        embedded={embedded}
        hideFilterBar
        hideExport
        hideTypeTabs
        fixedInvestorTypeTab={investorTypeTab}
        excludeFilterIds={["primary_sector"]}
        scopedPrimarySectorIds={scopedPrimarySectorIds}
        matchCountOverride={pagination.itemsTotal}
      />
      <InvestorSection
        investors={investors}
        loading={loading}
        error={error}
        pagination={pagination}
        fetchInvestors={fetchInvestors}
        currentFilters={currentFilters}
        externalShowColumnsModal={showColumnsModal}
        externalSetShowColumnsModal={setShowColumnsModal}
        onColumnsCountChange={setColumnsCount}
        columnsStorageKey={resolvedColumnsStorageKey}
        columnsStorageScope="session"
        defaultColumnKeys={defaultColumnKeys}
      />
    </div>
  );
}
