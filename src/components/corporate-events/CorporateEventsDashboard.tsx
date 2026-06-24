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

const HEADER_ACTION_BUTTON_STYLE: React.CSSProperties = {
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
};

export type CorporateEventsDashboardProps = {
  onSearch?: (
    listFilters: CorporateEventsSearchFilters,
    countsFilters: CorporateEventsSearchFilters,
    portfolioOnly?: boolean
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

  const buildSearchFilters = useCallback(
    (): CorporateEventsSearchFilters =>
      buildCorporateEventsSearchPayload({
        state: filterBarState,
        primarySectors,
        secondarySectors,
        userId,
      }),
    [filterBarState, primarySectors, secondarySectors, userId]
  );

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

  const matchCount = summaryStats.totalCount;
  const eventStats = [
    { label: "Acquisitions", value: summaryStats.acquisitions },
    { label: "Investments", value: summaryStats.investments },
    { label: "IPOs", value: summaryStats.ipos },
  ];

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
            marginBottom: 14,
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
              Corporate Events
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
              Corporate event search
              <span style={{ fontSize: 16, fontWeight: 400, color: "#94a3b8" }}>
                {matchCount.toLocaleString()} matches
              </span>
            </h1>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", paddingTop: 6, flexWrap: "wrap" }}>
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
              style={HEADER_ACTION_BUTTON_STYLE}
            />
            <button
              type="button"
              onClick={onExportCSVClick}
              style={HEADER_ACTION_BUTTON_STYLE}
            >
              <svg width="12" height="14" viewBox="0 0 12 14" fill="none" aria-hidden="true">
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
          </div>
        </div>

        {summaryStats.acquisitions > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px 18px",
              paddingBottom: 14,
              fontSize: 12,
              color: "#64748b",
            }}
          >
            {eventStats.map((stat) => (
              <span key={stat.label}>
                <span style={{ color: "#94a3b8" }}>{stat.label}: </span>
                <span style={{ fontWeight: 600, color: "#334155" }}>
                  {stat.value.toLocaleString()}
                </span>
              </span>
            ))}
          </div>
        )}
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
            entityLabel="corporate events"
            portfolioOnlyChipLabel="Followed only"
            portfolioBooleanDescription="Show events tagged to followed companies, advisors, individuals, investors, or sectors."
          />
        </div>
      </div>
    </div>
  );
};
