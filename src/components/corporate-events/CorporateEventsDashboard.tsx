"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { locationsService } from "@/lib/locationsService";
import { fetchUserPortfolioData } from "@/lib/portfolioData";
import {
  buildCorporateEventsCountsSearchPayload,
  buildCorporateEventsSearchPayload,
  type CorporateEventsSearchFilters,
} from "@/lib/corporateEventsFilterPayload";
import {
  CompaniesFilterBar,
  FilterBarState,
} from "@/components/companies/CompaniesFilterBar";
import {
  FILTER_CATEGORIES,
  buildCorporateEventsFilterDefs,
  EMPTY_CORPORATE_EVENTS_SUMMARY_STATS,
  CORPORATE_EVENT_DEAL_TAB_CONFIG,
  CORPORATE_EVENT_DEAL_TAB_ORDER,
  type CorporateEventDealTab,
  type CorporateEventsSummaryStats,
  type Country,
  type Province,
  type City,
  type PrimarySector,
  type SecondarySector,
} from "@/components/corporate-events/corporateEventsFilterConfig";
import { CANONICAL_CORPORATE_EVENT_COLUMN_KEYS } from "@/components/corporate-events/corporateEventsColumnCategories";
import { SearchColumnsButton } from "@/components/search/SearchColumnsButton";
import RequestDataResearchButton from "@/components/RequestDataResearchButton";
import {
  SEARCH_HEADER_ACTION_BUTTON_STYLE,
  SearchExportCsvIcon,
} from "@/components/search/searchHeaderActions";
import {
  SEARCH_DASHBOARD_ACTIONS,
  SEARCH_DASHBOARD_EYEBROW,
  SEARCH_DASHBOARD_FILTER_INNER,
  SEARCH_DASHBOARD_FILTER_SHELL,
  SEARCH_DASHBOARD_HEADER_ROW,
  SEARCH_DASHBOARD_INNER,
  SEARCH_DASHBOARD_MATCH_COUNT,
  SEARCH_DASHBOARD_SHELL,
  SEARCH_DASHBOARD_TITLE,
  SearchListTabs,
} from "@/components/search/searchDashboardLayout";

export type CorporateEventsDashboardProps = {
  onSearch?: (
    listFilters: CorporateEventsSearchFilters,
    countsFilters: CorporateEventsSearchFilters,
    portfolioOnly?: boolean,
    refreshCounts?: boolean
  ) => void;
  onFilterColumnsChange?: (payload: { filterIds: string[] }) => void;
  initialSearch?: string;
  summaryStats?: CorporateEventsSummaryStats;
  userId?: number | null;
  onColumnsClick?: () => void;
  onExportCSVClick?: () => void;
  columnsActive?: boolean;
  columnsCount?: number;
};

export const CorporateEventsDashboard = ({
  onSearch,
  onFilterColumnsChange,
  initialSearch,
  summaryStats = EMPTY_CORPORATE_EVENTS_SUMMARY_STATS,
  userId = null,
  onColumnsClick,
  onExportCSVClick,
  columnsActive = false,
  columnsCount = 0,
}: CorporateEventsDashboardProps) => {
  const [filterBarState, setFilterBarState] = useState<FilterBarState>({
    filters: [],
    viewId: null,
    searchText: initialSearch || "",
    filterLogic: "and",
  });

  const [countries, setCountries] = useState<Country[]>([]);
  const [continentalRegions, setContinentalRegions] = useState<string[]>([]);
  const [subRegions, setSubRegions] = useState<string[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [primarySectors, setPrimarySectors] = useState<PrimarySector[]>([]);
  const [secondarySectors, setSecondarySectors] = useState<SecondarySector[]>(
    []
  );
  const [fundingStages, setFundingStages] = useState<string[]>([]);
  const [portfolioEntityOptions, setPortfolioEntityOptions] = useState<string[]>(
    []
  );
  const [activeDealTab, setActiveDealTab] = useState<CorporateEventDealTab>("all");

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
    fetch(
      "https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob:develop/funding_stage_options"
    )
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setFundingStages(
            data
              .map((value) => (typeof value === "string" ? value : ""))
              .filter((value): value is string => Boolean(value))
          );
        }
      })
      .catch(console.error);
    fetchUserPortfolioData()
      .then(({ items }) => {
        const typeLabel: Record<string, string> = {
          advisor: "Advisor",
          company: "Company",
          individual: "Individual",
          investor: "Investor",
          sector: "Sector",
        };
        setPortfolioEntityOptions(
          items.map(
            (item) =>
              `${item.name} (${typeLabel[item.entity] ?? item.entity})|${item.entity}-${item.id}`
          )
        );
      })
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
      .map((name) => primarySectors.find((sector) => sector.sector_name === name)?.id)
      .filter((id): id is number => id != null);
    if (ids.length > 0) {
      locationsService.getSecondarySectors(ids).then(setSecondarySectors).catch(console.error);
    }
  }, [selectedPrimaryNames, primarySectors]);

  const filterDefs = useMemo(
    () =>
      buildCorporateEventsFilterDefs({
        continentalRegions,
        subRegions,
        countries,
        provinces,
        cities,
        primarySectors,
        secondarySectors,
        fundingStages,
        portfolioEntityOptions,
      }),
    [
      continentalRegions,
      subRegions,
      countries,
      provinces,
      cities,
      primarySectors,
      secondarySectors,
      fundingStages,
      portfolioEntityOptions,
    ]
  );

  const onFilterColumnsChangeRef = useRef(onFilterColumnsChange);
  onFilterColumnsChangeRef.current = onFilterColumnsChange;

  useEffect(() => {
    onFilterColumnsChangeRef.current?.({
      filterIds: filterBarState.filters.map((filter) => filter.id),
    });
  }, [filterBarState.filters]);

  const buildSearchFilters = useCallback((): CorporateEventsSearchFilters => {
    const tabConfig =
      activeDealTab !== "all"
        ? CORPORATE_EVENT_DEAL_TAB_CONFIG[activeDealTab]
        : null;
    return buildCorporateEventsSearchPayload({
      state: filterBarState,
      primarySectors,
      secondarySectors,
      userId,
      dealTabTypes: tabConfig?.dealTypes,
    });
  }, [filterBarState, primarySectors, secondarySectors, userId, activeDealTab]);

  const buildCountsSearchFilters = useCallback(
    (): CorporateEventsSearchFilters =>
      buildCorporateEventsCountsSearchPayload({
        state: filterBarState,
        primarySectors,
        secondarySectors,
        userId,
      }),
    [filterBarState, primarySectors, secondarySectors, userId]
  );

  const isPortfolioFilterActive = filterBarState.filters.some(
    (filter) =>
      (filter.id === "followed" && filter.value === true) ||
      (filter.id === "portfolio_entity" &&
        Array.isArray(filter.value) &&
        filter.value.length > 0)
  );
  const isPortfolioFilterActiveRef = useRef(isPortfolioFilterActive);
  isPortfolioFilterActiveRef.current = isPortfolioFilterActive;

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipInitialSearchRef = useRef(true);
  const buildSearchFiltersRef = useRef(buildSearchFilters);
  buildSearchFiltersRef.current = buildSearchFilters;
  const buildCountsSearchFiltersRef = useRef(buildCountsSearchFilters);
  buildCountsSearchFiltersRef.current = buildCountsSearchFilters;
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
        buildCountsSearchFiltersRef.current(),
        isPortfolioFilterActiveRef.current
      );
    }, 350);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [filterSearchKey]);

  const skipInitialDealTabRef = useRef(true);
  useEffect(() => {
    if (skipInitialDealTabRef.current) {
      skipInitialDealTabRef.current = false;
      return;
    }
    onSearchRef.current?.(
      buildSearchFiltersRef.current(),
      buildCountsSearchFiltersRef.current(),
      isPortfolioFilterActiveRef.current,
      false
    );
  }, [activeDealTab]);

  const dealTabs: {
    id: CorporateEventDealTab;
    label: string;
    count: number;
    dot: string;
  }[] = [
    { id: "all", label: "All", count: summaryStats.totalCount, dot: "#64748b" },
    ...CORPORATE_EVENT_DEAL_TAB_ORDER.map((id) => ({
      id,
      label: CORPORATE_EVENT_DEAL_TAB_CONFIG[id].label,
      count: summaryStats[CORPORATE_EVENT_DEAL_TAB_CONFIG[id].countKey],
      dot: CORPORATE_EVENT_DEAL_TAB_CONFIG[id].dot,
    })),
  ];

  const matchCount =
    activeDealTab === "all"
      ? summaryStats.totalCount
      : dealTabs.find((tab) => tab.id === activeDealTab)?.count ??
        summaryStats.totalCount;

  return (
    <div style={SEARCH_DASHBOARD_SHELL}>
      <div style={SEARCH_DASHBOARD_INNER}>
        <div style={SEARCH_DASHBOARD_HEADER_ROW}>
          <div>
            <div style={SEARCH_DASHBOARD_EYEBROW}>Corporate Events</div>
            <h1 style={SEARCH_DASHBOARD_TITLE}>
              Corporate event search
              <span style={SEARCH_DASHBOARD_MATCH_COUNT}>
                {matchCount.toLocaleString()} matches
              </span>
            </h1>
          </div>

          <div style={SEARCH_DASHBOARD_ACTIONS}>
            <SearchColumnsButton
              active={columnsActive}
              count={columnsCount}
              total={CANONICAL_CORPORATE_EVENT_COLUMN_KEYS.length}
              onClick={onColumnsClick}
            />
            <RequestDataResearchButton
              label="Request Corporate Event Profile"
              context="corporate-event"
              sourcePage="Corporate Events Search"
              className="inline-flex items-center justify-center"
              style={SEARCH_HEADER_ACTION_BUTTON_STYLE}
            />
            <button
              type="button"
              onClick={onExportCSVClick}
              style={SEARCH_HEADER_ACTION_BUTTON_STYLE}
            >
              <SearchExportCsvIcon />
              Export CSV
            </button>
          </div>
        </div>

        <SearchListTabs
          tabs={dealTabs}
          activeTabId={activeDealTab}
          onTabClick={(tabId) => setActiveDealTab(tabId as CorporateEventDealTab)}
        />
      </div>

      <div style={SEARCH_DASHBOARD_FILTER_SHELL}>
        <div style={SEARCH_DASHBOARD_FILTER_INNER}>
          <CompaniesFilterBar
            filterDefs={filterDefs}
            filterCategories={FILTER_CATEGORIES}
            state={filterBarState}
            onStateChange={setFilterBarState}
            totalCount={matchCount}
            entityLabel="corporate events"
            portfolioOnlyChipLabel="Followed only"
            portfolioBooleanDescription="Show events tagged to followed companies, advisors, individuals, investors, or sectors."
          />
        </div>
      </div>
    </div>
  );
};
