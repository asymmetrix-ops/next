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
  type PrimarySector,
  type SecondarySector,
  type OwnershipType,
  type OwnershipTab,
} from "@/components/companies/companiesFilterConfig";
import { SearchColumnsButton } from "@/components/search/SearchColumnsButton";
import { SearchExportMenu } from "@/components/search/SearchExportMenu";
import type { ListExportMode } from "@/lib/listExport/types";
import {
  SEARCH_DASHBOARD_ACTIONS,
  SEARCH_DASHBOARD_EYEBROW,
  SEARCH_DASHBOARD_HEADER_ROW,
  SEARCH_DASHBOARD_MATCH_COUNT,
  SEARCH_DASHBOARD_TITLE,
  SearchListTabs,
} from "@/components/search/searchDashboardLayout";
import { useLocationFilterOptions } from "@/components/search/useLocationFilterOptions";
import { McpGuestTrackerToolbarActions } from "@/components/mcp-guest/McpGuestTrackerToolbarActions";
import { MCP_GUEST_TRACKER_SUBTITLE, MCP_GUEST_TRACKER_TITLE } from "@/lib/mcpGuest";

export type CompanyDashboardProps = {
  onSearch?: (listFilters: Filters, countsFilters: Filters, portfolioOnly?: boolean) => void;
  onFilterColumnsChange?: (payload: {
    filters: Array<{ id: string; value: unknown }>;
    ownershipTabActive: boolean;
  }) => void;
  initialSearch?: string;
  ownershipCounts?: CompaniesOwnershipCounts;
  onColumnsClick?: () => void;
  columnsActive?: boolean;
  onExport?: (mode: ListExportMode) => void | Promise<void>;
  exporting?: boolean;
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
  guestMode?: boolean;
};

export const CompanyDashboard = ({
  onSearch,
  onFilterColumnsChange,
  initialSearch,
  ownershipCounts = EMPTY_OWNERSHIP_COUNTS,
  onColumnsClick,
  onExport,
  exporting = false,
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
  guestMode = false,
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
  const [continentalRegions, setContinentalRegions] = useState<string[]>([]);
  const [subRegions, setSubRegions] = useState<string[]>([]);
  const [primarySectors, setPrimarySectors] = useState<PrimarySector[]>([]);
  const [secondarySectors, setSecondarySectors] = useState<SecondarySector[]>([]);
  const [ownershipTypes, setOwnershipTypes] = useState<OwnershipType[]>([]);
  const [portfolioCompanyIds, setPortfolioCompanyIds] = useState<number[]>([]);
  const [hybridBusinessFocusIds, setHybridBusinessFocusIds] = useState<number[]>([]);

  const { countries, provinces, cities } = useLocationFilterOptions(filterBarState);

  const selectedPrimaryNames = useMemo(() => {
    const item = filterBarState.filters.find((f) => f.id === "primary_sector");
    return Array.isArray(item?.value) ? (item.value as string[]) : [];
  }, [filterBarState.filters]);

  // ── Reference data fetching ───────────────────────────────────────────
  useEffect(() => {
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
      filters: filterBarState.filters.map((filter) => ({
        id: filter.id,
        value: filter.value,
      })),
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
            ...SEARCH_DASHBOARD_HEADER_ROW,
            marginBottom: embedded ? 12 : 18,
            width: embedded ? "100%" : undefined,
          }}
        >
          {!hidePageHeader && (
          <div>
            {!guestMode && (
              <div style={SEARCH_DASHBOARD_EYEBROW}>Companies</div>
            )}
            <h1 style={SEARCH_DASHBOARD_TITLE}>
              {guestMode ? MCP_GUEST_TRACKER_TITLE : "Company search"}
              <span style={SEARCH_DASHBOARD_MATCH_COUNT}>
                {matchCount.toLocaleString()} matches
              </span>
            </h1>
            {guestMode ? (
              <p
                style={{
                  margin: "8px 0 0",
                  maxWidth: 640,
                  fontSize: 15,
                  lineHeight: 1.5,
                  color: "#64748b",
                }}
              >
                {MCP_GUEST_TRACKER_SUBTITLE}
              </p>
            ) : null}
          </div>
          )}

          {/* Action buttons */}
          {guestMode ? (
            <div
              style={{
                ...SEARCH_DASHBOARD_ACTIONS,
                marginLeft: hidePageHeader ? "auto" : undefined,
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
              <McpGuestTrackerToolbarActions />
            </div>
          ) : (
          <div
            style={{
              ...SEARCH_DASHBOARD_ACTIONS,
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
            <SearchExportMenu
              onExport={(mode) => onExport?.(mode)}
              exporting={exporting}
              disabled={!onExport}
            />
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
          )}
        </div>

        {/* ── Ownership quick-filter tabs ── */}
        {!guestMode && !hideOwnershipTabs && !fixedOwnershipTypeIds && (
        <SearchListTabs
          tabs={ownershipTabs}
          activeTabId={activeOwnershipTab}
          onTabClick={(tabId) => setActiveOwnershipTab(tabId as OwnershipTab)}
          renderTabWrapper={(tab, button) => {
            if (tab.id !== "other") return button;
            return (
              <div className="ownership-tab-other-tooltip-wrap">
                {button}
                <div className="ownership-tab-other-tooltip" role="tooltip">
                  <ul>
                    {OTHER_OWNERSHIP_TOOLTIP_LABELS.map((label) => (
                      <li key={label}>{label}</li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          }}
        />
        )}
      </div>

      {!guestMode && (
      /* ── Filter bar card ── */
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
      )}
    </div>
  );
};
