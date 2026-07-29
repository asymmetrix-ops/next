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
} from "@/components/investors/investorsFilterConfig";
import {
  fetchSectorMostActiveInvestors,
  fetchSectorMostActiveStrategicAsInvestors,
} from "@/lib/sectorMostActiveClientApi";

export type SectorMostActiveRankedKind = "pe" | "venture" | "strategic";

export type ScopedInvestorsPanelProps = {
  primarySectorId: number;
  rankedKind: SectorMostActiveRankedKind;
  investorTypeTab?: Exclude<InvestorTypeTab, "all">;
  profileHrefPrefix?: string;
  embedded?: boolean;
  columnsStorageKey?: string;
  defaultColumnKeys?: readonly string[];
};

function useScopedInvestorsSearch(
  primarySectorId: number,
  rankedKind: SectorMostActiveRankedKind
) {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastRequestIdRef = useRef(0);
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
  const [typeCounts] = useState<InvestorsTypeCounts>(EMPTY_INVESTOR_TYPE_COUNTS);

  const fetchInvestors = useCallback(
    async (page: number = 1) => {
      const requestId = ++lastRequestIdRef.current;
      setLoading(true);
      setError(null);
      setCurrentFilters(createDefaultInvestorFilters());

      try {
        const data =
          rankedKind === "strategic"
            ? await fetchSectorMostActiveStrategicAsInvestors(
                primarySectorId,
                page
              )
            : await fetchSectorMostActiveInvestors(
                rankedKind,
                primarySectorId,
                page
              );

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
        }
      } catch (err) {
        if (requestId === lastRequestIdRef.current) {
          setError(
            err instanceof Error ? err.message : "Failed to fetch investors"
          );
        }
        console.error("Error fetching sector investors:", err);
      } finally {
        if (requestId === lastRequestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [rankedKind, primarySectorId]
  );

  return {
    investors,
    loading,
    error,
    pagination,
    typeCounts,
    fetchInvestors,
    currentFilters,
  };
}

export function ScopedInvestorsPanel({
  primarySectorId,
  rankedKind,
  investorTypeTab,
  profileHrefPrefix = "/investors",
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
    fetchInvestors,
    currentFilters,
  } = useScopedInvestorsSearch(primarySectorId, rankedKind);

  const scopedPrimarySectorIds = useMemo(
    () => [primarySectorId],
    [primarySectorId]
  );

  const [showColumnsModal, setShowColumnsModal] = useState(false);
  const [columnsCount, setColumnsCount] = useState(defaultColumnKeys.length);

  const resolvedInvestorTypeTab: Exclude<InvestorTypeTab, "all"> =
    investorTypeTab ??
    (rankedKind === "venture" ? "venture_capital" : "private_equity");

  const scopeKey = useMemo(
    () => JSON.stringify({ primarySectorId, rankedKind }),
    [primarySectorId, rankedKind]
  );

  useEffect(() => {
    fetchInvestors(1);
  }, [scopeKey, fetchInvestors]);

  const resolvedColumnsStorageKey =
    columnsStorageKey ??
    `sector-investors-column-keys-${primarySectorId}-${rankedKind}`;

  return (
    <div
      className={
        embedded
          ? "overflow-hidden bg-white rounded-xl border shadow-lg border-slate-200/60 px-5"
          : "min-h-screen"
      }
    >
      <InvestorDashboard
        investorTypes={[]}
        typeCounts={typeCounts}
        onColumnsClick={() => setShowColumnsModal((v) => !v)}
        columnsActive={showColumnsModal}
        columnsCount={columnsCount}
        hidePageHeader={embedded}
        embedded={embedded}
        hideFilterBar
        hideExport
        hideTypeTabs
        fixedInvestorTypeTab={resolvedInvestorTypeTab}
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
        profileHrefPrefix={profileHrefPrefix}
      />
    </div>
  );
}
