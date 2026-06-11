"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  CompaniesFilterBar,
  FilterBarState,
} from "@/components/companies/CompaniesFilterBar";
import { CANONICAL_COMPANY_COLUMN_KEYS } from "@/components/companies/companiesColumnCategories";
import type { CompaniesFilters } from "@/app/companies/actions";
import { buildCompaniesSearchPayload } from "@/lib/companiesFilterPayload";
import { locationsService } from "@/lib/locationsService";
import { usePortfolioStore } from "@/store/portfolioStore";
import {
  buildCompaniesFilterDefs,
  EMPTY_OWNERSHIP_COUNTS,
  FILTER_CATEGORIES,
  OTHER_OWNERSHIP_TOOLTIP_LABELS,
  OWNERSHIP_OTHER_TOOLTIP_STYLES,
  OWNERSHIP_TAB_CONFIG,
  type CompaniesOwnershipCounts,
  type OwnershipTab,
} from "@/lib/companiesSearchFilterConfig";

export type { CompaniesOwnershipCounts, OwnershipTab };
export { EMPTY_OWNERSHIP_COUNTS };

type Country = { locations_Country: string };
type Province = { State__Province__County: string };
type City = { City: string };
type PrimarySector = { id: number; sector_name: string };
type SecondarySector = { id: number; sector_name: string };
type OwnershipType = { id: number; ownership: string };

export function CompaniesSearchDashboard({
  onSearch,
  onFilterColumnsChange,
  initialSearch,
  initialOwnershipTab,
  ownershipCounts = EMPTY_OWNERSHIP_COUNTS,
  onColumnsClick,
  onExportCSVClick,
  onAddToPortfolioClick,
  selectedCount = 0,
  columnsCount = 0,
  columnsActive = false,
  embedded = false,
  forcedPrimarySectorIds,
  fetchOnMount,
}: {
  onSearch?: (
    listFilters: CompaniesFilters,
    countsFilters: CompaniesFilters,
    portfolioOnly?: boolean
  ) => void;
  onFilterColumnsChange?: (payload: {
    filterIds: string[];
    ownershipTabActive: boolean;
  }) => void;
  initialSearch?: string;
  initialOwnershipTab?: OwnershipTab;
  ownershipCounts?: CompaniesOwnershipCounts;
  onColumnsClick?: () => void;
  columnsActive?: boolean;
  onExportCSVClick?: () => void;
  onAddToPortfolioClick?: () => void;
  selectedCount?: number;
  columnsCount?: number;
  embedded?: boolean;
  forcedPrimarySectorIds?: number[];
  fetchOnMount?: boolean;
}) {
  const shouldFetchOnMount = fetchOnMount ?? embedded;
  const lockedSectorIds = useMemo(
    () =>
      (forcedPrimarySectorIds ?? []).filter(
        (id) => Number.isFinite(id) && id > 0
      ),
    [forcedPrimarySectorIds]
  );

  const [filterBarState, setFilterBarState] = useState<FilterBarState>({
    filters: [],
    viewId: null,
    searchText: initialSearch || "",
    filterLogic: "and",
  });

  const [activeOwnershipTab, setActiveOwnershipTab] = useState<OwnershipTab>(
    initialOwnershipTab ?? "all"
  );

  const [countries, setCountries] = useState<Country[]>([]);
  const [continentalRegions, setContinentalRegions] = useState<string[]>([]);
  const [subRegions, setSubRegions] = useState<string[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [primarySectors, setPrimarySectors] = useState<PrimarySector[]>([]);
  const [secondarySectors, setSecondarySectors] = useState<SecondarySector[]>(
    []
  );
  const [ownershipTypes, setOwnershipTypes] = useState<OwnershipType[]>([]);
  const storeUserPortfolio = usePortfolioStore((s) => s.userPortfolio);
  const portfolioCompanyIds = useMemo(
    () =>
      storeUserPortfolio
        ? storeUserPortfolio.items
            .filter((item) => item.entity === "company")
            .map((item) => item.id)
        : [],
    [storeUserPortfolio]
  );
  const [hybridBusinessFocusIds, setHybridBusinessFocusIds] = useState<
    number[]
  >([]);

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

  useEffect(() => {
    locationsService.getCountries().then(setCountries).catch(console.error);
    locationsService
      .getContinentalRegions()
      .then(setContinentalRegions)
      .catch(console.error);
    locationsService.getSubRegions().then(setSubRegions).catch(console.error);
    locationsService
      .getPrimarySectors()
      .then(setPrimarySectors)
      .catch(console.error);
    locationsService
      .getOwnershipTypes()
      .then(setOwnershipTypes)
      .catch(console.error);
    locationsService
      .getHybridBusinessFocuses()
      .then((focuses) => setHybridBusinessFocusIds(focuses.map((f) => f.id)))
      .catch(console.error);

    if (lockedSectorIds.length > 0) {
      locationsService
        .getSecondarySectors(lockedSectorIds)
        .then(setSecondarySectors)
        .catch(console.error);
    } else {
      locationsService
        .getAllSecondarySectorsWithPrimary()
        .then((sectors) =>
          setSecondarySectors(
            sectors.map((s) => ({ id: s.id, sector_name: s.sector_name }))
          )
        )
        .catch(console.error);
    }
  }, [lockedSectorIds]);

  useEffect(() => {
    if (selectedCountries.length === 0) {
      setProvinces([]);
      return;
    }
    locationsService
      .getProvinces(selectedCountries)
      .then(setProvinces)
      .catch(console.error);
  }, [selectedCountries]);

  useEffect(() => {
    if (selectedCountries.length === 0) {
      setCities([]);
      return;
    }
    locationsService
      .getCities(selectedCountries, selectedProvinces)
      .then(setCities)
      .catch(console.error);
  }, [selectedCountries, selectedProvinces]);

  useEffect(() => {
    if (lockedSectorIds.length > 0) return;
    if (selectedPrimaryNames.length === 0) return;
    const ids = selectedPrimaryNames
      .map((name) => primarySectors.find((s) => s.sector_name === name)?.id)
      .filter((id): id is number => id != null);
    if (ids.length > 0) {
      locationsService
        .getSecondarySectors(ids)
        .then(setSecondarySectors)
        .catch(console.error);
    }
  }, [selectedPrimaryNames, primarySectors, lockedSectorIds.length]);

  const filterDefs = useMemo(
    () =>
      buildCompaniesFilterDefs({
        continentalRegions,
        subRegions,
        countries,
        provinces,
        cities,
        primarySectors,
        secondarySectors,
        ownershipTypes,
        excludeFilterIds:
          lockedSectorIds.length > 0 ? ["primary_sector"] : undefined,
      }),
    [
      continentalRegions,
      subRegions,
      countries,
      provinces,
      cities,
      primarySectors,
      secondarySectors,
      ownershipTypes,
      lockedSectorIds.length,
    ]
  );

  const onFilterColumnsChangeRef = useRef(onFilterColumnsChange);
  onFilterColumnsChangeRef.current = onFilterColumnsChange;

  useEffect(() => {
    onFilterColumnsChangeRef.current?.({
      filterIds: filterBarState.filters.map((filter) => filter.id),
      ownershipTabActive: activeOwnershipTab !== "all",
    });
  }, [filterBarState.filters, activeOwnershipTab]);

  const buildGlobalSearchFilters = useCallback((): CompaniesFilters => {
    return buildCompaniesSearchPayload({
      state: filterBarState,
      primarySectors,
      secondarySectors,
      ownershipTypes,
      applyOwnershipTabFilter: false,
      portfolioCompanyIds,
      hybridBusinessFocusIds,
      forcedPrimarySectorIds: lockedSectorIds,
    });
  }, [
    filterBarState,
    primarySectors,
    secondarySectors,
    ownershipTypes,
    portfolioCompanyIds,
    hybridBusinessFocusIds,
    lockedSectorIds,
  ]);

  const buildSearchFilters = useCallback((): CompaniesFilters => {
    return buildCompaniesSearchPayload({
      state: filterBarState,
      primarySectors,
      secondarySectors,
      ownershipTypes,
      ownershipTypeIds:
        activeOwnershipTab !== "all"
          ? [...OWNERSHIP_TAB_CONFIG[activeOwnershipTab].ownershipTypeIds]
          : undefined,
      portfolioCompanyIds,
      hybridBusinessFocusIds,
      forcedPrimarySectorIds: lockedSectorIds,
    });
  }, [
    filterBarState,
    activeOwnershipTab,
    primarySectors,
    secondarySectors,
    ownershipTypes,
    portfolioCompanyIds,
    hybridBusinessFocusIds,
    lockedSectorIds,
  ]);

  const buildGlobalSearchFiltersRef = useRef(buildGlobalSearchFilters);
  buildGlobalSearchFiltersRef.current = buildGlobalSearchFilters;

  const isPortfolioFilterActive = filterBarState.filters.some(
    (f) => f.id === "followed" && f.value === true
  );
  const isPortfolioFilterActiveRef = useRef(isPortfolioFilterActive);
  isPortfolioFilterActiveRef.current = isPortfolioFilterActive;

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipInitialSearchRef = useRef(!shouldFetchOnMount);
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
    if (!shouldFetchOnMount) return;
    onSearchRef.current?.(
      buildSearchFiltersRef.current(),
      buildGlobalSearchFiltersRef.current(),
      isPortfolioFilterActiveRef.current
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const ownershipTabOrder: Exclude<OwnershipTab, "all">[] = [
    "public",
    "pe",
    "vc",
    "private",
    "subsidiary",
    "acquired",
    "other",
  ];

  const ownershipTabs: {
    id: OwnershipTab;
    label: string;
    count: number;
    dot: string;
  }[] = [
    {
      id: "all",
      label: "All",
      count: ownershipCounts.totalCount,
      dot: "#64748b",
    },
    ...ownershipTabOrder.map((id) => ({
      id,
      label: OWNERSHIP_TAB_CONFIG[id].label,
      count: ownershipCounts[OWNERSHIP_TAB_CONFIG[id].countKey],
      dot: OWNERSHIP_TAB_CONFIG[id].dot,
    })),
  ];

  const matchCount =
    activeOwnershipTab === "all"
      ? ownershipCounts.totalCount
      : ownershipTabs.find((tab) => tab.id === activeOwnershipTab)?.count ??
        ownershipCounts.totalCount;

  const outerStyle: React.CSSProperties = embedded
    ? { borderBottom: "1px solid #e2e8f0" }
    : { background: "#f8fafc", borderBottom: "1px solid #e2e8f0" };

  const topPadding = embedded ? "0" : "20px 28px 0";

  return (
    <div style={outerStyle}>
      <style
        dangerouslySetInnerHTML={{ __html: OWNERSHIP_OTHER_TOOLTIP_STYLES }}
      />
      <div style={{ width: "100%", padding: topPadding }}>
        {!embedded && (
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
                <span
                  style={{ fontSize: 16, fontWeight: 400, color: "#94a3b8" }}
                >
                  {matchCount.toLocaleString()} matches
                </span>
              </h1>
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
                  border: columnsActive
                    ? "1px solid #0f172a"
                    : "1px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  color: columnsActive ? "#fff" : "#374151",
                  cursor: "pointer",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  transition:
                    "background 150ms, color 150ms, border-color 150ms",
                }}
              >
                <svg
                  width="14"
                  height="10"
                  viewBox="0 0 14 10"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M0 1h14M0 5h10M0 9h6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                Columns {columnsCount}/{CANONICAL_COMPANY_COLUMN_KEYS.length}
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
                <svg
                  width="12"
                  height="14"
                  viewBox="0 0 12 14"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M6 1v8M3 6l3 3 3-3M1 13h10"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
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
                {selectedCount > 0
                  ? ` (${selectedCount.toLocaleString()})`
                  : ""}
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {ownershipTabs.map((tab) => {
            const active = activeOwnershipTab === tab.id;
            const tabButton = (
              <button
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
                  transition: "background 0.12s, color 0.12s",
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

            if (tab.id !== "other") {
              return React.cloneElement(tabButton, { key: tab.id });
            }

            return (
              <div key={tab.id} className="ownership-tab-other-tooltip-wrap">
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
      </div>

      <div
        style={{
          background: "#fff",
          borderTop: "1px solid #e2e8f0",
          borderBottom: embedded ? "none" : "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            width: "100%",
            padding: embedded ? "10px 0 0" : "10px 28px 12px",
          }}
        >
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
}

/** @deprecated Use CompaniesSearchDashboard */
export const CompanyDashboard = CompaniesSearchDashboard;
