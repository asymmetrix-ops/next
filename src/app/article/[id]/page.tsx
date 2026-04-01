"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { openArticlePdfWindow } from "@/utils/exportArticlePdf";

// Types for the article detail page
interface ArticleDetail {
  id: number;
  created_at: number;
  Publication_Date: string;
  Headline: string;
  Strapline: string;
  Content_Type?: string;
  content_type?: string;
  // Some API variants may nest under Content
  Content?: { Content_type?: string; Content_Type?: string };
  Body: string;
  // New field added to API response (Xano Content table column)
  summary?: unknown;
  sectors: Array<{
    id: number;
    sector_name: string;
    Sector_importance: string;
  }>;
  companies_mentioned: Array<{ id: number; name: string }>;
  Transaction_status?: string;
  Visibility: string;
  Related_Corporate_Event?: Array<{
    id: number;
    created_at?: number;
    description?: string;
    long_description?: string;
    deal_status?: string;
    announcement_date?: string;
    closed_date?: string;
    deal_type?: string;
    target?: { id?: number; name?: string };
    advisors?: Array<{ _new_company?: { id?: number; name?: string } }>;
    primary_sectors?: Array<{ id?: number; sector_name?: string }>;
    secondary_sectors?: Array<{ id?: number; sector_name?: string }>;
  }>;
  Related_Documents: Array<{
    access: string;
    path: string;
    name: string;
    type: string;
    size: number;
    mime: string;
    meta: {
      validated: boolean;
    };
    url: string;
  }>;
}

interface CompanyOfFocusOverview {
  management?: Array<{
    id?: number;
    name?: string;
    job_titles?: string[];
    linkedin_url?: string;
    individual_id?: number;
    status?: string;
  }>;
  hq_location?: {
    id?: number;
    city?: string;
    state_province_county?: string;
    country?: string;
    lat?: string;
    lng?: string;
  };
  year_founded?: number | string | null;
  employee_count?: number | null;
  ownership_type?: string | null;
  investors_owners?: Array<{
    id?: number;
    name?: string;
    url?: string;
  }>;
}

interface CompanyOfFocusFinancialOverview {
  arr_m?: number | string | null;
  ebitda_m?: number | string | null;
  revenue_m?: number | string | null;
  enterprise_value_m?: number | string | null;
  revenue_multiple?: number | string | null;
  revenue_growth_pc?: number | string | null;
  rule_of_40?: number | string | null;
  ev_currency?: string | null;
  ebitda_currency?: string | null;
  revenue_currency?: string | null;
  // Source fields for financial metrics (e.g., "Estimate")
  revenue_source?: string | null;
  arr_source?: string | null;
  ebitda_source?: string | null;
  ev_source?: string | null;
  revenue_multiple_source?: string | null;
  revenue_growth_source?: string | null;
  rule_of_40_source?: string | null;
}

interface CompanyOfFocusApiItem {
  id: number;
  name: string;
  url?: string;
  description?: string;
  logo?: string;
  linkedin_url?: string;
  // Some API variants return the actual company id separately
  new_company_id?: number;
  company_id?: number;
  company_overview?: CompanyOfFocusOverview;
  financial_overview?: CompanyOfFocusFinancialOverview;
}

// Competitors API response (same payload used on Company Profile page)
interface CompanyCompetitorItem {
  id: number;
  name: string;
  linkedin_logo?: string;
}

interface CompanyCompetitorsResponse {
  peers_and_competitors: CompanyCompetitorItem[];
  potential_acquirers: CompanyCompetitorItem[];
  acquisition_targets: CompanyCompetitorItem[];
}

interface TableCompanyRow {
  id: number;
  name: string;
  url: string;
  loc: string;
  year_founded: string;
  primary_sectors: string;
  secondary_sectors: string;
  ownership: string;
  investors: string;
  li_emp: string;
  revenue_m: string;
  arr_m: string;
  ebitda_m: string;
  ebit_m: string;
  ev: string;
  arr_pc: string;
  churn_pc: string;
  grr_pc: string;
  nrr: string;
  upsell_pc: string;
  cross_sell_pc: string;
  price_increase_pc: string;
  rev_expansion_pc: string;
  new_client_growth_pc: string;
  rev_growth_pc: string;
  ebitda_margin: string;
  rule_of_40: string;
  revenue_multiple: string;
  no_of_clients: string;
  rev_per_client: string;
  no_employees: string;
  rev_per_employee: string;
}

interface ColumnDefinition {
  key: string;
  label: string;
}

// Column groups mirror Company Profile section titles & labels (`src/app/company/[param]/page.tsx`).
const COL_GROUPS: Array<{ group: string; cols: ColumnDefinition[] }> = [
  {
    group: "Overview",
    cols: [
      { key: "primary_sectors", label: "Primary Sector(s)" },
      { key: "secondary_sectors", label: "Secondary Sector(s)" },
      { key: "year_founded", label: "Year Founded" },
      { key: "url", label: "Website" },
      { key: "ownership", label: "Ownership" },
      { key: "loc", label: "HQ" },
      { key: "li_emp", label: "LinkedIn Employee Count" },
      { key: "investors", label: "Investors" },
    ],
  },
  {
    group: "Financial Metrics",
    cols: [
      { key: "revenue_m", label: "Revenue (m)" },
      { key: "ebitda_m", label: "EBITDA (m)" },
      { key: "ev", label: "Enterprise Value (m)" },
      { key: "revenue_multiple", label: "Revenue multiple" },
      { key: "rev_growth_pc", label: "Revenue Growth" },
      { key: "ebitda_margin", label: "EBITDA margin" },
      { key: "rule_of_40", label: "Rule of 40" },
    ],
  },
  {
    group: "Subscription Metrics",
    cols: [
      { key: "arr_pc", label: "Recurring Revenue" },
      { key: "arr_m", label: "ARR (m)" },
      { key: "churn_pc", label: "Churn" },
      { key: "grr_pc", label: "GRR" },
      { key: "upsell_pc", label: "Upsell" },
      { key: "cross_sell_pc", label: "Cross-sell" },
      { key: "price_increase_pc", label: "Price increase" },
      { key: "rev_expansion_pc", label: "Revenue expansion" },
      { key: "nrr", label: "NRR" },
      { key: "new_client_growth_pc", label: "New clients revenue growth" },
    ],
  },
  {
    group: "Other Metrics",
    cols: [
      { key: "ebit_m", label: "EBIT (m)" },
      { key: "no_of_clients", label: "Number of clients" },
      { key: "rev_per_client", label: "Revenue per client" },
      { key: "no_employees", label: "Number of employees" },
      { key: "rev_per_employee", label: "Revenue per employee" },
    ],
  },
];

const ALL_TABLE_COLUMNS: ColumnDefinition[] = COL_GROUPS.flatMap((g) => g.cols);
const WRAP_COLS = new Set([
  "primary_sectors",
  "secondary_sectors",
  "loc",
  "investors",
  "url",
]);

// Shared styles object
const styles = {
  container: {
    backgroundColor: "#f9fafb",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  maxWidth: {
    padding: "32px",
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: "24px",
  },
  card: {
    backgroundColor: "white",
    borderRadius: "12px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    padding: "32px 24px",
    marginBottom: "0",
  },
  heading: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#1a202c",
    marginBottom: "12px",
    marginTop: "0px",
    lineHeight: "1.3",
  },
  date: {
    fontSize: "16px",
    color: "#6b7280",
    marginBottom: "24px",
    fontWeight: "500",
  },
  strapline: {
    fontSize: "18px",
    color: "#374151",
    lineHeight: "1.6",
    marginBottom: "32px",
    fontStyle: "italic",
  },
  body: {
    fontSize: "16px",
    color: "#374151",
    lineHeight: "1.7",
    marginBottom: "32px",
  },
  section: {
    marginBottom: "24px",
  },
  sectionTitle: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#1a202c",
    marginBottom: "16px",
  },
  tagContainer: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "8px",
    marginBottom: "16px",
  },
  tag: {
    backgroundColor: "#e3f2fd",
    color: "#1976d2",
    padding: "8px 12px",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  },
  companyTag: {
    backgroundColor: "#e8f5e8",
    color: "#2e7d32",
    padding: "8px 12px",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  },
  sectorTag: {
    backgroundColor: "#f3e5f5",
    color: "#7b1fa2",
    padding: "8px 12px",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
  },
  contentTypeRow: {
    marginTop: "-8px",
    marginBottom: "24px",
  },
  contentTypeBadge: {
    display: "inline-block",
    fontSize: "12px",
    lineHeight: 1,
    color: "#1e40af",
    backgroundColor: "#eff6ff",
    padding: "6px 10px",
    borderRadius: "9999px",
    border: "1px solid #bfdbfe",
    fontWeight: 600,
  },
  transactionStatusBadge: {
    display: "inline-flex",
    alignItems: "center",
    fontSize: "11px",
    lineHeight: 1,
    padding: "6px 12px",
    borderRadius: "9999px",
    fontWeight: 700,
    letterSpacing: "0.03em",
    textTransform: "uppercase" as const,
    backgroundColor: "#dcfce7",
    color: "#166534",
    border: "1.5px solid #4ade80",
    whiteSpace: "nowrap" as const,
  },

  loading: {
    textAlign: "center" as const,
    padding: "40px",
    color: "#666",
    fontSize: "16px",
  },
  error: {
    textAlign: "center" as const,
    padding: "40px",
    color: "#dc2626",
    fontSize: "16px",
  },
  backButton: {
    backgroundColor: "#0075df",
    color: "white",
    fontWeight: "600",
    padding: "12px 24px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
    marginBottom: "24px",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  },
  infoRow: {
    display: "grid",
    gridTemplateColumns: "minmax(140px, 1.4fr) 2fr",
    alignItems: "center",
    columnGap: "8px",
    padding: "8px 0",
    borderBottom: "1px solid #e5e7eb",
    fontSize: "15px",
  },
  label: {
    fontWeight: 600,
    color: "#4b5563",
  },
  value: {
    textAlign: "right" as const,
    color: "#111827",
    fontWeight: 500,
  },
};

// Safe JSON-or-array parser used for multiple payload shapes
const tryParse = <T,>(val: unknown): T | undefined => {
  if (Array.isArray(val)) return val as unknown as T;
  if (typeof val === "string" && val.trim()) {
    try {
      return JSON.parse(val) as T;
    } catch {
      return undefined;
    }
  }
  return undefined;
};

// Summary is stored with HTML layout in Xano.
// We extract bullet "items" (prefer <li>, fallback to <p>/<div>) so the
// collapsed view can show "first bullet" while expanded shows all.
const extractSummaryItemsFromHtml = (html: string): string[] => {
  const trimmed = (html || "").trim();
  if (!trimmed) return [];

  try {
    // DOMParser is available because this is a client component.
    const parser = new DOMParser();
    const doc = parser.parseFromString(
      `<div id="__summary_root__">${trimmed}</div>`,
      "text/html"
    );
    const root = doc.getElementById("__summary_root__");
    if (!root) return [trimmed];

    const liEls = Array.from(root.querySelectorAll("li"));
    if (liEls.length > 0) {
      return liEls
        .map((li) => (li.innerHTML || "").trim())
        .filter(Boolean);
    }

    const pEls = Array.from(root.querySelectorAll("p"));
    if (pEls.length > 0) {
      return pEls.map((p) => (p.innerHTML || "").trim()).filter(Boolean);
    }

    // Fallback: treat direct children as "items"
    const children = Array.from(root.children);
    if (children.length > 0) {
      return children
        .map((el) => (el.innerHTML || "").trim())
        .filter(Boolean);
    }

    const text = (root.textContent || "").trim();
    return text ? [text] : [];
  } catch {
    return [trimmed];
  }
};

const parseSummaryItems = (val: unknown): string[] => {
  if (val === null || val === undefined) return [];

  // Array: each entry is either HTML string or plain text
  if (Array.isArray(val)) {
    const items = (val as unknown[])
      .map((x) => (typeof x === "string" ? x : String(x)))
      .map((s) => s.trim())
      .filter(Boolean);
    // If someone stored <li>...</li> chunks, extract their inner HTML
    const extracted = items.flatMap((s) =>
      s.includes("<") ? extractSummaryItemsFromHtml(s) : [s]
    );
    return extracted.map((s) => s.trim()).filter(Boolean);
  }

  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return [];

    // If stringified array, prefer that.
    const parsed = tryParse<unknown>(trimmed);
    if (Array.isArray(parsed)) {
      return parseSummaryItems(parsed);
    }

    // Otherwise treat as HTML (preferred) and extract items.
    const htmlItems = extractSummaryItemsFromHtml(trimmed);
    if (htmlItems.length > 0) return htmlItems;

    // Plain text fallback
    return [trimmed];
  }

  return [String(val)];
};

const ArticleDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [companyOfFocus, setCompanyOfFocus] =
    useState<CompanyOfFocusApiItem | null>(null);
  const [companyOfFocusLoading, setCompanyOfFocusLoading] = useState(false);
  const [companyOfFocusCompanyId, setCompanyOfFocusCompanyId] = useState<
    number | null
  >(null);
  const [competitors, setCompetitors] =
    useState<CompanyCompetitorsResponse | null>(null);
  const [competitorsLoading, setCompetitorsLoading] = useState(false);
  const [isCompanyOfFocusFlag, setIsCompanyOfFocusFlag] = useState<
    boolean | null
  >(null);
  // Guard against rare runtime cases where search params may be unavailable during hydration
  const searchParams = useSearchParams() as unknown as {
    get?: (key: string) => string | null;
  } | null;
  const fromHome = (searchParams?.get?.("from") ?? "") === "home";

  const articleId = String((params as Record<string, unknown>)?.id || "");
  const ENABLE_PDF_EXPORT = true;
  const [showGenerateTableModal, setShowGenerateTableModal] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableRows, setTableRows] = useState<TableCompanyRow[]>([]);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<Set<number>>(
    new Set()
  );
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<Set<string>>(
    new Set(ALL_TABLE_COLUMNS.map((c) => c.key))
  );

  const fetchArticle = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("asymmetrix_auth_token");
      if (!token) {
        setError("Authentication required");
        return;
      }

      const response = await fetch(
        `https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu:develop/content/${articleId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json: unknown = await response.json();
      const raw = (Array.isArray(json) ? (json[0] as unknown) : json) as
        | ArticleDetail
        | undefined;
      if (!raw || typeof raw !== "object") {
        setError("Article not found");
        return;
      }
      const normalized = {
        ...raw,
        sectors:
          tryParse<
            Array<{
              id: number;
              sector_name: string;
              Sector_importance: string;
            }>
          >(raw.sectors) || [],
        companies_mentioned:
          tryParse<Array<{ id: number; name: string }>>(
            raw.companies_mentioned
          ) || [],
        Related_Corporate_Event:
          tryParse<
            Array<{
              id: number;
              created_at?: number;
              description?: string;
              long_description?: string;
              deal_status?: string;
              announcement_date?: string;
              closed_date?: string;
              deal_type?: string;
              target?: { id?: number; name?: string };
              advisors?: Array<{
                _new_company?: { id?: number; name?: string };
              }>;
              primary_sectors?: Array<{ id?: number; sector_name?: string }>;
              secondary_sectors?: Array<{ id?: number; sector_name?: string }>;
            }>
          >(raw.Related_Corporate_Event) || [],
        Related_Documents:
          tryParse<
            Array<{
              access: string;
              path: string;
              name: string;
              type: string;
              size: number;
              mime: string;
              meta: { validated: boolean };
              url: string;
            }>
          >(raw.Related_Documents) || [],
      } as ArticleDetail;

      setArticle(normalized);
    } catch (error) {
      console.error("Error fetching article:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch article"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (articleId) {
      setSummaryOpen(false);
      fetchArticle();
    }
  }, [articleId]);

  // Fetch Company_of_Focus details for Company Analysis & Executive Interview content
  useEffect(() => {
    const fetchCompanyOfFocus = async () => {
      if (!article) {
        setCompanyOfFocus(null);
        setCompanyOfFocusCompanyId(null);
        setCompetitors(null);
        setIsCompanyOfFocusFlag(null);
        return;
      }

      const contentType = (
        article.Content_Type ||
        article.content_type ||
        article.Content?.Content_type ||
        article.Content?.Content_Type ||
        ""
      ).trim();

      const isCompanyAnalysisOrExecInterview = /^(company\s*analysis|executive\s*interview)$/i.test(
        contentType
      );

      const hasCompanyOfFocus =
        (article as unknown as { Company_of_Focus?: unknown })
          .Company_of_Focus != null;

      if (!isCompanyAnalysisOrExecInterview || !hasCompanyOfFocus) {
        setCompanyOfFocus(null);
        setCompanyOfFocusCompanyId(null);
        setCompetitors(null);
        setIsCompanyOfFocusFlag(null);
        return;
      }

      try {
        setCompanyOfFocusLoading(true);

        const token = localStorage.getItem("asymmetrix_auth_token");
        if (!token) {
          return;
        }

        const response = await fetch(
          `https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu:develop/aritcle_company_of_focus?content_id=${encodeURIComponent(
            articleId
          )}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const json: unknown = await response.json();
        const arr = Array.isArray(json) ? json : [];
        const rawItem = (arr[0] ?? null) as
          | {
              id?: number;
              name?: string;
              url?: string;
              description?: string;
              logo?: string;
              linkedin_url?: string;
              company_overview?: unknown;
              financial_overview?: unknown;
            }
          | null;

        if (!rawItem) {
          setCompanyOfFocus(null);
          setCompanyOfFocusCompanyId(null);
          return;
        }

        const overview =
          typeof rawItem.company_overview === "string"
            ? tryParse<CompanyOfFocusOverview>(rawItem.company_overview)
            : (rawItem.company_overview as CompanyOfFocusOverview | undefined);

        const financial =
          typeof rawItem.financial_overview === "string"
            ? tryParse<CompanyOfFocusFinancialOverview>(
                rawItem.financial_overview
              )
            : (rawItem.financial_overview as
                | CompanyOfFocusFinancialOverview
                | undefined);

        const coFocusCompanyIdCandidate =
          (rawItem as unknown as { new_company_id?: unknown })?.new_company_id ??
          (rawItem as unknown as { company_id?: unknown })?.company_id ??
          rawItem.id;
        const coFocusCompanyId =
          typeof coFocusCompanyIdCandidate === "number" &&
          Number.isFinite(coFocusCompanyIdCandidate) &&
          coFocusCompanyIdCandidate > 0
            ? coFocusCompanyIdCandidate
            : null;
        setCompanyOfFocusCompanyId(coFocusCompanyId);

        setCompanyOfFocus({
          id: rawItem.id ?? 0,
          name: rawItem.name || "",
          url: rawItem.url || "",
          description: rawItem.description || "",
          logo: rawItem.logo || "",
          linkedin_url: rawItem.linkedin_url || "",
          new_company_id:
            typeof (rawItem as unknown as { new_company_id?: unknown })
              ?.new_company_id === "number"
              ? (rawItem as unknown as { new_company_id: number }).new_company_id
              : undefined,
          company_id:
            typeof (rawItem as unknown as { company_id?: unknown })?.company_id ===
            "number"
              ? (rawItem as unknown as { company_id: number }).company_id
              : undefined,
          company_overview: overview,
          financial_overview: financial,
        });
      } catch (err) {
        console.error("Error fetching company of focus:", err);
      } finally {
        setCompanyOfFocusLoading(false);
      }
    };

    fetchCompanyOfFocus();
  }, [article, articleId]);

  // Fetch competitors for Company Analysis using Company of Focus id
  useEffect(() => {
    const fetchCompetitors = async () => {
      if (!article || !companyOfFocusCompanyId) {
        setCompetitors(null);
        setIsCompanyOfFocusFlag(null);
        return;
      }

      const ct = (
        article.Content_Type ||
        article.content_type ||
        article.Content?.Content_type ||
        article.Content?.Content_Type ||
        ""
      ).trim();

      const isCompanyAnalysis = /^company\s*analysis$/i.test(ct);
      if (!isCompanyAnalysis) {
        setCompetitors(null);
        setIsCompanyOfFocusFlag(null);
        return;
      }

      try {
        setCompetitorsLoading(true);
        const token = localStorage.getItem("asymmetrix_auth_token");
        if (!token) {
          setCompetitors(null);
          setIsCompanyOfFocusFlag(null);
          return;
        }

        const headers: Record<string, string> = {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        };

        const normalizeCompetitorArray = (raw: unknown): CompanyCompetitorItem[] => {
          if (Array.isArray(raw)) return raw as CompanyCompetitorItem[];
          if (typeof raw !== "string") return [];
          const trimmed = raw.trim();
          if (!trimmed) return [];
          const tryJson = (t: string): unknown => {
            try {
              return JSON.parse(t.replace(/\\u0022/g, '"'));
            } catch {
              return null;
            }
          };
          const first = tryJson(trimmed);
          if (Array.isArray(first)) return first as CompanyCompetitorItem[];
          if (typeof first === "string") {
            const second = tryJson(first);
            if (Array.isArray(second)) return second as CompanyCompetitorItem[];
          }
          return [];
        };

        const params = new URLSearchParams();
        params.append("new_company_id", String(companyOfFocusCompanyId));
        const res = await fetch(
          `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au:develop/get_company_competitors?${params.toString()}`,
          { method: "GET", headers, credentials: "include" }
        );

        if (!res.ok) {
          setCompetitors(null);
          setIsCompanyOfFocusFlag(null);
          return;
        }

        const data = await res.json();
        const payload = Array.isArray(data) ? data[0] : data;
        if (!payload || typeof payload !== "object") {
          setCompetitors(null);
          setIsCompanyOfFocusFlag(null);
          return;
        }

        const focusFlag = (payload as { is_company_of_focus?: unknown })
          ?.is_company_of_focus;
        setIsCompanyOfFocusFlag(focusFlag === true);

        setCompetitors({
          peers_and_competitors: normalizeCompetitorArray(
            (payload as { peers_and_competitors?: unknown }).peers_and_competitors
          ),
          potential_acquirers: normalizeCompetitorArray(
            (payload as { potential_acquirers?: unknown }).potential_acquirers
          ),
          acquisition_targets: normalizeCompetitorArray(
            (payload as { acquisition_targets?: unknown }).acquisition_targets
          ),
        });
      } catch (err) {
        console.error("Error fetching competitors:", err);
        setCompetitors(null);
        setIsCompanyOfFocusFlag(null);
      } finally {
        setCompetitorsLoading(false);
      }
    };

    fetchCompetitors();
  }, [article, companyOfFocusCompanyId]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not available";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  // Navigation now handled via <Link> elements to allow right-click/middle-click open in new tabs

  // Robust sector id extraction in case backend changes keys
  const getSectorId = (sector: unknown): number | undefined => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = sector as any;
    const candidate = s?.id ?? s?.sector_id ?? s?.Sector_id;
    if (typeof candidate === "number") return candidate;
    if (typeof candidate === "string") {
      const parsed = parseInt(candidate, 10);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  };

  // Sector navigation handled via <Link> elements

  const handleBackClick = () => {
    router.push("/insights-analysis");
  };

  // Utilities to embed image attachments within the body content
  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const buildFigureHtml = (url: string, name: string) =>
    `<figure class="article-inline-image"><img src="${escapeHtml(
      url
    )}" alt="${escapeHtml(name)}" /><figcaption>${escapeHtml(
      name
    )}</figcaption></figure>`;

  // Replace placeholders like <image_1>, <image_2> with corresponding image attachments
  const replaceImagePlaceholders = (
    bodyHtml: string,
    imageDocs: Array<{ url: string; name: string }>
  ): { html: string; usedIndices: Set<number> } => {
    const used = new Set<number>();
    if (!bodyHtml) return { html: "", usedIndices: used };
    if (!imageDocs || imageDocs.length === 0)
      return { html: bodyHtml, usedIndices: used };

    const placeholderRegex = /<image_(\d+)>/gi; // 1-based index
    const replaced = bodyHtml.replace(placeholderRegex, (_match, p1) => {
      const idx = parseInt(p1, 10) - 1;
      if (Number.isNaN(idx) || idx < 0 || idx >= imageDocs.length) {
        // Leave placeholder unchanged if out of range
        return _match;
      }
      used.add(idx);
      const doc = imageDocs[idx] as { url?: string; name?: string } | undefined;
      if (!doc || !doc.url) {
        return _match;
      }
      return buildFigureHtml(doc.url, doc.name || "");
    });

    return { html: replaced, usedIndices: used };
  };

  const injectImagesIntoBody = (
    bodyHtml: string,
    attachments: Array<{
      url: string;
      name: string;
      mime?: string;
      type?: string;
    }>
  ): { html: string; injected: boolean } => {
    if (!bodyHtml) return { html: "", injected: false };
    const imageDocs = (attachments || []).filter(isImageDoc);
    if (imageDocs.length === 0) return { html: bodyHtml, injected: false };

    // Split by paragraph closing tags to place images between paragraphs
    const parts = bodyHtml.split(/<\/p>/i);
    const paragraphCount = Math.max(parts.length - 1, 0);

    if (paragraphCount <= 0) {
      // No clear paragraphs; append all images at the end of the body
      const figures = imageDocs
        .filter(Boolean)
        .map((doc) =>
          doc && (doc as { url?: string; name?: string }).url
            ? buildFigureHtml(
                (doc as { url: string }).url,
                (doc as { name?: string }).name || ""
              )
            : ""
        )
        .filter(Boolean)
        .join("");
      return { html: `${bodyHtml}${figures}`, injected: true };
    }

    // Distribute images as evenly as possible across paragraphs
    const insertionMap = new Map<number, number>(); // paragraphIndex -> imageIndex
    let lastPos = -1;
    for (let i = 0; i < imageDocs.length; i++) {
      let pos =
        Math.floor(((i + 1) * paragraphCount) / (imageDocs.length + 1)) - 1;
      pos = Math.max(0, Math.min(paragraphCount - 1, pos));
      if (pos <= lastPos) pos = Math.min(paragraphCount - 1, lastPos + 1);
      insertionMap.set(pos, i);
      lastPos = pos;
      if (lastPos >= paragraphCount - 1 && i < imageDocs.length - 1) break;
    }

    let result = "";
    for (let p = 0; p < parts.length; p++) {
      const segment = parts[p];
      if (p < paragraphCount) {
        result += `${segment}</p>`;
        if (insertionMap.has(p)) {
          const imgIdx = insertionMap.get(p)!;
          const doc = imageDocs[imgIdx] as
            | { url?: string; name?: string }
            | undefined;
          if (doc && doc.url) {
            result += buildFigureHtml(doc.url, doc.name || "");
          }
        }
      } else {
        // Remainder (after the last </p>)
        result += segment;
      }
    }

    return { html: result, injected: true };
  };

  const isImageDoc = (doc: {
    mime?: string;
    type?: string;
    url: string;
    name: string;
  }) => {
    if (!doc) return false;
    if (doc.mime && doc.mime.startsWith("image/")) return true;
    if (doc.type && doc.type.startsWith("image/")) return true;
    const nameOrUrl = `${doc.name || ""} ${doc.url || ""}`;
    return /(\.(png|jpe?g|gif|webp|svg))($|\?)/i.test(nameOrUrl);
  };

  const formatCompanyOfFocusYearFounded = (candidate: unknown): string => {
    if (candidate === null || candidate === undefined) return "Not available";
    const n = Number(candidate);
    const currentYear = new Date().getFullYear();
    if (Number.isFinite(n) && n >= 1800 && n <= currentYear) {
      return String(n);
    }
    return "Not available";
  };

  // Plain number formatter copied from Company Profile (no currency, preserve decimals)
  const formatPlainNumber = (
    value?: number | string | null
  ): string => {
    if (value === undefined || value === null) return "Not available";
    if (typeof value === "number") {
      return value.toLocaleString("en-US", { maximumFractionDigits: 10 });
    }
    const trimmed = String(value).trim();
    if (trimmed.length === 0) return "Not available";
    const num = Number(trimmed.replace(/,/g, ""));
    if (!Number.isFinite(num)) return trimmed;
    const match = trimmed.match(/\.([0-9]+)/);
    const frac = match ? Math.min(10, match[1].length) : 0;
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: frac,
    });
  };

  const formatMultiple = (value: unknown): string => {
    if (value === null || value === undefined || value === "") {
      return "Not available";
    }
    const num = Number(value);
    if (!Number.isFinite(num)) return "Not available";
    const rounded = Math.round(num * 10) / 10;
    return `${rounded.toLocaleString()}x`;
  };

  const formatPercent = (value: unknown): string => {
    if (value === null || value === undefined || value === "") {
      return "Not available";
    }
    const num = Number(value);
    if (!Number.isFinite(num)) return "Not available";
    return `${Math.round(num)}%`;
  };

  const getFinancialSourceTooltip = (
    source?: string | null
  ): string | undefined => {
    if (!source) return undefined;
    const trimmed = source.toString().trim();
    if (!trimmed) return undefined;
    return `Source: ${trimmed}`;
  };

  const toDisplayString = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "number") {
      return Number.isFinite(value) ? value.toLocaleString("en-US") : "";
    }
    if (typeof value === "string") return value.trim();
    if (Array.isArray(value)) {
      return value.map((v) => toDisplayString(v)).filter(Boolean).join(", ");
    }
    if (typeof value === "object") {
      const obj = value as Record<string, unknown>;
      if (typeof obj.name === "string") return obj.name.trim();
    }
    return String(value).trim();
  };

  const normalizeWebsite = (raw: string): string => {
    const trimmed = (raw || "").trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const getTableCellValue = (row: TableCompanyRow, key: string): string => {
    const raw = (row as unknown as Record<string, unknown>)[key];
    const v =
      typeof raw === "string" ? raw.trim() : toDisplayString(raw).trim();
    if (!v || v === "—") return "Not available";
    return v;
  };

  const parseMaybeSetLikeList = (value: unknown): string[] => {
    if (value === null || value === undefined) return [];
    if (typeof value === "object" && !Array.isArray(value)) {
      const vals = Object.values(value as Record<string, unknown>)
        .flatMap((v) => {
          if (v === null || v === undefined) return [];
          if (typeof v === "object" && !Array.isArray(v)) {
            return Object.values(v as Record<string, unknown>).map((x) =>
              toDisplayString(x)
            );
          }
          return [toDisplayString(v)];
        })
        .map((s) => s.trim())
        .filter(Boolean);
      return Array.from(new Set(vals));
    }
    if (Array.isArray(value)) {
      return value.map((v) => toDisplayString(v)).filter(Boolean);
    }
    const text = toDisplayString(value);
    if (!text || text === "{}" || text === "[]") return [];
    const parsed = tryParse<unknown>(text);
    if (Array.isArray(parsed)) {
      return parsed.map((v) => toDisplayString(v)).filter(Boolean);
    }
    const setLike = text
      .replace(/^\{/, "")
      .replace(/\}$/, "")
      .split(",")
      .map((x) => x.replace(/^["']|["']$/g, "").trim())
      .filter(Boolean);
    if (setLike.length === 0) return [];
    return setLike;
  };

  const mapCompanyTableApiRow = (row: Record<string, unknown>): TableCompanyRow => {
      const id = Number(row.id) || 0;
      const primarySectors = parseMaybeSetLikeList(row.primary_sector_names).join(", ");
      const secondarySectors = parseMaybeSetLikeList(row.secondary_sector_names).join(", ");
      const investorNames = parseMaybeSetLikeList(row.investor_names).join(", ");
      const hqLocation = [
        toDisplayString(row.hq_city),
        toDisplayString(row.hq_state),
        toDisplayString(row.hq_country),
      ]
        .filter(Boolean)
        .join(", ");

      const na = (s: string) => (s.trim() ? s : "Not available");
      const urlRaw = normalizeWebsite(toDisplayString(row.url));

      return {
        id,
        name: toDisplayString(row.name) || `Company ${id}`,
        url: na(urlRaw),
        loc: na(hqLocation),
        year_founded: formatCompanyOfFocusYearFounded(
          row.year_founded_label ?? row.year_founded
        ),
        primary_sectors: na(primarySectors),
        secondary_sectors: na(secondarySectors),
        ownership: na(toDisplayString(row.ownership_type || row.ownership_status)),
        investors: na(investorNames),
        li_emp: formatPlainNumber(
          row.linkedin_employee as number | string | null | undefined
        ),
        revenue_m: formatPlainNumber(row.Revenue_m as number | string | null | undefined),
        arr_m: formatPlainNumber(row.ARR_m as number | string | null | undefined),
        ebitda_m: formatPlainNumber(row.EBITDA_m as number | string | null | undefined),
        ebit_m: formatPlainNumber(row.EBIT_m as number | string | null | undefined),
        ev: formatPlainNumber(row.EV as number | string | null | undefined),
        arr_pc: formatPercent(row.ARR_pc),
        churn_pc: formatPercent(row.Churn_pc),
        grr_pc: formatPercent(row.GRR_pc),
        nrr: formatPercent(row.NRR),
        upsell_pc: formatPercent(row.Upsell_pc),
        cross_sell_pc: formatPercent(row.Cross_sell_pc),
        price_increase_pc: formatPercent(row.Price_increase_pc),
        rev_expansion_pc: formatPercent(row.Rev_expansion_pc),
        new_client_growth_pc: formatPercent(row.New_client_growth_pc),
        rev_growth_pc: formatPercent(row.Rev_Growth_PC),
        ebitda_margin: formatPercent(row.EBITDA_margin),
        rule_of_40: formatPlainNumber(
          row.Rule_of_40 as number | string | null | undefined
        ),
        revenue_multiple: formatMultiple(row.Revenue_multiple),
        no_of_clients: formatPlainNumber(
          row.No_of_Clients as number | string | null | undefined
        ),
        rev_per_client: formatPlainNumber(
          row.Rev_per_client as number | string | null | undefined
        ),
        no_employees: formatPlainNumber(
          row.No_Employees as number | string | null | undefined
        ),
        rev_per_employee: formatPlainNumber(
          row.Revenue_per_employee as number | string | null | undefined
        ),
      };
  };

  const handleOpenGenerateTable = useCallback(async () => {
    if (!article) return;
    setShowGenerateTableModal(true);
    setTableLoading(true);

    try {
      const ids = new Set<number>();
      (article.companies_mentioned || []).forEach((c) => {
        if (typeof c.id === "number" && c.id > 0) ids.add(c.id);
      });
      if (companyOfFocusCompanyId && companyOfFocusCompanyId > 0) {
        ids.add(companyOfFocusCompanyId);
      }

      const idList = Array.from(ids);
      const token = localStorage.getItem("asymmetrix_auth_token");
      if (!token || idList.length === 0) {
        setTableRows([]);
        setSelectedCompanyIds(new Set());
        return;
      }

      const params = new URLSearchParams();
      params.append("company_ids", JSON.stringify(idList));
      const response = await fetch(
        `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/get_company_table_data?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to load table data: ${response.status}`);
      }

      const payload = (await response.json()) as unknown;
      const items = Array.isArray(payload) ? payload : [];
      const rows = items
        .filter((item) => item && typeof item === "object")
        .map((item) => mapCompanyTableApiRow(item as Record<string, unknown>))
        .filter((r) => r.id > 0);

      setTableRows(rows);
      setSelectedCompanyIds(new Set(rows.map((r) => r.id)));
    } finally {
      setTableLoading(false);
    }
  }, [article, companyOfFocusCompanyId]);

  const handleExportTableCsv = () => {
    const activeRows = tableRows.filter((r) => selectedCompanyIds.has(r.id));
    const activeColumns = ALL_TABLE_COLUMNS.filter((c) =>
      selectedColumnKeys.has(c.key)
    );
    if (!activeRows.length || !activeColumns.length) return;

    const escapeCsv = (value: string) => `"${String(value || "").replace(/"/g, '""')}"`;
    const header = [
      escapeCsv("Company Name"),
      escapeCsv("Company Profile URL"),
      ...activeColumns.map((c) => escapeCsv(c.label)),
    ].join(",");
    const lines = activeRows.map((row) =>
      [
        escapeCsv(row.name),
        escapeCsv(`https://www.asymmetrixintelligence.com/company/${row.id}`),
        ...activeColumns.map((col) => escapeCsv(getTableCellValue(row, col.key))),
      ].join(",")
    );
    const csv = [header, ...lines].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `article-company-table-${articleId || "export"}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <Header />
        <div style={styles.maxWidth}>
          <div style={styles.loading}>Loading article...</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <Header />
        <div style={styles.maxWidth}>
          <div style={styles.error}>
            {fromHome
              ? "Reach out for access to our research on the Data & Analytics sector"
              : `Error: ${error}`}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!article) {
    return (
      <div style={styles.container}>
        <Header />
        <div style={styles.maxWidth}>
          <div style={styles.error}>
            {fromHome
              ? "Reach out for access to our research on the Data & Analytics sector"
              : "Article not found"}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const ctForSidebar = (
    article.Content_Type ||
    article.content_type ||
    article.Content?.Content_type ||
    article.Content?.Content_Type ||
    ""
  ).trim();
  const isCompanyAnalysis = /^company\s*analysis$/i.test(ctForSidebar);
  const hasCompetitorsData = Boolean(
    competitors &&
      ((competitors.peers_and_competitors || []).length > 0 ||
        (competitors.potential_acquirers || []).length > 0 ||
        (competitors.acquisition_targets || []).length > 0)
  );
  const showMarketLandscape = isCompanyAnalysis && hasCompetitorsData;
  const peersTitle =
    isCompanyOfFocusFlag === true ? "Peers & Competitors" : "Market Landscape";

  const canOpenCompanyTable =
    Boolean(
      (article.companies_mentioned && article.companies_mentioned.length > 0) ||
        (companyOfFocusCompanyId != null && companyOfFocusCompanyId > 0)
    );

  return (
    <div style={styles.container}>
      <Header />
      <div style={styles.maxWidth}>
        <button onClick={handleBackClick} style={styles.backButton}>
          ← Back to Insights & Analysis
        </button>

        <div className="article-layout">
          {/* Left: Main body (2/3) */}
          <div style={styles.card} className="article-main">
            {/* Article Header */}
            <h1 style={styles.heading}>{article.Headline}</h1>
            {article.Transaction_status && (
              <div style={{ marginBottom: 16 }}>
                <span style={styles.transactionStatusBadge}>
                  {article.Transaction_status}
                </span>
              </div>
            )}
            <p style={styles.strapline}>{article.Strapline}</p>
            {(() => {
              const ct = (
                article.Content_Type ||
                article.content_type ||
                article.Content?.Content_type ||
                article.Content?.Content_Type ||
                ""
              ).trim();
              return ct ? (
                <div style={styles.contentTypeRow}>
                  <span style={styles.contentTypeBadge}>{ct}</span>
                </div>
              ) : null;
            })()}

            {/* Summary (collapsible) */}
            {(() => {
              // Summary stored as HTML; render like body (preserve markup)
              const rawSummary =
                typeof article.summary === "string"
                  ? article.summary
                  : Array.isArray(article.summary)
                    ? JSON.stringify(article.summary)
                    : "";
              const allImageDocs = (article.Related_Documents || []).filter(
                isImageDoc
              );
              const { html: summaryHtml } = rawSummary
                ? replaceImagePlaceholders(rawSummary, allImageDocs)
                : { html: "" };

              const items = parseSummaryItems(summaryHtml || article.summary);
              if (!items.length) return null;
              const visibleItems = summaryOpen ? items : [items[0]!];

              return (
                <div className="article-summary" aria-label="Summary section">
                  <button
                    type="button"
                    className="summary-header"
                    onClick={() => setSummaryOpen((v) => !v)}
                    aria-expanded={summaryOpen}
                  >
                    <span className="summary-title">Summary</span>
                    <span
                      className={`summary-chevron ${summaryOpen ? "open" : ""}`}
                      aria-hidden="true"
                    >
                      ▾
                    </span>
                  </button>
                  <ul className="summary-list">
                    {visibleItems.map((itemHtml, idx) => (
                      <li
                        key={`${idx}-${itemHtml}`}
                        dangerouslySetInnerHTML={{ __html: itemHtml }}
                      />
                    ))}
                  </ul>
                </div>
              );
            })()}

            {/* Article Body with embedded images from attachments */}
            {(() => {
              const allImageDocs = (article.Related_Documents || []).filter(
                isImageDoc
              );
              const { html: withPlaceholders, usedIndices } =
                replaceImagePlaceholders(article.Body, allImageDocs);
              const remainingImages = allImageDocs.filter(
                (_, idx) => !usedIndices.has(idx)
              );
              const { html } = injectImagesIntoBody(
                withPlaceholders,
                remainingImages
              );
              return (
                <div
                  style={styles.body}
                  className="article-body"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              );
            })()}

            {/* Inline image grid (if additional images remain useful outside body) */}
            {article.Related_Documents &&
              article.Related_Documents.filter(Boolean).some(isImageDoc) && (
                <div style={styles.section}>
                  <h2 style={styles.sectionTitle}>Images</h2>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(220px, 1fr))",
                      gap: 16,
                    }}
                  >
                    {(article.Related_Documents || [])
                      .filter(Boolean)
                      .filter(isImageDoc)
                      .map((doc, idx) => (
                        <figure key={`${doc.url}-${idx}`} style={{ margin: 0 }}>
                          <img src={doc.url || ""} alt={doc.name || ""} />
                          <figcaption>{doc.name || ""}</figcaption>
                        </figure>
                      ))}
                  </div>
                </div>
              )}

            {/* Related Documents (attachments) */}
            {article.Related_Documents &&
              (article.Related_Documents || [])
                .filter(Boolean)
                .filter((d) => !isImageDoc(d)).length > 0 && (
                <div style={styles.section}>
                  <h2 style={styles.sectionTitle}>Related Documents</h2>
                  <div style={styles.tagContainer}>
                    {(article.Related_Documents || [])
                      .filter(Boolean)
                      .filter((d) => !isImageDoc(d))
                      .map((doc, index) => {
                        const url = (doc as unknown as { url?: string })?.url;
                        const name = (doc as unknown as { name?: string })
                          ?.name;
                        if (!url) {
                          return null;
                        }
                        return (
                          <a
                            key={index}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              ...styles.tag,
                              textDecoration: "none",
                            }}
                          >
                            {name || "Document"}
                          </a>
                        );
                      })}
                  </div>
                </div>
              )}
          </div>

          {/* Right: Metadata (1/3) */}
          <div style={styles.card} className="article-meta">
            {/* Publication Date */}
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Published</h2>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <p style={{ ...styles.date, marginBottom: 0 }}>
                  {formatDate(article.Publication_Date)}
                </p>
                {/* Export PDF Button */}
                {ENABLE_PDF_EXPORT && (
                  <button
                    onClick={() => openArticlePdfWindow(article)}
                    style={{
                      backgroundColor: "#38a169",
                      color: "white",
                      fontWeight: 600,
                      padding: "10px 14px",
                      borderRadius: 6,
                      border: "none",
                      cursor: "pointer",
                      fontSize: 13,
                      textAlign: "center",
                      whiteSpace: "nowrap",
                    }}
                    onMouseOver={(e) =>
                      ((e.target as HTMLButtonElement).style.backgroundColor =
                        "#2f855a")
                    }
                    onMouseOut={(e) =>
                      ((e.target as HTMLButtonElement).style.backgroundColor =
                        "#38a169")
                    }
                  >
                    Export PDF
                  </button>
                )}
              </div>
            </div>
            {/* Company of Focus: Company Overview & Financial Overview (single column layout) */}
            {(() => {
              if (!article || !companyOfFocus || companyOfFocusLoading) {
                return null;
              }

              const ct = (
                article.Content_Type ||
                article.content_type ||
                article.Content?.Content_type ||
                article.Content?.Content_Type ||
                ""
              ).trim();
              const isCompanyAnalysisOrExecInterview = /^(company\s*analysis|executive\s*interview)$/i.test(
                ct
              );
              if (!isCompanyAnalysisOrExecInterview) return null;

              const overview = companyOfFocus.company_overview;
              const financial = companyOfFocus.financial_overview;

              if (!overview && !financial) return null;

              const hqLocation = overview?.hq_location
                ? [
                    overview.hq_location.city,
                    overview.hq_location.state_province_county,
                    overview.hq_location.country,
                  ]
                    .filter(Boolean)
                    .join(", ")
                : "Not available";

              const yearFounded = formatCompanyOfFocusYearFounded(
                overview?.year_founded
              );

              const ownership =
                overview?.ownership_type || "Not available";

              const investorItems = overview?.investors_owners || [];
              const investors =
                investorItems && investorItems.length
                  ? investorItems
                      .map((inv) => inv.name)
                      .filter(Boolean)
                      .join(", ")
                  : "Not available";

              const managementEntries =
                overview?.management && overview.management.length
                  ? overview.management.filter((m) => {
                      const titles = m.job_titles || [];
                      const hasTitle = titles.some((t) =>
                        /ceo|founder/i.test((t || "").toString())
                      );
                      const status = (m.status || "").toString().trim();
                      const isCurrent =
                        !status || /^current$/i.test(status);
                      return hasTitle && isCurrent;
                    })
                  : [];

              const management =
                managementEntries.length > 0
                  ? managementEntries
                      .map((m) => m.name)
                      .filter(Boolean)
                      .join(", ")
                  : "Not available";

              const employeeCount =
                typeof overview?.employee_count === "number"
                  ? overview.employee_count.toLocaleString("en-US")
                  : "Not available";

              const currencyForHeader =
                (financial?.ev_currency ||
                  financial?.revenue_currency ||
                  financial?.ebitda_currency ||
                  "") || "";

              const financialHeader = currencyForHeader
                ? `Financial Snapshot (${currencyForHeader})`
                : "Financial Snapshot";

              const revenueDisplay = financial
                ? formatPlainNumber(financial.revenue_m)
                : "Not available";

              const arrDisplay = financial
                ? formatPlainNumber(financial.arr_m)
                : "Not available";

              const ebitdaDisplay = financial
                ? formatPlainNumber(financial.ebitda_m)
                : "Not available";

              const evDisplay = financial
                ? formatPlainNumber(financial.enterprise_value_m)
                : "Not available";

              const revenueMultipleDisplay = financial
                ? formatMultiple(financial.revenue_multiple)
                : "Not available";

              const revenueGrowthDisplay = financial
                ? formatPercent(financial.revenue_growth_pc)
                : "Not available";

              const ruleOf40Display = financial
                ? formatPercent(financial.rule_of_40)
                : "Not available";

              return (
                <>
                  {overview && (
                    <div
                      style={{
                        ...styles.section,
                        borderRadius: 8,
                        border: "1px solid #e5e7eb",
                        padding: "16px 16px 12px",
                        backgroundColor: "#f9fafb",
                      }}
                      className="article-financial-metrics"
                    >
                      <h2
                        style={{
                          ...styles.sectionTitle,
                          marginBottom: "12px",
                        }}
                      >
                        Company Overview
                      </h2>
                      <div>
                        {companyOfFocus?.id && companyOfFocus?.name && (
                          <div style={styles.infoRow}>
                            <span style={styles.label}>Company</span>
                            <span
                              style={{
                                ...styles.value,
                                display: "flex",
                                flexWrap: "wrap",
                                justifyContent: "flex-end",
                                gap: "6px",
                              }}
                            >
                              <Link
                                href={`/company/${companyOfFocus.id}`}
                                style={{
                                  ...styles.companyTag,
                                  textDecoration: "none",
                                  display: "inline-block",
                                  marginBottom: 4,
                                }}
                                prefetch={false}
                              >
                                {companyOfFocus.name}
                              </Link>
                            </span>
                          </div>
                        )}
                        <div style={styles.infoRow}>
                          <span style={styles.label}>HQ Location</span>
                          <span style={styles.value}>{hqLocation}</span>
                        </div>
                        <div style={styles.infoRow}>
                          <span style={styles.label}>Year Founded</span>
                          <span style={styles.value}>{yearFounded}</span>
                        </div>
                        <div style={styles.infoRow}>
                          <span style={styles.label}>Ownership Type</span>
                          <span style={styles.value}>{ownership}</span>
                        </div>
                        <div style={styles.infoRow}>
                          <span style={styles.label}>Investor(s) / Owner(s)</span>
                          <span
                            style={{
                              ...styles.value,
                              display: "flex",
                              flexWrap: "wrap",
                              justifyContent: "flex-end",
                              gap: "6px",
                            }}
                          >
                            {investorItems && investorItems.length ? (
                              investorItems
                                .filter((inv) => inv && inv.name)
                                .map((inv, idx) => {
                                  const name = inv.name || "";
                                  const id =
                                    typeof inv.id === "number" ? inv.id : null;
                                  const internalHref =
                                    id && id > 0 ? `/investors/${id}` : "";
                                  const href = internalHref || inv.url || "";
                                  const baseStyle = {
                                    ...styles.companyTag,
                                    textDecoration: "none",
                                    display: "inline-block",
                                    marginBottom: 4,
                                  } as React.CSSProperties;
                                  if (!href) {
                                    return (
                                      <span
                                        key={`${name}-${idx}`}
                                        style={baseStyle}
                                      >
                                        {name}
                                      </span>
                                    );
                                  }

                                  if (internalHref) {
                                    return (
                                      <Link
                                        key={`${name}-${idx}`}
                                        href={internalHref}
                                        style={baseStyle}
                                        prefetch={false}
                                      >
                                        {name}
                                      </Link>
                                    );
                                  }

                                  return (
                                    <a
                                      key={`${name}-${idx}`}
                                      href={href}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={baseStyle}
                                    >
                                      {name}
                                    </a>
                                  );
                                })
                            ) : (
                              <span>{investors}</span>
                            )}
                          </span>
                        </div>
                        <div style={styles.infoRow}>
                          <span style={styles.label}>Management</span>
                          <span
                            style={{
                              ...styles.value,
                              display: "flex",
                              flexWrap: "wrap",
                              justifyContent: "flex-end",
                              gap: "6px",
                            }}
                          >
                            {managementEntries && managementEntries.length ? (
                              managementEntries.map((m, idx) => {
                                const name = m.name || "";
                                const label = name;
                                const individualId =
                                  (m as { individual_id?: number })
                                    .individual_id ??
                                  (typeof m.id === "number" ? m.id : undefined);
                                const internalHref = individualId
                                  ? `/individual/${individualId}`
                                  : "";
                                const href = internalHref || m.linkedin_url || "";
                                const baseStyle = {
                                  ...styles.companyTag,
                                  textDecoration: "none",
                                  display: "inline-block",
                                  marginBottom: 4,
                                } as React.CSSProperties;
                                if (!href) {
                                  return (
                                    <span
                                      key={`${name}-${idx}`}
                                      style={baseStyle}
                                    >
                                      {label}
                                    </span>
                                  );
                                }

                                // Prefer internal dynamic individual page when possible
                                if (internalHref) {
                                  return (
                                    <Link
                                      key={`${name}-${idx}`}
                                      href={internalHref}
                                      style={baseStyle}
                                      prefetch={false}
                                    >
                                      {label}
                                    </Link>
                                  );
                                }

                                return (
                                  <a
                                    key={`${name}-${idx}`}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={baseStyle}
                                  >
                                    {label}
                                  </a>
                                );
                              })
                            ) : (
                              <span>{management}</span>
                            )}
                          </span>
                        </div>
                        <div style={styles.infoRow}>
                          <span style={styles.label}>Number of Employees</span>
                          <span style={styles.value}>{employeeCount}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {financial && (
                    <div
                      className="article-financial-metrics"
                      style={{
                        ...styles.section,
                        borderRadius: 8,
                        border: "1px solid #e5e7eb",
                        padding: "16px 16px 12px",
                        backgroundColor: "#f9fafb",
                      }}
                    >
                      <h2
                        style={{
                          ...styles.sectionTitle,
                          marginBottom: "12px",
                        }}
                      >
                        {financialHeader}
                      </h2>
                      <div>
                        <div style={styles.infoRow}>
                          <span style={styles.label}>Revenue (m)</span>
                          <span
                            style={styles.value}
                            title={getFinancialSourceTooltip(
                              financial.revenue_source
                            )}
                          >
                            {revenueDisplay}
                          </span>
                        </div>
                        <div style={styles.infoRow}>
                          <span style={styles.label}>ARR (m)</span>
                          <span
                            style={styles.value}
                            title={getFinancialSourceTooltip(
                              financial.arr_source
                            )}
                          >
                            {arrDisplay}
                          </span>
                        </div>
                        <div style={styles.infoRow}>
                          <span style={styles.label}>EBITDA (m)</span>
                          <span
                            style={styles.value}
                            title={getFinancialSourceTooltip(
                              financial.ebitda_source
                            )}
                          >
                            {ebitdaDisplay}
                          </span>
                        </div>
                        <div style={styles.infoRow}>
                          <span style={styles.label}>Enterprise Value (m)</span>
                          <span
                            style={styles.value}
                            title={getFinancialSourceTooltip(
                              financial.ev_source
                            )}
                          >
                            {evDisplay}
                          </span>
                        </div>
                        <div style={styles.infoRow}>
                          <span style={styles.label}>Revenue Multiple (x)</span>
                          <span
                            style={styles.value}
                            title={getFinancialSourceTooltip(
                              financial.revenue_multiple_source
                            )}
                          >
                            {revenueMultipleDisplay}
                          </span>
                        </div>
                        <div style={styles.infoRow}>
                          <span style={styles.label}>Revenue Growth (%)</span>
                          <span
                            style={styles.value}
                            title={getFinancialSourceTooltip(
                              financial.revenue_growth_source
                            )}
                          >
                            {revenueGrowthDisplay}
                          </span>
                        </div>
                        <div style={styles.infoRow}>
                          <span style={styles.label}>Rule of 40 (%)</span>
                          <span
                            style={styles.value}
                            title={getFinancialSourceTooltip(
                              financial.rule_of_40_source
                            )}
                          >
                            {ruleOf40Display}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
            {/* Competitors (Company Analysis only) */}
            {(isCompanyAnalysis && (competitorsLoading || hasCompetitorsData)) && (
              <div style={styles.section}>
                {competitorsLoading ? (
                  <div style={{ color: "#6b7280", fontSize: 14 }}>Loading...</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {competitors?.peers_and_competitors?.length ? (
                      <div>
                        <div
                          style={{
                            ...styles.sectionTitle,
                            marginBottom: 8,
                          }}
                        >
                          {peersTitle}
                        </div>
                        <div style={styles.tagContainer}>
                          {competitors.peers_and_competitors.map((c) => (
                            <Link
                              key={`peer-${c.id}`}
                              href={`/company/${c.id}`}
                              prefetch={false}
                              style={{
                                ...styles.companyTag,
                                textDecoration: "none",
                                display: "inline-block",
                              }}
                              onMouseEnter={(e) => {
                                (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                                  "#c8e6c9";
                              }}
                              onMouseLeave={(e) => {
                                (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                                  "#e8f5e8";
                              }}
                            >
                              {c.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {competitors?.potential_acquirers?.length ? (
                      <div>
                        <div
                          style={{
                            ...styles.sectionTitle,
                            marginBottom: 8,
                          }}
                        >
                          Potential Acquirers
                        </div>
                        <div style={styles.tagContainer}>
                          {competitors.potential_acquirers.map((c) => (
                            <Link
                              key={`acq-${c.id}`}
                              href={`/company/${c.id}`}
                              prefetch={false}
                              style={{
                                ...styles.companyTag,
                                textDecoration: "none",
                                display: "inline-block",
                              }}
                              onMouseEnter={(e) => {
                                (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                                  "#c8e6c9";
                              }}
                              onMouseLeave={(e) => {
                                (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                                  "#e8f5e8";
                              }}
                            >
                              {c.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {competitors?.acquisition_targets?.length ? (
                      <div>
                        <div
                          style={{
                            ...styles.sectionTitle,
                            marginBottom: 8,
                          }}
                        >
                          Acquisition Targets
                        </div>
                        <div style={styles.tagContainer}>
                          {competitors.acquisition_targets.map((c) => (
                            <Link
                              key={`tgt-${c.id}`}
                              href={`/company/${c.id}`}
                              prefetch={false}
                              style={{
                                ...styles.companyTag,
                                textDecoration: "none",
                                display: "inline-block",
                              }}
                              onMouseEnter={(e) => {
                                (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                                  "#c8e6c9";
                              }}
                              onMouseLeave={(e) => {
                                (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                                  "#e8f5e8";
                              }}
                            >
                              {c.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )}
            {/* Companies + Generate Table (sidebar) */}
            {canOpenCompanyTable && (
              <div style={styles.section}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <h2
                    style={{
                      ...styles.sectionTitle,
                      marginBottom: 0,
                    }}
                  >
                    {article.companies_mentioned &&
                    article.companies_mentioned.length > 0
                      ? "Companies"
                      : "Company"}
                  </h2>
                  <button
                    type="button"
                    onClick={handleOpenGenerateTable}
                    style={{
                      backgroundColor: "#0f766e",
                      color: "white",
                      fontWeight: 600,
                      padding: "8px 14px",
                      borderRadius: 6,
                      border: "none",
                      cursor: "pointer",
                      fontSize: 13,
                      whiteSpace: "nowrap",
                      minHeight: 40,
                      touchAction: "manipulation",
                    }}
                  >
                    Generate Table
                  </button>
                </div>
                {!showMarketLandscape &&
                  article.companies_mentioned &&
                  article.companies_mentioned.length > 0 && (
                    <div style={{ ...styles.tagContainer, marginTop: 12 }}>
                      {article.companies_mentioned.map((company) => (
                        <Link
                          key={company.id}
                          href={`/company/${company.id}`}
                          style={{
                            ...styles.companyTag,
                            textDecoration: "none",
                            display: "inline-block",
                          }}
                          onMouseEnter={(e) => {
                            (
                              e.currentTarget as HTMLAnchorElement
                            ).style.backgroundColor = "#c8e6c9";
                          }}
                          onMouseLeave={(e) => {
                            (
                              e.currentTarget as HTMLAnchorElement
                            ).style.backgroundColor = "#e8f5e8";
                          }}
                          prefetch={false}
                        >
                          {company.name}
                        </Link>
                      ))}
                    </div>
                  )}
              </div>
            )}

            {/* Sectors Section */}
            {article.sectors && article.sectors.length > 0 && (
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Sectors</h2>
                <div style={styles.tagContainer}>
                  {article.sectors.map((sector) => {
                    const sid = getSectorId(sector);
                    if (!sid) return null;
                    return (
                      <Link
                        key={sid}
                        href={`/sector/${sid}`}
                        style={{
                          ...styles.sectorTag,
                          cursor: "pointer",
                          textDecoration: "none",
                          display: "inline-block",
                        }}
                        onMouseEnter={(e) => {
                          (
                            e.currentTarget as HTMLAnchorElement
                          ).style.backgroundColor = "#e1bee7";
                        }}
                        onMouseLeave={(e) => {
                          (
                            e.currentTarget as HTMLAnchorElement
                          ).style.backgroundColor = "#f3e5f5";
                        }}
                        title="Open sector page"
                        prefetch={false}
                      >
                        {sector.sector_name}
                        {sector.Sector_importance === "Primary" && " (Primary)"}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
            {(() => {
              const ct = (
                article.Content_Type ||
                article.content_type ||
                article.Content?.Content_type ||
                article.Content?.Content_Type ||
                ""
              ).trim();
              const isHotTake = /^(hot\s*take)$/i.test(ct);
              const events = article.Related_Corporate_Event || [];
              if (!isHotTake || !Array.isArray(events) || events.length === 0) {
                return null;
              }
              return (
                <div style={styles.section}>
                  <h2 style={styles.sectionTitle}>Related Corporate Event</h2>
                  <div style={styles.tagContainer}>
                    {events.map((ev, idx) => {
                      const id = ev?.id;
                      const label = (ev?.description || "View event").trim();
                      return typeof id === "number" && id > 0 ? (
                        <Link
                          key={id}
                          href={`/corporate-event/${id}`}
                          style={{
                            ...styles.tag,
                            textDecoration: "none",
                            display: "inline-block",
                          }}
                          prefetch={false}
                        >
                          {label}
                        </Link>
                      ) : (
                        <span key={`ev-${idx}`} style={styles.tag}>
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
      <Footer />
      {showGenerateTableModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.45)",
            zIndex: 80,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              width: "min(96vw, calc(100vw - 32px))",
              maxWidth: 1920,
              maxHeight: "92vh",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 16px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <h3 style={{ margin: 0, fontSize: 18, color: "#0f172a" }}>
                Custom Company Table
              </h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ color: "#9ca3af", fontSize: 12 }}>
                  {tableRows.filter((r) => selectedCompanyIds.has(r.id)).length} companies ·{" "}
                  {ALL_TABLE_COLUMNS.filter((c) => selectedColumnKeys.has(c.key)).length + 1} columns
                </span>
                <button
                  type="button"
                  onClick={handleExportTableCsv}
                  disabled={
                    tableRows.filter((r) => selectedCompanyIds.has(r.id)).length ===
                      0 || selectedColumnKeys.size === 0
                  }
                  style={{
                    border: "1px solid #0f766e",
                    color: "#0f766e",
                    background: "#fff",
                    borderRadius: 8,
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => setShowGenerateTableModal(false)}
                  style={{
                    border: "1px solid #e5e7eb",
                    color: "#111827",
                    background: "#fff",
                    borderRadius: 8,
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Close
                </button>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(260px, 320px) minmax(0, 1fr)",
                minHeight: 0,
                flex: 1,
              }}
            >
              <div
                style={{
                  borderRight: "1px solid #e5e7eb",
                  padding: 14,
                  overflow: "auto",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <h4 style={{ margin: 0, fontSize: 13, textTransform: "uppercase", color: "#9ca3af" }}>
                    Rows
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const allOn = tableRows.every((r) => selectedCompanyIds.has(r.id));
                      setSelectedCompanyIds(allOn ? new Set() : new Set(tableRows.map((r) => r.id)));
                    }}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#0f766e",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    {tableRows.every((r) => selectedCompanyIds.has(r.id))
                      ? "Deselect all"
                      : "Select all"}
                  </button>
                </div>
                {tableRows.length === 0 ? (
                  <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
                    {tableLoading
                      ? "Loading companies..."
                      : "No companies available for this article."}
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {tableRows.map((row) => (
                      <label
                        key={`row-${row.id}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 14,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedCompanyIds.has(row.id)}
                          onChange={(e) => {
                            setSelectedCompanyIds((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(row.id);
                              else next.delete(row.id);
                              return next;
                            });
                          }}
                        />
                        <span>{row.name}</span>
                      </label>
                    ))}
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    margin: "16px 0 8px",
                  }}
                >
                  <h4 style={{ margin: 0, fontSize: 13, textTransform: "uppercase", color: "#9ca3af" }}>
                    Columns
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const allOn = selectedColumnKeys.size === ALL_TABLE_COLUMNS.length;
                      setSelectedColumnKeys(
                        allOn ? new Set() : new Set(ALL_TABLE_COLUMNS.map((c) => c.key))
                      );
                    }}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#0f766e",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    {selectedColumnKeys.size === ALL_TABLE_COLUMNS.length
                      ? "Deselect all"
                      : "Select all"}
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {COL_GROUPS.map((group) => (
                    <div key={group.group}>
                      <p
                        style={{
                          margin: "4px 0",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#d1d5db",
                          textTransform: "uppercase",
                        }}
                      >
                        {group.group}
                      </p>
                      {group.cols.map((column) => (
                        <label
                          key={column.key}
                          style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedColumnKeys.has(column.key)}
                            onChange={(e) => {
                              setSelectedColumnKeys((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(column.key);
                                else next.delete(column.key);
                                return next;
                              });
                            }}
                          />
                          <span>{column.label}</span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  padding: 14,
                  overflow: "auto",
                  WebkitOverflowScrolling: "touch",
                  minWidth: 0,
                }}
              >
                {tableLoading ? (
                  <div style={{ color: "#6b7280", fontSize: 14 }}>
                    Preparing table data...
                  </div>
                ) : (
                  <table
                    style={{
                      width: "max-content",
                      borderCollapse: "collapse",
                      minWidth: Math.max(
                        960,
                        (1 +
                          ALL_TABLE_COLUMNS.filter((c) =>
                            selectedColumnKeys.has(c.key)
                          ).length) *
                          118
                      ),
                    }}
                  >
                    <thead>
                      <tr>
                        <th
                          style={{
                            textAlign: "left",
                            borderBottom: "1px solid #e5e7eb",
                            padding: "8px 10px",
                            backgroundColor: "#f8fafc",
                            fontSize: 13,
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            minWidth: 168,
                          }}
                        >
                          Company Name
                        </th>
                        {ALL_TABLE_COLUMNS.filter((c) =>
                          selectedColumnKeys.has(c.key)
                        ).map((column) => (
                          <th
                            key={`header-${column.key}`}
                            style={{
                              textAlign: "left",
                              borderBottom: "1px solid #e5e7eb",
                              padding: "8px 10px",
                              backgroundColor: "#f8fafc",
                              fontSize: 13,
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                              minWidth: WRAP_COLS.has(column.key) ? 200 : 112,
                            }}
                          >
                            {column.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows
                        .filter((r) => selectedCompanyIds.has(r.id))
                        .map((row) => (
                          <tr key={`table-row-${row.id}`}>
                            <td
                              style={{
                                borderBottom: "1px solid #f1f5f9",
                                padding: "8px 10px",
                                fontSize: 13,
                                color: "#111827",
                                verticalAlign: "top",
                                fontWeight: 600,
                                whiteSpace: "nowrap",
                                minWidth: 168,
                              }}
                            >
                              <Link
                                href={`/company/${row.id}`}
                                prefetch={false}
                                style={{
                                  color: "#1d4ed8",
                                  textDecoration: "none",
                                }}
                              >
                                {row.name}
                              </Link>
                            </td>
                            {ALL_TABLE_COLUMNS.filter((c) =>
                              selectedColumnKeys.has(c.key)
                            ).map((column) => {
                              const value = getTableCellValue(row, column.key);
                              const isWebsiteColumn = column.key === "url";
                              const isLocationColumn = column.key === "loc";
                              return (
                                <td
                                  key={`${row.id}-${column.key}`}
                                  style={{
                                    borderBottom: "1px solid #f1f5f9",
                                    padding: "8px 10px",
                                    fontSize: 13,
                                    color: "#111827",
                                    verticalAlign: "top",
                                    minWidth: WRAP_COLS.has(column.key) ? 200 : 112,
                                    maxWidth: WRAP_COLS.has(column.key) ? 280 : undefined,
                                    whiteSpace: WRAP_COLS.has(column.key)
                                      ? "normal"
                                      : "nowrap",
                                    wordBreak: WRAP_COLS.has(column.key)
                                      ? "break-word"
                                      : "normal",
                                    overflowWrap: WRAP_COLS.has(column.key)
                                      ? "break-word"
                                      : "normal",
                                  }}
                                >
                                  {isWebsiteColumn &&
                                  value &&
                                  value !== "Not available" &&
                                  /^https?:\/\//i.test(value) ? (
                                    <a
                                      href={value}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        color: "#2563eb",
                                        textDecoration: "none",
                                        wordBreak: "break-all",
                                      }}
                                    >
                                      {value}
                                    </a>
                                  ) : (
                                    <span
                                      style={
                                        isLocationColumn
                                          ? {
                                              display: "block",
                                              wordBreak: "break-word",
                                              overflowWrap: "break-word",
                                            }
                                          : undefined
                                      }
                                    >
                                      {value}
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .article-layout { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; }
          @media (max-width: 1024px) { .article-layout { grid-template-columns: 1fr; } }
          /* Summary accordion */
          .article-summary {
            border: 1px solid #e5e7eb;
            background: #f9fafb;
            border-radius: 12px;
            padding: 14px 16px;
            margin-bottom: 24px;
          }
          .summary-header {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            background: transparent;
            border: none;
            padding: 0;
            cursor: pointer;
            text-align: left;
          }
          .summary-title {
            font-size: 18px;
            font-weight: 700;
            color: #111827;
          }
          .summary-chevron {
            font-size: 18px;
            color: #6b7280;
            line-height: 1;
            transition: transform 0.2s ease;
            user-select: none;
          }
          .summary-chevron.open {
            transform: rotate(180deg);
          }
          .summary-list {
            margin: 10px 0 0 0;
            padding-left: 22px;
            color: #374151;
            list-style: disc !important;
            list-style-position: outside;
          }
          .summary-list li {
            display: list-item !important;
            margin: 6px 0;
            line-height: 1.5;
          }
          /* Preserve HTML formatting inside article body */
          .article-body p { margin: 0 0 1rem 0; }
          .article-body ul { list-style: disc; margin: 0 0 1rem 1.25rem; padding-left: 1.25rem; }
          .article-body ol { list-style: decimal; margin: 0 0 1rem 1.25rem; padding-left: 1.25rem; }
          .article-body li { margin-bottom: 0.5rem; }
          .article-body h1, .article-body h2, .article-body h3, .article-body h4, .article-body h5, .article-body h6 { margin: 1.25rem 0 0.75rem; font-weight: 700; }
          .article-body a { color: #2563eb; text-decoration: underline; }
          .article-body blockquote { margin: 1rem 0; padding-left: 1rem; border-left: 3px solid #e5e7eb; color: #374151; }
          .article-body table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
          .article-body th, .article-body td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
          /* Images inside article body */
          .article-body img { max-width: 100%; height: auto; display: block; margin: 1rem auto; border-radius: 8px; }
          .article-body figure { margin: 1rem 0; }
          .article-body figcaption { text-align: center; font-size: 0.875rem; color: #6b7280; margin-top: 0.5rem; }
          .article-inline-image { margin: 1.25rem 0; }
          /* Hover tooltips for metric values using title attribute (align like company page) */
          .article-financial-metrics {
            overflow: visible !important;
          }
          .article-financial-metrics span[title] {
            position: relative;
            cursor: help;
          }
          .article-financial-metrics span[title]:hover::after {
            content: attr(title);
            position: absolute;
            right: 0;
            bottom: 100%;
            transform: translateY(-6px);
            background: rgba(17, 24, 39, 0.95);
            color: #fff;
            font-size: 12px;
            line-height: 1.2;
            padding: 6px 8px;
            border-radius: 4px;
            white-space: nowrap;
            z-index: 20;
            pointer-events: none;
          }
          .article-financial-metrics span[title]:hover::before {
            content: '';
            position: absolute;
            right: 8px;
            bottom: calc(100% - 2px);
            border: 6px solid transparent;
            border-top-color: rgba(17, 24, 39, 0.95);
            z-index: 21;
            pointer-events: none;
          }
        `,
        }}
      />
    </div>
  );
};

export default ArticleDetailPage;
