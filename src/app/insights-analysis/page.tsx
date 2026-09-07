"use client";

import React, { Suspense, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/components/providers/AuthProvider";
import RequestDataResearchButton from "@/components/RequestDataResearchButton";
import { locationsService } from "@/lib/locationsService";
import {
  ContentArticle,
  InsightsAnalysisResponse,
  InsightsAnalysisFilters,
} from "../../types/insightsAnalysis";
import InsightsAnalysisCard from "@/components/InsightsAnalysisCard";
import { T } from "@/components/redesign/primitives";
import { normalizeContentArticles } from "@/lib/contentArticleDisplay";

const CONTENT_ARTICLES_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu:develop/Get_All_Content_Articles";

// ── Design tokens local to this page (mirrors src/app/sectors/page.tsx) ──────
const SH_SM = "0 1px 3px rgba(16, 28, 70, 0.06), 0 1px 2px rgba(16, 28, 70, 0.04)";

// Content-type accent dots — mirrors src/lib/contentTypeBadge.ts semantic mapping.
function getTypeDotColor(contentType: string): string {
  const t = contentType.toLowerCase();
  if (t === "company analysis" || t === "company update") return T.azure;
  if (t === "sector analysis") return T.lavender;
  if (t === "executive interview") return T.emerald;
  if (t === "news") return T.coral;
  if (
    t === "deal analysis" ||
    t === "deal perspective" ||
    t === "hot take" ||
    t === "market commentary"
  )
    return T.warn;
  return T.muted;
}

function SearchIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

const DEFAULT_FILTERS: InsightsAnalysisFilters = {
  search_query: "",
  primary_sectors_ids: [],
  Secondary_sectors_ids: [],
  Countries: [],
  Provinces: [],
  Cities: [],
  Offset: 1,
  Per_page: 20,
  user_id: null,
  portfolio_only: false,
  company_id: null,
  show_followed: true,
};

const PER_PAGE_OPTIONS = [10, 20, 50, 100];

function parseCompanyIdFromParam(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function buildContentArticlesParams(
  filters: InsightsAnalysisFilters,
  overrides?: { Per_page?: number; content_type?: string }
): URLSearchParams {
  const params = new URLSearchParams();
  params.append("Offset", String(filters.Offset));
  params.append("Per_page", String(overrides?.Per_page ?? filters.Per_page));
  params.append("portfolio_only", String(Boolean(filters.portfolio_only)));
  if (filters.search_query) params.append("search_query", filters.search_query);
  if (filters.Countries?.length) params.append("Countries", filters.Countries.join(","));
  if (filters.Provinces?.length) params.append("Provinces", filters.Provinces.join(","));
  if (filters.Cities?.length) params.append("Cities", filters.Cities.join(","));
  if (filters.primary_sectors_ids?.length)
    params.append("primary_sectors_ids", filters.primary_sectors_ids.join(","));
  if (filters.Secondary_sectors_ids?.length)
    params.append("Secondary_sectors_ids", filters.Secondary_sectors_ids.join(","));
  const ct = overrides?.content_type ?? (filters.Content_Type || filters.content_type || "").trim();
  if (ct) params.append("content_type", ct);
  const ts = (filters.Transaction_status || "").trim();
  if (ts) params.append("Transaction_status", ts);
  if (filters.company_id != null && filters.company_id > 0) {
    params.append("company_id", String(filters.company_id));
  }
  if (filters.show_followed != null) {
    params.append("show_followed", String(Boolean(filters.show_followed)));
  }
  return params;
}

// Main Insights Analysis Page Component
function InsightsAnalysisPageContent() {
  const { isTrialActive } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const companyIdFromUrl = useMemo(
    () => parseCompanyIdFromParam(searchParams.get("company_id")),
    [searchParams]
  );
  const companyNameFromUrl = useMemo(() => {
    const raw = searchParams.get("company_name");
    if (!raw) return "";
    try {
      return decodeURIComponent(raw).trim();
    } catch {
      return raw.trim();
    }
  }, [searchParams]);

  // State for filters
  const [filters, setFilters] = useState<InsightsAnalysisFilters>({
    ...DEFAULT_FILTERS,
    company_id: companyIdFromUrl,
  });
  const [companyFilterLabel, setCompanyFilterLabel] = useState(companyNameFromUrl);

  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [contentTypes, setContentTypes] = useState<string[]>([]);
  const [primarySectors, setPrimarySectors] = useState<
    Array<{ id: number; sector_name: string }>
  >([]);

  // State for insights analysis data
  const [articles, setArticles] = useState<ContentArticle[]>([]);
  const [pagination, setPagination] = useState({
    itemsReceived: 0,
    curPage: 1,
    nextPage: null as number | null,
    prevPage: null as number | null,
    offset: 0,
    perPage: 20,
    pageTotal: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Content-type pill counts (real counts read from a lightweight Per_page=1
  // request per type — see the isTrialActive-style fetchByType pattern below).
  const [typeCounts, setTypeCounts] = useState<Record<string, number | null>>({});
  const [allTypesCount, setAllTypesCount] = useState<number | null>(null);

  const [pageInputValue, setPageInputValue] = useState("1");

  const fetchInsightsAnalysis = async (filters: InsightsAnalysisFilters) => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("asymmetrix_auth_token");
      if (!token) {
        setError("Authentication required");
        return;
      }

      if (isTrialActive) {
        // Trial: show all Hot Takes, plus 3 most recent Company Analysis and 3 most recent Deal Analysis
        const fetchByType = async (contentType: string, perPage = 100) => {
          const p = new URLSearchParams();
          p.append("Offset", "1");
          p.append("Per_page", String(perPage));
          p.append("content_type", contentType);
          const u = `${CONTENT_ARTICLES_URL}?${p.toString()}`;
          const res = await fetch(u, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              "X-Data-Source": "live",
            },
          });
          if (!res.ok) throw new Error(String(res.status));
          const json: InsightsAnalysisResponse = await res.json();
          return Array.isArray(json.items) ? json.items : [];
        };

        const [hotTakes, company, deal] = await Promise.all([
          fetchByType("Hot Take", 100),
          fetchByType("Company Analysis", 100),
          fetchByType("Deal Analysis", 100),
        ]);

        const byDateDesc = (a: ContentArticle, b: ContentArticle) => {
          const da = new Date(a.Publication_Date || 0).getTime();
          const db = new Date(b.Publication_Date || 0).getTime();
          return db - da;
        };

        const topCompany = [...company].sort(byDateDesc).slice(0, 3);
        const topDeal = [...deal].sort(byDateDesc).slice(0, 3);
        const combined = normalizeContentArticles(
          [...hotTakes, ...topCompany, ...topDeal].sort(byDateDesc)
        );

        setArticles(combined);
        setPagination({
          itemsReceived: combined.length,
          curPage: 1,
          nextPage: null,
          prevPage: null,
          offset: 0,
          perPage: combined.length,
          pageTotal: 1,
        });
        return;
      }

      const params = buildContentArticlesParams(filters);
      const url = `${CONTENT_ARTICLES_URL}?${params.toString()}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Data-Source": "live",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: InsightsAnalysisResponse = await response.json();

      setArticles(normalizeContentArticles(data.items || []));
      setPagination({
        itemsReceived: data.itemsReceived,
        curPage: data.curPage,
        nextPage: data.nextPage,
        prevPage: data.prevPage,
        offset: data.offset,
        perPage: filters.Per_page,
        pageTotal: data.pageTotal,
      });
      setPageInputValue(String(data.curPage));
    } catch (error) {
      console.error("Error fetching insights analysis:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch insights analysis"
      );
    } finally {
      setLoading(false);
    }
  };

  const hasFetchedRef = useRef(false);

  // Sync company filter from URL and fetch
  useEffect(() => {
    setCompanyFilterLabel(companyNameFromUrl);

    if (companyIdFromUrl != null) {
      const nextFilters: InsightsAnalysisFilters = {
        ...DEFAULT_FILTERS,
        company_id: companyIdFromUrl,
      };
      setSearchTerm("");
      setFilters(nextFilters);
      fetchInsightsAnalysis(nextFilters);
      hasFetchedRef.current = true;
      return;
    }

    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      setFilters(DEFAULT_FILTERS);
      fetchInsightsAnalysis(DEFAULT_FILTERS);
      return;
    }

    setFilters((prev) => {
      if (prev.company_id == null) return prev;
      setSearchTerm("");
      const next = { ...DEFAULT_FILTERS };
      fetchInsightsAnalysis(next);
      return next;
    });
  }, [companyIdFromUrl, companyNameFromUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch content type options and primary sectors
  useEffect(() => {
    const run = async () => {
      try {
        const token = localStorage.getItem("asymmetrix_auth_token");
        if (!token) return;

        const [resp, sectors] = await Promise.all([
          fetch(
            "https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob:develop/content_types_for_articles",
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          ),
          locationsService.getPrimarySectors(),
        ]);

        if (!resp.ok) return;
        const data = (await resp.json()) as Array<{
          Content_Content_Type1: string;
        }>;
        const values = Array.from(
          new Set(
            (Array.isArray(data) ? data : [])
              .map((d) => (d?.Content_Content_Type1 || "").trim())
              .filter(Boolean)
          )
        );
        setContentTypes(values);
        setPrimarySectors(sectors);
      } catch {
        // ignore
      }
    };
    run();
  }, []);

  // Content-type pill counts — one lightweight Per_page=1 request per type
  // (plus one untyped request for "All types"), refetched whenever a filter
  // OTHER than the active content type changes. Never fires just from
  // switching which type pill is selected.
  const primarySectorIdsKey = JSON.stringify(filters.primary_sectors_ids);
  const secondarySectorIdsKey = JSON.stringify(filters.Secondary_sectors_ids);
  useEffect(() => {
    if (isTrialActive) return;
    if (contentTypes.length === 0) return;

    let cancelled = false;

    const run = async () => {
      const token = localStorage.getItem("asymmetrix_auth_token");
      if (!token) return;

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Data-Source": "live",
      };

      const fetchCount = async (contentType?: string): Promise<number | null> => {
        try {
          const params = buildContentArticlesParams(filters, {
            Per_page: 1,
            content_type: contentType ?? "",
          });
          const res = await fetch(`${CONTENT_ARTICLES_URL}?${params.toString()}`, {
            method: "GET",
            headers,
          });
          if (!res.ok) return null;
          const json: InsightsAnalysisResponse = await res.json();
          return typeof json.itemsReceived === "number" ? json.itemsReceived : null;
        } catch {
          return null;
        }
      };

      try {
        const [allCount, ...counts] = await Promise.all([
          fetchCount(undefined),
          ...contentTypes.map((ct) => fetchCount(ct)),
        ]);
        if (cancelled) return;
        setAllTypesCount(allCount);
        const next: Record<string, number | null> = {};
        contentTypes.forEach((ct, idx) => {
          next[ct] = counts[idx] ?? null;
        });
        setTypeCounts(next);
      } catch {
        // Leave counts unset — pills render without a count rather than a fake one.
      }
    };

    run();
    return () => {
      cancelled = true;
    };
    // Intentionally excludes filters.Content_Type / filters.content_type so
    // toggling the active type pill doesn't refire this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isTrialActive,
    contentTypes,
    filters.search_query,
    primarySectorIdsKey,
    secondarySectorIdsKey,
    filters.Transaction_status,
    filters.portfolio_only,
    filters.company_id,
    filters.show_followed,
  ]);

  // Handle search
  const handleSearch = () => {
    const updatedFilters = {
      ...filters,
      search_query: searchTerm,
      Offset: 1, // Reset to first page when searching
    };
    setFilters(updatedFilters);
    fetchInsightsAnalysis(updatedFilters);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    const clamped = Math.max(1, Math.min(page, pagination.pageTotal || page));
    const updatedFilters = { ...filters, Offset: clamped };
    setFilters(updatedFilters);
    fetchInsightsAnalysis(updatedFilters);
  };

  const handlePerPageChange = (perPage: number) => {
    const updatedFilters = { ...filters, Per_page: perPage, Offset: 1 };
    setFilters(updatedFilters);
    fetchInsightsAnalysis(updatedFilters);
  };

  const handleTypeSelect = (contentType: string) => {
    const updated = {
      ...filters,
      Content_Type: contentType || undefined,
      content_type: contentType || undefined,
      Offset: 1,
    };
    setFilters(updated);
    fetchInsightsAnalysis(updated);
  };

  const handleFollowedToggle = (checked: boolean) => {
    const updated: InsightsAnalysisFilters = {
      ...filters,
      Offset: 1,
      portfolio_only: checked,
      user_id: null,
    };
    setFilters(updated);
    fetchInsightsAnalysis(updated);
  };

  const clearCompanyFilter = useCallback(() => {
    router.replace("/insights-analysis");
  }, [router]);

  const resetFilters = () => {
    setSearchTerm("");
    setCompanyFilterLabel("");
    if (companyIdFromUrl != null) {
      router.replace("/insights-analysis");
      return;
    }
    const updatedFilters: InsightsAnalysisFilters = { ...DEFAULT_FILTERS };
    setFilters(updatedFilters);
    fetchInsightsAnalysis(updatedFilters);
  };

  const activeContentType = (filters.Content_Type || filters.content_type || "").trim();

  const style = `
    * { box-sizing: border-box; }
    .ia-shell {
      max-width: 1280px;
      margin: 0 auto;
      padding: 24px 16px 56px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
      font-family: ${T.sans};
    }
    .ia-eyebrow {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: ${T.azure};
      margin: 0 0 4px 0;
    }
    .ia-title {
      font-size: 26px;
      font-weight: 700;
      color: ${T.ink};
      margin: 0;
      display: flex;
      align-items: baseline;
      gap: 10px;
      flex-wrap: wrap;
    }
    .ia-title-count {
      font-size: 14px;
      font-weight: 600;
      color: ${T.muted};
    }
    .ia-title-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .ia-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .pill-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border-radius: 999px;
      font-size: 13.5px;
      font-weight: 600;
      padding: 9px 16px;
      cursor: pointer;
      white-space: nowrap;
      transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;
    }
    .pill-btn-primary {
      background: ${T.azure};
      color: #fff;
      border: 1px solid ${T.azure};
    }
    .pill-btn-primary:hover { background: #2038c9; }
    .pill-btn-outline {
      background: #fff;
      color: ${T.ink};
      border: 1px solid ${T.divider};
    }
    .pill-btn-outline:hover { background: ${T.inset}; }
    .ia-controls-card {
      background: #fff;
      border: 1px solid ${T.divider};
      border-radius: ${T.rLg}px;
      box-shadow: ${SH_SM};
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .ia-search-row {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      align-items: center;
    }
    .ia-search-pill {
      flex: 1 1 260px;
      min-width: 200px;
      display: flex;
      align-items: center;
      gap: 8px;
      background: ${T.paper};
      border: 1px solid ${T.divider};
      border-radius: 999px;
      padding: 9px 16px;
      color: ${T.muted};
    }
    .ia-search-pill input {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      font-size: 13.5px;
      color: ${T.ink};
    }
    .ia-adv-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
      align-items: flex-end;
      padding-top: 12px;
      border-top: 1px solid ${T.hair};
    }
    .ia-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 200px;
    }
    .ia-field-label {
      font-size: 12.5px;
      font-weight: 600;
      color: ${T.body};
    }
    .ia-select {
      padding: 9px 14px;
      border: 1px solid ${T.divider};
      border-radius: 999px;
      font-size: 13.5px;
      color: ${T.ink};
      background: #fff;
      cursor: pointer;
      outline: none;
    }
    .ia-followed-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 14px;
      border: 1px solid ${T.divider};
      border-radius: 999px;
      background: ${T.paper};
      cursor: pointer;
    }
    .ia-followed-pill input {
      accent-color: ${T.azure};
      cursor: pointer;
    }
    .ia-followed-pill span {
      font-size: 13px;
      font-weight: 600;
      color: ${T.ink};
    }
    .ia-types-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .ia-type-pill {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      border-radius: 999px;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 600;
      border: 1px solid ${T.divider};
      background: #fff;
      color: ${T.body};
      cursor: pointer;
    }
    .ia-type-pill.active {
      background: ${T.azureSoft};
      border-color: #C6D1FB;
      color: ${T.azure};
    }
    .ia-type-dot {
      width: 7px;
      height: 7px;
      border-radius: 999px;
      flex-shrink: 0;
    }
    .ia-type-count {
      color: ${T.faint};
      font-weight: 600;
    }
    .ia-company-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      padding: 12px 16px;
      border: 1px solid #C6D1FB;
      border-radius: 999px;
      background: ${T.azureSoft};
      color: #182A9B;
      font-size: 13.5px;
    }
    .ia-company-banner strong { color: #1F35C4; }
    .ia-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
    .ia-loading, .ia-empty {
      text-align: center;
      padding: 48px 16px;
      color: ${T.muted};
      font-size: 14px;
    }
    .ia-error {
      text-align: center;
      padding: 16px;
      color: ${T.coral};
      background-color: ${T.coralSoft};
      border-radius: 12px;
    }
    .ia-pgrow {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      padding: 8px 4px;
      font-size: 13px;
      color: ${T.muted};
    }
    .ia-pgc {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .ia-pgc-btn {
      width: 30px;
      height: 30px;
      border-radius: 999px;
      border: 1px solid ${T.divider};
      background: #fff;
      color: ${T.ink};
      font-size: 14px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }
    .ia-pgc-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
    .ia-pgc-in {
      width: 44px;
      height: 30px;
      border-radius: 999px;
      border: 1px solid ${T.divider};
      text-align: center;
      font-size: 13px;
      color: ${T.ink};
      outline: none;
    }
    .ia-pg-count { white-space: nowrap; }
    @media (max-width: 1024px) {
      .ia-grid { grid-template-columns: repeat(2, 1fr) !important; }
    }
    @media (max-width: 768px) {
      .ia-grid { grid-template-columns: 1fr !important; }
      .ia-title-row { flex-direction: column !important; }
      .ia-shell { padding: 16px 12px 40px !important; }
    }
  `;

  return (
    <div
      className="min-h-screen"
      style={{ width: "100%", maxWidth: "100vw", overflowX: "hidden", background: T.paper }}
    >
      <Header />

      <div className="ia-shell">
        {/* Title row */}
        <div className="ia-title-row">
          <div>
            <p className="ia-eyebrow">Research</p>
            <h1 className="ia-title">
              {filters.company_id
                ? `Insights & Analysis — ${companyFilterLabel || `Company #${filters.company_id}`}`
                : "Insights & Analysis"}
              <span className="ia-title-count">
                {pagination.itemsReceived.toLocaleString()} reports
              </span>
            </h1>
          </div>
          {!isTrialActive && (
            <div className="ia-actions">
              <button type="button" className="pill-btn pill-btn-outline" onClick={resetFilters}>
                Reset filters
              </button>
              <RequestDataResearchButton
                label="Request report"
                context="insights-analysis"
                sourcePage="Insights & Analysis Search"
                className="pill-btn pill-btn-primary"
                style={{ borderRadius: 999 }}
              />
            </div>
          )}
        </div>

        {!isTrialActive && (
          <>
            {filters.company_id != null && filters.company_id > 0 && (
              <div className="ia-company-banner">
                <span>
                  Showing insights tagged to{" "}
                  <strong>{companyFilterLabel || `Company #${filters.company_id}`}</strong>
                </span>
                <button
                  type="button"
                  className="pill-btn pill-btn-outline"
                  onClick={clearCompanyFilter}
                >
                  View all insights
                </button>
              </div>
            )}

            {/* Controls card */}
            <div className="ia-controls-card">
              <div className="ia-search-row">
                <div className="ia-search-pill">
                  <SearchIcon />
                  <input
                    type="text"
                    placeholder="Search reports…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
                <button type="button" className="pill-btn pill-btn-primary" onClick={handleSearch}>
                  {loading ? "Searching…" : "Search"}
                </button>
                <button
                  type="button"
                  className="pill-btn pill-btn-outline"
                  onClick={() => setShowFilters((v) => !v)}
                >
                  {showFilters ? "Hide filters" : "Show filters"}
                </button>
              </div>

              {showFilters && (
                <div className="ia-adv-filters">
                  <div className="ia-field">
                    <span className="ia-field-label">Primary sector</span>
                    <select
                      className="ia-select"
                      value={filters.primary_sectors_ids?.[0]?.toString() || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        const updated = {
                          ...filters,
                          primary_sectors_ids: value === "" ? [] : [Number.parseInt(value, 10)],
                          Offset: 1,
                        };
                        setFilters(updated);
                        fetchInsightsAnalysis(updated);
                      }}
                    >
                      <option value="">All primary sectors</option>
                      {primarySectors.map((sector) => (
                        <option key={sector.id} value={sector.id}>
                          {sector.sector_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="ia-field">
                    <span className="ia-field-label">Transaction status</span>
                    <select
                      className="ia-select"
                      value={filters.Transaction_status || ""}
                      onChange={(e) => {
                        const updated = {
                          ...filters,
                          Transaction_status: e.target.value || undefined,
                          Offset: 1,
                        };
                        setFilters(updated);
                        fetchInsightsAnalysis(updated);
                      }}
                    >
                      <option value="">All transaction statuses</option>
                      <option value="Rumoured in Market">Rumoured in Market</option>
                      <option value="Transaction anticipated within 18 months">
                        Transaction anticipated within 18 months
                      </option>
                      <option value="Reported in Market">Reported in Market</option>
                    </select>
                  </div>
                  <div className="ia-field">
                    <span className="ia-field-label">View followed</span>
                    <label className="ia-followed-pill">
                      <input
                        type="checkbox"
                        checked={Boolean(filters.portfolio_only)}
                        onChange={(e) => handleFollowedToggle(e.target.checked)}
                      />
                      <span>Followed only</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Content-type pill filters */}
            <div className="ia-types-row">
              <button
                type="button"
                className={`ia-type-pill${activeContentType === "" ? " active" : ""}`}
                onClick={() => handleTypeSelect("")}
              >
                All types
                {allTypesCount != null && (
                  <span className="ia-type-count">{allTypesCount.toLocaleString()}</span>
                )}
              </button>
              {contentTypes.map((ct) => (
                <button
                  key={ct}
                  type="button"
                  className={`ia-type-pill${activeContentType === ct ? " active" : ""}`}
                  onClick={() => handleTypeSelect(ct)}
                >
                  <span className="ia-type-dot" style={{ background: getTypeDotColor(ct) }} />
                  {ct}
                  {typeCounts[ct] != null && (
                    <span className="ia-type-count">{typeCounts[ct]!.toLocaleString()}</span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Error / loading */}
        {error && <div className="ia-error">{error}</div>}
        {loading && articles.length === 0 && <div className="ia-loading">Loading reports…</div>}

        {/* Results grid */}
        {!loading && articles.length === 0 && !error && (
          <div className="ia-empty">No reports found.</div>
        )}
        {articles.length > 0 && (
          <div className="ia-grid">
            {articles.map((article, index) => (
              <InsightsAnalysisCard key={article.id ?? index} article={article} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!isTrialActive && pagination.pageTotal > 1 && (
          <div className="ia-pgrow">
            <span className="ia-pg-count">
              {pagination.itemsReceived.toLocaleString()} reports · page {pagination.curPage} of{" "}
              {pagination.pageTotal}
            </span>
            <div className="ia-pgc">
              <button
                type="button"
                className="ia-pgc-btn"
                onClick={() => handlePageChange(pagination.curPage - 1)}
                disabled={!pagination.prevPage}
                aria-label="Previous page"
              >
                ‹
              </button>
              <input
                type="text"
                inputMode="numeric"
                className="ia-pgc-in"
                value={pageInputValue}
                onChange={(e) => setPageInputValue(e.target.value.replace(/[^0-9]/g, ""))}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  const page = Number.parseInt(pageInputValue, 10);
                  if (Number.isFinite(page)) handlePageChange(page);
                }}
                onBlur={() => {
                  const page = Number.parseInt(pageInputValue, 10);
                  if (Number.isFinite(page)) {
                    handlePageChange(page);
                  } else {
                    setPageInputValue(String(pagination.curPage));
                  }
                }}
                aria-label="Page number"
              />
              <button
                type="button"
                className="ia-pgc-btn"
                onClick={() => handlePageChange(pagination.curPage + 1)}
                disabled={!pagination.nextPage}
                aria-label="Next page"
              >
                ›
              </button>
            </div>
            <select
              className="ia-select"
              value={pagination.perPage}
              onChange={(e) => handlePerPageChange(Number.parseInt(e.target.value, 10))}
              aria-label="Reports per page"
            >
              {PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <Footer />
      <style dangerouslySetInnerHTML={{ __html: style }} />
    </div>
  );
}

export default function InsightsAnalysisPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen" style={{ width: "100%", maxWidth: "100vw" }}>
          <Header />
          <div
            style={{
              padding: "32px 16px",
              fontFamily: T.sans,
              color: T.body,
            }}
          >
            Loading insights...
          </div>
          <Footer />
        </div>
      }
    >
      <InsightsAnalysisPageContent />
    </Suspense>
  );
}
