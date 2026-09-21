"use client";

import React, { Suspense, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { useNavOpen } from "@/components/layout/NavOpenContext";
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
import CompactPagination from "@/components/ui/CompactPagination";

const CONTENT_ARTICLES_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu/Get_All_Content_Articles";
const CONTENT_ARTICLES_TYPE_COUNTS_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu/Get_Content_Articles_Type_Counts";

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
  portfolio_only: false,
  company_id: null,
  // Off by default — this restricts results to the user's followed/portfolio
  // entities. Previously defaulted to `true`, which silently narrowed every
  // other filter's results to "followed only" from first load.
  show_followed: false,
};

const PER_PAGE_OPTIONS = [10, 20, 50, 100];

// DEV still returns the deprecated `totalItems` field on some builds instead
// of `itemsTotal` — fall back so pagination doesn't crash on `undefined`.
function getItemsTotal(json: InsightsAnalysisResponse): number {
  if (typeof json.itemsTotal === "number") return json.itemsTotal;
  if (typeof json.totalItems === "number") return json.totalItems;
  return 0;
}

function parseCompanyIdFromParam(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

// IMPORTANT — verified directly against Xano: sending an *empty* value for
// primary_sectors_ids / content_type (e.g. "" or the literal string "null")
// is NOT a "no filter" sentinel — Xano treats it as a real filter and the
// query matches zero rows. So every param below must be omitted entirely
// when unset, exactly as before; do not "helpfully" always send every key.
//
// Separately: the 500 this used to throw for the "Followed only" toggle
// (`portfolio_only=true&show_followed=true`) is NOT caused by any missing
// param — even the minimal `Offset=1&Per_page=20&portfolio_only=true&
// show_followed=true` 500s with `SQL Error: 42883, UNDEFINED FUNCTION`
// (confirmed by calling Xano directly). That's a bug in Xano's own function
// stack for this endpoint (something the `show_followed` branch calls is
// missing/misnamed in Postgres) and isn't fixable from this client.
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

// Params for the aggregate type-counts endpoint. Same filter semantics as
// buildContentArticlesParams (omit optional filters entirely when unset —
// an empty string is a real filter value to Xano, not "no filter"), but:
//   - no Offset / Per_page / content_type (this endpoint groups by type)
//   - company_id and show_followed are REQUIRED params on this endpoint
//     (it 400s with "Missing param" otherwise), unlike the list endpoint.
function buildTypeCountsParams(filters: InsightsAnalysisFilters): URLSearchParams {
  const params = new URLSearchParams();
  params.append("portfolio_only", String(Boolean(filters.portfolio_only)));
  params.append("show_followed", String(Boolean(filters.show_followed)));
  params.append(
    "company_id",
    String(filters.company_id != null && filters.company_id > 0 ? filters.company_id : 0)
  );
  if (filters.search_query) params.append("search_query", filters.search_query);
  if (filters.Countries?.length) params.append("Countries", filters.Countries.join(","));
  if (filters.Provinces?.length) params.append("Provinces", filters.Provinces.join(","));
  if (filters.Cities?.length) params.append("Cities", filters.Cities.join(","));
  if (filters.primary_sectors_ids?.length)
    params.append("primary_sectors_ids", filters.primary_sectors_ids.join(","));
  if (filters.Secondary_sectors_ids?.length)
    params.append("Secondary_sectors_ids", filters.Secondary_sectors_ids.join(","));
  const ts = (filters.Transaction_status || "").trim();
  if (ts) params.append("Transaction_status", ts);
  return params;
}

type ContentArticlesTypeCountsResponse = {
  total: number;
  by_type: Array<{ content_type: string; count: number }>;
};

// Main Insights Analysis Page Component
function InsightsAnalysisPageContent() {
  const { isTrialActive } = useAuth();
  const { open: navOpen } = useNavOpen();
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
  const contentTypeFromUrl = useMemo(() => {
    const raw = searchParams.get("content_type");
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
    Content_Type: contentTypeFromUrl || undefined,
    content_type: contentTypeFromUrl || undefined,
  });
  const [companyFilterLabel, setCompanyFilterLabel] = useState(companyNameFromUrl);

  const [searchTerm, setSearchTerm] = useState("");
  const [contentTypes, setContentTypes] = useState<string[]>([]);
  const [primarySectors, setPrimarySectors] = useState<
    Array<{ id: number; sector_name: string }>
  >([]);

  // State for insights analysis data
  const [articles, setArticles] = useState<ContentArticle[]>([]);
  const [pagination, setPagination] = useState({
    itemsReceived: 0,
    itemsTotal: 0,
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
          itemsTotal: combined.length,
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
        itemsTotal: getItemsTotal(data),
        curPage: data.curPage,
        nextPage: data.nextPage,
        prevPage: data.prevPage,
        offset: data.offset,
        perPage: filters.Per_page,
        pageTotal: data.pageTotal,
      });
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
      const initialFilters: InsightsAnalysisFilters = {
        ...DEFAULT_FILTERS,
        Content_Type: contentTypeFromUrl || undefined,
        content_type: contentTypeFromUrl || undefined,
      };
      setFilters(initialFilters);
      fetchInsightsAnalysis(initialFilters);
      return;
    }

    setFilters((prev) => {
      if (prev.company_id == null) return prev;
      setSearchTerm("");
      const next = { ...DEFAULT_FILTERS };
      fetchInsightsAnalysis(next);
      return next;
    });
  }, [companyIdFromUrl, companyNameFromUrl, contentTypeFromUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch content type options and primary sectors
  useEffect(() => {
    const run = async () => {
      try {
        const token = localStorage.getItem("asymmetrix_auth_token");
        if (!token) return;

        const [resp, sectors] = await Promise.all([
          fetch(
            "https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob/content_types_for_articles",
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

  // Content-type pill counts — a single aggregate request (grouped by type
  // server-side) instead of one Per_page=1 request per type. Refetched
  // whenever a filter OTHER than the active content type changes; never
  // fires just from switching which type pill is selected.
  const primarySectorIdsKey = JSON.stringify(filters.primary_sectors_ids);
  const secondarySectorIdsKey = JSON.stringify(filters.Secondary_sectors_ids);
  useEffect(() => {
    if (isTrialActive) return;
    if (contentTypes.length === 0) return;

    let cancelled = false;
    // Abort the in-flight request when filters change again before it
    // resolves — without this, rapid filter changes (e.g. checking several
    // sectors in a row) pile up superseded requests instead of just the
    // latest one winning.
    const ac = new AbortController();

    const run = async () => {
      const token = localStorage.getItem("asymmetrix_auth_token");
      if (!token) return;

      try {
        const params = buildTypeCountsParams(filters);
        const res = await fetch(`${CONTENT_ARTICLES_TYPE_COUNTS_URL}?${params.toString()}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "X-Data-Source": "live",
          },
          signal: ac.signal,
        });
        if (!res.ok) return;
        const json: ContentArticlesTypeCountsResponse = await res.json();
        if (cancelled) return;

        setAllTypesCount(typeof json.total === "number" ? json.total : null);
        const next: Record<string, number | null> = {};
        (Array.isArray(json.by_type) ? json.by_type : []).forEach((row) => {
          if (row?.content_type) next[row.content_type] = row.count ?? null;
        });
        setTypeCounts(next);
      } catch {
        // Leave counts unset — pills render without a count rather than a fake one.
      }
    };

    // Small debounce so a burst of filter changes (e.g. toggling several
    // sector checkboxes) collapses into a single request instead of one
    // per change.
    const t = window.setTimeout(run, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      ac.abort();
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
      // Keep both flags in sync — the API reads `show_followed` to restrict
      // results to followed/portfolio entities (resolved server-side from
      // $auth.id, not a client-supplied user_id); `portfolio_only` mirrors it.
      portfolio_only: checked,
      show_followed: checked,
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
      padding: 20px 28px 56px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      width: 100%;
      box-sizing: border-box;
      overflow-x: hidden;
      font-family: ${T.sans};
    }
    .ia-eyebrow {
      display: inline-flex;
      align-items: center;
      height: 22px;
      padding: 0 10px;
      border-radius: 999px;
      background: #F1F4FE;
      border: 1px solid #E2E8FD;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.09em;
      text-transform: uppercase;
      color: ${T.azure};
      margin: 0 0 6px 0;
    }
    .ia-title {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.026em;
      color: ${T.ink};
      margin: 0;
      display: flex;
      align-items: baseline;
      gap: 11px;
      flex-wrap: wrap;
      line-height: 1.2;
    }
    .ia-title-count {
      font-size: 15px;
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
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
      width: 100%;
      box-sizing: border-box;
      align-items: stretch;
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
    .ia-pg-count { white-space: nowrap; }
    @media (max-width: 768px) {
      .ia-grid { grid-template-columns: 1fr !important; }
      .ia-title-row { flex-direction: column !important; }
      .ia-shell { padding: 16px 12px 40px !important; }
    }
    @media (min-width: 769px) and (max-width: 1024px) {
      .ia-grid { grid-template-columns: repeat(3, 1fr) !important; }
    }
    /* Above tablet width, column count follows the left nav's open/collapsed
       state (see useNavOpen) rather than the viewport alone — collapsing the
       nav reclaims enough width for a 5th column. */
    @media (min-width: 1025px) {
      .ia-grid.ia-grid-nav-open { grid-template-columns: repeat(4, 1fr) !important; }
      .ia-grid.ia-grid-nav-collapsed { grid-template-columns: repeat(5, 1fr) !important; }
    }
  `;

  return (
    <AppShell>
    <div className="min-h-screen" style={{ width: "100%", background: T.paper }}>
      <style dangerouslySetInnerHTML={{ __html: style }} />

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
                {(pagination.itemsTotal ?? 0).toLocaleString()} reports
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

            {/* Filter control room — mirrors entity list views: type pills +
                field filters at the top, search field below. */}
            <div className="ia-controls-card">
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

              <div className="ia-adv-filters" style={{ borderTop: "none", paddingTop: 0 }}>
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

              <div className="ia-search-row" style={{ borderTop: `1px solid ${T.hair}`, paddingTop: 14 }}>
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
              </div>
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
          <div className={`ia-grid ${navOpen ? "ia-grid-nav-open" : "ia-grid-nav-collapsed"}`}>
            {articles.map((article, index) => (
              <InsightsAnalysisCard key={article.id ?? index} article={article} />
            ))}
          </div>
        )}

        {/* Pagination — same CompactPagination control used across all
            other entity list views, with the per-page selector kept at the
            bottom right. */}
        {!isTrialActive && pagination.pageTotal > 1 && (
          <div className="ia-pgrow">
            <span className="ia-pg-count">
              {(pagination.itemsTotal ?? 0).toLocaleString()} reports
            </span>
            <CompactPagination
              curPage={pagination.curPage}
              pageTotal={pagination.pageTotal}
              onPageChange={handlePageChange}
              disabled={loading}
            />
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
    </div>
    </AppShell>
  );
}

export default function InsightsAnalysisPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
        <div className="min-h-screen" style={{ width: "100%", maxWidth: "100vw" }}>
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
        </AppShell>
      }
    >
      <InsightsAnalysisPageContent />
    </Suspense>
  );
}
