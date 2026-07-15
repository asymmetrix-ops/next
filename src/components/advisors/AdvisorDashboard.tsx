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
  buildAdvisorsCountsSearchPayload,
  buildAdvisorsSearchPayload,
} from "@/lib/advisorsFilterPayload";
import type { AdvisorsSearchFilters } from "@/app/advisors/actions";
import {
  CompaniesFilterBar,
  FilterBarState,
} from "@/components/companies/CompaniesFilterBar";
import {
  FILTER_CATEGORIES,
  buildAdvisorsFilterDefs,
  EMPTY_ADVISORS_ROLE_COUNTS,
  ADVISOR_ROLE_TAB_CONFIG,
  ADVISOR_ROLE_TAB_ORDER,
  type AdvisorRoleTab,
  type AdvisorsRoleCounts,
  type PrimarySector,
  type SecondarySector,
} from "@/components/advisors/advisorsFilterConfig";
import { CANONICAL_ADVISOR_COLUMN_KEYS } from "@/components/advisors/advisorsColumnCategories";
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
import { useLocationFilterOptions } from "@/components/search/useLocationFilterOptions";

export type AdvisorDashboardProps = {
  onSearch?: (
    listFilters: AdvisorsSearchFilters,
    countsFilters: AdvisorsSearchFilters,
    portfolioOnly?: boolean,
    refreshCounts?: boolean
  ) => void;
  onFilterColumnsChange?: (payload: { filterIds: string[] }) => void;
  initialSearch?: string;
  roleCounts?: AdvisorsRoleCounts;
  onColumnsClick?: () => void;
  onExportCSVClick?: () => void;
  columnsActive?: boolean;
  columnsCount?: number;
};

export const AdvisorDashboard = ({
  onSearch,
  onFilterColumnsChange,
  initialSearch,
  roleCounts = EMPTY_ADVISORS_ROLE_COUNTS,
  onColumnsClick,
  onExportCSVClick,
  columnsActive = false,
  columnsCount = 0,
}: AdvisorDashboardProps) => {
  const [filterBarState, setFilterBarState] = useState<FilterBarState>({
    filters: [],
    viewId: null,
    searchText: initialSearch || "",
    filterLogic: "and",
  });

  const [continentalRegions, setContinentalRegions] = useState<string[]>([]);
  const [subRegions, setSubRegions] = useState<string[]>([]);
  const [primarySectors, setPrimarySectors] = useState<PrimarySector[]>([]);
  const [secondarySectors, setSecondarySectors] = useState<SecondarySector[]>(
    []
  );
  const { countries, provinces, cities } = useLocationFilterOptions(filterBarState);
  const [activeAdvisorRoleTab, setActiveAdvisorRoleTab] =
    useState<AdvisorRoleTab>("all");

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
      buildAdvisorsFilterDefs({
        continentalRegions,
        subRegions,
        countries,
        provinces,
        cities,
        primarySectors,
        secondarySectors,
      }),
    [
      continentalRegions,
      subRegions,
      countries,
      provinces,
      cities,
      primarySectors,
      secondarySectors,
    ]
  );

  const onFilterColumnsChangeRef = useRef(onFilterColumnsChange);
  onFilterColumnsChangeRef.current = onFilterColumnsChange;

  useEffect(() => {
    onFilterColumnsChangeRef.current?.({
      filterIds: filterBarState.filters.map((filter) => filter.id),
    });
  }, [filterBarState.filters]);

  const buildSearchFilters = useCallback((): AdvisorsSearchFilters => {
    const tabConfig =
      activeAdvisorRoleTab !== "all"
        ? ADVISOR_ROLE_TAB_CONFIG[activeAdvisorRoleTab]
        : null;
    return buildAdvisorsSearchPayload({
      state: filterBarState,
      primarySectors,
      secondarySectors,
      advisorRoleId: tabConfig?.roleId,
    });
  }, [filterBarState, primarySectors, secondarySectors, activeAdvisorRoleTab]);

  const buildCountsSearchFilters = useCallback(
    (): AdvisorsSearchFilters =>
      buildAdvisorsCountsSearchPayload({
        state: filterBarState,
        primarySectors,
        secondarySectors,
      }),
    [filterBarState, primarySectors, secondarySectors]
  );

  const isPortfolioFilterActive = filterBarState.filters.some(
    (f) => f.id === "followed" && f.value === true
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
      const listFilters = buildSearchFiltersRef.current();
      const countsFilters = buildCountsSearchFiltersRef.current();
      onSearchRef.current?.(
        listFilters,
        countsFilters,
        isPortfolioFilterActiveRef.current
      );
    }, 350);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [filterSearchKey]);

  const skipInitialRoleTabRef = useRef(true);
  useEffect(() => {
    if (skipInitialRoleTabRef.current) {
      skipInitialRoleTabRef.current = false;
      return;
    }
    onSearchRef.current?.(
      buildSearchFiltersRef.current(),
      buildCountsSearchFiltersRef.current(),
      isPortfolioFilterActiveRef.current,
      false
    );
  }, [activeAdvisorRoleTab]);

  const roleTabs: {
    id: AdvisorRoleTab;
    label: string;
    count: number;
    dot: string;
  }[] = [
    { id: "all", label: "All", count: roleCounts.totalCount, dot: "#64748b" },
    ...ADVISOR_ROLE_TAB_ORDER.map((id) => ({
      id,
      label: ADVISOR_ROLE_TAB_CONFIG[id].label,
      count: roleCounts[ADVISOR_ROLE_TAB_CONFIG[id].countKey],
      dot: ADVISOR_ROLE_TAB_CONFIG[id].dot,
    })),
  ];

  const matchCount =
    activeAdvisorRoleTab === "all"
      ? roleCounts.totalCount
      : roleTabs.find((tab) => tab.id === activeAdvisorRoleTab)?.count ??
        roleCounts.totalCount;

  return (
    <div style={SEARCH_DASHBOARD_SHELL}>
      <div style={SEARCH_DASHBOARD_INNER}>
        <div style={SEARCH_DASHBOARD_HEADER_ROW}>
          <div>
            <div style={SEARCH_DASHBOARD_EYEBROW}>Advisors</div>
            <h1 style={SEARCH_DASHBOARD_TITLE}>
              Advisor search
              <span style={SEARCH_DASHBOARD_MATCH_COUNT}>
                {matchCount.toLocaleString()} matches
              </span>
            </h1>
          </div>

          <div style={SEARCH_DASHBOARD_ACTIONS}>
            <SearchColumnsButton
              active={columnsActive}
              count={columnsCount}
              total={CANONICAL_ADVISOR_COLUMN_KEYS.length}
              onClick={onColumnsClick}
            />
            <RequestDataResearchButton
              label="Request Advisor Profile"
              context="advisor"
              sourcePage="Advisors Search"
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
          tabs={roleTabs}
          activeTabId={activeAdvisorRoleTab}
          onTabClick={(tabId) => setActiveAdvisorRoleTab(tabId as AdvisorRoleTab)}
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
            entityLabel="advisors"
            portfolioOnlyChipLabel="My Portfolio only"
            portfolioBooleanDescription="Show only advisors in My Portfolio (followed)"
          />
        </div>
      </div>
    </div>
  );
};
