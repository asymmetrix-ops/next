"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FollowButton } from "@/components/FollowButton";
import { CorporateEventsProfilePanel } from "@/components/corporate-events/CorporateEventsProfilePanel";
import { SubsidiariesProfilePanel } from "@/components/subsidiaries/SubsidiariesProfilePanel";
import { ManagementProfilePanel } from "@/components/company/ManagementProfilePanel";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ContentArticle } from "@/types/insightsAnalysis";
// Investor classification rule constants (module scope; stable across renders)
const FINANCIAL_SERVICES_FOCUS_ID = 74;
const FINANCIAL_METRICS_EXPORT_SOURCE = "contribution_email";

type CompanyPdfExportType = "profile" | "financial_metrics";
type ProductMixTab = "product_type" | "data_collection";

// Types for API integration
interface CompanyLocation {
  City: string;
  State__Province__County: string;
  Country: string;
}

interface CompanySector {
  Sector_importance: string;
  sector_name: string;
  sector_id: number;
}

interface CompanyRevenue {
  revenues_m: string;
  rev_source: string;
  years_id: number;
  revenues_currency?: string; // sometimes a 3-letter code, sometimes missing
  _currency?: { Currency?: string }; // new shape
  currency?: { Currency?: string }; // alt shape
  _years?: {
    Year?: number | string;
  };
}

interface CompanyEBITDA {
  EBITDA_m: string;
}

interface CompanyEV {
  ev_value: string;
  _years?: {
    Year?: number | string;
  };
  _currency?: { Currency?: string };
  currency?: { Currency?: string };
}

interface LastInvestment {
  display?: string | null;
  date?: string | null;
  days_since?: number | string | null;
}

// Financial metrics payload from Xano `company_financial_metrics`
interface CompanyFinancialMetrics {
  id: number;
  new_company_id: number;
  Financial_Year?: number | null;
  FY_YE_Month_Dec_default?: string | null;
  // Xano convenience fields (preferred for display)
  financial_year_text?: string | null; // e.g. "2025"
  period_display?: string | null; // e.g. "December-2025"
  Rev_Currency?: unknown;
  Revenue_m?: number | null;
  Revenue_source_label?: string | null;
  Rev_source?: number | string | null;
  ARR_pc?: number | null;
  ARR_currency?: unknown;
  ARR_m?: number | null;
  ARR_source_label?: string | null;
  ARR_source?: number | string | null;
  Churn_pc?: number | null;
  Churn_source_label?: string | null;
  Churn_Source?: number | string | null;
  GRR_pc?: number | null;
  GRR_source_label?: string | null;
  GRR_source?: number | string | null;
  Upsell_pc?: number | null;
  Upsell_source_label?: string | null;
  Upsell_source?: number | string | null;
  Cross_sell_pc?: number | null;
  Cross_sell_source_label?: string | null;
  Cross_sell_source?: number | string | null;
  Price_increase_pc?: number | null;
  Price_increase_source_label?: string | null;
  Price_increase_source?: number | string | null;
  Rev_expansion_pc?: number | null;
  Rev_expansion_source_label?: string | null;
  Rev_expansion_source?: number | string | null;
  NRR?: number | string | null;
  NRR_source_label?: string | null;
  NRR_source?: number | string | null;
  New_client_growth_pc?: number | null;
  New_client_growth_source_label?: string | null;
  New_Client_Growth_Source?: number | string | null;
  Rev_Growth_PC?: number | null;
  Rev_growth_source_label?: string | null; // API label uses lower-case 'growth'
  Rev_Growth_source?: number | string | null;
  EBITDA_margin?: number | null;
  EBITDA_margin_source_label?: string | null;
  EBITDA_margin_source?: number | string | null;
  EBITDA_currency?: unknown;
  EBITDA_m?: number | null;
  EBITDA_source_label?: string | null;
  EBITDA_source?: number | string | null;
  Rule_of_40?: number | string | null;
  Rule_of_40_source_label?: string | null;
  Rule_of_40_source?: number | string | null;
  Revenue_multiple?: number | null;
  Revenue_multiple_source_label?: string | null;
  Rev_x_source?: number | string | null;
  EV_currency?: unknown;
  EV?: number | null;
  EV_source_label?: string | null;
  EV_source?: number | string | null;
  EBIT_currency?: unknown;
  EBIT_m?: number | null;
  EBIT_source_label?: string | null;
  EBIT_source?: number | string | null;
  No_of_Clients?: number | null;
  No_of_Clients_source_label?: string | null;
  No_Clients_source?: number | string | null;
  Rev_per_client?: number | null;
  Rev_per_client_source_label?: string | null;
  Rev_per_client_source?: number | string | null;
  No_Employees?: number | null;
  No_Employees_source_label?: string | null;
  No_Employees_source?: number | string | null;
  Revenue_per_employee?: number | null;
  Revenue_per_employee_source_label?: string | null;
  Rev_per_employee_source?: number | string | null;
  Data_entry_notes?: string | null;
}

// Income statement types (subset for rendering)
interface IncomeStatementEntry {
  id: number;
  period_display_end_date: string;
  period_end_date?: string;
  revenue?: number | null;
  ebit?: number | null;
  ebitda?: number | null;
  // some rows include currency fields for costs; use as proxy for currency
  cost_of_goods_sold_currency?: string;
}

// Parent company types (subset)
interface ParentCompanyItem {
  id: number;
  name: string;
  primary_business_focus_id?: unknown;
  sectors_id?: unknown;
}

interface HaveParentCompany {
  have_parent_companies?: boolean;
  Parant_companies?: ParentCompanyItem[];
}

interface CompanyLinkedInData {
  linkedin_logo: string;
}

interface CompanyRootLinkedInData {
  LinkedIn_URL?: string;
  LinkedIn_Employee?: number;
  LinkedIn_Emp__Date?: string | null;
  linkedin_logo?: string;
}

interface CompanyOwnershipType {
  ownership: string;
}

interface LifecycleStage {
  Lifecycle_Stage: string;
}

interface EmployeeCount {
  date: string;
  employees_count: number;
}

interface CompanyProductTypeItem {
  Product_Type?: string;
  pc_of_revenues?: number | string | null;
}

interface CompanyDataCollectionMethodItem {
  Data_Collection_Method?: string;
  Predominance?: string | null;
}

interface CompanyRevenueModelItem {
  Revenue_Model_?: string;
  Predominance?: string | null;
}

interface CompanyInvestor {
  id: number;
  name: string;
  url?: string;
  _is_that_investor?: boolean;
  _is_that_data_analytic_company?: boolean;
}

// New API response type for company_investors endpoint
interface CompanyInvestorFromAPI {
  investor_id: number;
  investor_name: string;
  counterparty_status: string;
  event_id: number;
  deal_type: string;
  announcement_date: string;
}

// Competitors API response
interface CompanyCompetitorItem {
  id: number;
  name: string;
  linkedin_logo?: string;
}

interface CompanyCompetitorsResponse {
  peers: CompanyCompetitorItem[];
  potential_acquirers: CompanyCompetitorItem[];
  acquisition_targets: CompanyCompetitorItem[];
}

// Investors list embedded on the company payload (Company._companies_investors)
interface CompanyInvestorFromCompanies {
  id: number;
  original_new_company_id: number;
  company_name: string;
}

interface CompanyManagement {
  id: number;
  name: string;
  title: string;
  linkedin_url?: string;
  individual_id?: number;
}

interface CompanySubsidiary {
  id: number;
  name: string;
  description: string;
  sectors: string;
  linkedin_members?: number;
  country?: string;
  logo?: string;
}

interface LegacyCorporateEvent {
  id?: number;
  description: string;
  announcement_date: string;
  deal_type: string;
  counterparty_status?: {
    counterparty_syayus?: {
      counterparty_status: string;
    };
  };
  ev_data?: {
    enterprise_value_m?: number | string;
    ev_band?: string;
    _currency?: { Currency?: string };
    currency?: { Currency?: string };
  };
  "0"?: Array<{
    _new_company?: {
      id?: number;
      name: string;
      _is_that_investor?: boolean;
    };
  }>;
  "1"?: Array<{
    _new_company?: {
      name: string;
    };
  }>;
}

// New corporate events event shape (company page)
interface NewCounterpartyMinimal {
  id: number;
  name: string;
  page_type?: string;
  counterparty_announcement_url?: string | null;
}

interface NewTargetCompanyMinimal {
  id?: number;
  name?: string;
  page_type?: string;
}

interface NewAdvisorMinimal {
  id: number;
  advisor_company?: { id: number; name: string };
  announcement_url?: string;
  new_company_advised?: number;
  counterparty_advised?: number;
  _new_company?: { id: number; name: string };
}

interface NewTargetEntity {
  id: number;
  name: string;
  page_type?: string;
  counterparty_announcement_url?: string;
}

interface NewOtherCounterparty {
  id: number;
  name: string;
  page_type?: string;
  counterparty_id?: number;
  is_data_analytics?: boolean;
  counterparty_status?: string;
  counterparty_type_id?: number;
  counterparty_announcement_url?: string | null;
}

interface NewCorporateEvent {
  id?: number;
  target_company?: NewTargetCompanyMinimal;
  // New API fields for targets array
  targets?: NewTargetEntity[];
  target_label?: string;
  buyer_investor_label?: string | null;
  advisors?: NewAdvisorMinimal[];
  advisors_names?: string[];
  // New Xano payload fields for counterparties
  // Older shape used `buyers_investors` and `other_counterparties`;
  // newer one splits them into `buyers`, `sellers` and `investors`.
  buyers_investors?: NewCounterpartyMinimal[]; // legacy: mix of buyers & investors
  buyers?: NewCounterpartyMinimal[]; // new: buyers / acquirers
  sellers?: NewCounterpartyMinimal[]; // new: sellers/divestors
  investors?: NewCounterpartyMinimal[]; // new: investors only
  deal_type?: string;
  ev_display?: string | null;
  description?: string;
  announcement_date?: string;
  investment_display?: string;
  this_company_status?: string;
  other_counterparties?: NewOtherCounterparty[];
}

type CompanyCorporateEvent = LegacyCorporateEvent | NewCorporateEvent;


interface Company {
  id: number;
  name: string;
  description: string;
  year_founded: number;
  _years?: {
    Year?: number | string;
  };
  url: string;
  _linkedin_data_of_new_company: CompanyLinkedInData;
  linkedin_data?: CompanyRootLinkedInData;
  _locations: CompanyLocation;
  _ownership_type: CompanyOwnershipType;
  sectors_id: CompanySector[];
  revenues: CompanyRevenue;
  EBITDA: CompanyEBITDA;
  ev_data: CompanyEV;
  _companies_employees_count_monthly: EmployeeCount[];
  Lifecycle_stage: LifecycleStage;
  // Optional list of former names from API
  Former_name?: string[];
  investors?: CompanyInvestor[];
  investors_new_company?: CompanyInvestor[];
  _companies_investors?: CompanyInvestorFromCompanies[];
  management_current?: CompanyManagement[];
  management_past?: CompanyManagement[];
  subsidiaries?: CompanySubsidiary[];
  have_subsidiaries_companies?: {
    have_subsidiaries_companies: boolean;
    Subsidiaries_companies: Array<{
      id: number;
      name: string;
      description: string;
      sectors_id: Array<{
        sector_name: string;
        Sector_importance: string;
      }>;
      _locations: CompanyLocation;
      _linkedin_data_of_new_company: {
        linkedin_employee: number;
        linkedin_logo: string;
      };
    }>;
  };
  Managmant_Roles_current?: Array<{
    id: number;
    Individual_text: string;
    individuals_id: number;
    Status: string;
    job_titles_id: Array<{
      id: number;
      job_title: string;
    }>;
  }>;
  Managmant_Roles_past?: Array<{
    id: number;
    Individual_text: string;
    individuals_id: number;
    Status: string;
    job_titles_id: Array<{
      id: number;
      job_title: string;
    }>;
  }>;
  // Optional market fields if/when API provides them
  ticker?: string;
  exchange?: string;
  Product_Type?: CompanyProductTypeItem[] | string;
  Data_Collection_Method?: CompanyDataCollectionMethodItem[] | string;
  Revenue_Model_?: CompanyRevenueModelItem[] | string;
  have_parent_company?: HaveParentCompany;
  last_investment?: LastInvestment | null;
  /** Optional: total private funding / raised-to-date when API provides it */
  total_amount_raised?: string | number | null;
  /** Optional: employees YoY % when API provides it (e.g. 6.4 for +6.4%) */
  employees_yoy_pct?: number | null;
  /** Optional: end-user / buyer segments for Product & users card */
  product_users?: string[] | string | null;
  income_statement?: Array<{
    income_statements?: IncomeStatementEntry[] | string;
  }>;
  // Optional new sectors data container from API
  new_sectors_data?: Array<{
    sectors_payload?: string | unknown;
  }>;
}

interface CompanyResponse {
  Company: Company;
  have_parent_company?: HaveParentCompany;
  Product_Type?: CompanyProductTypeItem[] | string;
  Data_Collection_Method?: CompanyDataCollectionMethodItem[] | string;
  Revenue_Model_?: CompanyRevenueModelItem[] | string;
  last_investment?: LastInvestment | null;
  income_statement?: Array<{
    income_statements?: IncomeStatementEntry[] | string;
  }>;
  // Root-level new sectors data (alternate placement used by backend)
  new_sectors_data?: Array<{
    sectors_payload?: string | unknown;
  }>;
  Managmant_Roles_current?: Array<{
    id: number;
    Individual_text: string;
    individuals_id: number;
    Status: string;
    job_titles_id: Array<{
      id: number;
      job_title: string;
    }>;
  }>;
  Managmant_Roles_past?: Array<{
    id: number;
    Individual_text: string;
    individuals_id: number;
    Status: string;
    job_titles_id: Array<{
      id: number;
      job_title: string;
    }>;
  }>;
  have_subsidiaries_companies?: {
    have_subsidiaries_companies: boolean;
    Subsidiaries_companies: Array<{
      id: number;
      name: string;
      description: string;
      sectors_id: Array<{
        sector_name: string;
        Sector_importance: string;
      }>;
      _locations: CompanyLocation;
      _linkedin_data_of_new_company: {
        linkedin_employee: number;
        linkedin_logo: string;
      };
    }>;
  };
}

// Utility functions
// isNotAvailable no longer used in Financial Metrics rendering

// Normalize displays like "40 EUR" -> "EUR 40" and allow fallback currency
// normalizeCurrencyDisplay removed; we now show currency once in heading
const formatNumber = (num: number | undefined): string => {
  if (num === undefined || num === null) return "0";
  return num.toLocaleString();
};

const formatDate = (dateString: string): string => {
  const [year, month] = dateString.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
};

// Plain number formatter (no currency, preserve decimals as given)
const formatPlainNumber = (value?: number | string | null): string => {
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

// Numeric parsing helper for numbers that may arrive as strings
const getNumeric = (value?: number | string | null): number | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "number")
    return Number.isFinite(value) ? value : undefined;
  const trimmed = String(value).trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed.replace(/,/g, ""));
  return Number.isFinite(n) ? n : undefined;
};

/** Max sector pills before "+N" overflow (matches V3 template) */
const OVERVIEW_TAG_CAP = 3;

const INSIGHTS_PREVIEW_COUNT = 2;

/** Design-demo total for empty insights card (matches V3 mock pagination) */
const INSIGHTS_EMPTY_STATE_DEMO_TOTAL = 17;

const EM_DASH = "\u2014";

/** En dash for numeric ranges, e.g. 1–2 */
const RANGE_DASH = "\u2013";

/** V3 template-style fallbacks for Product type / Data collection mix card */
const PRODUCT_MIX_DEMO_ROWS: { label: string; pct: number }[] = [
  { label: "Data", pct: 50 },
  { label: "Software", pct: 20 },
  { label: "Research", pct: 20 },
  { label: "News / Other Media", pct: 10 },
];

const DATA_COLLECTION_MIX_DEMO: {
  label: string;
  pct: number;
  displayRight: string;
}[] = [
  {
    label: "Licensed third-party data",
    pct: 45,
    displayRight: "45%",
  },
  {
    label: "Proprietary collection",
    pct: 35,
    displayRight: "35%",
  },
  {
    label: "User-generated / community",
    pct: 20,
    displayRight: "20%",
  },
];

const PRODUCT_USERS_DEMO: string[] = [
  "Accounting & Tax Firms",
  "Corporate Tax Departments",
  "Tax Attorneys",
  "Financial Advisors & Wealth Managers",
];

function formatInsightBadgeLabel(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  return s
    .split(/\s+/)
    .map(
      (w) =>
        w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    )
    .join(" ");
}

function formatWebsiteDisplayLabel(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const withProto = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(withProto);
    const host = url.hostname.replace(/^www\./i, "");
    const path =
      url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
    return path ? `${host}${path}` : host;
  } catch {
    return trimmed
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .replace(/\/$/, "");
  }
}

/** Picks a human-readable "total raised" string from known / future API keys */
function pickTotalAmountRaisedDisplay(company: Company): string | null {
  const c = company as unknown as Record<string, unknown>;
  const keys = [
    "total_amount_raised",
    "Total_amount_raised",
    "total_funding_raised",
    "Total_funding_raised",
    "funding_total",
    "Funding_total",
    "total_raised",
    "Total_raised",
  ];
  for (const k of keys) {
    const v = c[k];
    if (v === null || v === undefined) continue;
    if (typeof v === "number" && Number.isFinite(v)) {
      if (v >= 1_000_000_000)
        return `US$ ${(v / 1_000_000_000).toFixed(1)}bn`;
      if (v >= 1_000_000) return `US$ ${(v / 1_000_000).toFixed(0)}m`;
      if (v >= 1_000) return `US$ ${(v / 1_000).toFixed(0)}k`;
      return `US$ ${v.toLocaleString("en-US")}`;
    }
    const s = String(v).trim();
    if (s.length > 0) return s;
  }
  return null;
}

/** Approximate YoY from monthly employee counts when API does not send YoY */
function computeEmployeeYoYFromMonthly(
  data: EmployeeCount[]
): string | null {
  if (!Array.isArray(data) || data.length < 2) return null;
  const sorted = [...data].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const latest = sorted[sorted.length - 1];
  const latestCount = latest?.employees_count;
  if (typeof latestCount !== "number" || latestCount <= 0) return null;
  const latestT = new Date(latest.date).getTime();
  const yearMs = 365 * 86_400_000;
  let best: EmployeeCount | null = null;
  let bestDiff = Infinity;
  for (let i = sorted.length - 2; i >= 0; i--) {
    const row = sorted[i];
    const t = new Date(row.date).getTime();
    const diff = latestT - t;
    if (diff >= yearMs * 0.85 && diff <= yearMs * 1.15) {
      const d = Math.abs(diff - yearMs);
      if (d < bestDiff) {
        bestDiff = d;
        best = row;
      }
    }
  }
  if (
    !best ||
    typeof best.employees_count !== "number" ||
    best.employees_count <= 0
  ) {
    return null;
  }
  const prev = best.employees_count;
  const pct = ((latestCount - prev) / prev) * 100;
  const rounded = Math.round(pct * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}% YoY`;
}

const parseStructuredArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value.replace(/\\u0022/g, '"')) as unknown;
    if (Array.isArray(parsed)) return parsed as T[];
    if (typeof parsed === "string") {
      const reparsed = JSON.parse(parsed.replace(/\\u0022/g, '"')) as unknown;
      return Array.isArray(reparsed) ? (reparsed as T[]) : [];
    }
  } catch {
    return [];
  }

  return [];
};

/** Parse "12%" / "12" / numeric cell into 0–100 for mix progress bars */
function parsePercentToken(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const m = trimmed.match(/(\d+(?:\.\d+)?)\s*%/);
  if (m) {
    const n = parseFloat(m[1]);
    return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : null;
  }
  const n = getNumeric(trimmed.replace(/%/g, ""));
  if (n !== undefined && n <= 100 && n >= 0) return n;
  return null;
}

function predominanceBarWidth(
  text: string,
  index: number,
  total: number
): number {
  const p = parsePercentToken(text);
  if (p !== null) return p;
  const t = text.toLowerCase();
  if (/\bonly\b|exclusive|primary|sole/.test(t)) return 92;
  if (/high|predominant|mostly|dominant/.test(t)) return 72;
  if (/medium|mixed|moderate/.test(t)) return 48;
  if (/low|minor|small/.test(t)) return 28;
  return Math.max(
    18,
    Math.min(88, Math.round(100 / Math.max(1, total)) + index * 8)
  );
}

// Map Xano source codes to human-readable labels (best-known mapping)
const sourceLabel = (code?: number | string | null): string | undefined => {
  if (code == null) return undefined;

  // Handle descriptive string values directly (robust to various spellings)
  if (typeof code === "string" && Number.isNaN(Number(code))) {
    const normalized = code.trim().toLowerCase();
    if (normalized === "public") return "Public";
    if (normalized === "estimate") return "Estimate";
    if (normalized === "proprietary") return "Proprietary";
    if (
      normalized === "company provided" ||
      normalized === "company_provided" ||
      normalized === "company-provided"
    )
      return "Proprietary";
    if (
      normalized === "trusted third party" ||
      normalized === "trusted_third_party" ||
      normalized === "trusted-third-party" ||
      normalized === "third party" ||
      normalized === "third_party"
    )
      return "Proprietary";
    if (
      normalized === "human/model" ||
      normalized === "human model" ||
      normalized === "human" ||
      normalized === "analyst" ||
      normalized === "analyst-adjusted" ||
      normalized === "analyst adjusted"
    )
      return "Estimate";
    if (normalized === "model") return "Estimate";
    return undefined;
  }

  // Fallback to numeric code mapping (covers historical IDs)
  const n = typeof code === "number" ? code : parseInt(String(code), 10);
  switch (n) {
    case 1:
      return "Public";
    case 2:
    case 3:
    case 5:
      return "Proprietary";
    case 4:
    case 6:
      return "Estimate";
    default:
      return undefined;
  }
};

// Removed currency formatting helper; we show currency once in heading

// Format helpers for additional financial metrics
const formatPercent = (value?: number | string | null): string => {
  const n = getNumeric(value);
  if (n === undefined) return "Not available";
  return `${Math.round(n)}%`;
};

const formatMultiple = (value?: number | string | null): string => {
  const n = getNumeric(value);
  if (n === undefined) return "Not available";
  const rounded = Math.round(n * 10) / 10;
  return `${rounded.toLocaleString()}x`;
};

// Prefer explicit API-provided labels, fallback to legacy numeric/string codes
const effectiveSourceLabel = (
  label?: string | null,
  code?: number | string | null
): string | undefined => {
  if (typeof label === "string" && label.trim().length > 0) {
    return sourceLabel(label);
  }
  return sourceLabel(code);
};

// Convert source label/code into a display string
const getSourceText = (
  label?: string | null,
  code?: number | string | null
): string => {
  const resolved = effectiveSourceLabel(label, code);
  return resolved ?? "Not available";
};

// Removed short currency helper; we now display plain numbers

// Normalize various currency representations to a displayable 3-letter code
const normalizeCurrency = (candidate: unknown): string | undefined => {
  if (!candidate) return undefined;
  if (typeof candidate === "string") {
    const trimmed = candidate.trim();
    // If backend sent an id like "7", ignore it
    if (/^\d+$/.test(trimmed)) return undefined;
    return trimmed;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj = candidate as any;
  if (obj && typeof obj === "object" && typeof obj.Currency === "string") {
    return obj.Currency;
  }
  return undefined;
};

// Extracts a 4-digit year from a candidate value if valid
const extractValidYear = (candidate: unknown): number | null => {
  const currentYear = new Date().getFullYear();
  if (typeof candidate === "number") {
    const yearNum = candidate;
    return yearNum >= 1800 && yearNum <= currentYear ? yearNum : null;
  }
  if (typeof candidate === "string") {
    const trimmed = candidate.trim();
    // Try parse as integer
    const num = parseInt(trimmed, 10);
    if (!Number.isNaN(num) && num >= 1800 && num <= currentYear) return num;
    // Fallback: search for first 4-digit sequence
    const match = trimmed.match(/\b(18\d{2}|19\d{2}|20\d{2})\b/);
    if (match) {
      const mNum = parseInt(match[0], 10);
      if (mNum >= 1800 && mNum <= currentYear) return mNum;
    }
  }
  return null;
};

// Format the financial metrics period for display as "Dec-2025", "Jul-2024", etc.
const formatFinancialMetricsPeriod = (
  metrics: CompanyFinancialMetrics | null
): string | null => {
  if (!metrics) return null;

  const monthMap: Record<string, string> = {
    january: "Jan",
    february: "Feb",
    march: "Mar",
    april: "Apr",
    may: "May",
    june: "Jun",
    july: "Jul",
    august: "Aug",
    september: "Sep",
    october: "Oct",
    november: "Nov",
    december: "Dec",
  };

  const clean = (v: unknown): string => String(v ?? "").trim();
  const period = clean(metrics.period_display);

  // 1) Prefer API-provided period_display (e.g. "December-2025", sometimes "Dec-2025")
  if (period) {
    const parts = period.split(/[-/]/).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const monthRaw = parts[0];
      const yearRaw = parts.find((p) => extractValidYear(p) !== null) || parts[1];
      const year = extractValidYear(yearRaw);
      if (year !== null) {
        const key = monthRaw.toLowerCase();
        const monthShort =
          monthMap[key] ||
          // already short like "Dec"
          (monthRaw.length >= 3 ? monthRaw.slice(0, 3) : monthRaw);
        return `${monthShort}-${year}`;
      }
    }
  }

  // 2) Fallback to (FY month + financial_year_text)
  const monthRaw = clean(metrics.FY_YE_Month_Dec_default);
  const year = extractValidYear(metrics.financial_year_text ?? metrics.Financial_Year);
  if (monthRaw && year !== null) {
    const key = monthRaw.toLowerCase();
    const monthShort =
      monthMap[key] || (monthRaw.length >= 3 ? monthRaw.slice(0, 3) : monthRaw);
    return `${monthShort}-${year}`;
  }

  return null;
};

const formatLastInvestmentDisplay = (
  lastInvestment?: LastInvestment | null
): string => {
  const display = String(lastInvestment?.display ?? "").trim();
  if (display) return display;

  let daysSince = getNumeric(lastInvestment?.days_since);
  if (daysSince === undefined && lastInvestment?.date) {
    const investmentDate = new Date(lastInvestment.date);
    if (!Number.isNaN(investmentDate.getTime())) {
      daysSince = Math.max(
        0,
        Math.floor((Date.now() - investmentDate.getTime()) / 86_400_000)
      );
    }
  }

  if (daysSince === undefined) return "—";
  if (daysSince < 365) {
    if (daysSince < 30) return "This month";
    const months = Math.max(1, Math.floor(daysSince / 30));
    return `${months} ${months === 1 ? "month" : "months"}`;
  }

  const years = Math.floor(daysSince / 365);
  return `${years} ${years === 1 ? "year" : "years"}`;
};

// Determines Year Founded using multiple fallbacks
const getYearFoundedDisplay = (company: Company): string => {
  const candidates: Array<unknown> = [
    company.year_founded,
    company._years?.Year,
    company.revenues?._years?.Year,
    company.ev_data?._years?.Year,
  ];

  for (const c of candidates) {
    const year = extractValidYear(c);
    if (year !== null) return String(year);
  }

  return EM_DASH;
};

// Company Logo Component
const CompanyLogo = ({ logo, name }: { logo: string; name: string }) => {
  const logoStyle = {
    objectFit: "contain" as const,
    borderRadius: "8px",
  };

  const placeholderStyle = {
    width: "80px",
    height: "60px",
    backgroundColor: "#f7fafc",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    color: "#718096",
  };

  if (logo) {
    return (
      <Image
        src={`data:image/jpeg;base64,${logo}`}
        alt={`${name} logo`}
        width={80}
        height={60}
        className="company-logo"
        style={logoStyle}
      />
    );
  }

  return <div style={placeholderStyle}>No Logo</div>;
};

// Employee Chart Component
const EmployeeChart = ({ data }: { data: EmployeeCount[] }) => {
  const hasNonZeroEmployees = data.some(
    (item) => (item.employees_count ?? 0) > 0
  );
  const filteredData = hasNonZeroEmployees
    ? data.filter((item) => (item.employees_count ?? 0) > 0)
    : data;
  const chartData = filteredData.map((item) => ({
    date: formatDate(item.date),
    count: item.employees_count,
    fullDate: item.date,
  }));

  interface TooltipProps {
    active?: boolean;
    payload?: Array<{
      value: number;
      dataKey: string;
    }>;
    label?: string;
  }

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            backgroundColor: "white",
            border: "1px solid #ccc",
            padding: "10px",
            borderRadius: "4px",
          }}
        >
          <p style={{ margin: 0 }}>{`Date: ${label}`}</p>
          <p style={{ margin: 0, color: "#0075df" }}>
            {`Employees: ${payload[0].value.toLocaleString()}`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      style={{
        width: "100%",
        height: "300px",
        minHeight: "250px",
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#0075df"
            strokeWidth={2}
            dot={{
              fill: "#0075df",
              strokeWidth: 2,
              r: 4,
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

type V3RightPanelChrome = {
  card: React.CSSProperties;
  cardHeader: React.CSSProperties;
  cardHeaderTitle: React.CSSProperties;
  cardArrow: React.CSSProperties;
};

type FinanceRailTab = "financial" | "benchmark" | "income";

function V3TabbedFinanceCard({
  chrome,
  tokens,
  activeTab,
  onTabChange,
  tabs,
  bodyStyle,
  children,
}: {
  chrome: Pick<V3RightPanelChrome, "card" | "cardArrow">;
  tokens: { hair: string; ink: string; muted: string; sans: string };
  activeTab: FinanceRailTab;
  onTabChange: (t: FinanceRailTab) => void;
  tabs: { id: FinanceRailTab; label: string }[];
  bodyStyle?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        ...chrome.card,
        padding: 0,
        overflow: "hidden",
        width: "100%",
        boxSizing: "border-box",
      }}
      className="v3-finance-tabbed-card"
    >
      <div style={{ borderBottom: `1px solid ${tokens.hair}` }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 4,
            padding: "0 8px 0 2px",
            flexWrap: "nowrap",
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 2,
              flex: 1,
              minWidth: 0,
              flexWrap: "nowrap",
              overflowX: "auto",
              overscrollBehaviorX: "contain",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "thin",
            }}
          >
            {tabs.map((t) => {
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onTabChange(t.id)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "12px 8px 10px",
                    fontFamily: tokens.sans,
                    fontSize: "13px",
                    fontWeight: active ? 600 : 500,
                    color: active ? tokens.ink : tokens.muted,
                    borderBottom: active
                      ? `2px solid ${tokens.ink}`
                      : "2px solid transparent",
                    marginBottom: -1,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <span
            style={{
              ...chrome.cardArrow,
              paddingBottom: 10,
              flexShrink: 0,
              alignSelf: "flex-end",
            }}
          >
            →
          </span>
        </div>
      </div>
      <div style={{ padding: "14px 16px", ...bodyStyle }}>{children}</div>
    </div>
  );
}

function V3RightPanel({
  title,
  styles,
  headerRight,
  showArrow,
  bodyStyle,
  children,
}: {
  title: string;
  styles: V3RightPanelChrome;
  /** When set, replaces the default → affordance */
  headerRight?: React.ReactNode;
  /** When false, hide the trailing → (use with headerRight or no affordance) */
  showArrow?: boolean;
  bodyStyle?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const trailing =
    headerRight !== undefined
      ? headerRight
      : showArrow === false ? null : (
          <span style={styles.cardArrow}>→</span>
        );

  return (
    <div
      style={{
        ...styles.card,
        padding: 0,
        overflow: "hidden",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div style={styles.cardHeader}>
        <span style={styles.cardHeaderTitle}>{title}</span>
        {trailing}
      </div>
      <div style={{ padding: "14px 16px", ...bodyStyle }}>{children}</div>
    </div>
  );
}

// Main Company Detail Component
const CompanyDetail = () => {
  const params = useParams();
  const companyId = params.id as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isMobile, setIsMobile] = useState(false);
  const [showAllPrimarySectors, setShowAllPrimarySectors] = useState(false);
  const [showAllSecondarySectors, setShowAllSecondarySectors] = useState(false);
  const [corporateEvents, setCorporateEvents] = useState<
    CompanyCorporateEvent[]
  >([]);
  const [corporateEventsLoading, setCorporateEventsLoading] = useState(true);
  const [companyArticles, setCompanyArticles] = useState<ContentArticle[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [insightsPageOffset, setInsightsPageOffset] = useState(0);
  // Optional preformatted displays from API (ebitda_data)
  const [, setMetricsDisplay] = useState<
    | {
        revenue?: string;
        ebitda?: string;
        ev?: string;
      }
    | undefined
  >();
  // Financial metrics from Xano `company_financial_metrics`
  const [financialMetrics, setFinancialMetrics] =
    useState<CompanyFinancialMetrics | null>(null);
  // New investors from company_investors API endpoint
  const [apiInvestors, setApiInvestors] = useState<
    CompanyInvestorFromAPI[]
  >([]);
  const [apiInvestorsLoading, setApiInvestorsLoading] = useState(false);
  const [competitors, setCompetitors] =
    useState<CompanyCompetitorsResponse | null>(null);
  const [competitorsLoading, setCompetitorsLoading] = useState(false);
  const [showCompetitorsModal, setShowCompetitorsModal] = useState(false);
  const [financeRailTab, setFinanceRailTab] =
    useState<FinanceRailTab>("financial");
  const [transactionStatusLabel, setTransactionStatusLabel] = useState<string>("");
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingPdfType, setExportingPdfType] =
    useState<CompanyPdfExportType | null>(null);
  const [showPdfExportOptions, setShowPdfExportOptions] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isDescriptionExpandable, setIsDescriptionExpandable] = useState(false);
  const [activeProductMixTab, setActiveProductMixTab] =
    useState<ProductMixTab>("product_type");
  const descriptionRef = useRef<HTMLDivElement | null>(null);
  const pdfExportMenuRef = useRef<HTMLDivElement | null>(null);

  const transactionStatusDisplayLabel = useMemo(() => {
    const raw = String(transactionStatusLabel || "").trim();
    if (!raw) return "";
    // Company page only: omit the leading "Transaction" and ensure "Anticipated" is capitalized.
    const withoutTransaction = raw.replace(/^transaction\s+/i, "");
    return withoutTransaction.replace(/^anticipated\b/i, "Anticipated");
  }, [transactionStatusLabel]);

  const managementCurrentPeople = useMemo(
    () =>
      (company?.Managmant_Roles_current || []).map((person) => ({
        id: person.id,
        name: person.Individual_text,
        role: (person.job_titles_id || [])
          .map((job) => job?.job_title)
          .filter(Boolean)
          .join(", "),
        individualId: person.individuals_id,
      })),
    [company]
  );

  const managementPastPeople = useMemo(
    () =>
      (company?.Managmant_Roles_past || []).map((person) => ({
        id: person.id,
        name: person.Individual_text,
        role: (person.job_titles_id || [])
          .map((job) => job?.job_title)
          .filter(Boolean)
          .join(", "),
        individualId: person.individuals_id,
      })),
    [company]
  );

  // Safely extract a sector id from various backend shapes
  const getSectorId = (sector: unknown): number | undefined => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = sector as any;
    const candidate = s?.sector_id ?? s?.id ?? s?.Sector_id;
    if (typeof candidate === "number") return candidate;
    if (typeof candidate === "string") {
      const parsed = parseInt(candidate, 10);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  };

  // (constants defined at module scope)

  // Safely read primary business focus ids from arbitrary backend shapes
  const extractPrimaryBusinessFocusIds = (payload: unknown): number[] => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = payload as any;
    const raw = p?.primary_business_focus_id ?? p?.Primary_Business_Focus_Id;
    if (Array.isArray(raw)) {
      return raw
        .map((v) => {
          if (typeof v === "number") return v;
          if (typeof v === "string") {
            const n = parseInt(v, 10);
            return Number.isFinite(n) ? n : undefined;
          }
          if (v && typeof v === "object") {
            const idCandidate = (v as { id?: unknown }).id;
            if (typeof idCandidate === "number") return idCandidate;
            if (typeof idCandidate === "string") {
              const n = parseInt(idCandidate, 10);
              return Number.isFinite(n) ? n : undefined;
            }
          }
          return undefined;
        })
        .filter((v): v is number => typeof v === "number");
    }
    const single =
      typeof raw === "number" ? raw : parseInt(String(raw ?? ""), 10);
    return Number.isFinite(single) ? [single] : [];
  };


  // Fetch company with intelligent fallbacks (GET first, then POST with common payload keys)
  const requestCompany = useCallback(
    async (id: string): Promise<CompanyResponse> => {
      const token = localStorage.getItem("asymmetrix_auth_token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const endpoint = `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/Get_new_company/${id}`;

      // Attempt 1: Standard GET
      const getResponse = await fetch(endpoint, {
        method: "GET",
        headers,
        credentials: "include",
      });
      if (getResponse.status === 401) {
        throw new Error("Authentication required");
      }
      if (getResponse.ok) {
        return (await Promise.race([
          getResponse.json(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Request timed out")), 20000)
          ),
        ])) as CompanyResponse;
      }

      // Attempt 2..N: POST with typical id keys, in case backend expects a body
      const candidateBodies = [
        { new_company_id: Number(id) },
        { company_id: Number(id) },
        { id: Number(id) },
      ];
      for (const body of candidateBodies) {
        const postResponse = await fetch(endpoint, {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify(body),
        });
        if (postResponse.status === 401) {
          throw new Error("Authentication required");
        }
        if (postResponse.ok) {
          return (await Promise.race([
            postResponse.json(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Request timed out")), 20000)
            ),
          ])) as CompanyResponse;
        }
      }

      // If we reached here, throw a detailed error
      const errorText = await getResponse.text().catch(() => "");
      throw new Error(
        `API request failed: ${getResponse.status} ${getResponse.statusText} ${errorText}`
      );
    },
    []
  );


  // Fetch Asymmetrix content articles via public companies_articles endpoint
  const fetchCompanyArticles = useCallback(
    async (companyIdForContent: string | number) => {
      if (companyIdForContent === undefined || companyIdForContent === null)
        return;
      setArticlesLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("new_company_id", String(companyIdForContent));
        const url = `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/companies_articles?${params.toString()}`;
        const response = await fetch(url, { method: "GET" });
        if (!response.ok) {
          setCompanyArticles([]);
        } else {
          const data = await response.json();
          setCompanyArticles(
            Array.isArray(data) ? (data as ContentArticle[]) : []
          );
        }
      } catch {
        setCompanyArticles([]);
      } finally {
        setArticlesLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    setInsightsPageOffset(0);
  }, [company?.id, companyArticles.length]);

  // Fetch financial metrics (auth required) with GET + POST fallbacks
  const fetchFinancialMetrics = useCallback(async (id: string | number) => {
    try {
      const token = localStorage.getItem("asymmetrix_auth_token");
      if (!token) {
        // Keep silent failure; UI will show existing values
        return;
      }
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      const base = `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/company_financial_metrics`;
      // Attempt GET with query param
      const params = new URLSearchParams();
      params.append("new_company_id", String(id));
      let res = await fetch(`${base}?${params.toString()}`, {
        method: "GET",
        headers,
        credentials: "include",
      });

      if (!res.ok) {
        // Fallback to POST with common id keys
        const candidateBodies = [
          { new_company_id: Number(id) },
          { company_id: Number(id) },
          { id: Number(id) },
        ];
        for (const body of candidateBodies) {
          const attempt = await fetch(base, {
            method: "POST",
            headers,
            credentials: "include",
            body: JSON.stringify(body),
          });
          if (attempt.ok) {
            res = attempt;
            break;
          }
        }
      }

      if (!res.ok) return;
      const data = await res.json();
      // API may return a single object or an array
      const payload: CompanyFinancialMetrics | null = Array.isArray(data)
        ? (data[0] as CompanyFinancialMetrics | undefined) || null
        : (data as CompanyFinancialMetrics);
      if (payload && typeof payload === "object") {
        setFinancialMetrics(payload);
      }
    } catch {
      // Non-fatal; keep defaults
    }
  }, []);

  // Fetch investors from company_investors API endpoint
  const fetchCompanyInvestors = useCallback(async (id: string | number) => {
    setApiInvestorsLoading(true);
    try {
      const token = localStorage.getItem("asymmetrix_auth_token");
      const headers: Record<string, string> = {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const endpoint = `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/company_investors`;

      // GET with query param (required by backend)
      const params = new URLSearchParams();
      params.append("new_company_id", String(id));
      const res = await fetch(`${endpoint}?${params.toString()}`, {
        method: "GET",
        headers,
        credentials: "include",
      });

      if (!res.ok) {
        setApiInvestors([]);
        return;
      }

      const data = await res.json();
      if (Array.isArray(data)) {
        setApiInvestors(data as CompanyInvestorFromAPI[]);
      } else {
        setApiInvestors([]);
      }
    } catch (err) {
      console.error("Error fetching company investors:", err);
      setApiInvestors([]);
    } finally {
      setApiInvestorsLoading(false);
    }
  }, []);

  const fetchCompanyCompetitors = useCallback(async (id: string | number) => {
    setCompetitorsLoading(true);
    try {
      const token = localStorage.getItem("asymmetrix_auth_token");
      if (!token) {
        setCompetitorsLoading(false);
        return;
      }
      const headers: Record<string, string> = {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      };

      const params = new URLSearchParams();
      params.append("new_company_id", String(id));
      const res = await fetch(
        `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au:develop/get_company_competitors?${params.toString()}`,
        { method: "GET", headers, credentials: "include" }
      );
      if (!res.ok) {
        setCompetitors(null);
        return;
      }
      const data = (await res.json()) as {
        competitors?: Partial<CompanyCompetitorsResponse>;
      };
      const payload = data?.competitors;
      setCompetitors({
        peers: Array.isArray(payload?.peers) ? payload.peers : [],
        potential_acquirers: Array.isArray(payload?.potential_acquirers)
          ? payload.potential_acquirers
          : [],
        acquisition_targets: Array.isArray(payload?.acquisition_targets)
          ? payload.acquisition_targets
          : [],
      });
    } catch (err) {
      console.error("Error fetching company competitors:", err);
      setCompetitors(null);
    } finally {
      setCompetitorsLoading(false);
    }
  }, []);

  const fetchCompanyTransactionStatus = useCallback(async (id: string | number) => {
    try {
      const params = new URLSearchParams();
      params.append("new_company_id", String(id));
      const res = await fetch(
        `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au:develop/get_company_transaction_status?${params.toString()}`,
        { method: "GET" }
      );
      if (!res.ok) return;
      const data = await res.json();
      const badge = data?.transaction_status_badge;
      if (!badge || typeof badge !== "object") return;
      const label = String(badge.label || "").trim();
      if (!label) return;
      setTransactionStatusLabel(label);
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    const fetchCompanyData = async () => {
      setLoading(true);
      setError(null);

      try {
        let data: CompanyResponse;
        try {
          data = await requestCompany(companyId);
        } catch (apiErr) {
          // If the GET/POST attempts failed, rethrow with a nicer message
          const msg = apiErr instanceof Error ? apiErr.message : String(apiErr);
          if (msg.includes("404")) {
            throw new Error("Company not found");
          }
          throw new Error(msg || "API request failed");
        }

        // Intentionally removed extremely verbose JSON logging that could stall rendering for large payloads

        if (!data.Company) {
          throw new Error("Invalid company data");
        }

        // Removed additional verbose logging

        // Use actual investor data from API
        const enrichedCompany = {
          ...data.Company,
          investors: Array.isArray(
            (data.Company as unknown as { investors_new_company?: unknown })
              .investors_new_company
          )
            ? ((
                data.Company as unknown as {
                  investors_new_company: CompanyInvestor[];
                }
              ).investors_new_company as CompanyInvestor[])
            : [],
          // Add the actual API fields - THESE ARE AT ROOT LEVEL, NOT IN data.Company!
          Managmant_Roles_current: data.Managmant_Roles_current || [],
          Managmant_Roles_past: data.Managmant_Roles_past || [],
          // Former company name(s) may come from root or inside Company
          Former_name:
            (data as unknown as { Former_name?: string[] })?.Former_name ||
            (data.Company as unknown as { Former_name?: string[] })
              ?.Former_name ||
            [],
          have_subsidiaries_companies: data.have_subsidiaries_companies || {
            have_subsidiaries_companies: false,
            Subsidiaries_companies: [],
          },
          // Prefer root-level new_sectors_data when present; fallback to Company-level
          new_sectors_data:
            data.new_sectors_data || data.Company?.new_sectors_data,
          income_statement:
            data.income_statement || data.Company.income_statement,
          have_parent_company:
            (data as { have_parent_company?: HaveParentCompany })
              .have_parent_company ||
            (
              data.Company as unknown as {
                have_parent_company?: HaveParentCompany;
              }
            ).have_parent_company,
          Product_Type:
            (data as { Product_Type?: CompanyProductTypeItem[] | string })
              .Product_Type || data.Company?.Product_Type,
          Data_Collection_Method:
            (
              data as {
                Data_Collection_Method?:
                  | CompanyDataCollectionMethodItem[]
                  | string;
              }
            ).Data_Collection_Method || data.Company?.Data_Collection_Method,
          Revenue_Model_:
            (data as { Revenue_Model_?: CompanyRevenueModelItem[] | string })
              .Revenue_Model_ ||
            (data as { Revenue_Model?: CompanyRevenueModelItem[] | string })
              .Revenue_Model ||
            data.Company?.Revenue_Model_ ||
            (data.Company as { Revenue_Model?: CompanyRevenueModelItem[] | string })
              ?.Revenue_Model,
          last_investment:
            (data as { last_investment?: LastInvestment | null })
              .last_investment ??
            (data.Company as { last_investment?: LastInvestment | null })
              ?.last_investment ??
            null,
          Lifecycle_stage:
            data.Company?.Lifecycle_stage ||
            (data as unknown as { Lifecycle_stage?: LifecycleStage })
              .Lifecycle_stage ||
            undefined,
        };

        // Parse optional ebitda_data with display strings
        try {
          const rawEbitda = (
            data as unknown as {
              ebitda_data?: Array<{ items?: unknown }>;
            }
          )?.ebitda_data;
          if (Array.isArray(rawEbitda)) {
            for (const entry of rawEbitda) {
              const raw = (entry as { items?: unknown })?.items;
              let payload: unknown = raw;
              if (typeof raw === "string") {
                try {
                  payload = JSON.parse(raw as string);
                } catch {
                  // ignore
                }
              }
              const obj = (payload || {}) as {
                EBITDA_display?: string;
                Revenue_display?: string;
                Enterprise_Value_display?: string;
              };
              setMetricsDisplay({
                revenue: obj?.Revenue_display,
                ebitda: obj?.EBITDA_display,
                ev: obj?.Enterprise_Value_display,
              });
              break; // use first block only
            }
          }
        } catch {}

        // Parse corporate events from Get_new_company payload (preferred, no auth)
        try {
          const newCounterparties = (
            data as unknown as {
              // Backward compatible: either an array of wrapper-objects
              // with `items` (legacy) or an array of event objects directly.
              new_counterparties?: Array<{ items?: unknown } | NewCorporateEvent>;
            }
          )?.new_counterparties;
          const parsedEvents: NewCorporateEvent[] = [];
          if (Array.isArray(newCounterparties)) {
            for (const entry of newCounterparties) {
              const raw = (entry as { items?: unknown })?.items;
              // If `items` is present, treat this as the legacy wrapped shape
              let payload: unknown = raw;
              if (typeof raw === "string") {
                try {
                  payload = JSON.parse(raw as string);
                } catch {
                  // ignore malformed JSON
                }
              }
              if (Array.isArray(payload)) {
                parsedEvents.push(...(payload as NewCorporateEvent[]));
              } else if (!raw && entry && typeof entry === "object") {
                // Newer API may return the event object directly inside `new_counterparties`
                // without an `items` wrapper; in that case treat `entry` as the event.
                parsedEvents.push(entry as NewCorporateEvent);
              }
            }
          }
          if (parsedEvents.length > 0) {
            setCorporateEvents(parsedEvents);
          }
          setCorporateEventsLoading(false);
        } catch {
          // non-fatal - ensure loading state is reset even on error
          setCorporateEventsLoading(false);
        }

        // Removed verbose logging of enriched object

        setCompany(enrichedCompany);
        // Trigger fetching related articles using company id (requires auth)
        if (enrichedCompany?.id) {
          fetchCompanyArticles(enrichedCompany.id);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch company data";
        const isUnauthorized =
          message === "Authentication required" ||
          message.includes("ERROR_CODE_UNAUTHORIZED") ||
          message.includes("This token is expired") ||
          message.includes("API request failed: 401");

        if (isUnauthorized) {
          // AuthProvider will show the login modal via fetch interceptor.
          setError(null);
          console.error("Unauthorized while loading company:", err);
          return;
        }

        setError(message);
        console.error("Error fetching company data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (companyId) {
      fetchCompanyData();
      fetchFinancialMetrics(companyId);
      fetchCompanyInvestors(companyId);
      fetchCompanyCompetitors(companyId);
      fetchCompanyTransactionStatus(companyId);
    }
  }, [
    companyId,
    fetchCompanyArticles,
    requestCompany,
    fetchFinancialMetrics,
    fetchCompanyInvestors,
    fetchCompanyCompetitors,
    fetchCompanyTransactionStatus,
  ]);


  // Merge investors found in corporate events into the company's investors list
  useEffect(() => {
    if (!company) return;

    // Start with existing investors from the company payload
    const existingInvestors: CompanyInvestor[] = Array.isArray(
      company.investors
    )
      ? (company.investors as CompanyInvestor[])
      : [];

    const investorMap = new Map<number, CompanyInvestor>();
    for (const inv of existingInvestors) {
      if (inv && typeof inv.id === "number") {
        investorMap.set(inv.id, inv);
      }
    }
    // Intentionally do not enrich investors from corporate events.
    // The backend already provides current investors via `investors_new_company`.
    // Merging from events can incorrectly include past investors (e.g., divestors).

    const merged = Array.from(investorMap.values());
    // If nothing changed, avoid re-render churn
    const prevIdsArray = (
      Array.isArray(company.investors)
        ? (company.investors as CompanyInvestor[])
        : []
    )
      .map((i) => (i ? (i as CompanyInvestor).id : undefined))
      .filter((v): v is number => typeof v === "number");
    const mergedIdsArray = merged.map((i) => i.id);
    const prevIdsSet = new Set(prevIdsArray);
    const mergedIdsSet = new Set(mergedIdsArray);
    const isSame =
      prevIdsSet.size === mergedIdsSet.size &&
      Array.from(prevIdsSet).every((id) => mergedIdsSet.has(id));

    if (!isSame) {
      setCompany((prev) => (prev ? { ...prev, investors: merged } : prev));
    }
  }, [company, corporateEvents]);

  // Detect mobile once on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const check = () => setIsMobile(window.innerWidth <= 768);
      check();
      window.addEventListener("resize", check);
      return () => window.removeEventListener("resize", check);
    }
  }, []);

  useEffect(() => {
    setIsDescriptionExpanded(false);
  }, [company?.description]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkDescriptionOverflow = () => {
      const element = descriptionRef.current;
      if (!element) {
        setIsDescriptionExpandable(false);
        return;
      }

      const computedStyle = window.getComputedStyle(element);
      const lineHeight = parseFloat(computedStyle.lineHeight || "0");
      if (!lineHeight) {
        setIsDescriptionExpandable(false);
        return;
      }

      // Match the template's eight-line collapsed description preview.
      const collapsedHeight = lineHeight * 8;
      setIsDescriptionExpandable(element.scrollHeight > collapsedHeight + 1);
    };

    checkDescriptionOverflow();
    window.addEventListener("resize", checkDescriptionOverflow);

    return () => window.removeEventListener("resize", checkDescriptionOverflow);
  }, [company?.description, isMobile]);

  // Update page title when company data is loaded
  useEffect(() => {
    if (company?.name && typeof document !== "undefined") {
      document.title = `Asymmetrix – ${company.name}`;
    }
  }, [company?.name]);

  useEffect(() => {
    if (!showPdfExportOptions || typeof document === "undefined") return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        pdfExportMenuRef.current &&
        !pdfExportMenuRef.current.contains(event.target as Node)
      ) {
        setShowPdfExportOptions(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [showPdfExportOptions]);

  // Handle PDF export (ported from develop)
  const handleExportPdf = useCallback(async (exportType: CompanyPdfExportType) => {
    if (!company?.id) {
      console.error("Company ID not available");
      return;
    }

    try {
      setExportingPdf(true);
      setExportingPdfType(exportType);
      setShowPdfExportOptions(false);
      const token = localStorage.getItem("asymmetrix_auth_token");
      const isFinancialMetricsExport = exportType === "financial_metrics";
      const financialMetricsPeriod = formatFinancialMetricsPeriod(financialMetrics);
      const financialMetricsYear = extractValidYear(
        financialMetrics?.financial_year_text ?? financialMetrics?.Financial_Year
      );
      const requestBody = isFinancialMetricsExport
        ? {
            company_id: company.id,
            company_name: company.name,
            financial_metrics_period: financialMetricsPeriod,
            financial_metrics_year: financialMetricsYear,
            source: FINANCIAL_METRICS_EXPORT_SOURCE,
          }
        : { company_id: company.id };
      const response = await fetch(
        "https://asymmetrix-pdf-service.fly.dev/api/export-company-pdf",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        throw new Error(`PDF export failed: ${response.statusText}`);
      }

      const blob = await response.blob();

      const sanitizeFilename = (name: string): string => {
        return name
          .replace(/[<>:"/\\|?*]/g, "")
          .replace(/\s+/g, " ")
          .trim();
      };

      const companyName = company.name
        ? sanitizeFilename(company.name)
        : `Company-${company.id}`;
      const filename = isFinancialMetricsExport
        ? `Asymmetrix ${companyName} Financial Metrics.pdf`
        : `Asymmetrix ${companyName} Company Profile.pdf`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting PDF:", error);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setExportingPdf(false);
      setExportingPdfType(null);
    }
  }, [
    company?.id,
    company?.name,
    financialMetrics,
  ]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div style={{ padding: "40px", textAlign: "center" }}>
          <div style={{ fontSize: "18px", color: "#666" }}>
            Loading company data...
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: "#9ca3af" }}>
            If this takes more than a few seconds, please refresh.
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <Header />
        <div style={{ padding: "40px", textAlign: "center" }}>
          <div style={{ fontSize: "18px", color: "#e53e3e" }}>
            {error === "Company not found" ? (
              <div>
                <h1 style={{ fontSize: "24px", marginBottom: "16px" }}>
                  Company Not Found
                </h1>
                <p style={{ marginBottom: "24px" }}>
                  The company you&apos;re looking for doesn&apos;t exist or has
                  been removed.
                </p>
                <a
                  href="/companies"
                  style={{
                    color: "#0075df",
                    textDecoration: "underline",
                    fontSize: "16px",
                  }}
                >
                  ← Back to Companies
                </a>
              </div>
            ) : (
              <div>
                <h1 style={{ fontSize: "24px", marginBottom: "16px" }}>
                  Error Loading Company
                </h1>
                <p style={{ marginBottom: "24px" }}>{error}</p>
                <a
                  href="/companies"
                  style={{
                    color: "#0075df",
                    textDecoration: "underline",
                    fontSize: "16px",
                  }}
                >
                  ← Back to Companies
                </a>
              </div>
            )}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!company) {
    return null;
  }

  // Removed render-phase debug logging to avoid noise/perf issues

  // Compute a safe LinkedIn URL from API (only allow linkedin.com domains)
  const linkedinUrl: string | undefined = (() => {
    const raw = company.linkedin_data?.LinkedIn_URL;
    if (!raw) return undefined;
    const trimmed = String(raw).trim();
    if (!trimmed) return undefined;
    const candidate = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    try {
      const u = new URL(candidate);
      const host = u.hostname.toLowerCase();
      if (!host.endsWith("linkedin.com")) return undefined;
      return u.toString();
    } catch {
      return undefined;
    }
  })();

  // Process sectors (prefer new_sectors_data.sectors_payload when present)
  const parsedNewSectors: {
    primary: CompanySector[];
    secondary: CompanySector[];
  } | null = (() => {
    try {
      const rawContainer = company?.new_sectors_data;
      if (!Array.isArray(rawContainer) || rawContainer.length === 0)
        return null;
      const candidate = rawContainer.find(
        (e) => e && e.sectors_payload != null
      );
      if (!candidate) return null;
      const rawPayload = candidate.sectors_payload;

      type SectorsPayloadShape = {
        primary_sectors?: Array<{ id?: number | string; sector_name?: string }>;
        secondary_sectors?: Array<{ id?: number | string; sector_name?: string }>;
      };

      const tryParseJson = (text: string): unknown => {
        const trimmed = text.trim();
        if (!trimmed) return null;
        // Common Xano escaping: \u0022 for quotes
        const normalized = trimmed.replace(/\\u0022/g, '"');
        try {
          return JSON.parse(normalized);
        } catch {
          return null;
        }
      };

      const normalizePayload = (value: unknown): SectorsPayloadShape | null => {
        if (!value) return null;

        // If it's already an object, use it directly
        if (typeof value === "object") return value as SectorsPayloadShape;

        if (typeof value === "string") {
          // Handle plain JSON string or double-encoded JSON string
          const first = tryParseJson(value);
          if (first && typeof first === "object") return first as SectorsPayloadShape;
          if (typeof first === "string") {
            const second = tryParseJson(first);
            if (second && typeof second === "object") return second as SectorsPayloadShape;
          }
          // Last attempt: sometimes it arrives with surrounding quotes escaped
          const unquoted = value.trim().replace(/^"+|"+$/g, "");
          const third = tryParseJson(unquoted);
          if (third && typeof third === "object") return third as SectorsPayloadShape;
        }

        return null;
      };

      const payload = normalizePayload(rawPayload);
      if (!payload) return null;
      const toNumber = (v: unknown): number => {
        if (typeof v === "number" && Number.isFinite(v)) return v;
        const n = parseInt(String(v ?? ""), 10);
        return Number.isFinite(n) ? n : 0;
      };
      const toPrimary = (
        l: Array<{ id?: number | string; sector_name?: string }> = []
      ): CompanySector[] =>
        l
          .map((it) => ({
            sector_name: String(it?.sector_name || "").trim(),
            Sector_importance: "Primary",
            sector_id: toNumber(it?.id),
          }))
          .filter((s) => Boolean(s.sector_name));
      const toSecondary = (
        l: Array<{ id?: number | string; sector_name?: string }> = []
      ): CompanySector[] =>
        l
          .map((it) => ({
            sector_name: String(it?.sector_name || "").trim(),
            Sector_importance: "Secondary",
            sector_id: toNumber(it?.id),
          }))
          .filter((s) => Boolean(s.sector_name));
      return {
        primary: toPrimary(payload.primary_sectors || []),
        secondary: toSecondary(payload.secondary_sectors || []),
      };
    } catch {
      return null;
    }
  })();

  // Determine sectors to display:
  // Prefer `new_sectors_data.sectors_payload` (it already splits primary vs secondary).
  // Only fall back to `company.sectors_id` when `new_sectors_data` is missing/unparseable.
  const hasNewSectors = parsedNewSectors !== null;

  const primarySectors =
    (hasNewSectors
      ? parsedNewSectors!.primary
      : (company.sectors_id || [])
          .filter((sector) => sector && sector?.Sector_importance === "Primary")
          .filter((s): s is CompanySector =>
            Boolean(
              s &&
                typeof s.sector_name === "string" &&
                typeof s.sector_id === "number"
            )
          )) || [];

  const secondarySectors =
    (hasNewSectors
      ? parsedNewSectors!.secondary
      : (company.sectors_id || [])
          .filter((sector) => sector && sector?.Sector_importance !== "Primary")
          .filter((s): s is CompanySector =>
            Boolean(
              s &&
                typeof s.sector_name === "string" &&
                typeof s.sector_id === "number"
            )
          )) || [];

  // Use API-provided primary sectors only
  const augmentedPrimarySectors = primarySectors;

  // Process location
  const location = company._locations;
  const fullAddress = [
    location?.City,
    location?.State__Province__County,
    location?.Country,
  ]
    .filter(Boolean)
    .join(", ");

  // Process financial data
  const revenueCurrency =
    normalizeCurrency(
      company.revenues?.revenues_currency ||
        company.revenues?._currency?.Currency ||
        company.revenues?.currency?.Currency
    ) || undefined;
  const evCurrency =
    normalizeCurrency(
      company.ev_data?._currency?.Currency ||
        company.ev_data?.currency?.Currency
    ) || undefined;

  // Use revenue currency if valid; otherwise fall back to EV currency
  const displayCurrency = revenueCurrency || evCurrency;

  // Keep preformatted displays for legacy widgets only (not used in Financial Metrics rendering)

  // Prefer values from `company_financial_metrics` when available for base figures (plain numbers, no currency)
  const revenueFromMetrics =
    getNumeric(financialMetrics?.Revenue_m) !== undefined
      ? formatPlainNumber(financialMetrics?.Revenue_m)
      : undefined;
  const ebitdaFromMetrics =
    getNumeric(financialMetrics?.EBITDA_m) !== undefined
      ? formatPlainNumber(financialMetrics?.EBITDA_m)
      : undefined;
  const evFromMetrics =
    getNumeric(financialMetrics?.EV) !== undefined
      ? formatPlainNumber(financialMetrics?.EV)
      : undefined;

  // Plain fallbacks from company data (no currency, preserve decimals)
  const revenuePlain =
    revenueFromMetrics ?? formatPlainNumber(company.revenues?.revenues_m);
  const ebitdaPlain =
    ebitdaFromMetrics ?? formatPlainNumber(company.EBITDA?.EBITDA_m);
  const evPlain = evFromMetrics ?? formatPlainNumber(company.ev_data?.ev_value);

  // Currency suffix to show once in heading
  const metricsCurrencyCode =
    // 1) Prefer explicit display strings from Xano metrics payload when present
    normalizeCurrency(
      (financialMetrics as unknown as { Revenue_currency_display?: string | null })
        ?.Revenue_currency_display
    ) ||
    normalizeCurrency(
      (financialMetrics as unknown as { EBITDA_currency_display?: string | null })
        ?.EBITDA_currency_display
    ) ||
    normalizeCurrency(
      (financialMetrics as unknown as { EV_currency_display?: string | null })
        ?.EV_currency_display
    ) ||
    normalizeCurrency(
      (financialMetrics as unknown as { EBIT_currency_display?: string | null })
        ?.EBIT_currency_display
    ) ||
    // 2) Then fall back to structured currency objects
    normalizeCurrency(
      (financialMetrics as unknown as { _currency?: { Currency?: string } })
        ?._currency
    ) ||
    // 3) Finally, consider legacy numeric/string codes and page-level fallbacks
    normalizeCurrency(financialMetrics?.Rev_Currency) ||
    normalizeCurrency(financialMetrics?.EBITDA_currency) ||
    normalizeCurrency(financialMetrics?.EV_currency) ||
    displayCurrency;
  const metricsCurrencySuffix = metricsCurrencyCode
    ? ` (${metricsCurrencyCode})`
    : "";

  const financialMetricsPeriodDisplay = formatFinancialMetricsPeriod(financialMetrics);

  // Extract last 3 income statement rows (public companies only)
  const isPublicOwnership = (company._ownership_type?.ownership || "")
    .toLowerCase()
    .includes("public");
  const rawIncomeStatements: IncomeStatementEntry[] = ((
    company.income_statement || []
  ).flatMap((block) => {
    const raw = block?.income_statements as unknown;
    if (!raw) return [] as IncomeStatementEntry[];
    if (typeof raw === "string") {
      try {
        const decoded = JSON.parse(
          (raw as string).replace(/\\u0022/g, '"')
        ) as unknown;
        return Array.isArray(decoded)
          ? (decoded as IncomeStatementEntry[])
          : [];
      } catch {
        return [] as IncomeStatementEntry[];
      }
    }
    return (raw as IncomeStatementEntry[]) || [];
  }) || []) as IncomeStatementEntry[];
  const normalizedIncomeStatements = rawIncomeStatements
    .map((row) => ({
      id: row.id,
      period_display_end_date: row.period_display_end_date,
      period_end_date: row.period_end_date,
      revenue: row.revenue ?? null,
      ebit: row.ebit ?? null,
      ebitda: row.ebitda ?? null,
      cost_of_goods_sold_currency: row.cost_of_goods_sold_currency,
    }))
    .sort((a, b) => {
      // Sort descending by period_end_date; fallback to display string
      const da = a.period_end_date
        ? Date.parse(a.period_end_date)
        : Date.parse(
            (a.period_display_end_date || "").replace(/[^0-9-]/g, "")
          ) || 0;
      const db = b.period_end_date
        ? Date.parse(b.period_end_date)
        : Date.parse(
            (b.period_display_end_date || "").replace(/[^0-9-]/g, "")
          ) || 0;
      return db - da;
    })
    .slice(0, 3);

  // Show Income Statement only if there is at least one numeric value
  const hasIncomeStatementData =
    isPublicOwnership &&
    normalizedIncomeStatements.some(
      (row) =>
        typeof row.revenue === "number" ||
        typeof row.ebit === "number" ||
        typeof row.ebitda === "number"
    );

  // Process employee data
  const employeeData = company._companies_employees_count_monthly || [];
  const currentEmployeeCount =
    employeeData.length > 0
      ? employeeData[employeeData.length - 1].employees_count
      : 0;

  // Determine if there are subsidiaries to display
  const hasSubsidiaries = Boolean(
    company.have_subsidiaries_companies?.have_subsidiaries_companies &&
      company.have_subsidiaries_companies?.Subsidiaries_companies &&
      company.have_subsidiaries_companies.Subsidiaries_companies.length > 0
  );

  // Parent Company is shown when we have parent data and first parent is NOT Financial Services (74)
  const haveParentCompany = Boolean(
    company.have_parent_company?.have_parent_companies &&
      Array.isArray(company.have_parent_company?.Parant_companies) &&
      company.have_parent_company.Parant_companies.length > 0 &&
      !extractPrimaryBusinessFocusIds(
        company.have_parent_company.Parant_companies[0]?.primary_business_focus_id
      ).includes(FINANCIAL_SERVICES_FOCUS_ID)
  );

  // Determine if there is management data to display
  const hasCurrentManagement = Boolean(
    company.Managmant_Roles_current && company.Managmant_Roles_current.length > 0
  );
  const hasPastManagement = Boolean(
    company.Managmant_Roles_past && company.Managmant_Roles_past.length > 0
  );
  const hasManagement = hasCurrentManagement || hasPastManagement;

  const totalAmountRaisedDisplay = pickTotalAmountRaisedDisplay(company);

  const fmEmployeeHeadcount = financialMetrics?.No_Employees;
  const overviewHeadcount = (() => {
    if (
      typeof fmEmployeeHeadcount === "number" &&
      fmEmployeeHeadcount > 0
    ) {
      return fmEmployeeHeadcount;
    }
    if (typeof currentEmployeeCount === "number" && currentEmployeeCount > 0) {
      return currentEmployeeCount;
    }
    const li = company.linkedin_data?.LinkedIn_Employee;
    if (typeof li === "number" && li > 0) return li;
    return null;
  })();

  const overviewEmployeesYoY = (() => {
    const direct = company.employees_yoy_pct;
    if (typeof direct === "number" && Number.isFinite(direct)) {
      const rounded = Math.round(direct * 10) / 10;
      return `${rounded >= 0 ? "+" : ""}${rounded}% YoY`;
    }
    return computeEmployeeYoYFromMonthly(employeeData);
  })();

  // Market Overview removed: no TradingView symbols computation

  // Build a readable former name string if present
  const formerNameDisplay =
    Array.isArray(company?.Former_name) && company.Former_name.length > 0
      ? company.Former_name.filter(
          (v) => typeof v === "string" && v.trim().length > 0
        ).join(", ")
      : null;

  const productTypeRows = parseStructuredArray<CompanyProductTypeItem>(
    company.Product_Type
  )
    .map((item) => ({
      label: String(item?.Product_Type || "").trim(),
      // If percentage is missing, leave the cell empty instead of showing "Not available"
      value:
        getNumeric(item?.pc_of_revenues) !== undefined
          ? `${Math.round(getNumeric(item?.pc_of_revenues) || 0)}%`
          : "",
    }))
    .filter((item) => item.label);

  const dataCollectionMethodRows =
    parseStructuredArray<CompanyDataCollectionMethodItem>(
      company.Data_Collection_Method
    )
      .map((item) => ({
        label: String(item?.Data_Collection_Method || "").trim(),
        value: String(item?.Predominance || "").trim(),
      }))
      .filter((item) => item.label);

  const ownershipLabel = company._ownership_type?.ownership || "";
  const lifecycleLabel = company.Lifecycle_stage?.Lifecycle_Stage || "";
  const tickerDisplay = company.ticker && company.exchange
    ? `${company.exchange}: ${company.ticker}`
    : company.ticker || null;

  const insightTotalCount = companyArticles.length;
  const insightVisibleSlice = companyArticles.slice(
    insightsPageOffset,
    insightsPageOffset + INSIGHTS_PREVIEW_COUNT
  );
  const canInsightPrev =
    insightTotalCount > 0 && insightsPageOffset > 0;
  const canInsightNext =
    insightTotalCount > 0 &&
    insightsPageOffset + INSIGHTS_PREVIEW_COUNT < insightTotalCount;
  const insightRangeEnd = Math.min(
    insightsPageOffset + INSIGHTS_PREVIEW_COUNT,
    insightTotalCount
  );

  // ── Design tokens (mirroring the HTML template's T object) ──────────────
  const T = {
    paper:   "#FAFAF7",
    panel:   "#FFFFFF",
    inset:   "#F4F3EE",
    divider: "rgba(15,17,21,0.08)",
    hair:    "rgba(15,17,21,0.06)",
    ink:     "#0F1115",
    body:    "#2A2D33",
    muted:   "#6B6E76",
    faint:   "#9A9CA3",
    azure:   "oklch(54% 0.22 258)",
    azureSoft: "oklch(96% 0.035 258)",
    emerald: "oklch(56% 0.13 158)",
    emeraldSoft: "oklch(95% 0.05 158)",
    coral:   "oklch(68% 0.13 25)",
    coralSoft: "oklch(95% 0.04 25)",
    lavender: "oklch(64% 0.16 285)",
    lavenderSoft: "oklch(94% 0.045 285)",
    up:      "oklch(55% 0.13 150)",
    down:    "oklch(55% 0.17 25)",
    r:       6,
    rLg:     10,
    sans:    '"Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
    mono:    '"Geist Mono", ui-monospace, "SF Mono", Menlo, monospace',
  };

  const styles = {
    container: {
      backgroundColor: T.paper,
      fontFamily: T.sans,
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column" as const,
    },
    maxWidth: {
      width: "100%",
      maxWidth: "100%",
      padding: "18px",
      flex: "1",
      display: "flex",
      flexDirection: "column" as const,
      overflow: "hidden",
    },
    header: {
      backgroundColor: T.panel,
      borderRadius: "10px",
      padding: "20px",
      marginBottom: "16px",
      border: `1px solid ${T.divider}`,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap" as const,
      gap: "16px",
    },
    headerLeft: {
      display: "flex",
      alignItems: "center",
      gap: "16px",
    },
    companyName: {
      fontSize: "24px",
      fontWeight: "600",
      color: T.ink,
      margin: "0",
      letterSpacing: "-0.4px",
    },
    formerName: {
      marginTop: "2px",
      fontSize: "12px",
      color: T.muted,
    },
    headerRight: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    scoreBadge: {
      backgroundColor: T.inset,
      color: T.body,
      padding: "2px 8px",
      borderRadius: "4px",
      fontSize: "11.5px",
      fontWeight: "500",
      border: `1px solid ${T.divider}`,
    },
    reportButton: {
      backgroundColor: T.emerald,
      color: "white",
      border: "none",
      padding: "7px 14px",
      borderRadius: "6px",
      fontSize: "12.5px",
      fontWeight: "600",
      cursor: "pointer",
      textDecoration: "none",
    },
    exportMenuItem: {
      width: "100%",
      padding: "10px 12px",
      backgroundColor: "transparent",
      border: "none",
      color: T.body,
      cursor: "pointer",
      display: "block",
      fontSize: "13px",
      fontWeight: 500,
      textAlign: "left" as const,
    },

    card: {
      backgroundColor: T.panel,
      borderRadius: `${T.rLg}px`,
      overflow: "hidden",
      border: `1px solid ${T.divider}`,
      minWidth: 0,
    },
    cardHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "14px 16px 12px",
      borderBottom: `1px solid ${T.hair}`,
    },
    cardHeaderTitle: {
      fontFamily: T.sans,
      fontSize: "13.5px",
      fontWeight: 600,
      color: T.ink,
    },
    cardArrow: {
      fontSize: "14px",
      color: T.azure,
      fontWeight: 500,
      cursor: "pointer",
      lineHeight: 1,
      padding: "2px 4px",
    },
    sectionTitle: {
      fontSize: "13.5px",
      fontWeight: "600",
      color: T.ink,
      marginBottom: "0",
      marginTop: "0",
    },
    infoRow: {
      display: "grid",
      gridTemplateColumns: "120px 1fr",
      columnGap: "10px",
      alignItems: "start",
      padding: "7px 0",
      borderBottom: `1px solid ${T.hair}`,
      fontSize: "12.5px",
    },
    infoRowLast: {
      display: "grid",
      gridTemplateColumns: "120px 1fr",
      columnGap: "10px",
      alignItems: "flex-start",
      padding: "7px 0",
      borderBottom: "none",
      fontSize: "12.5px",
    },
    /** Right-rail metric values — matches CompanyProfile KV mono column */
    v3RailValue: {
      fontSize: "12.5px",
      color: T.body,
      fontWeight: "400",
      textAlign: "left" as const,
      marginLeft: "0",
      fontFamily: T.mono,
      fontVariantNumeric: "tabular-nums",
      wordBreak: "break-word" as const,
      overflowWrap: "break-word" as const,
    },
    v3RailHeadlineCount: {
      fontSize: "26px",
      fontWeight: 600,
      color: T.ink,
      marginBottom: "8px",
      fontVariantNumeric: "tabular-nums",
      letterSpacing: "-0.3px",
      lineHeight: 1.2,
    },
    /** Financial tab rows — label left, value right (full width), matches design mocks */
    v3TabFinRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      gap: 16,
      width: "100%",
      minWidth: 0,
      padding: "10px 0",
      borderBottom: `1px solid ${T.hair}`,
      fontSize: "12.5px",
      boxSizing: "border-box" as const,
    },
    label: {
      fontSize: "12.5px",
      color: T.muted,
      fontWeight: "400",
    },
    value: {
      fontSize: "12.5px",
      color: T.body,
      fontWeight: "400",
      textAlign: "left" as const,
      marginLeft: "0",
      wordBreak: "break-word" as const,
      overflowWrap: "break-word" as const,
    },
    sourceValue: {
      display: "none",
    },
    link: {
      color: T.azure,
      textDecoration: "none",
      cursor: "pointer",
    },
    description: {
      fontSize: "13.5px",
      color: T.body,
      lineHeight: "1.65",
    },
    chartContainer: {
      marginTop: "20px",
      overflow: "hidden",
    },
    chartTitle: {
      fontSize: "12px",
      fontWeight: "500",
      color: T.muted,
      marginBottom: "8px",
      textTransform: "uppercase" as const,
      letterSpacing: "0.5px",
    },
    currentCount: {
      fontSize: "22px",
      fontWeight: "600",
      color: T.ink,
      marginBottom: "12px",
      fontVariantNumeric: "tabular-nums",
      letterSpacing: "-0.3px",
    },
    financialTabs: {
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      borderBottom: `1px solid ${T.hair}`,
      backgroundColor: T.panel,
    },
    financialTab: {
      appearance: "none" as const,
      border: "none",
      borderRight: `1px solid ${T.hair}`,
      backgroundColor: "transparent",
      color: T.muted,
      cursor: "pointer",
      fontFamily: T.sans,
      fontSize: "12px",
      fontWeight: 500,
      padding: "11px 8px",
      lineHeight: 1.2,
    },
    financialTabActive: {
      color: T.ink,
      backgroundColor: T.inset,
      boxShadow: `inset 0 -2px 0 ${T.azure}`,
    },
    productMixHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 14px 0 8px",
      borderBottom: `1px solid ${T.hair}`,
      backgroundColor: T.panel,
      minHeight: 44,
    },
    productMixTabInner: {
      display: "flex",
      flex: 1,
      alignItems: "stretch",
      gap: 0,
    },
    productMixTabButton: {
      appearance: "none" as const,
      border: "none",
      background: "none",
      cursor: "pointer",
      fontFamily: T.sans,
      fontSize: "12.5px",
      fontWeight: 500,
      color: T.muted,
      padding: "12px 14px 10px",
      lineHeight: 1.2,
      borderBottom: "2px solid transparent",
      marginBottom: -1,
    },
    productMixTabButtonActive: {
      color: T.ink,
      borderBottomColor: T.ink,
    },
    emptyState: {
      color: T.muted,
      fontSize: "12.5px",
      lineHeight: "1.5",
      padding: "12px 0",
    },
    linkedinLink: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      color: T.azure,
      textDecoration: "none",
      fontSize: "13px",
      fontWeight: "500",
    },
    tagContainer: {
      display: "flex",
      flexWrap: "wrap" as const,
      gap: "4px",
    },
    sectorTag: {
      backgroundColor: T.coralSoft,
      color: T.coral,
      padding: "2px 8px",
      borderRadius: "4px",
      fontSize: "11.5px",
      fontWeight: "500",
      cursor: "pointer",
      transition: "opacity 0.15s ease",
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      border: "1px solid transparent",
      whiteSpace: "nowrap" as const,
      lineHeight: 1.5,
    },
    sectorTagSecondary: {
      backgroundColor: T.lavenderSoft,
      color: T.lavender,
      padding: "2px 8px",
      borderRadius: "4px",
      fontSize: "11.5px",
      fontWeight: "500",
      cursor: "pointer",
      transition: "opacity 0.15s ease",
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      border: "1px solid transparent",
      whiteSpace: "nowrap" as const,
      lineHeight: 1.5,
    },
    companyTag: {
      backgroundColor: T.azureSoft,
      color: T.azure,
      padding: "2px 8px",
      borderRadius: "4px",
      fontSize: "11.5px",
      fontWeight: "500",
      cursor: "pointer",
      transition: "opacity 0.15s ease",
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      border: "1px solid transparent",
      whiteSpace: "nowrap" as const,
      lineHeight: 1.5,
    },
    responsiveGrid: {
      display: "grid",
      gridTemplateColumns: "minmax(0, 1fr) 440px",
      gap: "18px",
      flex: "1",
      maxWidth: "100%",
      overflow: "hidden",
      alignItems: "start",
    },
    "@media (max-width: 768px)": {
      responsiveGrid: {
        gridTemplateColumns: "1fr",
        gap: "12px",
        maxWidth: "100%",
        overflow: "hidden",
      },
      header: {
        flexDirection: "column",
        alignItems: "flex-start",
        padding: "12px 14px",
        gap: "10px",
      },
      headerLeft: {
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "10px",
        width: "100%",
      },
      headerRight: {
        alignSelf: "stretch",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "6px",
      },
      maxWidth: {
        padding: "12px 4px",
      },
      card: {
        borderRadius: "8px",
      },
      companyName: {
        fontSize: "20px",
        lineHeight: "1.3",
      },
      formerName: {
        fontSize: "11px",
      },
      sectionTitle: {
        fontSize: "13px",
      },
      infoRow: {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "1px",
        padding: "6px 0",
        width: "100%",
      },
      label: {
        fontSize: "11px",
        color: T.faint,
        fontWeight: "500",
        minWidth: "auto",
        marginBottom: "1px",
      },
      value: {
        fontSize: "12.5px",
        textAlign: "left",
        marginLeft: "0",
        lineHeight: "1.4",
        wordBreak: "break-word" as const,
        overflowWrap: "break-word" as const,
        width: "100%",
      },
      description: {
        fontSize: "13px",
        lineHeight: "1.6",
      },
      chartTitle: {
        fontSize: "11px",
        marginBottom: "8px",
      },
      currentCount: {
        fontSize: "20px",
        marginBottom: "10px",
      },
      scoreBadge: {
        fontSize: "11px",
        padding: "2px 6px",
      },
      reportButton: {
        fontSize: "12px",
        padding: "6px 12px",
      },
      linkedinLink: {
        fontSize: "12.5px",
        justifyContent: "center",
        padding: "10px",
        backgroundColor: T.inset,
        borderRadius: "8px",
        width: "100%",
      },
      chartContainer: {
        marginTop: "16px",
        overflow: "hidden",
        padding: "0 6px",
        width: "100%",
        display: "none",
      },
      mobileChartSection: {
        display: "block",
      },
    },
  };

  const mixBarColors = [
    T.azure,
    T.lavender,
    T.coral,
    "oklch(72% 0.14 65)",
    T.emerald,
    T.muted,
  ];

  const productUsersSegments = (() => {
    const raw = company.product_users;
    if (Array.isArray(raw)) {
      return raw.map((x) => String(x).trim()).filter(Boolean);
    }
    if (typeof raw === "string" && raw.trim()) {
      try {
        const j = JSON.parse(raw) as unknown;
        if (Array.isArray(j)) {
          return j.map((x) => String(x).trim()).filter(Boolean);
        }
      } catch {
        /* fall through */
      }
      return raw
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [...PRODUCT_USERS_DEMO];
  })();

  const productTypeBarRows =
    productTypeRows.length > 0
      ? productTypeRows.map((row, i) => {
          const rawPct = parsePercentToken(row.value);
          const pct = Math.min(100, Math.max(0, rawPct ?? 0));
          const displayRight =
            row.value.includes("%") && row.value.trim()
              ? row.value.trim()
              : rawPct !== null
                ? `${Math.round(rawPct)}%`
                : `${Math.round(pct)}%`;
          return {
            label: row.label,
            pct,
            displayRight,
            color: mixBarColors[i % mixBarColors.length],
          };
        })
      : PRODUCT_MIX_DEMO_ROWS.map((r, i) => ({
          label: r.label,
          pct: r.pct,
          displayRight: `${r.pct}%`,
          color: mixBarColors[i % mixBarColors.length],
        }));

  const dataCollectionBarRows =
    dataCollectionMethodRows.length > 0
      ? dataCollectionMethodRows.map((row, i) => {
          const parsed = parsePercentToken(row.value);
          const pct = Math.min(
            100,
            Math.max(
              0,
              parsed ??
                predominanceBarWidth(
                  row.value,
                  i,
                  dataCollectionMethodRows.length
                )
            )
          );
          const displayRight =
            parsed !== null ? `${Math.round(parsed)}%` : row.value;
          return {
            label: row.label,
            pct,
            displayRight,
            color: mixBarColors[i % mixBarColors.length],
          };
        })
      : DATA_COLLECTION_MIX_DEMO.map((r, i) => ({
          label: r.label,
          pct: r.pct,
          displayRight: r.displayRight,
          color: mixBarColors[i % mixBarColors.length],
        }));

  const responsiveCss = `
    .company-detail-page { overflow-x: hidden; }
    .responsiveGrid { display: grid; grid-template-columns: minmax(0, 1fr) 440px; gap: 18px; max-width: 100%; align-items: start; }
    .responsiveGrid > * { min-width: 0; }
    .card { background: ${T.panel}; border-radius: ${T.rLg}px; min-width: 0; border: 1px solid ${T.divider}; }
    /* insights-summary-card grid-column set via inline style */
    .transaction-status-pill {
      display: inline-flex;
      align-items: center;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 100%;
    }
    .overview-card .info-row { grid-template-columns: 120px 1fr !important; }
    .overview-card .info-label { width: auto !important; }
    /* Hover tooltips for metric values using title attribute */
    .desktop-financial-metrics span[title],
    .mobile-financial-metrics span[title] {
      position: relative;
      cursor: help;
    }
    .desktop-financial-metrics span[title]:hover::after,
    .mobile-financial-metrics span[title]:hover::after {
      content: attr(title);
      position: absolute;
      left: 0;
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
    .desktop-financial-metrics span[title]:hover::before,
    .mobile-financial-metrics span[title]:hover::before {
      content: '';
      position: absolute;
      left: 8px;
      bottom: calc(100% - 2px);
      border: 6px solid transparent;
      border-top-color: rgba(17, 24, 39, 0.95);
      z-index: 21;
      pointer-events: none;
    }
    /* Tighter rows inside Financial Metrics */
    .desktop-financial-metrics .info-row {
      padding: 6px 0 !important;
      grid-template-columns: minmax(150px, 170px) minmax(0, 1fr) auto !important;
      column-gap: 12px !important;
    }
    .desktop-financial-metrics .info-row > :nth-child(2) {
      min-width: 0;
    }
    .mobile-financial-metrics .info-row {
      padding: 6px 0 !important;
      grid-template-columns: minmax(150px, 170px) minmax(0, 1fr) auto !important;
      column-gap: 12px !important;
    }
    .mobile-financial-metrics .info-row > :nth-child(2) {
      min-width: 0;
    }
    /* Corporate Events styles (mirrors corporate-events list page) */
    .corporate-event-table { width: 100%; background: #fff; padding: 20px 24px; box-shadow: 0px 1px 3px 0px rgba(227, 228, 230, 1); border-radius: 16px; border-collapse: collapse; table-layout: fixed; }
    .corporate-event-table th, .corporate-event-table td { padding: 12px; text-align: left; vertical-align: top; border-bottom: 1px solid #e2e8f0; word-wrap: break-word; overflow-wrap: break-word; font-size: 14px; }
    .corporate-event-table th { font-weight: 600; color: #1a202c; background: #f9fafb; border-bottom: 2px solid #e2e8f0; }
    .corporate-event-name { color: #0075df; text-decoration: underline; cursor: pointer; font-weight: 500; transition: color 0.2s; }
    .corporate-event-name:hover { color: #005bb5; }
    .link-blue { color: #0075df; text-decoration: underline; cursor: pointer; font-weight: 500; }
    .link-blue:hover { color: #005bb5; }
    .muted-row { font-size: 12px; color: #4a5568; margin: 4px 0; }
    .pill { display: inline-block; padding: 2px 8px; font-size: 12px; border-radius: 999px; font-weight: 600; }
    .pill-blue { background-color: #e6f0ff; color: #1d4ed8; }
    .pill-green { background-color: #dcfce7; color: #15803d; }
    .management-profile-row:hover {
      background-color: ${T.inset};
    }
    /* Insights & Analysis responsive grid */
    .insights-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    @media (max-width: 768px) {
      .company-detail-content { padding: 16px 0 !important; }
      .insights-grid {
        grid-template-columns: 1fr !important;
        gap: 12px !important;
      }
      .responsiveGrid { grid-template-columns: 1fr !important; gap: 12px !important; max-width: 100% !important; }
      .insights-summary-card { grid-column: 1 / -1 !important; }
      .desktop-financial-metrics { display: none !important; }
      .mobile-financial-metrics { display: block !important; }
      .desktop-linkedin-section { display: none !important; }
      .overview-card .info-row { padding: 8px 0 !important; display: block !important; }
      .overview-card .info-label { font-size: 12px !important; color: #718096 !important; margin-bottom: 2px !important; }
      .overview-card .info-value { font-size: 13px !important; line-height: 1.35 !important; display: block !important; margin-left: 0 !important; word-break: break-word !important; overflow-wrap: break-word !important; }
      .overview-card { padding: 14px 8px !important; }
      .overview-grid { grid-template-columns: 1fr !important; }
      .overview-description { order: 2; margin-top: 16px !important; }
      .overview-fields { order: 1; }
      .product-mix-users-row { grid-template-columns: 1fr !important; gap: 12px !important; }
    }
  `;

  return (
    <div className="company-detail-page" style={styles.container}>
      <Header />

      {/* ── Company profile header bar ── */}
      <div style={{ backgroundColor: T.paper, borderBottom: `1px solid ${T.divider}`, padding: "0 24px" }}>
        {/* Top row: logo + name + badges + actions */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap" as const, gap: "12px", padding: "22px 0 16px",
        }}>
          {/* Left: logo, name, badges */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", minWidth: 0, flex: 1 }}>
                  <CompanyLogo
                    logo={company._linkedin_data_of_new_company?.linkedin_logo}
                    name={company.name}
                  />
                  <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap" as const, gap: "8px" }}>
                <span style={{
                  fontSize: "24px", fontWeight: 600, color: T.ink,
                  letterSpacing: "-0.4px", lineHeight: 1.2, fontFamily: T.sans,
                }}>
                      {company.name}
                </span>
                {tickerDisplay && (
                  <span style={{
                    display: "inline-flex", alignItems: "center",
                    fontSize: "11.5px", fontWeight: 500, color: T.body,
                    backgroundColor: T.inset, border: `1px solid ${T.divider}`,
                    borderRadius: "4px", padding: "2px 8px",
                    whiteSpace: "nowrap" as const, lineHeight: 1.5,
                  }}>
                    {tickerDisplay}
                  </span>
                )}
                {ownershipLabel && (
                  <span style={{
                    display: "inline-flex", alignItems: "center",
                    fontSize: "11.5px", fontWeight: 500,
                    color: T.emerald, backgroundColor: T.emeraldSoft,
                    border: "1px solid transparent",
                    borderRadius: "4px", padding: "2px 8px",
                    whiteSpace: "nowrap" as const, lineHeight: 1.5,
                  }}>
                    {ownershipLabel}
                  </span>
                )}
                {lifecycleLabel && (
                  <span style={{
                    display: "inline-flex", alignItems: "center",
                    fontSize: "11.5px", fontWeight: 500, color: T.muted,
                    backgroundColor: "transparent", border: `1px solid ${T.divider}`,
                    borderRadius: "4px", padding: "2px 8px",
                    whiteSpace: "nowrap" as const, lineHeight: 1.5,
                  }}>
                    {lifecycleLabel}
                  </span>
                )}
                    </div>
                    {formerNameDisplay && (
                <div style={{ fontSize: "12px", color: T.muted, marginTop: "3px", fontFamily: T.sans }}>
                  Formerly {formerNameDisplay}
                      </div>
                    )}
                  </div>
                </div>

          {/* Right: action buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" as const }}>
                  {companyId && !Number.isNaN(Number(companyId)) && (
                    <FollowButton
                      followKey="followed_companies"
                      entityId={Number(companyId)}
                      label="Company"
                    />
                  )}
            <div ref={pdfExportMenuRef} style={{ position: "relative", display: "inline-block" }}>
                    <button
                      type="button"
                onClick={() => setShowPdfExportOptions((current) => !current)}
                      disabled={exportingPdf || !company?.id}
                      aria-haspopup="menu"
                      aria-expanded={showPdfExportOptions}
                      style={{
                  display: "inline-flex", alignItems: "center", gap: "5px",
                  fontFamily: T.sans, fontSize: "12.5px", fontWeight: 600,
                  color: "#fff",
                  backgroundColor: exportingPdf ? T.faint : T.azure,
                  border: "none", borderRadius: "6px",
                  padding: "8px 14px",
                  cursor: exportingPdf || !company?.id ? "not-allowed" : "pointer",
                      }}
                    >
                      {exportingPdf
                        ? exportingPdfType === "financial_metrics"
                          ? "Exporting Metrics..."
                          : "Exporting..."
                        : "Export PDF"}
                    </button>
                    {showPdfExportOptions && !exportingPdf && company?.id && (
                      <div
                        role="menu"
                        style={{
                    position: "absolute", right: 0, top: "calc(100% + 6px)",
                    zIndex: 30, minWidth: "220px", padding: "6px",
                    backgroundColor: T.panel, border: `1px solid ${T.divider}`,
                          borderRadius: "8px",
                    boxShadow: "0 10px 20px rgba(15,17,21,0.12)",
                        }}
                      >
                        <button
                    type="button" role="menuitem"
                          onClick={() => handleExportPdf("profile")}
                    style={{ ...styles.exportMenuItem, borderBottom: `1px solid ${T.hair}` }}
                        >
                          Export Whole Profile
                        </button>
                        <button
                    type="button" role="menuitem"
                          onClick={() => handleExportPdf("financial_metrics")}
                          style={styles.exportMenuItem}
                        >
                          Export Financial Metrics
                        </button>
                      </div>
                    )}
                  </div>
                  <a
                    href="mailto:asymmetrix@asymmetrixintelligence.com?subject=Report%20Incorrect%20Company%20Data&body=Please%20describe%20the%20issue%20you%20found."
                    target="_blank"
                    rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center",
                fontFamily: T.sans, fontSize: "12.5px", fontWeight: 600,
                color: "#fff", backgroundColor: T.emerald,
                borderRadius: "6px", padding: "8px 14px",
                textDecoration: "none",
              }}
                  >
                    Contribute Data
                  </a>
                </div>
              </div>

        {/* Navigation tabs */}
        <div style={{ display: "flex", gap: "2px", overflowX: "auto" as const, scrollbarWidth: "none" as const }}>
          {[
            "Summary", "Products", "Methodology", "People",
            "Financials", "Insights", "Deals", "Ownership", "Market",
          ].map((tab) => {
            const active = tab === "Summary";
            return (
              <div
                key={tab}
                style={{
                  padding: "10px 14px",
                  fontFamily: T.sans, fontSize: "13px",
                  fontWeight: active ? 600 : 500,
                  color: active ? T.ink : T.muted,
                  borderBottom: `2px solid ${active ? T.azure : "transparent"}`,
                  marginBottom: "-1px",
                  cursor: "pointer",
                  whiteSpace: "nowrap" as const,
                  transition: "color 120ms",
                }}
              >
                {tab}
                    </div>
            );
          })}
                  </div>
      </div>

      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="company-detail-content" style={styles.maxWidth}>
          {/* Desktop grid */}
          <div style={styles.responsiveGrid} className="responsiveGrid">
            {/* ══ LEFT COLUMN ══ */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 }}>

            {/* Row 1: Overview + Description side by side */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

            {/* ── Overview card ── */}
            <div style={{ ...styles.card, alignSelf: "start" }} className="card overview-card">
              <div style={styles.cardHeader}>
                <span style={styles.cardHeaderTitle}>Overview</span>
                <span style={styles.cardArrow}>→</span>
              </div>
              <div style={{ padding: "4px 16px 12px" }} className="overview-fields">
              {transactionStatusLabel && (
                <div style={{ ...styles.infoRow, gridTemplateColumns: "auto 1fr" }} className="info-row">
                  <span style={styles.label} className="info-label">Transaction status</span>
                  <div style={{ ...styles.value, display: "flex", alignItems: "center" }} className="info-value">
                    <span style={{
                      display: "inline-flex", alignItems: "center", fontSize: "11.5px",
                      fontWeight: 500, color: T.up, backgroundColor: "oklch(95% 0.05 150)",
                      border: "1px solid transparent", borderRadius: "4px",
                      padding: "2px 8px", lineHeight: 1.5,
                    }}>
                      {transactionStatusDisplayLabel}
                    </span>
                  </div>
                </div>
              )}
              <div style={styles.infoRow} className="info-row">
                <span style={styles.label} className="info-label">
                  Primary sector(s)
                </span>
                <div style={styles.value} className="info-value">
                  {augmentedPrimarySectors.length > 0 ? (
                    <>
                      <div style={styles.tagContainer}>
                        {(showAllPrimarySectors
                          ? augmentedPrimarySectors
                          : augmentedPrimarySectors.slice(0, OVERVIEW_TAG_CAP)
                        ).map((sector) => {
                          if (!sector || !sector.sector_name) return null;
                          const id = getSectorId(sector);
                          if (id) {
                            return (
                              <Link
                                key={`sector-${id}`}
                                href={`/sector/${id}`}
                                style={styles.sectorTag}
                                prefetch={false}
                              >
                                {sector.sector_name}
                              </Link>
                            );
                          }
                          return (
                            <span
                              key={`sector-${sector.sector_name}`}
                              style={styles.sectorTag}
                            >
                              {sector.sector_name}
                            </span>
                          );
                        })}
                        {!showAllPrimarySectors &&
                        augmentedPrimarySectors.length > OVERVIEW_TAG_CAP ? (
                          <button
                            type="button"
                            onClick={() => setShowAllPrimarySectors(true)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              borderRadius: "4px",
                              fontSize: "11.5px",
                              fontWeight: 500,
                              lineHeight: 1.5,
                              padding: "2px 8px",
                              backgroundColor: T.inset,
                              color: T.muted,
                              border: "1px solid transparent",
                              cursor: "pointer",
                            }}
                          >
                            +
                            {augmentedPrimarySectors.length - OVERVIEW_TAG_CAP}
                          </button>
                        ) : null}
                      </div>
                      {showAllPrimarySectors &&
                      augmentedPrimarySectors.length > OVERVIEW_TAG_CAP ? (
                        <button
                          type="button"
                          onClick={() => setShowAllPrimarySectors(false)}
                          style={{
                            background: "none",
                            border: "none",
                            color: T.azure,
                            cursor: "pointer",
                            fontSize: "11.5px",
                            marginTop: "4px",
                            padding: 0,
                          }}
                        >
                          Show less
                        </button>
                      ) : null}
                    </>
                  ) : (
                    EM_DASH
                  )}
                </div>
              </div>
              <div style={styles.infoRow} className="info-row">
                <span style={styles.label} className="info-label">
                  Secondary sector(s)
                </span>
                <div style={styles.value} className="info-value">
                  {secondarySectors.length > 0 ? (
                    <>
                      <div style={styles.tagContainer}>
                        {(showAllSecondarySectors
                          ? secondarySectors
                          : secondarySectors.slice(0, OVERVIEW_TAG_CAP)
                        ).map((sector) => {
                          if (!sector || !sector.sector_name) return null;
                          const id = getSectorId(sector);
                          if (id) {
                            return (
                              <Link
                                key={`sub-sector-${id}`}
                                href={`/sub-sector/${id}`}
                                style={styles.sectorTagSecondary}
                                prefetch={false}
                              >
                                {sector.sector_name}
                              </Link>
                            );
                          }
                          return (
                            <span
                              key={`sub-sector-${sector.sector_name}`}
                              style={styles.sectorTagSecondary}
                            >
                              {sector.sector_name}
                            </span>
                          );
                        })}
                        {!showAllSecondarySectors &&
                        secondarySectors.length > OVERVIEW_TAG_CAP ? (
                          <button
                            type="button"
                            onClick={() => setShowAllSecondarySectors(true)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              borderRadius: "4px",
                              fontSize: "11.5px",
                              fontWeight: 500,
                              lineHeight: 1.5,
                              padding: "2px 8px",
                              backgroundColor: T.inset,
                              color: T.muted,
                              border: "1px solid transparent",
                              cursor: "pointer",
                            }}
                          >
                            +{secondarySectors.length - OVERVIEW_TAG_CAP}
                          </button>
                        ) : null}
                      </div>
                      {showAllSecondarySectors &&
                      secondarySectors.length > OVERVIEW_TAG_CAP ? (
                        <button
                          type="button"
                          onClick={() => setShowAllSecondarySectors(false)}
                          style={{
                            background: "none",
                            border: "none",
                            color: T.azure,
                            cursor: "pointer",
                            fontSize: "11.5px",
                            marginTop: "4px",
                            padding: 0,
                          }}
                        >
                          Show less
                        </button>
                      ) : null}
                    </>
                  ) : (
                    EM_DASH
                  )}
                </div>
              </div>
              <div style={styles.infoRow} className="info-row">
                <span style={styles.label} className="info-label">
                  Year founded
                </span>
                <span style={styles.value} className="info-value">
                  {getYearFoundedDisplay(company)}
                </span>
              </div>
              <div style={styles.infoRow} className="info-row">
                <span style={styles.label} className="info-label">
                  Website
                </span>
                <span style={styles.value} className="info-value">
                  {company.url?.trim() ? (
                    <a
                      href={
                        /^https?:\/\//i.test(company.url.trim())
                          ? company.url.trim()
                          : `https://${company.url.trim()}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ ...styles.link, textDecoration: "none" }}
                    >
                      {formatWebsiteDisplayLabel(company.url)}
                    </a>
                  ) : (
                    EM_DASH
                  )}
                </span>
              </div>
              <div style={styles.infoRow} className="info-row">
                <span style={styles.label} className="info-label">
                  Ownership
                </span>
                <span style={styles.value} className="info-value">
                  {company._ownership_type?.ownership?.trim() || EM_DASH}
                </span>
              </div>
              <div style={styles.infoRow} className="info-row">
                <span style={styles.label} className="info-label">
                  HQ
                </span>
                <span style={styles.value} className="info-value">
                  {fullAddress?.trim() || EM_DASH}
                </span>
              </div>
              <div style={styles.infoRow} className="info-row">
                <span style={styles.label} className="info-label">
                  Lifecycle stage
                </span>
                <span style={styles.value} className="info-value">
                  {company.Lifecycle_stage?.Lifecycle_Stage?.trim() || EM_DASH}
                </span>
              </div>
              <div style={styles.infoRow} className="info-row">
                <span style={styles.label} className="info-label">
                  Total amount raised
                </span>
                <span style={styles.value} className="info-value">
                  {totalAmountRaisedDisplay ?? EM_DASH}
                </span>
              </div>
              <div style={styles.infoRow} className="info-row">
                <span style={styles.label} className="info-label">
                  Employees
                </span>
                <div
                  style={{
                    ...styles.value,
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "6px",
                  }}
                  className="info-value"
                >
                  {overviewHeadcount != null ? (
                    <>
                      <span>
                        {overviewHeadcount.toLocaleString("en-US")}
                      </span>
                      {overviewEmployeesYoY ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            fontSize: "11.5px",
                            fontWeight: 500,
                            color: overviewEmployeesYoY.trim().startsWith("-")
                              ? T.down
                              : T.up,
                            backgroundColor:
                              overviewEmployeesYoY.trim().startsWith("-")
                                ? "oklch(95% 0.04 25)"
                                : "oklch(95% 0.05 150)",
                            border: "1px solid transparent",
                            borderRadius: "4px",
                            padding: "2px 8px",
                            lineHeight: 1.5,
                          }}
                        >
                          {overviewEmployeesYoY}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    EM_DASH
                  )}
                </div>
              </div>
              {haveParentCompany && (
                <div style={styles.infoRow} className="info-row">
                  <span style={styles.label} className="info-label">
                    Parent company
                  </span>
                  <div style={styles.value} className="info-value">
                    {(() => {
                      const parent =
                        company.have_parent_company!.Parant_companies![0];
                      const parentId = parent?.id;
                      const parentName = (parent?.name || "").trim();
                      if (parentId && parentName) {
                        return (
                          <div style={styles.tagContainer}>
                            <Link
                              href={`/new_company/${parentId}`}
                              style={styles.companyTag}
                              prefetch={false}
                            >
                              {parentName}
                            </Link>
                          </div>
                        );
                      }
                      return parentName || EM_DASH;
                    })()}
                  </div>
                </div>
              )}
              {/* Investors — hide if parent company exists */}
              {!haveParentCompany && (
                <>
                  <div style={styles.infoRow} className="info-row">
                    <span style={styles.label} className="info-label">
                      Investors
                    </span>
                    <div style={styles.value} className="info-value">
                      {(() => {
                        if (apiInvestorsLoading) {
                          return "Loading...";
                        }
                        if (apiInvestors.length > 0) {
                          const validApiInvestors = apiInvestors.filter(
                            (investor) =>
                              investor &&
                              typeof investor.investor_id === "number" &&
                              investor.investor_name
                          );
                          if (validApiInvestors.length > 0) {
                            return (
                              <div style={styles.tagContainer}>
                                {validApiInvestors.map((investor) => (
                                  <Link
                                    key={`api-investor-${investor.investor_id}`}
                                    href={`/investors/${investor.investor_id}`}
                                    style={styles.companyTag}
                                    prefetch={false}
                                  >
                                    {investor.investor_name}
                                  </Link>
                                ))}
                              </div>
                            );
                          }
                        }
                        return EM_DASH;
                      })()}
                    </div>
                  </div>
                  <div style={styles.infoRow} className="info-row">
                    <span style={styles.label} className="info-label">
                      Years since last investment
                    </span>
                    <div style={styles.value} className="info-value">
                      {formatLastInvestmentDisplay(company.last_investment)}
                    </div>
                  </div>
                </>
              )}
              </div>{/* end overview-fields padding */}
            </div>{/* end overview card */}

            {/* ── Description card ── */}
            <div style={{ ...styles.card, alignSelf: "start" }} className="overview-description">
              <div style={styles.cardHeader}>
                <span style={styles.cardHeaderTitle}>Description</span>
                <span style={styles.cardArrow}>→</span>
                    </div>
              <div style={{ padding: "14px 16px 16px" }}>
                    <div>
                    <div
                      ref={descriptionRef}
                      style={{
                        fontSize: "13.5px",
                        color: T.body,
                        lineHeight: "1.65",
                        textAlign: "justify" as const,
                        overflow: "hidden",
                        display: isDescriptionExpanded ? "block" : "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: isDescriptionExpanded ? "unset" : 8,
                      }}
                    >
                      {company.description?.trim() ? company.description.trim() : EM_DASH}
                    </div>
                    {isDescriptionExpandable && (
                      <button
                        onClick={() => setIsDescriptionExpanded((expanded) => !expanded)}
                        style={{
                          marginTop: "10px", padding: 0, border: "none",
                          background: "none", color: T.azure,
                          fontSize: "12.5px", fontWeight: 500, cursor: "pointer",
                        }}
                      >
                        {isDescriptionExpanded ? "Show less" : "Expand →"}
                      </button>
                    )}
                  </div>

                  {/* attribute sections moved to dedicated row below */}
                </div>
              </div>

            </div>{/* end Row 1: Overview + Description sub-grid */}

            {/* ── Row 2: Insights card ── */}
            <div
              style={{ ...styles.card }}
              className="card insights-summary-card"
            >
              <div style={styles.cardHeader}>
                <span style={styles.cardHeaderTitle}>
                  Recent insights &amp; analysis
                </span>
                <span
                      style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "12px",
                    color: T.muted,
                    fontSize: "12.5px",
                  }}
                >
                  {articlesLoading
                    ? "\u2026"
                    : insightTotalCount === 0
                      ? `${Math.min(INSIGHTS_PREVIEW_COUNT, INSIGHTS_EMPTY_STATE_DEMO_TOTAL)} of ${INSIGHTS_EMPTY_STATE_DEMO_TOTAL}`
                      : `${Math.min(
                          INSIGHTS_PREVIEW_COUNT,
                          insightTotalCount - insightsPageOffset
                        )} of ${insightTotalCount}`}
                  <span style={styles.cardArrow}>→</span>
                </span>
              </div>
              <div>
                {articlesLoading ? (
                  [1, 2].map((item) => (
                    <div
                      key={`insight-loading-${item}`}
                        style={{
                        display: "grid",
                        gridTemplateColumns: "150px 1fr",
                        gap: "12px",
                        padding: "16px 18px",
                        borderBottom: `1px solid ${T.hair}`,
                      }}
                    >
                            <div
                              style={{
                          height: "18px",
                          backgroundColor: T.inset,
                          borderRadius: "4px",
                        }}
                      />
                      <div
                        style={{
                          height: "36px",
                          backgroundColor: T.inset,
                          borderRadius: "4px",
                        }}
                      />
                            </div>
                  ))
                ) : insightTotalCount === 0 ? (
                  <>
                    {[
                      {
                        badge: "Company Update",
                        badgeStyle: {
                          backgroundColor: T.coralSoft,
                          color: T.coral,
                        },
                        date: "Apr 10, 2026",
                        body: "Morningstar reports strong Q1 driven by PitchBook and Indexes; management flagged accelerating demand for private-markets data and a disciplined approach to GenAI-driven research automation.",
                      },
                      {
                        badge: "Sector Analysis",
                        badgeStyle: {
                          backgroundColor: T.azureSoft,
                          color: T.azure,
                        },
                        date: "Mar 22, 2026",
                        body: "Private markets data vendors trade at premium multiples; Morningstar is increasingly viewed as a private-markets pure-play proxy via its PitchBook segment.",
                      },
                    ].map((row, idx) => (
                      <div
                        key={`insight-placeholder-${idx}`}
                                style={{
                          display: "grid",
                          gridTemplateColumns: "150px 1fr",
                          gap: "12px",
                          padding: "16px 18px",
                          borderBottom: `1px solid ${T.hair}`,
                        }}
                      >
                        <div>
                          <span
                                        style={{
                              ...row.badgeStyle,
                              display: "inline-flex",
                              alignItems: "center",
                              borderRadius: "4px",
                              fontSize: "11.5px",
                              fontWeight: 500,
                              lineHeight: 1.5,
                              padding: "2px 8px",
                            }}
                          >
                            {row.badge}
                          </span>
                          <div
                                        style={{
                              color: T.muted,
                              fontFamily: T.mono,
                              fontSize: "12px",
                              marginTop: "9px",
                            }}
                          >
                            {row.date}
                            </div>
                          </div>
                        <div>
                          <div
                      style={{
                              color: T.body,
                              fontSize: "13.5px",
                              lineHeight: 1.55,
                            }}
                          >
                            {row.body}
                      </div>
                      <div
                        style={{
                              color: T.azure,
                              fontSize: "12.5px",
                              fontWeight: 500,
                              marginTop: "8px",
                              opacity: 0.45,
                            }}
                          >
                            Open report →
                              </div>
                          </div>
                            </div>
                    ))}
                  </>
                ) : (
                  insightVisibleSlice.map((article) => {
                                const contentType = (article.Content_Type || "")
                                  .toLowerCase()
                                  .trim();
                                const badgeStyle =
                      contentType === "company analysis" ||
                      contentType === "company update"
                        ? { backgroundColor: T.coralSoft, color: T.coral }
                        : contentType === "sector analysis"
                                    ? {
                              backgroundColor: T.azureSoft,
                              color: T.azure,
                                      }
                                    : contentType === "deal analysis"
                                    ? {
                                backgroundColor: T.emeraldSoft,
                                color: T.emerald,
                              }
                            : {
                                backgroundColor: T.inset,
                                color: T.muted,
                              };
                                const dateLabel = (() => {
                                  if (!article.Publication_Date) return "";
                                  try {
                                    return new Date(
                                      article.Publication_Date
                                    ).toLocaleDateString("en-US", {
                          month: "short",
                                      day: "numeric",
                          year: "numeric",
                                    });
                                  } catch {
                                    return "";
                                  }
                                })();
                    const typeLabel = article.Content_Type?.trim()
                      ? formatInsightBadgeLabel(article.Content_Type.trim())
                      : "Sector Analysis";

                                return (
                      <Link
                                    key={article.id}
                                    href={`/article/${article.id}`}
                        prefetch={false}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "150px 1fr",
                          gap: "12px",
                          padding: "16px 18px",
                          borderBottom: `1px solid ${T.hair}`,
                          color: "inherit",
                          textDecoration: "none",
                        }}
                      >
                        <div>
                                        <span
                            style={{
                              ...badgeStyle,
                              display: "inline-flex",
                              alignItems: "center",
                              borderRadius: "4px",
                              fontSize: "11.5px",
                              fontWeight: 500,
                              lineHeight: 1.5,
                              padding: "2px 8px",
                            }}
                          >
                            {typeLabel}
                                        </span>
                          {dateLabel ? (
                            <div
                              style={{
                                color: T.muted,
                                fontFamily: T.mono,
                                fontSize: "12px",
                                marginTop: "9px",
                              }}
                            >
                              {dateLabel}
                            </div>
                          ) : (
                            <div
                              style={{
                                color: T.muted,
                                fontFamily: T.mono,
                                fontSize: "12px",
                                marginTop: "9px",
                              }}
                            >
                              {EM_DASH}
                            </div>
                          )}
                        </div>
                        <div>
                          <div
                            style={{
                              color: T.body,
                              fontSize: "13.5px",
                              lineHeight: 1.55,
                            }}
                          >
                            {[
                              article.Headline?.trim(),
                              article.Strapline?.trim(),
                            ]
                              .filter(Boolean)
                              .join(" ") || EM_DASH}
                          </div>
                          <div
                            style={{
                              color: T.azure,
                              fontSize: "12.5px",
                              fontWeight: 500,
                              marginTop: "8px",
                            }}
                          >
                            Open report →
                          </div>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 18px",
                  color: T.muted,
                  fontSize: "12.5px",
                  borderTop: `1px solid ${T.hair}`,
                }}
              >
                                        <span
                                          style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <button
                    type="button"
                    disabled={!canInsightPrev}
                    onClick={() =>
                      setInsightsPageOffset((o) =>
                        Math.max(0, o - INSIGHTS_PREVIEW_COUNT)
                      )
                    }
                    aria-label="Previous insights"
                    style={{
                      border: `1px solid ${T.hair}`,
                      background: T.panel,
                      borderRadius: "6px",
                      padding: "2px 10px",
                      cursor: canInsightPrev ? "pointer" : "default",
                      opacity: canInsightPrev ? 1 : 0.35,
                      color: T.body,
                      fontSize: "14px",
                      lineHeight: 1,
                    }}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    disabled={!canInsightNext}
                    onClick={() =>
                      setInsightsPageOffset((o) => {
                        const maxStart = Math.max(
                          0,
                          insightTotalCount - INSIGHTS_PREVIEW_COUNT
                        );
                        return Math.min(maxStart, o + INSIGHTS_PREVIEW_COUNT);
                      })
                    }
                    aria-label="Next insights"
                    style={{
                      border: `1px solid ${T.hair}`,
                      background: T.panel,
                      borderRadius: "6px",
                      padding: "2px 10px",
                      cursor: canInsightNext ? "pointer" : "default",
                      opacity: canInsightNext ? 1 : 0.35,
                      color: T.body,
                      fontSize: "14px",
                      lineHeight: 1,
                    }}
                  >
                    ›
                  </button>
                  <span>
                    {articlesLoading
                      ? EM_DASH
                      : insightTotalCount === 0
                        ? `Showing 1${RANGE_DASH}2 of ${INSIGHTS_EMPTY_STATE_DEMO_TOTAL}`
                        : `Showing ${insightsPageOffset + 1}${RANGE_DASH}${insightRangeEnd} of ${insightTotalCount}`}
                  </span>
                </span>
                <Link
                  href="/insights-analysis"
                  prefetch={false}
                  style={{
                    color: T.azure,
                    textDecoration: "none",
                    fontWeight: 500,
                  }}
                >
                  {articlesLoading
                    ? `Browse all ${EM_DASH} →`
                    : insightTotalCount === 0
                      ? `Browse all ${INSIGHTS_EMPTY_STATE_DEMO_TOTAL} →`
                      : `Browse all ${insightTotalCount} →`}
                </Link>
              </div>
            </div>

            {/* ── Row 3: Product mix (tabs) + Product & Users (V3 template) ── */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                gap: "16px",
              }}
              className="product-mix-users-row"
            >
              <div
                style={{
                  ...styles.card,
                  padding: 0,
                  overflow: "hidden",
                  alignSelf: "start",
                }}
              >
                <div style={styles.productMixHeader}>
                  <div style={styles.productMixTabInner}>
                    <button
                      type="button"
                      style={{
                        ...styles.productMixTabButton,
                        ...(activeProductMixTab === "product_type"
                          ? styles.productMixTabButtonActive
                          : {}),
                      }}
                      onClick={() => setActiveProductMixTab("product_type")}
                    >
                      Product type
                    </button>
                    <button
                      type="button"
                      style={{
                        ...styles.productMixTabButton,
                        ...(activeProductMixTab === "data_collection"
                          ? styles.productMixTabButtonActive
                          : {}),
                      }}
                      onClick={() => setActiveProductMixTab("data_collection")}
                    >
                      Data collection
                    </button>
                  </div>
                  <span style={styles.cardArrow}>→</span>
                </div>
                <div style={{ paddingBottom: "4px" }}>
                  {(activeProductMixTab === "product_type"
                    ? productTypeBarRows
                    : dataCollectionBarRows
                  ).map((row, idx, arr) => (
                    <div
                      key={`mix-${activeProductMixTab}-${row.label}-${idx}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "11px 16px",
                        borderBottom:
                          idx < arr.length - 1
                            ? `1px solid ${T.hair}`
                            : "none",
                      }}
                    >
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 2,
                          backgroundColor: row.color,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: "12.5px",
                          color: T.body,
                          width: 128,
                          flexShrink: 0,
                          lineHeight: 1.35,
                        }}
                      >
                        {row.label}
                                        </span>
                      <div
                        style={{
                          flex: 1,
                          height: 10,
                          backgroundColor: T.inset,
                          borderRadius: 999,
                          overflow: "hidden",
                          minWidth: 32,
                        }}
                      >
                        <div
                          style={{
                            width: `${row.pct}%`,
                            height: "100%",
                            backgroundColor: row.color,
                            borderRadius: 999,
                          }}
                        />
                      </div>
                      <span
                        style={{
                          width: 44,
                          flexShrink: 0,
                          textAlign: "right",
                          fontSize: "12.5px",
                          fontWeight: 600,
                          color: T.ink,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {row.displayRight}
                                        </span>
                                    </div>
                  ))}
                          </div>
                      </div>

              <div style={{ ...styles.card, alignSelf: "start", padding: 0 }}>
                <div style={styles.cardHeader}>
                  <span style={styles.cardHeaderTitle}>Product &amp; Users</span>
                  <span style={styles.cardArrow}>→</span>
                    </div>
                <div style={{ paddingBottom: "4px" }}>
                  {productUsersSegments.map((line, i, arr) => (
                    <div
                      key={`pu-${i}-${line.slice(0, 24)}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                        padding: "12px 16px",
                        borderBottom:
                          i < arr.length - 1 ? `1px solid ${T.hair}` : "none",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: 600,
                            color: T.muted,
                            width: 22,
                            flexShrink: 0,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {i + 1}.
                        </span>
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: 600,
                            color: T.ink,
                            lineHeight: 1.35,
                          }}
                        >
                          {line}
                        </span>
                </div>
                      <span
                        style={{
                          color: T.faint,
                          fontSize: "15px",
                          lineHeight: 1,
                          flexShrink: 0,
                        }}
                        aria-hidden
                      >
                        ›
                      </span>
              </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Corporate events (V3 card, directly under product mix / users) ── */}
            {(corporateEventsLoading || corporateEvents.length > 0) && (
            <div
              style={{
                ...styles.card,
                padding: 0,
                overflow: "hidden",
                marginBottom: "16px",
              }}
              className="corporate-events-v3-card"
            >
              <CorporateEventsProfilePanel
                tokens={{
                  paper: T.paper,
                  hair: T.hair,
                  ink: T.ink,
                  body: T.body,
                  muted: T.muted,
                  inset: T.inset,
                  azure: T.azure,
                  azureSoft: T.azureSoft,
                  coralSoft: T.coralSoft,
                  down: T.down,
                  sans: T.sans,
                  mono: T.mono,
                }}
                events={corporateEvents}
                loading={corporateEventsLoading}
                primarySectors={augmentedPrimarySectors}
                secondarySectors={secondarySectors}
                maxInitialEvents={3}
              />
            </div>
            )}

            {/* ── Subsidiaries ── */}
            {hasSubsidiaries && (
                <div
                  style={{
                    ...styles.card,
                    padding: 0,
                    overflow: "hidden",
                    marginBottom: "16px",
                  }}
                  className="subsidiaries-profile-card"
                >
                  <SubsidiariesProfilePanel
                    tokens={{
                      paper: T.paper,
                      hair: T.hair,
                      ink: T.ink,
                      body: T.body,
                      muted: T.muted,
                      inset: T.inset,
                      azure: T.azure,
                      azureSoft: T.azureSoft,
                      coralSoft: T.coralSoft,
                      down: T.down,
                      sans: T.sans,
                      mono: T.mono,
                      up: T.up,
                    }}
                    subsidiaries={
                      company.have_subsidiaries_companies
                        ?.Subsidiaries_companies ?? []
                    }
                    maxInitial={3}
                  />
                </div>
              )}

            </div>{/* ══ end LEFT COLUMN ══ */}

            {/* ══ RIGHT COLUMN: V3 stacked panels (Summary template) ══ */}
                  <div
                    style={{
                      display: "flex",
                flexDirection: "column",
                gap: 18,
                alignItems: "stretch",
                minWidth: 0,
                width: "100%",
              }}
              className="desktop-financial-metrics v3-right-rail"
            >
              {/* v3-desktop-financial-rail — single tabbed card */}
              <V3TabbedFinanceCard
                chrome={{
                  card: styles.card,
                  cardArrow: styles.cardArrow,
                }}
                tokens={{
                  hair: T.hair,
                  ink: T.ink,
                  muted: T.muted,
                  sans: T.sans,
                }}
                activeTab={financeRailTab}
                onTabChange={setFinanceRailTab}
                tabs={[
                  {
                    id: "financial",
                    label: `Financial metrics${metricsCurrencySuffix}`,
                  },
                  { id: "benchmark", label: "Benchmark vs peers" },
                  { id: "income", label: "Income statement" },
                ]}
                bodyStyle={
                  financeRailTab === "income" && hasIncomeStatementData
                    ? { padding: "0 16px 4px" }
                    : undefined
                }
              >
              {financeRailTab === "financial" && (
              <div style={{ width: "100%", minWidth: 0 }}>
              {financialMetricsPeriodDisplay && (
                <div
                      style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(180px, 220px) 1fr auto",
                    marginTop: "-12px",
                    marginBottom: "4px",
                    fontSize: "13px",
                    color: T.muted,
                    fontWeight: 500,
                  }}
                >
                  <span></span>
                  <span style={{ textAlign: "left" }}>
                    {financialMetricsPeriodDisplay}
                  </span>
                  <span style={{ ...styles.sourceValue, fontSize: "11px" }}>
                    Source
                  </span>
                </div>
              )}
              {!hasIncomeStatementData && (
                <div style={styles.v3TabFinRow}>
                  <span style={styles.label}>Revenue (m)</span>
                  <span style={{ ...styles.v3RailValue, textAlign: "right" }}>
                    {revenuePlain}
                  </span>
                  <span style={styles.sourceValue}>
                    {getSourceText(
                      financialMetrics?.Revenue_source_label,
                      financialMetrics?.Rev_source
                    )}
                  </span>
                </div>
              )}
              {!hasIncomeStatementData && (
                <div style={styles.v3TabFinRow}>
                  <span style={styles.label}>EBITDA (m)</span>
                  <span style={{ ...styles.v3RailValue, textAlign: "right" }}>
                    {ebitdaPlain}
                  </span>
                  <span style={styles.sourceValue}>
                    {getSourceText(
                      financialMetrics?.EBITDA_source_label,
                      financialMetrics?.EBITDA_source
                    )}
                  </span>
                </div>
              )}
              <div style={styles.v3TabFinRow}>
                <span style={styles.label}>Enterprise value</span>
                <span style={{ ...styles.v3RailValue, textAlign: "right" }}>
                  {evPlain}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.EV_source_label,
                    financialMetrics?.EV_source
                  )}
                </span>
              </div>
              <div style={styles.v3TabFinRow}>
                <span style={styles.label}>EV / Revenue</span>
                <span style={{ ...styles.v3RailValue, textAlign: "right" }}>
                  {formatMultiple(financialMetrics?.Revenue_multiple)}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.Revenue_multiple_source_label,
                    financialMetrics?.Rev_x_source
                  )}
                </span>
              </div>
              <div style={styles.v3TabFinRow}>
                <span style={styles.label}>EV / EBITDA</span>
                <span style={{ ...styles.v3RailValue, textAlign: "right" }}>
                  {(() => {
                    const evN = getNumeric(financialMetrics?.EV);
                    const ebd = getNumeric(financialMetrics?.EBITDA_m);
                    if (
                      evN === undefined ||
                      ebd === undefined ||
                      Math.abs(ebd) < 1e-9
                    ) {
                      return "Not available";
                    }
                    return `${(evN / ebd).toFixed(1)}x`;
                  })()}
                </span>
                <span style={styles.sourceValue} />
              </div>
              <div style={styles.v3TabFinRow}>
                <span style={styles.label}>Revenue growth</span>
                <span
                        style={{
                    ...styles.v3RailValue,
                    textAlign: "right",
                    color: (() => {
                      const g = getNumeric(financialMetrics?.Rev_Growth_PC);
                      if (g === undefined) return T.body;
                      return g >= 0 ? T.up : T.down;
                    })(),
                  }}
                >
                  {formatPercent(financialMetrics?.Rev_Growth_PC)}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.Rev_growth_source_label,
                    financialMetrics?.Rev_Growth_source
                  )}
                </span>
                  </div>
              <div style={styles.v3TabFinRow}>
                <span style={styles.label}>EBITDA margin</span>
                <span style={{ ...styles.v3RailValue, textAlign: "right" }}>
                  {formatPercent(financialMetrics?.EBITDA_margin)}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.EBITDA_margin_source_label,
                    financialMetrics?.EBITDA_margin_source
                  )}
                </span>
              </div>
              <div style={styles.v3TabFinRow}>
                <span style={styles.label}>Rule of 40</span>
                <span style={{ ...styles.v3RailValue, textAlign: "right" }}>
                  {(() => {
                    const n = getNumeric(financialMetrics?.Rule_of_40);
                    return n !== undefined
                      ? Math.round(n).toLocaleString()
                      : "Not available";
                  })()}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.Rule_of_40_source_label,
                    financialMetrics?.Rule_of_40_source
                  )}
                </span>
              </div>
              <div style={styles.v3TabFinRow}>
                <span style={styles.label}>Recurring revenue</span>
                <span style={{ ...styles.v3RailValue, textAlign: "right" }}>
                  {formatPlainNumber(financialMetrics?.ARR_m)}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.ARR_source_label,
                    financialMetrics?.ARR_source
                  )}
                </span>
              </div>
              <div style={styles.v3TabFinRow}>
                <span style={styles.label}>NRR</span>
                <span style={{ ...styles.v3RailValue, textAlign: "right" }}>
                  {formatPercent(financialMetrics?.NRR)}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.NRR_source_label,
                    financialMetrics?.NRR_source
                  )}
                </span>
              </div>
              </div>
              )}
              {financeRailTab === "income" && (
              <>
              {hasIncomeStatementData && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginBottom: 8,
                    paddingRight: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: "11.5px",
                      color: T.muted,
                      fontWeight: 500,
                    }}
                  >
                    Last 3 FY
                  </span>
                </div>
              )}
                {hasIncomeStatementData ? (
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        tableLayout: "fixed",
                        borderCollapse: "collapse",
                        fontSize: "12.5px",
                      }}
                    >
                      <thead>
                        <tr style={{ background: T.paper }}>
                          <th
                              style={{
                                textAlign: "left",
                              padding: "8px 14px",
                              borderBottom: `1px solid ${T.hair}`,
                              color: T.muted,
                              fontWeight: 500,
                              fontSize: "10.5px",
                              textTransform: "uppercase" as const,
                              letterSpacing: "0.4px",
                            }}
                          >
                            Period
                            </th>
                          <th
                            style={{
                              textAlign: "right",
                              padding: "8px 14px",
                              borderBottom: `1px solid ${T.hair}`,
                              color: T.muted,
                              fontWeight: 500,
                              fontSize: "10.5px",
                              textTransform: "uppercase" as const,
                              letterSpacing: "0.4px",
                            }}
                          >
                            Rev
                          </th>
                          <th
                            style={{
                              textAlign: "right",
                              padding: "8px 14px",
                              borderBottom: `1px solid ${T.hair}`,
                              color: T.muted,
                              fontWeight: 500,
                              fontSize: "10.5px",
                              textTransform: "uppercase" as const,
                              letterSpacing: "0.4px",
                            }}
                          >
                            EBIT
                          </th>
                          <th
                            style={{
                              textAlign: "right",
                              padding: "8px 14px",
                              borderBottom: `1px solid ${T.hair}`,
                              color: T.muted,
                              fontWeight: 500,
                              fontSize: "10.5px",
                              textTransform: "uppercase" as const,
                              letterSpacing: "0.4px",
                            }}
                          >
                            EBITDA
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {normalizedIncomeStatements.map((row, rIdx) => {
                          const period = (
                            row.period_display_end_date || ""
                          ).replace(/[,\s]/g, "");
                          const currency =
                            row.cost_of_goods_sold_currency ||
                            evCurrency ||
                            revenueCurrency ||
                            "";
                          const fmt = (v?: number | null) =>
                            typeof v === "number"
                              ? (() => {
                                  const millions = Math.round(v / 1_000_000);
                                  return `${currency}${millions.toLocaleString()}`;
                                })()
                              : "—";
                          const rowBorder =
                            rIdx === normalizedIncomeStatements.length - 1
                              ? "none"
                              : `1px solid ${T.hair}`;
                          return (
                            <tr key={row.id}>
                              <td
                                style={{
                                  padding: "9px 14px",
                                  borderBottom: rowBorder,
                                  fontFamily: T.mono,
                                  color: T.body,
                                }}
                              >
                                {period || "—"}
                              </td>
                              <td
                                    style={{
                                  padding: "9px 14px",
                                  borderBottom: rowBorder,
                                  textAlign: "right",
                                  fontFamily: T.mono,
                                  color: T.ink,
                                }}
                              >
                                {fmt(row.revenue)}
                              </td>
                              <td
                                    style={{
                                  padding: "9px 14px",
                                  borderBottom: rowBorder,
                                  textAlign: "right",
                                  fontFamily: T.mono,
                                  color: T.ink,
                                }}
                              >
                                {fmt(row.ebit)}
                              </td>
                              <td
                                style={{
                                  padding: "9px 14px",
                                  borderBottom: rowBorder,
                                  textAlign: "right",
                                  fontFamily: T.mono,
                                  color: T.ink,
                                }}
                              >
                                {fmt(row.ebitda)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={styles.emptyState}>
                    No income statement data available for this company yet.
                  </div>
                )}
              </> )}
              {financeRailTab === "benchmark" && (
              <>
                {(() => {
                  const benchCo = (
                    company?.name ||
                    "Company"
                  )
                    .trim()
                    .toUpperCase()
                    .replace(/\s+/g, " ")
                    .slice(0, 22);
                  const peerEm = "—";
                  const signVs = (
                    n: number | undefined,
                    baseline = 0
                  ): "up" | "down" | "flat" | "na" => {
                    if (n === undefined || !Number.isFinite(n)) return "na";
                    if (n > baseline) return "up";
                    if (n < baseline) return "down";
                    return "flat";
                  };
                  const evMultCo = formatMultiple(
                    financialMetrics?.Revenue_multiple
                  );
                  const evEbitdaCo = (() => {
                    const evN = getNumeric(financialMetrics?.EV);
                    const ebd = getNumeric(financialMetrics?.EBITDA_m);
                    if (
                      evN === undefined ||
                      ebd === undefined ||
                      Math.abs(ebd) < 1e-9
                    ) {
                      return "Not available";
                    }
                    return `${(evN / ebd).toFixed(1)}x`;
                  })();
                  const r40Co = (() => {
                    const n = getNumeric(financialMetrics?.Rule_of_40);
                    return n !== undefined
                      ? Math.round(n).toLocaleString()
                      : "—";
                  })();
                  const rows: {
                    metric: string;
                    co: string;
                    peer: string;
                    vs: "up" | "down" | "flat" | "na";
                  }[] = [
                    {
                      metric: "Enterprise value",
                      co: evPlain,
                      peer: peerEm,
                      vs: "na",
                    },
                    {
                      metric: "EV / Revenue",
                      co: evMultCo,
                      peer: peerEm,
                      vs: "na",
                    },
                    {
                      metric: "EV / EBITDA",
                      co: evEbitdaCo,
                      peer: peerEm,
                      vs: "na",
                    },
                    {
                      metric: "Revenue growth",
                      co: formatPercent(financialMetrics?.Rev_Growth_PC),
                      peer: peerEm,
                      vs: signVs(getNumeric(financialMetrics?.Rev_Growth_PC), 0),
                    },
                    {
                      metric: "EBITDA margin",
                      co: formatPercent(financialMetrics?.EBITDA_margin),
                      peer: peerEm,
                      vs: "na",
                    },
                    {
                      metric: "Rule of 40",
                      co: r40Co,
                      peer: peerEm,
                      vs: signVs(getNumeric(financialMetrics?.Rule_of_40), 40),
                    },
                    {
                      metric: "NRR",
                      co: formatPercent(financialMetrics?.NRR),
                      peer: peerEm,
                      vs: signVs(getNumeric(financialMetrics?.NRR), 100),
                    },
                  ];
                  const vsBadge = (vs: (typeof rows)[0]["vs"]) => {
                    const tones = {
                      up: {
                        bg: T.emeraldSoft,
                        fg: T.up,
                        sym: "↑",
                      },
                      down: {
                        bg: T.coralSoft,
                        fg: T.down,
                        sym: "↓",
                      },
                      flat: {
                        bg: T.inset,
                        fg: T.muted,
                        sym: "→",
                      },
                      na: {
                        bg: T.inset,
                        fg: T.faint,
                        sym: "—",
                      },
                    }[vs];
                    return (
                      <span
                                style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: tones.bg,
                          color: tones.fg,
                          fontSize: 14,
                          fontWeight: 700,
                          fontFamily: T.mono,
                        }}
                      >
                        {tones.sym}
                      </span>
                    );
                  };
                  const peerList =
                    competitors?.peers?.map((p) => p.name).filter(Boolean) ||
                    [];
                  const peerNote =
                    peerList.length > 0
                      ? `Peers: ${peerList.slice(0, 6).join(", ")}${peerList.length > 6 ? "…" : ""}. Peer medians require a cohort API — shown as — until connected.`
                      : "Define peers on the company to anchor benchmark context. Peer medians are not yet available for this profile.";
                  return (
                                  <div>
                      <div style={{ overflowX: "auto" }}>
                        <table
                                        style={{
                            width: "100%",
                            tableLayout: "fixed",
                            borderCollapse: "collapse",
                            fontSize: "12.5px",
                          }}
                        >
                          <thead>
                            <tr>
                              <th
                                style={{
                                  textAlign: "left",
                                  padding: "8px 10px 8px 0",
                                  borderBottom: `1px solid ${T.hair}`,
                                  color: T.muted,
                                  fontWeight: 500,
                                  fontSize: "10.5px",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.4px",
                                }}
                              >
                                Metric
                              </th>
                              <th
                                style={{
                                  textAlign: "right",
                                  padding: "8px 6px",
                                  borderBottom: `1px solid ${T.hair}`,
                                  color: T.muted,
                                  fontWeight: 500,
                                  fontSize: "10.5px",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.4px",
                                }}
                              >
                                {benchCo}
                              </th>
                              <th
                                style={{
                                  textAlign: "right",
                                  padding: "8px 6px",
                                  borderBottom: `1px solid ${T.hair}`,
                                  color: T.muted,
                                  fontWeight: 500,
                                  fontSize: "10.5px",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.4px",
                                }}
                              >
                                Peer median
                              </th>
                              <th
                                style={{
                                  textAlign: "center",
                                  width: 44,
                                  padding: "8px 0 8px 6px",
                                  borderBottom: `1px solid ${T.hair}`,
                                  color: T.muted,
                                  fontWeight: 500,
                                  fontSize: "10.5px",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.4px",
                                }}
                              >
                                Vs.
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((r, i) => (
                              <tr key={`${r.metric}-${i}`}>
                                <td
                                  style={{
                                    padding: "9px 10px 9px 0",
                                    borderBottom:
                                      i === rows.length - 1
                                        ? "none"
                                        : `1px solid ${T.hair}`,
                                    color: T.body,
                                    fontWeight: 500,
                                  }}
                                >
                                  {r.metric}
                              </td>
                              <td
                                style={{
                                    padding: "9px 6px",
                                    borderBottom:
                                      i === rows.length - 1
                                        ? "none"
                                        : `1px solid ${T.hair}`,
                                    textAlign: "right",
                                    fontFamily: T.mono,
                                    fontWeight: 700,
                                    color: T.ink,
                                  }}
                                >
                                  {r.co}
                              </td>
                              <td
                                style={{
                                    padding: "9px 6px",
                                    borderBottom:
                                      i === rows.length - 1
                                        ? "none"
                                        : `1px solid ${T.hair}`,
                                    textAlign: "right",
                                    fontFamily: T.mono,
                                    color: T.muted,
                                  }}
                                >
                                  {r.peer}
                              </td>
                              <td
                                style={{
                                    padding: "9px 0 9px 6px",
                                    borderBottom:
                                      i === rows.length - 1
                                        ? "none"
                                        : `1px solid ${T.hair}`,
                                    textAlign: "center",
                                  }}
                                >
                                  {vsBadge(r.vs)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                      <div
                        style={{
                          marginTop: 12,
                          fontSize: "11px",
                          color: T.muted,
                          lineHeight: 1.45,
                        }}
                      >
                        {peerNote}
                </div>
            </div>
                  );
                })()}
              {/* Competitors (table layout) */}
              {(competitorsLoading ||
                (competitors &&
                  (competitors.peers.length > 0 ||
                    competitors.potential_acquirers.length > 0 ||
                    competitors.acquisition_targets.length > 0))) && (
                <div style={{ marginBottom: 0, marginTop: 18 }}>
                  {competitorsLoading ? (
                    <div style={{ fontSize: "14px", color: T.muted }}>
                      Loading...
                    </div>
                  ) : (
                    <>
                      {(() => {
                        const MAX_VISIBLE = 5;
                        const competitorTag = {
                          backgroundColor: T.azureSoft,
                          color: T.azure,
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: "500" as const,
                          textDecoration: "none",
                          display: "inline-block",
                          maxWidth: "100%",
                          minWidth: 0,
                          whiteSpace: "normal" as const,
                          wordBreak: "keep-all" as const,
                          overflowWrap: "normal" as const,
                          hyphens: "none" as const,
                          lineHeight: 1.25,
                          textAlign: "left" as const,
                        };

                        const sections: {
                          key: string;
                          label: string;
                          items: CompanyCompetitorItem[];
                        }[] = [
                          {
                            key: "peers",
                            label: "Peers & Competitors",
                            items: competitors?.peers || [],
                          },
                          {
                            key: "acquirers",
                            label: "Potential Acquirers",
                            items: competitors?.potential_acquirers || [],
                          },
                          {
                            key: "targets",
                            label: "Acquisition Targets",
                            items: competitors?.acquisition_targets || [],
                          },
                        ].filter((s) => s.items.length > 0);

                        if (sections.length === 0) return null;

                        const hasMore = sections.some(
                          (s) => s.items.length > MAX_VISIBLE
                        );
                        const visibleSections = sections.map((s) => ({
                          ...s,
                          items: s.items.slice(0, MAX_VISIBLE),
                        }));

                        const renderCompetitorTable = (
                          tableSections: typeof visibleSections
                        ) => {
                          const tMaxRows = Math.max(
                            ...tableSections.map((s) => s.items.length)
                          );
                          return (
                            <table
                              style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                tableLayout: "fixed",
                                fontSize: "13px",
                              }}
                            >
                              <thead>
                                <tr>
                                  {tableSections.map((section) => (
                                    <th
                                      key={section.key}
                                      style={{
                                        textAlign: "center",
                                        padding: "4px 6px 6px",
                                        borderBottom: `1px solid ${T.hair}`,
                                        color: T.muted,
                                        fontWeight: 600,
                                        fontSize: "11px",
                                        textTransform: "uppercase" as const,
                                        letterSpacing: "0.4px",
                                      }}
                                    >
                                      {section.label}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {Array.from({ length: tMaxRows }).map(
                                  (_, rowIdx) => (
                                    <tr key={`competitor-row-${rowIdx}`}>
                                      {tableSections.map((section) => {
                                        const comp = section.items[rowIdx];
                                        if (!comp) {
                                          return (
                                            <td
                                              key={`${section.key}-${rowIdx}`}
                                              style={{
                                                padding: "5px 6px",
                                                borderBottom: `1px solid ${T.hair}`,
                                              }}
                                            />
                                          );
                                        }
                                        return (
                                          <td
                                            key={`${section.key}-${rowIdx}`}
                                            style={{
                                              padding: "5px 6px",
                                              borderBottom: `1px solid ${T.hair}`,
                                              verticalAlign: "top",
                                              minWidth: 0,
                                            }}
                                          >
                                            <div
                                              style={{
                                                display: "flex",
                                                alignItems: "flex-start",
                                                gap: "5px",
                                                minWidth: 0,
                                              }}
                                            >
                                              {comp.linkedin_logo ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                  src={`data:image/jpeg;base64,${comp.linkedin_logo}`}
                                                  alt=""
                                                  style={{
                                                    width: "18px",
                                                    height: "14px",
                                                    borderRadius: "3px",
                                                    objectFit: "contain",
                                                    flexShrink: 0,
                                                  }}
                                                />
                                              ) : null}
                                              <Link
                                                href={`/new_company/${comp.id}`}
                                                prefetch={false}
                                                style={{
                                                  ...competitorTag,
                                                  flex: "1 1 auto",
                                                }}
                                                onMouseEnter={(e) => {
                                                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                                                    T.inset;
                                                }}
                                                onMouseLeave={(e) => {
                                                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                                                    T.azureSoft;
                                                }}
                                              >
                                                {comp.name}
                                              </Link>
                                            </div>
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  )
                                )}
                              </tbody>
                            </table>
                          );
                        };

                        return (
                          <>
                            <div
                              style={{
                                backgroundColor: T.inset,
                                borderRadius: 8,
                                border: `1px solid ${T.divider}`,
                                padding: "8px 12px 10px",
                              }}
                            >
                              <div>
                                {renderCompetitorTable(visibleSections)}
                              </div>
                              {hasMore && (
                                <div style={{ textAlign: "center", marginTop: "10px" }}>
                                  <button
                                    onClick={() => setShowCompetitorsModal(true)}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      color: T.azure,
                                      fontSize: "13px",
                                      fontWeight: 500,
                                      textDecoration: "underline",
                                      cursor: "pointer",
                                      padding: 0,
                                    }}
                                  >
                                    See more
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Competitors modal */}
                            {showCompetitorsModal && (
                              <div
                                style={{
                                  position: "fixed",
                                  inset: 0,
                                  backgroundColor: "rgba(0,0,0,0.5)",
                                  zIndex: 1000,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  padding: "16px",
                                }}
                                onClick={() => setShowCompetitorsModal(false)}
                              >
                                <div
                                  style={{
                                    backgroundColor: "white",
                                    borderRadius: "12px",
                                    padding: "24px",
                                    width: "100%",
                                    maxWidth: "800px",
                                    maxHeight: "80vh",
                                    overflowY: "auto",
                                    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      marginBottom: "16px",
                                    }}
                                  >
                                    <h3
                                      style={{
                                        margin: 0,
                                        fontSize: "18px",
                                        fontWeight: 700,
                                        color: "#1a202c",
                                      }}
                                    >
                                      Market Landscape
                                    </h3>
                                    <button
                                      onClick={() => setShowCompetitorsModal(false)}
                                      style={{
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        fontSize: "22px",
                                        color: "#6b7280",
                                        lineHeight: 1,
                                        padding: "0 4px",
                                      }}
                                    >
                                      ×
                                    </button>
                                  </div>
                                  <div>
                                    {renderCompetitorTable(
                                      sections.map((s) => ({ ...s }))
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </>
                  )}
                </div>
              )}
              </> )}
              </V3TabbedFinanceCard>
              <V3RightPanel
                title="Subscription metrics"
                styles={{
                  card: styles.card,
                  cardHeader: styles.cardHeader,
                  cardHeaderTitle: styles.cardHeaderTitle,
                  cardArrow: styles.cardArrow,
                }}
              >
                <div style={styles.infoRow}>
                <span style={styles.label}>Recurring rev</span>
                <span style={styles.v3RailValue}>
                  {formatPlainNumber(financialMetrics?.ARR_m)}
                  </span>
                  <span style={styles.sourceValue}>
                    {getSourceText(
                    financialMetrics?.ARR_source_label,
                    financialMetrics?.ARR_source
                    )}
                  </span>
                </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>ARR growth</span>
                <span
                  style={{
                    ...styles.v3RailValue,
                    color: (() => {
                      const n =
                        getNumeric(financialMetrics?.Rev_expansion_pc) ??
                        getNumeric(financialMetrics?.New_client_growth_pc);
                      if (n === undefined) return T.body;
                      return n >= 0 ? T.up : T.down;
                    })(),
                  }}
                >
                  {(() => {
                    const n =
                      getNumeric(financialMetrics?.Rev_expansion_pc) ??
                      getNumeric(financialMetrics?.New_client_growth_pc);
                    return n !== undefined
                      ? formatPercent(n)
                      : formatPercent(financialMetrics?.ARR_pc);
                  })()}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.Rev_expansion_source_label,
                    financialMetrics?.Rev_expansion_source
                  )}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>NRR</span>
                <span style={styles.v3RailValue}>
                  {formatPercent(financialMetrics?.NRR)}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.NRR_source_label,
                    financialMetrics?.NRR_source
                  )}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>GDR</span>
                <span style={styles.v3RailValue}>
                  {formatPercent(financialMetrics?.GRR_pc)}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.GRR_source_label,
                    financialMetrics?.GRR_source
                  )}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Upsell</span>
                <span style={styles.v3RailValue}>
                  {formatPercent(financialMetrics?.Upsell_pc)}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.Upsell_source_label,
                    financialMetrics?.Upsell_source
                  )}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>New logos</span>
                <span style={styles.v3RailValue}>
                  {formatPercent(financialMetrics?.New_client_growth_pc)}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.New_client_growth_source_label,
                    financialMetrics?.New_Client_Growth_Source
                  )}
                </span>
              </div>
              </V3RightPanel>
              <V3RightPanel
                title="LinkedIn employee count"
                styles={{
                  card: styles.card,
                  cardHeader: styles.cardHeader,
                  cardHeaderTitle: styles.cardHeaderTitle,
                  cardArrow: styles.cardArrow,
                }}
                headerRight={
                  overviewEmployeesYoY ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: T.up,
                        background: T.emeraldSoft,
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontFamily: T.sans,
                      }}
                    >
                      {overviewEmployeesYoY}
                    </span>
                  ) : undefined
                }
                showArrow={!overviewEmployeesYoY}
                bodyStyle={{ padding: "14px 16px" }}
              >
              <div
                style={{ ...styles.chartContainer, marginTop: 0 }}
                className="chartContainer"
              >
                <div style={styles.v3RailHeadlineCount}>
                  {formatNumber(currentEmployeeCount)}{" "}
                  <span
                    style={{
                      fontSize: "12px",
                      color: T.muted,
                      fontWeight: 400,
                    }}
                  >
                    employees
                </span>
                </div>
                {employeeData.length > 0 ? (
                  <div style={{ marginTop: 8 }}>
                  <EmployeeChart data={employeeData} />
                  </div>
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "#666",
                      fontSize: "14px",
                    }}
                  >
                    No employee data available
                  </div>
                )}
              </div>
              {/* LinkedIn Logo - Redirects to company LinkedIn */}
              {linkedinUrl && (
                <div
                  style={{
                    textAlign: "left",
                    marginTop: "16px",
                    paddingTop: "16px",
                    borderTop: "1px solid #e2e8f0",
                  }}
                >
                  <a
                    href={linkedinUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "30px",
                      height: "30px",
                      backgroundColor: "#0077b5",
                      borderRadius: "6px",
                      color: "white",
                      textDecoration: "none",
                      transition: "background-color 0.2s ease",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.backgroundColor = "#005582")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.backgroundColor = "#0077b5")
                    }
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </a>
                </div>
              )}
              </V3RightPanel>
              {hasManagement && (
                <div
                  style={{
                    ...styles.card,
                    padding: 0,
                    overflow: "hidden",
                    minWidth: 0,
                    width: "100%",
                  }}
                  className="management-v3-card"
                >
                  <ManagementProfilePanel
                    tokens={{
                      paper: T.paper,
                      hair: T.hair,
                      ink: T.ink,
                      body: T.body,
                      muted: T.muted,
                      inset: T.inset,
                      azure: T.azure,
                      azureSoft: T.azureSoft,
                      coralSoft: T.coralSoft,
                      down: T.down,
                      sans: T.sans,
                      mono: T.mono,
                    }}
                    current={managementCurrentPeople}
                    past={managementPastPeople}
                    maxInitialPerSection={8}
                  />
                </div>
              )}
            </div>

            {/* Market Overview removed */}
          </div>

          {/* Mobile Financial Metrics */}
          <div
            style={{ display: "none", marginTop: "8px" }}
            className="mobile-financial-metrics"
          >
            <div
              style={{
                ...styles.card,
                width: "100%",
                padding: "20px 16px",
              }}
            >
              <h2 style={styles.sectionTitle}>
                Financial Metrics{metricsCurrencySuffix}
              </h2>
              {financialMetricsPeriodDisplay && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(180px, 220px) 1fr auto",
                    marginTop: "-10px",
                    marginBottom: "4px",
                    fontSize: "13px",
                    color: "#6b7280",
                    fontWeight: 500,
                  }}
                >
                  <span></span>
                  <span style={{ textAlign: "left" }}>
                    {financialMetricsPeriodDisplay}
                  </span>
                  <span style={{ ...styles.sourceValue, fontSize: "11px" }}>
                    Source
                  </span>
                </div>
              )}
              {!hasIncomeStatementData && (
                <div style={styles.infoRow}>
                  <span style={styles.label}>Revenue (m):</span>
                  <span style={styles.value}>{revenuePlain}</span>
                  <span style={styles.sourceValue}>
                    {getSourceText(
                      financialMetrics?.Revenue_source_label,
                      financialMetrics?.Rev_source
                    )}
                  </span>
                </div>
              )}
              {!hasIncomeStatementData && (
                <div style={styles.infoRow}>
                  <span style={styles.label}>EBITDA (m):</span>
                  <span style={styles.value}>{ebitdaPlain}</span>
                  <span style={styles.sourceValue}>
                    {getSourceText(
                      financialMetrics?.EBITDA_source_label,
                      financialMetrics?.EBITDA_source
                    )}
                  </span>
                </div>
              )}
              <div style={styles.infoRow}>
                <span style={styles.label}>Enterprise Value (m):</span>
                <span style={styles.value}>{evPlain}</span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.EV_source_label,
                    financialMetrics?.EV_source
                  )}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Revenue multiple:</span>
                <span style={styles.value}>
                  {formatMultiple(financialMetrics?.Revenue_multiple)}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.Revenue_multiple_source_label,
                    financialMetrics?.Rev_x_source
                  )}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Revenue Growth:</span>
                <span style={styles.value}>
                  {formatPercent(financialMetrics?.Rev_Growth_PC)}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.Rev_growth_source_label,
                    financialMetrics?.Rev_Growth_source
                  )}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>EBITDA margin:</span>
                <span style={styles.value}>
                  {formatPercent(financialMetrics?.EBITDA_margin)}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.EBITDA_margin_source_label,
                    financialMetrics?.EBITDA_margin_source
                  )}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Rule of 40:</span>
                <span style={styles.value}>
                  {(() => {
                    const n = getNumeric(financialMetrics?.Rule_of_40);
                    return n !== undefined
                      ? Math.round(n).toLocaleString()
                      : "Not available";
                  })()}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.Rule_of_40_source_label,
                    financialMetrics?.Rule_of_40_source
                  )}
                </span>
              </div>
              {hasIncomeStatementData && (
                <div style={{ marginTop: 12 }}>
                  <div
                    style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}
                  >
                    Income Statement (Last 3 FY)
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{ width: "100%", borderCollapse: "collapse" }}
                    >
                      <thead>
                        <tr style={{ background: "#f8fafc" }}>
                          <th
                            style={{
                              textAlign: "left",
                              padding: 6,
                              borderBottom: "1px solid #e2e8f0",
                              fontSize: 12,
                            }}
                          >
                            Financial Period
                          </th>
                          <th
                            style={{
                              textAlign: "right",
                              padding: 6,
                              borderBottom: "1px solid #e2e8f0",
                              fontSize: 12,
                            }}
                          >
                            Revenue (m)
                          </th>
                          <th
                            style={{
                              textAlign: "right",
                              padding: 6,
                              borderBottom: "1px solid #e2e8f0",
                              fontSize: 12,
                            }}
                          >
                            EBIT (m)
                          </th>
                          <th
                            style={{
                              textAlign: "right",
                              padding: 6,
                              borderBottom: "1px solid #e2e8f0",
                              fontSize: 12,
                            }}
                          >
                            EBITDA (m)
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {normalizedIncomeStatements.map((row) => {
                          const period = (
                            row.period_display_end_date || ""
                          ).replace(/[,\s]/g, "");
                          const currency =
                            row.cost_of_goods_sold_currency ||
                            evCurrency ||
                            revenueCurrency ||
                            "";
                          const fmt = (v?: number | null) =>
                            typeof v === "number"
                              ? (() => {
                                  const millions = Math.round(v / 1_000_000);
                                  return `${currency}${millions.toLocaleString()}`;
                                })()
                              : "—";
                          return (
                            <tr key={row.id}>
                              <td
                                style={{
                                  padding: 6,
                                  borderBottom: "1px solid #e2e8f0",
                                  fontSize: 12,
                                }}
                              >
                                {period || "—"}
                              </td>
                              <td
                                style={{
                                  padding: 6,
                                  borderBottom: "1px solid #e2e8f0",
                                  textAlign: "right",
                                  fontSize: 12,
                                }}
                              >
                                {fmt(row.revenue)}
                              </td>
                              <td
                                style={{
                                  padding: 6,
                                  borderBottom: "1px solid #e2e8f0",
                                  textAlign: "right",
                                  fontSize: 12,
                                }}
                              >
                                {fmt(row.ebit)}
                              </td>
                              <td
                                style={{
                                  padding: 6,
                                  borderBottom: "1px solid #e2e8f0",
                                  textAlign: "right",
                                  fontSize: 12,
                                }}
                              >
                                {fmt(row.ebitda)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {/* Subscription Metrics */}
              <div
                style={{ ...styles.chartTitle, marginTop: 20, marginBottom: 8 }}
              >
                Subscription Metrics
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Recurring rev:</span>
                <span style={styles.value}>
                  {formatPlainNumber(financialMetrics?.ARR_m)}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.ARR_source_label,
                    financialMetrics?.ARR_source
                  )}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>ARR growth:</span>
                <span
                  style={{
                    ...styles.value,
                    color: (() => {
                      const n =
                        getNumeric(financialMetrics?.Rev_expansion_pc) ??
                        getNumeric(financialMetrics?.New_client_growth_pc);
                      if (n === undefined) return T.body;
                      return n >= 0 ? T.up : T.down;
                    })(),
                  }}
                >
                  {(() => {
                    const n =
                      getNumeric(financialMetrics?.Rev_expansion_pc) ??
                      getNumeric(financialMetrics?.New_client_growth_pc);
                    return n !== undefined
                      ? formatPercent(n)
                      : formatPercent(financialMetrics?.ARR_pc);
                  })()}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.Rev_expansion_source_label,
                    financialMetrics?.Rev_expansion_source
                  )}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>NRR:</span>
                <span style={styles.value}>
                  {formatPercent(financialMetrics?.NRR)}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.NRR_source_label,
                    financialMetrics?.NRR_source
                  )}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>GDR:</span>
                <span style={styles.value}>
                  {formatPercent(financialMetrics?.GRR_pc)}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.GRR_source_label,
                    financialMetrics?.GRR_source
                  )}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Upsell:</span>
                <span style={styles.value}>
                  {formatPercent(financialMetrics?.Upsell_pc)}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.Upsell_source_label,
                    financialMetrics?.Upsell_source
                  )}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>New logos:</span>
                <span style={styles.value}>
                  {formatPercent(financialMetrics?.New_client_growth_pc)}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.New_client_growth_source_label,
                    financialMetrics?.New_Client_Growth_Source
                  )}
                </span>
              </div>

              <div style={styles.chartContainer}>
                <div style={styles.chartTitle}>LinkedIn Employee Count</div>
                <div style={styles.currentCount}>
                  {formatNumber(currentEmployeeCount)} employees
                </div>
                {employeeData.length > 0 ? (
                  <EmployeeChart data={employeeData} />
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "#666",
                      fontSize: "14px",
                    }}
                  >
                    No employee data available
                  </div>
                )}
              </div>
              {hasManagement && (
                <div
                  style={{
                    ...styles.card,
                    padding: 0,
                    overflow: "hidden",
                    marginTop: 20,
                    width: "100%",
                  }}
                  className="management-v3-card"
                >
                  <ManagementProfilePanel
                    tokens={{
                      paper: T.paper,
                      hair: T.hair,
                      ink: T.ink,
                      body: T.body,
                      muted: T.muted,
                      inset: T.inset,
                      azure: T.azure,
                      azureSoft: T.azureSoft,
                      coralSoft: T.coralSoft,
                      down: T.down,
                      sans: T.sans,
                      mono: T.mono,
                    }}
                    current={managementCurrentPeople}
                    past={managementPastPeople}
                    maxInitialPerSection={8}
                  />
                </div>
              )}
            </div>
          </div>

          {/* LinkedIn section (desktop only) removed per request */}

          {/* Management: desktop under LinkedIn rail; mobile block above */}


        </div>
        <style dangerouslySetInnerHTML={{ __html: responsiveCss }} />
      </main>
      <Footer />
    </div>
  );
};

export default CompanyDetail;


//