"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BulkAddToPortfolioModal } from "@/components/companies/BulkAddToPortfolioModal";
import type { FilterState } from "@/app/financials-tsx/types";
import {
  FIN_COLUMN_DEFAULT_VISIBILITY,
  FIN_COLUMN_ORDER,
} from "@/app/financials-tsx/financials-columns";
import { FinancialsTable } from "@/app/financials-tsx/financials-table";
import "../financials-tsx/colors_and_type.css";
import { fetchFiPeers, fetchFiTarget, searchFiCompanies, type FiCompanySearchHit } from "@/lib/financialIntelligence/apiClient";
import { FiControlBar, type FiIdOption } from "./components/FiControlBar";
import { FiModeTabs, FiSectorComingSoon, type FiBenchmarkMode } from "./components/FiModeTabs";
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
import { exportBenchmarkToCsv } from "@/lib/financialIntelligence/exportCsv";
import { annotateManuallyAddedPeers } from "@/lib/financialIntelligence/normalize";
import {
  DEFAULT_FI_SOURCE_TYPES,
  FI_SOURCE_TYPES,
  isDefaultSourceTypes,
  type FiMetricSourceType,
} from "@/lib/financialIntelligence/sourceTypes";
import type { FiCompanyRow, FiSecondarySectorLookup, FiSectorLookup } from "@/lib/financialIntelligence/types";

function placeholderTarget(id: number, meta?: FiCompanySearchHit): FiCompanyRow {
  return {
    company_id: id,
    company_name: meta?.name ?? `Company #${id}`,
    company_logo: meta?.logo ?? null,
    sectors_id: "",
    location_country: "",
    location_region: "",
    financial_year: 0,
    fy_ye_month: 0,
    revenue_m_usd: null,
    rev_growth_pc: null,
    ebitda_margin: null,
    ebitda_m_usd: null,
    ebit_m_usd: null,
    rule_of_40: null,
    ev_usd: null,
    revenue_multiple: null,
    ev_revenue_x: null,
    ev_ebitda_x: null,
    url: null,
  };
}

export default function FinancialIntelligencePage() {
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
  const [allowedSources, setAllowedSources] = useState<FiMetricSourceType[]>([
    ...DEFAULT_FI_SOURCE_TYPES,
  ]);
  const [benchmarkMode, setBenchmarkMode] = useState<FiBenchmarkMode>("company");
  const [showBulkAddModal, setShowBulkAddModal] = useState(false);

  const [sortId, setSortId] = useState("revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [addQuery, setAddQuery] = useState("");
  const [addResults, setAddResults] = useState<FiCompanySearchHit[]>([]);

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
      const items = await searchFiCompanies(addQuery);
      setAddResults(items.filter((item) => item.id !== target?.company_id));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [addQuery, target?.company_id]);

  const loadBenchmark = useCallback(
    async (
      companyId: number,
      nextFilters = filters,
      include = companyIdsInclude,
      exclude = companyIdsExclude,
      applyDefaultsIfEmpty = false
    ) => {
      setLoading(true);
      setError(null);

      try {
        const targetResult = await fetchFiTarget(companyId);
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
        });

        const peersResult = await fetchFiPeers(request);
        if (!peersResult.ok) {
          throw new Error(peersResult.error);
        }

        setTarget((prev) => ({
          ...targetResult.data,
          company_logo: targetResult.data.company_logo ?? prev?.company_logo ?? null,
        }));
        setFilters(filtersToUse);
        setPeers(annotateManuallyAddedPeers(peersResult.data.peers, include));
        setTotalPeers(peersResult.data.total_peers);
        setIsDefaultMode(peersResult.data.is_default_mode);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load benchmark");
      } finally {
        setLoading(false);
      }
    },
    [filters, companyIdsInclude, companyIdsExclude, filterLookups, primarySectors, secondarySectors]
  );

  const selectTarget = useCallback(
    (companyId: number, meta?: FiCompanySearchHit) => {
      setFilters([]);
      setCompanyIdsInclude([]);
      setCompanyIdsExclude([]);
      setExcludedPeers([]);
      setPeers([]);
      setTotalPeers(0);
      setAllowedSources([...DEFAULT_FI_SOURCE_TYPES]);
      setTarget(placeholderTarget(companyId, meta));
      void loadBenchmark(companyId, [], [], [], true);
    },
    [loadBenchmark]
  );

  const clearTarget = useCallback(() => {
    setTarget(null);
    setPeers([]);
    setTotalPeers(0);
    setFilters([]);
    setCompanyIdsInclude([]);
    setCompanyIdsExclude([]);
    setExcludedPeers([]);
    setAllowedSources([...DEFAULT_FI_SOURCE_TYPES]);
    setError(null);
  }, []);

  const refreshPeers = useCallback(
    (nextFilters: FilterState[], include: number[], exclude: number[]) => {
      if (!target) return;
      void loadBenchmark(target.company_id, nextFilters, include, exclude);
    },
    [loadBenchmark, target]
  );

  const toggleSourceType = useCallback((type: FiMetricSourceType) => {
    setAllowedSources((prev) => {
      const nextSet = new Set(prev);
      if (nextSet.has(type)) {
        if (nextSet.size <= 1) return prev;
        nextSet.delete(type);
      } else {
        nextSet.add(type);
      }
      return FI_SOURCE_TYPES.filter((item) => nextSet.has(item));
    });
  }, []);

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
    setAllowedSources([...DEFAULT_FI_SOURCE_TYPES]);
    void loadBenchmark(target.company_id, [], [], []);
  }, [loadBenchmark, target]);

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
    return buildHeadlineMetrics(target, peers, allowedSources);
  }, [target, peers, allowedSources]);

  const benchmarkRows = useMemo(() => {
    if (!target) return [];
    return buildBenchmarkMetricRows(target, peers, allowedSources);
  }, [target, peers, allowedSources]);

  const compositePercentile = useMemo(() => {
    if (!target) return null;
    return computeCompositePercentile(target, peers, allowedSources);
  }, [target, peers, allowedSources]);

  const handleExportCsv = useCallback(() => {
    if (!target) return;
    exportBenchmarkToCsv({
      target,
      peers,
      benchmarkRows,
      headlineMetrics,
      compositePercentile,
    });
  }, [target, peers, benchmarkRows, headlineMetrics, compositePercentile]);

  const peerFinRows = useMemo(
    () => peers.map((peer) => mapCompanyToFinRow(peer, primarySectors, secondarySectors)),
    [peers, primarySectors, secondarySectors]
  );

  const sectorMedian = useMemo(() => buildPeerSectorMedian(peers), [peers]);

  const visibleColumnIds = useMemo(
    () => FIN_COLUMN_ORDER.filter((id) => FIN_COLUMN_DEFAULT_VISIBILITY[id]),
    []
  );

  const effectiveDefaultMode = isDefaultMode && isDefaultSourceTypes(allowedSources);

  const showBenchmarkSkeleton = loading && peers.length === 0;
  const showBenchmarkContent = target && !showBenchmarkSkeleton;
  const isRefreshingBenchmark = loading && peers.length > 0;

  return (
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
                onClick={handleExportCsv}
                disabled={loading || peers.length === 0}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: "var(--r-md)",
                  border: "1px solid var(--border-1)",
                  background: "white",
                  color: "var(--fg-1)",
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: loading || peers.length === 0 ? "default" : "pointer",
                  opacity: loading || peers.length === 0 ? 0.5 : 1,
                  fontFamily: "var(--font-sans)",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 2v8M5 9l3 3 3-3"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M3 13h10"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
                Export
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

        <FiModeTabs mode={benchmarkMode} onModeChange={setBenchmarkMode} />

        {benchmarkMode === "sector" ? (
          <FiSectorComingSoon />
        ) : (
          <>
        <FiControlBar
          targetId={target?.company_id ?? null}
          targetName={target?.company_name ?? null}
          targetLogo={target?.company_logo ?? null}
          targetUrl={target?.url ?? null}
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
          allowedSources={allowedSources}
          onToggleSourceType={toggleSourceType}
          addQuery={addQuery}
          onAddQueryChange={setAddQuery}
          addResults={addResults}
          onAddCompany={addPeerCompany}
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
              <HeadlineMetricCards metrics={headlineMetrics} />
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
              />
              <PeerCompaniesCard
                peers={peers}
                targetFinancialYear={target.financial_year || null}
                targetFyYeMonth={target.fy_ye_month || null}
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
                <Link
                  href={`/new_company/${target.company_id}`}
                  style={{ fontSize: 12, color: "var(--ax-cyan-700)", fontWeight: 600, flexShrink: 0 }}
                >
                  View target profile →
                </Link>
              </div>

              <FinancialsTable
                rows={peerFinRows}
                tweaks={{
                  sectionName: "Financial Intelligence",
                  showMedian: true,
                  colorMultiples: true,
                  chipStyle: "cyan",
                  chipIcon: true,
                  density: "comfortable",
                  hideCompanyAvatars: false,
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
          </>
        )}
      </main>
      <BulkAddToPortfolioModal
        isOpen={showBulkAddModal}
        onClose={() => setShowBulkAddModal(false)}
        companyIds={selectedCompanyIdList}
      />
      <Footer />
    </div>
  );
}
