"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdvisorDashboard } from "@/components/advisors/AdvisorDashboard";
import {
  AdvisorSection,
  type Advisor,
  type Filters,
} from "@/components/advisors/AdvisorSection";
import {
  buildAdvisorsSearchPayload,
  createDefaultAdvisorFilters,
} from "@/lib/advisorsFilterPayload";
import { SECTOR_MOST_ACTIVE_ADVISOR_COLUMN_KEYS } from "@/components/advisors/advisorsColumnCategories";
import {
  EMPTY_ADVISORS_ROLE_COUNTS,
  type AdvisorsRoleCounts,
} from "@/components/advisors/advisorsFilterConfig";
import { fetchAdvisorsServer } from "@/app/advisors/actions";
import type { FilterBarState } from "@/components/companies/CompaniesFilterBar";

export type ScopedAdvisorsPanelProps = {
  primarySectorId: number;
  embedded?: boolean;
  columnsStorageKey?: string;
  defaultColumnKeys?: readonly string[];
};

function useScopedAdvisorsSearch() {
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
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
  const [roleCounts, setRoleCounts] =
    useState<AdvisorsRoleCounts>(EMPTY_ADVISORS_ROLE_COUNTS);

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
          if (page === 1 && data.roleCounts) {
            setRoleCounts(data.roleCounts);
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
    []
  );

  return {
    advisors,
    loading,
    error,
    pagination,
    roleCounts,
    fetchAdvisors,
    currentFilters,
  };
}

export function ScopedAdvisorsPanel({
  primarySectorId,
  embedded = true,
  columnsStorageKey,
  defaultColumnKeys = SECTOR_MOST_ACTIVE_ADVISOR_COLUMN_KEYS,
}: ScopedAdvisorsPanelProps) {
  const {
    advisors,
    loading,
    error,
    pagination,
    roleCounts,
    fetchAdvisors,
    currentFilters,
  } = useScopedAdvisorsSearch();

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
    return buildAdvisorsSearchPayload({
      state: emptyFilterState,
      primarySectors: [],
      secondarySectors: [],
      scopedPrimarySectorIds,
    });
  }, [emptyFilterState, scopedPrimarySectorIds]);

  useEffect(() => {
    const filters = buildScopedFilters();
    fetchAdvisors(1, filters);
  }, [buildScopedFilters, fetchAdvisors, primarySectorId]);

  const resolvedColumnsStorageKey =
    columnsStorageKey ?? `sector-advisors-column-keys-${primarySectorId}`;

  return (
    <div
      className={
        embedded
          ? "overflow-hidden bg-white rounded-xl border shadow-lg border-slate-200/60 px-5"
          : "min-h-screen"
      }
    >
      <AdvisorDashboard
        roleCounts={roleCounts}
        onColumnsClick={() => setShowColumnsModal((v) => !v)}
        columnsActive={showColumnsModal}
        columnsCount={columnsCount}
        hidePageHeader={embedded}
        embedded={embedded}
        hideFilterBar
        hideExport
        hideRoleTabs
        excludeFilterIds={["primary_sector"]}
        scopedPrimarySectorIds={scopedPrimarySectorIds}
        matchCountOverride={pagination.itemsTotal}
      />
      <AdvisorSection
        advisors={advisors}
        loading={loading}
        error={error}
        pagination={pagination}
        fetchAdvisors={fetchAdvisors}
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
