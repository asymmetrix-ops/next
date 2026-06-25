"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { FilterState } from "@/app/financials-tsx/types";
import {
  FIN_COLUMN_DEFAULT_VISIBILITY,
  FIN_COLUMN_ORDER,
} from "@/app/financials-tsx/financials-columns";
import { FinancialsTable } from "@/app/financials-tsx/financials-table";
import "../financials-tsx/colors_and_type.css";
import {
  fetchFiLocationsServer,
} from "./actions";
import { fetchFiPeers, fetchFiTarget, searchFiCompanies } from "@/lib/financialIntelligence/apiClient";
import { TargetSelector } from "./components/TargetSelector";
import { FiFilterBar } from "./components/FiFilterBar";
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
  peersRequestToSavedBenchmark,
  savedBenchmarkToFilters,
} from "@/lib/financialIntelligence/filterPayload";
import {
  computeCompositePercentile,
} from "@/lib/financialIntelligence/calculations";
import { loadSavedBenchmarks, saveBenchmark } from "@/lib/financialIntelligence/storage";
import type { FiCompanyRow, FiLocationRow, SavedBenchmark } from "@/lib/financialIntelligence/types";

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

  const [primarySectors, setPrimarySectors] = useState<Array<{ id: number; sector_name: string }>>(
    []
  );
  const [secondarySectors, setSecondarySectors] = useState<
    Array<{ id: number; sector_name: string }>
  >([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [locations, setLocations] = useState<FiLocationRow[]>([]);
  const [savedBenchmarks, setSavedBenchmarks] = useState<SavedBenchmark[]>([]);

  const [sortId, setSortId] = useState("revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [addQuery, setAddQuery] = useState("");
  const [addResults, setAddResults] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => {
    setSavedBenchmarks(loadSavedBenchmarks());
    locationsService.getPrimarySectors().then(setPrimarySectors).catch(console.error);
    locationsService
      .getAllSecondarySectorsWithPrimary()
      .then(setSecondarySectors)
      .catch(() =>
        locationsService.getSecondarySectors([]).then(setSecondarySectors).catch(console.error)
      );
    locationsService.getContinentalRegions().then(setRegions).catch(console.error);
    locationsService
      .getCountries()
      .then((rows) =>
        setCountries(rows.map((row) => row.locations_Country).filter(Boolean))
      )
      .catch(console.error);
    fetchFiLocationsServer().then(setLocations).catch(console.error);
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
    async (companyId: number, nextFilters = filters, include = companyIdsInclude, exclude = companyIdsExclude) => {
      setLoading(true);
      setError(null);

      try {
        const request = buildPeersRequest({
          targetCompanyId: companyId,
          filters: nextFilters,
          companyIdsInclude: include,
          companyIdsExclude: exclude,
          primarySectors,
          secondarySectors,
          locations,
        });

        const [targetResult, peersResult] = await Promise.all([
          fetchFiTarget(companyId),
          fetchFiPeers(request),
        ]);

        if (!targetResult.ok) {
          throw new Error(targetResult.error);
        }
        if (!peersResult.ok) {
          throw new Error(peersResult.error);
        }

        setTarget(targetResult.data);
        setPeers(peersResult.data.peers);
        setTotalPeers(peersResult.data.total_peers);
        setIsDefaultMode(peersResult.data.is_default_mode);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load benchmark");
      } finally {
        setLoading(false);
      }
    },
    [filters, companyIdsInclude, companyIdsExclude, primarySectors, secondarySectors, locations]
  );

  const selectTarget = useCallback(
    (companyId: number) => {
      setFilters([]);
      setCompanyIdsInclude([]);
      setCompanyIdsExclude([]);
      void loadBenchmark(companyId, [], [], []);
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
    setError(null);
  }, []);

  const refreshPeers = useCallback(
    (nextFilters: FilterState[], include: number[], exclude: number[]) => {
      if (!target) return;
      void loadBenchmark(target.company_id, nextFilters, include, exclude);
    },
    [loadBenchmark, target]
  );

  const addFilter = useCallback(
    (filter: FilterState) => {
      const next = [...filters.filter((item) => item.id !== filter.id), filter];
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
    void loadBenchmark(target.company_id, [], [], []);
  }, [loadBenchmark, target]);

  const excludePeer = useCallback(
    (companyId: number) => {
      const nextExclude = Array.from(new Set([...companyIdsExclude, companyId]));
      const nextInclude = companyIdsInclude.filter((id) => id !== companyId);
      setCompanyIdsExclude(nextExclude);
      setCompanyIdsInclude(nextInclude);
      refreshPeers(filters, nextInclude, nextExclude);
    },
    [companyIdsExclude, companyIdsInclude, filters, refreshPeers]
  );

  const restoreAllPeers = useCallback(() => {
    setCompanyIdsExclude([]);
    refreshPeers(filters, companyIdsInclude, []);
  }, [companyIdsInclude, filters, refreshPeers]);

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

  const handleSaveBenchmark = useCallback(() => {
    if (!target) return;
    const request = buildPeersRequest({
      targetCompanyId: target.company_id,
      filters,
      companyIdsInclude,
      companyIdsExclude,
      primarySectors,
      secondarySectors,
      locations,
    });
    const saved = peersRequestToSavedBenchmark(request, target.company_name);
    setSavedBenchmarks(saveBenchmark(saved));
  }, [
    target,
    filters,
    companyIdsInclude,
    companyIdsExclude,
    primarySectors,
    secondarySectors,
    locations,
  ]);

  const loadSaved = useCallback(
    (saved: SavedBenchmark) => {
      const nextFilters = savedBenchmarkToFilters(saved);
      setFilters(nextFilters);
      setCompanyIdsInclude(saved.company_ids_include);
      setCompanyIdsExclude(saved.company_ids_exclude);
      void loadBenchmark(
        saved.target_company_id,
        nextFilters,
        saved.company_ids_include,
        saved.company_ids_exclude
      );
    },
    [loadBenchmark]
  );

  const headlineMetrics = useMemo(() => {
    if (!target) return [];
    return buildHeadlineMetrics(target, peers);
  }, [target, peers]);

  const benchmarkRows = useMemo(() => {
    if (!target) return [];
    return buildBenchmarkMetricRows(target, peers);
  }, [target, peers]);

  const compositePercentile = useMemo(() => {
    if (!target) return null;
    return computeCompositePercentile(target, peers);
  }, [target, peers]);

  const peerFinRows = useMemo(
    () => peers.map((peer) => mapCompanyToFinRow(peer, primarySectors, secondarySectors)),
    [peers, primarySectors, secondarySectors]
  );

  const sectorMedian = useMemo(() => buildPeerSectorMedian(peers), [peers]);

  const visibleColumnIds = useMemo(
    () => FIN_COLUMN_ORDER.filter((id) => FIN_COLUMN_DEFAULT_VISIBILITY[id]),
    []
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--ax-gray-25)", fontFamily: "var(--font-sans)" }}>
      <Header />
      <main style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 32px 48px" }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ax-cyan-700)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
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

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <TargetSelector
            targetId={target?.company_id ?? null}
            targetName={target?.company_name ?? null}
            targetLogo={target?.company_logo ?? null}
            targetUrl={target?.url ?? null}
            loading={loading}
            onSelect={selectTarget}
            onClear={clearTarget}
          />

          {target && (
            <>
              <button
                type="button"
                disabled={isDefaultMode || loading}
                onClick={resetToDefault}
                style={{
                  padding: "8px 12px",
                  borderRadius: "var(--r-sm)",
                  border: "1px solid var(--border-1)",
                  background: isDefaultMode ? "var(--ax-gray-100)" : "white",
                  color: isDefaultMode ? "var(--fg-4)" : "var(--fg-2)",
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: isDefaultMode ? "default" : "pointer",
                }}
              >
                Reset to default
              </button>
              <button
                type="button"
                onClick={handleSaveBenchmark}
                style={{
                  padding: "8px 12px",
                  borderRadius: "var(--r-sm)",
                  border: "none",
                  background: "var(--ax-cyan-700)",
                  color: "white",
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Save benchmark
              </button>
              <span
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "var(--ax-gray-100)",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--fg-2)",
                }}
              >
                {totalPeers || peers.length} peers
              </span>
            </>
          )}
        </div>

        {savedBenchmarks.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {savedBenchmarks.map((saved) => (
              <button
                key={`${saved.target_company_id}-${saved.saved_at}`}
                type="button"
                onClick={() => loadSaved(saved)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid var(--border-1)",
                  background: "white",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {saved.label ?? `Company #${saved.target_company_id}`}
              </button>
            ))}
          </div>
        )}

        {target && (
          <div style={{ marginBottom: 16 }}>
            <FiFilterBar
              filters={filters}
              onAddFilter={addFilter}
              onRemoveFilter={removeFilter}
              primarySectorOptions={primarySectors.map((s) => s.sector_name)}
              secondarySectorOptions={secondarySectors.map((s) => s.sector_name)}
              regionOptions={regions}
              countryOptions={countries}
            />
          </div>
        )}

        {loading && (
          <div style={{ padding: 24, color: "var(--fg-3)", fontSize: 14 }}>Loading benchmark…</div>
        )}

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
            Select a target company by ID to load its financial profile and default peer set.
          </div>
        )}

        {target && !loading && (
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
                gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 340px)",
                gap: 16,
                marginBottom: 16,
              }}
            >
              <BenchmarkTable rows={benchmarkRows} targetName={target.company_name} />
              <PeerCompaniesCard
                peers={peers}
                targetFinancialYear={target.financial_year || null}
                excludedIds={companyIdsExclude}
                onExclude={excludePeer}
                onRestoreAll={restoreAllPeers}
                onAddCompany={addPeerCompany}
                addQuery={addQuery}
                onAddQueryChange={setAddQuery}
                addResults={addResults}
                onPickAddResult={() => undefined}
              />
            </div>

            <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, color: "var(--fg-1)" }}>Peer financials table</div>
              <Link
                href={`/new_company/${target.company_id}`}
                style={{ fontSize: 12, color: "var(--ax-cyan-700)", fontWeight: 600 }}
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
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
