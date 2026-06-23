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
  buildCompaniesCountsSearchPayload,
  buildCompaniesSearchPayload,
} from "@/lib/companiesFilterPayload";
import { fetchUserPortfolioRecord } from "@/lib/portfolioFollow";
import {
  CompaniesFilterBar,
  FilterBarState,
} from "@/components/companies/CompaniesFilterBar";
import { CANONICAL_COMPANY_COLUMN_KEYS } from "@/components/companies/companiesColumnCategories";
import type { Filters } from "@/components/companies/CompanySection";
import {
  FILTER_CATEGORIES,
  buildCompaniesFilterDefs,
  OTHER_OWNERSHIP_TOOLTIP_LABELS,
  OWNERSHIP_OTHER_TOOLTIP_STYLES,
  OWNERSHIP_TAB_CONFIG,
  EMPTY_OWNERSHIP_COUNTS,
  type CompaniesOwnershipCounts,
  type Country,
  type Province,
  type City,
  type PrimarySector,
  type SecondarySector,
  type OwnershipType,
  type OwnershipTab,
} from "@/components/companies/companiesFilterConfig";
import { SearchColumnsButton } from "@/components/search/SearchColumnsButton";

export type CompanyDashboardProps = {
  onSearch?: (listFilters: Filters, countsFilters: Filters, portfolioOnly?: boolean) => void;
  onFilterColumnsChange?: (payload: {
    filterIds: string[];
    ownershipTabActive: boolean;
  }) => void;
  initialSearch?: string;
  ownershipCounts?: CompaniesOwnershipCounts;
  onColumnsClick?: () => void;
  columnsActive?: boolean;
  onExportCSVClick?: () => void;
  onAddToPortfolioClick?: () => void;
  selectedCount?: number;
  columnsCount?: number;
  hidePageHeader?: boolean;
  hideOwnershipTabs?: boolean;
  excludeFilterIds?: string[];
  matchCountOverride?: number;
  scopedPrimarySectorIds?: number[];
  scopedSecondarySectorIds?: number[];
  fixedOwnershipTypeIds?: number[];
  embedded?: boolean;
};

export const CompanyDashboard = ({
  onSearch,
  onFilterColumnsChange,
  initialSearch,
  ownershipCounts = EMPTY_OWNERSHIP_COUNTS,
  onColumnsClick,
  onExportCSVClick,
  onAddToPortfolioClick,
  selectedCount = 0,
  columnsCount = 0,
  columnsActive = false,
  hidePageHeader = false,
  hideOwnershipTabs = false,
  excludeFilterIds = [],
  matchCountOverride,
  scopedPrimarySectorIds = [],
  scopedSecondarySectorIds = [],
  fixedOwnershipTypeIds,
  embedded = false,
}: CompanyDashboardProps) => {
  // Unified filter bar state — replaces all the individual selected-* state vars
  const [filterBarState, setFilterBarState] = useState<FilterBarState>({
    filters: [],
    viewId: null,
    searchText: initialSearch || "",
    filterLogic: "and",
  });

  // Ownership quick-filter tab — independent of FilterBar chips
  const [activeOwnershipTab, setActiveOwnershipTab] = useState<OwnershipTab>("all");

  // Option data (fetched from API)
  const [countries, setCountries] = useState<Country[]>([]);
  const [continentalRegions, setContinentalRegions] = useState<string[]>([]);
  const [subRegions, setSubRegions] = useState<string[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [primarySectors, setPrimarySectors] = useState<PrimarySector[]>([]);
  const [secondarySectors, setSecondarySectors] = useState<SecondarySector[]>([]);
  const [ownershipTypes, setOwnershipTypes] = useState<OwnershipType[]>([]);
  const [portfolioCompanyIds, setPortfolioCompanyIds] = useState<number[]>([]);
  const [hybridBusinessFocusIds, setHybridBusinessFocusIds] = useState<number[]>([]);

  // ── Derived selected values for dependent fetches ───────────────────────
  const selectedCountries = useMemo(() => {
    const item = filterBarState.filters.find((f) => f.id === "country");
    return Array.isArray(item?.value) ? (item.value as string[]) : [];
  }, [filterBarState.filters]);

  const selectedProvinces = useMemo(() => {
    const item = filterBarState.filters.find((f) => f.id === "state");
    return Array.isArray(item?.value) ? (item.value as string[]) : [];
  }, [filterBarState.filters]);

  const selectedPrimaryNames = useMemo(() => {
    const item = filterBarState.filters.find((f) => f.id === "primary_sector");
    return Array.isArray(item?.value) ? (item.value as string[]) : [];
  }, [filterBarState.filters]);

  // ── Reference data fetching ───────────────────────────────────────────
  useEffect(() => {
    locationsService.getCountries().then(setCountries).catch(console.error);
    locationsService.getContinentalRegions().then(setContinentalRegions).catch(console.error);
    locationsService.getSubRegions().then(setSubRegions).catch(console.error);
    locationsService.getPrimarySectors().then(setPrimarySectors).catch(console.error);
    locationsService.getOwnershipTypes().then(setOwnershipTypes).catch(console.error);
    // Load all secondary sectors up front so the Sectors filter always has options.
    locationsService
      .getAllSecondarySectorsWithPrimary()
      .then((sectors) =>
        setSecondarySectors(sectors.map((s) => ({ id: s.id, sector_name: s.sector_name })))
      )
      .catch(console.error);
    // Hybrid business focus IDs (for business_focus SQL filter)
    locationsService
      .getHybridBusinessFocuses()
      .then((focuses) => setHybridBusinessFocusIds(focuses.map((f) => f.id)))
      .catch(console.error);
    // Portfolio company IDs (for portfolio_companies SQL filter)
    fetchUserPortfolioRecord()
      .then((record) => {
        if (record) setPortfolioCompanyIds(record.companies);
      })
      .catch(console.error);
  }, []);

  // Provinces depend on selected countries
  useEffect(() => {
    if (selectedCountries.length === 0) { setProvinces([]); return; }
    locationsService.getProvinces(selectedCountries).then(setProvinces).catch(console.error);
  }, [selectedCountries]);

  // Cities depend on selected countries + provinces
  useEffect(() => {
    if (selectedCountries.length === 0) { setCities([]); return; }
    locationsService.getCities(selectedCountries, selectedProvinces).then(setCities).catch(console.error);
  }, [selectedCountries, selectedProvinces]);

  // When specific primary sectors are selected, narrow the secondary sector list.
  // When none are selected we keep the full list loaded on mount.
  useEffect(() => {
    if (selectedPrimaryNames.length === 0) return;
    const ids = selectedPrimaryNames
      .map((name) => primarySectors.find((s) => s.sector_name === name)?.id)
      .filter((id): id is number => id != null);
    if (ids.length > 0) {
      locationsService.getSecondarySectors(ids).then(setSecondarySectors).catch(console.error);
    }
  }, [selectedPrimaryNames, primarySectors]);

  // ── Build dynamic filter defs from API data ────────────────────────────
  const filterDefs = useMemo(() => {
    const defs = buildCompaniesFilterDefs({
      continentalRegions,
      subRegions,
      countries,
      provinces,
      cities,
      primarySectors,
      secondarySectors,
      ownershipTypes,
    });
    if (excludeFilterIds.length === 0) return defs;
    const excluded = new Set(excludeFilterIds);
    return defs.filter((def) => !excluded.has(def.id));
  }, [
    continentalRegions,
    subRegions,
    countries,
    provinces,
    cities,
    primarySectors,
    secondarySectors,
    ownershipTypes,
    excludeFilterIds,
  ]);

  const onFilterColumnsChangeRef = useRef(onFilterColumnsChange);
  onFilterColumnsChangeRef.current = onFilterColumnsChange;

  useEffect(() => {
    onFilterColumnsChangeRef.current?.({
      filterIds: filterBarState.filters.map((filter) => filter.id),
      ownershipTabActive: activeOwnershipTab !== "all",
    });
  }, [filterBarState.filters, activeOwnershipTab]);

  // ── Auto-search on filter state or ownership tab changes ──────────────
  const buildGlobalSearchFilters = useCallback((): Filters => {
    return buildCompaniesCountsSearchPayload({
      state: filterBarState,
      primarySectors,
      secondarySectors,
      ownershipTypes,
      scopedPrimarySectorIds,
      scopedSecondarySectorIds,
      portfolioCompanyIds,
      hybridBusinessFocusIds,
    });
  }, [
    filterBarState,
    primarySectors,
    secondarySectors,
    ownershipTypes,
    scopedPrimarySectorIds,
    scopedSecondarySectorIds,
    portfolioCompanyIds,
    hybridBusinessFocusIds,
  ]);

  const buildSearchFilters = useCallback((): Filters => {
    const tabOwnershipTypeIds =
      activeOwnershipTab !== "all"
        ? [...OWNERSHIP_TAB_CONFIG[activeOwnershipTab].ownershipTypeIds]
        : undefined;
    return buildCompaniesSearchPayload({
      state: filterBarState,
      primarySectors,
      secondarySectors,
      ownershipTypes,
      ownershipTypeIds: fixedOwnershipTypeIds ?? tabOwnershipTypeIds,
      scopedPrimarySectorIds,
      scopedSecondarySectorIds,
      portfolioCompanyIds,
      hybridBusinessFocusIds,
    });
  }, [
    filterBarState,
    activeOwnershipTab,
    primarySectors,
    secondarySectors,
    ownershipTypes,
    fixedOwnershipTypeIds,
    scopedPrimarySectorIds,
    scopedSecondarySectorIds,
    portfolioCompanyIds,
    hybridBusinessFocusIds,
  ]);

  const buildGlobalSearchFiltersRef = useRef(buildGlobalSearchFilters);
  buildGlobalSearchFiltersRef.current = buildGlobalSearchFilters;

  const isPortfolioFilterActive = filterBarState.filters.some(
    (f) => f.id === "followed" && f.value === true
  );
  const isPortfolioFilterActiveRef = useRef(isPortfolioFilterActive);
  isPortfolioFilterActiveRef.current = isPortfolioFilterActive;

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
      onSearchRef.current?.(
        buildSearchFiltersRef.current(),
        buildGlobalSearchFiltersRef.current(),
        isPortfolioFilterActiveRef.current
      );
    }, 350);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [filterSearchKey]);

  // AND/OR per-separator — refetch immediately after state commits (not debounced).
  useEffect(() => {
    const prev = prevFilterCombineKeyRef.current;
    prevFilterCombineKeyRef.current = filterCombineKey;

    if (skipInitialFilterCombineRef.current) {
      skipInitialFilterCombineRef.current = false;
      return;
    }
    if (prev === filterCombineKey) return;
    if (filterBarState.filters.length < 2) return;

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    onSearchRef.current?.(
      buildSearchFiltersRef.current(),
      buildGlobalSearchFiltersRef.current(),
      isPortfolioFilterActiveRef.current
    );
  }, [filterCombineKey, filterBarState.filters.length]);

  const skipInitialOwnershipTabRef = useRef(true);
  useEffect(() => {
    if (skipInitialOwnershipTabRef.current) {
      skipInitialOwnershipTabRef.current = false;
      return;
    }
    onSearchRef.current?.(
      buildSearchFiltersRef.current(),
      buildGlobalSearchFiltersRef.current(),
      isPortfolioFilterActiveRef.current
    );
  }, [activeOwnershipTab]);

  // ── Ownership tabs data ────────────────────────────────────────────────
  const ownershipTabOrder: Exclude<OwnershipTab, "all">[] = [
    "public",
    "pe",
    "vc",
    "private",
    "subsidiary",
    "acquired",
    "other",
  ];

  const ownershipTabs: { id: OwnershipTab; label: string; count: number; dot: string }[] = [
    { id: "all", label: "All", count: ownershipCounts.totalCount, dot: "#64748b" },
    ...ownershipTabOrder.map((id) => ({
      id,
      label: OWNERSHIP_TAB_CONFIG[id].label,
      count: ownershipCounts[OWNERSHIP_TAB_CONFIG[id].countKey],
      dot: OWNERSHIP_TAB_CONFIG[id].dot,
    })),
  ];

  const matchCount =
    matchCountOverride ??
    (activeOwnershipTab === "all"
      ? ownershipCounts.totalCount
      : ownershipTabs.find((tab) => tab.id === activeOwnershipTab)?.count ??
        ownershipCounts.totalCount);

  const horizontalPad = embedded ? "0" : "28px";
  const topPad = embedded ? "16px" : "20px";

  return (
    <div
      style={{
        background: embedded ? "#fff" : "#f8fafc",
        borderBottom: embedded ? "none" : "1px solid #e2e8f0",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: OWNERSHIP_OTHER_TOOLTIP_STYLES }} />
      <div style={{ width: "100%", padding: `${topPad} ${horizontalPad} 0` }}>

        {/* ── Header row: eyebrow + title + action buttons ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: embedded ? 12 : 18,
            width: embedded ? "100%" : undefined,
          }}
        >
          {!hidePageHeader && (
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
              Companies
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
              Company search
              <span style={{ fontSize: 16, fontWeight: 400, color: "#94a3b8" }}>
                {matchCount.toLocaleString()} matches
              </span>
            </h1>
          </div>
          )}

          {/* Action buttons */}
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              paddingTop: 6,
              marginLeft: hidePageHeader ? "auto" : undefined,
              width: hidePageHeader && embedded ? "100%" : undefined,
              justifyContent: hidePageHeader && embedded ? "flex-end" : undefined,
            }}
          >
            <SearchColumnsButton
              active={columnsActive}
              count={columnsCount}
              total={CANONICAL_COMPANY_COLUMN_KEYS.length}
              onClick={onColumnsClick}
            />
            <button
              onClick={onExportCSVClick}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                height: 36, padding: "0 14px",
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                fontSize: 13, fontWeight: 500, color: "#374151",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              <svg width="12" height="14" viewBox="0 0 12 14" fill="none" aria-hidden="true">
                <path d="M6 1v8M3 6l3 3 3-3M1 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
                display: "flex", alignItems: "center", gap: 6,
                height: 36, padding: "0 16px",
                background: selectedCount > 0 ? "#0f172a" : "#94a3b8",
                color: "#fff",
                border: "none", borderRadius: 8,
                fontSize: 13, fontWeight: 600,
                cursor: selectedCount > 0 ? "pointer" : "not-allowed",
                opacity: selectedCount > 0 ? 1 : 0.85,
              }}
            >
              + Add to portfolio
              {selectedCount > 0 ? ` (${selectedCount.toLocaleString()})` : ""}
            </button>
          </div>
        </div>

        {/* ── Ownership quick-filter tabs ── */}
        {!hideOwnershipTabs && !fixedOwnershipTypeIds && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {ownershipTabs.map((tab) => {
            const active = activeOwnershipTab === tab.id;
            const tabButton = (
              <button
                onClick={() => setActiveOwnershipTab(tab.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  height: 34, padding: "0 14px",
                  background: active ? "#0f172a" : "transparent",
                  color: active ? "#fff" : "#64748b",
                  border: "1px solid",
                  borderColor: active ? "#0f172a" : "transparent",
                  borderBottom: "none",
                  borderRadius: "8px 8px 0 0",
                  fontSize: 13, fontWeight: active ? 600 : 500,
                  cursor: "pointer",
                  transition: "background 0.12s, color 0.12s",
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    width: 7, height: 7, borderRadius: "50%",
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

            if (tab.id !== "other") {
              return React.cloneElement(tabButton, { key: tab.id });
            }

            return (
              <div
                key={tab.id}
                className="ownership-tab-other-tooltip-wrap"
              >
                {tabButton}
                <div className="ownership-tab-other-tooltip" role="tooltip">
                  <ul>
                    {OTHER_OWNERSHIP_TOOLTIP_LABELS.map((label) => (
                      <li key={label}>{label}</li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* ── Filter bar card ── */}
      <div
        style={{
          background: "#fff",
          borderTop: embedded ? "none" : "1px solid #e2e8f0",
          borderBottom: "1px solid #e2e8f0",
        }}
      >
        <div style={{ width: "100%", padding: `10px ${horizontalPad} 12px` }}>
          <CompaniesFilterBar
            filterDefs={filterDefs}
            filterCategories={FILTER_CATEGORIES}
            state={filterBarState}
            onStateChange={setFilterBarState}
            totalCount={matchCount}
          />
        </div>
      </div>
    </div>
  );
};
