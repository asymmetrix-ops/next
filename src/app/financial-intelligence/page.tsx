"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
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
  type FiFilterLookups,
} from "@/lib/financialIntelligence/filterPayload";
import { buildDefaultFilters } from "@/lib/financialIntelligence/defaultFilters";
import {
  computeCompositePercentile,
} from "@/lib/financialIntelligence/calculations";
import { exportFinancialBenchmarkList } from "@/lib/listExport/financialBenchmarkListExport";
import {
  SEARCH_HEADER_ACTION_BUTTON_STYLE,
  SearchExportCsvIcon,
} from "@/components/search/searchHeaderActions";
import { annotateManuallyAddedPeers } from "@/lib/financialIntelligence/normalize";
import { deriveSourceOptions } from "@/lib/financialIntelligence/deriveSourceOptions";
import { useDataSourceFilter } from "@/lib/financialIntelligence/useDataSourceFilter";
import type { FiCompanyRow, FiPeerAggregateMode, FiSecondarySectorLookup, FiSectorLookup } from "@/lib/financialIntelligence/types";
import { usePlatformCurrency } from "@/components/providers/PlatformCurrencyProvider";
import { DEFAULT_PLATFORM_CURRENCY_ID } from "@/lib/platformCurrency";
import { FiFxProvider, useFiFxRates } from "./components/FiFxContext";
import { CURRENCY_OPTIONS, getFXRates } from "@/lib/fxRates";
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
}: {
  rows: ReturnType<typeof mapCompanyToFinRow>[];
  tweaks: React.ComponentProps<typeof FinancialsTable>["tweaks"];
  sortId: string;
  sortDir: "asc" | "desc";
  onSort: (id: string) => void;
  visibleColumnIds: string[];
  sectorMedian: ReturnType<typeof buildPeerSectorMedian>;
}) {
  const { currency } = usePlatformCurrency();
  const fxRates = useFiFxRates();
  const currencySymbol =
    CURRENCY_OPTIONS.find((option) => option.value === currency)?.symbol ?? "$";

  return (
    <FinancialsTable
      rows={rows}
      tweaks={tweaks}
      currencySymbol={currencySymbol}
      displayCurrency={currency}
      fxRates={fxRates}
      sortId={sortId}
      sortDir={sortDir}
      onSort={onSort}
      visibleColumnIds={visibleColumnIds}
      sectorMedian={sectorMedian}
    />
  );
}

export default function FinancialIntelligencePage() {
  const { currencyId: preferredCurrencyId, currency } = usePlatformCurrency();
  const [target, setTarget] = useState<FiCompanyRow | null>(null);
  const [peers, setPeers] = useState<FiCompanyRow[]>([]);
  const [totalPeers, setTotalPeers] = useState(0);
  const [isDefaultMode, setIsDefaultMode] = useState(true);
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
  const [allSources, setAllSources] = useState<string[]>([]);
  const { checked, toggle, excludedSourceLabels, isDefaultSourceFilter } =
    useDataSourceFilter(allSources);
  const sourceFilterFetchReadyRef = useRef(false);
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

  const resetSourceFilterFetchGate = useCallback(() => {
    sourceFilterFetchReadyRef.current = false;
  }, []);

  const loadBenchmark = useCallback(
    async (
      companyId: number,
      nextFilters = filters,
      include = companyIdsInclude,
      exclude = companyIdsExclude,
      applyDefaultsIfEmpty = false,
      nextExcludedSourceLabels = excludedSourceLabels,
      discoverSourceOptions = allSources.length === 0
    ) => {
      setLoading(true);
      setError(null);

      try {
        const labelsForRequest = discoverSourceOptions ? [] : nextExcludedSourceLabels;

        const targetResult = await fetchFiTarget(
          companyId,
          DEFAULT_PLATFORM_CURRENCY_ID,
          labelsForRequest
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
          preferredCurrencyId: DEFAULT_PLATFORM_CURRENCY_ID,
          excludedSourceLabels: labelsForRequest,
        });

        const peersResult = await fetchFiPeers(request);
        if (!peersResult.ok) {
          throw new Error(peersResult.error);
        }

        const missingLogoIds = [
          ...(targetResult.data.company_logo ? [] : [targetResult.data.company_id]),
          ...peersResult.data.peers
            .filter((peer) => !peer.company_logo)
            .map((peer) => peer.company_id),
        ];
        const logoMap = await fetchFiCompanyLogosByIds(missingLogoIds);
        const enrichedTarget = applyFiCompanyLogos([targetResult.data], logoMap)[0];
        const enrichedPeers = applyFiCompanyLogos(peersResult.data.peers, logoMap);

        if (discoverSourceOptions) {
          setAllSources(
            deriveSourceOptions([enrichedTarget, ...enrichedPeers])
          );
        }

        setTarget((prev) => ({
          ...enrichedTarget,
          company_logo:
            enrichedTarget.company_logo ??
            peersResult.data.target_logo ??
            prev?.company_logo ??
            null,
        }));
        setFilters(filtersToUse);
        setPeers(annotateManuallyAddedPeers(enrichedPeers, include));
        setTotalPeers(peersResult.data.total_peers);
        setIsDefaultMode(peersResult.data.is_default_mode);
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
      allSources.length,
    ]
  );

  // Benchmark monetary fields are stored in USD and converted client-side when platform currency changes.

  const selectTarget = useCallback(
    (companyId: number, meta?: FiCompanySearchHit) => {
      setFilters([]);
      setCompanyIdsInclude([]);
      setCompanyIdsExclude([]);
      setExcludedPeers([]);
      setPeers([]);
      setTotalPeers(0);
      setAllSources([]);
      resetSourceFilterFetchGate();
      setTarget(placeholderTarget(companyId, meta));
      void loadBenchmark(companyId, [], [], [], true);
    },
    [loadBenchmark, resetSourceFilterFetchGate]
  );

  const clearTarget = useCallback(() => {
    setTarget(null);
    setPeers([]);
    setTotalPeers(0);
    setFilters([]);
    setCompanyIdsInclude([]);
    setCompanyIdsExclude([]);
    setExcludedPeers([]);
    setAllSources([]);
    resetSourceFilterFetchGate();
    setError(null);
  }, [resetSourceFilterFetchGate]);

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
        nextExcludedSourceLabels,
        false
      );
    },
    [loadBenchmark, target, excludedSourceLabels]
  );

  const handleToggleSourceLabel = useCallback(
    (label: string) => {
      toggle(label);
    },
    [toggle]
  );

  useEffect(() => {
    if (!target || allSources.length === 0) return;

    if (!sourceFilterFetchReadyRef.current) {
      sourceFilterFetchReadyRef.current = true;
      return;
    }

    void loadBenchmark(
      target.company_id,
      filters,
      companyIdsInclude,
      companyIdsExclude,
      false,
      excludedSourceLabels,
      false
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

  const resetToDefault = useCallback(() => {
    if (!target) return;
    setFilters([]);
    setCompanyIdsInclude([]);
    setCompanyIdsExclude([]);
    setExcludedPeers([]);
    setAllSources([]);
    resetSourceFilterFetchGate();
    void loadBenchmark(target.company_id, [], [], [], false, [], true);
  }, [loadBenchmark, resetSourceFilterFetchGate, target]);

  const applySuggestedFilters = useCallback(() => {
    if (!target) return;
    const suggested = buildDefaultFilters(target, filterLookups);
    setFilters(suggested);
    refreshPeers(suggested, companyIdsInclude, companyIdsExclude);
  }, [target, filterLookups, companyIdsInclude, companyIdsExclude, refreshPeers]);

  const excludePeer = useCallback(
    (companyId: number) => {
      const peer = peers.find((row) => row.company_id === companyId);
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
    [companyIdsExclude, companyIdsInclude, filters, peers, refreshPeers]
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
    for (const peer of peers) {
      ids.add(peer.company_id);
    }
    return Array.from(ids);
  }, [target, peers]);

  const handleSaveBenchmark = useCallback(() => {
    if (selectedCompanyIdList.length === 0) return;
    setShowBulkAddModal(true);
  }, [selectedCompanyIdList]);

  const headlineMetrics = useMemo(() => {
    if (!target) return [];
    return buildHeadlineMetrics(target, peers, peerAggregateMode);
  }, [target, peers, peerAggregateMode]);

  const benchmarkRows = useMemo(() => {
    if (!target) return [];
    return buildBenchmarkMetricRows(target, peers, peerAggregateMode);
  }, [target, peers, peerAggregateMode]);

  const compositePercentile = useMemo(() => {
    if (!target) return null;
    return computeCompositePercentile(target, peers);
  }, [target, peers]);

  const peerFinRows = useMemo(
    () => peers.map((peer) => mapCompanyToFinRow(peer, primarySectors, secondarySectors)),
    [peers, primarySectors, secondarySectors]
  );

  const handleExport = useCallback(async () => {
    if (!target) return;

    setExporting(true);
    try {
      const fxRates = await getFXRates();
      const targetRow = mapCompanyToFinRow(target, primarySectors, secondarySectors);
      const aggregateRow = buildPeerAggregateFinRow(
        peers,
        primarySectors,
        secondarySectors,
        peerAggregateMode
      );

      const sortedPeerRows = [...peerFinRows].sort((a, b) => {
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
          displayCurrency: currency,
          fxRates,
        }
      );
    } finally {
      setExporting(false);
    }
  }, [
    target,
    peers,
    peerFinRows,
    primarySectors,
    secondarySectors,
    peerAggregateMode,
    sortId,
    sortDir,
    peerColumnIds,
    currency,
  ]);

  const sectorMedian = useMemo(
    () => buildPeerSectorMedian(peers, peerAggregateMode),
    [peers, peerAggregateMode]
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

  const effectiveDefaultMode = isDefaultMode && isDefaultSourceFilter;
  const hasActiveSourceFilter = !isDefaultSourceFilter;

  const showBenchmarkSkeleton = loading && peers.length === 0;
  const showBenchmarkContent = target && !showBenchmarkSkeleton;
  const isRefreshingBenchmark = loading && peers.length > 0;

  return (
    <FiFxProvider>
    <div className="min-h-screen" style={{ background: "var(--ax-gray-25)", fontFamily: "var(--font-sans)" }}>
      <Header />
      <main style={{ width: "100%", padding: "20px 28px 48px", boxSizing: "border-box" }}>
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
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--ax-cyan-700)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Financial Intelligence
            </div>
            <h1 style={{ margin: "6px 0 8px", fontSize: 28, fontWeight: 800, color: "var(--fg-1)" }}>
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
                disabled={loading || peers.length === 0 || exporting}
                style={{
                  ...SEARCH_HEADER_ACTION_BUTTON_STYLE,
                  height: 32,
                  padding: "0 12px",
                  fontSize: 12,
                  opacity: loading || peers.length === 0 ? 0.5 : 1,
                  cursor: loading || peers.length === 0 || exporting ? "default" : "pointer",
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
                  padding: "8px 14px",
                  borderRadius: "var(--r-md)",
                  border: "none",
                  background: "var(--ax-gray-900)",
                  color: "white",
                  fontWeight: 600,
                  fontSize: 12,
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
          isDefaultMode={effectiveDefaultMode}
          onResetToDefault={resetToDefault}
          onApplySuggestedFilters={applySuggestedFilters}
          sourceLabels={allSources}
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

        {!target && !loading && (
          <div
            style={{
              padding: 32,
              borderRadius: "var(--r-lg)",
              border: "1px dashed var(--border-1)",
              background: "white",
              color: "var(--fg-3)",
              fontSize: 14,
            }}
          >
            Select a target company to load its financial profile and default peer set.
          </div>
        )}

        {showBenchmarkContent && (
          <FiBenchmarkRefreshing active={isRefreshingBenchmark}>
            <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "260px repeat(3, minmax(0, 1fr))",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <CompositeHero
                compositePercentile={compositePercentile}
                targetName={target.company_name}
                peerCount={peers.length}
              />
              <HeadlineMetricCards
                metrics={headlineMetrics}
                peerAggregateMode={peerAggregateMode}
                hasActiveSourceFilter={hasActiveSourceFilter}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) 280px",
                gap: 12,
                alignItems: "start",
                marginBottom: 16,
                minWidth: 0,
              }}
            >
              <BenchmarkTable
                rows={benchmarkRows}
                targetName={target.company_name}
                target={target}
                peers={peers}
                peerAggregateMode={peerAggregateMode}
                hasActiveSourceFilter={hasActiveSourceFilter}
              />
              <PeerCompaniesCard
                peers={peers}
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

            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  marginBottom: 8,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: "var(--fg-1)" }}>Peer financials table</div>
                  <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>
                    {peers.length} {peers.length === 1 ? "company" : "companies"}
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
                    href={`/new_company/${target.company_id}`}
                    style={{ fontSize: 12, color: "var(--ax-cyan-700)", fontWeight: 600, flexShrink: 0 }}
                  >
                    View target profile →
                  </Link>
                </div>
              </div>

              <FiPeerFinancialsTable
                rows={peerFinRows}
                tweaks={{
                  sectionName: "Financial Intelligence",
                  showMedian: true,
                  colorMultiples: true,
                  chipStyle: "cyan",
                  chipIcon: true,
                  density: "comfortable",
                  hideCompanyAvatars: false,
                  peerAggregateMode,
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
            </>
          </FiBenchmarkRefreshing>
        )}
      </main>
      <BulkAddToPortfolioModal
        isOpen={showBulkAddModal}
        onClose={() => setShowBulkAddModal(false)}
        companyIds={selectedCompanyIdList}
      />
      <Footer />
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
    </FiFxProvider>
  );
}
