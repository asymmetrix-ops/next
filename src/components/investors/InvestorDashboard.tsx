"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { locationsService } from "@/lib/locationsService";
import { buildInvestorsSearchPayload } from "@/lib/investorsFilterPayload";
import type { InvestorsSearchFilters } from "@/app/investors/actions";
import {
  CompaniesFilterBar,
  FilterBarState,
} from "@/components/companies/CompaniesFilterBar";
import {
  FILTER_CATEGORIES,
  buildInvestorsFilterDefs,
  EMPTY_INVESTOR_TYPE_COUNTS,
  INVESTOR_TYPE_TAB_CONFIG,
  INVESTOR_TYPE_TAB_ORDER,
  type InvestorTypeTab,
  type InvestorsTypeCounts,
  type Country,
  type Province,
  type City,
  type PrimarySector,
  type SecondarySector,
  type InvestorTypeOption,
} from "@/components/investors/investorsFilterConfig";
import { CANONICAL_INVESTOR_COLUMN_KEYS } from "@/components/investors/investorsColumnCategories";
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

export type InvestorDashboardProps = {
  onSearch?: (
    listFilters: InvestorsSearchFilters,
    countsFilters: InvestorsSearchFilters,
    portfolioOnly?: boolean
  ) => void;
  onFilterColumnsChange?: (payload: {
    filterIds: string[];
    investorTypeTabActive: boolean;
  }) => void;
  initialSearch?: string;
  initialInvestorTypeId?: number;
  typeCounts?: InvestorsTypeCounts;
  investorTypes: InvestorTypeOption[];
  onColumnsClick?: () => void;
  columnsActive?: boolean;
  columnsCount?: number;
};

export const InvestorDashboard = ({
  onSearch,
  onFilterColumnsChange,
  initialSearch,
  initialInvestorTypeId,
  typeCounts = EMPTY_INVESTOR_TYPE_COUNTS,
  investorTypes,
  onColumnsClick,
  columnsActive = false,
  columnsCount = 0,
}: InvestorDashboardProps) => {
  const [filterBarState, setFilterBarState] = useState<FilterBarState>({
    filters: [],
    viewId: null,
    searchText: initialSearch || "",
    filterLogic: "and",
  });
  const [activeInvestorTypeTab, setActiveInvestorTypeTab] =
    useState<InvestorTypeTab>("all");

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

  useEffect(() => {
    if (!initialInvestorTypeId || investorTypes.length === 0) return;
    const match = investorTypes.find((type) => type.id === initialInvestorTypeId);
    if (!match) return;
    for (const tab of INVESTOR_TYPE_TAB_ORDER) {
      const ids = investorTypes
        .filter((type) =>
          INVESTOR_TYPE_TAB_CONFIG[tab].matchTerms.some((term) =>
            (type.sector_name || type.name || type.investor_type || "")
              .toLowerCase()
              .includes(term)
          )
        )
        .map((type) => type.id);
      if (ids.includes(initialInvestorTypeId)) {
        setActiveInvestorTypeTab(tab);
        break;
      }
    }
  }, [initialInvestorTypeId, investorTypes]);

  const filterDefs = useMemo(
    () =>
      buildInvestorsFilterDefs({
        continentalRegions,
        subRegions,
        countries,
        provinces,
        cities,
        primarySectors,
        secondarySectors,
        investorTypes,
      }),
    [
      continentalRegions,
      subRegions,
      countries,
      provinces,
      cities,
      primarySectors,
      secondarySectors,
      investorTypes,
    ]
  );

  const onFilterColumnsChangeRef = useRef(onFilterColumnsChange);
  onFilterColumnsChangeRef.current = onFilterColumnsChange;

  useEffect(() => {
    onFilterColumnsChangeRef.current?.({
      filterIds: filterBarState.filters.map((filter) => filter.id),
      investorTypeTabActive: activeInvestorTypeTab !== "all",
    });
  }, [filterBarState.filters, activeInvestorTypeTab]);

  const buildGlobalSearchFilters = useCallback((): InvestorsSearchFilters => {
    return buildInvestorsSearchPayload({
      state: filterBarState,
      primarySectors,
      secondarySectors,
      investorTypes,
      applyInvestorTypeTabFilter: false,
    });
  }, [filterBarState, primarySectors, secondarySectors, investorTypes]);

  const buildSearchFilters = useCallback((): InvestorsSearchFilters => {
    return buildInvestorsSearchPayload({
      state: filterBarState,
      primarySectors,
      secondarySectors,
      investorTypes,
      investorTypeTab: activeInvestorTypeTab,
    });
  }, [
    filterBarState,
    primarySectors,
    secondarySectors,
    investorTypes,
    activeInvestorTypeTab,
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

  const skipInitialTabRef = useRef(true);
  useEffect(() => {
    if (skipInitialTabRef.current) {
      skipInitialTabRef.current = false;
      return;
    }
    onSearchRef.current?.(
      buildSearchFiltersRef.current(),
      buildGlobalSearchFiltersRef.current(),
      isPortfolioFilterActiveRef.current
    );
  }, [activeInvestorTypeTab]);

  const investorTypeTabs: {
    id: InvestorTypeTab;
    label: string;
    count: number;
    dot: string;
  }[] = [
    { id: "all", label: "All", count: typeCounts.totalCount, dot: "#64748b" },
    ...INVESTOR_TYPE_TAB_ORDER.map((id) => ({
      id,
      label: INVESTOR_TYPE_TAB_CONFIG[id].label,
      count: typeCounts[INVESTOR_TYPE_TAB_CONFIG[id].countKey],
      dot: INVESTOR_TYPE_TAB_CONFIG[id].dot,
    })),
  ];

  const matchCount =
    activeInvestorTypeTab === "all"
      ? typeCounts.totalCount
      : investorTypeTabs.find((tab) => tab.id === activeInvestorTypeTab)?.count ??
        typeCounts.totalCount;

  return (
    <div style={SEARCH_DASHBOARD_SHELL}>
      <div style={SEARCH_DASHBOARD_INNER}>
        <div style={SEARCH_DASHBOARD_HEADER_ROW}>
          <div>
            <div style={SEARCH_DASHBOARD_EYEBROW}>Investors</div>
            <h1 style={SEARCH_DASHBOARD_TITLE}>
              Investor search
              <span style={SEARCH_DASHBOARD_MATCH_COUNT}>
                {matchCount.toLocaleString()} matches
              </span>
            </h1>
          </div>

          <div style={SEARCH_DASHBOARD_ACTIONS}>
            <SearchColumnsButton
              active={columnsActive}
              count={columnsCount}
              total={CANONICAL_INVESTOR_COLUMN_KEYS.length}
              onClick={onColumnsClick}
            />
            <RequestDataResearchButton
              label="Request Investor Profile"
              context="investor"
              sourcePage="Investors Search"
              className="inline-flex items-center justify-center"
              style={SEARCH_HEADER_ACTION_BUTTON_STYLE}
            />
          </div>
        </div>

        <SearchListTabs
          tabs={investorTypeTabs}
          activeTabId={activeInvestorTypeTab}
          onTabClick={(tabId) => setActiveInvestorTypeTab(tabId as InvestorTypeTab)}
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
            entityLabel="investors"
            portfolioOnlyChipLabel="My Portfolio only"
            portfolioBooleanDescription="Show only investors in My Portfolio (followed)"
          />
        </div>
      </div>
    </div>
  );
};
