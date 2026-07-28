"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CompanySection,
  type Company,
  type Filters,
} from "@/components/companies/CompanySection";
import {
  EMPTY_OWNERSHIP_COUNTS,
  type CompaniesOwnershipCounts,
} from "@/components/companies/companiesFilterConfig";
import { fetchSectorMostActiveStrategicAcquirers } from "@/lib/sectorMostActiveClientApi";

export type ScopedSectorStrategicPanelProps = {
  primarySectorId: number;
  embedded?: boolean;
};

const STRATEGIC_DEFAULT_COLUMN_KEYS = ["name", "description", "country"] as const;

function useScopedStrategicSearch(primarySectorId: number) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastRequestIdRef = useRef(0);
  const [pagination, setPagination] = useState({
    itemsReceived: 0,
    curPage: 1,
    nextPage: null as number | null,
    prevPage: null as number | null,
    offset: 0,
    perPage: 25,
    pageTotal: 0,
    totalCount: 0,
  });
  const [ownershipCounts] = useState<CompaniesOwnershipCounts>(
    EMPTY_OWNERSHIP_COUNTS
  );
  const requestColumnsRef = useRef<string[]>([]);

  const setRequestColumns = useCallback((columns: string[]) => {
    requestColumnsRef.current = columns;
  }, []);

  const fetchCompanies = useCallback(
    async (page: number = 1) => {
      const requestId = ++lastRequestIdRef.current;
      setLoading(true);
      setError(null);

      try {
        const data = await fetchSectorMostActiveStrategicAcquirers(
          primarySectorId,
          page
        );

        if (!data) {
          throw new Error(
            "Failed to fetch strategic acquirers - authentication required"
          );
        }

        if (requestId === lastRequestIdRef.current) {
          setCompanies(data.items);
          setPagination({
            itemsReceived: data.items.length,
            curPage: data.curPage,
            nextPage: data.nextPage,
            prevPage: data.prevPage,
            offset: (data.curPage - 1) * 25,
            perPage: 25,
            pageTotal: data.pageTotal,
            totalCount: data.itemsTotal,
          });
        }
      } catch (err) {
        if (requestId === lastRequestIdRef.current) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to fetch strategic acquirers"
          );
        }
        console.error("Error fetching sector strategic acquirers:", err);
      } finally {
        if (requestId === lastRequestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [primarySectorId]
  );

  return {
    companies,
    loading,
    error,
    pagination,
    ownershipCounts,
    fetchCompanies,
    setRequestColumns,
    currentFilters: undefined as Filters | undefined,
  };
}

export function ScopedSectorStrategicPanel({
  primarySectorId,
  embedded = true,
}: ScopedSectorStrategicPanelProps) {
  const {
    companies,
    loading,
    error,
    pagination,
    ownershipCounts,
    fetchCompanies,
    setRequestColumns,
    currentFilters,
  } = useScopedStrategicSearch(primarySectorId);

  const emptySelectionSet = useMemo(() => new Set<number>(), []);
  const noopToggle = useCallback(() => {}, []);
  const noopTogglePage = useCallback(() => {}, []);

  useEffect(() => {
    fetchCompanies(1);
  }, [fetchCompanies, primarySectorId]);

  return (
    <div
      className={
        embedded
          ? "overflow-hidden bg-white rounded-xl border shadow-lg border-slate-200/60 px-5"
          : "min-h-screen"
      }
    >
      <CompanySection
        companies={companies}
        loading={loading}
        error={error}
        pagination={pagination}
        ownershipCounts={ownershipCounts}
        fetchCompanies={fetchCompanies}
        setRequestColumns={setRequestColumns}
        currentFilters={currentFilters}
        selectedCompanyIds={emptySelectionSet}
        onToggleCompanySelection={noopToggle}
        onTogglePageSelection={noopTogglePage}
        onClearSelection={noopToggle}
        embedded={embedded}
        defaultColumnKeys={STRATEGIC_DEFAULT_COLUMN_KEYS}
        enableColumnControl={false}
      />
    </div>
  );
}
