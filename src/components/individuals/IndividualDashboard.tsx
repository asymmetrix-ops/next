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
  type PrimarySector,
  type SecondarySector,
  type JobTitleOption,
} from "@/components/individuals/individualsFilterConfig";
import { CANONICAL_INDIVIDUAL_COLUMN_KEYS } from "@/components/individuals/individualsColumnCategories";
import { SearchColumnsButton } from "@/components/search/SearchColumnsButton";
import RequestDataResearchButton from "@/components/RequestDataResearchButton";
import { SEARCH_HEADER_ACTION_BUTTON_STYLE } from "@/components/search/searchHeaderActions";
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
import { useLocationFilterOptions } from "@/components/search/useLocationFilterOptions";

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

  const [continentalRegions, setContinentalRegions] = useState<string[]>([]);
  const [subRegions, setSubRegions] = useState<string[]>([]);
  const [primarySectors, setPrimarySectors] = useState<PrimarySector[]>([]);
  const [secondarySectors, setSecondarySectors] = useState<SecondarySector[]>(
    []
  );
  const { countries, provinces, cities } = useLocationFilterOptions(filterBarState);

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
    <div style={SEARCH_DASHBOARD_SHELL}>
      <div style={SEARCH_DASHBOARD_INNER}>
        <div style={SEARCH_DASHBOARD_HEADER_ROW}>
          <div>
            <div style={SEARCH_DASHBOARD_EYEBROW}>Individuals</div>
            <h1 style={SEARCH_DASHBOARD_TITLE}>
              Individual search
              <span style={SEARCH_DASHBOARD_MATCH_COUNT}>
                {matchCount.toLocaleString()} matches
              </span>
            </h1>
          </div>

          <div style={SEARCH_DASHBOARD_ACTIONS}>
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

        <SearchListTabs
          tabs={roleTabs}
          activeTabId={activeRoleTab}
          onTabClick={(tabId) => setActiveRoleTab(tabId as IndividualRoleTab)}
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
            entityLabel="individuals"
            portfolioOnlyChipLabel="My Portfolio only"
            portfolioBooleanDescription="Show only individuals in My Portfolio (followed)"
          />
        </div>
      </div>
    </div>
  );
};
