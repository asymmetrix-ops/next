  "use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { generateArticlePdfBlobUrl } from "@/utils/exportArticlePdf";
import InlineAudioPlayer from "@/components/article/InlineAudioPlayer";
import EmbeddedPdfViewer from "@/components/article/EmbeddedPdfViewer";
import { NewFeatureCallout } from "@/components/ui/new-feature-callout";

// Types for the article detail page
interface ArticleDetail {
  id: number;
  created_at: number;
  Publication_Date: string;
  Headline: string;
  Strapline: string;
  // New Insights & Analysis section: Summary (same format as Body; often HTML)
  Summary?: string;
  summary?: string;
  Content_Type?: string;
  content_type?: string;
  // Some API variants may nest under Content
  Content?: {
    Content_type?: string;
    Content_Type?: string;
    Summary?: string;
    summary?: string;
  };
  Body: string;
  sectors: Array<{
    id: number;
    sector_name: string;
    Sector_importance: string;
  }>;
  companies_mentioned: Array<{ id: number; name: string }>;
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
    // meta can include validated flag, or audio metadata (duration, codec, etc)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    meta: any;
    url?: string;
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
  company_overview?: CompanyOfFocusOverview;
  financial_overview?: CompanyOfFocusFinancialOverview;
}

// Shared styles object
const styles = {
  container: {
    backgroundColor: "#f9fafb",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    width: "100%",
    maxWidth: "100%",
    overflowX: "hidden" as const,
    boxSizing: "border-box" as const,
  },
  maxWidth: {
    padding: "16px",
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: "24px",
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box" as const,
  },
  card: {
    backgroundColor: "white",
    borderRadius: "12px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    padding: "24px 16px",
    marginBottom: "0",
    boxSizing: "border-box" as const,
    width: "100%",
    maxWidth: "100%",
    overflow: "hidden",
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
    minHeight: "44px",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
  },
  infoRow: {
    display: "grid",
    gridTemplateColumns: "minmax(100px, 1fr) minmax(0, 2fr)",
    alignItems: "center",
    columnGap: "8px",
    padding: "8px 0",
    borderBottom: "1px solid #e5e7eb",
    fontSize: "15px",
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box" as const,
  },
  label: {
    fontWeight: 600,
    color: "#4b5563",
    whiteSpace: "nowrap" as const,
    minWidth: 0,
  },
  value: {
    textAlign: "right" as const,
    color: "#111827",
    fontWeight: 500,
    wordWrap: "break-word" as const,
    overflowWrap: "break-word" as const,
    minWidth: 0,
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

// Content types where we want to show Company of Focus overview/financial snapshots on I&A.
// Note: backend data sometimes contains typos (e.g., "Executive Inteview"), so be permissive.
const isCompanyOfFocusSnapshotEligibleContentType = (contentType: string) =>
  /^(company\s*analysis|hot\s*take|deal\s*analysis|executive\s*interv?iew|company\s*brief)$/i.test(
    (contentType || "").trim()
  );

const ArticleDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Summary accordion state
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [companyOfFocus, setCompanyOfFocus] =
    useState<CompanyOfFocusApiItem | null>(null);
  const [companyOfFocusLoading, setCompanyOfFocusLoading] = useState(false);
  // PDF viewer state
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  // Can be a `blob:` URL (generated) or a remote URL (detected attachment)
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [detectedPdfs, setDetectedPdfs] = useState<Array<{ url: string; name: string }>>([]);
  // Guard against rare runtime cases where search params may be unavailable during hydration
  const searchParams = useSearchParams() as unknown as {
    get?: (key: string) => string | null;
  } | null;
  const fromHome = (searchParams?.get?.("from") ?? "") === "home";

  const articleId = String((params as Record<string, unknown>)?.id || "");
  const ENABLE_PDF_EXPORT = true;

  const fetchArticle = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("asymmetrix_auth_token");
      if (!token) {
        setError("Authentication required");
        return;
      }

      const response = await fetch(
        `https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu/content/${articleId}`,
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
  }, [articleId]);

  useEffect(() => {
    if (articleId) {
      fetchArticle();
    }
  }, [articleId, fetchArticle]);

  // Fetch Company_of_Focus details for eligible I&A content types
  useEffect(() => {
    const fetchCompanyOfFocus = async () => {
      if (!article) {
        setCompanyOfFocus(null);
        return;
      }

      const contentType = (
        article.Content_Type ||
        article.content_type ||
        article.Content?.Content_type ||
        article.Content?.Content_Type ||
        ""
      ).trim();

      const isEligibleContentType =
        isCompanyOfFocusSnapshotEligibleContentType(contentType);

      // Only render Company Snapshot / Financial Snapshot when exactly ONE company is tagged
      // in "Company of Focus". Backend can return a JSON string, an array, or a single id/object.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const companyOfFocusValue = (article as any)?.Company_of_Focus as unknown;
      const parsedCompanyOfFocusArray = tryParse<unknown[]>(companyOfFocusValue);
      const hasSingleCompanyOfFocus =
        Array.isArray(parsedCompanyOfFocusArray)
          ? parsedCompanyOfFocusArray.length === 1
          : typeof companyOfFocusValue === "string"
            ? companyOfFocusValue.trim().length > 0
            : companyOfFocusValue != null;

      if (!isEligibleContentType || !hasSingleCompanyOfFocus) {
        setCompanyOfFocus(null);
        return;
      }

      try {
        setCompanyOfFocusLoading(true);

        const token = localStorage.getItem("asymmetrix_auth_token");
        if (!token) {
          return;
        }

        const response = await fetch(
          `https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu/aritcle_company_of_focus?content_id=${encodeURIComponent(
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

        setCompanyOfFocus({
          id: rawItem.id ?? 0,
          name: rawItem.name || "",
          url: rawItem.url || "",
          description: rawItem.description || "",
          logo: rawItem.logo || "",
          linkedin_url: rawItem.linkedin_url || "",
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

  // Decide sector route based on API response shape:
  // - Primary sectors should go to `/sector/{id}`
  // - Secondary sectors should go to `/sub-sector/{id}`
  const getSectorHref = (sector: unknown, sid: number): string => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = sector as any;
    const importanceRaw =
      s?.Sector_importance ?? s?.sector_importance ?? s?.importance ?? "";
    const importance = String(importanceRaw || "").trim().toLowerCase();
    const isPrimary = importance === "primary";
    return isPrimary ? `/sector/${sid}` : `/sub-sector/${sid}`;
  };

  // Sector navigation handled via <Link> elements

  const handleBackClick = () => {
    router.push("/insights-analysis");
  };

  // Open embedded PDF viewer (LinkedIn-style)
  const handleViewPdf = async () => {
    if (!article) return;
    setShowPdfViewer(true);
    setPdfBlobUrl(null);

    // If the API already provided a PDF attachment, use it directly (no generation)
    if (detectedPdfs.length > 0) {
      setPdfLoading(false);
      setPdfBlobUrl(detectedPdfs[0].url);
      return;
    }

    setPdfLoading(true);

    try {
      const url = await generateArticlePdfBlobUrl(article);
      setPdfBlobUrl(url);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setPdfLoading(false);
    }
  };

  // Close PDF viewer and cleanup
  const handleClosePdfViewer = () => {
    setShowPdfViewer(false);
    if (pdfBlobUrl && pdfBlobUrl.startsWith("blob:")) {
      URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
    }
  };

  // Utilities to embed image attachments within the body content
  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const getRawSummary = (a: ArticleDetail | null): string | unknown[] => {
    if (!a) return "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyA = a as any;
    const candidate =
      anyA?.Summary ??
      anyA?.summary ??
      anyA?.Content?.Summary ??
      anyA?.Content?.summary ??
      "";
    // If it's already an array, return it as-is
    if (Array.isArray(candidate)) return candidate;
    // If it's a string, return it
    return typeof candidate === "string" ? candidate : String(candidate ?? "");
  };

  const stripHtmlToText = (html: string): string => {
    const input = String(html || "").trim();
    if (!input) return "";
    // DOMParser is available in this client component; fallback to regex if needed.
    try {
      const doc = new DOMParser().parseFromString(input, "text/html");
      return (doc.body?.textContent || "").replace(/\s+/g, " ").trim();
    } catch {
      return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    }
  };

  // Some articles contain many empty paragraphs (<p>&nbsp;</p>, <p><br/></p>, etc.)
  // which, combined with paragraph margins, creates "oceans of white". Normalize here.
  const normalizeBodyHtmlSpacing = (rawHtml: string): string => {
    const input = String(rawHtml || "");
    if (!input.trim()) return "";
    try {
      const doc = new DOMParser().parseFromString(input, "text/html");

      const isWhitespaceTextNode = (n: ChildNode) =>
        n.nodeType === Node.TEXT_NODE &&
        !String(n.textContent || "")
          .replace(/\u00a0/g, " ")
          .trim();

      // Collapse consecutive <br> (including cases with whitespace text nodes between them)
      for (const el of Array.from(doc.body.querySelectorAll("*"))) {
        let prevWasBr = false;
        for (const node of Array.from(el.childNodes)) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const tag = (node as Element).tagName.toLowerCase();
            if (tag === "br") {
              if (prevWasBr) {
                node.parentNode?.removeChild(node);
                continue;
              }
              prevWasBr = true;
              continue;
            }
          }
          if (isWhitespaceTextNode(node)) {
            // Ignore whitespace between BRs
            continue;
          }
          prevWasBr = false;
        }
      }

      const hasNonTrivialContent = (el: Element): boolean => {
        // Keep paragraphs that contain media/structure even if text is empty
        if (
          el.querySelector(
            "img,figure,table,iframe,embed,object,video,audio,svg,pre,code"
          )
        ) {
          return true;
        }
        // Also keep anchors (can be icon-only links)
        if (el.querySelector("a")) return true;
        const text = String(el.textContent || "")
          .replace(/\u00a0/g, " ")
          .trim();
        if (text) return true;
        // If inner HTML is only BRs / whitespace / &nbsp; treat as empty
        const html = String(el.innerHTML || "")
          .replace(/&nbsp;/gi, " ")
          .replace(/<br\s*\/?>/gi, "")
          .replace(/\s+/g, "")
          .trim();
        return Boolean(html);
      };

      // Remove empty paragraphs that otherwise contribute margin whitespace
      for (const p of Array.from(doc.body.querySelectorAll("p"))) {
        if (!hasNonTrivialContent(p)) p.remove();
      }

      return doc.body.innerHTML;
    } catch {
      return input;
    }
  };

  const normalizeSummaryHtml = (raw: string | unknown[]): string => {
    // Handle array input (already parsed by API)
    if (Array.isArray(raw)) {
      if (raw.length === 0) return "";
      const items = raw
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .map((line) => `<li>${escapeHtml(line)}</li>`)
        .join("");
      return items ? `<ul>${items}</ul>` : "";
    }

    const input = String(raw || "").trim();
    if (!input) return "";

    // Try to parse as JSON array (handles JSON-encoded strings)
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) {
        // If it's an empty array or array with only empty values, return empty
        if (parsed.length === 0) return "";
        const items = parsed
          .map((item) => String(item || "").trim())
          .filter(Boolean)
          .map((line) => `<li>${escapeHtml(line)}</li>`)
          .join("");
        return items ? `<ul>${items}</ul>` : "";
      }
    } catch {
      // Not a JSON array, continue with existing logic
    }

    // If it already looks like a list (or contains list items), keep it as-is.
    if (/<\s*(ul|ol|li)\b/i.test(input)) return input;

    const text = stripHtmlToText(input);
    if (!text) return "";

    // Turn into bullets. Prefer splitting by new lines; fallback to "•" separators.
    const linesFromNewlines = text
      .split(/\r?\n+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const lines =
      linesFromNewlines.length > 1
        ? linesFromNewlines
        : text.includes("•")
          ? text
              .split("•")
              .map((s) => s.trim())
              .filter(Boolean)
          : [text];

    const items = lines
      .map((line) => line.replace(/^[-*•]\s+/, "").trim())
      .filter(Boolean)
      .map((line) => `<li>${escapeHtml(line)}</li>`)
      .join("");

    return `<ul>${items}</ul>`;
  };

  const getFirstSummaryBullet = (summaryHtml: string): string => {
    const input = String(summaryHtml || "").trim();
    if (!input) return "";
    try {
      const doc = new DOMParser().parseFromString(input, "text/html");
      const li = doc.querySelector("li");
      const liText = (li?.textContent || "").trim();
      if (liText) return liText;
      const text = (doc.body?.textContent || "").trim();
      if (!text) return "";
      const parts = text.split(/\r?\n+/).map((s) => s.trim()).filter(Boolean);
      return (parts[0] || "").trim();
    } catch {
      return stripHtmlToText(input);
    }
  };

  // Resolve attachment URL. Some API responses provide only `path` (e.g. `/vault/...`) and omit `url`.
  const resolveDocumentUrl = (doc: {
    url?: string;
    path?: string;
    access?: string;
  }): string => {
    const candidate = String(doc?.url || doc?.path || "").trim();
    if (!candidate) return "";
    if (/^https?:\/\//i.test(candidate)) return candidate;
    if (candidate.startsWith("/")) {
      // Xano file/vault URLs are typically served from the Xano domain root.
      return `https://xdil-abvj-o7rq.e2.xano.io${candidate}`;
    }
    return candidate;
  };

  const formatDuration = (seconds?: number): string => {
    const s = typeof seconds === "number" ? seconds : Number(seconds);
    if (!Number.isFinite(s) || s <= 0) return "";
    const total = Math.round(s);
    const hh = Math.floor(total / 3600);
    const mm = Math.floor((total % 3600) / 60);
    const ss = total % 60;
    if (hh > 0) return `${hh}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
    return `${mm}:${String(ss).padStart(2, "0")}`;
  };

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
    url?: string;
    path?: string;
    name?: string;
  }) => {
    if (!doc) return false;
    if (doc.mime && doc.mime.startsWith("image/")) return true;
    if (doc.type && doc.type.startsWith("image/")) return true;
    const nameOrUrl = `${doc.name || ""} ${doc.url || ""} ${doc.path || ""}`;
    return /(\.(png|jpe?g|gif|webp|svg))($|\?)/i.test(nameOrUrl);
  };

  const isAudioDoc = (doc: {
    mime?: string;
    type?: string;
    url?: string;
    path?: string;
    name?: string;
  }) => {
    if (!doc) return false;
    if (doc.mime && doc.mime.startsWith("audio/")) return true;
    if (doc.type && /^audio$/i.test(doc.type)) return true;
    const nameOrUrl = `${doc.name || ""} ${doc.url || ""} ${doc.path || ""}`;
    return /(\.(mp3|m4a|aac|wav|ogg|oga|opus|flac))($|\?)/i.test(nameOrUrl);
  };

  const isPdfDoc = (doc: {
    mime?: string;
    type?: string;
    url?: string;
    path?: string;
    name?: string;
  }) => {
    if (!doc) return false;
    if (doc.mime && /^application\/pdf$/i.test(doc.mime)) return true;
    if (doc.type && /^application\/pdf$/i.test(doc.type)) return true;
    const nameOrUrl = `${doc.name || ""} ${doc.url || ""} ${doc.path || ""}`;
    return /(\.pdf)($|\?)/i.test(nameOrUrl);
  };

  // Auto-detect ALL PDF attachments (Xano vault URLs, etc.)
  useEffect(() => {
    if (!article) {
      setDetectedPdfs([]);
      return;
    }

    const pdfs: Array<{ url: string; name: string }> = [];

    // 1) Collect all PDF attachments from Related_Documents
    const pdfDocs = (article.Related_Documents || [])
      .filter(Boolean)
      .filter(isPdfDoc);
    
    for (const doc of pdfDocs) {
      const url = resolveDocumentUrl(doc);
      if (url) {
        const name = (doc as { name?: string })?.name || "Document";
        pdfs.push({ url, name });
      }
    }

    // 2) Also detect embedded PDF iframes inside the HTML body:
    //    e.g. <iframe src="https://.../vault/.../file.pdf"></iframe>
    const bodyHtml = String(article.Body || "");
    const iframePdfMatch = bodyHtml.match(
      /<iframe[^>]*\bsrc=["']([^"']+\.pdf(?:\?[^"']*)?)["'][^>]*>/i
    );
    const embedPdfMatch = bodyHtml.match(
      /<(?:embed|object)[^>]*(?:\bsrc|\bdata)=["']([^"']+\.pdf(?:\?[^"']*)?)["'][^>]*>/i
    );
    const bodyPdfUrlRaw = (iframePdfMatch?.[1] || embedPdfMatch?.[1] || "").trim();

    // Add embedded PDF if not already in the list
    if (bodyPdfUrlRaw && !pdfs.some((p) => p.url === bodyPdfUrlRaw)) {
      pdfs.push({ url: bodyPdfUrlRaw, name: "Embedded Document" });
    }

    setDetectedPdfs(pdfs);
  }, [article]);

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

  // Helpers for Related Corporate Event (defensive against API shape changes)
  const normalizeNonEmptyText = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value.trim();
    if (typeof value === "number") {
      return Number.isFinite(value) ? String(value) : "";
    }
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "object") {
      const rec = value as Record<string, unknown>;
      const name = rec?.name;
      if (typeof name === "string") return name.trim();
    }
    const asString = String(value).trim();
    return asString && asString !== "[object Object]" ? asString : "";
  };

  const pickFirstNonEmpty = (
    obj: unknown,
    keys: string[]
  ): { key?: string; value?: unknown } => {
    if (!obj || typeof obj !== "object") return {};
    const rec = obj as Record<string, unknown>;
    for (const k of keys) {
      const v = rec?.[k];
      if (v === null || v === undefined) continue;
      const asText = normalizeNonEmptyText(v);
      // If the value is a non-empty scalar or a named object, accept it
      if (asText) return { key: k, value: v };
      // If it's an array/object, keep looking (handled by list extractor)
      if (Array.isArray(v)) return { key: k, value: v };
      if (typeof v === "object") return { key: k, value: v };
    }
    return {};
  };

  const formatEventNumberLike = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    if (typeof value === "number") {
      return Number.isFinite(value) ? value.toLocaleString("en-US") : "";
    }
    const trimmed = String(value).trim();
    if (!trimmed) return "";
    // If it's a clean numeric string, format with commas; otherwise keep as-is (e.g. "$500m")
    const num = Number(trimmed.replace(/,/g, ""));
    if (!Number.isFinite(num)) return trimmed;
    return num.toLocaleString("en-US");
  };

  const extractPartyNames = (value: unknown): string[] => {
    if (value === null || value === undefined) return [];

    // Support JSON-stringified arrays
    const parsed = tryParse<unknown[]>(value);
    const arr: unknown[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(value)
        ? value
        : [value];

    const names: string[] = [];
    for (const item of arr) {
      if (item === null || item === undefined) continue;
      if (typeof item === "string") {
        const t = item.trim();
        if (t) names.push(t);
        continue;
      }
      if (typeof item === "object") {
        const rec = item as Record<string, unknown>;
        const direct = normalizeNonEmptyText(rec?.name);
        if (direct) {
          names.push(direct);
          continue;
        }
        // Some Xano relation arrays are like { _new_company: { name } }
        const nested = rec?._new_company;
        const nestedName = normalizeNonEmptyText(nested);
        if (nestedName) {
          names.push(nestedName);
          continue;
        }
      }
      const fallback = normalizeNonEmptyText(item);
      if (fallback) names.push(fallback);
    }

    return Array.from(new Set(names.map((n) => n.trim()).filter(Boolean)));
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

  const summaryRaw = getRawSummary(article);
  const summaryHtml = normalizeSummaryHtml(summaryRaw);
  const summaryPreview = getFirstSummaryBullet(summaryHtml);
  const hasSummary = Boolean(summaryHtml && summaryPreview);

  return (
    <div style={{ ...styles.container, maxWidth: "100vw", overflowX: "hidden" }}>
      <Header />
      <div style={{ ...styles.maxWidth, maxWidth: "100%", width: "100%", overflowX: "hidden" }}>
        <button onClick={handleBackClick} style={styles.backButton}>
          ← Back to Insights & Analysis
        </button>

        <div className="article-layout" style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
          {/* Left: Main body (2/3) */}
          <div style={styles.card} className="article-main">
            {/* Article Header */}
            <h1 style={styles.heading}>{article.Headline}</h1>
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

            {/* Summary (Insights & Analysis) */}
            {hasSummary && (
              <div className="article-summary" style={{ marginBottom: 16 }}>
                <NewFeatureCallout
                  featureKey="article-summary"
                  launchedAt="2026-02-02T00:00:00.000Z"
                  titleText="New Feature"
                  className="w-full"
                >
                  <button
                    type="button"
                    className="article-summary-header"
                    aria-expanded={summaryExpanded}
                    onClick={() => setSummaryExpanded((v) => !v)}
                  >
                    <span className="article-summary-title">Summary</span>
                    <span
                      className={`article-summary-chevron ${summaryExpanded ? "expanded" : ""}`}
                      aria-hidden="true"
                    >
                      ▼
                    </span>
                  </button>
                </NewFeatureCallout>

                {!summaryExpanded ? (
                  <div className="article-summary-preview">
                    <ul>
                      <li>{summaryPreview}</li>
                    </ul>
                  </div>
                ) : (
                  <div
                    className="article-summary-body"
                    dangerouslySetInnerHTML={{ __html: summaryHtml }}
                  />
                )}
              </div>
            )}

            {/* Inline Audio (audio-only interview / listen module) */}
            {(() => {
              const audioDocs = (article.Related_Documents || [])
                .filter(Boolean)
                .filter(isAudioDoc);
              if (!audioDocs.length) return null;

              const first = audioDocs[0]!;
              const url = resolveDocumentUrl(first);
              if (!url) return null;

              const name =
                (first as { name?: string })?.name ||
                "Listen to this article now";

              // Subtitle like "3 min listen" if duration metadata exists
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const metaAny = (first as any)?.meta;
              const durationSeconds =
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (metaAny as any)?.duration ??
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (metaAny as any)?.audio?.duration;
              const duration = formatDuration(durationSeconds);
              const subtitle = duration ? `${duration} listen` : undefined;

              return (
                <div style={{ marginBottom: 16 }}>
                  <InlineAudioPlayer src={url} title={name} subtitle={subtitle} />
                </div>
              );
            })()}

            {/* Article Body with embedded images from attachments */}
            {(() => {
              // Remove embedded PDF viewers from the HTML body, so we don't render the browser's PDF UI.
              const bodyWithoutPdfEmbeds = String(article.Body || "")
                .replace(
                  /<iframe[^>]*\bsrc=["'][^"']+\.pdf(?:\?[^"']*)?["'][^>]*>[\s\S]*?<\/iframe>/gi,
                  ""
                )
                .replace(
                  /<(?:embed|object)[^>]*(?:\bsrc|\bdata)=["'][^"']+\.pdf(?:\?[^"']*)?["'][^>]*>[\s\S]*?<\/(?:embed|object)>/gi,
                  ""
                );
              const normalizedBody =
                normalizeBodyHtmlSpacing(bodyWithoutPdfEmbeds);

              const allImageDocs = (article.Related_Documents || [])
                .filter(Boolean)
                .filter(isImageDoc)
                .map((d) => ({
                  url: resolveDocumentUrl(d),
                  name: (d as { name?: string })?.name || "",
                  mime: (d as { mime?: string })?.mime,
                  type: (d as { type?: string })?.type,
                }))
                .filter((d) => Boolean(d.url));
              const { html: withPlaceholders, usedIndices } =
                replaceImagePlaceholders(normalizedBody, allImageDocs);
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

            {/* LinkedIn-style PDF carousels (all PDFs from Related_Documents) */}
            {detectedPdfs.length > 0 && (
              <div style={{ width: "100%", marginTop: 16 }}>
                {detectedPdfs.map((pdf, idx) => (
                  <EmbeddedPdfViewer
                    key={`${pdf.url}-${idx}`}
                    pdfUrl={pdf.url}
                    isLoading={false}
                    onClose={() => {}}
                    articleTitle={pdf.name}
                    variant="inline"
                  />
                ))}
              </div>
            )}

            {/* Inline image grid (if additional images remain useful outside body) */}
            {article.Related_Documents &&
              article.Related_Documents.filter(Boolean).some(isImageDoc) && (
                <div style={styles.section}>
                  <h2 style={styles.sectionTitle}>Images</h2>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(min(220px, 100%), 1fr))",
                      gap: 16,
                      width: "100%",
                      maxWidth: "100%",
                    }}
                  >
                    {(article.Related_Documents || [])
                      .filter(Boolean)
                      .filter(isImageDoc)
                      .map((doc, idx) => (
                        <figure key={`${doc.url}-${idx}`} style={{ margin: 0 }}>
                          <img
                            src={resolveDocumentUrl(doc) || ""}
                            alt={(doc as { name?: string })?.name || ""}
                          />
                          <figcaption>{doc.name || ""}</figcaption>
                        </figure>
                      ))}
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
                className="article-published-section"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <p style={{ ...styles.date, marginBottom: 0 }}>
                  {formatDate(article.Publication_Date)}
                </p>
                {/* View PDF Button (auto-detect attachment; otherwise generate) */}
                {ENABLE_PDF_EXPORT && (
                  <NewFeatureCallout
                    featureKey="article-pdf-export"
                    launchedAt="2026-02-02T00:00:00.000Z"
                  >
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleViewPdf();
                      }}
                      style={{
                        backgroundColor: "#0a66c2",
                        color: "white",
                        fontWeight: 600,
                        padding: "12px 18px",
                        borderRadius: 6,
                        border: "none",
                        cursor: "pointer",
                        fontSize: 14,
                        textAlign: "center",
                        whiteSpace: "nowrap",
                        marginLeft: "auto",
                        minHeight: "44px",
                        minWidth: "120px",
                        touchAction: "manipulation",
                        WebkitTapHighlightColor: "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                      onMouseOver={(e) =>
                        ((e.target as HTMLButtonElement).style.backgroundColor =
                          "#004182")
                      }
                      onMouseOut={(e) =>
                        ((e.target as HTMLButtonElement).style.backgroundColor =
                          "#0a66c2")
                      }
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ flexShrink: 0 }}
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                      {detectedPdfs.length > 0 ? "View PDF" : "Generate PDF"}
                    </button>
                  </NewFeatureCallout>
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
              if (!isCompanyOfFocusSnapshotEligibleContentType(ct)) return null;

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
            {/* Companies Section */}
            {article.companies_mentioned &&
              article.companies_mentioned.length > 0 && (
                <div style={styles.section}>
                  <h2 style={styles.sectionTitle}>Companies</h2>
                  <div style={styles.tagContainer}>
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
                    const href = getSectorHref(sector, sid);
                    return (
                      <Link
                        key={sid}
                        href={href}
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
                        title={
                          href.startsWith("/sub-sector/")
                            ? "Open sub-sector page"
                            : "Open sector page"
                        }
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

            {/* Related Documents (attachments) */}
            {article.Related_Documents &&
              (article.Related_Documents || [])
                .filter(Boolean)
                .filter((d) => !isImageDoc(d) && !isAudioDoc(d)).length > 0 && (
                <div style={styles.section}>
                  <h2 style={styles.sectionTitle}>Related Documents</h2>
                  {(() => {
                    const nonImage = (article.Related_Documents || [])
                      .filter(Boolean)
                      .filter((d) => !isImageDoc(d) && !isAudioDoc(d));

                    return (
                      <>
                        {nonImage.length > 0 && (
                          <div style={styles.tagContainer}>
                            {nonImage.map((doc, index) => {
                              const url = resolveDocumentUrl(doc);
                              const name = (doc as { name?: string })?.name;
                              if (!url) return null;
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
                        )}
                      </>
                    );
                  })()}
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
              const isHotTakeOrDealAnalysis = /^(hot\s*take|deal\s*analysis)$/i.test(
                ct
              );
              const events = article.Related_Corporate_Event || [];
              if (
                !isHotTakeOrDealAnalysis ||
                !Array.isArray(events) ||
                events.length === 0
              ) {
                return null;
              }
              return (
                <div style={styles.section}>
                  <h2 style={styles.sectionTitle}>Related Corporate Event</h2>
                  {events.map((ev, idx) => {
                    const id = ev?.id;
                    const description = (ev?.description || "").trim();
                    const announcementDate = ev?.announcement_date;
                    const closedDate = ev?.closed_date;
                    const displayDate = closedDate || announcementDate;
                    type EventNestedNumbers = {
                      investment_data?: {
                        investment_amount_m?: unknown;
                        investment_amount?: unknown;
                        amount?: unknown;
                      };
                      ev_data?: {
                        enterprise_value_m?: unknown;
                        enterprise_value?: unknown;
                        ev_m?: unknown;
                        ev?: unknown;
                      };
                    };
                    const evNested = ev as unknown as EventNestedNumbers;
                    const targetName =
                      normalizeNonEmptyText(ev?.target?.name) ||
                      normalizeNonEmptyText(
                        (ev as unknown as Record<string, unknown>)?.target_name
                      ) ||
                      normalizeNonEmptyText(
                        (ev as unknown as Record<string, unknown>)?.Target
                      );
                    const dealType = ev?.deal_type;

                    // New deal fields (only render if populated)
                    const { value: investmentAmountRawTop } = pickFirstNonEmpty(ev, [
                      "investment_amount",
                      "Investment_Amount",
                      "investment_amount_m",
                      "amount_invested",
                      "Amount_Invested",
                      "deal_value",
                      "Deal_Value",
                      "equity_investment",
                      "equity_investment_amount",
                    ]);
                    // Also support nested shape: investment_data.investment_amount_m
                    const investmentAmountRaw =
                      investmentAmountRawTop ??
                      evNested.investment_data?.investment_amount_m ??
                      evNested.investment_data?.investment_amount ??
                      evNested.investment_data?.amount;
                    const investmentAmount = formatEventNumberLike(
                      investmentAmountRaw
                    );

                    const { value: enterpriseValueRawTop } = pickFirstNonEmpty(ev, [
                      "enterprise_value",
                      "Enterprise_Value",
                      "enterprise_value_m",
                      "Enterprise_Value_m",
                      "ev",
                      "ev_m",
                    ]);
                    // Also support nested shape: ev_data.enterprise_value_m
                    const enterpriseValueRaw =
                      enterpriseValueRawTop ??
                      evNested.ev_data?.enterprise_value_m ??
                      evNested.ev_data?.enterprise_value ??
                      evNested.ev_data?.ev_m ??
                      evNested.ev_data?.ev;
                    const enterpriseValue = formatEventNumberLike(
                      enterpriseValueRaw
                    );

                    const { value: dealStageRaw } = pickFirstNonEmpty(ev, [
                      "deal_stage",
                      "Deal_Stage",
                      "stage",
                      "Stage",
                      "deal_status",
                      "Deal_Status",
                    ]);
                    const dealStage = normalizeNonEmptyText(dealStageRaw);

                    const buyersInvestors = extractPartyNames(
                      pickFirstNonEmpty(ev, [
                        "buyers",
                        "buyer",
                        "buyers_investors",
                        "buyers_investor",
                        "Buyer_Investor",
                        "investors",
                        "Investor",
                        "acquirers",
                        "acquirer",
                        "Acquirer",
                        "buyers_and_investors",
                      ]).value
                    ).join(", ");

                    const divestor = normalizeNonEmptyText(
                      pickFirstNonEmpty(ev, [
                        "divestor",
                        "divestior",
                        "divestitor",
                        "Divestor",
                        "seller",
                        "Seller",
                        "vendor",
                        "Vendor",
                        "selling_party",
                        "Selling_Party",
                      ]).value
                    );

                    const formatEventDate = (dateStr?: string) => {
                      if (!dateStr) return null;
                      try {
                        const date = new Date(dateStr);
                        return date.toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        });
                      } catch {
                        return dateStr;
                      }
                    };

                    return (
                      <div
                        key={id || `ev-${idx}`}
                        style={{
                          ...styles.card,
                          marginBottom: idx < events.length - 1 ? "16px" : "0",
                          padding: "20px",
                        }}
                      >
                        {description && (
                          <div style={{ marginBottom: "12px" }}>
                            {typeof id === "number" && id > 0 ? (
                              <Link
                                href={`/corporate-event/${id}`}
                                style={{
                                  fontSize: "16px",
                                  fontWeight: "600",
                                  color: "#2563eb",
                                  textDecoration: "none",
                                }}
                                prefetch={false}
                              >
                                {description}
                              </Link>
                            ) : (
                              <span
                                style={{
                                  fontSize: "16px",
                                  fontWeight: "600",
                                  color: "#1a202c",
                                }}
                              >
                                {description}
                              </span>
                            )}
                            {displayDate && (
                              <span
                                style={{
                                  marginLeft: "12px",
                                  fontSize: "14px",
                                  color: "#6b7280",
                                }}
                              >
                                {formatEventDate(displayDate)}
                              </span>
                            )}
                          </div>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                          {targetName && (
                            <div style={styles.infoRow}>
                              <span style={styles.label}>Target</span>
                              <span style={styles.value}>{targetName}</span>
                            </div>
                          )}
                          {buyersInvestors && (
                            <div style={styles.infoRow}>
                              <span style={styles.label}>
                                Buyer(s) / Investor(s)
                              </span>
                              <span style={styles.value}>{buyersInvestors}</span>
                            </div>
                          )}
                          {divestor && (
                            <div style={styles.infoRow}>
                              <span style={styles.label}>Divestor</span>
                              <span style={styles.value}>{divestor}</span>
                            </div>
                          )}
                          {dealType && (
                            <div style={styles.infoRow}>
                              <span style={styles.label}>Deal Type</span>
                              <span style={styles.value}>
                                <span
                                  style={{
                                    backgroundColor: "#e3f2fd",
                                    color: "#1976d2",
                                    padding: "4px 8px",
                                    borderRadius: "4px",
                                    fontSize: "13px",
                                    fontWeight: "500",
                                  }}
                                >
                                  {dealType}
                                </span>
                              </span>
                            </div>
                          )}
                          {dealStage && (
                            <div style={styles.infoRow}>
                              <span style={styles.label}>Deal Stage</span>
                              <span style={styles.value}>{dealStage}</span>
                            </div>
                          )}
                          {investmentAmount && (
                            <div style={styles.infoRow}>
                              <span style={styles.label}>Investment Amount</span>
                              <span style={styles.value}>{investmentAmount}</span>
                            </div>
                          )}
                          {enterpriseValue && (
                            <div style={styles.infoRow}>
                              <span style={styles.label}>Enterprise Value</span>
                              <span style={styles.value}>{enterpriseValue}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      <Footer />

      {/* Embedded PDF Viewer Modal (manual open/generate) */}
      {showPdfViewer && (() => {
        const ct = (
          article.Content_Type ||
          article.content_type ||
          article.Content?.Content_type ||
          article.Content?.Content_Type ||
          ""
        ).trim();
        // Extract company/subject name from headline (e.g., "Company Analysis – FromCounsel" -> "FromCounsel")
        const headlineParts = (article.Headline || "").split(/\s*[–—-]\s*/);
        const subjectName = headlineParts.length > 1 ? headlineParts.slice(1).join(" – ").trim() : (article.Headline || "Document");
        const pdfTitle = ct && subjectName 
          ? `Asymmetrix - ${ct} - ${subjectName}`
          : `Asymmetrix - ${article.Headline || "Document"}`;
        return (
          <EmbeddedPdfViewer
            pdfUrl={pdfBlobUrl}
            isLoading={pdfLoading}
            onClose={handleClosePdfViewer}
            articleTitle={pdfTitle}
            variant="modal"
          />
        );
      })()}

      <style
        dangerouslySetInnerHTML={{
          __html: `
          * { box-sizing: border-box; }
          .article-layout { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; max-width: 100%; width: 100%; overflow-x: hidden; }
          @media (max-width: 1024px) { .article-layout { grid-template-columns: 1fr; gap: 16px; } }
          @media (max-width: 640px) {
            .article-layout { gap: 12px; width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; }
            .article-main, .article-meta { 
              padding: 16px 12px !important; 
              width: 100% !important; 
              max-width: 100% !important; 
              box-sizing: border-box !important;
              overflow: hidden !important;
            }
            .article-main h1 { font-size: 20px !important; line-height: 1.3 !important; word-wrap: break-word !important; overflow-wrap: break-word !important; }
            .article-main p, .article-main .strapline { font-size: 15px !important; word-wrap: break-word !important; overflow-wrap: break-word !important; }
            .article-body { font-size: 15px !important; word-wrap: break-word !important; overflow-wrap: break-word !important; }
            .article-body * { max-width: 100% !important; word-wrap: break-word !important; overflow-wrap: break-word !important; }
            .article-body p { margin-bottom: 0.7rem !important; }
            .article-body img { max-width: 100% !important; height: auto !important; }
            .article-body iframe, .article-body video, .article-body embed { max-width: 100% !important; height: auto !important; }
            .article-financial-metrics { padding: 12px !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box !important; }
            .article-financial-metrics .info-row { grid-template-columns: minmax(90px, 1fr) 1.5fr; font-size: 13px !important; }
            .article-financial-metrics h2 { font-size: 17px !important; margin-bottom: 10px !important; }
            .tag-container { gap: 6px !important; }
            .tag, .companyTag, .sectorTag { font-size: 12px !important; padding: 6px 10px !important; }
            .article-published-section { flex-direction: column !important; align-items: stretch !important; justify-content: flex-start !important; }
            .article-published-section button { width: 100% !important; max-width: 100% !important; margin-left: 0 !important; }
          }
          @media (min-width: 641px) {
            .article-published-section { flex-direction: row !important; align-items: center !important; justify-content: space-between !important; }
            .article-published-section button { width: auto !important; }
          }
          /* Preserve HTML formatting inside article body */
          .article-body p { margin: 0 0 0.8rem 0 !important; }
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
          /* Summary module (collapsible) */
          .article-summary{
            border:1px solid #e5e7eb;
            background:#f9fafb;
            border-radius:12px;
            overflow:hidden;
          }
          .article-summary-header{
            width:100%;
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:12px;
            padding:12px 14px;
            background:transparent;
            border:0;
            cursor:pointer;
            text-align:left;
          }
          .article-summary-title{
            font-size:16px;
            font-weight:700;
            color:#111827;
          }
          .article-summary-chevron{
            width:28px;
            height:28px;
            display:inline-flex;
            align-items:center;
            justify-content:center;
            border-radius:9999px;
            border:1px solid #e5e7eb;
            background:#fff;
            color:#111827;
            font-size:12px;
            transition: transform 150ms ease;
            flex-shrink:0;
          }
          .article-summary-chevron.expanded{ transform: rotate(180deg); }
          .article-summary-preview,
          .article-summary-body{
            padding:0 14px 12px;
            color:#374151;
            font-size:15px;
            line-height:1.6;
            text-align:left;
          }
          .article-summary-preview *,
          .article-summary-body *{
            text-align:left;
          }
          .article-summary-preview ul,
          .article-summary-body ul{
            list-style: disc;
            margin: 0.25rem 0 0 1.25rem;
            padding-left: 1.25rem;
          }
          .article-summary-body ol{
            list-style: decimal;
            margin: 0.25rem 0 0 1.25rem;
            padding-left: 1.25rem;
          }
          .article-summary-preview li,
          .article-summary-body li{ margin-bottom: 0.5rem; }
          .article-summary-body p{ margin: 0 0 0.75rem 0; }
          /* Audio attachments (WhatsApp-style card) */
          /* Inline audio player (news-style listen module) */
          .inline-audio-player{
            background:#fff;
            border:1px solid #e5e7eb;
            border-radius:12px;
            padding:14px 14px;
            box-shadow:0 2px 4px rgba(0,0,0,.04);
          }
          .inline-audio-header{ display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:10px; }
          .inline-audio-title{
            font-size:16px; font-weight:600; color:#111827;
            white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
          }
          .inline-audio-subtitle{
            margin-left:10px;
            font-size:13px; font-weight:500; color:#6b7280;
          }
          .inline-audio-controls{ display:flex; align-items:center; gap:10px; }
          .inline-audio-rate{
            border:1px solid #e5e7eb;
            background:#fff;
            border-radius:9999px;
            padding:6px 10px;
            font-size:13px;
            color:#111827;
          }
          /* react-h5-audio-player overrides (keep compact + match module style) */
          .inline-audio-player .rhap_container{
            box-shadow:none;
            background:transparent;
            padding:0;
            border:0;
          }
          .inline-audio-player .rhap_main{ gap:10px; }
          .inline-audio-player .rhap_progress-section{ align-items:center; }
          .inline-audio-player .rhap_time{
            font-size:12px;
            color:#6b7280;
            min-width:42px;
            text-align:center;
          }
          .inline-audio-player .rhap_progress-bar{
            height:4px;
            border-radius:9999px;
            background:#e5e7eb;
          }
          .inline-audio-player .rhap_progress-filled{
            background:#111827;
            border-radius:9999px;
          }
          .inline-audio-player .rhap_progress-indicator{
            width:12px;
            height:12px;
            background:#111827;
            box-shadow:0 0 0 2px #fff, 0 0 0 3px rgba(17,24,39,.25);
            top:50%;
            transform:translateY(-50%);
          }
          .inline-audio-player .rhap_main-controls-button{
            width:44px;
            height:44px;
            border-radius:9999px;
            border:2px solid #111827;
            background:#fff;
            display:flex;
            align-items:center;
            justify-content:center;
          }
          .inline-audio-player .rhap_main-controls-button svg{
            width:18px;
            height:18px;
            color:#111827;
          }
          .inline-audio-player .rhap_download-progress{ background:transparent; }
          .inline-audio-player .rhap_controls-section{ margin-top:0; }
          .inline-audio-player .rhap_additional-controls{ display:none; }
          .inline-audio-player .rhap_volume-controls{ display:none; }
          /* Utility for screen-reader-only text */
          .sr-only{
            position:absolute;
            width:1px; height:1px;
            padding:0; margin:-1px;
            overflow:hidden; clip:rect(0,0,0,0);
            white-space:nowrap; border:0;
          }
          @media (max-width: 640px) {
            .inline-audio-player{ padding:12px; }
            .inline-audio-title{ font-size:14px; }
            .inline-audio-subtitle{ display:none; }
            .inline-audio-header{ margin-bottom:8px; }
          }
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
