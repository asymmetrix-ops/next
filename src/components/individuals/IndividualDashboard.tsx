"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { locationsService } from "@/lib/locationsService";
import { buildIndividualsSearchPayload } from "@/lib/individualsFilterPayload";
import type { IndividualsSearchFilters } from "@/app/individuals/actions";
import {
  CompaniesFilterBar,
  FilterBarState,
} from "@/components/companies/CompaniesFilterBar";
import {
  FILTER_CATEGORIES,
  buildIndividualsFilterDefs,
  EMPTY_INDIVIDUALS_SUMMARY_COUNTS,
  INDIVIDUAL_ROLE_TAB_CONFIG,
  INDIVIDUAL_ROLE_TAB_ORDER,
  type IndividualRoleTab,
  type IndividualsSummaryCounts,
  type Country,
  type Province,
  type City,
  type PrimarySector,
  type SecondarySector,
  type JobTitleOption,
} from "@/components/individuals/individualsFilterConfig";
import { CANONICAL_INDIVIDUAL_COLUMN_KEYS } from "@/components/individuals/individualsColumnCategories";
import { SearchColumnsButton } from "@/components/search/SearchColumnsButton";
import RequestDataResearchButton from "@/components/RequestDataResearchButton";
import { SEARCH_HEADER_ACTION_BUTTON_STYLE } from "@/components/search/searchHeaderActions";

export type IndividualDashboardProps = {
  onSearch?: (
    listFilters: IndividualsSearchFilters,
    countsFilters: IndividualsSearchFilters,
    portfolioOnly?: boolean
  ) => void;
  onFilterColumnsChange?: (payload: {
    filterIds: string[];
    roleTabActive: boolean;
  }) => void;
  initialSearch?: string;
  summaryCounts?: IndividualsSummaryCounts;
  jobTitles: JobTitleOption[];
  onColumnsClick?: () => void;
  columnsActive?: boolean;
  columnsCount?: number;
};

export const IndividualDashboard = ({
  onSearch,
  onFilterColumnsChange,
  initialSearch,
  summaryCounts = EMPTY_INDIVIDUALS_SUMMARY_COUNTS,
  jobTitles,
  onColumnsClick,
  columnsActive = false,
  columnsCount = 0,
}: IndividualDashboardProps) => {
  const [filterBarState, setFilterBarState] = useState<FilterBarState>({
    filters: [],
    viewId: null,
    searchText: initialSearch || "",
    filterLogic: "and",
  });

  const [activeRoleTab, setActiveRoleTab] = useState<IndividualRoleTab>("all");

  const [countries, setCountries] = useState<Country[]>([]);
  const [continentalRegions, setContinentalRegions] = useState<string[]>([]);
  const [subRegions, setSubRegions] = useState<string[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [primarySectors, setPrimarySectors] = useState<PrimarySector[]>([]);
  const [secondarySectors, setSecondarySectors] = useState<SecondarySector[]>(
    []
  );

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
    if (!initialSearch) return;
    setFilterBarState((state) =>
      state.searchText === initialSearch
        ? state
        : { ...state, searchText: initialSearch }
    );
  }, [initialSearch]);

  useEffect(() => {
    locationsService.getCountries().then(setCountries).catch(console.error);
    locationsService.getContinentalRegions().then(setContinentalRegions).catch(console.error);
    locationsService.getSubRegions().then(setSubRegions).catch(console.error);
    locationsService.getPrimarySectors().then(setPrimarySectors).catch(console.error);
    locationsService
      .getAllSecondarySectorsWithPrimary()
      .then((sectors) =>
        setSecondarySectors(sectors.map((s) => ({ id: s.id, sector_name: s.sector_name })))
      )
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedCountries.length === 0) {
      setProvinces([]);
      return;
    }
    locationsService.getProvinces(selectedCountries).then(setProvinces).catch(console.error);
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
      buildIndividualsFilterDefs({
        continentalRegions,
        subRegions,
        countries,
        provinces,
        cities,
        primarySectors,
        secondarySectors,
        jobTitles,
      }),
    [
      continentalRegions,
      subRegions,
      countries,
      provinces,
      cities,
      primarySectors,
      secondarySectors,
      jobTitles,
    ]
  );

  const onFilterColumnsChangeRef = useRef(onFilterColumnsChange);
  onFilterColumnsChangeRef.current = onFilterColumnsChange;

  useEffect(() => {
    onFilterColumnsChangeRef.current?.({
      filterIds: filterBarState.filters.map((filter) => filter.id),
      roleTabActive: activeRoleTab !== "all",
    });
  }, [filterBarState.filters, activeRoleTab]);

  const buildCountsFilters = useCallback((): IndividualsSearchFilters => {
    return buildIndividualsSearchPayload({
      state: filterBarState,
      primarySectors,
      secondarySectors,
      jobTitles,
    });
  }, [filterBarState, primarySectors, secondarySectors, jobTitles]);

  const buildSearchFilters = useCallback((): IndividualsSearchFilters => {
    const tabConfig =
      activeRoleTab !== "all" ? INDIVIDUAL_ROLE_TAB_CONFIG[activeRoleTab] : null;
    return buildIndividualsSearchPayload({
      state: filterBarState,
      primarySectors,
      secondarySectors,
      jobTitles,
      roleTabJobTitleIds: tabConfig?.jobTitleIds
        ? [...tabConfig.jobTitleIds]
        : undefined,
      roleTabStatuses: tabConfig?.statuses ? [...tabConfig.statuses] : undefined,
    });
  }, [filterBarState, primarySectors, secondarySectors, jobTitles, activeRoleTab]);

  const isPortfolioFilterActive = filterBarState.filters.some(
    (f) => f.id === "followed" && f.value === true
  );
  const isPortfolioFilterActiveRef = useRef(isPortfolioFilterActive);
  isPortfolioFilterActiveRef.current = isPortfolioFilterActive;

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipInitialSearchRef = useRef(true);
  const buildSearchFiltersRef = useRef(buildSearchFilters);
  buildSearchFiltersRef.current = buildSearchFilters;
  const buildCountsFiltersRef = useRef(buildCountsFilters);
  buildCountsFiltersRef.current = buildCountsFilters;
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;

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
        buildCountsFiltersRef.current(),
        isPortfolioFilterActiveRef.current
      );
    }, 350);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [filterSearchKey]);

  const skipInitialTabRef = useRef(true);
  useEffect(() => {
    if (skipInitialTabRef.current) {
      skipInitialTabRef.current = false;
      return;
    }
    onSearchRef.current?.(
      buildSearchFiltersRef.current(),
      buildCountsFiltersRef.current(),
      isPortfolioFilterActiveRef.current
    );
  }, [activeRoleTab]);

  const roleTabs: {
    id: IndividualRoleTab;
    label: string;
    count: number;
    dot: string;
  }[] = [
    { id: "all", label: "All", count: summaryCounts.totalCount, dot: "#64748b" },
    ...INDIVIDUAL_ROLE_TAB_ORDER.map((id) => ({
      id,
      label: INDIVIDUAL_ROLE_TAB_CONFIG[id].label,
      count: summaryCounts[INDIVIDUAL_ROLE_TAB_CONFIG[id].countKey],
      dot: INDIVIDUAL_ROLE_TAB_CONFIG[id].dot,
    })),
  ];

  const matchCount =
    activeRoleTab === "all"
      ? summaryCounts.totalCount
      : roleTabs.find((tab) => tab.id === activeRoleTab)?.count ??
        summaryCounts.totalCount;

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
              Individuals
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
              Individual search
              <span style={{ fontSize: 16, fontWeight: 400, color: "#94a3b8" }}>
                {matchCount.toLocaleString()} matches
              </span>
            </h1>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", paddingTop: 6, flexWrap: "wrap" }}>
            <SearchColumnsButton
              active={columnsActive}
              count={columnsCount}
              total={CANONICAL_INDIVIDUAL_COLUMN_KEYS.length}
              onClick={onColumnsClick}
            />
            <RequestDataResearchButton
              label="Request Individual Profile"
              context="individual"
              sourcePage="Individuals Search"
              className="inline-flex items-center justify-center"
              style={SEARCH_HEADER_ACTION_BUTTON_STYLE}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {roleTabs.map((tab) => {
            const active = activeRoleTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveRoleTab(tab.id)}
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
            filterCategories={FILTER_CATEGORIES}
            state={filterBarState}
            onStateChange={setFilterBarState}
            totalCount={matchCount}
            entityLabel="individuals"
            portfolioOnlyChipLabel="My Portfolio only"
            portfolioBooleanDescription="Show only individuals in My Portfolio (followed)"
          />
        </div>
      </div>
    </div>
  );
};
