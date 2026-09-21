"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/Footer";
import { BulkAddToPortfolioModal } from "@/components/companies/BulkAddToPortfolioModal";
import type { FilterState } from "@/app/financials-tsx/types";
import {
  DEFAULT_FI_PEER_COLUMN_IDS,
  columnIdsToVisibility,
  FI_PEER_COLUMN_CATEGORIES,
  FI_PEER_COLUMN_TOTAL,
  resolvePeerColumnIdsFromModal,
} from "@/lib/financialIntelligence/fiPeerColumnCategories";
import { ColumnsControlRoom } from "@/components/companies/ColumnsControlRoom";
import { SearchColumnsButton } from "@/components/search/SearchColumnsButton";
import { FinancialsTable } from "@/app/financials-tsx/financials-table";
import "../financials-tsx/colors_and_type.css";
import { fetchFiPeers, fetchFiTarget, searchFiCompanies, fetchFiCompanyLogosByIds, applyFiCompanyLogos, type FiCompanySearchHit } from "@/lib/financialIntelligence/apiClient";
import { FiControlBar, type FiIdOption } from "./components/FiControlBar";
import {
  FiBenchmarkRefreshing,
  FiBenchmarkSkeleton,
} from "./components/FiBenchmarkSkeleton";
import {
  BenchmarkTable,
  CompositeHero,
  HeadlineMetricCards,
} from "./components/BenchmarkPanels";
import { PeerCompaniesCard } from "./components/PeerCompaniesCard";
import { FiTargetEmptyState } from "./components/FiTargetEmptyState";
import { locationsService } from "@/lib/locationsService";
import {
  buildBenchmarkMetricRows,
  buildHeadlineMetrics,
  buildPeerAggregateFinRow,
  buildPeerSectorMedian,
  mapCompanyToFinRow,
} from "@/lib/financialIntelligence/mappers";
import {
  buildPeersRequest,
  FI_PEERS_PER_PAGE,
  type FiFilterLookups,
} from "@/lib/financialIntelligence/filterPayload";
import { SearchTablePagination } from "@/components/search/SearchTablePagination";
import { buildDefaultFilters, filtersEqual } from "@/lib/financialIntelligence/defaultFilters";
import { resolveTargetPrimarySectorIds } from "@/lib/financialIntelligence/sectorFilters";
import {
  computeCompositePercentile,
} from "@/lib/financialIntelligence/calculations";
import { exportFinancialBenchmarkList } from "@/lib/listExport/financialBenchmarkListExport";
import {
  SEARCH_HEADER_ACTION_BUTTON_STYLE,
  SearchExportCsvIcon,
} from "@/components/search/searchHeaderActions";
import { annotateManuallyAddedPeers } from "@/lib/financialIntelligence/normalize";
import {
  filterCompanyRowByAllowedSources,
  filterCompanyRowsByAllowedSources,
} from "@/lib/financialIntelligence/applySourceExclusions";
import { useDataSourceFilter } from "@/lib/financialIntelligence/useDataSourceFilter";
import type { FiCompanyRow, FiPeerAggregateMode, FiSecondarySectorLookup, FiSectorLookup, FiMetricSourceType } from "@/lib/financialIntelligence/types";
import { usePlatformCurrency } from "@/components/providers/PlatformCurrencyProvider";
import { getCurrencySymbol } from "@/lib/filterCurrencyFormat";
import type { FinRow } from "@/app/financials-tsx/types";

const REMOVED_FI_PEER_COLUMN_IDS = new Set(["ev_revenue", "ev_ebitda"]);

function finRowValueForSort(row: FinRow, key: string): string | number | null {
  if (!(key in row)) return null;
  const value = row[key as keyof FinRow];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) return value;
  return null;
}

function placeholderTarget(id: number, meta?: FiCompanySearchHit): FiCompanyRow {
  return {
    company_id: id,
    company_name: meta?.name ?? `Company #${id}`,
    company_logo: meta?.logo ?? null,
    sectors_id: "",
    location_country: "",
    location_region: "",
    financial_year: 0,
    financial_year_value: 0,
    fy_ye_month: 0,
    revenue_m_usd: null,
    rev_growth_pc: null,
    new_client_growth_pc: null,
    ebitda_margin: null,
    ebitda_m_usd: null,
    ebit_m_usd: null,
    rule_of_40: null,
    subscription_revenue_pc: null,
    subscription_revenue_m: null,
    nrr: null,
    churn_pc: null,
    grr_pc: null,
    upsell_pc: null,
    cross_sell_pc: null,
    price_increase_pc: null,
    rev_expansion_pc: null,
    ev_usd: null,
    no_of_clients: null,
    revenue_per_client: null,
    no_employees: null,
    revenue_per_employee: null,
    revenue_multiple: null,
    ev_revenue_x: null,
    ev_ebitda_x: null,
    url: null,
  };
}

function FiPeerFinancialsTable({
  rows,
  tweaks,
  sortId,
  sortDir,
  onSort,
  visibleColumnIds,
  sectorMedian,
  preferredCurrencyCode,
}: {
  rows: ReturnType<typeof mapCompanyToFinRow>[];
  tweaks: React.ComponentProps<typeof FinancialsTable>["tweaks"];
  sortId: string;
  sortDir: "asc" | "desc";
  onSort: (id: string) => void;
  visibleColumnIds: string[];
  sectorMedian: ReturnType<typeof buildPeerSectorMedian>;
  preferredCurrencyCode: string;
}) {
  const currencySymbol = getCurrencySymbol(
    preferredCurrencyCode as "USD" | "EUR" | "GBP"
  );

  return (
    <FinancialsTable
      rows={rows}
      tweaks={tweaks}
      currencySymbol={currencySymbol}
      displayCurrency={preferredCurrencyCode as "USD" | "EUR" | "GBP"}
      fxRates={null}
      sortId={sortId}
      sortDir={sortDir}
      onSort={onSort}
      visibleColumnIds={visibleColumnIds}
      sectorMedian={sectorMedian}
    />
  );
}

export function FinancialIntelligenceWorkspace({
  initialCompanyId = null,
  embedded = false,
}: {
  /** Auto-selects this company as the benchmark target on first mount. */
  initialCompanyId?: number | null;
  /** When true, hides the page chrome (Header/Footer/title) for inline embedding. */
  embedded?: boolean;
} = {}) {
  const { currencyId: preferredCurrencyId, currency } = usePlatformCurrency();
  const [target, setTarget] = useState<FiCompanyRow | null>(null);
  const [peers, setPeers] = useState<FiCompanyRow[]>([]);
  const [benchmarkPeers, setBenchmarkPeers] = useState<FiCompanyRow[]>([]);
  const [peersPage, setPeersPage] = useState(1);
  const [preferredCurrencyCode, setPreferredCurrencyCode] = useState<string>(currency);
  const [totalPeers, setTotalPeers] = useState(0);
  const [filters, setFilters] = useState<FilterState[]>([]);
  const [companyIdsInclude, setCompanyIdsInclude] = useState<number[]>([]);
  const [companyIdsExclude, setCompanyIdsExclude] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [primarySectors, setPrimarySectors] = useState<FiSectorLookup[]>([]);
  const [secondarySectors, setSecondarySectors] = useState<FiSecondarySectorLookup[]>([]);
  const [regionOptions, setRegionOptions] = useState<FiIdOption[]>([]);
  const [countryOptions, setCountryOptions] = useState<FiIdOption[]>([]);
  const [excludedPeers, setExcludedPeers] = useState<FiCompanyRow[]>([]);
  const {
    checked,
    toggle,
    excludedSourceLabels,
    allowedSourceTypes,
    isDefaultSourceFilter,
    resetSourceFilter,
  } = useDataSourceFilter();
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);
  const [peerAggregateMode, setPeerAggregateMode] = useState<FiPeerAggregateMode>("median");

  const [sortId, setSortId] = useState("revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [addQuery, setAddQuery] = useState("");
  const [addResults, setAddResults] = useState<FiCompanySearchHit[]>([]);
  const [peerColumnIds, setPeerColumnIds] = useState<string[]>(() => [
    ...DEFAULT_FI_PEER_COLUMN_IDS,
  ]);
  const [showPeerColumnsModal, setShowPeerColumnsModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const skipNextSourceRefetch = useRef(false);

  const filterLookups: FiFilterLookups = useMemo(
    () => ({
      regionOptions,
      countryOptions,
      primarySectors,
      secondarySectors,
    }),
    [regionOptions, countryOptions, primarySectors, secondarySectors]
  );

  useEffect(() => {
    locationsService.getPrimarySectors().then(setPrimarySectors).catch(console.error);
    locationsService
      .getAllSecondarySectorsWithPrimary()
      .then((rows) =>
        setSecondarySectors(
          rows.map((row) => ({
            id: row.id,
            sector_name: row.sector_name,
            related_primary_id: row.related_primary_sector?.id ?? null,
            related_primary_name: row.related_primary_sector?.sector_name ?? null,
          }))
        )
      )
      .catch(() =>
        locationsService
          .getSecondarySectors([])
          .then((rows) =>
            setSecondarySectors(rows.map((row) => ({ id: row.id, sector_name: row.sector_name })))
          )
          .catch(console.error)
      );
    locationsService
      .getContinentalRegionsWithIds()
      .then(setRegionOptions)
      .catch(console.error);
    locationsService
      .getCountries()
      .then((rows) =>
        setCountryOptions(
          rows.map((row) => ({ id: row.id, name: row.locations_Country }))
        )
      )
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (addQuery.trim().length < 2) {
      setAddResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      const items = await searchFiCompanies(addQuery, preferredCurrencyId);
      setAddResults(items.filter((item) => item.id !== target?.company_id));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [addQuery, target?.company_id, preferredCurrencyId]);

  const loadBenchmark = useCallback(
    async (
      companyId: number,
      nextFilters = filters,
      include = companyIdsInclude,
      exclude = companyIdsExclude,
      applyDefaultsIfEmpty = false,
      nextExcludedSourceLabels = excludedSourceLabels
    ) => {
      setLoading(true);
      setError(null);

      try {
        const targetResult = await fetchFiTarget(
          companyId,
          preferredCurrencyId,
          nextExcludedSourceLabels
        );
        if (!targetResult.ok) {
          throw new Error(targetResult.error);
        }

        let filtersToUse = nextFilters;
        if (applyDefaultsIfEmpty && filtersToUse.length === 0) {
          filtersToUse = buildDefaultFilters(targetResult.data, filterLookups);
        }

        const request = buildPeersRequest({
          targetCompanyId: companyId,
          filters: filtersToUse,
          companyIdsInclude: include,
          companyIdsExclude: exclude,
          primarySectors,
          secondarySectors,
          regionOptions,
          preferredCurrencyId,
          excludedSourceLabels: nextExcludedSourceLabels,
          targetPrimarySectorIds: resolveTargetPrimarySectorIds(
            targetResult.data,
            primarySectors,
            secondarySectors
          ),
        });

        const peersResult = await fetchFiPeers({
          ...request,
          page: 1,
          per_page: FI_PEERS_PER_PAGE,
        });
        if (!peersResult.ok) {
          throw new Error(peersResult.error);
        }

        const total = peersResult.data.total_peers;
        const pagePeerRows = peersResult.data.peers;

        const responsePreferredCurrencyCode =
          peersResult.data.preferred_currency_code ?? currency;
        setPreferredCurrencyCode(responsePreferredCurrencyCode);

        const pageMissingLogoIds = [
          ...(targetResult.data.company_logo ? [] : [targetResult.data.company_id]),
          ...pagePeerRows
            .filter((peer) => !peer.company_logo)
            .map((peer) => peer.company_id),
        ];
        const pageLogoMap = await fetchFiCompanyLogosByIds(pageMissingLogoIds);
        const enrichedTarget = applyFiCompanyLogos([targetResult.data], pageLogoMap)[0];
        const enrichedPagePeers = applyFiCompanyLogos(pagePeerRows, pageLogoMap);
        const annotatedPagePeers = annotateManuallyAddedPeers(enrichedPagePeers, include);

        setTarget((prev) => ({
          ...enrichedTarget,
          company_logo:
            enrichedTarget.company_logo ??
            peersResult.data.target_logo ??
            prev?.company_logo ??
            null,
        }));
        setFilters(filtersToUse);
        setPeers(annotatedPagePeers);
        setPeersPage(1);
        setTotalPeers(total);
        setBenchmarkPeers(annotatedPagePeers);

        if (total > FI_PEERS_PER_PAGE) {
          void (async () => {
            try {
              const fullPeersResult = await fetchFiPeers({
                ...request,
                page: 1,
                per_page: total,
              });
              if (!fullPeersResult.ok) return;

              const fullPeerRows = fullPeersResult.data.peers;
              const missingLogoIds = fullPeerRows
                .filter((peer) => !peer.company_logo)
                .map((peer) => peer.company_id);
              const logoMap = await fetchFiCompanyLogosByIds(missingLogoIds);
              const enrichedFullPeers = applyFiCompanyLogos(fullPeerRows, logoMap);
              setBenchmarkPeers(
                annotateManuallyAddedPeers(enrichedFullPeers, include)
              );
            } catch {
              /* keep page-limited benchmark peers if full fetch fails */
            }
          })();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load benchmark");
      } finally {
        setLoading(false);
      }
    },
    [
      filters,
      companyIdsInclude,
      companyIdsExclude,
      filterLookups,
      primarySectors,
      secondarySectors,
      regionOptions,
      excludedSourceLabels,
      preferredCurrencyId,
      currency,
    ]
  );

  const loadPeersPage = useCallback(
    async (page: number) => {
      if (!target) return;
      setLoading(true);
      setError(null);
      try {
        const request = buildPeersRequest({
          targetCompanyId: target.company_id,
          filters,
          companyIdsInclude,
          companyIdsExclude,
          primarySectors,
          secondarySectors,
          regionOptions,
          preferredCurrencyId,
          excludedSourceLabels,
          targetPrimarySectorIds: resolveTargetPrimarySectorIds(
            target,
            primarySectors,
            secondarySectors
          ),
        });
        const peersResult = await fetchFiPeers({
          ...request,
          page,
          per_page: FI_PEERS_PER_PAGE,
        });
        if (!peersResult.ok) {
          throw new Error(peersResult.error);
        }
        const missingLogoIds = peersResult.data.peers
          .filter((peer) => !peer.company_logo)
          .map((peer) => peer.company_id);
        const logoMap = await fetchFiCompanyLogosByIds(missingLogoIds);
        const enrichedPeers = applyFiCompanyLogos(peersResult.data.peers, logoMap);
        setPeers(annotateManuallyAddedPeers(enrichedPeers, companyIdsInclude));
        setPeersPage(page);
        setTotalPeers(peersResult.data.total_peers);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load peers");
      } finally {
        setLoading(false);
      }
    },
    [
      target,
      filters,
      companyIdsInclude,
      companyIdsExclude,
      primarySectors,
      secondarySectors,
      regionOptions,
      excludedSourceLabels,
      preferredCurrencyId,
    ]
  );

  useEffect(() => {
    if (!target) return;
    void loadBenchmark(
      target.company_id,
      filters,
      companyIdsInclude,
      companyIdsExclude,
      false,
      excludedSourceLabels
    );
  }, [preferredCurrencyId]); // eslint-disable-line react-hooks/exhaustive-deps -- refetch when platform currency changes

  const selectTarget = useCallback(
    (companyId: number, meta?: FiCompanySearchHit) => {
      setFilters([]);
      setCompanyIdsInclude([]);
      setCompanyIdsExclude([]);
      setExcludedPeers([]);
      setPeers([]);
      setBenchmarkPeers([]);
      setPeersPage(1);
      setTotalPeers(0);
      resetSourceFilter();
      setTarget(placeholderTarget(companyId, meta));
      void loadBenchmark(companyId, [], [], [], true);
    },
    [loadBenchmark, resetSourceFilter]
  );

  const didAutoSelectInitialTarget = useRef(false);
  useEffect(() => {
    if (!initialCompanyId || didAutoSelectInitialTarget.current) return;
    didAutoSelectInitialTarget.current = true;
    selectTarget(initialCompanyId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run once for the initial company id
  }, [initialCompanyId]);

  const clearTarget = useCallback(() => {
    setTarget(null);
    setPeers([]);
    setBenchmarkPeers([]);
    setPeersPage(1);
    setTotalPeers(0);
    setFilters([]);
    setCompanyIdsInclude([]);
    setCompanyIdsExclude([]);
    setExcludedPeers([]);
    resetSourceFilter();
    setError(null);
  }, [resetSourceFilter]);

  const refreshPeers = useCallback(
    (
      nextFilters: FilterState[],
      include: number[],
      exclude: number[],
      nextExcludedSourceLabels = excludedSourceLabels
    ) => {
      if (!target) return;
      void loadBenchmark(
        target.company_id,
        nextFilters,
        include,
        exclude,
        false,
        nextExcludedSourceLabels
      );
    },
    [loadBenchmark, target, excludedSourceLabels]
  );

  const handleToggleSourceLabel = useCallback(
    (label: FiMetricSourceType) => {
      toggle(label);
    },
    [toggle]
  );

  useEffect(() => {
    if (!target) return;
    if (skipNextSourceRefetch.current) {
      skipNextSourceRefetch.current = false;
      return;
    }

    void loadBenchmark(
      target.company_id,
      filters,
      companyIdsInclude,
      companyIdsExclude,
      false,
      excludedSourceLabels
    );
  }, [excludedSourceLabels]); // eslint-disable-line react-hooks/exhaustive-deps -- refetch peers/target when source flags change only

  const addFilter = useCallback(
    (filter: FilterState) => {
      const next = [...filters.filter((item) => item.id !== filter.id), filter];
      setFilters(next);
      refreshPeers(next, companyIdsInclude, companyIdsExclude);
    },
    [filters, companyIdsInclude, companyIdsExclude, refreshPeers]
  );

  const updateFilter = useCallback(
    (filter: FilterState) => {
      const next = filters.map((item) => (item.id === filter.id ? filter : item));
      setFilters(next);
      refreshPeers(next, companyIdsInclude, companyIdsExclude);
    },
    [filters, companyIdsInclude, companyIdsExclude, refreshPeers]
  );

  const removeFilter = useCallback(
    (id: string) => {
      const next = filters.filter((item) => item.id !== id);
      setFilters(next);
      refreshPeers(next, companyIdsInclude, companyIdsExclude);
    },
    [filters, companyIdsInclude, companyIdsExclude, refreshPeers]
  );

  // "Reset to default" restores the same suggested filter set (region/sector/
  // revenue bracket derived from the target) that a benchmark starts with —
  // this used to be a separate "Apply suggested filters" action, but the two
  // did the same thing in practice, so only this one is kept.
  const resetToDefault = useCallback(() => {
    if (!target) return;
    const suggested = buildDefaultFilters(target, filterLookups);
    setCompanyIdsInclude([]);
    setCompanyIdsExclude([]);
    setExcludedPeers([]);
    setFilters(suggested);
    skipNextSourceRefetch.current = true;
    resetSourceFilter();
    void loadBenchmark(target.company_id, suggested, [], [], false, []);
  }, [loadBenchmark, resetSourceFilter, target, filterLookups]);

  const excludePeer = useCallback(
    (companyId: number) => {
      const peer =
        peers.find((row) => row.company_id === companyId) ??
        benchmarkPeers.find((row) => row.company_id === companyId);
      const wasManuallyAdded =
        companyIdsInclude.includes(companyId) || Boolean(peer?.is_manually_added);
      if (peer) {
        setExcludedPeers((prev) => [
          ...prev.filter((row) => row.company_id !== companyId),
          { ...peer, is_manually_added: wasManuallyAdded },
        ]);
      }
      const nextExclude = Array.from(new Set([...companyIdsExclude, companyId]));
      const nextInclude = companyIdsInclude.filter((id) => id !== companyId);
      setCompanyIdsExclude(nextExclude);
      setCompanyIdsInclude(nextInclude);
      refreshPeers(filters, nextInclude, nextExclude);
    },
    [companyIdsExclude, companyIdsInclude, filters, peers, benchmarkPeers, refreshPeers]
  );

  const restorePeer = useCallback(
    (companyId: number) => {
      const excludedPeer = excludedPeers.find((row) => row.company_id === companyId);
      const nextExclude = companyIdsExclude.filter((id) => id !== companyId);
      const nextInclude = excludedPeer?.is_manually_added
        ? Array.from(new Set([...companyIdsInclude, companyId]))
        : companyIdsInclude;
      setExcludedPeers((prev) => prev.filter((row) => row.company_id !== companyId));
      setCompanyIdsExclude(nextExclude);
      setCompanyIdsInclude(nextInclude);
      refreshPeers(filters, nextInclude, nextExclude);
    },
    [companyIdsExclude, companyIdsInclude, excludedPeers, filters, refreshPeers]
  );

  const restoreAllPeers = useCallback(() => {
    const nextInclude = Array.from(
      new Set([
        ...companyIdsInclude,
        ...excludedPeers.filter((peer) => peer.is_manually_added).map((peer) => peer.company_id),
      ])
    );
    setExcludedPeers([]);
    setCompanyIdsExclude([]);
    setCompanyIdsInclude(nextInclude);
    refreshPeers(filters, nextInclude, []);
  }, [companyIdsInclude, excludedPeers, filters, refreshPeers]);

  const addPeerCompany = useCallback(
    (companyId: number) => {
      const nextInclude = Array.from(new Set([...companyIdsInclude, companyId]));
      const nextExclude = companyIdsExclude.filter((id) => id !== companyId);
      setCompanyIdsInclude(nextInclude);
      setCompanyIdsExclude(nextExclude);
      setAddQuery("");
      setAddResults([]);
      refreshPeers(filters, nextInclude, nextExclude);
    },
    [companyIdsExclude, companyIdsInclude, filters, refreshPeers]
  );

  const selectedCompanyIdList = useMemo(() => {
    if (!target) return [];
    const ids = new Set<number>([target.company_id]);
    for (const peer of benchmarkPeers) {
      ids.add(peer.company_id);
    }
    return Array.from(ids);
  }, [target, benchmarkPeers]);

  const handleSaveBenchmark = useCallback(() => {
    if (selectedCompanyIdList.length === 0) return;
    setShowBulkAddModal(true);
  }, [selectedCompanyIdList]);

  const suggestedFilters = useMemo(
    () => (target ? buildDefaultFilters(target, filterLookups) : []),
    [target, filterLookups]
  );

  const isAtDefaultBenchmark = useMemo(() => {
    if (!target) return true;
    if (companyIdsInclude.length > 0 || companyIdsExclude.length > 0) return false;
    if (!isDefaultSourceFilter) return false;
    if (filters.length === 0) {
      return suggestedFilters.length === 0;
    }
    return filtersEqual(filters, suggestedFilters);
  }, [
    target,
    companyIdsInclude,
    companyIdsExclude,
    isDefaultSourceFilter,
    filters,
    suggestedFilters,
  ]);

  const hasActiveSourceFilter = !isDefaultSourceFilter;

  const displayTarget = useMemo(() => {
    if (!target) return null;
    return filterCompanyRowByAllowedSources(target, allowedSourceTypes);
  }, [target, allowedSourceTypes]);

  const displayBenchmarkPeers = useMemo(
    () => filterCompanyRowsByAllowedSources(benchmarkPeers, allowedSourceTypes),
    [benchmarkPeers, allowedSourceTypes]
  );

  const displayTablePeers = useMemo(
    () => filterCompanyRowsByAllowedSources(peers, allowedSourceTypes),
    [peers, allowedSourceTypes]
  );

  const headlineMetrics = useMemo(() => {
    if (!displayTarget) return [];
    return buildHeadlineMetrics(
      displayTarget,
      displayBenchmarkPeers,
      peerAggregateMode,
      preferredCurrencyCode,
      allowedSourceTypes
    );
  }, [
    displayTarget,
    displayBenchmarkPeers,
    peerAggregateMode,
    preferredCurrencyCode,
    allowedSourceTypes,
  ]);

  const benchmarkRows = useMemo(() => {
    if (!displayTarget) return [];
    return buildBenchmarkMetricRows(
      displayTarget,
      displayBenchmarkPeers,
      peerAggregateMode,
      preferredCurrencyCode,
      allowedSourceTypes
    );
  }, [
    displayTarget,
    displayBenchmarkPeers,
    peerAggregateMode,
    preferredCurrencyCode,
    allowedSourceTypes,
  ]);

  const compositePercentile = useMemo(() => {
    if (!displayTarget) return null;
    return computeCompositePercentile(
      displayTarget,
      displayBenchmarkPeers,
      allowedSourceTypes
    );
  }, [displayTarget, displayBenchmarkPeers, allowedSourceTypes]);

  const peerFinRows = useMemo(
    () =>
      displayTablePeers.map((peer) =>
        mapCompanyToFinRow(peer, primarySectors, secondarySectors, preferredCurrencyCode)
      ),
    [displayTablePeers, primarySectors, secondarySectors, preferredCurrencyCode]
  );

  const handleExport = useCallback(async () => {
    if (!displayTarget) return;

    setExporting(true);
    try {
      const targetRow = mapCompanyToFinRow(
        displayTarget,
        primarySectors,
        secondarySectors,
        preferredCurrencyCode
      );
      const aggregateRow = buildPeerAggregateFinRow(
        displayBenchmarkPeers,
        primarySectors,
        secondarySectors,
        peerAggregateMode,
        preferredCurrencyCode,
        allowedSourceTypes
      );

      const allPeerFinRows = displayBenchmarkPeers.map((peer) =>
        mapCompanyToFinRow(peer, primarySectors, secondarySectors, preferredCurrencyCode)
      );

      const sortedPeerRows = [...allPeerFinRows].sort((a, b) => {
        if (!sortId) return 0;
        const av = finRowValueForSort(a, sortId);
        const bv = finRowValueForSort(b, sortId);
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === "string") {
          return sortDir === "asc"
            ? av.localeCompare(bv as string)
            : (bv as string).localeCompare(av);
        }
        return sortDir === "asc"
          ? (av as number) - (bv as number)
          : (bv as number) - (av as number);
      });

      await exportFinancialBenchmarkList(
        { mode: "all_columns", scope: "full_list" },
        {
          targetRow,
          aggregateRow,
          peerRows: sortedPeerRows,
          visibleColumnKeys: peerColumnIds,
          peerAggregateMode,
          displayCurrency: preferredCurrencyCode as typeof currency,
          fxRates: null,
        }
      );
    } finally {
      setExporting(false);
    }
  }, [
    displayTarget,
    displayBenchmarkPeers,
    primarySectors,
    secondarySectors,
    peerAggregateMode,
    sortId,
    sortDir,
    peerColumnIds,
    preferredCurrencyCode,
    allowedSourceTypes,
    currency,
  ]);

  const sectorMedian = useMemo(
    () =>
      buildPeerSectorMedian(displayBenchmarkPeers, peerAggregateMode, allowedSourceTypes),
    [displayBenchmarkPeers, peerAggregateMode, allowedSourceTypes]
  );

  const peersPageTotal = useMemo(
    () => Math.max(1, Math.ceil(totalPeers / FI_PEERS_PER_PAGE)),
    [totalPeers]
  );

  const visibleColumnIds = peerColumnIds.filter(
    (id) => !REMOVED_FI_PEER_COLUMN_IDS.has(id)
  );

  const peerColumnVisibilityInitial = useMemo(
    () => columnIdsToVisibility(peerColumnIds),
    [peerColumnIds]
  );

  const handleApplyPeerColumns = useCallback(
    (visible: Record<string, boolean>, order?: string[]) => {
      setPeerColumnIds(resolvePeerColumnIdsFromModal(visible, order));
      setShowPeerColumnsModal(false);
    },
    []
  );

  const showBenchmarkSkeleton = loading && benchmarkPeers.length === 0;
  const showBenchmarkContent = target && !showBenchmarkSkeleton;
  const isRefreshingBenchmark = loading && benchmarkPeers.length > 0;

  // Keep "Companies in this benchmark" the same height as the Metric
  // scorecard beside it, whatever that height ends up being (varies with
  // number of expanded metric sections, etc).
  const benchmarkTableWrapRef = useRef<HTMLDivElement | null>(null);
  const [benchmarkTableHeight, setBenchmarkTableHeight] = useState<number | null>(null);

  useEffect(() => {
    const el = benchmarkTableWrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.height;
      if (typeof next === "number") setBenchmarkTableHeight(next);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [showBenchmarkContent]);

  const Shell = embedded ? React.Fragment : AppShell;

  return (
    <Shell>
    <div
      className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden"
      style={{
        background: "var(--ax-gray-50)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <main
        style={
          embedded
            ? {
                width: "100%",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                flex: 1,
                minHeight: 0,
              }
            : {
                width: "100%",
                padding: "20px 28px 24px",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                overflowX: "hidden",
              }
        }
      >
        {!embedded && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 26,
                padding: "0 13px",
                borderRadius: 999,
                background: "var(--ax-cyan-50)",
                border: "1px solid var(--ax-cyan-100)",
                fontSize: 11,
                fontWeight: 800,
                color: "var(--ax-cyan-600)",
                letterSpacing: "0.09em",
                textTransform: "uppercase",
              }}
            >
              Financial Intelligence
            </span>
            <h1 style={{ margin: "6px 0 0", fontSize: 28, fontWeight: 800, letterSpacing: "-0.026em", color: "var(--fg-1)" }}>
              Financial Benchmark
            </h1>
            <p style={{ margin: 0, color: "var(--fg-3)", fontSize: 14, maxWidth: 760 }}>
              Compare a target company against a peer set. Metrics, percentiles, and medians are
              computed client-side after target and peer data load.
            </p>
          </div>

          {target && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => void handleExport()}
                disabled={loading || totalPeers === 0 || exporting}
                style={{
                  ...SEARCH_HEADER_ACTION_BUTTON_STYLE,
                  height: 32,
                  padding: "0 12px",
                  fontSize: 12,
                  opacity: loading || totalPeers === 0 ? 0.5 : 1,
                  cursor: loading || totalPeers === 0 || exporting ? "default" : "pointer",
                  fontFamily: "var(--font-sans)",
                }}
              >
                <SearchExportCsvIcon />
                {exporting ? "Exporting..." : "Export"}
              </button>
              <button
                type="button"
                onClick={handleSaveBenchmark}
                disabled={loading || selectedCompanyIdList.length === 0}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  height: 32,
                  padding: "0 14px",
                  borderRadius: 999,
                  border: "none",
                  background: "var(--ax-cyan-600)",
                  color: "white",
                  fontWeight: 700,
                  fontSize: 12,
                  boxShadow: "var(--shadow-brand-glow)",
                  cursor: loading || selectedCompanyIdList.length === 0 ? "default" : "pointer",
                  opacity: loading || selectedCompanyIdList.length === 0 ? 0.5 : 1,
                  fontFamily: "var(--font-sans)",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12">
                  <path
                    d="M6 2v8M2 6h8"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
                Save benchmark
              </button>
            </div>
          )}
        </div>
        )}

        <FiControlBar
          targetId={target?.company_id ?? null}
          targetName={target?.company_name ?? null}
          targetLogo={target?.company_logo ?? null}
          loading={loading}
          onSelectTarget={selectTarget}
          onClearTarget={clearTarget}
          filters={filters}
          onAddFilter={addFilter}
          onUpdateFilter={updateFilter}
          onRemoveFilter={removeFilter}
          primarySectorOptions={primarySectors.map((s) => s.sector_name)}
          secondarySectorOptions={secondarySectors.map((s) => s.sector_name)}
          primarySectors={primarySectors}
          secondarySectors={secondarySectors}
          regionOptions={regionOptions}
          countryOptions={countryOptions}
          peerCount={totalPeers || peers.length}
          isDefaultMode={isAtDefaultBenchmark}
          onResetToDefault={resetToDefault}
          checkedSourceLabels={checked}
          onToggleSourceLabel={handleToggleSourceLabel}
          addQuery={addQuery}
          onAddQueryChange={setAddQuery}
          addResults={addResults}
          onAddCompany={addPeerCompany}
          peerAggregateMode={peerAggregateMode}
          onPeerAggregateModeChange={setPeerAggregateMode}
        />

        {showBenchmarkSkeleton && <FiBenchmarkSkeleton />}

        {error && (
          <div
            style={{
              padding: 14,
              marginBottom: 16,
              borderRadius: "var(--r-md)",
              background: "var(--ax-negative-bg)",
              color: "var(--ax-negative)",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        {!target && !loading && <FiTargetEmptyState />}

        {showBenchmarkContent && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              minHeight: 0,
            }}
          >
          <FiBenchmarkRefreshing active={isRefreshingBenchmark}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                flex: 1,
                minHeight: 0,
              }}
            >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "260px repeat(3, minmax(0, 1fr))",
                gap: 12,
                flexShrink: 0,
              }}
            >
              <CompositeHero
                compositePercentile={compositePercentile}
                targetName={target.company_name}
                peerCount={totalPeers}
              />
              <HeadlineMetricCards
                metrics={headlineMetrics}
                peerAggregateMode={peerAggregateMode}
                hasActiveSourceFilter={hasActiveSourceFilter}
                preferredCurrencyCode={preferredCurrencyCode}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) minmax(300px, 380px)",
                gap: 12,
                alignItems: "start",
                minWidth: 0,
              }}
            >
              <div ref={benchmarkTableWrapRef} style={{ minWidth: 0 }}>
                <BenchmarkTable
                  rows={benchmarkRows}
                  targetName={target.company_name}
                  target={displayTarget ?? target}
                  peers={displayBenchmarkPeers}
                  peerAggregateMode={peerAggregateMode}
                  hasActiveSourceFilter={hasActiveSourceFilter}
                  allowedSourceTypes={allowedSourceTypes}
                  preferredCurrencyCode={preferredCurrencyCode}
                />
              </div>
              <div
                style={{
                  height: benchmarkTableHeight != null ? `${benchmarkTableHeight}px` : "100%",
                  minHeight: 0,
                }}
              >
                <PeerCompaniesCard
                  peers={displayBenchmarkPeers}
                  totalPeerCount={totalPeers}
                  target={target}
                  excludedPeers={excludedPeers}
                  excludedIds={companyIdsExclude}
                  manuallyAddedIds={companyIdsInclude}
                  onExclude={excludePeer}
                  onRestorePeer={restorePeer}
                  onRestoreAll={restoreAllPeers}
                  onAddCompany={addPeerCompany}
                  addQuery={addQuery}
                  onAddQueryChange={setAddQuery}
                  addResults={addResults}
                  onPickAddResult={() => setAddQuery("")}
                />
              </div>
            </div>

            <div
              style={{
                minWidth: 0,
                background: "white",
                border: "1px solid var(--border-1)",
                borderRadius: "var(--r-lg)",
                overflow: "hidden",
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "10px 12px",
                  borderBottom: "1px solid var(--border-1)",
                  flexShrink: 0,
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, color: "var(--fg-1)", fontSize: 13 }}>
                    Peer financials table
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--fg-2)",
                      marginTop: 4,
                      lineHeight: 1.45,
                    }}
                  >
                    {totalPeers.toLocaleString()}{" "}
                    {totalPeers === 1 ? "company" : "companies"}
                    {peersPageTotal > 1
                      ? ` · page ${peersPage} of ${peersPageTotal} (${FI_PEERS_PER_PAGE} per page)`
                      : ""}
                    {companyIdsExclude.length > 0 ? ` · ${companyIdsExclude.length} dropped` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <SearchColumnsButton
                    active={showPeerColumnsModal}
                    count={peerColumnIds.length}
                    total={FI_PEER_COLUMN_TOTAL}
                    onClick={() => setShowPeerColumnsModal((open) => !open)}
                  />
                  <Link
                    href={`/company/${target.company_id}`}
                    style={{ fontSize: 12, color: "var(--ax-cyan-700)", fontWeight: 600, flexShrink: 0 }}
                  >
                    View target profile →
                  </Link>
                </div>
              </div>

              <div
                style={{
                  maxHeight: "min(52vh, 560px)",
                  overflow: "auto",
                }}
              >
                <FiPeerFinancialsTable
                  rows={peerFinRows}
                  preferredCurrencyCode={preferredCurrencyCode}
                  tweaks={{
                    sectionName: "Financial Intelligence",
                    showMedian: true,
                    colorMultiples: true,
                    chipStyle: "cyan",
                    chipIcon: true,
                    density: "comfortable",
                    hideCompanyAvatars: false,
                    peerAggregateMode,
                    chromeless: true,
                    aggregatePeerCount: displayBenchmarkPeers.length,
                  }}
                  sortId={sortId}
                  sortDir={sortDir}
                  onSort={(id) => {
                    if (sortId === id) setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
                    else {
                      setSortId(id);
                      setSortDir("desc");
                    }
                  }}
                  visibleColumnIds={visibleColumnIds}
                  sectorMedian={sectorMedian}
                />
              </div>
              {peersPageTotal > 1 && (
                <div
                  style={{
                    borderTop: "1px solid var(--border-1)",
                    background: "var(--ax-gray-25)",
                    flexShrink: 0,
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "4px 12px",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: 12,
                      fontSize: 12,
                      color: "var(--fg-2)",
                      lineHeight: 1.45,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {totalPeers.toLocaleString()}{" "}
                    {totalPeers === 1 ? "company" : "companies"}
                    {` · page ${peersPage} of ${peersPageTotal} (${FI_PEERS_PER_PAGE} per page)`}
                  </div>
                  <SearchTablePagination
                    curPage={peersPage}
                    pageTotal={peersPageTotal}
                    onPageChange={(page) => void loadPeersPage(page)}
                    disabled={loading}
                  />
                </div>
              )}
            </div>
            </div>
          </FiBenchmarkRefreshing>
          </div>
        )}
      </main>
      <BulkAddToPortfolioModal
        isOpen={showBulkAddModal}
        onClose={() => setShowBulkAddModal(false)}
        companyIds={selectedCompanyIdList}
      />
      {!embedded && <Footer />}
      {showPeerColumnsModal && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 199,
              cursor: "default",
            }}
            onClick={() => setShowPeerColumnsModal(false)}
            aria-hidden
          />
          <ColumnsControlRoom
            initial={peerColumnVisibilityInitial}
            initialOrder={peerColumnIds}
            onCancel={() => setShowPeerColumnsModal(false)}
            onApply={handleApplyPeerColumns}
            categories={FI_PEER_COLUMN_CATEGORIES}
            title="Column Control Room"
            defaultVisibleColumnKeys={DEFAULT_FI_PEER_COLUMN_IDS}
            reorderHint="Drag rows to reorder. Company stays fixed as the first column."
          />
        </>
      )}
    </div>
    </Shell>
  );
}
