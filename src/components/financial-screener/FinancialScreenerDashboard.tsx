"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { locationsService } from "@/lib/locationsService";
import {
  CompaniesFilterBar,
  type FilterBarState,
} from "@/components/companies/CompaniesFilterBar";
import {
  CANONICAL_FINANCIAL_SCREENER_COLUMN_KEYS,
} from "./financialScreenerColumnCategories";
import {
  buildFinancialScreenerSearchPayload,
  type FinancialScreenerFilters,
} from "./financialScreenerFilterPayload";
import {
  FINANCIAL_SCREENER_FILTER_CATEGORIES,
  FINANCIAL_SCREENER_OWNERSHIP_TAB_CONFIG,
  EMPTY_FINANCIAL_SCREENER_OWNERSHIP_COUNTS,
  buildFinancialScreenerFilterDefs,
  type FinancialScreenerOwnershipCounts,
  type FinancialScreenerOwnershipTab,
  type Country,
  type PrimarySector,
  type SecondarySector,
  type OwnershipType,
} from "./financialScreenerFilterConfig";

export type FinancialScreenerDashboardProps = {
  onSearch?: (filters: FinancialScreenerFilters) => void;
  onFilterColumnsChange?: (payload: {
    filterIds: string[];
    ownershipTabActive: boolean;
  }) => void;
  initialSearch?: string;
  ownershipCounts?: FinancialScreenerOwnershipCounts;
  onColumnsClick?: () => void;
  columnsActive?: boolean;
  onExportCSVClick?: () => void;
  onAddToPortfolioClick?: () => void;
  selectedCount?: number;
  columnsCount?: number;
  matchCount?: number;
  totalUniverseCount?: number;
};

export const FinancialScreenerDashboard = ({
  onSearch,
  onFilterColumnsChange,
  initialSearch,
  ownershipCounts = EMPTY_FINANCIAL_SCREENER_OWNERSHIP_COUNTS,
  onColumnsClick,
  onExportCSVClick,
  onAddToPortfolioClick,
  selectedCount = 0,
  columnsCount = 0,
  columnsActive = false,
  matchCount = 0,
  totalUniverseCount,
}: FinancialScreenerDashboardProps) => {
  const [filterBarState, setFilterBarState] = useState<FilterBarState>({
    filters: [],
    viewId: null,
    searchText: initialSearch || "",
    filterLogic: "and",
  });

  const [activeOwnershipTab, setActiveOwnershipTab] =
    useState<FinancialScreenerOwnershipTab>("all");

  const [countries, setCountries] = useState<Country[]>([]);
  const [primarySectors, setPrimarySectors] = useState<PrimarySector[]>([]);
  const [secondarySectors, setSecondarySectors] = useState<SecondarySector[]>([]);
  const [ownershipTypes, setOwnershipTypes] = useState<OwnershipType[]>([]);

  const selectedPrimaryNames = useMemo(() => {
    const item = filterBarState.filters.find((f) => f.id === "primary_sector");
    return Array.isArray(item?.value) ? (item.value as string[]) : [];
  }, [filterBarState.filters]);

  useEffect(() => {
    locationsService.getCountries().then(setCountries).catch(console.error);
    locationsService.getPrimarySectors().then(setPrimarySectors).catch(console.error);
    locationsService.getOwnershipTypes().then(setOwnershipTypes).catch(console.error);
    locationsService
      .getAllSecondarySectorsWithPrimary()
      .then((sectors) =>
        setSecondarySectors(sectors.map((s) => ({ id: s.id, sector_name: s.sector_name })))
      )
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedPrimaryNames.length === 0) return;
    const ids = selectedPrimaryNames
      .map((name) => primarySectors.find((s) => s.sector_name === name)?.id)
      .filter((id): id is number => id != null);
    if (ids.length > 0) {
      locationsService.getSecondarySectors(ids).then(setSecondarySectors).catch(console.error);
    }
  }, [selectedPrimaryNames, primarySectors]);

  const filterDefs = useMemo(
    () =>
      buildFinancialScreenerFilterDefs({
        countries,
        primarySectors,
        secondarySectors,
        ownershipTypes,
      }),
    [countries, primarySectors, secondarySectors, ownershipTypes]
  );

  const onFilterColumnsChangeRef = useRef(onFilterColumnsChange);
  onFilterColumnsChangeRef.current = onFilterColumnsChange;

  useEffect(() => {
    onFilterColumnsChangeRef.current?.({
      filterIds: filterBarState.filters.map((filter) => filter.id),
      ownershipTabActive: activeOwnershipTab !== "all",
    });
  }, [filterBarState.filters, activeOwnershipTab]);

  const buildSearchFilters = useCallback(
    (): FinancialScreenerFilters =>
      buildFinancialScreenerSearchPayload({
        state: filterBarState,
        ownershipTab: activeOwnershipTab,
        primarySectors,
        secondarySectors,
        ownershipTypes,
      }),
    [
      filterBarState,
      activeOwnershipTab,
      primarySectors,
      secondarySectors,
      ownershipTypes,
    ]
  );

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipInitialSearchRef = useRef(true);
  const buildSearchFiltersRef = useRef(buildSearchFilters);
  buildSearchFiltersRef.current = buildSearchFilters;
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;
  const prevFilterCombineKeyRef = useRef("");
  const skipInitialFilterCombineRef = useRef(true);

  const filterCombineKey = useMemo(
    () =>
      JSON.stringify({
        filterLogic: filterBarState.filterLogic,
        combine: filterBarState.filters.map((f, i) =>
          i === 0 ? null : (f.combineLogic ?? filterBarState.filterLogic)
        ),
      }),
    [filterBarState.filters, filterBarState.filterLogic]
  );

  const filterSearchKey = useMemo(
    () =>
      JSON.stringify({
        filters: filterBarState.filters,
        searchText: filterBarState.searchText,
      }),
    [filterBarState.filters, filterBarState.searchText]
  );

  useEffect(() => {
    if (skipInitialSearchRef.current) {
      skipInitialSearchRef.current = false;
      return;
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      onSearchRef.current?.(buildSearchFiltersRef.current());
    }, 350);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [filterSearchKey]);

  useEffect(() => {
    if (skipInitialFilterCombineRef.current) {
      skipInitialFilterCombineRef.current = false;
      prevFilterCombineKeyRef.current = filterCombineKey;
      return;
    }
    if (prevFilterCombineKeyRef.current !== filterCombineKey) {
      prevFilterCombineKeyRef.current = filterCombineKey;
      onSearchRef.current?.(buildSearchFiltersRef.current());
    }
  }, [filterCombineKey]);

  useEffect(() => {
    onSearchRef.current?.(buildSearchFiltersRef.current());
  }, [activeOwnershipTab]);

  const ownershipTabOrder: Exclude<FinancialScreenerOwnershipTab, "all">[] = [
    "public",
    "pe",
    "vc",
    "private",
  ];

  const ownershipTabs = [
    { id: "all" as const, label: "All", count: ownershipCounts.totalCount, dot: "#64748b" },
    ...ownershipTabOrder.map((id) => ({
      id,
      label: FINANCIAL_SCREENER_OWNERSHIP_TAB_CONFIG[id].label,
      count: ownershipCounts[FINANCIAL_SCREENER_OWNERSHIP_TAB_CONFIG[id].countKey],
      dot: FINANCIAL_SCREENER_OWNERSHIP_TAB_CONFIG[id].dot,
    })),
  ];

  const universeTotal = totalUniverseCount ?? ownershipCounts.totalCount;

  return (
    <div style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
      <div style={{ width: "100%", padding: "20px 28px 0" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 18,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: "#94a3b8",
                marginBottom: 5,
              }}
            >
              Financials
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: 26,
                fontWeight: 700,
                color: "#0f172a",
                display: "flex",
                alignItems: "baseline",
                gap: 10,
                lineHeight: 1.2,
              }}
            >
              Financial screener
              <span style={{ fontSize: 16, fontWeight: 400, color: "#94a3b8" }}>
                {matchCount.toLocaleString()}{" "}
                {matchCount === 1 ? "company" : "companies"}
              </span>
            </h1>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: 14,
                color: "#64748b",
                maxWidth: 560,
              }}
            >
              Screen companies on revenue, profitability, and valuation multiples.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              paddingTop: 6,
            }}
          >
            <button
              onClick={onColumnsClick}
              aria-pressed={columnsActive}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                height: 36,
                padding: "0 14px",
                background: columnsActive ? "#0f172a" : "#fff",
                border: columnsActive ? "1px solid #0f172a" : "1px solid #e2e8f0",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                color: columnsActive ? "#fff" : "#374151",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
                <path d="M0 1h14M0 5h10M0 9h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Columns {columnsCount}/{CANONICAL_FINANCIAL_SCREENER_COLUMN_KEYS.length}
            </button>
            <button
              onClick={onExportCSVClick}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                height: 36,
                padding: "0 14px",
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                color: "#374151",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              <svg width="12" height="14" viewBox="0 0 12 14" fill="none" aria-hidden="true">
                <path d="M6 1v8M3 6l3 3 3-3M1 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Export CSV
            </button>
            <button
              onClick={onAddToPortfolioClick}
              disabled={selectedCount === 0}
              title={
                selectedCount === 0
                  ? "Select companies in the table first"
                  : `Add ${selectedCount} selected ${selectedCount === 1 ? "company" : "companies"} to portfolio`
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                height: 36,
                padding: "0 16px",
                background: selectedCount > 0 ? "#0f172a" : "#94a3b8",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: selectedCount > 0 ? "pointer" : "not-allowed",
                opacity: selectedCount > 0 ? 1 : 0.85,
              }}
            >
              + Add to portfolio
              {selectedCount > 0 ? ` (${selectedCount.toLocaleString()})` : ""}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {ownershipTabs.map((tab) => {
            const active = activeOwnershipTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveOwnershipTab(tab.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  height: 34,
                  padding: "0 14px",
                  background: active ? "#0f172a" : "transparent",
                  color: active ? "#fff" : "#64748b",
                  border: "1px solid",
                  borderColor: active ? "#0f172a" : "transparent",
                  borderBottom: "none",
                  borderRadius: "8px 8px 0 0",
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: active ? "rgba(255,255,255,0.7)" : tab.dot,
                    flexShrink: 0,
                  }}
                />
                {tab.label}
                <span style={{ fontSize: 12, opacity: 0.75 }}>
                  {tab.count.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          background: "#fff",
          borderTop: "1px solid #e2e8f0",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <div style={{ width: "100%", padding: "10px 28px 12px" }}>
          <CompaniesFilterBar
            filterDefs={filterDefs}
            filterCategories={FINANCIAL_SCREENER_FILTER_CATEGORIES}
            state={filterBarState}
            onStateChange={setFilterBarState}
            totalCount={universeTotal}
          />
        </div>
      </div>
    </div>
  );
};
