"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { CorporateEventsSection } from "@/components/contributor-crm/corporate-events/CorporateEventsSection";
import { type CorporateEvent } from "@/components/contributor-crm/corporate-events/CorporateEventsTable";
import IndividualCards from "@/components/contributor-crm/shared/IndividualCards";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  createChangeRequest,
  fetchPublicContributorCompany,
  notifyDataContribution,
  getCompanyTransactionStatusLabel,
  getContributorMetricsByCompany,
  getContributorYears,
  getPrimarySectors,
  getSecondarySectors,
  type ContributorYearItem,
  uploadFileToXano,
} from "@/lib/contributorCrm/api";
import {
  authService,
  buildContributorLoginPath,
  buildInternalReviewUrl,
  buildTeamLoginPath,
  contributorAccessService,
  isAdminUser,
  isTokenExpired,
} from "@/lib/contributorCrm/auth";
import { ContentArticle } from "@/types/insightsAnalysis";
// Investor classification rule constants (module scope; stable across renders)
const FINANCIAL_SERVICES_FOCUS_ID = 74;

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

function getCompanyTransactionStatus(company: {
  Transaction_Status?: string | { Transaction_Status?: string };
}): string {
  const v = company.Transaction_Status;
  if (typeof v === "string") return v.trim();
  if (v && typeof v === "object" && "Transaction_Status" in v) {
    const inner = (v as { Transaction_Status?: unknown }).Transaction_Status;
    return typeof inner === "string" ? inner.trim() : "";
  }
  return "";
}

/** Prefer badge API label; fallback to company payload field. */
function resolveTransactionStatusDisplay(
  apiLabel: string,
  company: { Transaction_Status?: string | { Transaction_Status?: string } }
): string {
  const fromApi = apiLabel.trim();
  if (fromApi) return fromApi;
  return getCompanyTransactionStatus(company);
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
  sectors?: {
    Primary?: string[];
    Secondary?: string[];
  };
  ev_data?: {
    currency?: { Currency?: string | null };
    currency_id?: string;
    enterprise_value_m?: string;
  };
  investment_data?: {
    currency?: { Currency?: string | null };
    currency_id?: string;
    Funding_stage?: string;
    funding_stage?: string;
    investment_amount_m?: string | number;
  };
  deal_status?: string;
  closed_date?: string;
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
  /** Single-valued enum from API (string or wrapped object) */
  Transaction_Status?: string | { Transaction_Status?: string };
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
  income_statement?: Array<{
    income_statements?: IncomeStatementEntry[] | string;
  }>;
  // Optional new sectors data container from API
  new_sectors_data?: Array<{
    sectors_payload?: string | unknown;
  }>;
  /** Related companies — optional shapes from API */
  peers_competitors?: unknown;
  potential_acquirers?: unknown;
  acquisition_targets?: unknown;
}

interface CompanyResponse {
  Company: Company;
  peers_competitors?: unknown;
  potential_acquirers?: unknown;
  acquisition_targets?: unknown;
  have_parent_company?: HaveParentCompany;
  Product_Type?: CompanyProductTypeItem[] | string;
  Data_Collection_Method?: CompanyDataCollectionMethodItem[] | string;
  Revenue_Model_?: CompanyRevenueModelItem[] | string;
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

function createMinimalContributorCompany(companyId: string): Company {
  const numericId = Number(companyId);
  return {
    id: Number.isFinite(numericId) ? numericId : 0,
    name: "Your Company",
    description: "",
    year_founded: 0,
    url: "",
    _linkedin_data_of_new_company: { linkedin_logo: "" },
    _locations: { City: "", State__Province__County: "", Country: "" },
    _ownership_type: { ownership: "" },
    sectors_id: [],
    revenues: { revenues_m: "", rev_source: "", years_id: 0 },
    EBITDA: { EBITDA_m: "" },
    ev_data: { ev_value: "" },
    _companies_employees_count_monthly: [],
    Lifecycle_stage: { Lifecycle_Stage: "" },
    investors: [],
  };
}

function isAuthenticationErrorMessage(message: string): boolean {
  return (
    message === "Authentication required" ||
    message.includes("ERROR_CODE_UNAUTHORIZED") ||
    message.includes("This token is expired") ||
    message.includes("API request failed: 401")
  );
}

type CompanyManagementJobTitle = {
  id?: number;
  job_title?: string;
};

function normalizeJobTitlesId(
  jobTitles: CompanyManagementJobTitle | CompanyManagementJobTitle[] | null | undefined
): CompanyManagementJobTitle[] {
  if (jobTitles == null) return [];
  if (Array.isArray(jobTitles)) return jobTitles;
  if (typeof jobTitles === "object") return [jobTitles];
  return [];
}

function getManagementJobTitleStrings(
  jobTitles: CompanyManagementJobTitle | CompanyManagementJobTitle[] | null | undefined
): string[] {
  return normalizeJobTitlesId(jobTitles)
    .map((job) => job?.job_title ?? "")
    .filter((title): title is string => Boolean(title));
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

// Format as a whole number with thousands separators (e.g. 54170 -> "54,170")
const formatWholeNumber = (value?: number | string | null): string => {
  const n = getNumeric(value);
  if (n === undefined) return "Not available";
  return Math.round(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
};

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

  return "Not available";
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

type ContributorTabKey =
  | "contribute-financial-metrics"
  | "company-profile"
  | "sector-intelligence";

type ContributionMetricField = {
  key: string;
  label: string;
  suffix?: string;
  placeholder?: string;
  valueType?: "$" | "%" | "x" | "#";
};

type SuggestChangeCurrentValues = {
  primarySectors: string;
  secondarySectors: string;
  yearFounded: string;
  website: string;
  ownership: string;
  hq: string;
  lifecycleStage: string;
  transactionStatus: string;
  investors: string;
  investorCompanies: SearchCompanyOption[];
  peersCompetitors: string;
  peersCompetitorCompanies: SearchCompanyOption[];
  potentialAcquirers: string;
  potentialAcquirerCompanies: SearchCompanyOption[];
  acquisitionTargets: string;
  acquisitionTargetCompanies: SearchCompanyOption[];
  description: string;
  managementPeople: SuggestManagementPerson[];
  subsidiaries: SuggestSubsidiary[];
  corporateEvents: SuggestCorporateEvent[];
  parentCompany: string;
  parentCompanyId: string;
  productType: CompanyProductTypeItem[];
  dataCollectionMethod: CompanyDataCollectionMethodItem[];
  revenueModel: CompanyRevenueModelItem[];
};

type SuggestManagementPerson = {
  localId: string;
  name: string;
  roles: string[];
  status: "Current" | "Past";
  location: string;
  bio: string;
  linkedinUrl: string;
  companyProfileUrl: string;
  isNew?: boolean;
};

type SuggestCounterparty = {
  localId: string;
  companyName: string;
  companyId: string;
  roleType: string;
  websiteUrl: string;
  linkedinUrl: string;
  pressReleaseUrl: string;
  individuals: SuggestManagementPerson[];
  isNew?: boolean;
  isNewCompany?: boolean;
  newCompanyProfile?: SuggestNewCompanyProfile;
};

type SuggestCorporateEvent = {
  localId: string;
  title: string;
  announcementDate: string;
  closedDate: string;
  dealType: string;
  dealStatus: string;
  amountMillions: string;
  currency: string;
  fundingStage: string;
  amountSourceUrl: string;
  sourceUrl: string;
  longDescription: string;
  counterparties: SuggestCounterparty[];
  isNew?: boolean;
};

type SuggestSubsidiary = {
  localId: string;
  name: string;
  companyId: string;
  description: string;
  sectors: string[];
  linkedinMembers: string;
  country: string;
  isNew?: boolean;
  isNewCompany?: boolean;
  newCompanyProfile?: SuggestNewCompanyProfile;
};

type LookupOption = {
  value: string;
  label: string;
};

type SearchCompanyOption = {
  id: string;
  label: string;
  websiteUrl?: string;
  linkedinUrl?: string;
};

type SectorChip = {
  id: string;
  label: string;
  optionValue: string;
  status: "existing" | "added" | "removed";
};

type InvestorChip = {
  localId: string;
  companyId: string;
  companyName: string;
  status: "existing" | "added" | "removed";
  relationType?: string;
  isNewCompany?: boolean;
  newCompanyProfile?: SuggestNewCompanyProfile;
};

type SuggestNewCompanyProfile = {
  name: string;
  description: string;
  primarySectors: string[];
  secondarySectors: string[];
  yearFounded: string;
  ownership: string;
  websiteUrl: string;
  hq: string;
};

type SuggestCompanySelection = {
  localId: string;
  companyId: string;
  companyName: string;
  isNewCompany?: boolean;
  newCompanyProfile?: SuggestNewCompanyProfile;
};

type SearchCompaniesResponse = {
  items?: unknown;
  result1?: {
    items?: unknown;
  };
  itemsReceived?: number;
  curPage?: number;
  nextPage?: number | null;
  prevPage?: number | null;
  offset?: number;
  perPage?: number;
  pageTotal?: number;
};

const CONTRIBUTOR_TABS: Array<{
  key: ContributorTabKey;
  label: string;
  icon: "pulse" | "document" | "globe";
}> = [
  {
    key: "contribute-financial-metrics",
    label: "Contribute Financial Metrics",
    icon: "pulse",
  },
  {
    key: "company-profile",
    label: "Company Profile",
    icon: "document",
  },
  {
    key: "sector-intelligence",
    label: "Sector Intelligence",
    icon: "globe",
  },
];

const CONTRIBUTION_METRIC_GROUPS: Array<{
  label: string;
  color: string;
  fields: ContributionMetricField[];
}> = [
  {
    label: "Core Metrics",
    color: "#1d4ed8",
    fields: [
      { key: "revenue_m", label: "Revenue", suffix: "m", placeholder: "e.g. 125", valueType: "$" },
      { key: "ebitda_m", label: "EBITDA", suffix: "m", placeholder: "e.g. 24", valueType: "$" },
      { key: "enterprise_value_m", label: "Enterprise Value", suffix: "m", placeholder: "e.g. 420", valueType: "$" },
      { key: "revenue_multiple", label: "Revenue Multiple", suffix: "x", placeholder: "e.g. 3.8", valueType: "x" },
      { key: "revenue_growth", label: "Revenue Growth", suffix: "%", placeholder: "e.g. 18", valueType: "%" },
      { key: "ebitda_margin", label: "EBITDA Margin", suffix: "%", placeholder: "e.g. 22", valueType: "%" },
      { key: "rule_of_40", label: "Rule of 40", placeholder: "e.g. 40" },
    ],
  },
  {
    label: "Subscription Metrics",
    color: "#0f766e",
    fields: [
      { key: "recurring_revenue", label: "Recurring Revenue", suffix: "%", placeholder: "e.g. 85", valueType: "%" },
      { key: "arr_m", label: "ARR", suffix: "m", placeholder: "e.g. 90", valueType: "$" },
      { key: "churn", label: "Churn", suffix: "%", placeholder: "e.g. 4", valueType: "%" },
      { key: "grr", label: "GRR", suffix: "%", placeholder: "e.g. 92", valueType: "%" },
      { key: "nrr", label: "NRR", suffix: "%", placeholder: "e.g. 111", valueType: "%" },
      { key: "new_clients_revenue_growth", label: "New Clients Revenue Growth", suffix: "%", placeholder: "e.g. 12", valueType: "%" },
    ],
  },
  {
    label: "Other Metrics",
    color: "#7c3aed",
    fields: [
      { key: "ebit_m", label: "EBIT", suffix: "m", placeholder: "e.g. 19", valueType: "$" },
      { key: "number_of_clients", label: "Number of Clients", placeholder: "e.g. 140", valueType: "#" },
      { key: "revenue_per_client", label: "Revenue per Client", placeholder: "e.g. 540000", valueType: "$" },
      { key: "number_of_employees", label: "Number of Employees", placeholder: "e.g. 680", valueType: "#" },
      { key: "revenue_per_employee", label: "Revenue per Employee", placeholder: "e.g. 245000", valueType: "$" },
    ],
  },
];

const CONTRIBUTION_FIELD_TO_PAYLOAD_KEY: Record<string, string> = {
  revenue_m: "Revenue_m",
  ebitda_m: "EBITDA_m",
  enterprise_value_m: "EV",
  revenue_multiple: "Revenue_multiple",
  revenue_growth: "Rev_Growth_PC",
  ebitda_margin: "EBITDA_margin",
  rule_of_40: "Rule_of_40",
  recurring_revenue: "ARR_pc",
  arr_m: "ARR_m",
  churn: "Churn_pc",
  grr: "GRR_pc",
  nrr: "NRR",
  new_clients_revenue_growth: "New_client_growth_pc",
  ebit_m: "EBIT_m",
  number_of_clients: "No_of_Clients",
  revenue_per_client: "Rev_per_client",
  number_of_employees: "No_Employees",
  revenue_per_employee: "Revenue_per_employee",
};

/** Optional contributor range per metric (included on change-request `new` payload). */
const CONTRIBUTION_FIELD_TO_RANGE_PAYLOAD_KEY: Record<string, string> = {
  revenue_m: "Revenue_m_range",
  ebitda_m: "EBITDA_m_range",
  enterprise_value_m: "EV_range",
  revenue_multiple: "Revenue_multiple_range",
  revenue_growth: "Rev_Growth_PC_range",
  ebitda_margin: "EBITDA_margin_range",
  rule_of_40: "Rule_of_40_range",
  recurring_revenue: "ARR_pc_range",
  arr_m: "ARR_m_range",
  churn: "Churn_pc_range",
  grr: "GRR_pc_range",
  nrr: "NRR_range",
  new_clients_revenue_growth: "New_client_growth_pc_range",
  ebit_m: "EBIT_m_range",
  number_of_clients: "No_of_Clients_range",
  revenue_per_client: "Rev_per_client_range",
  number_of_employees: "No_Employees_range",
  revenue_per_employee: "Revenue_per_employee_range",
};

/** Maximum allowed gap between low and high in "Add ranges" (inclusive endpoints). */
const CONTRIBUTION_RANGE_MAX_SPAN = 10;

function parseContributionMetricToken(token: string): number | null {
  const cleaned = token.replace(/,/g, "").replace(/[$£€\s]/g, "").trim();
  const withoutSuffix = cleaned.replace(/[×x%]$/gi, "").trim();
  if (!withoutSuffix) return null;
  const n = Number(withoutSuffix);
  return Number.isFinite(n) ? n : null;
}

function parseContributionRangeInput(raw: string): { ok: true; empty: true } | {
  ok: false;
  message: string;
} | {
  ok: true;
  empty: false;
  low: number;
  high: number;
} {
  const s = raw.trim();
  if (!s) return { ok: true, empty: true };
  const parts = s.split(/\s*(?:-|–|—|to)\s*/i).filter((p) => p.trim() !== "");
  if (parts.length !== 2) {
    return {
      ok: false,
      message:
        `Ranges must be exactly two numbers separated by a dash or the word \"to\" (example: \"10-${10 + CONTRIBUTION_RANGE_MAX_SPAN}\"). ` +
        `The difference between the low and high values cannot be wider than ${CONTRIBUTION_RANGE_MAX_SPAN} units.`,
    };
  }
  const low = parseContributionMetricToken(parts[0]);
  const high = parseContributionMetricToken(parts[1]);
  if (low == null || high == null) {
    return {
      ok: false,
      message:
        `Could not read both ends of the range. Use plain numbers (${CONTRIBUTION_RANGE_MAX_SPAN} max gap between low and high, e.g. 5-${
          5 + CONTRIBUTION_RANGE_MAX_SPAN
        }).`,
    };
  }
  const span = Math.abs(high - low);
  if (span > CONTRIBUTION_RANGE_MAX_SPAN + 1e-9) {
    return {
      ok: false,
      message:
        `This range spans ${span.toFixed(Number.isInteger(span) ? 0 : 2)} units. ` +
        `The widest allowed gap is ${CONTRIBUTION_RANGE_MAX_SPAN} units (for example "${Math.min(low, high)}–${
          Math.min(low, high) + CONTRIBUTION_RANGE_MAX_SPAN
        }").`,
    };
  }
  return { ok: true, empty: false, low, high };
}

function findContributionMetricLabel(fieldKey: string): string {
  for (const group of CONTRIBUTION_METRIC_GROUPS) {
    const match = group.fields.find((f) => f.key === fieldKey);
    if (match) return match.label;
  }
  return fieldKey;
}

/** Fields the contributor cleared in the form after having edited them (PATCH only). */
function getClearedFilledMetricFieldKeys(
  baselineForm: Record<string, string>,
  form: Record<string, string>
): string[] {
  const cleared: string[] = [];
  for (const fieldKey of Object.keys(CONTRIBUTION_FIELD_TO_PAYLOAD_KEY)) {
    const hadValue = (baselineForm[fieldKey] ?? "").trim() !== "";
    if (!hadValue) continue;
    if (!Object.prototype.hasOwnProperty.call(form, fieldKey)) {
      continue;
    }
    const nowValue = (form[fieldKey] ?? "").trim();
    if (!nowValue) cleared.push(fieldKey);
  }
  return cleared;
}

const COMPANY_LOOKUP_BASE = "https://xdil-abvj-o7rq.e2.xano.io/api:8Bv5PK4I";
const OWNERSHIP_LOOKUP_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob/Get_Ownership_Types";

const LIFECYCLE_STAGE_OPTIONS: LookupOption[] = [
  "Pre-seed",
  "Seed",
  "Series A",
  "Series B",
  "Series C",
  "Series D",
  "Series E",
  "Series F",
  "Series G",
  "Growth",
  "Buyout",
  "Take Private",
  "Debt",
  "Credit facility",
  "Grant",
  "Closing",
].map((v) => ({ value: v, label: v }));
const SUGGEST_CHANGE_STATUS_OPTIONS: Array<{
  value: SuggestManagementPerson["status"];
  label: SuggestManagementPerson["status"];
}> = [
  { value: "Current", label: "Current" },
  { value: "Past", label: "Past" },
];
const SUGGEST_DEAL_TYPE_OPTIONS: LookupOption[] = [
  "Acquisition",
  "Sale",
  "IPO",
  "MBO",
  "Investment",
  "Strategic Review",
  "Divestment",
  "Restructuring",
  "Dual track",
  "Closing",
  "Grant",
  "Debt financing",
  "Bankruptcy",
  "Reorganisation",
  "Employee tender offer",
  "Rebrand",
  "Partnership",
].map((value) => ({ value, label: value }));
const SUGGEST_DEAL_STATUS_OPTIONS: LookupOption[] = [
  "Completed",
  "In Market",
  "Not yet launched",
  "Strategic Review",
  "Deal Prep",
  "In Exclusivity",
  "Cancelled / Failed",
].map((value) => ({ value, label: value }));
const SUGGEST_FUNDING_STAGE_OPTIONS: LookupOption[] = [
  "Pre-seed",
  "Seed",
  "Series A",
  "Series B",
  "Series C",
  "Series D",
  "Series E",
  "Series F",
  "Credit facility",
  "Buyout",
  "Closing",
  "Growth",
  "Grant",
  "Debt",
  "Take Private",
  "Series G",
].map((value) => ({ value, label: value }));

const SEARCH_COMPANIES_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/Get_new_companies";
const COUNTERPARTY_ROLE_LOOKUP_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob/counterparty_advisor_roles";

function createEmptyNewCompanyProfile(name?: string): SuggestNewCompanyProfile {
  return {
    name: name || "",
    description: "",
    primarySectors: [""],
    secondarySectors: [""],
    yearFounded: "",
    ownership: "",
    websiteUrl: "",
    hq: "",
  };
}

function newCompanyProfileHasContent(profile: SuggestNewCompanyProfile): boolean {
  return Boolean(
    profile.name.trim() ||
      profile.description.trim() ||
      profile.primarySectors.some((s) => s.trim()) ||
      profile.secondarySectors.some((s) => s.trim()) ||
      profile.yearFounded.trim() ||
      profile.ownership.trim() ||
      profile.websiteUrl.trim() ||
      profile.hq.trim()
  );
}

const dedupeLookupOptions = (options: LookupOption[]): LookupOption[] => {
  const seen = new Set<string>();
  return options.filter((option) => {
    const key = `${option.value}::${option.label}`.toLowerCase();
    if (!option.value || !option.label || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getStringField = (
  item: Record<string, unknown>,
  keys: string[]
): string | undefined => {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
};

const toLookupOptions = (
  items: unknown,
  valueKeys: string[],
  labelKeys: string[]
): LookupOption[] => {
  if (!Array.isArray(items)) return [];

  return dedupeLookupOptions(
    items
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const record = item as Record<string, unknown>;
        const value =
          getStringField(record, valueKeys) ??
          (typeof record.id === "number" ? String(record.id) : undefined);
        const label = getStringField(record, labelKeys);
        if (!value || !label) return null;
        return { value, label };
      })
      .filter((item): item is LookupOption => Boolean(item))
  );
};

const toSearchCompanyOptions = (payload: unknown): SearchCompanyOption[] => {
  const list = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object"
      ? (
          (payload as { items?: unknown; result1?: { items?: unknown } }).items ??
          (payload as { result1?: { items?: unknown } }).result1?.items ??
          []
        )
      : [];

  if (!Array.isArray(list)) return [];

  const options: SearchCompanyOption[] = [];
  list.forEach((item) => {
    if (!item || typeof item !== "object") return;
    const record = item as Record<string, unknown>;
    const id =
      typeof record.id === "number"
        ? String(record.id)
        : typeof record.id === "string"
          ? record.id.trim()
          : typeof record.new_company_id === "number"
            ? String(record.new_company_id)
            : typeof record.new_company_id === "string"
              ? record.new_company_id.trim()
              : "";
    const label =
      getStringField(record, ["name", "company_name", "Company"]) || "";
    if (!id || !label) return;
    options.push({
      id,
      label,
      websiteUrl: getStringField(record, ["url", "website_url"]) || undefined,
      linkedinUrl:
        getStringField(record, ["linkedin_url", "LinkedIn_URL"]) || undefined,
    });
  });
  return options;
};

/** Normalize API shapes for peers / acquirers / acquisition targets into company options. */
function parseCompanyRelationList(value: unknown): SearchCompanyOption[] {
  if (value == null) return [];

  const toItems = (raw: unknown): unknown[] => {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw.replace(/\\u0022/g, '"')) as unknown;
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === "object") {
          const obj = parsed as Record<string, unknown>;
          const nested = obj.items ?? obj.companies ?? obj.results;
          if (Array.isArray(nested)) return nested;
        }
      } catch {
        return [];
      }
    }
    return [];
  };

  const items = toItems(value);
  const options: SearchCompanyOption[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const nested =
      (record._new_company as Record<string, unknown> | undefined) ||
      (record.new_company as Record<string, unknown> | undefined);
    const idCandidate =
      record.id ??
      record.new_company_id ??
      record.company_id ??
      nested?.id ??
      nested?.new_company_id;
    let id =
      typeof idCandidate === "number"
        ? String(idCandidate)
        : typeof idCandidate === "string"
          ? idCandidate.trim()
          : "";
    const label =
      getStringField(record, ["name", "company_name", "Company"]) ||
      getStringField(nested || {}, ["name", "company_name"]) ||
      "";
    if (!label) continue;
    if (!id) {
      id = `rel-${seen.size}-${label.toLowerCase().replace(/\s+/g, "-").slice(0, 40)}`;
    }
    const key = id.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    options.push({
      id,
      label,
      websiteUrl: getStringField(record, ["url", "website_url"]) || undefined,
      linkedinUrl:
        getStringField(record, ["linkedin_url", "LinkedIn_URL"]) || undefined,
    });
  }
  return options;
}

function relationCompaniesDisplayText(options: SearchCompanyOption[]): string {
  if (options.length === 0) return "Not available";
  return options.map((o) => o.label).join(", ");
}

/** Use CRM payload when it has entries; otherwise fall back to get_company_competitors preload. */
function pickRelationListWithPreload(main: unknown, preload: unknown): unknown {
  if (parseCompanyRelationList(main).length > 0) return main;
  return preload ?? main;
}

async function fetchJson<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

function ContributorTabIcon({
  name,
  active,
}: {
  name: "pulse" | "document" | "globe" | "info" | "check" | "arrow";
  active?: boolean;
}) {
  const color = active ? "#111827" : "#9ca3af";

  if (name === "pulse") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 12h4l2.2-5.5L13 18l2.5-6H21"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "document") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="M7 3h8l4 4v14H7zM9 11h6M9 15h6M9 7h3"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "globe") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8" />
        <path
          d="M3 12h18M12 3c2.5 2.7 4 5.8 4 9s-1.5 6.3-4 9c-2.5-2.7-4-5.8-4-9s1.5-6.3 4-9z"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === "info") {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="#2563a8" strokeWidth="1.8" />
        <path
          d="M12 10v6M12 7.5h.01"
          stroke="#2563a8"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
        <path
          d="m5 12 4.2 4.2L19 6.5"
          stroke="#065f46"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 12h14M13 5l7 7-7 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ContributionBadge({
  children,
  color,
}: {
  children: React.ReactNode;
  color: { bg: string; text: string; border: string };
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: 600,
        background: color.bg,
        color: color.text,
        border: `1px solid ${color.border}`,
      }}
    >
      {children}
    </span>
  );
}

const VALUE_TYPE_STYLE: Record<
  "$" | "%" | "x" | "#",
  { bg: string; color: string; border: string }
> = {
  $: { bg: "#dcfce7", color: "#15803d", border: "#bbf7d0" },
  "%": { bg: "#fef3c7", color: "#92400e", border: "#fde68a" },
  x: { bg: "#ede9fe", color: "#6d28d9", border: "#ddd6fe" },
  "#": { bg: "#f1f5f9", color: "#475569", border: "#e2e8f0" },
};

/** "Your update" — digits only plus optional leading minus and one decimal point (commas stripped). */
function sanitizeContributorMetricValueInput(raw: string): string {
  const withoutCommas = raw.replace(/,/g, "");
  let out = "";
  let i = 0;
  let seenDot = false;
  if (withoutCommas.startsWith("-")) {
    out = "-";
    i = 1;
  }
  for (; i < withoutCommas.length; i++) {
    const c = withoutCommas[i];
    if (c >= "0" && c <= "9") {
      out += c;
      continue;
    }
    if (c === "." && !seenDot) {
      seenDot = true;
      out += c;
    }
  }
  return out;
}

function ContributionMetricRow({
  field,
  existing,
  value,
  rangeValue,
  currency,
  onChange,
  onRangeChange,
}: {
  field: ContributionMetricField;
  existing: string;
  value: string;
  rangeValue: string;
  currency?: string;
  onChange: (value: string) => void;
  onRangeChange: (value: string) => void;
}) {
  const vtStyle = field.valueType ? VALUE_TYPE_STYLE[field.valueType] : null;

  // For $ fields, show the selected currency code instead of a generic "$"
  const currencyAdornment = field.valueType === "$" && currency ? currency : field.valueType === "$" ? "$" : null;
  // Width of prefix adornment (shorter for "$", wider for currency codes like "USD")
  const prefixWidth = currencyAdornment && currencyAdornment.length > 1 ? currencyAdornment.length * 7 + 10 : 18;

  const vtLabel =
    field.valueType === "$"
      ? currency ? `${currency} (M)` : "$ (M)"
      : field.valueType === "%" ? "%"
      : field.valueType === "x" ? "×"
      : field.valueType === "#" ? "#"
      : null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 128px 128px 148px",
        gap: "12px",
        alignItems: "center",
        padding: "12px 0",
        borderBottom: "1px solid #f1f5f9",
      }}
    >
      <span style={{ fontSize: "14px", color: "#0f172a", fontWeight: 500, display: "flex", alignItems: "center", gap: 7 }}>
        {field.label}
        {vtStyle && vtLabel && (
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: "5px",
              background: vtStyle.bg,
              color: vtStyle.color,
              border: `1px solid ${vtStyle.border}`,
              letterSpacing: "0.04em",
              fontFamily: "'DM Mono', monospace",
              flexShrink: 0,
            }}
          >
            {vtLabel}
          </span>
        )}
      </span>
      <span
        style={{
          fontSize: "14px",
          color: existing ? "#475569" : "#cbd5e1",
          textAlign: "center",
          fontFamily: "'DM Mono', monospace",
          justifySelf: "stretch",
          display: "block",
        }}
      >
        {existing || "—"}
      </span>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {currencyAdornment && (
          <span
            style={{
              position: "absolute",
              left: 8,
              fontSize: "11px",
              fontWeight: 700,
              color: vtStyle?.color ?? "#15803d",
              pointerEvents: "none",
              fontFamily: "'DM Mono', monospace",
              letterSpacing: "0.02em",
              whiteSpace: "nowrap",
            }}
          >
            {currencyAdornment}
          </span>
        )}
        {vtStyle && field.valueType === "%" && (
          <span
            style={{
              position: "absolute",
              right: 9,
              fontSize: "13px",
              fontWeight: 600,
              color: vtStyle.color,
              pointerEvents: "none",
              fontFamily: "'DM Mono', monospace",
            }}
          >
            %
          </span>
        )}
        {vtStyle && field.valueType === "x" && (
          <span
            style={{
              position: "absolute",
              right: 9,
              fontSize: "13px",
              fontWeight: 600,
              color: vtStyle.color,
              pointerEvents: "none",
              fontFamily: "'DM Mono', monospace",
            }}
          >
            ×
          </span>
        )}
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(sanitizeContributorMetricValueInput(e.target.value))}
          placeholder={field.placeholder}
          style={{
            width: "100%",
            padding: currencyAdornment
              ? `9px 10px 9px ${prefixWidth + 6}px`
              : field.valueType === "%" || field.valueType === "x"
              ? "9px 26px 9px 10px"
              : "9px 10px",
            border: value ? `1.5px solid ${vtStyle?.border ?? "#e2e8f0"}` : "1.5px solid #e2e8f0",
            borderRadius: "8px",
            fontSize: "13px",
            color: "#334155",
            outline: "none",
            boxSizing: "border-box",
            fontFamily: "'DM Mono', monospace",
          }}
        />
      </div>
      <div style={{ position: "relative" }}>
        <input
          value={rangeValue}
          onChange={(e) => onRangeChange(e.target.value)}
          onBlur={() => {
            const trimmed = rangeValue.trim();
            if (!trimmed) return;
            const parsed = parseContributionRangeInput(trimmed);
            if (!parsed.ok) {
              window.alert(`${field.label}: ${parsed.message}`);
            }
          }}
          placeholder="10–20"
          title={`Optional. Low–high separated by dash. Gap ≤ ${CONTRIBUTION_RANGE_MAX_SPAN} units`}
          aria-label={`${field.label} range`}
          style={{
            width: "100%",
            padding: "9px 10px",
            border: rangeValue.trim()
              ? "1.5px solid rgba(37,99,235,0.35)"
              : "1.5px solid #e2e8f0",
            borderRadius: "8px",
            fontSize: "13px",
            color: "#334155",
            outline: "none",
            boxSizing: "border-box",
            fontFamily: "'DM Mono', monospace",
            textAlign: "center",
          }}
        />
      </div>
    </div>
  );
}

function SuggestChangeFieldRow({
  label,
  currentValue,
  children,
  helpText,
}: {
  label: string;
  currentValue: string;
  children: React.ReactNode;
  helpText?: string;
}) {
  return (
    <div
      className="suggest-change-row"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(160px, 190px) minmax(0, 1fr) minmax(0, 1fr)",
        gap: "14px",
        alignItems: "start",
        padding: "14px 0",
        borderBottom: "1px solid #e2e8f0",
      }}
    >
      <div style={{ paddingTop: "10px" }}>
        <div style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>{label}</div>
        {helpText && (
          <div
            style={{
              fontSize: "11px",
              color: "#94a3b8",
              marginTop: "4px",
              lineHeight: 1.45,
              fontWeight: 400,
            }}
          >
            {helpText}
          </div>
        )}
      </div>
      <div
        style={{
          minHeight: "42px",
          padding: "10px 12px",
          borderRadius: "10px",
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          color: currentValue === "Not available" ? "#94a3b8" : "#334155",
          fontSize: "13px",
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
        }}
      >
        {currentValue}
      </div>
      <div>{children}</div>
    </div>
  );
}

function SuggestChangeSelect({
  value,
  onChange,
  placeholder,
  options,
  disabled,
  searchable,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: LookupOption[];
  disabled?: boolean;
  searchable?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  if (searchable) {
    const selectedOption = options.find((option) => option.value === value);
    const filteredOptions = options.filter((option) =>
      option.label.toLowerCase().includes(searchTerm.trim().toLowerCase())
    );

    return (
      <div ref={containerRef} style={{ position: "relative" }}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setIsOpen((prev) => !prev);
            setSearchTerm("");
          }}
          style={{
            width: "100%",
            minHeight: "42px",
            padding: "10px 12px",
            border: "1.5px solid #cbd5e1",
            borderRadius: "10px",
            fontSize: "13px",
            color: selectedOption ? "#334155" : "#94a3b8",
            outline: "none",
            boxSizing: "border-box",
            background: disabled ? "#f8fafc" : "#ffffff",
            textAlign: "left",
            cursor: disabled ? "not-allowed" : "pointer",
          }}
        >
          {selectedOption?.label || placeholder}
        </button>
        {isOpen && !disabled && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              zIndex: 20,
              border: "1px solid #cbd5e1",
              borderRadius: "12px",
              background: "#ffffff",
              boxShadow: "0 10px 30px rgba(15, 23, 42, 0.12)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "8px" }}>
              <input
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                style={{
                  width: "100%",
                  minHeight: "38px",
                  padding: "8px 10px",
                  border: "1.5px solid #cbd5e1",
                  borderRadius: "8px",
                  fontSize: "13px",
                  color: "#0f172a",
                  WebkitTextFillColor: "#0f172a",
                  caretColor: "#0f172a",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ maxHeight: "220px", overflowY: "auto" }}>
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      onChange(option.value);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "none",
                      borderTop: "1px solid #f1f5f9",
                      background: option.value === value ? "#eff6ff" : "#ffffff",
                      color: "#0f172a",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    {option.label}
                  </button>
                ))
              ) : (
                <div style={{ padding: "10px 12px", fontSize: "13px", color: "#64748b" }}>
                  No matches found
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        minHeight: "42px",
        padding: "10px 12px",
        border: "1.5px solid #cbd5e1",
        borderRadius: "10px",
        background: "white",
        color: disabled ? "#94a3b8" : "#334155",
        fontSize: "13px",
        outline: "none",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function normalizeManagementPerson(
  person: SuggestManagementPerson
): SuggestManagementPerson {
  return {
    ...person,
    name: person.name.trim(),
    roles: person.roles.map((role) => role.trim()),
    location: person.location.trim(),
    bio: person.bio.trim(),
    linkedinUrl: person.linkedinUrl.trim(),
    companyProfileUrl: person.companyProfileUrl.trim(),
  };
}

function managementPersonHasContent(person: SuggestManagementPerson): boolean {
  const normalized = normalizeManagementPerson(person);
  return Boolean(
    normalized.name ||
      normalized.roles.some(Boolean) ||
      normalized.location ||
      normalized.bio ||
      normalized.linkedinUrl ||
      normalized.companyProfileUrl
  );
}

function createEmptyManagementPerson(
  status: SuggestManagementPerson["status"]
): SuggestManagementPerson {
  return {
    localId: `${status.toLowerCase()}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    name: "",
    roles: [""],
    status,
    location: "",
    bio: "",
    linkedinUrl: "",
    companyProfileUrl: "",
    isNew: true,
  };
}

function createEmptyCounterparty(): SuggestCounterparty {
  return {
    localId: `counterparty-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    companyName: "",
    companyId: "",
    roleType: "",
    websiteUrl: "",
    linkedinUrl: "",
    pressReleaseUrl: "",
    individuals: [],
    isNew: true,
  };
}

function createEmptyCorporateEvent(): SuggestCorporateEvent {
  return {
    localId: `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: "",
    announcementDate: "",
    closedDate: "",
    dealType: "",
    dealStatus: "",
    amountMillions: "",
    currency: "",
    fundingStage: "",
    amountSourceUrl: "",
    sourceUrl: "",
    longDescription: "",
    counterparties: [createEmptyCounterparty()],
    isNew: true,
  };
}

function createEmptySubsidiary(): SuggestSubsidiary {
  return {
    localId: `subsidiary-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    companyId: "",
    description: "",
    sectors: [""],
    linkedinMembers: "",
    country: "",
    isNew: true,
  };
}

function normalizeSubsidiary(subsidiary: SuggestSubsidiary): SuggestSubsidiary {
  return {
    ...subsidiary,
    name: subsidiary.name.trim(),
    companyId: subsidiary.companyId.trim(),
    description: subsidiary.description.trim(),
    sectors: subsidiary.sectors.map((sector) => sector.trim()),
    linkedinMembers: subsidiary.linkedinMembers.trim(),
    country: subsidiary.country.trim(),
  };
}

function subsidiaryHasContent(subsidiary: SuggestSubsidiary): boolean {
  const normalized = normalizeSubsidiary(subsidiary);
  return Boolean(
    normalized.name ||
      normalized.companyId ||
      normalized.isNewCompany ||
      normalized.description ||
      normalized.sectors.some(Boolean) ||
      normalized.linkedinMembers ||
      normalized.country
  );
}

function normalizeCounterparty(
  counterparty: SuggestCounterparty
): SuggestCounterparty {
  return {
    ...counterparty,
    companyName: counterparty.companyName.trim(),
    companyId: counterparty.companyId.trim(),
    roleType: counterparty.roleType.trim(),
    websiteUrl: counterparty.websiteUrl.trim(),
    linkedinUrl: counterparty.linkedinUrl.trim(),
    pressReleaseUrl: counterparty.pressReleaseUrl.trim(),
    individuals: counterparty.individuals.map(normalizeManagementPerson),
  };
}

function normalizeCorporateEvent(
  corporateEvent: SuggestCorporateEvent
): SuggestCorporateEvent {
  return {
    ...corporateEvent,
    title: corporateEvent.title.trim(),
    announcementDate: corporateEvent.announcementDate.trim(),
    closedDate: corporateEvent.closedDate.trim(),
    dealType: corporateEvent.dealType.trim(),
    dealStatus: corporateEvent.dealStatus.trim(),
    amountMillions: corporateEvent.amountMillions.trim(),
    currency: corporateEvent.currency.trim(),
    fundingStage: corporateEvent.fundingStage.trim(),
    amountSourceUrl: corporateEvent.amountSourceUrl.trim(),
    sourceUrl: corporateEvent.sourceUrl.trim(),
    longDescription: corporateEvent.longDescription.trim(),
    counterparties: corporateEvent.counterparties.map(normalizeCounterparty),
  };
}

function counterpartyHasContent(counterparty: SuggestCounterparty): boolean {
  const normalized = normalizeCounterparty(counterparty);
  return Boolean(
    normalized.companyName ||
      normalized.companyId ||
      normalized.roleType ||
      normalized.websiteUrl ||
      normalized.linkedinUrl ||
      normalized.pressReleaseUrl ||
      normalized.isNewCompany ||
      normalized.individuals.some(managementPersonHasContent)
  );
}

function corporateEventHasContent(corporateEvent: SuggestCorporateEvent): boolean {
  const normalized = normalizeCorporateEvent(corporateEvent);
  return Boolean(
    normalized.title ||
      normalized.announcementDate ||
      normalized.closedDate ||
      normalized.dealType ||
      normalized.dealStatus ||
      normalized.amountMillions ||
      normalized.currency ||
      normalized.fundingStage ||
      normalized.amountSourceUrl ||
      normalized.sourceUrl ||
      normalized.longDescription ||
      normalized.counterparties.some(counterpartyHasContent)
  );
}

type SuggestChangeEntityRecord = {
  data_type: string;
  record_status: "existing" | "new" | "deleted";
  entity_id: string;
  parent_entity_type?: string;
  parent_entity_id?: string;
  data: Record<string, unknown>;
};

const COMPANY_CHANGE_REQUEST_FIELDS: Array<{
  formKey: keyof SuggestChangeCurrentValues;
  payloadKey: string;
}> = [
  { formKey: "yearFounded", payloadKey: "year_founded" },
  { formKey: "website", payloadKey: "website" },
  { formKey: "ownership", payloadKey: "ownership" },
  { formKey: "hq", payloadKey: "hq" },
  { formKey: "lifecycleStage", payloadKey: "lifecycle_stage" },
  { formKey: "transactionStatus", payloadKey: "transaction_status" },
  { formKey: "description", payloadKey: "description" },
];

type DraftProductTypeItem = { _id: string; Product_Type: string; pc_of_revenues: string };
type DraftDataCollectionItem = { _id: string; Data_Collection_Method: string; Predominance: string };
type DraftRevenueModelItem = { _id: string; Revenue_Model_: string; Predominance: string };

const PRODUCT_TYPE_OPTIONS: LookupOption[] = [
  "Data", "Research", "Software", "News / Other Media", "Events",
  "Consulting", "Training", "Executive Networks", "Expert Networks", "Other",
].map((v) => ({ value: v, label: v }));

const DATA_COLLECTION_OPTIONS: LookupOption[] = [
  "Crowd Sourced", "Customer Data", "Data Co-op", "Data Exhaust",
  "Give-to-Get / Contributory", "Manual", "Public Filings / Government Data",
  "Purchased Data", "Satellite Data", "Sensor / IoT Data", "Surveys",
  "Transaction-Generated", "Web Scraping", "Telemetry",
].map((v) => ({ value: v, label: v }));

const REVENUE_MODEL_OPTIONS: LookupOption[] = [
  "Subscription", "Consumption-Based / Usage-Based", "Freemium", "Consulting",
  "Advertising", "Sponsorship", "Transaction Fees", "Licensing", "Other",
].map((v) => ({ value: v, label: v }));

const PERCENT_OF_REVENUE_OPTIONS: LookupOption[] = [
  "",
  "1",
  "2",
  "3",
  "4",
  "5",
  "10",
  "15",
  "20",
  "25",
  "30",
  "35",
  "40",
  "45",
  "50",
  "55",
  "60",
  "65",
  "70",
  "75",
  "80",
  "85",
  "90",
  "95",
  "100",
]
  .filter((v) => v !== "")
  .map((v) => ({ value: v, label: `${v}%` }));

const PREDOMINANCE_OPTIONS: LookupOption[] = [
  { value: "Main", label: "Main" },
  { value: "Minor", label: "Minor" },
];


const TRANSACTION_STATUS_OPTIONS: LookupOption[] = [
  "Rumoured in Market",
  "Transaction anticipated within 18 months",
  "Reported in Market",
].map((v) => ({ value: v, label: v }));

function normalizeSuggestDisplayValue(value: string): string {
  const trimmed = value.trim();
  return trimmed === "Not available" ? "" : trimmed;
}

function parseSuggestMultiValue(value: string): string[] {
  const normalized = normalizeSuggestDisplayValue(value);
  if (!normalized) return [];
  return normalized
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function createSuggestChangeEntityRecord(
  dataType: string,
  recordStatus: SuggestChangeEntityRecord["record_status"],
  entityId: string,
  data: Record<string, unknown>,
  parentEntityType?: string,
  parentEntityId?: string
): SuggestChangeEntityRecord {
  return {
    data_type: dataType,
    record_status: recordStatus,
    entity_id: entityId,
    ...(parentEntityType ? { parent_entity_type: parentEntityType } : {}),
    ...(parentEntityId ? { parent_entity_id: parentEntityId } : {}),
    data,
  };
}

function serializeCompanySelection(
  selection: SuggestCompanySelection
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    company_id: selection.companyId,
    company_name: selection.companyName,
    company_record_status: selection.isNewCompany ? "new" : "existing",
  };
  if (selection.isNewCompany && selection.newCompanyProfile) {
    base.is_new_company = true;
    base.new_company_profile = {
      name: selection.newCompanyProfile.name || selection.companyName,
      description: selection.newCompanyProfile.description,
      primary_sectors: selection.newCompanyProfile.primarySectors.filter(Boolean),
      secondary_sectors: selection.newCompanyProfile.secondarySectors.filter(Boolean),
      year_founded: selection.newCompanyProfile.yearFounded,
      ownership: selection.newCompanyProfile.ownership,
      website: selection.newCompanyProfile.websiteUrl,
      hq: selection.newCompanyProfile.hq,
    };
  }
  return base;
}

function applyInvestorStyleCompanyListDiff(
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>,
  chips: InvestorChip[],
  listKey: string,
  diffKey: string
): void {
  const hasChange = chips.some((c) => c.status !== "existing");
  if (!hasChange) return;

  oldData[listKey] = chips
    .filter((c) => c.status !== "added")
    .map((c) => ({ company_id: c.companyId, company_name: c.companyName }));
  newData[listKey] = chips.filter((c) => c.status !== "removed").map((c) => {
    const base: Record<string, unknown> = {
      company_id: c.companyId,
      company_name: c.companyName,
      company_record_status: c.isNewCompany ? "new" : "existing",
    };
    if (c.isNewCompany && c.newCompanyProfile) {
      base.is_new_company = true;
      base.new_company_profile = {
        name: c.newCompanyProfile.name || c.companyName,
        description: c.newCompanyProfile.description,
        primary_sectors: c.newCompanyProfile.primarySectors.filter(Boolean),
        secondary_sectors: c.newCompanyProfile.secondarySectors.filter(Boolean),
        year_founded: c.newCompanyProfile.yearFounded,
        ownership: c.newCompanyProfile.ownership,
        website: c.newCompanyProfile.websiteUrl,
        hq: c.newCompanyProfile.hq,
      };
    }
    return base;
  });
  const added = chips.filter((c) => c.status === "added");
  const removed = chips.filter((c) => c.status === "removed");
  newData[diffKey] = {
    added: added.map((c) => ({
      company_id: c.companyId,
      company_name: c.companyName,
      change_action: "add",
      company_record_status: c.isNewCompany ? "new" : "existing",
      ...(c.isNewCompany
        ? {
            is_new_company: true,
            new_company_profile: serializeCompanySelection({
              localId: c.localId,
              companyId: c.companyId,
              companyName: c.companyName,
              isNewCompany: true,
              newCompanyProfile: c.newCompanyProfile,
            }).new_company_profile,
          }
        : {}),
    })),
    removed: removed.map((c) => ({
      company_id: c.companyId,
      company_name: c.companyName,
      change_action: "remove",
      company_record_status: "existing",
    })),
  };
}

function buildCompanyChangeDiff({
  companyId,
  companyName,
  formData,
  primarySectorChips,
  secondarySectorChips,
  investorChips,
  peersCompetitorChips,
  potentialAcquirerChips,
  acquisitionTargetChips,
  parentCompany,
  currentValues,
  productTypeItems,
  dataCollectionItems,
  revenueModelItems,
}: {
  companyId: string;
  companyName: string;
  formData: Record<string, string>;
  primarySectorChips: SectorChip[];
  secondarySectorChips: SectorChip[];
  investorChips: InvestorChip[];
  peersCompetitorChips: InvestorChip[];
  potentialAcquirerChips: InvestorChip[];
  acquisitionTargetChips: InvestorChip[];
  parentCompany?: SuggestCompanySelection;
  currentValues: SuggestChangeCurrentValues;
  productTypeItems?: DraftProductTypeItem[];
  dataCollectionItems?: DraftDataCollectionItem[];
  revenueModelItems?: DraftRevenueModelItem[];
}): {
  oldRecord: SuggestChangeEntityRecord | null;
  newRecord: SuggestChangeEntityRecord | null;
} {
  const oldData: Record<string, unknown> = {
    new_company_id: Number(companyId),
    company_name: companyName,
  };
  const newData: Record<string, unknown> = {
    new_company_id: Number(companyId),
    company_name: companyName,
  };

  COMPANY_CHANGE_REQUEST_FIELDS.forEach(({ formKey, payloadKey }) => {
    const nextValue = (formData[formKey] || "").trim();
    if (!nextValue) return;
    oldData[payloadKey] = normalizeSuggestDisplayValue(String(currentValues[formKey] || ""));
    newData[payloadKey] = nextValue;
  });

  const primaryHasChange = primarySectorChips.some((c) => c.status !== "existing");
  if (primaryHasChange) {
    oldData.primary_sectors = parseSuggestMultiValue(currentValues.primarySectors);
    newData.primary_sectors = primarySectorChips
      .filter((c) => c.status !== "removed")
      .map((c) => c.optionValue);
    const addedPrimary = primarySectorChips.filter((c) => c.status === "added");
    const removedPrimary = primarySectorChips.filter((c) => c.status === "removed");
    newData.primary_sectors_diff = {
      added: addedPrimary.map((c) => ({
        value: c.optionValue,
        label: c.label,
        change_action: "add",
      })),
      removed: removedPrimary.map((c) => ({
        value: c.optionValue,
        label: c.label,
        change_action: "remove",
      })),
    };
  }

  const secondaryHasChange = secondarySectorChips.some((c) => c.status !== "existing");
  if (secondaryHasChange) {
    oldData.secondary_sectors = parseSuggestMultiValue(currentValues.secondarySectors);
    newData.secondary_sectors = secondarySectorChips
      .filter((c) => c.status !== "removed")
      .map((c) => c.optionValue);
    const addedSecondary = secondarySectorChips.filter((c) => c.status === "added");
    const removedSecondary = secondarySectorChips.filter((c) => c.status === "removed");
    newData.secondary_sectors_diff = {
      added: addedSecondary.map((c) => ({
        value: c.optionValue,
        label: c.label,
        change_action: "add",
      })),
      removed: removedSecondary.map((c) => ({
        value: c.optionValue,
        label: c.label,
        change_action: "remove",
      })),
    };
  }

  applyInvestorStyleCompanyListDiff(oldData, newData, investorChips, "investors", "investors_diff");
  applyInvestorStyleCompanyListDiff(
    oldData,
    newData,
    peersCompetitorChips,
    "peers_competitors",
    "peers_competitors_diff"
  );
  applyInvestorStyleCompanyListDiff(
    oldData,
    newData,
    potentialAcquirerChips,
    "potential_acquirers",
    "potential_acquirers_diff"
  );
  applyInvestorStyleCompanyListDiff(
    oldData,
    newData,
    acquisitionTargetChips,
    "acquisition_targets",
    "acquisition_targets_diff"
  );

  const parentHasContent =
    parentCompany &&
    (parentCompany.companyName.trim() ||
      parentCompany.companyId.trim() ||
      (parentCompany.isNewCompany &&
        parentCompany.newCompanyProfile &&
        newCompanyProfileHasContent(parentCompany.newCompanyProfile)));

  if (parentHasContent && parentCompany) {
    oldData.parent_company = {
      company_id: currentValues.parentCompanyId || "",
      company_name: currentValues.parentCompany || "",
      company_record_status: "existing",
    };
    newData.parent_company = {
      ...serializeCompanySelection(parentCompany),
      change_action: "set",
    };
  }

  if (productTypeItems) {
    const initialPt = currentValues.productType
      .filter((item) => String(item?.Product_Type || "").trim())
      .map((item) => ({
        Product_Type: String(item.Product_Type || "").trim(),
        pc_of_revenues: String(item.pc_of_revenues || "").trim(),
      }));
    const newPt = productTypeItems
      .filter((item) => String(item?.Product_Type || "").trim())
      .map((item) => ({
        Product_Type: String(item.Product_Type || "").trim(),
        pc_of_revenues: String(item.pc_of_revenues || "").trim(),
      }));
    if (JSON.stringify(initialPt) !== JSON.stringify(newPt)) {
      oldData.product_type = initialPt;
      newData.product_type = newPt;
    }
  }

  if (dataCollectionItems) {
    const initialDc = currentValues.dataCollectionMethod
      .filter((item) => String(item?.Data_Collection_Method || "").trim())
      .map((item) => ({
        Data_Collection_Method: String(item.Data_Collection_Method || "").trim(),
        Predominance: String(item.Predominance || "").trim(),
      }));
    const newDc = dataCollectionItems
      .filter((item) => String(item?.Data_Collection_Method || "").trim())
      .map((item) => ({
        Data_Collection_Method: String(item.Data_Collection_Method || "").trim(),
        Predominance: String(item.Predominance || "").trim(),
      }));
    if (JSON.stringify(initialDc) !== JSON.stringify(newDc)) {
      oldData.data_collection_method = initialDc;
      newData.data_collection_method = newDc;
    }
  }

  if (revenueModelItems) {
    const initialRm = currentValues.revenueModel
      .filter((item) => String(item?.Revenue_Model_ || "").trim())
      .map((item) => ({
        Revenue_Model_: String(item.Revenue_Model_ || "").trim(),
        Predominance: String(item.Predominance || "").trim(),
      }));
    const newRm = revenueModelItems
      .filter((item) => String(item?.Revenue_Model_ || "").trim())
      .map((item) => ({
        Revenue_Model_: String(item.Revenue_Model_ || "").trim(),
        Predominance: String(item.Predominance || "").trim(),
      }));
    if (JSON.stringify(initialRm) !== JSON.stringify(newRm)) {
      oldData.revenue_model = initialRm;
      newData.revenue_model = newRm;
    }
  }

  const hasChanges = Object.keys(newData).length > 2;
  if (!hasChanges) {
    return { oldRecord: null, newRecord: null };
  }

  return {
    oldRecord: createSuggestChangeEntityRecord(
      "company",
      "existing",
      companyId,
      oldData
    ),
    newRecord: createSuggestChangeEntityRecord(
      "company",
      "existing",
      companyId,
      newData
    ),
  };
}

function buildEntityArrayDiff<T extends { localId: string }>({
  currentItems,
  initialItems,
  normalize,
  hasContent,
  toData,
  dataType,
  parentEntityType,
  parentEntityId,
}: {
  currentItems: T[];
  initialItems: T[];
  normalize: (item: T) => T;
  hasContent: (item: T) => boolean;
  toData: (item: T) => Record<string, unknown>;
  dataType: string;
  parentEntityType?: string;
  parentEntityId?: string;
}): {
  oldRecords: SuggestChangeEntityRecord[];
  newRecords: SuggestChangeEntityRecord[];
} {
  const oldRecords: SuggestChangeEntityRecord[] = [];
  const newRecords: SuggestChangeEntityRecord[] = [];

  const initialById = new Map(
    initialItems.map((item) => [item.localId, normalize(item)])
  );
  const currentById = new Map(currentItems.map((item) => [item.localId, normalize(item)]));
  const ids = new Set([
    ...Array.from(initialById.keys()),
    ...Array.from(currentById.keys()),
  ]);

  ids.forEach((id) => {
    const initialItem = initialById.get(id);
    const currentItem = currentById.get(id);

    if (initialItem && currentItem) {
      if (JSON.stringify(initialItem) === JSON.stringify(currentItem)) {
        return;
      }
      oldRecords.push(
        createSuggestChangeEntityRecord(
          dataType,
          "existing",
          id,
          toData(initialItem),
          parentEntityType,
          parentEntityId
        )
      );
      newRecords.push(
        createSuggestChangeEntityRecord(
          dataType,
          "existing",
          id,
          toData(currentItem),
          parentEntityType,
          parentEntityId
        )
      );
      return;
    }

    if (!initialItem && currentItem) {
      if (!hasContent(currentItem)) return;
      oldRecords.push(
        createSuggestChangeEntityRecord(
          dataType,
          "new",
          id,
          {},
          parentEntityType,
          parentEntityId
        )
      );
      newRecords.push(
        createSuggestChangeEntityRecord(
          dataType,
          "new",
          id,
          toData(currentItem),
          parentEntityType,
          parentEntityId
        )
      );
      return;
    }

    if (initialItem && !currentItem) {
      oldRecords.push(
        createSuggestChangeEntityRecord(
          dataType,
          "deleted",
          id,
          toData(initialItem),
          parentEntityType,
          parentEntityId
        )
      );
      newRecords.push(
        createSuggestChangeEntityRecord(
          dataType,
          "deleted",
          id,
          {},
          parentEntityType,
          parentEntityId
        )
      );
    }
  });

  return { oldRecords, newRecords };
}

function managementPersonToChangeData(
  person: SuggestManagementPerson
): Record<string, unknown> {
  return {
    record_status: person.isNew ? "new" : "existing",
    name: person.name,
    roles: person.roles.filter(Boolean),
    status: person.status,
    location: person.location,
    bio: person.bio,
    linkedin_url: person.linkedinUrl,
    company_profile_url: person.companyProfileUrl,
  };
}

function subsidiaryToChangeData(subsidiary: SuggestSubsidiary): Record<string, unknown> {
  const base: Record<string, unknown> = {
    name: subsidiary.name,
    company_id: subsidiary.companyId,
    description: subsidiary.description,
    sectors: subsidiary.sectors.filter(Boolean),
    linkedin_members: subsidiary.linkedinMembers,
    country: subsidiary.country,
  };
  if (subsidiary.isNewCompany && subsidiary.newCompanyProfile) {
    base.is_new_company = true;
    base.new_company_profile = {
      name: subsidiary.newCompanyProfile.name || subsidiary.name,
      description: subsidiary.newCompanyProfile.description,
      primary_sectors: subsidiary.newCompanyProfile.primarySectors.filter(Boolean),
      secondary_sectors: subsidiary.newCompanyProfile.secondarySectors.filter(Boolean),
      year_founded: subsidiary.newCompanyProfile.yearFounded,
      ownership: subsidiary.newCompanyProfile.ownership,
      website: subsidiary.newCompanyProfile.websiteUrl,
      hq: subsidiary.newCompanyProfile.hq,
    };
  }
  return base;
}

function counterpartyToChangeData(counterparty: SuggestCounterparty): Record<string, unknown> {
  const base: Record<string, unknown> = {
    record_status: counterparty.isNew ? "new" : "existing",
    company_name: counterparty.companyName,
    company_id: counterparty.companyId,
    company_record_status: counterparty.isNewCompany ? "new" : "existing",
    role_type: counterparty.roleType,
    website_url: counterparty.websiteUrl,
    linkedin_url: counterparty.linkedinUrl,
    press_release_url: counterparty.pressReleaseUrl,
    individuals: counterparty.individuals
      .map(normalizeManagementPerson)
      .filter(managementPersonHasContent)
      .map(managementPersonToChangeData),
  };
  if (counterparty.isNewCompany && counterparty.newCompanyProfile) {
    base.is_new_company = true;
    base.new_company_profile = {
      name: counterparty.newCompanyProfile.name || counterparty.companyName,
      description: counterparty.newCompanyProfile.description,
      primary_sectors: counterparty.newCompanyProfile.primarySectors.filter(Boolean),
      secondary_sectors: counterparty.newCompanyProfile.secondarySectors.filter(Boolean),
      year_founded: counterparty.newCompanyProfile.yearFounded,
      ownership: counterparty.newCompanyProfile.ownership,
      website: counterparty.newCompanyProfile.websiteUrl,
      hq: counterparty.newCompanyProfile.hq,
    };
  }
  return base;
}

function corporateEventToChangeData(
  corporateEvent: SuggestCorporateEvent
): Record<string, unknown> {
  return {
    title: corporateEvent.title,
    announcement_date: corporateEvent.announcementDate,
    closed_date: corporateEvent.closedDate,
    deal_type: corporateEvent.dealType,
    deal_status: corporateEvent.dealStatus,
    amount_millions: corporateEvent.amountMillions,
    currency: corporateEvent.currency,
    funding_stage: corporateEvent.fundingStage,
    amount_source_url: corporateEvent.amountSourceUrl,
    source_url: corporateEvent.sourceUrl,
    long_description: corporateEvent.longDescription,
    counterparties: corporateEvent.counterparties
      .map(normalizeCounterparty)
      .filter(counterpartyHasContent)
      .map(counterpartyToChangeData),
  };
}

function SuggestManagementPersonEditor({
  person,
  roleOptions,
  onChange,
  onAddRole,
  onRemoveRole,
  onRemovePerson,
}: {
  person: SuggestManagementPerson;
  roleOptions: LookupOption[];
  onChange: (next: SuggestManagementPerson) => void;
  onAddRole: () => void;
  onRemoveRole: (roleIndex: number) => void;
  onRemovePerson: () => void;
}) {

  return (
    <div
      className="suggest-management-card"
      style={{
        border: "1px solid #dbeafe",
        borderRadius: "14px",
        padding: "18px",
        background: "#f8fbff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            fontSize: "16px",
            fontWeight: 700,
            color: "#0f172a",
          }}
        >
          {person.isNew ? "Add New Individual" : person.name || "Edit Individual"}
        </div>
        {person.isNew && (
          <button
            type="button"
            onClick={onRemovePerson}
            style={{
              padding: "8px 12px",
              borderRadius: "10px",
              border: "1px solid #fecaca",
              background: "#fff1f2",
              color: "#9f1239",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            Remove
          </button>
        )}
      </div>

      <div
        className="suggest-management-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "14px",
        }}
      >
        <div style={{ gridColumn: "1 / -1" }}>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#475569",
            }}
          >
            Name
          </label>
          <input
            value={person.name}
            onChange={(e) => onChange({ ...person, name: e.target.value })}
            placeholder="Full name"
            style={{
              width: "100%",
              minHeight: "42px",
              padding: "10px 12px",
              border: "1.5px solid #cbd5e1",
              borderRadius: "10px",
              fontSize: "13px",
              color: "#334155",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#475569",
            }}
          >
            Role / Position
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {person.roles.map((role, roleIndex) => (
              <div
                key={`${person.localId}-role-${roleIndex}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <div style={{ flex: 1 }}>
                  <SuggestChangeSelect
                    value={role}
                    onChange={(value) =>
                      onChange({
                        ...person,
                        roles: person.roles.map((item, index) =>
                          index === roleIndex ? value : item
                        ),
                      })
                    }
                    placeholder="Select role"
                    options={roleOptions}
                  />
                </div>
                {person.roles.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveRole(roleIndex)}
                    style={{
                      width: "42px",
                      minWidth: "42px",
                      height: "42px",
                      borderRadius: "10px",
                      border: "1px solid #fecaca",
                      background: "#fff1f2",
                      color: "#9f1239",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    X
                  </button>
                )}
              </div>
            ))}
            <div>
              <button
                type="button"
                onClick={onAddRole}
                style={{
                  padding: "9px 14px",
                  borderRadius: "10px",
                  border: "1px solid #bfdbfe",
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                + Add Another Role
              </button>
            </div>
          </div>
        </div>

        <div>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#475569",
            }}
          >
            Status
          </label>
          <SuggestChangeSelect
            value={person.status}
            onChange={(value) =>
              onChange({
                ...person,
                status: (value || "Current") as SuggestManagementPerson["status"],
              })
            }
            placeholder="Choose status"
            options={SUGGEST_CHANGE_STATUS_OPTIONS}
          />
        </div>

        <div>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#475569",
            }}
          >
            Location
          </label>
          <LocationSearchInput
            value={person.location}
            onChange={(label) => onChange({ ...person, location: label })}
            placeholder="Search city, country…"
          />
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#475569",
            }}
          >
            Bio
          </label>
          <textarea
            value={person.bio}
            onChange={(e) => onChange({ ...person, bio: e.target.value })}
            placeholder="Short biography"
            rows={4}
            style={{
              width: "100%",
              minHeight: "110px",
              padding: "12px",
              border: "1.5px solid #cbd5e1",
              borderRadius: "10px",
              fontSize: "13px",
              color: "#334155",
              outline: "none",
              resize: "vertical",
              boxSizing: "border-box",
              fontFamily: "inherit",
              lineHeight: 1.5,
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#475569",
            }}
          >
            LinkedIn URL
          </label>
          <div style={{ display: "flex", gap: "8px", alignItems: "stretch" }}>
            <input
              value={person.linkedinUrl}
              onChange={(e) => onChange({ ...person, linkedinUrl: e.target.value })}
              placeholder="https://linkedin.com/in/..."
              style={{
                width: "100%",
                minHeight: "42px",
                padding: "10px 12px",
                border: "1.5px solid #cbd5e1",
                borderRadius: "10px",
                fontSize: "13px",
                color: "#334155",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        <div>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#475569",
            }}
          >
            Company Profile URL
          </label>
          <input
            value={person.companyProfileUrl}
            onChange={(e) =>
              onChange({ ...person, companyProfileUrl: e.target.value })
            }
            placeholder="https://..."
            style={{
              width: "100%",
              minHeight: "42px",
              padding: "10px 12px",
              border: "1.5px solid #cbd5e1",
              borderRadius: "10px",
              fontSize: "13px",
              color: "#334155",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>
    </div>
  );
}

const LOCATIONS_API = "https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob/locations";

interface LocationOption {
  id: number;
  display_label: string;
}

function LocationSearchInput({
  value,
  onChange,
  placeholder = "Search city, country…",
}: {
  value: string;
  onChange: (label: string) => void;
  placeholder?: string;
}) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<LocationOption[]>([]);
  const [limit, setLimit] = useState(10);
  const [hasMore, setHasMore] = useState(false);
  const limitRef = useRef(limit);
  limitRef.current = limit;

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const query = inputValue.trim();
    if (!isOpen || query.length < 2) {
      setOptions([]);
      setLoading(false);
      setHasMore(false);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      try {
        const url = `${LOCATIONS_API}?search=${encodeURIComponent(query)}&limit=${limitRef.current}`;
        const res = await fetch(url, { headers: { Accept: "application/json" } });
        const data: LocationOption[] = await res.json();
        if (!cancelled) {
          setOptions(data);
          setHasMore(data.length === limitRef.current);
        }
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isOpen, inputValue, limit]);

  const handleLoadMore = async () => {
    const nextLimit = limit + 10;
    setLimit(nextLimit);
    const query = inputValue.trim();
    if (!query) return;
    setLoading(true);
    try {
      const url = `${LOCATIONS_API}?search=${encodeURIComponent(query)}&limit=${nextLimit}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const data: LocationOption[] = await res.json();
      setOptions(data);
      setHasMore(data.length === nextLimit);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const showDropdown = isOpen && inputValue.trim().length >= 2;

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <div
          style={{
            position: "absolute",
            left: "11px",
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
            color: "#94a3b8",
            display: "flex",
            alignItems: "center",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="7" cy="7" r="5" />
            <line x1="11" y1="11" x2="15" y2="15" />
          </svg>
        </div>
        <input
          value={inputValue}
          onFocus={() => setIsOpen(true)}
          onBlur={() => { window.setTimeout(() => setIsOpen(false), 150); }}
          onChange={(e) => {
            setInputValue(e.target.value);
            setLimit(10);
            setIsOpen(true);
          }}
          placeholder={placeholder}
          style={{
            width: "100%",
            minHeight: "42px",
            padding: "10px 36px 10px 32px",
            border: "1.5px solid #cbd5e1",
            borderRadius: "10px",
            fontSize: "13px",
            color: "#334155",
            outline: "none",
            boxSizing: "border-box",
            background: "#ffffff",
          }}
        />
        {inputValue && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setInputValue("");
              onChange("");
              setOptions([]);
            }}
            style={{
              position: "absolute",
              right: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#94a3b8",
              padding: "2px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="2" y1="2" x2="10" y2="10" />
              <line x1="10" y1="2" x2="2" y2="10" />
            </svg>
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 20,
            border: "1px solid #cbd5e1",
            borderRadius: "12px",
            background: "#ffffff",
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.12)",
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          {loading && options.length === 0 ? (
            <div style={{ padding: "10px 12px", fontSize: "13px", color: "#64748b" }}>Searching…</div>
          ) : options.length === 0 ? (
            <div style={{ padding: "10px 12px", fontSize: "13px", color: "#94a3b8", fontStyle: "italic" }}>No locations found</div>
          ) : (
            <>
              {options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setInputValue(opt.display_label);
                    onChange(opt.display_label);
                    setIsOpen(false);
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "none",
                    borderBottom: "1px solid #f1f5f9",
                    background: opt.display_label === value ? "#eff6ff" : "#ffffff",
                    color: "#0f172a",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
                >
                  {opt.display_label}
                </button>
              ))}
              {hasMore && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    void handleLoadMore();
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "none",
                    borderTop: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    color: "#1d4ed8",
                    textAlign: "center",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  {loading ? "Loading…" : "Load more results"}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SuggestCompanySearchInput({
  value,
  selectedCompanyId,
  placeholder,
  onChange,
  onSelect,
  onSearch,
  onAddNew,
  hideSelectedId,
}: {
  value: string;
  selectedCompanyId: string;
  placeholder: string;
  onChange: (value: string) => void;
  onSelect: (option: SearchCompanyOption) => void;
  onSearch: (query: string) => Promise<SearchCompanyOption[]>;
  onAddNew?: (name: string) => void;
  hideSelectedId?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<SearchCompanyOption[]>([]);

  useEffect(() => {
    const query = value.trim();
    if (!isOpen || query.length < 2) {
      setOptions([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      try {
        const nextOptions = await onSearch(query);
        if (!cancelled) {
          setOptions(nextOptions);
        }
      } catch {
        if (!cancelled) {
          setOptions([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isOpen, onSearch, value]);

  const showDropdown = isOpen && (value.trim().length >= 2 || value.trim().length === 0);
  const hasQuery = value.trim().length >= 2;

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <div
          style={{
            position: "absolute",
            left: "11px",
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
            color: "#94a3b8",
            display: "flex",
            alignItems: "center",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="7" cy="7" r="5" />
            <line x1="11" y1="11" x2="15" y2="15" />
          </svg>
        </div>
        <input
          value={value}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setIsOpen(false), 150);
          }}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          placeholder={placeholder}
          style={{
            width: "100%",
            minHeight: "42px",
            padding: "10px 36px 10px 32px",
            border: "1.5px solid #cbd5e1",
            borderRadius: "10px",
            fontSize: "13px",
            color: "#334155",
            outline: "none",
            boxSizing: "border-box",
            background: "#ffffff",
            cursor: "text",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: "11px",
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
            color: "#94a3b8",
            display: "flex",
            alignItems: "center",
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="2 4 6 8 10 4" />
          </svg>
        </div>
      </div>
      {!hideSelectedId && (
        <div style={{ marginTop: "6px", fontSize: "12px", color: "#64748b" }}>
          Selected company ID: {selectedCompanyId || "Not selected"}
        </div>
      )}
      {showDropdown && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 20,
            border: "1px solid #cbd5e1",
            borderRadius: "12px",
            background: "#ffffff",
            boxShadow: "0 10px 30px rgba(15, 23, 42, 0.12)",
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          {!hasQuery ? (
            <div style={{ padding: "10px 12px", fontSize: "13px", color: "#94a3b8", fontStyle: "italic" }}>
              Type to search companies…
            </div>
          ) : loading ? (
            <div style={{ padding: "10px 12px", fontSize: "13px", color: "#64748b" }}>
              Searching...
            </div>
          ) : options.length > 0 ? (
            <>
              {options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onSelect(option);
                    setIsOpen(false);
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "none",
                    borderBottom: "1px solid #f1f5f9",
                    background: option.id === selectedCompanyId ? "#eff6ff" : "#ffffff",
                    color: "#0f172a",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: "13px", fontWeight: 600 }}>{option.label}</div>
                </button>
              ))}
              {onAddNew && (
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onAddNew(value.trim());
                    setIsOpen(false);
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "none",
                    borderTop: "2px solid #e2e8f0",
                    background: "#f0fdf4",
                    color: "#15803d",
                    textAlign: "left",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  + Add &quot;{value.trim()}&quot; as new company
                </button>
              )}
            </>
          ) : (
            <div>
              <div style={{ padding: "10px 12px", fontSize: "13px", color: "#64748b" }}>
                No companies found
              </div>
              {onAddNew && (
                <button
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    onAddNew(value.trim());
                    setIsOpen(false);
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "none",
                    borderTop: "1px solid #e2e8f0",
                    background: "#f0fdf4",
                    color: "#15803d",
                    textAlign: "left",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  + Add &quot;{value.trim()}&quot; as new company
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NewCompanyModal({
  profile,
  title,
  sectorOptions,
  secondarySectorOptions,
  ownershipOptions,
  yearOptions,
  onSave,
  onClose,
  simpleMode = false,
  forceOwnership,
}: {
  profile: SuggestNewCompanyProfile;
  title?: string;
  sectorOptions: LookupOption[];
  secondarySectorOptions?: LookupOption[];
  ownershipOptions: LookupOption[];
  yearOptions: LookupOption[];
  onSave: (profile: SuggestNewCompanyProfile) => void;
  onClose: () => void;
  /** Investor mode — collect Name + Website only */
  simpleMode?: boolean;
  /** Auto-fill and lock ownership (e.g. "Subsidiary") */
  forceOwnership?: string;
}) {
  const [draft, setDraft] = useState<SuggestNewCompanyProfile>({
    ...profile,
    ...(forceOwnership ? { ownership: forceOwnership } : {}),
  });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(15, 23, 42, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "560px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "22px 24px 18px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "12px",
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
              {title || "New Company Profile"}
            </div>
            <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
              Fill in what you know — our team will create this profile.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              background: "white",
              color: "#64748b",
              cursor: "pointer",
              fontSize: "20px",
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            padding: "22px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            overflowY: "auto",
          }}
        >
          {/* Company Name */}
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontSize: "12px",
                fontWeight: 600,
                color: "#475569",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Company Name *
            </label>
            <input
              value={draft.name}
              onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Company name"
              style={{
                width: "100%",
                minHeight: "40px",
                padding: "9px 12px",
                border: "1.5px solid #cbd5e1",
                borderRadius: "9px",
                fontSize: "13px",
                color: "#334155",
                outline: "none",
                boxSizing: "border-box",
                background: "white",
              }}
            />
          </div>

          {/* Description — hidden in simple mode */}
          {!simpleMode && (
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontSize: "12px",
                fontWeight: 600,
                color: "#475569",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Description
            </label>
            <textarea
              value={draft.description}
              onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Brief overview of what this company does"
              rows={3}
              style={{
                width: "100%",
                minHeight: "84px",
                padding: "9px 12px",
                border: "1.5px solid #cbd5e1",
                borderRadius: "9px",
                fontSize: "13px",
                color: "#334155",
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
                fontFamily: "inherit",
                lineHeight: 1.5,
                background: "white",
              }}
            />
          </div>
          )}

          {/* Primary Sectors — hidden in simple mode */}
          {!simpleMode && (
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontSize: "12px",
                fontWeight: 600,
                color: "#475569",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Primary Sector(s)
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {draft.primarySectors.map((sector, i) => (
                <div
                  key={`primary-sector-${i}`}
                  style={{ display: "flex", gap: "8px", alignItems: "center" }}
                >
                  <div style={{ flex: 1 }}>
                    <SuggestChangeSelect
                      value={sector}
                      onChange={(value) =>
                        setDraft((prev) => ({
                          ...prev,
                          primarySectors: prev.primarySectors.map((s, idx) =>
                            idx === i ? value : s
                          ),
                        }))
                      }
                      placeholder="Select primary sector"
                      options={sectorOptions}
                      searchable={true}
                    />
                  </div>
                  {draft.primarySectors.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          primarySectors: prev.primarySectors.filter((_, idx) => idx !== i),
                        }))
                      }
                      style={{
                        width: "38px",
                        minWidth: "38px",
                        height: "42px",
                        borderRadius: "8px",
                        border: "1px solid #fecaca",
                        background: "#fff1f2",
                        color: "#9f1239",
                        cursor: "pointer",
                        fontWeight: 700,
                        fontSize: "16px",
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <div>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      primarySectors: [...prev.primarySectors, ""],
                    }))
                  }
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "1px solid #bfdbfe",
                    background: "white",
                    color: "#1d4ed8",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  + Add Primary Sector
                </button>
              </div>
            </div>
          </div>
          )} {/* end !simpleMode primary sectors */}

          {/* Secondary Sectors — hidden in simple mode */}
          {!simpleMode && (
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontSize: "12px",
                fontWeight: 600,
                color: "#475569",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Secondary Sector(s)
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {draft.secondarySectors.map((sector, i) => (
                <div
                  key={`secondary-sector-${i}`}
                  style={{ display: "flex", gap: "8px", alignItems: "center" }}
                >
                  <div style={{ flex: 1 }}>
                    <SuggestChangeSelect
                      value={sector}
                      onChange={(value) =>
                        setDraft((prev) => ({
                          ...prev,
                          secondarySectors: prev.secondarySectors.map((s, idx) =>
                            idx === i ? value : s
                          ),
                        }))
                      }
                      placeholder="Select secondary sector"
                      options={secondarySectorOptions ?? sectorOptions}
                      searchable={true}
                    />
                  </div>
                  {draft.secondarySectors.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          secondarySectors: prev.secondarySectors.filter(
                            (_, idx) => idx !== i
                          ),
                        }))
                      }
                      style={{
                        width: "38px",
                        minWidth: "38px",
                        height: "42px",
                        borderRadius: "8px",
                        border: "1px solid #fecaca",
                        background: "#fff1f2",
                        color: "#9f1239",
                        cursor: "pointer",
                        fontWeight: 700,
                        fontSize: "16px",
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <div>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      secondarySectors: [...prev.secondarySectors, ""],
                    }))
                  }
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    border: "1px solid #bfdbfe",
                    background: "white",
                    color: "#1d4ed8",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  + Add Secondary Sector
                </button>
              </div>
            </div>
          </div>
          )} {/* end !simpleMode secondary sectors */}

          {/* Year Founded + Ownership — hidden in simple mode */}
          {!simpleMode && (
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}
            className="suggest-management-grid"
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#475569",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Year Founded
              </label>
              <SuggestChangeSelect
                value={draft.yearFounded}
                onChange={(value) => setDraft((prev) => ({ ...prev, yearFounded: value }))}
                placeholder="Select year"
                options={yearOptions}
                searchable={true}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#475569",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Ownership
              </label>
              {forceOwnership ? (
                <div style={{
                  padding: "10px 12px",
                  borderRadius: "9px",
                  border: "1.5px solid #e2e8f0",
                  background: "#f8fafc",
                  fontSize: "13px",
                  color: "#334155",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}>
                  <span>{forceOwnership}</span>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>(auto-filled)</span>
                </div>
              ) : (
                <SuggestChangeSelect
                  value={draft.ownership}
                  onChange={(value) => setDraft((prev) => ({ ...prev, ownership: value }))}
                  placeholder="Ownership type"
                  options={ownershipOptions}
                />
              )}
            </div>
          </div>
          )} {/* end !simpleMode year/ownership */}

          {/* Website — always shown */}
          <div
            style={simpleMode ? {} : { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}
            className={simpleMode ? "" : "suggest-management-grid"}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#475569",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Website
              </label>
              <input
                value={draft.websiteUrl}
                onChange={(e) => setDraft((prev) => ({ ...prev, websiteUrl: e.target.value }))}
                placeholder="https://..."
                style={{
                  width: "100%",
                  minHeight: "40px",
                  padding: "9px 12px",
                  border: "1.5px solid #cbd5e1",
                  borderRadius: "9px",
                  fontSize: "13px",
                  color: "#334155",
                  outline: "none",
                  boxSizing: "border-box",
                  background: "white",
                }}
              />
            </div>

            {/* HQ — hidden in simple mode */}
            {!simpleMode && (
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "5px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#475569",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                HQ Location
              </label>
              <input
                value={draft.hq}
                onChange={(e) => setDraft((prev) => ({ ...prev, hq: e.target.value }))}
                placeholder="City, Country"
                style={{
                  width: "100%",
                  minHeight: "40px",
                  padding: "9px 12px",
                  border: "1.5px solid #cbd5e1",
                  borderRadius: "9px",
                  fontSize: "13px",
                  color: "#334155",
                  outline: "none",
                  boxSizing: "border-box",
                  background: "white",
                }}
              />
            </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            gap: "10px",
            justifyContent: "flex-end",
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={() => onSave(draft)}
            style={{
              padding: "10px 22px",
              borderRadius: "10px",
              border: "none",
              background: "#1d4ed8",
              color: "white",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 700,
            }}
          >
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
}

function SuggestCounterpartyEditor({
  counterparty,
  roleOptions,
  jobTitleOptions,
  existingIndividuals,
  onChange,
  onRemove,
  onSearchCompanies,
  onAddNew,
  onOpenNewCompanyModal,
}: {
  counterparty: SuggestCounterparty;
  roleOptions: LookupOption[];
  jobTitleOptions: LookupOption[];
  existingIndividuals?: SuggestManagementPerson[];
  onChange: (nextCounterparty: SuggestCounterparty) => void;
  onRemove: () => void;
  onSearchCompanies: (query: string) => Promise<SearchCompanyOption[]>;
  onAddNew?: (name: string) => void;
  onOpenNewCompanyModal?: () => void;
}) {
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [linkSearchTerm, setLinkSearchTerm] = useState("");
  const linkPickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showLinkPicker) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!linkPickerRef.current?.contains(event.target as Node)) {
        setShowLinkPicker(false);
      }
    };
    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [showLinkPicker]);

  const linkedNames = new Set(
    counterparty.individuals.map((p) => p.name.trim().toLowerCase())
  );
  const availableIndividuals = (existingIndividuals || []).filter(
    (p) => p.name.trim() && !linkedNames.has(p.name.trim().toLowerCase())
  );
  const filteredAvailable = linkSearchTerm.trim()
    ? availableIndividuals.filter((p) =>
        p.name.toLowerCase().includes(linkSearchTerm.trim().toLowerCase())
      )
    : availableIndividuals;

  return (
    <div
      className="suggest-counterparty-card"
      style={{
        border: "1px solid #1e293b",
        borderRadius: "14px",
        padding: "16px",
        background: "#f8fafc",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "14px",
        }}
      >
        <div
          style={{
            fontSize: "15px",
            fontWeight: 700,
            color: "#0f172a",
          }}
        >
          Counterparty
        </div>
        <button
          type="button"
          onClick={onRemove}
          style={{
            padding: "8px 12px",
            borderRadius: "10px",
            border: "1px solid #fecaca",
            background: "#fff1f2",
            color: "#9f1239",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: 600,
          }}
        >
          Remove
        </button>
      </div>

      <div
        className="suggest-counterparty-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
        }}
      >
        <div style={{ gridColumn: "1 / -1" }}>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#475569",
            }}
          >
            Company Name
          </label>
          {counterparty.isNewCompany && counterparty.newCompanyProfile ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 14px",
                border: "1.5px solid #bfdbfe",
                borderRadius: "10px",
                background: "#eff6ff",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#1d4ed8",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {counterparty.newCompanyProfile.name || counterparty.companyName || "New Company"}
                </div>
                <div style={{ fontSize: "11px", color: "#3b82f6", marginTop: "2px" }}>
                  New company — profile to be created
                </div>
              </div>
              {onOpenNewCompanyModal && (
                <button
                  type="button"
                  onClick={onOpenNewCompanyModal}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "8px",
                    border: "1px solid #bfdbfe",
                    background: "white",
                    color: "#1d4ed8",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  Edit Profile
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...counterparty,
                    isNewCompany: false,
                    newCompanyProfile: undefined,
                    companyName: "",
                    companyId: "",
                  })
                }
                style={{
                  padding: "7px 12px",
                  borderRadius: "8px",
                  border: "1px solid #fecaca",
                  background: "white",
                  color: "#dc2626",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                Clear
              </button>
            </div>
          ) : (
            <SuggestCompanySearchInput
              value={counterparty.companyName}
              selectedCompanyId={counterparty.companyId}
              placeholder="Company name (type to search)"
              onChange={(value) => {
                onChange({
                  ...counterparty,
                  companyName: value,
                  companyId: "",
                });
              }}
              onSelect={(option: SearchCompanyOption) => {
                onChange({
                  ...counterparty,
                  companyName: option.label,
                  companyId: option.id,
                  websiteUrl: option.websiteUrl || counterparty.websiteUrl,
                  linkedinUrl: option.linkedinUrl || counterparty.linkedinUrl,
                });
              }}
              onSearch={onSearchCompanies}
              onAddNew={onAddNew}
            />
          )}
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#475569",
            }}
          >
            Role / Type
          </label>
          <SuggestChangeSelect
            value={counterparty.roleType}
            onChange={(value) => onChange({ ...counterparty, roleType: value })}
            placeholder="Select role / type"
            options={roleOptions}
            searchable={true}
          />
        </div>

        <div>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#475569",
            }}
          >
            Website URL
          </label>
          <input
            value={counterparty.websiteUrl}
            onChange={(e) =>
              onChange({ ...counterparty, websiteUrl: e.target.value })
            }
            placeholder="https://..."
            style={{
              width: "100%",
              minHeight: "42px",
              padding: "10px 12px",
              border: "1.5px solid #cbd5e1",
              borderRadius: "10px",
              fontSize: "13px",
              color: "#334155",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#475569",
            }}
          >
            LinkedIn URL
          </label>
          <input
            value={counterparty.linkedinUrl}
            onChange={(e) =>
              onChange({ ...counterparty, linkedinUrl: e.target.value })
            }
            placeholder="https://linkedin.com/company/..."
            style={{
              width: "100%",
              minHeight: "42px",
              padding: "10px 12px",
              border: "1.5px solid #cbd5e1",
              borderRadius: "10px",
              fontSize: "13px",
              color: "#334155",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#475569",
            }}
          >
            Press Release URL
          </label>
          <input
            value={counterparty.pressReleaseUrl}
            onChange={(e) =>
              onChange({ ...counterparty, pressReleaseUrl: e.target.value })
            }
            placeholder="https://..."
            style={{
              width: "100%",
              minHeight: "42px",
              padding: "10px 12px",
              border: "1.5px solid #cbd5e1",
              borderRadius: "10px",
              fontSize: "13px",
              color: "#334155",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      <div
        style={{
          marginTop: "18px",
          paddingTop: "16px",
          borderTop: "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "12px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "#0f172a",
              }}
            >
              Individuals
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "3px", maxWidth: "340px", lineHeight: 1.4 }}>
              The specific people from this counterparty who were personally involved in the deal — e.g. the CEO, deal lead, or lead advisor.
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            {availableIndividuals.length > 0 && (
              <div ref={linkPickerRef} style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowLinkPicker((prev) => !prev);
                    setLinkSearchTerm("");
                  }}
                  style={{
                    padding: "9px 14px",
                    borderRadius: "10px",
                    border: "1px solid #bbf7d0",
                    background: "#f0fdf4",
                    color: "#15803d",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  + Link Existing
                </button>
                {showLinkPicker && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0,
                      zIndex: 20,
                      minWidth: "280px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "12px",
                      background: "#ffffff",
                      boxShadow: "0 10px 30px rgba(15, 23, 42, 0.12)",
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ padding: "8px" }}>
                      <input
                        autoFocus
                        value={linkSearchTerm}
                        onChange={(e) => setLinkSearchTerm(e.target.value)}
                        placeholder="Search individuals..."
                        style={{
                          width: "100%",
                          minHeight: "38px",
                          padding: "8px 10px",
                          border: "1.5px solid #cbd5e1",
                          borderRadius: "8px",
                          fontSize: "13px",
                          color: "#334155",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                    <div style={{ maxHeight: "220px", overflowY: "auto" }}>
                      {filteredAvailable.length > 0 ? (
                        filteredAvailable.map((person) => (
                          <button
                            key={person.localId}
                            type="button"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              const cloned: SuggestManagementPerson = {
                                ...person,
                                localId: `linked-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                                isNew: true,
                              };
                              onChange({
                                ...counterparty,
                                individuals: [...counterparty.individuals, cloned],
                              });
                              setShowLinkPicker(false);
                              setLinkSearchTerm("");
                            }}
                            style={{
                              width: "100%",
                              padding: "10px 12px",
                              border: "none",
                              borderTop: "1px solid #f1f5f9",
                              background: "#ffffff",
                              color: "#0f172a",
                              textAlign: "left",
                              cursor: "pointer",
                              fontSize: "13px",
                            }}
                          >
                            <div style={{ fontWeight: 600 }}>{person.name}</div>
                            {person.roles.filter(Boolean).length > 0 && (
                              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                                {person.roles.filter(Boolean).join(", ")}
                              </div>
                            )}
                          </button>
                        ))
                      ) : (
                        <div style={{ padding: "10px 12px", fontSize: "13px", color: "#64748b" }}>
                          No matching individuals
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...counterparty,
                  individuals: [
                    ...counterparty.individuals,
                    createEmptyManagementPerson("Current"),
                  ],
                })
              }
              style={{
                padding: "9px 14px",
                borderRadius: "10px",
                border: "1px solid #bfdbfe",
                background: "#eff6ff",
                color: "#1d4ed8",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              + Add New
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {counterparty.individuals.length > 0 ? (
            counterparty.individuals.map((person) => (
              <SuggestManagementPersonEditor
                key={person.localId}
                person={person}
                roleOptions={jobTitleOptions}
                onChange={(nextPerson) =>
                  onChange({
                    ...counterparty,
                    individuals: counterparty.individuals.map((item) =>
                      item.localId === person.localId ? nextPerson : item
                    ),
                  })
                }
                onAddRole={() =>
                  onChange({
                    ...counterparty,
                    individuals: counterparty.individuals.map((item) =>
                      item.localId === person.localId
                        ? { ...item, roles: [...item.roles, ""] }
                        : item
                    ),
                  })
                }
                onRemoveRole={(roleIndex) =>
                  onChange({
                    ...counterparty,
                    individuals: counterparty.individuals.map((item) =>
                      item.localId === person.localId
                        ? {
                            ...item,
                            roles:
                              item.roles.length > 1
                                ? item.roles.filter((_, index) => index !== roleIndex)
                                : [""],
                          }
                        : item
                    ),
                  })
                }
                onRemovePerson={() =>
                  onChange({
                    ...counterparty,
                    individuals: counterparty.individuals.filter(
                      (item) => item.localId !== person.localId
                    ),
                  })
                }
              />
            ))
          ) : (
            <div
              style={{
                padding: "18px",
                borderRadius: "12px",
                border: "1px dashed #cbd5e1",
                background: "#ffffff",
                color: "#64748b",
                fontSize: "13px",
                textAlign: "center",
              }}
            >
              No individuals added yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectorChipEditor({
  chips,
  onChange,
  sectorOptions,
}: {
  chips: SectorChip[];
  onChange: (chips: SectorChip[]) => void;
  sectorOptions: LookupOption[];
}) {
  const [addSearch, setAddSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const addRef = useRef<HTMLDivElement | null>(null);
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const [addMenuStyle, setAddMenuStyle] = useState<React.CSSProperties>({});
  const [addMenuListMaxHeight, setAddMenuListMaxHeight] = useState(200);

  useEffect(() => {
    if (!showAdd) return;
    const handler = (e: MouseEvent) => {
      if (!addRef.current?.contains(e.target as Node)) {
        setShowAdd(false);
        setAddSearch("");
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [showAdd]);

  useEffect(() => {
    if (!showAdd) return;

    const updateAddMenuPosition = () => {
      const buttonRect = addButtonRef.current?.getBoundingClientRect();
      if (!buttonRect) return;

      const viewportPadding = 12;
      const searchAreaHeight = 56;
      const desiredWidth = 260;
      const width = Math.min(desiredWidth, window.innerWidth - viewportPadding * 2);
      const left = Math.max(
        viewportPadding,
        Math.min(buttonRect.left, window.innerWidth - width - viewportPadding)
      );
      const availableBelow = Math.max(
        120,
        window.innerHeight - buttonRect.bottom - viewportPadding
      );
      const availableAbove = Math.max(120, buttonRect.top - viewportPadding);
      const shouldOpenUpward = availableBelow < 220 && availableAbove > availableBelow;
      const listMaxHeight = Math.max(
        120,
        Math.min(240, (shouldOpenUpward ? availableAbove : availableBelow) - searchAreaHeight)
      );
      const panelHeight = listMaxHeight + searchAreaHeight;

      setAddMenuListMaxHeight(listMaxHeight);
      setAddMenuStyle({
        position: "fixed",
        left,
        top: shouldOpenUpward
          ? Math.max(viewportPadding, buttonRect.top - panelHeight - 4)
          : Math.min(buttonRect.bottom + 4, window.innerHeight - panelHeight - viewportPadding),
        width,
        zIndex: 1000,
      });
    };

    updateAddMenuPosition();
    window.addEventListener("resize", updateAddMenuPosition);
    window.addEventListener("scroll", updateAddMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateAddMenuPosition);
      window.removeEventListener("scroll", updateAddMenuPosition, true);
    };
  }, [showAdd]);

  const activeValues = new Set(chips.filter((c) => c.status !== "removed").map((c) => c.optionValue));
  const filteredOptions = sectorOptions.filter(
    (opt) =>
      !activeValues.has(opt.value) &&
      (addSearch === "" || opt.label.toLowerCase().includes(addSearch.toLowerCase()))
  );

  const handleAdd = (optValue: string, optLabel: string) => {
    const restorable = chips.find((c) => c.optionValue === optValue && c.status === "removed");
    if (restorable) {
      onChange(chips.map((c) => (c.id === restorable.id ? { ...c, status: "existing" } : c)));
    } else {
      onChange([
        ...chips,
        {
          id: `added-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          label: optLabel,
          optionValue: optValue,
          status: "added",
        },
      ]);
    }
    setShowAdd(false);
    setAddSearch("");
  };

  const handleToggle = (id: string) => {
    onChange(
      chips.map((chip) => {
        if (chip.id !== id || chip.status === "added") return chip;
        return { ...chip, status: chip.status === "existing" ? "removed" : "existing" };
      })
    );
  };

  const handleRemoveAdded = (id: string) => {
    onChange(chips.filter((c) => c.id !== id));
  };

  const addedCount = chips.filter((c) => c.status === "added").length;
  const removedCount = chips.filter((c) => c.status === "removed").length;

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
        {chips.map((chip) => (
          <div
            key={chip.id}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "5px 6px 5px 11px",
              borderRadius: "20px",
              border:
                chip.status === "removed"
                  ? "1.5px solid #fecaca"
                  : chip.status === "added"
                    ? "1.5px solid #bbf7d0"
                    : "1.5px solid #e2e8f0",
              background:
                chip.status === "removed"
                  ? "#fff1f2"
                  : chip.status === "added"
                    ? "#f0fdf4"
                    : "#f1f5f9",
              fontSize: "12px",
              fontWeight: 600,
              color:
                chip.status === "removed"
                  ? "#9f1239"
                  : chip.status === "added"
                    ? "#166534"
                    : "#334155",
            }}
          >
            {chip.status === "added" && (
              <span style={{ color: "#16a34a", fontSize: "11px", fontWeight: 700 }}>+</span>
            )}
            <span
              style={{
                textDecoration: chip.status === "removed" ? "line-through" : "none",
                opacity: chip.status === "removed" ? 0.7 : 1,
              }}
            >
              {chip.label}
            </span>
            <button
              type="button"
              onClick={() =>
                chip.status === "added" ? handleRemoveAdded(chip.id) : handleToggle(chip.id)
              }
              title={
                chip.status === "removed"
                  ? "Undo removal"
                  : chip.status === "added"
                    ? "Remove"
                    : "Flag for removal"
              }
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                border: "none",
                background:
                  chip.status === "removed"
                    ? "#fecaca"
                    : chip.status === "added"
                      ? "#bbf7d0"
                      : "#e2e8f0",
                color:
                  chip.status === "removed"
                    ? "#9f1239"
                    : chip.status === "added"
                      ? "#15803d"
                      : "#64748b",
                cursor: "pointer",
                fontSize: "11px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                flexShrink: 0,
              }}
            >
              {chip.status === "removed" ? "↺" : "×"}
            </button>
          </div>
        ))}

        <div ref={addRef} style={{ position: "relative" }}>
          <button
            ref={addButtonRef}
            type="button"
            onClick={() => {
              setShowAdd((prev) => !prev);
              setAddSearch("");
            }}
            style={{
              padding: "5px 12px",
              borderRadius: "20px",
              border: "1.5px dashed #bfdbfe",
              background: showAdd ? "#eff6ff" : "white",
              color: "#1d4ed8",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            + Add
          </button>
          {showAdd && (
            <div
              style={{
                ...addMenuStyle,
                background: "white",
                border: "1px solid #cbd5e1",
                borderRadius: "12px",
                boxShadow: "0 10px 30px rgba(15,23,42,0.12)",
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "8px" }}>
                <input
                  autoFocus
                  value={addSearch}
                  onChange={(e) => setAddSearch(e.target.value)}
                  placeholder="Search sector…"
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    border: "1.5px solid #cbd5e1",
                    borderRadius: "8px",
                    fontSize: "12px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ maxHeight: `${addMenuListMaxHeight}px`, overflowY: "auto" }}>
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleAdd(opt.value, opt.label);
                      }}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        border: "none",
                        borderTop: "1px solid #f1f5f9",
                        background: "white",
                        color: "#0f172a",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: "13px",
                      }}
                    >
                      {opt.label}
                    </button>
                  ))
                ) : (
                  <div style={{ padding: "10px 12px", fontSize: "13px", color: "#94a3b8" }}>
                    {addSearch ? "No matches" : "No more options"}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {(addedCount > 0 || removedCount > 0) && (
        <div style={{ marginTop: "8px", display: "flex", gap: "14px", flexWrap: "wrap" }}>
          {addedCount > 0 && (
            <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: 700 }}>
              + {addedCount} added
            </span>
          )}
          {removedCount > 0 && (
            <span style={{ fontSize: "11px", color: "#dc2626", fontWeight: 700 }}>
              − {removedCount} flagged for removal
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function InvestorChipEditor({
  chips,
  onChange,
  onSearch,
  onOpenNewCompanyModal,
  searchPlaceholder = "Search company…",
  allowAddNew = true,
}: {
  chips: InvestorChip[];
  onChange: (chips: InvestorChip[]) => void;
  onSearch: (query: string) => Promise<SearchCompanyOption[]>;
  onOpenNewCompanyModal: (localId: string) => void;
  searchPlaceholder?: string;
  allowAddNew?: boolean;
}) {
  const [searchValue, setSearchValue] = useState("");

  const handleToggleExisting = (localId: string) => {
    onChange(
      chips.map((chip) => {
        if (chip.localId !== localId || chip.status === "added") return chip;
        return { ...chip, status: chip.status === "existing" ? "removed" : "existing" };
      })
    );
  };

  const handleRemoveAdded = (localId: string) => {
    onChange(chips.filter((c) => c.localId !== localId));
  };

  const handleSelectCompany = (option: SearchCompanyOption) => {
    if (chips.find((c) => c.companyId === option.id && c.status !== "removed")) return;
    onChange([
      ...chips,
      {
        localId: `added-inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        companyId: option.id,
        companyName: option.label,
        status: "added",
      },
    ]);
    setSearchValue("");
  };

  const handleAddNew = (name: string) => {
    if (!allowAddNew) return;
    const localId = `new-inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    onChange([
      ...chips,
      {
        localId,
        companyId: "",
        companyName: name,
        status: "added",
        isNewCompany: true,
        newCompanyProfile: createEmptyNewCompanyProfile(name),
      },
    ]);
    setSearchValue("");
    onOpenNewCompanyModal(localId);
  };

  const addedCount = chips.filter((c) => c.status === "added").length;
  const removedCount = chips.filter((c) => c.status === "removed").length;

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
        {chips.map((chip) => (
          <div
            key={chip.localId}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "5px 6px 5px 11px",
              borderRadius: "20px",
              border:
                chip.status === "removed"
                  ? "1.5px solid #fecaca"
                  : chip.status === "added"
                    ? chip.isNewCompany
                      ? "1.5px solid #ddd6fe"
                      : "1.5px solid #bbf7d0"
                    : "1.5px solid #e2e8f0",
              background:
                chip.status === "removed"
                  ? "#fff1f2"
                  : chip.status === "added"
                    ? chip.isNewCompany
                      ? "#f5f3ff"
                      : "#f0fdf4"
                    : "#f1f5f9",
              fontSize: "12px",
              fontWeight: 600,
              color:
                chip.status === "removed"
                  ? "#9f1239"
                  : chip.status === "added"
                    ? chip.isNewCompany
                      ? "#6d28d9"
                      : "#166534"
                    : "#334155",
            }}
          >
            {chip.status === "added" && !chip.isNewCompany && (
              <span style={{ color: "#16a34a", fontSize: "11px", fontWeight: 700 }}>+</span>
            )}
            {chip.isNewCompany && (
              <span style={{ color: "#7c3aed", fontSize: "10px", fontWeight: 700 }}>NEW</span>
            )}
            <span
              style={{
                textDecoration: chip.status === "removed" ? "line-through" : "none",
                opacity: chip.status === "removed" ? 0.7 : 1,
              }}
            >
              {chip.companyName}
            </span>
            {chip.relationType && chip.status !== "removed" && (
              <span
                style={{
                  marginLeft: "2px",
                  padding: "2px 6px",
                  borderRadius: "999px",
                  border: "1px solid #e2e8f0",
                  background: "#ffffff",
                  color: "#64748b",
                  fontSize: "10px",
                  fontWeight: 700,
                }}
              >
                {chip.relationType}
              </span>
            )}
            {chip.isNewCompany && chip.status === "added" && (
              <button
                type="button"
                onClick={() => onOpenNewCompanyModal(chip.localId)}
                style={{
                  padding: "2px 6px",
                  borderRadius: "6px",
                  border: "1px solid #c4b5fd",
                  background: "white",
                  color: "#7c3aed",
                  cursor: "pointer",
                  fontSize: "10px",
                  fontWeight: 600,
                }}
              >
                Edit
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                chip.status === "added"
                  ? handleRemoveAdded(chip.localId)
                  : handleToggleExisting(chip.localId)
              }
              title={chip.status === "removed" ? "Undo removal" : "Remove"}
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                border: "none",
                background:
                  chip.status === "removed"
                    ? "#fecaca"
                    : chip.status === "added"
                      ? chip.isNewCompany
                        ? "#ddd6fe"
                        : "#bbf7d0"
                      : "#e2e8f0",
                color:
                  chip.status === "removed"
                    ? "#9f1239"
                    : chip.status === "added"
                      ? chip.isNewCompany
                        ? "#7c3aed"
                        : "#15803d"
                      : "#64748b",
                cursor: "pointer",
                fontSize: "11px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                flexShrink: 0,
              }}
            >
              {chip.status === "removed" ? "↺" : "×"}
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: chips.length > 0 ? "10px" : "0" }}>
        <SuggestCompanySearchInput
          value={searchValue}
          selectedCompanyId=""
          placeholder={searchPlaceholder}
          onChange={setSearchValue}
          onSelect={handleSelectCompany}
          onSearch={onSearch}
          onAddNew={allowAddNew ? handleAddNew : undefined}
          hideSelectedId={true}
        />
      </div>

      {(addedCount > 0 || removedCount > 0) && (
        <div style={{ marginTop: "8px", display: "flex", gap: "14px", flexWrap: "wrap" }}>
          {addedCount > 0 && (
            <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: 700 }}>
              + {addedCount} added
            </span>
          )}
          {removedCount > 0 && (
            <span style={{ fontSize: "11px", color: "#dc2626", fontWeight: 700 }}>
              − {removedCount} flagged for removal
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function SuggestSubsidiaryEditor({
  subsidiary,
  sectorOptions,
  onChange,
  onAddSector,
  onRemoveSector,
  onRemove,
  onSearchCompanies,
  onAddNew,
  onOpenNewCompanyModal,
}: {
  subsidiary: SuggestSubsidiary;
  sectorOptions: LookupOption[];
  onChange: (nextSubsidiary: SuggestSubsidiary) => void;
  onAddSector: () => void;
  onRemoveSector: (sectorIndex: number) => void;
  onRemove: () => void;
  onSearchCompanies: (query: string) => Promise<SearchCompanyOption[]>;
  onAddNew?: (name: string) => void;
  onOpenNewCompanyModal?: () => void;
}) {
  return (
    <div
      style={{
        border: "1px solid #dbeafe",
        borderRadius: "14px",
        padding: "18px",
        background: "#f8fbff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            fontSize: "16px",
            fontWeight: 700,
            color: "#0f172a",
          }}
        >
          {subsidiary.isNew ? "Add New Subsidiary" : subsidiary.name || "Edit Subsidiary"}
        </div>
        {subsidiary.isNew && (
          <button
            type="button"
            onClick={onRemove}
            style={{
              padding: "8px 12px",
              borderRadius: "10px",
              border: "1px solid #fecaca",
              background: "#fff1f2",
              color: "#9f1239",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            Remove
          </button>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "14px",
        }}
        className="suggest-management-grid"
      >
        <div style={{ gridColumn: "1 / -1" }}>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#475569",
            }}
          >
            Name
          </label>
          {subsidiary.isNewCompany && subsidiary.newCompanyProfile ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 14px",
                border: "1.5px solid #bfdbfe",
                borderRadius: "10px",
                background: "#eff6ff",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#1d4ed8",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {subsidiary.newCompanyProfile.name || "New Subsidiary"}
                </div>
                <div style={{ fontSize: "11px", color: "#3b82f6", marginTop: "2px" }}>
                  New subsidiary — profile to be created
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenNewCompanyModal}
                style={{
                  padding: "7px 14px",
                  borderRadius: "8px",
                  border: "1px solid #bfdbfe",
                  background: "white",
                  color: "#1d4ed8",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                Edit Profile
              </button>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...subsidiary,
                    isNewCompany: false,
                    newCompanyProfile: undefined,
                    name: subsidiary.newCompanyProfile?.name || "",
                    companyId: "",
                  })
                }
                style={{
                  padding: "7px 12px",
                  borderRadius: "8px",
                  border: "1px solid #fecaca",
                  background: "#fff1f2",
                  color: "#9f1239",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                Clear
              </button>
            </div>
          ) : (
            <SuggestCompanySearchInput
              value={subsidiary.name}
              selectedCompanyId={subsidiary.companyId}
              placeholder="Search or add subsidiary"
              onChange={(value) =>
                onChange({
                  ...subsidiary,
                  name: value,
                  companyId: "",
                })
              }
              onSelect={(option) =>
                onChange({
                  ...subsidiary,
                  name: option.label,
                  companyId: option.id,
                  isNewCompany: false,
                  newCompanyProfile: undefined,
                })
              }
              onSearch={onSearchCompanies}
              onAddNew={onAddNew}
              hideSelectedId={true}
            />
          )}
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#475569",
            }}
          >
            Description
          </label>
          <textarea
            value={subsidiary.description}
            onChange={(e) =>
              onChange({ ...subsidiary, description: e.target.value })
            }
            placeholder="Short description"
            rows={4}
            style={{
              width: "100%",
              minHeight: "110px",
              padding: "12px",
              border: "1.5px solid #cbd5e1",
              borderRadius: "10px",
              fontSize: "13px",
              color: "#334155",
              outline: "none",
              resize: "vertical",
              boxSizing: "border-box",
              fontFamily: "inherit",
              lineHeight: 1.5,
            }}
          />
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#475569",
            }}
          >
            Sectors
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {subsidiary.sectors.map((sector, sectorIndex) => (
              <div
                key={`${subsidiary.localId}-sector-${sectorIndex}`}
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <div style={{ flex: 1 }}>
                  <SuggestChangeSelect
                    value={sector}
                    onChange={(value) =>
                      onChange({
                        ...subsidiary,
                        sectors: subsidiary.sectors.map((item, index) =>
                          index === sectorIndex ? value : item
                        ),
                      })
                    }
                    placeholder="Select sector"
                    options={sectorOptions}
                    searchable={true}
                  />
                </div>
                {subsidiary.sectors.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveSector(sectorIndex)}
                    style={{
                      width: "42px",
                      minWidth: "42px",
                      height: "42px",
                      borderRadius: "10px",
                      border: "1px solid #fecaca",
                      background: "#fff1f2",
                      color: "#9f1239",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    X
                  </button>
                )}
              </div>
            ))}
            <div>
              <button
                type="button"
                onClick={onAddSector}
                style={{
                  padding: "9px 14px",
                  borderRadius: "10px",
                  border: "1px solid #bfdbfe",
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                + Add Another Sector
              </button>
            </div>
          </div>
        </div>

        <div>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#475569",
            }}
          >
            LinkedIn Members
          </label>
          <input
            value={subsidiary.linkedinMembers}
            onChange={(e) =>
              onChange({ ...subsidiary, linkedinMembers: e.target.value })
            }
            placeholder="e.g. 120"
            style={{
              width: "100%",
              minHeight: "42px",
              padding: "10px 12px",
              border: "1.5px solid #cbd5e1",
              borderRadius: "10px",
              fontSize: "13px",
              color: "#334155",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#475569",
            }}
          >
            Country
          </label>
          <LocationSearchInput
            value={subsidiary.country}
            onChange={(label) => onChange({ ...subsidiary, country: label })}
            placeholder="Search city, country…"
          />
        </div>
      </div>
    </div>
  );
}

function SuggestCorporateEventEditor({
  corporateEvent,
  dealTypeOptions,
  dealStatusOptions,
  currencyOptions,
  fundingStageOptions,
  counterpartyRoleOptions,
  jobTitleOptions,
  existingIndividuals,
  onChange,
  onRemove,
  onSearchCompanies,
  onOpenCounterpartyNewCompanyModal,
}: {
  corporateEvent: SuggestCorporateEvent;
  dealTypeOptions: LookupOption[];
  dealStatusOptions: LookupOption[];
  currencyOptions: LookupOption[];
  fundingStageOptions: LookupOption[];
  counterpartyRoleOptions: LookupOption[];
  jobTitleOptions: LookupOption[];
  existingIndividuals?: SuggestManagementPerson[];
  onChange: (nextCorporateEvent: SuggestCorporateEvent) => void;
  onRemove: () => void;
  onSearchCompanies: (query: string) => Promise<SearchCompanyOption[]>;
  onOpenCounterpartyNewCompanyModal?: (counterpartyLocalId: string) => void;
}) {

  return (
    <div
      className="suggest-corporate-event-card"
      style={{
        border: "1px solid #cbd5e1",
        borderRadius: "16px",
        padding: "18px",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            fontSize: "18px",
            fontWeight: 700,
            color: "#0f172a",
          }}
        >
          Corporate Event
        </div>
        <button
          type="button"
          onClick={onRemove}
          style={{
            padding: "8px 12px",
            borderRadius: "10px",
            border: "1px solid #fecaca",
            background: "#fff1f2",
            color: "#9f1239",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: 600,
          }}
        >
          Remove
        </button>
      </div>

      <div
        className="suggest-corporate-event-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "14px",
        }}
      >
        <div style={{ gridColumn: "1 / -1" }}>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#475569",
            }}
          >
            Event Title (Short Description)
          </label>
          <input
            value={corporateEvent.title}
            onChange={(e) =>
              onChange({ ...corporateEvent, title: e.target.value })
            }
            placeholder="e.g. Acquisition of Company X by Company Y"
            style={{
              width: "100%",
              minHeight: "42px",
              padding: "10px 12px",
              border: "1.5px solid #cbd5e1",
              borderRadius: "10px",
              fontSize: "13px",
              color: "#334155",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#475569",
            }}
          >
            Announcement Date
          </label>
          <input
            type="date"
            value={corporateEvent.announcementDate}
            onChange={(e) =>
              onChange({ ...corporateEvent, announcementDate: e.target.value })
            }
            style={{
              width: "100%",
              minHeight: "42px",
              padding: "10px 12px",
              border: "1.5px solid #cbd5e1",
              borderRadius: "10px",
              fontSize: "13px",
              color: "#334155",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#475569",
            }}
          >
            Closed Date
          </label>
          <input
            type="date"
            value={corporateEvent.closedDate}
            onChange={(e) =>
              onChange({ ...corporateEvent, closedDate: e.target.value })
            }
            style={{
              width: "100%",
              minHeight: "42px",
              padding: "10px 12px",
              border: "1.5px solid #cbd5e1",
              borderRadius: "10px",
              fontSize: "13px",
              color: "#334155",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#475569",
            }}
          >
            Deal Type
          </label>
          <SuggestChangeSelect
            value={corporateEvent.dealType}
            onChange={(value) => onChange({ ...corporateEvent, dealType: value })}
            placeholder="Select deal type"
            options={dealTypeOptions}
          />
        </div>

        <div>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#475569",
            }}
          >
            Deal Status
          </label>
          <SuggestChangeSelect
            value={corporateEvent.dealStatus}
            onChange={(value) => onChange({ ...corporateEvent, dealStatus: value })}
            placeholder="Select deal status"
            options={dealStatusOptions}
          />
        </div>

        <div>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#475569",
            }}
          >
            Amount (Millions)
          </label>
          <input
            value={corporateEvent.amountMillions}
            onChange={(e) =>
              onChange({ ...corporateEvent, amountMillions: e.target.value })
            }
            placeholder="e.g. 50"
            style={{
              width: "100%",
              minHeight: "42px",
              padding: "10px 12px",
              border: "1.5px solid #cbd5e1",
              borderRadius: "10px",
              fontSize: "13px",
              color: "#334155",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#475569",
            }}
          >
            Currency
          </label>
          <SuggestChangeSelect
            value={corporateEvent.currency}
            onChange={(value) => onChange({ ...corporateEvent, currency: value })}
            placeholder="Select currency"
            options={currencyOptions}
          />
        </div>

        <div>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#475569",
            }}
          >
            Funding Stage
          </label>
          <SuggestChangeSelect
            value={corporateEvent.fundingStage}
            onChange={(value) =>
              onChange({ ...corporateEvent, fundingStage: value })
            }
            placeholder="Select funding stage"
            options={fundingStageOptions}
          />
        </div>

        <div>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#475569",
            }}
          >
            Amount Source URL
          </label>
          <input
            value={corporateEvent.amountSourceUrl}
            onChange={(e) =>
              onChange({ ...corporateEvent, amountSourceUrl: e.target.value })
            }
            placeholder="https://..."
            style={{
              width: "100%",
              minHeight: "42px",
              padding: "10px 12px",
              border: "1.5px solid #cbd5e1",
              borderRadius: "10px",
              fontSize: "13px",
              color: "#334155",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#475569",
            }}
          >
            Source URL (Press Release / Announcement)
          </label>
          <div style={{ display: "flex", gap: "8px", alignItems: "stretch" }}>
            <input
              value={corporateEvent.sourceUrl}
              onChange={(e) =>
                onChange({ ...corporateEvent, sourceUrl: e.target.value })
              }
              placeholder="https://..."
              style={{
                width: "100%",
                minHeight: "42px",
                padding: "10px 12px",
                border: "1.5px solid #cbd5e1",
                borderRadius: "10px",
                fontSize: "13px",
                color: "#334155",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label
            style={{
              display: "block",
              marginBottom: "6px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#475569",
            }}
          >
            Long Description
          </label>
          <textarea
            value={corporateEvent.longDescription}
            onChange={(e) =>
              onChange({ ...corporateEvent, longDescription: e.target.value })
            }
            placeholder="Detailed event description"
            rows={4}
            style={{
              width: "100%",
              minHeight: "110px",
              padding: "12px",
              border: "1.5px solid #cbd5e1",
              borderRadius: "10px",
              fontSize: "13px",
              color: "#334155",
              outline: "none",
              resize: "vertical",
              boxSizing: "border-box",
              fontFamily: "inherit",
              lineHeight: 1.5,
            }}
          />
        </div>
      </div>

      <div
        style={{
          marginTop: "18px",
          paddingTop: "16px",
          borderTop: "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "12px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: "#0f172a",
              }}
            >
              Counterparties
            </div>
            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
              A counterparty is any company directly involved in this deal — e.g. the buyer, seller, target company, or co-investor. Assign each one a role so reviewers know how they participated.
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...corporateEvent,
                counterparties: [
                  createEmptyCounterparty(),
                  ...corporateEvent.counterparties,
                ],
              })
            }
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              border: "1px solid #bbf7d0",
              background: "#f0fdf4",
              color: "#15803d",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 700,
            }}
          >
            + Add Counterparty
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {corporateEvent.counterparties.map((counterparty) => (
            <SuggestCounterpartyEditor
              key={counterparty.localId}
              counterparty={counterparty}
              roleOptions={counterpartyRoleOptions}
              jobTitleOptions={jobTitleOptions}
              existingIndividuals={existingIndividuals}
              onSearchCompanies={onSearchCompanies}
              onAddNew={(name) => {
                onChange({
                  ...corporateEvent,
                  counterparties: corporateEvent.counterparties.map((item) =>
                    item.localId === counterparty.localId
                      ? {
                          ...item,
                          companyName: name,
                          companyId: "",
                          isNewCompany: true,
                          newCompanyProfile: createEmptyNewCompanyProfile(name),
                        }
                      : item
                  ),
                });
                onOpenCounterpartyNewCompanyModal?.(counterparty.localId);
              }}
              onOpenNewCompanyModal={
                onOpenCounterpartyNewCompanyModal
                  ? () => onOpenCounterpartyNewCompanyModal(counterparty.localId)
                  : undefined
              }
              onChange={(nextCounterparty) =>
                onChange({
                  ...corporateEvent,
                  counterparties: corporateEvent.counterparties.map((item) =>
                    item.localId === counterparty.localId ? nextCounterparty : item
                  ),
                })
              }
              onRemove={() =>
                onChange({
                  ...corporateEvent,
                  counterparties:
                    corporateEvent.counterparties.length > 1
                      ? corporateEvent.counterparties.filter(
                          (item) => item.localId !== counterparty.localId
                        )
                      : [createEmptyCounterparty()],
                })
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SuggestBasicCompanyChangeForm({
  companyId,
  companyName,
  currentValues,
  autoExpandAll = false,
  onClose,
}: {
  companyId: string;
  companyName: string;
  currentValues: SuggestChangeCurrentValues;
  autoExpandAll?: boolean;
  onClose: () => void;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [expandedManagementPersonIds, setExpandedManagementPersonIds] = useState<
    string[]
  >([]);
  const [expandedSubsidiaryIds, setExpandedSubsidiaryIds] = useState<string[]>([]);
  const [expandedCorporateEventIds, setExpandedCorporateEventIds] = useState<
    string[]
  >([]);
  const hasAutoExpandedRef = useRef(false);
  const [sectorOptions, setSectorOptions] = useState<LookupOption[]>([]);
  const [secondarySectorOptions, setSecondarySectorOptions] = useState<LookupOption[]>([]);
  const [ownershipOptions, setOwnershipOptions] = useState<LookupOption[]>([]);
  const [jobTitleOptions, setJobTitleOptions] = useState<LookupOption[]>([]);
  const [counterpartyRoleOptions, setCounterpartyRoleOptions] = useState<
    LookupOption[]
  >([]);
  const [currencyOptions, setCurrencyOptions] = useState<LookupOption[]>([]);
  const [parentCompanySelection, setParentCompanySelection] = useState<SuggestCompanySelection>({
    localId: "parent-company",
    companyId: currentValues.parentCompanyId || "",
    companyName: "",
    isNewCompany: false,
  });
  const [newCompanyModalTargetId, setNewCompanyModalTargetId] = useState<string | null>(null);
  const [primarySectorChips, setPrimarySectorChips] = useState<SectorChip[]>(() =>
    parseSuggestMultiValue(currentValues.primarySectors).map((name) => ({
      id: `existing-primary-${name}`,
      label: name,
      optionValue: name,
      status: "existing" as const,
    }))
  );
  const [secondarySectorChips, setSecondarySectorChips] = useState<SectorChip[]>(() =>
    parseSuggestMultiValue(currentValues.secondarySectors).map((name) => ({
      id: `existing-secondary-${name}`,
      label: name,
      optionValue: name,
      status: "existing" as const,
    }))
  );
  const [investorChips, setInvestorChips] = useState<InvestorChip[]>(() =>
    currentValues.investorCompanies.map((inv) => ({
      localId: `existing-inv-${inv.id}`,
      companyId: inv.id,
      companyName: inv.label,
      status: "existing" as const,
    }))
  );
  const [peersCompetitorChips, setPeersCompetitorChips] = useState<InvestorChip[]>(() =>
    currentValues.peersCompetitorCompanies.map((c) => ({
      localId: `existing-peer-${c.id}`,
      companyId: c.id,
      companyName: c.label,
      status: "existing" as const,
    }))
  );
  const [potentialAcquirerChips, setPotentialAcquirerChips] = useState<InvestorChip[]>(() =>
    currentValues.potentialAcquirerCompanies.map((c) => ({
      localId: `existing-pacq-${c.id}`,
      companyId: c.id,
      companyName: c.label,
      status: "existing" as const,
    }))
  );
  const [acquisitionTargetChips, setAcquisitionTargetChips] = useState<InvestorChip[]>(() =>
    currentValues.acquisitionTargetCompanies.map((c) => ({
      localId: `existing-actg-${c.id}`,
      companyId: c.id,
      companyName: c.label,
      status: "existing" as const,
    }))
  );
  const [formData, setFormData] = useState({
    yearFounded: "",
    website: "",
    ownership: "",
    hq: "",
    lifecycleStage: "",
    transactionStatus: "",
    investors: "",
    description: "",
  });
  const [productTypeItems, setProductTypeItems] = useState<DraftProductTypeItem[]>(() => {
    const mapped = currentValues.productType
      .filter((item) => String(item?.Product_Type || "").trim())
      .map((item, i) => ({
        _id: `pt-${i}`,
        Product_Type: String(item.Product_Type || "").trim(),
        pc_of_revenues: String(item.pc_of_revenues || "").trim(),
      }));
    return mapped.length > 0 ? mapped : [{ _id: "pt-new-0", Product_Type: "", pc_of_revenues: "" }];
  });
  const [dataCollectionItems, setDataCollectionItems] = useState<DraftDataCollectionItem[]>(() => {
    const mapped = currentValues.dataCollectionMethod
      .filter((item) => String(item?.Data_Collection_Method || "").trim())
      .map((item, i) => ({
        _id: `dc-${i}`,
        Data_Collection_Method: String(item.Data_Collection_Method || "").trim(),
        Predominance: String(item.Predominance || "").trim(),
      }));
    return mapped.length > 0 ? mapped : [{ _id: "dc-new-0", Data_Collection_Method: "", Predominance: "" }];
  });
  const [revenueModelItems, setRevenueModelItems] = useState<DraftRevenueModelItem[]>(() => {
    const mapped = currentValues.revenueModel
      .filter((item) => String(item?.Revenue_Model_ || "").trim())
      .map((item, i) => ({
        _id: `rm-${i}`,
        Revenue_Model_: String(item.Revenue_Model_ || "").trim(),
        Predominance: String(item.Predominance || "").trim(),
      }));
    return mapped.length > 0 ? mapped : [{ _id: "rm-new-0", Revenue_Model_: "", Predominance: "" }];
  });
  const [managementPeople, setManagementPeople] = useState<SuggestManagementPerson[]>(
    currentValues.managementPeople
  );
  const [subsidiaries, setSubsidiaries] = useState<SuggestSubsidiary[]>(
    currentValues.subsidiaries
  );
  const [corporateEvents, setCorporateEvents] = useState<SuggestCorporateEvent[]>(
    currentValues.corporateEvents.length > 0
      ? currentValues.corporateEvents
      : [createEmptyCorporateEvent()]
  );
  const yearOptions: LookupOption[] = Array.from(
    { length: new Date().getFullYear() - 1799 },
    (_, index) => {
      const year = String(new Date().getFullYear() - index);
      return { value: year, label: year };
    }
  );

  useEffect(() => {
    let cancelled = false;

    const loadLookups = async () => {
      try {
        const token = authService.getAuthToken();
        const authToken = token ?? undefined;
        const headers: Record<string, string> = { Accept: "application/json" };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const [
          ownershipResult,
          sectorsResult,
          secondarySectorsResult,
          jobTitlesResult,
          counterpartyRolesResult,
          currenciesResult,
        ] = await Promise.allSettled([
          fetchJson<unknown[]>(OWNERSHIP_LOOKUP_URL, { method: "GET", headers }),
          getPrimarySectors(authToken),
          getSecondarySectors(authToken),
          fetchJson<unknown[]>(`${COMPANY_LOOKUP_BASE}/job_titles_list`, {
            method: "GET",
            headers: { Accept: "application/json" },
          }),
          fetchJson<unknown[]>(
            `${COUNTERPARTY_ROLE_LOOKUP_URL}?${new URLSearchParams({ query: "" }).toString()}`,
            {
            method: "GET",
            headers,
            }
          ),
          fetchJson<unknown[]>(`${COMPANY_LOOKUP_BASE}/currency_lookup`, {
            method: "GET",
            headers: { Accept: "application/json" },
          }),
        ]);

        if (cancelled) return;

        if (ownershipResult.status === "fulfilled") {
          setOwnershipOptions(
            toLookupOptions(ownershipResult.value, ["ownership", "id"], [
              "ownership",
              "name",
            ])
          );
        }
        if (sectorsResult.status === "fulfilled") {
          setSectorOptions(
            toLookupOptions(sectorsResult.value, ["sector_name", "name", "id"], [
              "sector_name",
              "name",
            ])
          );
        }
        if (secondarySectorsResult.status === "fulfilled") {
          setSecondarySectorOptions(
            toLookupOptions(secondarySectorsResult.value, ["sector_name", "name", "id"], [
              "sector_name",
              "name",
            ])
          );
        }
        if (jobTitlesResult.status === "fulfilled") {
          setJobTitleOptions(
            toLookupOptions(jobTitlesResult.value, ["job_title", "title", "id"], [
              "job_title",
              "title",
              "name",
            ])
          );
        }
        if (counterpartyRolesResult.status === "fulfilled") {
          setCounterpartyRoleOptions(
            toLookupOptions(counterpartyRolesResult.value, ["counterparty_status", "id"], [
              "counterparty_status",
              "name",
              "title",
            ])
          );
        }
        if (currenciesResult.status === "fulfilled") {
          setCurrencyOptions(
            toLookupOptions(
              currenciesResult.value,
              ["Currency", "currency", "code", "name", "id"],
              ["Currency", "currency", "code", "name"]
            )
          );
        }

        const failures = [
          ownershipResult,
          sectorsResult,
          secondarySectorsResult,
          jobTitlesResult,
          counterpartyRolesResult,
          currenciesResult,
        ].filter((result) => result.status === "rejected");

        if (failures.length > 0) {
          setLookupError("Some lookup data could not be loaded.");
        } else {
          setLookupError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setLookupError((error as Error)?.message || "Failed to load lookups.");
        }
      }
    };

    void loadLookups();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!autoExpandAll) return;
    if (hasAutoExpandedRef.current) return;
    hasAutoExpandedRef.current = true;
    setExpandedManagementPersonIds(currentValues.managementPeople.map((person) => person.localId));
    setExpandedSubsidiaryIds(currentValues.subsidiaries.map((subsidiary) => subsidiary.localId));
    setExpandedCorporateEventIds(currentValues.corporateEvents.map((event) => event.localId));
  }, [autoExpandAll, currentValues]);

  const parentCompanyHasChange = Boolean(
    parentCompanySelection.companyName.trim() ||
      parentCompanySelection.companyId.trim() ||
      (parentCompanySelection.isNewCompany &&
        parentCompanySelection.newCompanyProfile &&
        newCompanyProfileHasContent(parentCompanySelection.newCompanyProfile))
  );

  const initialProductTypeJson = JSON.stringify(
    currentValues.productType
      .filter((item) => String(item?.Product_Type || "").trim())
      .map((item) => ({
        Product_Type: String(item.Product_Type || "").trim(),
        pc_of_revenues: String(item.pc_of_revenues || "").trim(),
      }))
  );
  const currentProductTypeJson = JSON.stringify(
    productTypeItems
      .filter((item) => item.Product_Type.trim() !== "")
      .map((item) => ({
        Product_Type: item.Product_Type,
        pc_of_revenues: item.pc_of_revenues,
      }))
  );
  const hasProductTypeChange = initialProductTypeJson !== currentProductTypeJson;

  const initialDataCollectionJson = JSON.stringify(
    currentValues.dataCollectionMethod
      .filter((item) => String(item?.Data_Collection_Method || "").trim())
      .map((item) => ({
        Data_Collection_Method: String(item.Data_Collection_Method || "").trim(),
        Predominance: String(item.Predominance || "").trim(),
      }))
  );
  const currentDataCollectionJson = JSON.stringify(
    dataCollectionItems
      .filter((item) => item.Data_Collection_Method.trim() !== "")
      .map((item) => ({
        Data_Collection_Method: item.Data_Collection_Method,
        Predominance: item.Predominance,
      }))
  );
  const hasDataCollectionChange = initialDataCollectionJson !== currentDataCollectionJson;

  const initialRevenueModelJson = JSON.stringify(
    currentValues.revenueModel
      .filter((item) => String(item?.Revenue_Model_ || "").trim())
      .map((item) => ({
        Revenue_Model_: String(item.Revenue_Model_ || "").trim(),
        Predominance: String(item.Predominance || "").trim(),
      }))
  );
  const currentRevenueModelJson = JSON.stringify(
    revenueModelItems
      .filter((item) => item.Revenue_Model_.trim() !== "")
      .map((item) => ({
        Revenue_Model_: item.Revenue_Model_,
        Predominance: item.Predominance,
      }))
  );
  const hasRevenueModelChange = initialRevenueModelJson !== currentRevenueModelJson;

  const basicFieldCount =
    Object.values(formData).filter((value) => value.trim() !== "").length +
    (investorChips.some((c) => c.status !== "existing") ? 1 : 0) +
    (peersCompetitorChips.some((c) => c.status !== "existing") ? 1 : 0) +
    (potentialAcquirerChips.some((c) => c.status !== "existing") ? 1 : 0) +
    (acquisitionTargetChips.some((c) => c.status !== "existing") ? 1 : 0) +
    (primarySectorChips.some((c) => c.status !== "existing") ? 1 : 0) +
    (secondarySectorChips.some((c) => c.status !== "existing") ? 1 : 0) +
    (parentCompanyHasChange ? 1 : 0) +
    (hasProductTypeChange ? 1 : 0) +
    (hasDataCollectionChange ? 1 : 0) +
    (hasRevenueModelChange ? 1 : 0);

  const initialManagementById = new Map(
    currentValues.managementPeople.map((person) => [
      person.localId,
      JSON.stringify(normalizeManagementPerson(person)),
    ])
  );

  const managementChangeCount = managementPeople.filter((person) => {
    const currentSnapshot = JSON.stringify(normalizeManagementPerson(person));
    const initialSnapshot = initialManagementById.get(person.localId);
    if (initialSnapshot) {
      return currentSnapshot !== initialSnapshot;
    }
    return managementPersonHasContent(person);
  }).length;

  const initialSubsidiariesById = new Map(
    currentValues.subsidiaries.map((subsidiary) => [
      subsidiary.localId,
      JSON.stringify(normalizeSubsidiary(subsidiary)),
    ])
  );

  const subsidiaryChangeCount = subsidiaries.filter((subsidiary) => {
    const currentSnapshot = JSON.stringify(normalizeSubsidiary(subsidiary));
    const initialSnapshot = initialSubsidiariesById.get(subsidiary.localId);
    if (initialSnapshot) {
      return currentSnapshot !== initialSnapshot;
    }
    return subsidiaryHasContent(subsidiary);
  }).length;

  const initialCorporateEventsById = new Map(
    currentValues.corporateEvents.map((event) => [
      event.localId,
      JSON.stringify(normalizeCorporateEvent(event)),
    ])
  );

  const corporateEventChangeCount = corporateEvents.filter((event) => {
    const currentSnapshot = JSON.stringify(normalizeCorporateEvent(event));
    const initialSnapshot = initialCorporateEventsById.get(event.localId);
    if (initialSnapshot) {
      return currentSnapshot !== initialSnapshot;
    }
    return corporateEventHasContent(event);
  }).length;

  const filledCount =
    basicFieldCount +
    managementChangeCount +
    subsidiaryChangeCount +
    corporateEventChangeCount;
  const currentManagementCount = managementPeople.filter(
    (person) => person.status === "Current"
  ).length;
  const pastManagementCount = managementPeople.filter(
    (person) => person.status === "Past"
  ).length;

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const searchCompanies = async (query: string): Promise<SearchCompanyOption[]> => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) return [];

    const params = new URLSearchParams();
    params.set("query", trimmedQuery);
    params.set("Per_page", "25");
    params.set("Offset", "1");

    const token = authService.getAuthToken();
    if (!token) {
      throw new Error("Authentication required");
    }

    const payload = await fetchJson<SearchCompaniesResponse>(
      `${SEARCH_COMPANIES_URL}?${params.toString()}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return toSearchCompanyOptions(payload);
  };


  const updateManagementPerson = (
    localId: string,
    nextPerson: SuggestManagementPerson
  ) => {
    setManagementPeople((prev) =>
      prev.map((person) => (person.localId === localId ? nextPerson : person))
    );
  };

  const addManagementPerson = (status: SuggestManagementPerson["status"]) => {
    const nextPerson = createEmptyManagementPerson(status);
    setManagementPeople((prev) => [nextPerson, ...prev]);
    return nextPerson.localId;
  };

  const removeManagementPerson = (localId: string) => {
    setManagementPeople((prev) => prev.filter((person) => person.localId !== localId));
    setExpandedManagementPersonIds((prev) =>
      prev.filter((personId) => personId !== localId)
    );
  };

  const addCorporateEvent = () => {
    const nextEvent = createEmptyCorporateEvent();
    setCorporateEvents((prev) => [nextEvent, ...prev]);
    return nextEvent.localId;
  };

  const updateSubsidiary = (localId: string, nextSubsidiary: SuggestSubsidiary) => {
    setSubsidiaries((prev) =>
      prev.map((subsidiary) =>
        subsidiary.localId === localId ? nextSubsidiary : subsidiary
      )
    );
  };

  const addSubsidiary = () => {
    const nextSubsidiary = createEmptySubsidiary();
    setSubsidiaries((prev) => [nextSubsidiary, ...prev]);
    return nextSubsidiary.localId;
  };

  const removeSubsidiary = (localId: string) => {
    setSubsidiaries((prev) => prev.filter((subsidiary) => subsidiary.localId !== localId));
    setExpandedSubsidiaryIds((prev) =>
      prev.filter((subsidiaryId) => subsidiaryId !== localId)
    );
  };

  const removeCorporateEvent = (localId: string) => {
    setCorporateEvents((prev) =>
      prev.length > 1
        ? prev.filter((item) => item.localId !== localId)
        : [createEmptyCorporateEvent()]
    );
    setExpandedCorporateEventIds((prev) =>
      prev.filter((eventId) => eventId !== localId)
    );
  };

  const resetForm = () => {
    setSubmitted(false);
    setExpandedManagementPersonIds([]);
    setExpandedSubsidiaryIds([]);
    setExpandedCorporateEventIds([]);
    setPrimarySectorChips(
      parseSuggestMultiValue(currentValues.primarySectors).map((name) => ({
        id: `existing-primary-${name}`,
        label: name,
        optionValue: name,
        status: "existing" as const,
      }))
    );
    setSecondarySectorChips(
      parseSuggestMultiValue(currentValues.secondarySectors).map((name) => ({
        id: `existing-secondary-${name}`,
        label: name,
        optionValue: name,
        status: "existing" as const,
      }))
    );
    setInvestorChips(
      currentValues.investorCompanies.map((inv) => ({
        localId: `existing-inv-${inv.id}`,
        companyId: inv.id,
        companyName: inv.label,
        status: "existing" as const,
      }))
    );
    setPeersCompetitorChips(
      currentValues.peersCompetitorCompanies.map((c) => ({
        localId: `existing-peer-${c.id}`,
        companyId: c.id,
        companyName: c.label,
        status: "existing" as const,
      }))
    );
    setPotentialAcquirerChips(
      currentValues.potentialAcquirerCompanies.map((c) => ({
        localId: `existing-pacq-${c.id}`,
        companyId: c.id,
        companyName: c.label,
        status: "existing" as const,
      }))
    );
    setAcquisitionTargetChips(
      currentValues.acquisitionTargetCompanies.map((c) => ({
        localId: `existing-actg-${c.id}`,
        companyId: c.id,
        companyName: c.label,
        status: "existing" as const,
      }))
    );
    setParentCompanySelection({
      localId: "parent-company",
      companyId: currentValues.parentCompanyId || "",
      companyName: "",
      isNewCompany: false,
    });
    setFormData({
      yearFounded: "",
      website: "",
      ownership: "",
      hq: "",
      lifecycleStage: "",
      transactionStatus: "",
      investors: "",
      description: "",
    });
    const ptMapped = currentValues.productType
      .filter((item) => String(item?.Product_Type || "").trim())
      .map((item, i) => ({
        _id: `pt-${i}`,
        Product_Type: String(item.Product_Type || "").trim(),
        pc_of_revenues: String(item.pc_of_revenues || "").trim(),
      }));
    setProductTypeItems(ptMapped.length > 0 ? ptMapped : [{ _id: "pt-new-0", Product_Type: "", pc_of_revenues: "" }]);

    const dcMapped = currentValues.dataCollectionMethod
      .filter((item) => String(item?.Data_Collection_Method || "").trim())
      .map((item, i) => ({
        _id: `dc-${i}`,
        Data_Collection_Method: String(item.Data_Collection_Method || "").trim(),
        Predominance: String(item.Predominance || "").trim(),
      }));
    setDataCollectionItems(dcMapped.length > 0 ? dcMapped : [{ _id: "dc-new-0", Data_Collection_Method: "", Predominance: "" }]);

    const rmMapped = currentValues.revenueModel
      .filter((item) => String(item?.Revenue_Model_ || "").trim())
      .map((item, i) => ({
        _id: `rm-${i}`,
        Revenue_Model_: String(item.Revenue_Model_ || "").trim(),
        Predominance: String(item.Predominance || "").trim(),
      }));
    setRevenueModelItems(rmMapped.length > 0 ? rmMapped : [{ _id: "rm-new-0", Revenue_Model_: "", Predominance: "" }]);
    setManagementPeople(currentValues.managementPeople);
    setSubsidiaries(currentValues.subsidiaries);
    setCorporateEvents(
      currentValues.corporateEvents.length > 0
        ? currentValues.corporateEvents
        : [createEmptyCorporateEvent()]
    );
  };

  const handleSubmit = async () => {
    if (filledCount === 0) return;
    setSubmitting(true);
    try {
      const token = authService.getAuthToken();
      if (!token) {
        throw new Error("Authentication required");
      }

      const companyDiff = buildCompanyChangeDiff({
        companyId,
        companyName,
        formData,
        primarySectorChips,
        secondarySectorChips,
        investorChips,
        peersCompetitorChips,
        potentialAcquirerChips,
        acquisitionTargetChips,
        parentCompany: parentCompanySelection,
        currentValues,
        productTypeItems,
        dataCollectionItems,
        revenueModelItems,
      });

      const managementDiff = buildEntityArrayDiff({
        currentItems: managementPeople,
        initialItems: currentValues.managementPeople,
        normalize: normalizeManagementPerson,
        hasContent: managementPersonHasContent,
        toData: managementPersonToChangeData,
        dataType: "management_person",
        parentEntityType: "company",
        parentEntityId: companyId,
      });

      const subsidiaryDiff = buildEntityArrayDiff({
        currentItems: subsidiaries,
        initialItems: currentValues.subsidiaries,
        normalize: normalizeSubsidiary,
        hasContent: subsidiaryHasContent,
        toData: subsidiaryToChangeData,
        dataType: "subsidiary",
        parentEntityType: "company",
        parentEntityId: companyId,
      });

      const corporateEventDiff = buildEntityArrayDiff({
        currentItems: corporateEvents,
        initialItems: currentValues.corporateEvents,
        normalize: normalizeCorporateEvent,
        hasContent: corporateEventHasContent,
        toData: corporateEventToChangeData,
        dataType: "corporate_event",
        parentEntityType: "company",
        parentEntityId: companyId,
      });

      const oldPayload: Record<string, unknown> = {
        new_company_id: Number(companyId),
        company_name: companyName,
      };
      const newPayload: Record<string, unknown> = {
        new_company_id: Number(companyId),
        company_name: companyName,
      };

      if (companyDiff.oldRecord && companyDiff.newRecord) {
        oldPayload.company = companyDiff.oldRecord;
        newPayload.company = companyDiff.newRecord;
      }
      if (managementDiff.oldRecords.length > 0) {
        oldPayload.management_people = managementDiff.oldRecords;
        newPayload.management_people = managementDiff.newRecords;
      }
      if (subsidiaryDiff.oldRecords.length > 0) {
        oldPayload.subsidiaries = subsidiaryDiff.oldRecords;
        newPayload.subsidiaries = subsidiaryDiff.newRecords;
      }
      if (corporateEventDiff.oldRecords.length > 0) {
        oldPayload.corporate_events = corporateEventDiff.oldRecords;
        newPayload.corporate_events = corporateEventDiff.newRecords;
      }

      const submittedBy =
        authService.getUser()?.email ||
        localStorage.getItem("outreach_crm_login_email") ||
        "";

      await createChangeRequest(token, {
        entity_type: "company",
        new_company_id: Number(companyId),
        submitted_by: submittedBy,
        old: oldPayload,
        new: newPayload,
        approved: false,
        reviewed_by: 0,
      });

      try {
        const user = authService.getUser();
        await notifyDataContribution(token, {
          contributor_name: user?.name?.trim() || "",
          contributor_email: submittedBy,
          company_name: companyName,
          request_url: buildInternalReviewUrl(companyId, {
            review: true,
            reviewType: "company",
            companyName,
          }),
          field_name: "Company Profile",
          notes: "",
        });
      } catch {
        // Change request saved; notification failure should not block the contributor.
      }

      setSubmitting(false);
      setSubmitted(true);
    } catch (error) {
      setSubmitting(false);
      alert((error as Error)?.message || "Failed to submit change request.");
    }
  };

  if (submitted) {
    return (
      <div
        style={{
          marginBottom: "20px",
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "14px",
          padding: "28px 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            margin: "0 auto 16px",
            borderRadius: "999px",
            background: "#dcfce7",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ContributorTabIcon name="check" />
        </div>
        <div
          style={{
            fontSize: "22px",
            fontWeight: 700,
            color: "#14532d",
            marginBottom: "8px",
            fontFamily: "Georgia, serif",
          }}
        >
          Suggestion ready
        </div>
        <p style={{ margin: "0 0 18px 0", color: "#166534", fontSize: "14px" }}>
          Thank you. Your suggested company profile changes for {companyName} have
          been sent for review.
        </p>
        <button
          type="button"
          onClick={() => {
            resetForm();
            onClose();
          }}
          style={{
            padding: "10px 18px",
            borderRadius: "10px",
            border: "1px solid #86efac",
            background: "white",
            color: "#166534",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "13px",
          }}
        >
          Close
        </button>
      </div>
    );
  }

  // counterparty modal targets are encoded as "cp:{ceLocalId}:{cpLocalId}"
  const parseCounterpartyTarget = (
    targetId: string | null
  ): { ceId: string; cpId: string } | null => {
    if (!targetId?.startsWith("cp:")) return null;
    const parts = targetId.slice(3).split(":");
    if (parts.length < 2) return null;
    return { ceId: parts[0], cpId: parts[1] };
  };

  const findCounterparty = (
    targetId: string | null
  ): SuggestCounterparty | undefined => {
    const parsed = parseCounterpartyTarget(targetId);
    if (!parsed) return undefined;
    const ce = corporateEvents.find((e) => e.localId === parsed.ceId);
    return ce?.counterparties.find((cp) => cp.localId === parsed.cpId);
  };

  const newCompanyModalProfile = (() => {
    if (newCompanyModalTargetId === null) return null;
    if (newCompanyModalTargetId === "parent-company") {
      return parentCompanySelection.newCompanyProfile ?? createEmptyNewCompanyProfile();
    }
    if (newCompanyModalTargetId.startsWith("peer:")) {
      const lid = newCompanyModalTargetId.slice(5);
      const chip = peersCompetitorChips.find((c) => c.localId === lid);
      if (chip) return chip.newCompanyProfile ?? createEmptyNewCompanyProfile();
    }
    if (newCompanyModalTargetId.startsWith("pacq:")) {
      const lid = newCompanyModalTargetId.slice(5);
      const chip = potentialAcquirerChips.find((c) => c.localId === lid);
      if (chip) return chip.newCompanyProfile ?? createEmptyNewCompanyProfile();
    }
    if (newCompanyModalTargetId.startsWith("actg:")) {
      const lid = newCompanyModalTargetId.slice(5);
      const chip = acquisitionTargetChips.find((c) => c.localId === lid);
      if (chip) return chip.newCompanyProfile ?? createEmptyNewCompanyProfile();
    }
    const investorChip = investorChips.find((c) => c.localId === newCompanyModalTargetId);
    if (investorChip) return investorChip.newCompanyProfile ?? createEmptyNewCompanyProfile();
    const subsidiarySel = subsidiaries.find((s) => s.localId === newCompanyModalTargetId);
    if (subsidiarySel) return subsidiarySel.newCompanyProfile ?? createEmptyNewCompanyProfile();
    const counterpartySel = findCounterparty(newCompanyModalTargetId);
    if (counterpartySel) return counterpartySel.newCompanyProfile ?? createEmptyNewCompanyProfile();
    return createEmptyNewCompanyProfile();
  })();

  const newCompanyModalTitle = (() => {
    if (newCompanyModalTargetId === "parent-company") {
      const name = parentCompanySelection.newCompanyProfile?.name;
      return name ? `New Parent Company: ${name}` : "New Parent Company Profile";
    }
    const investorChip = investorChips.find((c) => c.localId === newCompanyModalTargetId);
    if (investorChip) {
      const name = investorChip.newCompanyProfile?.name;
      return name ? `New Investor: ${name}` : "New Investor Profile";
    }
    if (newCompanyModalTargetId?.startsWith("peer:")) {
      const lid = newCompanyModalTargetId.slice(5);
      const chip = peersCompetitorChips.find((c) => c.localId === lid);
      const name = chip?.newCompanyProfile?.name || chip?.companyName;
      return name ? `New Peer / Competitor: ${name}` : "New Peer / Competitor Profile";
    }
    if (newCompanyModalTargetId?.startsWith("pacq:")) {
      const lid = newCompanyModalTargetId.slice(5);
      const chip = potentialAcquirerChips.find((c) => c.localId === lid);
      const name = chip?.newCompanyProfile?.name || chip?.companyName;
      return name ? `New Potential Acquirer: ${name}` : "New Potential Acquirer Profile";
    }
    if (newCompanyModalTargetId?.startsWith("actg:")) {
      const lid = newCompanyModalTargetId.slice(5);
      const chip = acquisitionTargetChips.find((c) => c.localId === lid);
      const name = chip?.newCompanyProfile?.name || chip?.companyName;
      return name ? `New Acquisition Target: ${name}` : "New Acquisition Target Profile";
    }
    const subsidiarySel = subsidiaries.find((s) => s.localId === newCompanyModalTargetId);
    if (subsidiarySel) {
      const name = subsidiarySel.newCompanyProfile?.name;
      return name ? `New Subsidiary: ${name}` : "New Subsidiary Profile";
    }
    const counterpartySel = findCounterparty(newCompanyModalTargetId);
    if (counterpartySel) {
      const name = counterpartySel.newCompanyProfile?.name || counterpartySel.companyName;
      return name ? `New Counterparty: ${name}` : "New Counterparty Profile";
    }
    return "New Company Profile";
  })();

  return (
    <>
    <div
      className="suggest-change-form"
      style={{
        marginBottom: "20px",
        background: "#fff",
        borderRadius: "16px",
        border: "1px solid #dbeafe",
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "22px 24px 18px",
          background: "linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)",
          borderBottom: "1px solid #dbeafe",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h3
              style={{
                margin: "0 0 6px 0",
                fontSize: "24px",
                fontWeight: 700,
                color: "#0f172a",
                fontFamily: "Georgia, serif",
              }}
            >
              Suggest a Change
            </h3>
            <p style={{ margin: 0, color: "#475569", fontSize: "14px" }}>
              Review what we currently have in the middle column. Use the right
              column to propose the correct value — our team will review and
              apply approved changes.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "9px 14px",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              background: "white",
              color: "#475569",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            Close
          </button>
        </div>
        <div
          style={{
            marginTop: "16px",
            padding: "12px 14px",
            borderRadius: "12px",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            color: "#166534",
            fontSize: "13px",
            lineHeight: 1.5,
          }}
        >
          <strong>How it works:</strong> You only need to fill in the fields you
          want to update — leave everything else blank. For list fields like
          sectors and investors, you can add new entries or flag existing ones
          for removal.
        </div>
      </div>

      <div style={{ padding: "0 24px 20px" }}>
        {lookupError && (
          <div
            style={{
              marginTop: "16px",
              marginBottom: "4px",
              padding: "12px 14px",
              borderRadius: "12px",
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              color: "#9a3412",
              fontSize: "13px",
            }}
          >
            {lookupError}
          </div>
        )}
        <div
          className="suggest-change-header-row"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(160px, 190px) minmax(0, 1fr) minmax(0, 1fr)",
            gap: "14px",
            padding: "16px 0 10px",
            borderBottom: "2px solid #0f172a",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Field
          </div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Current Value
          </div>
          <div
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Your Update
          </div>
        </div>

        <SuggestChangeFieldRow
          label="Primary Sector(s)"
          currentValue={currentValues.primarySectors}
          helpText="The main industry categories this company operates in."
        >
          <SectorChipEditor
            chips={primarySectorChips}
            onChange={setPrimarySectorChips}
            sectorOptions={sectorOptions}
          />
        </SuggestChangeFieldRow>

        <SuggestChangeFieldRow
          label="Secondary Sector(s)"
          currentValue={currentValues.secondarySectors}
          helpText="Supporting or adjacent industries — secondary markets this company also participates in."
        >
          <SectorChipEditor
            chips={secondarySectorChips}
            onChange={setSecondarySectorChips}
            sectorOptions={secondarySectorOptions}
          />
        </SuggestChangeFieldRow>

        <SuggestChangeFieldRow
          label="Year Founded"
          currentValue={currentValues.yearFounded}
          helpText="The year the company was originally incorporated or founded."
        >
          <SuggestChangeSelect
            value={formData.yearFounded}
            onChange={(value) => updateField("yearFounded", value)}
            placeholder="Choose year founded"
            options={yearOptions}
          />
        </SuggestChangeFieldRow>

        <SuggestChangeFieldRow label="Website" currentValue={currentValues.website} helpText="The company's primary website URL.">
          <input
            value={formData.website}
            onFocus={() => {
              if (!formData.website) updateField("website", "https://");
            }}
            onChange={(e) => {
              let val = e.target.value;
              if (!val.startsWith("https://") && !val.startsWith("http://")) {
                val = "https://" + val.replace(/^https?:\/\//i, "");
              }
              updateField("website", val);
            }}
            onBlur={() => {
              if (formData.website === "https://" || formData.website === "http://") {
                updateField("website", "");
              }
            }}
            placeholder="https://www.example.com"
            style={{
              width: "100%",
              minHeight: "42px",
              padding: "10px 12px",
              border: "1.5px solid #cbd5e1",
              borderRadius: "10px",
              fontSize: "13px",
              color: "#334155",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </SuggestChangeFieldRow>

        <SuggestChangeFieldRow
          label="Ownership"
          currentValue={currentValues.ownership}
          helpText="The ownership structure — e.g. Private, Public, PE-backed, Family-owned."
        >
          <SuggestChangeSelect
            value={formData.ownership}
            onChange={(value) => updateField("ownership", value)}
            placeholder="Choose ownership"
            options={ownershipOptions}
          />
        </SuggestChangeFieldRow>

        <SuggestChangeFieldRow label="HQ" currentValue={currentValues.hq} helpText="Headquarters location — search and select from the database.">
          <LocationSearchInput
            value={formData.hq}
            onChange={(label) => updateField("hq", label)}
            placeholder="Search city, country…"
          />
        </SuggestChangeFieldRow>

        <SuggestChangeFieldRow
          label="Lifecycle Stage"
          currentValue={currentValues.lifecycleStage}
          helpText="Where the company is in its growth journey — e.g. Seed, Growth, Mature."
        >
          <SuggestChangeSelect
            value={formData.lifecycleStage}
            onChange={(value) => updateField("lifecycleStage", value)}
            placeholder="Choose lifecycle stage"
            options={LIFECYCLE_STAGE_OPTIONS}
          />
        </SuggestChangeFieldRow>

        <SuggestChangeFieldRow
          label="Transaction status"
          currentValue={currentValues.transactionStatus}
          helpText="Market / transaction visibility for this company — choose the option that best fits."
        >
          <SuggestChangeSelect
            value={formData.transactionStatus}
            onChange={(value) => updateField("transactionStatus", value)}
            placeholder="Choose transaction status"
            options={TRANSACTION_STATUS_OPTIONS}
          />
        </SuggestChangeFieldRow>

        <SuggestChangeFieldRow
          label="Investors"
          currentValue={currentValues.investors}
          helpText="Companies or funds that have made an equity investment in this company. Flag any that are wrong, or add missing ones."
        >
          <InvestorChipEditor
            chips={investorChips}
            onChange={setInvestorChips}
            onSearch={searchCompanies}
            onOpenNewCompanyModal={(localId) => setNewCompanyModalTargetId(localId)}
            searchPlaceholder="Search investor…"
          />
        </SuggestChangeFieldRow>

        <SuggestChangeFieldRow
          label="Peers & Competitors"
          currentValue={currentValues.peersCompetitors}
          helpText="Direct competitors or peer companies in the same market."
        >
          <InvestorChipEditor
            chips={peersCompetitorChips}
            onChange={setPeersCompetitorChips}
            onSearch={searchCompanies}
            onOpenNewCompanyModal={(localId) =>
              setNewCompanyModalTargetId(`peer:${localId}`)
            }
            searchPlaceholder="Search peer or competitor…"
          />
        </SuggestChangeFieldRow>

        <SuggestChangeFieldRow
          label="Potential Acquirers"
          currentValue={currentValues.potentialAcquirers}
          helpText="Companies that might realistically acquire this business."
        >
          <InvestorChipEditor
            chips={potentialAcquirerChips}
            onChange={setPotentialAcquirerChips}
            onSearch={searchCompanies}
            onOpenNewCompanyModal={(localId) =>
              setNewCompanyModalTargetId(`pacq:${localId}`)
            }
            searchPlaceholder="Search potential acquirer…"
          />
        </SuggestChangeFieldRow>

        <SuggestChangeFieldRow
          label="Acquisition Targets"
          currentValue={currentValues.acquisitionTargets}
          helpText="Companies this business might acquire or has cited as strategic targets."
        >
          <InvestorChipEditor
            chips={acquisitionTargetChips}
            onChange={setAcquisitionTargetChips}
            onSearch={searchCompanies}
            onOpenNewCompanyModal={(localId) =>
              setNewCompanyModalTargetId(`actg:${localId}`)
            }
            searchPlaceholder="Search acquisition target…"
          />
        </SuggestChangeFieldRow>

        <SuggestChangeFieldRow
          label="Parent Company"
          currentValue={currentValues.parentCompany || "Not available"}
          helpText="The direct corporate parent or controlling entity, if this company is a subsidiary of another."
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {parentCompanySelection.isNewCompany && parentCompanySelection.newCompanyProfile ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 14px",
                  border: "1.5px solid #bfdbfe",
                  borderRadius: "10px",
                  background: "#eff6ff",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#1d4ed8",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {parentCompanySelection.newCompanyProfile.name || "New Company"}
                  </div>
                  <div style={{ fontSize: "11px", color: "#3b82f6", marginTop: "2px" }}>
                    New parent company — profile to be created
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNewCompanyModalTargetId("parent-company")}
                  style={{
                    padding: "7px 14px",
                    borderRadius: "8px",
                    border: "1px solid #bfdbfe",
                    background: "white",
                    color: "#1d4ed8",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  Edit Profile
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setParentCompanySelection((prev) => ({
                      ...prev,
                      isNewCompany: false,
                      newCompanyProfile: undefined,
                      companyName: prev.newCompanyProfile?.name || "",
                      companyId: "",
                    }))
                  }
                  style={{
                    padding: "7px 12px",
                    borderRadius: "8px",
                    border: "1px solid #fecaca",
                    background: "#fff1f2",
                    color: "#9f1239",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: "8px", alignItems: "stretch", flexWrap: "wrap" }}>
                <div style={{ flex: 2, minWidth: 220 }}>
                  <SuggestCompanySearchInput
                    value={parentCompanySelection.companyName}
                    selectedCompanyId={parentCompanySelection.companyId}
                    placeholder="Search parent company"
                    onChange={(value) =>
                      setParentCompanySelection((prev) => ({
                        ...prev,
                        companyName: value,
                        companyId: "",
                      }))
                    }
                    onSelect={(option) =>
                      setParentCompanySelection((prev) => ({
                        ...prev,
                        companyName: option.label,
                        companyId: option.id,
                        isNewCompany: false,
                        newCompanyProfile: undefined,
                      }))
                    }
                    onSearch={searchCompanies}
                    onAddNew={(name) => {
                      setParentCompanySelection((prev) => ({
                        ...prev,
                        companyName: name,
                        companyId: "",
                        isNewCompany: true,
                        newCompanyProfile: createEmptyNewCompanyProfile(name),
                      }));
                      setNewCompanyModalTargetId("parent-company");
                    }}
                    hideSelectedId={true}
                  />
                </div>
              </div>
            )}
          </div>
        </SuggestChangeFieldRow>

        <SuggestChangeFieldRow
          label="Description"
          currentValue={currentValues.description}
          helpText="A concise company overview — what the company does, its market, and key differentiators."
        >
          <textarea
            value={formData.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="Add new description"
            rows={5}
            style={{
              width: "100%",
              minHeight: "120px",
              padding: "12px",
              border: "1.5px solid #cbd5e1",
              borderRadius: "10px",
              fontSize: "13px",
              color: "#334155",
              outline: "none",
              resize: "vertical",
              boxSizing: "border-box",
              fontFamily: "inherit",
              lineHeight: 1.5,
            }}
          />
        </SuggestChangeFieldRow>

        {/* Product Type */}
        <SuggestChangeFieldRow
          label="Product Type"
          currentValue={
            currentValues.productType.length > 0
              ? currentValues.productType
                  .filter((item) => String(item?.Product_Type || "").trim())
                  .map((item) => {
                    const pct = String(item.pc_of_revenues || "").trim();
                    return pct ? `${item.Product_Type}: ${pct}%` : String(item.Product_Type || "");
                  })
                  .join("\n") || "Not available"
              : "Not available"
          }
          helpText="Product categories and their share of revenues."
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div
              style={{
                display: "flex",
                gap: "6px",
                alignItems: "center",
                padding: "0 2px",
                marginBottom: "2px",
                fontSize: "11px",
                fontWeight: 700,
                color: "#94a3b8",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              <div style={{ flex: 1 }}>Type</div>
              <div style={{ flex: 1 }}>% of revenue</div>
              <div style={{ width: "34px", minWidth: "34px" }} />
            </div>
            {productTypeItems.map((row) => (
              <div key={row._id} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <SuggestChangeSelect
                    value={row.Product_Type}
                    onChange={(val) =>
                      setProductTypeItems((prev) =>
                        prev.map((r) => (r._id === row._id ? { ...r, Product_Type: val } : r))
                      )
                    }
                    placeholder="Select type"
                    options={PRODUCT_TYPE_OPTIONS}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <SuggestChangeSelect
                    value={row.pc_of_revenues}
                    onChange={(val) =>
                      setProductTypeItems((prev) =>
                        prev.map((r) =>
                          r._id === row._id ? { ...r, pc_of_revenues: val.replace("%", "") } : r
                        )
                      )
                    }
                    placeholder="Select"
                    options={PERCENT_OF_REVENUE_OPTIONS}
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setProductTypeItems((prev) => prev.filter((r) => r._id !== row._id))
                  }
                  style={{
                    width: "34px",
                    minWidth: "34px",
                    height: "42px",
                    borderRadius: "8px",
                    border: "1px solid #fecaca",
                    background: "#fff1f2",
                    color: "#9f1239",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "15px",
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setProductTypeItems((prev) => [
                  ...prev,
                  { _id: `pt-new-${Date.now()}`, Product_Type: "", pc_of_revenues: "" },
                ])
              }
              style={{
                alignSelf: "flex-start",
                padding: "7px 14px",
                borderRadius: "9px",
                border: "1px solid #bfdbfe",
                background: "#eff6ff",
                color: "#1d4ed8",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              + Add Row
            </button>
          </div>
        </SuggestChangeFieldRow>

        {/* Data Collection Method */}
        <SuggestChangeFieldRow
          label="Data Collection Method"
          currentValue={
            currentValues.dataCollectionMethod.length > 0
              ? currentValues.dataCollectionMethod
                  .filter((item) => String(item?.Data_Collection_Method || "").trim())
                  .map((item) => {
                    const pred = String(item.Predominance || "").trim();
                    return pred
                      ? `${item.Data_Collection_Method} (${pred})`
                      : String(item.Data_Collection_Method || "");
                  })
                  .join("\n") || "Not available"
              : "Not available"
          }
          helpText="How the company primarily collects its data."
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div
              style={{
                display: "flex",
                gap: "6px",
                alignItems: "center",
                padding: "0 2px",
                marginBottom: "2px",
                fontSize: "11px",
                fontWeight: 700,
                color: "#94a3b8",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              <div style={{ flex: 1 }}>Method</div>
              <div style={{ flex: 1 }}>Predominance</div>
              <div style={{ width: "34px", minWidth: "34px" }} />
            </div>
            {dataCollectionItems.map((row) => (
              <div key={row._id} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <SuggestChangeSelect
                    value={row.Data_Collection_Method}
                    onChange={(val) =>
                      setDataCollectionItems((prev) =>
                        prev.map((r) =>
                          r._id === row._id ? { ...r, Data_Collection_Method: val } : r
                        )
                      )
                    }
                    placeholder="Select method"
                    options={DATA_COLLECTION_OPTIONS}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <SuggestChangeSelect
                    value={row.Predominance}
                    onChange={(val) =>
                      setDataCollectionItems((prev) =>
                        prev.map((r) => (r._id === row._id ? { ...r, Predominance: val } : r))
                      )
                    }
                    placeholder="Select"
                    options={PREDOMINANCE_OPTIONS}
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setDataCollectionItems((prev) => prev.filter((r) => r._id !== row._id))
                  }
                  style={{
                    width: "34px",
                    minWidth: "34px",
                    height: "42px",
                    borderRadius: "8px",
                    border: "1px solid #fecaca",
                    background: "#fff1f2",
                    color: "#9f1239",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "15px",
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setDataCollectionItems((prev) => [
                  ...prev,
                  {
                    _id: `dc-new-${Date.now()}`,
                    Data_Collection_Method: "",
                    Predominance: "",
                  },
                ])
              }
              style={{
                alignSelf: "flex-start",
                padding: "7px 14px",
                borderRadius: "9px",
                border: "1px solid #bfdbfe",
                background: "#eff6ff",
                color: "#1d4ed8",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              + Add Row
            </button>
          </div>
        </SuggestChangeFieldRow>

        {/* Revenue Model */}
        <SuggestChangeFieldRow
          label="Revenue Model"
          currentValue={
            currentValues.revenueModel.length > 0
              ? currentValues.revenueModel
                  .filter((item) => String(item?.Revenue_Model_ || "").trim())
                  .map((item) => {
                    const pred = String(item.Predominance || "").trim();
                    return pred
                      ? `${item.Revenue_Model_} (${pred})`
                      : String(item.Revenue_Model_ || "");
                  })
                  .join("\n") || "Not available"
              : "Not available"
          }
          helpText="How the company generates revenue — its primary and secondary models."
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div
              style={{
                display: "flex",
                gap: "6px",
                alignItems: "center",
                padding: "0 2px",
                marginBottom: "2px",
                fontSize: "11px",
                fontWeight: 700,
                color: "#94a3b8",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              <div style={{ flex: 1 }}>Model</div>
              <div style={{ flex: 1 }}>Predominance</div>
              <div style={{ width: "34px", minWidth: "34px" }} />
            </div>
            {revenueModelItems.map((row) => (
              <div key={row._id} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <SuggestChangeSelect
                    value={row.Revenue_Model_}
                    onChange={(val) =>
                      setRevenueModelItems((prev) =>
                        prev.map((r) =>
                          r._id === row._id ? { ...r, Revenue_Model_: val } : r
                        )
                      )
                    }
                    placeholder="Select model"
                    options={REVENUE_MODEL_OPTIONS}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <SuggestChangeSelect
                    value={row.Predominance}
                    onChange={(val) =>
                      setRevenueModelItems((prev) =>
                        prev.map((r) => (r._id === row._id ? { ...r, Predominance: val } : r))
                      )
                    }
                    placeholder="Select"
                    options={PREDOMINANCE_OPTIONS}
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setRevenueModelItems((prev) => prev.filter((r) => r._id !== row._id))
                  }
                  style={{
                    width: "34px",
                    minWidth: "34px",
                    height: "42px",
                    borderRadius: "8px",
                    border: "1px solid #fecaca",
                    background: "#fff1f2",
                    color: "#9f1239",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "15px",
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setRevenueModelItems((prev) => [
                  ...prev,
                  { _id: `rm-new-${Date.now()}`, Revenue_Model_: "", Predominance: "" },
                ])
              }
              style={{
                alignSelf: "flex-start",
                padding: "7px 14px",
                borderRadius: "9px",
                border: "1px solid #bfdbfe",
                background: "#eff6ff",
                color: "#1d4ed8",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              + Add Row
            </button>
          </div>
        </SuggestChangeFieldRow>

        <div style={{ paddingTop: "20px" }}>
          <div
            style={{
              padding: "18px",
              border: "1px solid #e2e8f0",
              borderRadius: "14px",
              background: "#ffffff",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
                marginBottom: "8px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#0f172a",
                    marginBottom: "4px",
                  }}
                >
                  Management
                </div>
                <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
                  Key people at the company — executives, board members, and notable former leaders.
                </div>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                  Current: {currentManagementCount} · Past: {pastManagementCount}
                </div>
              </div>
            </div>

            {(["Current", "Past"] as const).map((status) => {
              const peopleInSection = managementPeople.filter(
                (person) => person.status === status
              );
              return (
                <div
                  key={status}
                  style={{
                    marginTop: "18px",
                    padding: "18px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "14px",
                    background: "#ffffff",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                      flexWrap: "wrap",
                      marginBottom: "16px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "16px",
                          fontWeight: 700,
                          color: "#0f172a",
                        }}
                      >
                        {status} Management
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#64748b",
                          marginTop: "4px",
                        }}
                      >
                        {status === "Current"
                          ? "People currently in leadership or board roles at this company."
                          : "Former executives, board members, or key leaders who have since departed."}
                      </div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                        {peopleInSection.length > 0
                          ? `${peopleInSection.length} individual${peopleInSection.length === 1 ? "" : "s"} on record`
                          : `No ${status.toLowerCase()} individuals yet`}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const localId = addManagementPerson(status);
                        setExpandedManagementPersonIds((prev) =>
                          prev.includes(localId) ? prev : [...prev, localId]
                        );
                      }}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: "1px solid #bfdbfe",
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: 700,
                      }}
                    >
                      + Add New Individual
                    </button>
                  </div>

                  <div
                    style={{ display: "flex", flexDirection: "column", gap: "14px" }}
                  >
                    {peopleInSection.length > 0 ? (
                      peopleInSection.map((person) => {
                        const isExpanded = expandedManagementPersonIds.includes(
                          person.localId
                        );
                        const roleSummary = person.roles.filter(Boolean).join(", ");

                        return (
                          <div
                            key={person.localId}
                            style={{
                              border: "1px solid #dbeafe",
                              borderRadius: "14px",
                              padding: "16px",
                              background: "#f8fbff",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: "12px",
                                flexWrap: "wrap",
                              }}
                            >
                              <div>
                                <div
                                  style={{
                                    fontSize: "15px",
                                    fontWeight: 700,
                                    color: "#0f172a",
                                  }}
                                >
                                  {person.name || "New individual"}
                                </div>
                                <div
                                  style={{
                                    fontSize: "12px",
                                    color: "#64748b",
                                    marginTop: "4px",
                                  }}
                                >
                                  {[roleSummary, person.location]
                                    .filter(Boolean)
                                    .join(" | ") || "No details yet"}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedManagementPersonIds((prev) =>
                                    isExpanded
                                      ? prev.filter((id) => id !== person.localId)
                                      : [...prev, person.localId]
                                  )
                                }
                                style={{
                                  padding: "10px 14px",
                                  borderRadius: "10px",
                                  border: "1px solid #cbd5e1",
                                  background: "white",
                                  color: "#334155",
                                  cursor: "pointer",
                                  fontSize: "13px",
                                  fontWeight: 700,
                                }}
                              >
                                {isExpanded ? "Collapse" : "Edit"}
                              </button>
                            </div>

                            {isExpanded && (
                              <div style={{ marginTop: "14px" }}>
                                <SuggestManagementPersonEditor
                                  person={person}
                                  roleOptions={jobTitleOptions}
                                  onChange={(nextPerson) =>
                                    updateManagementPerson(person.localId, nextPerson)
                                  }
                                  onAddRole={() =>
                                    updateManagementPerson(person.localId, {
                                      ...person,
                                      roles: [...person.roles, ""],
                                    })
                                  }
                                  onRemoveRole={(roleIndex) =>
                                    updateManagementPerson(person.localId, {
                                      ...person,
                                      roles:
                                        person.roles.length > 1
                                          ? person.roles.filter(
                                              (_, index) => index !== roleIndex
                                            )
                                          : [""],
                                    })
                                  }
                                  onRemovePerson={() =>
                                    removeManagementPerson(person.localId)
                                  }
                                />
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div
                        style={{
                          padding: "20px",
                          borderRadius: "12px",
                          border: "1px dashed #cbd5e1",
                          background: "#f8fafc",
                          color: "#64748b",
                          fontSize: "13px",
                          textAlign: "center",
                        }}
                      >
                        No {status.toLowerCase()} management listed. Use the
                        button above to add one.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ paddingTop: "20px" }}>
          <div
            style={{
              padding: "18px",
              border: "1px solid #e2e8f0",
              borderRadius: "14px",
              background: "#ffffff",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
                marginBottom: "10px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#0f172a",
                    marginBottom: "4px",
                  }}
                >
                  Subsidiaries
                </div>
                <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
                  Companies that are majority-owned or controlled by this company. Edit existing entries or add ones that are missing.
                </div>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                  {subsidiaries.length} subsidiar{subsidiaries.length === 1 ? "y" : "ies"} on record
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const localId = addSubsidiary();
                  setExpandedSubsidiaryIds((prev) =>
                    prev.includes(localId) ? prev : [...prev, localId]
                  );
                }}
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1px solid #bfdbfe",
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 700,
                }}
              >
                + Add New Subsidiary
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {subsidiaries.length > 0 ? (
                subsidiaries.map((subsidiary) => {
                  const isExpanded = expandedSubsidiaryIds.includes(subsidiary.localId);
                  const subsidiarySummary = [
                    subsidiary.sectors.filter(Boolean).join(", "),
                    subsidiary.country,
                    subsidiary.linkedinMembers
                      ? `${subsidiary.linkedinMembers} LinkedIn members`
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" | ");

                  return (
                    <div
                      key={subsidiary.localId}
                      style={{
                        border: "1px solid #dbeafe",
                        borderRadius: "14px",
                        padding: "16px",
                        background: "#f8fbff",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "12px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: "15px",
                              fontWeight: 700,
                              color: "#0f172a",
                            }}
                          >
                            {subsidiary.name || "New subsidiary"}
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#0f172a",
                              marginTop: "4px",
                              fontWeight: 500,
                            }}
                          >
                            {subsidiarySummary || "No details yet"}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedSubsidiaryIds((prev) =>
                              isExpanded
                                ? prev.filter((id) => id !== subsidiary.localId)
                                : [...prev, subsidiary.localId]
                            )
                          }
                          style={{
                            padding: "10px 14px",
                            borderRadius: "10px",
                            border: "1px solid #cbd5e1",
                            background: "white",
                            color: "#334155",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: 700,
                          }}
                        >
                          {isExpanded ? "Collapse" : "Edit"}
                        </button>
                      </div>

                      {isExpanded && (
                        <div style={{ marginTop: "14px" }}>
                          <SuggestSubsidiaryEditor
                            subsidiary={subsidiary}
                            sectorOptions={sectorOptions}
                            onSearchCompanies={searchCompanies}
                            onChange={(nextSubsidiary) =>
                              updateSubsidiary(subsidiary.localId, nextSubsidiary)
                            }
                            onAddSector={() =>
                              updateSubsidiary(subsidiary.localId, {
                                ...subsidiary,
                                sectors: [...subsidiary.sectors, ""],
                              })
                            }
                            onRemoveSector={(sectorIndex) =>
                              updateSubsidiary(subsidiary.localId, {
                                ...subsidiary,
                                sectors:
                                  subsidiary.sectors.length > 1
                                    ? subsidiary.sectors.filter(
                                        (_, index) => index !== sectorIndex
                                      )
                                    : [""],
                              })
                            }
                            onRemove={() => removeSubsidiary(subsidiary.localId)}
                            onAddNew={(name) => {
                              updateSubsidiary(subsidiary.localId, {
                                ...subsidiary,
                                name,
                                companyId: "",
                                isNewCompany: true,
                                newCompanyProfile: createEmptyNewCompanyProfile(name),
                              });
                              setNewCompanyModalTargetId(subsidiary.localId);
                            }}
                            onOpenNewCompanyModal={() =>
                              setNewCompanyModalTargetId(subsidiary.localId)
                            }
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div
                  style={{
                    padding: "20px",
                    borderRadius: "12px",
                    border: "1px dashed #cbd5e1",
                    background: "#f8fafc",
                    color: "#0f172a",
                    fontSize: "13px",
                    textAlign: "center",
                  }}
                >
                  No subsidiaries listed. Use the button above to add one.
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ paddingTop: "20px" }}>
          <div
            style={{
              padding: "18px",
              border: "1px solid #e2e8f0",
              borderRadius: "14px",
              background: "#ffffff",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
                marginBottom: "10px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#0f172a",
                    marginBottom: "4px",
                  }}
                >
                  Corporate Events
                </div>
                <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
                  Significant transactions involving this company — M&amp;A deals, funding rounds, divestitures, and similar events.
                </div>
                <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                  {corporateEvents.length} event{corporateEvents.length === 1 ? "" : "s"} on record
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const localId = addCorporateEvent();
                  setExpandedCorporateEventIds((prev) =>
                    prev.includes(localId) ? prev : [...prev, localId]
                  );
                }}
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1px solid #bbf7d0",
                  background: "#f0fdf4",
                  color: "#15803d",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 700,
                }}
              >
                + Add New Corporate Event
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {[...corporateEvents]
                .sort((left, right) => Number(Boolean(right.isNew)) - Number(Boolean(left.isNew)))
                .map((eventItem) => {
                const isExpanded = expandedCorporateEventIds.includes(
                  eventItem.localId
                );
                const eventSummary = [
                  eventItem.announcementDate,
                  eventItem.dealType,
                  eventItem.counterparties.length === 1
                    ? "1 counterparty"
                    : `${eventItem.counterparties.length} counterparties`,
                ]
                  .filter(Boolean)
                  .join(" | ");

                return (
                  <div
                    key={eventItem.localId}
                    style={{
                      border: "1px solid #dbeafe",
                      borderRadius: "14px",
                      padding: "16px",
                      background: "#f8fbff",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "12px",
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: "15px",
                            fontWeight: 700,
                            color: "#0f172a",
                          }}
                        >
                          {eventItem.title || "New corporate event"}
                        </div>
                        <div
                          style={{
                            fontSize: "12px",
                            color: "#64748b",
                            marginTop: "4px",
                          }}
                        >
                          {eventSummary || "No details yet"}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCorporateEventIds((prev) =>
                            isExpanded
                              ? prev.filter((id) => id !== eventItem.localId)
                              : [...prev, eventItem.localId]
                          )
                        }
                        style={{
                          padding: "10px 14px",
                          borderRadius: "10px",
                          border: "1px solid #cbd5e1",
                          background: "white",
                          color: "#334155",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: 700,
                        }}
                      >
                        {isExpanded ? "Collapse" : "Edit"}
                      </button>
                    </div>

                    {isExpanded && (
                      <div style={{ marginTop: "14px" }}>
                        <SuggestCorporateEventEditor
                          corporateEvent={eventItem}
                          dealTypeOptions={SUGGEST_DEAL_TYPE_OPTIONS}
                          dealStatusOptions={SUGGEST_DEAL_STATUS_OPTIONS}
                          currencyOptions={currencyOptions}
                          fundingStageOptions={SUGGEST_FUNDING_STAGE_OPTIONS}
                          counterpartyRoleOptions={counterpartyRoleOptions}
                          jobTitleOptions={jobTitleOptions}
                          existingIndividuals={managementPeople}
                          onSearchCompanies={searchCompanies}
                          onOpenCounterpartyNewCompanyModal={(cpLocalId) =>
                            setNewCompanyModalTargetId(`cp:${eventItem.localId}:${cpLocalId}`)
                          }
                          onChange={(nextCorporateEvent) =>
                            setCorporateEvents((prev) =>
                              prev.map((item) =>
                                item.localId === eventItem.localId
                                  ? nextCorporateEvent
                                  : item
                              )
                            )
                          }
                          onRemove={() => removeCorporateEvent(eventItem.localId)}
                        />
                      </div>
                    )}
                  </div>
                );
                })}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
            paddingTop: "18px",
          }}
        >
          <div style={{ fontSize: "13px", color: "#64748b" }}>
            {filledCount > 0 ? `${filledCount} field${filledCount === 1 ? "" : "s"} updated` : "No changes yet"}
          </div>
          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "11px 18px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                background: "white",
                color: "#475569",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={filledCount === 0 || submitting}
              onClick={() => void handleSubmit()}
              style={{
                padding: "11px 20px",
                borderRadius: "10px",
                border: "none",
                background: filledCount > 0 ? "#0f172a" : "#e2e8f0",
                color: filledCount > 0 ? "white" : "#94a3b8",
                cursor: filledCount > 0 ? "pointer" : "not-allowed",
                fontSize: "13px",
                fontWeight: 700,
              }}
            >
              {submitting ? "Submitting..." : "Send Suggestion"}
            </button>
          </div>
        </div>
      </div>
    </div>
    {newCompanyModalTargetId !== null && newCompanyModalProfile !== null && (
      <NewCompanyModal
        profile={newCompanyModalProfile}
        title={newCompanyModalTitle}
        sectorOptions={sectorOptions}
        secondarySectorOptions={secondarySectorOptions}
        ownershipOptions={ownershipOptions}
        yearOptions={yearOptions}
        simpleMode={investorChips.some((c) => c.localId === newCompanyModalTargetId)}
        forceOwnership={
          subsidiaries.some((s) => s.localId === newCompanyModalTargetId)
            ? "Subsidiary"
            : undefined
        }
        onSave={(updatedProfile) => {
          if (newCompanyModalTargetId === "parent-company") {
            setParentCompanySelection((prev) => ({
              ...prev,
              newCompanyProfile: updatedProfile,
              companyName: updatedProfile.name || prev.companyName,
            }));
          } else if (subsidiaries.some((s) => s.localId === newCompanyModalTargetId)) {
            setSubsidiaries((prev) =>
              prev.map((item) =>
                item.localId === newCompanyModalTargetId
                  ? {
                      ...item,
                      newCompanyProfile: updatedProfile,
                      name: updatedProfile.name || item.name,
                    }
                  : item
              )
            );
          } else if (investorChips.some((c) => c.localId === newCompanyModalTargetId)) {
            setInvestorChips((prev) =>
              prev.map((item) =>
                item.localId === newCompanyModalTargetId
                  ? {
                      ...item,
                      newCompanyProfile: updatedProfile,
                      companyName: updatedProfile.name || item.companyName,
                    }
                  : item
              )
            );
          } else if (newCompanyModalTargetId.startsWith("peer:")) {
            const lid = newCompanyModalTargetId.slice(5);
            setPeersCompetitorChips((prev) =>
              prev.map((item) =>
                item.localId === lid
                  ? {
                      ...item,
                      newCompanyProfile: updatedProfile,
                      companyName: updatedProfile.name || item.companyName,
                    }
                  : item
              )
            );
          } else if (newCompanyModalTargetId.startsWith("pacq:")) {
            const lid = newCompanyModalTargetId.slice(5);
            setPotentialAcquirerChips((prev) =>
              prev.map((item) =>
                item.localId === lid
                  ? {
                      ...item,
                      newCompanyProfile: updatedProfile,
                      companyName: updatedProfile.name || item.companyName,
                    }
                  : item
              )
            );
          } else if (newCompanyModalTargetId.startsWith("actg:")) {
            const lid = newCompanyModalTargetId.slice(5);
            setAcquisitionTargetChips((prev) =>
              prev.map((item) =>
                item.localId === lid
                  ? {
                      ...item,
                      newCompanyProfile: updatedProfile,
                      companyName: updatedProfile.name || item.companyName,
                    }
                  : item
              )
            );
          } else {
            const parsed = parseCounterpartyTarget(newCompanyModalTargetId);
            if (parsed) {
              setCorporateEvents((prev) =>
                prev.map((event) =>
                  event.localId === parsed.ceId
                    ? {
                        ...event,
                        counterparties: event.counterparties.map((cp) =>
                          cp.localId === parsed.cpId
                            ? {
                                ...cp,
                                newCompanyProfile: updatedProfile,
                                companyName: updatedProfile.name || cp.companyName,
                              }
                            : cp
                        ),
                      }
                    : event
                )
              );
            }
          }
          setNewCompanyModalTargetId(null);
        }}
        onClose={() => setNewCompanyModalTargetId(null)}
      />
    )}
    </>
  );
}

function mapContributorMetricsToFormValues(
  payload: Record<string, unknown> | null
): Record<string, string> {
  if (!payload) return {};

  const read = (...keys: string[]) => {
    for (const key of keys) {
      const value = payload[key];
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        return value as number | string;
      }
    }
    return undefined;
  };

  const plain = (...keys: string[]) => {
    const value = read(...keys);
    if (value === undefined) return "";
    return formatPlainNumber(value);
  };

  const whole = (...keys: string[]) => {
    const value = read(...keys);
    if (value === undefined) return "";
    const formatted = formatWholeNumber(value);
    return formatted === "Not available" ? "" : formatted;
  };

  const percent = (...keys: string[]) => {
    const value = read(...keys);
    if (value === undefined) return "";
    const formatted = formatPercent(value);
    return formatted === "Not available" ? "" : formatted;
  };

  const multiple = (...keys: string[]) => {
    const value = read(...keys);
    if (value === undefined) return "";
    const formatted = formatMultiple(value);
    return formatted === "Not available" ? "" : formatted;
  };

  const integerish = (...keys: string[]) => {
    const value = read(...keys);
    if (value === undefined) return "";
    const numeric = getNumeric(value);
    return numeric === undefined ? "" : String(Math.round(numeric));
  };

  return {
    revenue_m: plain("Revenue_m", "revenue_m"),
    ebitda_m: plain("EBITDA_m", "ebitda_m"),
    enterprise_value_m: plain("EV", "ev", "Enterprise_Value_m", "enterprise_value_m"),
    revenue_multiple: multiple("Revenue_multiple", "revenue_multiple"),
    revenue_growth: percent("Rev_Growth_PC", "revenue_growth", "rev_growth_pc"),
    ebitda_margin: percent("EBITDA_margin", "ebitda_margin"),
    rule_of_40: integerish("Rule_of_40", "rule_of_40"),
    recurring_revenue: percent("ARR_pc", "recurring_revenue", "arr_pc"),
    arr_m: plain("ARR_m", "arr_m"),
    churn: percent("Churn_pc", "churn", "churn_pc"),
    grr: percent("GRR_pc", "grr", "grr_pc"),
    nrr: percent("NRR", "nrr"),
    new_clients_revenue_growth: percent(
      "New_client_growth_pc",
      "new_clients_revenue_growth",
      "new_client_growth_pc"
    ),
    ebit_m: plain("EBIT_m", "ebit_m"),
    number_of_clients: whole("No_of_Clients", "number_of_clients", "no_of_clients"),
    revenue_per_client: whole("Rev_per_client", "revenue_per_client"),
    number_of_employees: whole("No_Employees", "number_of_employees", "no_employees"),
    revenue_per_employee: whole(
      "Revenue_per_employee",
      "revenue_per_employee"
    ),
  };
}

/** Same rule as fetch: POST if there are no displayable metric values yet (first submission). */
function hasExistingContributorFinancialMetrics(
  raw: Record<string, unknown> | undefined
): boolean {
  if (!raw || typeof raw !== "object") return false;
  const mapped = mapContributorMetricsToFormValues(raw);
  return Object.values(mapped).some((v) => String(v ?? "").trim() !== "");
}

function ContributeFinancialMetricsTab({
  companyName,
  companyId,
  yearOptions,
  selectedYearId,
  onSelectYearId,
  hasUserSelectedYear,
  existingMetricsByYearId,
  rawExistingMetricsByYearId,
  isLoadingYearData,
  hasLoadedYearData,
}: {
  companyName: string;
  companyId: string;
  yearOptions: ContributorYearItem[];
  selectedYearId: number | null;
  onSelectYearId: (yearId: number) => void;
  hasUserSelectedYear: boolean;
  existingMetricsByYearId: Record<number, Record<string, string>>;
  rawExistingMetricsByYearId: Record<number, Record<string, unknown>>;
  isLoadingYearData: boolean;
  hasLoadedYearData: boolean;
}) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [rangeFormData, setRangeFormData] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [currencies, setCurrencies] = useState<Array<{ id: number; Currency: string }>>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<string>("");
  const [contributorEmail, setContributorEmail] = useState("");
  const isPublicContributor = !authService.getAuthToken();

  useEffect(() => {
    fetch("https://xdil-abvj-o7rq.e2.xano.io/api:8Bv5PK4I/get_currency")
      .then((r) => r.json())
      .then((data: Array<{ id: number; Currency: string }>) => {
        setCurrencies(data);
        if (!selectedCurrency) setSelectedCurrency("USD");
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedYearLabel =
    yearOptions.find((year) => year.id === selectedYearId)?.Year ?? "selected";

  // On first load the API may return the closest available year.
  // After the user changes the dropdown, always honor the selected year.
  const rawPayload =
    selectedYearId != null
      ? (rawExistingMetricsByYearId[selectedYearId] as Record<string, unknown> | undefined)
      : undefined;
  const yearFromContributorPayload =
    rawPayload?.year_value ?? rawPayload?.financial_year_text;
  const actualYearValue =
    yearFromContributorPayload != null &&
    String(yearFromContributorPayload).trim() !== ""
      ? String(yearFromContributorPayload).trim()
      : null;
  const shouldUseClosestAvailableYear =
    !hasUserSelectedYear && actualYearValue != null;
  const displayedYearLabel = shouldUseClosestAvailableYear
    ? actualYearValue
    : selectedYearLabel;
  const isFallbackYear =
    !hasUserSelectedYear &&
    actualYearValue != null &&
    String(selectedYearLabel) !== actualYearValue;
  const yearOptionMatchingApi = shouldUseClosestAvailableYear
    ? yearOptions.find((y) => String(y.Year) === actualYearValue)
    : null;
  const displayYearId = yearOptionMatchingApi?.id ?? selectedYearId;

  const existing =
    selectedYearId != null ? existingMetricsByYearId[selectedYearId] || {} : {};
  const filledCount =
    Object.values(formData).filter((value) => value.trim() !== "").length +
    Object.values(rangeFormData).filter((value) => value.trim() !== "").length +
    (notes.trim() ? 1 : 0);

  const handleSubmit = async () => {
    if (selectedYearId == null) return;

    for (const fieldKey of Object.keys(CONTRIBUTION_FIELD_TO_RANGE_PAYLOAD_KEY)) {
      const raw = (rangeFormData[fieldKey] ?? "").trim();
      if (!raw) continue;
      const parsed = parseContributionRangeInput(raw);
      if (!parsed.ok) {
        window.alert(
          `${findContributionMetricLabel(fieldKey)} — ranges\n\n${parsed.message}`
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      const token = authService.getAuthToken();
      const normalizedContributorEmail = contributorEmail.trim().toLowerCase();
      if (isPublicContributor && !normalizedContributorEmail) {
        throw new Error("Please enter your email address.");
      }

      const oldPayload = rawExistingMetricsByYearId[selectedYearId] || {};
      const hasExistingData = hasExistingContributorFinancialMetrics(oldPayload);

      if (hasExistingData) {
        const baselineForm = mapContributorMetricsToFormValues(oldPayload);
        const clearedFilled = getClearedFilledMetricFieldKeys(baselineForm, formData);
        if (clearedFilled.length > 0) {
          setSubmitting(false);
          const labels = clearedFilled.map(findContributionMetricLabel).join(", ");
          alert(
            `You cannot clear metrics that already have values. Restore a value or leave the field unchanged. Affected field(s): ${labels}.`
          );
          return;
        }
      }

      const newPayload = Object.entries(formData).reduce<Record<string, unknown>>(
        (acc, [key, value]) => {
          const trimmed = value.trim();
          if (!trimmed) return acc;
          const payloadKey = CONTRIBUTION_FIELD_TO_PAYLOAD_KEY[key] || key;
          acc[payloadKey] = trimmed;
          return acc;
        },
        {}
      );

      for (const fieldKey of Object.keys(CONTRIBUTION_FIELD_TO_RANGE_PAYLOAD_KEY)) {
        const raw = (rangeFormData[fieldKey] ?? "").trim();
        if (!raw) continue;
        const parsed = parseContributionRangeInput(raw);
        if (!parsed.ok || parsed.empty) continue;
        const rangeKey = CONTRIBUTION_FIELD_TO_RANGE_PAYLOAD_KEY[fieldKey];
        const lo = Math.min(parsed.low, parsed.high);
        const hi = Math.max(parsed.low, parsed.high);
        newPayload[rangeKey] = `${lo}-${hi}`;
      }

      if (notes.trim()) {
        newPayload.Data_entry_notes = notes.trim();
      }
      if (selectedCurrency) {
        newPayload.currency = selectedCurrency;
      }

      newPayload.new_company_id = Number(companyId);
      newPayload.years_id = selectedYearId;

      const uploadedDocuments =
        uploadedFiles.length > 0
          ? await Promise.all(
              uploadedFiles.map((file) => uploadFileToXano(token, file))
            )
          : [];

      const submittedBy =
        authService.getUser()?.email ||
        localStorage.getItem("outreach_crm_login_email") ||
        normalizedContributorEmail;

      await createChangeRequest(token, {
        entity_type: "financial_metrics",
        new_company_id: Number(companyId),
        submitted_by: submittedBy,
        old: hasExistingData ? oldPayload : {},
        new: newPayload,
        approved: false,
        reviewed_by: 0,
        documents: uploadedDocuments,
        workflow: hasExistingData ? "PATCH" : "POST",
      });

      try {
        const user = authService.getUser();
        await notifyDataContribution(token, {
          contributor_name: user?.name?.trim() || "",
          contributor_email: submittedBy,
          company_name: companyName,
          request_url: buildInternalReviewUrl(companyId, {
            review: true,
            reviewType: "fin-metrics",
            companyName,
          }),
          field_name: `Financial Metrics (${selectedYearLabel})`,
          notes: notes.trim(),
        });
      } catch {
        // Change request saved; notification failure should not block the contributor.
      }

      setSubmitting(false);
      setSubmitted(true);
    } catch (err) {
      setSubmitting(false);
      alert((err as Error)?.message || "Failed to submit change request.");
    }
  };

  if (submitted) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 380,
          gap: 20,
          textAlign: "center",
          background: "#fff",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          padding: "40px 24px",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            background: "#d1fae5",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ContributorTabIcon name="check" />
        </div>
        <div>
          <div
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#0f172a",
              marginBottom: 8,
              fontFamily: "Georgia, serif",
            }}
          >
            Submission received
          </div>
          <div
            style={{
              fontSize: "14px",
              color: "#64748b",
              maxWidth: 380,
            }}
          >
            Thank you. Your {selectedYearLabel} data has been sent to the
            Asymmetrix research team for review. We&apos;ll be in touch if we
            have any questions.
          </div>
        </div>
        <button
          onClick={() => {
            setSubmitted(false);
            setFormData({});
            setRangeFormData({});
            setNotes("");
            setSelectedCurrency("USD");
          }}
          style={{
            padding: "9px 24px",
            border: "1.5px solid #e2e8f0",
            background: "white",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "13px",
            color: "#475569",
            fontWeight: 500,
          }}
        >
          Submit another year
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "14px",
        border: "1px solid #e2e8f0",
        padding: "28px 28px 24px",
        maxWidth: "880px",
      }}
    >
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontFamily: "Georgia, serif",
            fontSize: "26px",
            fontWeight: 700,
            color: "#0f172a",
            margin: "0 0 6px 0",
          }}
        >
          Contribute Financial Metrics
        </h1>
        <p style={{ fontSize: "13.5px", color: "#64748b", margin: 0 }}>
          Help us maintain accurate data for {companyName}. All submissions are
          reviewed before publishing.
        </p>
      </div>

      {isPublicContributor && (
        <div style={{ marginBottom: 24 }}>
          <label
            htmlFor="contributor-email"
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 600,
              color: "#475569",
              marginBottom: 8,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Your Email Address
          </label>
          <input
            id="contributor-email"
            type="email"
            value={contributorEmail}
            onChange={(e) => setContributorEmail(e.target.value)}
            placeholder="Enter your work email"
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1.5px solid #cbd5e1",
              borderRadius: "8px",
              fontSize: "14px",
              color: "#0f172a",
            }}
          />
        </div>
      )}

      <div
        style={{
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: "8px",
          padding: "12px 16px",
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          marginBottom: 24,
        }}
      >
        <div style={{ marginTop: 1 }}>
          <ContributorTabIcon name="info" />
        </div>
        <div style={{ fontSize: "13px", color: "#1e40af" }}>
          <strong>Current data shown in the left column.</strong> Enter updated
          or new values in &quot;Your update&quot;. Optionally add an estimated
          range in <strong>Add ranges</strong> (two numbers with a dash; the gap
          cannot exceed {CONTRIBUTION_RANGE_MAX_SPAN} units). Leave fields blank
          to keep existing data unchanged.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 28,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {/* Financial Year */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: "12px",
              color: "#94a3b8",
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Financial Year
          </span>
          <select
            value={displayYearId ?? ""}
            onChange={(e) => {
              onSelectYearId(Number(e.target.value));
              setFormData({});
              setRangeFormData({});
              setNotes("");
            }}
            style={{
              minWidth: "120px",
              padding: "7px 12px",
              border: "1.5px solid #1e40af",
              borderRadius: "8px",
              background: "white",
              color: "#0f172a",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 600,
              fontFamily: "'DM Mono', monospace",
              outline: "none",
            }}
          >
            {yearOptions.map((year) => (
              <option key={year.id} value={year.id}>
                {year.Year}
                {Number(year.Year) === new Date().getFullYear() + 1
                  ? " (Forecast)"
                  : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Currency */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: "12px",
              color: "#94a3b8",
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Currency
          </span>
          <div style={{ position: "relative" }}>
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              style={{
                minWidth: "110px",
                padding: "7px 32px 7px 12px",
                border: selectedCurrency ? "1.5px solid #15803d" : "1.5px solid #e2e8f0",
                borderRadius: "8px",
                background: selectedCurrency ? "#f0fdf4" : "white",
                color: selectedCurrency ? "#15803d" : "#94a3b8",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 700,
                fontFamily: "'DM Mono', monospace",
                outline: "none",
                appearance: "none",
                WebkitAppearance: "none",
              }}
            >
              <option value="">Select currency</option>
              {currencies.map((c) => (
                <option key={c.id} value={c.Currency}>
                  {c.Currency}
                </option>
              ))}
            </select>
            <span
              style={{
                position: "absolute",
                right: 9,
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
                fontSize: "10px",
                color: selectedCurrency ? "#15803d" : "#94a3b8",
              }}
            >
              ▼
            </span>
          </div>
        </div>

        {/* Status badges */}
        {selectedYearId != null && !isLoadingYearData && hasLoadedYearData && !existingMetricsByYearId[selectedYearId] && (
          <ContributionBadge
            color={{ bg: "#fef3c7", text: "#92400e", border: "#fde68a" }}
          >
            No existing data - first submission
          </ContributionBadge>
        )}
        {isFallbackYear && (
          <ContributionBadge
            color={{ bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" }}
          >
            Showing {actualYearValue} data ({selectedYearLabel} not yet available)
          </ContributionBadge>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 128px 128px 148px",
          gap: 12,
          marginBottom: 6,
          padding: "0 0 8px 0",
          borderBottom: "2px solid #0f172a",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          Metric
        </span>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            textAlign: "center",
          }}
        >
          Current ({displayedYearLabel})
        </span>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: 3,
            alignItems: "center",
          }}
        >
          Your Update
          {selectedCurrency && (
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "#15803d",
                background: "#dcfce7",
                border: "1px solid #bbf7d0",
                borderRadius: "4px",
                padding: "1px 5px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontFamily: "'DM Mono', monospace",
              }}
            >
              {selectedCurrency}
            </span>
          )}
        </span>
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: 3,
            alignItems: "center",
          }}
        >
          Add ranges
          <span
            style={{
              fontSize: "9px",
              fontWeight: 600,
              color: "#64748b",
              textTransform: "none",
              letterSpacing: "0.02em",
              lineHeight: 1.25,
            }}
          >
            Low–high, gap ≤ {CONTRIBUTION_RANGE_MAX_SPAN}
          </span>
        </span>
      </div>

      {CONTRIBUTION_METRIC_GROUPS.map((group) => (
        <div key={group.label} style={{ marginBottom: 28 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 0 2px 0",
            }}
          >
            <div
              style={{
                width: 3,
                height: 16,
                borderRadius: 2,
                background: group.color,
              }}
            />
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: group.color,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
              }}
            >
              {group.label}
            </span>
          </div>
          {group.fields.map((field) => (
            <ContributionMetricRow
              key={field.key}
              field={field}
              existing={existing[field.key] || ""}
              value={formData[field.key] || ""}
              rangeValue={rangeFormData[field.key] || ""}
              currency={selectedCurrency || undefined}
              onChange={(nextValue) =>
                setFormData((prev) => ({ ...prev, [field.key]: nextValue }))
              }
              onRangeChange={(nextRange) =>
                setRangeFormData((prev) => ({ ...prev, [field.key]: nextRange }))
              }
            />
          ))}
        </div>
      ))}

      {isLoadingYearData && (
        <div style={{ marginTop: "-8px", marginBottom: "20px", fontSize: "13px", color: "#64748b" }}>
          Loading current values for {selectedYearLabel}...
        </div>
      )}

      <div style={{ marginTop: 8, marginBottom: 28 }}>
        <label
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            display: "block",
            marginBottom: 8,
          }}
        >
          Additional notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. FY2024 figures from audited accounts. Revenue excludes one-off items."
          rows={3}
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1.5px solid #e2e8f0",
            borderRadius: "8px",
            fontSize: "13px",
            color: "#334155",
            resize: "vertical",
            outline: "none",
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* File Upload Section */}
      <div style={{ marginBottom: 28 }}>
        <label
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            display: "block",
            marginBottom: 8,
          }}
        >
          Supporting Documents
        </label>
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            const dropped = Array.from(e.dataTransfer.files);
            setUploadedFiles((prev) => [...prev, ...dropped]);
          }}
          style={{
            border: `2px dashed ${isDragOver ? "#2563a8" : "#cbd5e1"}`,
            borderRadius: "10px",
            padding: "20px 16px",
            textAlign: "center",
            background: isDragOver ? "#eff6ff" : "#f8fafc",
            transition: "all 0.15s",
            cursor: "pointer",
          }}
          onClick={() => document.getElementById("file-upload-input")?.click()}
        >
          <input
            id="file-upload-input"
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
            style={{ display: "none" }}
            onChange={(e) => {
              const selected = Array.from(e.target.files ?? []);
              setUploadedFiles((prev) => [...prev, ...selected]);
              e.target.value = "";
            }}
          />
          <div style={{ fontSize: "22px", marginBottom: 6 }}>📎</div>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#334155", marginBottom: 4 }}>
            Drop files here or <span style={{ color: "#2563a8", textDecoration: "underline" }}>browse</span>
          </div>
          <div style={{ fontSize: "12px", color: "#94a3b8" }}>
            PDF, Word, Excel, CSV — up to 20 MB each
          </div>
        </div>

        {uploadedFiles.length > 0 && (
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
            {uploadedFiles.map((file, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "7px 12px",
                  background: "#f1f5f9",
                  borderRadius: "7px",
                  fontSize: "13px",
                  color: "#334155",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
                  <span style={{ fontSize: "15px" }}>
                    {file.name.endsWith(".pdf") ? "📄"
                      : file.name.match(/\.xlsx?$/i) ? "📊"
                      : file.name.match(/\.csv$/i) ? "📋"
                      : file.name.match(/\.docx?$/i) ? "📝"
                      : "📎"}
                  </span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {file.name}
                  </span>
                  <span style={{ color: "#94a3b8", flexShrink: 0 }}>
                    ({(file.size / 1024).toFixed(0)} KB)
                  </span>
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setUploadedFiles((prev) => prev.filter((_, i) => i !== idx));
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#94a3b8",
                    fontSize: "16px",
                    lineHeight: 1,
                    padding: "0 2px",
                    flexShrink: 0,
                  }}
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 16,
          borderTop: "1px solid #f1f5f9",
        }}
      >
        <span style={{ fontSize: "13px", color: "#94a3b8" }}>
          {filledCount > 0 ? (
            <>
              <strong style={{ color: "#2563a8" }}>{filledCount}</strong>{" "}
              field{filledCount !== 1 ? "s" : ""} updated
            </>
          ) : (
            "No changes yet"
          )}
        </span>
        <button
          onClick={handleSubmit}
          disabled={
            filledCount === 0 ||
            submitting ||
            (isPublicContributor && !contributorEmail.trim())
          }
          style={{
            padding: "11px 32px",
            background: filledCount > 0 ? "#0f172a" : "#e2e8f0",
            color: filledCount > 0 ? "white" : "#94a3b8",
            border: "none",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: 700,
            cursor: filledCount > 0 ? "pointer" : "not-allowed",
            letterSpacing: "0.01em",
            transition: "all 0.15s",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {submitting ? "Submitting..." : "Submit Updates"}
          {!submitting && filledCount > 0 && (
            <ContributorTabIcon name="arrow" />
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Shared CE types (used by SectorIntelligenceTab) ────────────────────────

const CE_API =
  "https://xdil-abvj-o7rq.e2.xano.io/api:617tZc8l/get_all_corporate_events";
const CE_PER_PAGE = 25;

type CEItem = {
  id?: number;
  description?: string;
  announcement_date?: string;
  deal_type?: string;
  deal_status?: string;
  closed_date?: string;
  this_company_status?: string;
  target_counterparty?: {
    new_company?: { name?: string; id?: number };
    _new_company?: { name?: string; id?: number };
    new_company_counterparty?: number;
  };
  target_company?: { id?: number; name?: string };
  targets?: Array<{ id?: number; name?: string }>;
  buyers_investors?: Array<{ id?: number; name?: string }>;
  sellers?: Array<{ id?: number; name?: string; is_investor?: boolean }>;
  investment_data?: {
    investment_amount_m?: string;
    currency?: { Currency?: string };
    Funding_stage?: string;
    funding_stage?: string;
  };
  ev_data?: {
    enterprise_value_m?: string;
    currency?: { Currency?: string };
  };
  other_counterparties?: Array<{
    _new_company?: { name?: string; id?: number };
    _counterparty_type?: { counterparty_status?: string };
    new_company_counterparty?: number;
  }>;
  advisors?: Array<{
    _new_company?: { id?: number; name?: string };
  }>;
  sectors?: {
    Primary?: string[];
    Secondary?: string[];
  };
};

type CEResponse = {
  items?: CEItem[];
  new_counterparties?: CEItem[];
  curPage?: number;
  nextPage?: number | null;
  prevPage?: number | null;
  pageTotal?: number;
  itemTotal?: number;
  itemsReceived?: number;
};

function cePaginationButtons(
  curPage: number,
  pageTotal: number,
  nextPage: number | null,
  prevPage: number | null,
  onChange: (p: number) => void
): React.ReactNode[] {
  const btns: React.ReactNode[] = [];
  const btn = (key: string | number, label: React.ReactNode, page: number, active = false, disabled = false) => (
    <button
      key={key}
      type="button"
      onClick={() => !disabled && onChange(page)}
      disabled={disabled}
      style={{
        padding: "6px 11px",
        border: "none",
        background: "none",
        color: active ? "#0075df" : disabled ? "#ccc" : "#0f172a",
        fontWeight: active ? 600 : 400,
        textDecoration: active ? "underline" : "none",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: "14px",
      }}
    >
      {label}
    </button>
  );

  btns.push(btn("prev", "‹", curPage - 1, false, !prevPage));

  if (pageTotal <= 7) {
    for (let i = 1; i <= pageTotal; i++)
      btns.push(btn(i, i, i, i === curPage));
  } else {
    btns.push(btn(1, 1, 1, curPage === 1));
    if (curPage > 3) btns.push(<span key="el1" style={{ padding: "0 4px", color: "#94a3b8" }}>…</span>);
    for (
      let i = Math.max(2, curPage - 1);
      i <= Math.min(pageTotal - 1, curPage + 1);
      i++
    ) {
      btns.push(btn(i, i, i, i === curPage));
    }
    if (curPage < pageTotal - 2) btns.push(<span key="el2" style={{ padding: "0 4px", color: "#94a3b8" }}>…</span>);
    btns.push(btn(pageTotal, pageTotal, pageTotal, curPage === pageTotal));
  }

  btns.push(btn("next", "›", curPage + 1, false, !nextPage));
  return btns;
}

// ─── Sector Intelligence Tab ────────────────────────────────────────────────

const SECTOR_INTEL_API = "https://xdil-abvj-o7rq.e2.xano.io/api:5YnK3rYr/mean";

type SectorMetricRow = {
  revenue_range: string;
  num_companies: number;
  range_order?: number;
  [key: string]: unknown;
};

type SectorCurrency = "USD" | "GBP" | "EUR";
type SectorMetricView = "mean" | "median";

const SECTOR_CURRENCY_OPTIONS: Array<{
  value: SectorCurrency;
  symbol: string;
  label: string;
}> = [
  { value: "USD", symbol: "$", label: "US Dollar" },
  { value: "GBP", symbol: "£", label: "British Pound" },
  { value: "EUR", symbol: "€", label: "Euro" },
];

const SECTOR_FIN_METRICS = [
  { key: "revenue_m", label: "Revenue (M)", format: "money_m" as const },
  { key: "ebitda_m", label: "EBITDA (M)", format: "money_m" as const },
  { key: "ebit_m", label: "EBIT (M)", format: "money_m" as const },
  { key: "ev_m", label: "EV (M)", format: "money_m" as const },
  { key: "ev_rev_multiple", label: "EV / Rev (x)", format: "multiple" as const },
  { key: "revenue_growth", label: "Revenue Growth (%)", format: "percent" as const },
  { key: "ebitda_margin", label: "EBITDA Margin (%)", format: "percent" as const },
  { key: "rule_of_40", label: "Rule of 40", format: "percent" as const },
];

const SECTOR_SUB_METRICS = [
  { key: "arr_m", label: "ARR (M)", format: "money_m" as const },
  { key: "arr_percent", label: "ARR (%)", format: "percent" as const },
  { key: "churn", label: "Churn (%)", format: "percent" as const },
  { key: "grr", label: "GRR (%)", format: "percent" as const },
  { key: "nrr", label: "NRR (%)", format: "percent" as const },
  { key: "new_client_growth", label: "New Client Growth (%)", format: "percent" as const },
];

const SECTOR_ALL_METRICS = [...SECTOR_FIN_METRICS, ...SECTOR_SUB_METRICS];

const SECTOR_METRIC_ALIASES: Record<string, string[]> = {
  ev_m: ["ev_m", "ev", "enterprise_value_m"],
  ebit_m: ["ebit_m", "ebit"],
  churn: ["churn", "churn_pc"],
  grr: ["grr", "grr_pc"],
  new_client_growth: ["new_client_growth", "new_client_growth_pc"],
};

function sectorToNum(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const n = Number(v.trim().replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function sectorFormatValue(
  v: unknown,
  format: "percent" | "multiple" | "money_m" | "number",
  symbol: string,
  rates: Record<string, number> | null,
  toCurrency: SectorCurrency
): string {
  const n = sectorToNum(v);
  if (n === null) return "—";
  if (format === "percent") {
    return `${n.toFixed(1).replace(/\.0$/, "")}%`;
  }
  if (format === "multiple") {
    return `${n.toFixed(1).replace(/\.0$/, "")}x`;
  }
  if (format === "money_m") {
    let converted = n;
    if (toCurrency !== "USD" && rates && rates[toCurrency]) {
      converted = n * rates[toCurrency];
    }
    return `${symbol}${converted.toFixed(1).replace(/\.0$/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  }
  return n.toLocaleString();
}

const SUBMISSIONS_API = "https://xdil-abvj-o7rq.e2.xano.io/api:tDNMS_i0/users/submissions";

function SectorIntelligenceTab({
  primarySectorIds,
  secondarySectorIds,
  primarySectorNames,
  onGoToMetrics,
}: {
  primarySectorIds: number[];
  secondarySectorIds: number[];
  primarySectorNames?: string[];
  hasContributed?: boolean | null; // unused; resolved internally
  onGoToMetrics: () => void;
}) {
  // Stable serialised keys so useCallback doesn't re-fire on every parent render
  const primaryKey = primarySectorIds.slice().sort((a, b) => a - b).join(",");
  const secondaryKey = secondarySectorIds.slice().sort((a, b) => a - b).join(",");

  // ── Submission gate ──
  const [submissionCount, setSubmissionCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const email =
      authService.getUser()?.email ||
      localStorage.getItem("outreach_crm_login_email") ||
      "";
    if (!email) { setSubmissionCount(0); return; }

    const params = new URLSearchParams({ user_email: email });
    const token = authService.getAuthToken();
    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    fetch(`${SUBMISSIONS_API}?${params}`, { headers })
      .then((r) => r.json())
      .then((data: unknown) => {
        if (cancelled) return;
        const count = typeof data === "number" ? data : 0;
        setSubmissionCount(count);
      })
      .catch(() => { if (!cancelled) setSubmissionCount(0); });

    return () => { cancelled = true; };
  }, []);

  const hasContributed = submissionCount === null ? null : submissionCount > 0;
  // ── Benchmark table state ──
  const [view, setView] = useState<SectorMetricView>("mean");
  const [currency, setCurrency] = useState<SectorCurrency>("USD");
  const [fxRates, setFxRates] = useState<Record<string, number> | null>(null);
  const [rows, setRows] = useState<SectorMetricRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Corporate Events state ──
  const [cePage, setCePage] = useState(1);
  const [ceItems, setCeItems] = useState<CEItem[]>([]);
  const [cePag, setCePag] = useState<{
    curPage: number;
    pageTotal: number;
    nextPage: number | null;
    prevPage: number | null;
  }>({ curPage: 1, pageTotal: 0, nextPage: null, prevPage: null });
  const [ceLoading, setCeLoading] = useState(true);
  const [ceError, setCeError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("https://open.er-api.com/v6/latest/USD")
      .then((r) => r.json())
      .then((data: unknown) => {
        if (!cancelled && data && typeof data === "object") {
          const d = data as { rates?: Record<string, number> };
          if (d.rates) setFxRates(d.rates);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(SECTOR_INTEL_API, { method: "GET", headers: { Accept: "application/json" } })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Failed to load data (${r.status})`);
        return r.json();
      })
      .then((data: unknown) => {
        if (cancelled) return;
        const arr = Array.isArray(data) ? data as SectorMetricRow[] : [];
        arr.sort((a, b) => (a.range_order ?? 0) - (b.range_order ?? 0));
        setRows(arr);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // ── Corporate Events: fetched from CE_API filtered by company sectors ──
  useEffect(() => {
    const allSectorIds = Array.from(new Set([...primarySectorIds, ...secondarySectorIds]));
    if (allSectorIds.length === 0) {
      setCeItems([]);
      setCePag({ curPage: 1, pageTotal: 0, nextPage: null, prevPage: null });
      setCeLoading(false);
      return;
    }

    let cancelled = false;
    setCeLoading(true);
    setCeError(null);

    const params = new URLSearchParams({ page: String(cePage), per_page: String(CE_PER_PAGE) });
    primarySectorIds.forEach((id) => params.append("primary_sector_ids[]", String(id)));
    secondarySectorIds.forEach((id) => params.append("secondary_sector_ids[]", String(id)));

    const token = authService.getAuthToken();
    fetch(`${CE_API}?${params.toString()}`, {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load corporate events (${r.status})`);
        return r.json();
      })
      .then((data: unknown) => {
        if (cancelled) return;
        const res = data as CEResponse;
        const rawItems: CEItem[] = res.items ?? res.new_counterparties ?? (Array.isArray(data) ? data as CEItem[] : []);

        // Map sectors from target_counterparty._new_company into the top-level
        // sectors field that CorporateEventsTable expects, and normalise
        // other_counterparties so that counterparty_status is top-level (the
        // API nests it inside _counterparty_type) and id/name are promoted from
        // _new_company so CorporateEventsTable can populate Buyer/Investor/Seller.
        const items: CEItem[] = rawItems.map((ev) => {
          // ── sectors ──
          let sectors = ev.sectors;
          if (!sectors) {
            const tc = ev.target_counterparty as {
              _new_company?: {
                derived_primaries?: string[];
                secondary_sectors?: Array<{ sector_name?: string }>;
              };
            } | undefined;
            const primary = tc?._new_company?.derived_primaries ?? [];
            const secondary = (tc?._new_company?.secondary_sectors ?? [])
              .map((s) => s.sector_name)
              .filter((s): s is string => Boolean(s));
            sectors = { Primary: primary, Secondary: secondary };
          }

          // ── other_counterparties normalisation ──
          const rawCps = ev.other_counterparties as Array<Record<string, unknown>> | undefined;
          const normalizedOtherCps = rawCps?.map((cp) => {
            const counterpartyType = cp._counterparty_type as { counterparty_status?: string } | undefined;
            const newCompany = cp._new_company as { id?: number; name?: string; _is_that_investor?: boolean } | undefined;
            return {
              ...cp,
              counterparty_status: (cp.counterparty_status as string | undefined) ?? counterpartyType?.counterparty_status,
              id: (cp.id as number | undefined) ?? cp.new_company_counterparty as number | undefined ?? newCompany?.id,
              name: (cp.name as string | undefined) ?? newCompany?.name,
              _new_company: newCompany
                ? { ...newCompany }
                : cp._new_company,
            };
          });

          return {
            ...ev,
            sectors,
            ...(normalizedOtherCps ? { other_counterparties: normalizedOtherCps as CEItem["other_counterparties"] } : {}),
          };
        });

        setCeItems(items);
        setCePag({
          curPage: res.curPage ?? cePage,
          pageTotal: res.pageTotal ?? (items.length > 0 ? cePage : 0),
          nextPage: res.nextPage ?? null,
          prevPage: res.prevPage ?? null,
        });
        setCeLoading(false);
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setCeError(e.message);
          setCeLoading(false);
        }
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryKey, secondaryKey, cePage]);

  const prefix = view === "mean" ? "mean_" : "median_";
  const currencyInfo = SECTOR_CURRENCY_OPTIONS.find((c) => c.value === currency)!;

  const getVal = (row: SectorMetricRow, key: string): unknown => {
    const aliases = SECTOR_METRIC_ALIASES[key] ?? [key];
    for (const alias of aliases) {
      const v = row[`${prefix}${alias}`];
      if (v != null) return v;
    }
    return null;
  };

  const metricsWithLabel = SECTOR_ALL_METRICS.map((m) => ({
    ...m,
    label: m.format === "money_m"
      ? m.label.replace(/\(M\)/, `(${currencyInfo.symbol}M)`)
      : m.label,
  }));

  return (
    <>
    {/* Gate — shown while loading (null) or when count is 0 */}
    {hasContributed !== true && (
      <div style={{ position: "relative", borderRadius: "14px", overflow: "hidden" }}>

        {/* Real content, blurred underneath */}
        <div
          style={{
            filter: "blur(5px)",
            pointerEvents: "none",
            userSelect: "none",
            opacity: 0.55,
          }}
        >
          {/* Fake benchmark table header */}
          <div
            style={{
              background: "#fff",
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "18px 24px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "linear-gradient(180deg,#f8fafc 0%,#fff 100%)",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: "20px", color: "#0f172a", fontFamily: "Georgia,serif" }}>Sector Intelligence</div>
                <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                  Benchmark financial metrics by revenue range across your primary sectors.
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                {["Mean","Median"].map((l) => (
                  <div key={l} style={{ padding: "7px 16px", borderRadius: "7px", background: l==="Mean"?"#0f172a":"transparent", color: l==="Mean"?"#fff":"#64748b", fontSize: "13px", fontWeight: 600, border: "1.5px solid #e2e8f0" }}>{l}</div>
                ))}
                {["$","£","€"].map((s) => (
                  <div key={s} style={{ padding: "7px 14px", borderRadius: "7px", background: s==="$"?"#0f172a":"transparent", color: s==="$"?"#fff":"#64748b", fontSize: "14px", fontWeight: 600, border: "1.5px solid #e2e8f0" }}>{s}</div>
                ))}
              </div>
            </div>
            {/* fake rows */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  {["Revenue Range","Companies","Revenue ($M)","EBITDA ($M)","EV ($M)","EV/Rev","Rev Growth","EBITDA Margin","Rule of 40","ARR ($M)","NRR (%)","Churn (%)"].map((h) => (
                    <th key={h} style={{ padding: "9px 10px", fontWeight: 600, fontSize: "11px", color: "#475569", textAlign: "right", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[["<$10M","148","$3.8","-$0.2","$21.8","5.7x","36.5%","-8.1%","29.1%","$3.1","105%","9.4%"],
                  ["$10M–$50M","125","$23","$3.6","$154.8","6.4x","24.1%","14.4%","38.3%","$19.1","107%","7.4%"],
                  ["$50M–$100M","26","$72.6","$11.7","$731.1","9.9x","33%","15.7%","48.2%","$52.9","106%","6.9%"],
                  ["$100M–$250M","29","$150.8","$39.5","$1,084","6.8x","16.6%","25.4%","42.2%","$115.6","106%","6.9%"],
                  ["$250M–$500M","23","$346.2","$92.8","$2,149","6.4x","16.7%","27.4%","43.9%","$261","106%","6.9%"],
                  ["$500M+","26","$3,127","$1,127","$22,084","7x","14.6%","32.4%","42.3%","$2,192","105%","5.5%"],
                ].map((row, i) => (
                  <tr key={i} style={{ background: i%2===0?"#fff":"#fafafa" }}>
                    {row.map((cell, j) => (
                      <td key={j} style={{ padding: "10px 10px", textAlign: j===0?"left":"right", fontWeight: j===0?600:400, fontSize: "13px", borderBottom: "1px solid #f1f5f9" }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Fake CE section */}
          <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #e2e8f0", marginTop: "20px", overflow: "hidden" }}>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "linear-gradient(180deg,#f8fafc 0%,#fff 100%)" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "20px", color: "#0f172a", fontFamily: "Georgia,serif" }}>Corporate Events</div>
                <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>M&amp;A, venture investments and partnerships in your sector.</div>
              </div>
            </div>
            {[1,2,3,4].map((i) => (
              <div key={i} style={{ padding: "14px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", gap: "40px", alignItems: "center" }}>
                <div style={{ flex: 3, height: "14px", background: "#e2e8f0", borderRadius: "4px" }} />
                <div style={{ flex: 1, height: "14px", background: "#f1f5f9", borderRadius: "4px" }} />
                <div style={{ flex: 1, height: "22px", background: "#dbeafe", borderRadius: "99px", width: "80px" }} />
                <div style={{ flex: 2, height: "14px", background: "#f1f5f9", borderRadius: "4px" }} />
              </div>
            ))}
          </div>
        </div>

        {/* Gate card overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            background: "rgba(248,250,252,0.55)",
            backdropFilter: "blur(2px)",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
              padding: "36px 40px",
              maxWidth: "400px",
              width: "100%",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
            }}
          >
            {hasContributed === null ? (
              /* Loading spinner */
              <>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    border: "3px solid #e2e8f0",
                    borderTopColor: "#1d4ed8",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                <span style={{ fontSize: "13px", color: "#64748b" }}>Checking access…</span>
              </>
            ) : (
              <>
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "50%",
                    background: "linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2a5 5 0 0 1 5 5v2h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h1V7a5 5 0 0 1 5-5zm0 11a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm0-9a3 3 0 0 0-3 3v2h6V7a3 3 0 0 0-3-3z" fill="#1d4ed8"/>
                  </svg>
                </div>
                <div>
                  <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 700, color: "#0f172a", fontFamily: "Georgia,serif" }}>
                    Sector Intelligence Locked
                  </h3>
                  <p style={{ margin: 0, fontSize: "14px", color: "#64748b", lineHeight: 1.6 }}>
                    Contribute financial metrics for this company to unlock sector benchmarks and corporate events intelligence.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onGoToMetrics}
                  style={{
                    padding: "11px 28px",
                    background: "#0f172a",
                    color: "#fff",
                    border: "none",
                    borderRadius: "10px",
                    fontSize: "14px",
                    fontWeight: 700,
                    cursor: "pointer",
                    marginTop: "4px",
                    width: "100%",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#1d4ed8"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#0f172a"; }}
                >
                  Contribute Financial Metrics →
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )}

    {hasContributed && (<>
    <div
      style={{
        background: "#fff",
        borderRadius: "14px",
        border: "1px solid #e2e8f0",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
          background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "16px",
              fontWeight: 700,
              color: "#0f172a",
              fontFamily: "Georgia, serif",
            }}
          >
            Sector Intelligence
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
            Benchmark metrics by revenue range
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          {/* Mean / Median toggle */}
          <div
            style={{
              display: "inline-flex",
              border: "1.5px solid #e2e8f0",
              borderRadius: "8px",
              overflow: "hidden",
              background: "#f8fafc",
              padding: "2px",
              gap: "2px",
            }}
          >
            {(["mean", "median"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                style={{
                  padding: "5px 12px",
                  border: "none",
                  borderRadius: "6px",
                  background: view === v ? "#0f172a" : "transparent",
                  color: view === v ? "#ffffff" : "#64748b",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          {/* Currency toggle */}
          <div
            style={{
              display: "inline-flex",
              border: "1.5px solid #e2e8f0",
              borderRadius: "8px",
              overflow: "hidden",
              background: "#f8fafc",
              padding: "2px",
              gap: "2px",
            }}
          >
            {SECTOR_CURRENCY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCurrency(opt.value)}
                title={opt.label}
                style={{
                  padding: "5px 10px",
                  border: "none",
                  borderRadius: "6px",
                  background: currency === opt.value ? "#0f172a" : "transparent",
                  color: currency === opt.value ? "#ffffff" : "#64748b",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {opt.symbol}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ padding: "0" }}>
        {loading ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "60px 24px",
              gap: "12px",
            }}
          >
            <div
              style={{  
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                border: "3px solid #e2e8f0",
                borderTopColor: "#1d4ed8",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <span style={{ fontSize: "13px", color: "#64748b" }}>Loading sector data…</span>
          </div>
        ) : error ? (
          <div
            style={{
              margin: "24px",
              padding: "16px",
              borderRadius: "12px",
              background: "#fff1f2",
              border: "1px solid #fecaca",
              color: "#9f1239",
              fontSize: "13px",
            }}
          >
            <strong>Could not load data:</strong> {error}
          </div>
        ) : rows.length === 0 ? (
          <div
            style={{
              padding: "60px 24px",
              textAlign: "center",
              color: "#64748b",
              fontSize: "13px",
            }}
          >
            No data available.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "11px",
              }}
            >
              <thead>
                {/* Section headers */}
                <tr style={{ background: "#f1f5f9" }}>
                  <th
                    rowSpan={2}
                    style={{
                      padding: "6px 10px",
                      textAlign: "left",
                      fontWeight: 700,
                      color: "#0f172a",
                      borderBottom: "2px solid #e2e8f0",
                      borderRight: "2px solid #e2e8f0",
                      whiteSpace: "nowrap",
                      fontSize: "10px",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Revenue Range
                  </th>
                  <th
                    rowSpan={2}
                    style={{
                      padding: "6px 8px",
                      textAlign: "center",
                      fontWeight: 700,
                      color: "#0f172a",
                      borderBottom: "2px solid #e2e8f0",
                      borderRight: "2px solid #cbd5e1",
                      whiteSpace: "nowrap",
                      fontSize: "10px",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Number of companies
                  </th>
                  <th
                    colSpan={SECTOR_FIN_METRICS.length}
                    style={{
                      padding: "5px 8px",
                      textAlign: "center",
                      fontWeight: 700,
                      color: "#1d4ed8",
                      background: "#eff6ff",
                      borderBottom: "1px solid #bfdbfe",
                      borderRight: "2px solid #bfdbfe",
                      fontSize: "10px",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Financial Metrics
                  </th>
                  <th
                    colSpan={SECTOR_SUB_METRICS.length}
                    style={{
                      padding: "5px 8px",
                      textAlign: "center",
                      fontWeight: 700,
                      color: "#0f766e",
                      background: "#f0fdfa",
                      borderBottom: "1px solid #99f6e4",
                      fontSize: "10px",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Subscription Metrics
                  </th>
                </tr>
                {/* Column headers */}
                <tr style={{ background: "#f8fafc" }}>
                  {metricsWithLabel.map((m, i) => {
                    const isLastFin = i === SECTOR_FIN_METRICS.length - 1;
                    const isInSub = i >= SECTOR_FIN_METRICS.length;
                    return (
                      <th
                        key={m.key}
                        style={{
                          padding: "5px 6px",
                          textAlign: "right",
                          fontWeight: 600,
                          color: isInSub ? "#0f766e" : "#1d4ed8",
                          background: isInSub ? "#f0fdfa" : "#eff6ff",
                          borderBottom: "2px solid #e2e8f0",
                          borderRight: isLastFin ? "2px solid #bfdbfe" : undefined,
                          whiteSpace: "nowrap",
                          fontSize: "10px",
                          minWidth: "60px",
                        }}
                      >
                        {m.label}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr
                    key={`${row.revenue_range}-${idx}`}
                    style={{
                      background: idx % 2 === 0 ? "#ffffff" : "#fafafa",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.background = "#f0f9ff";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.background =
                        idx % 2 === 0 ? "#ffffff" : "#fafafa";
                    }}
                  >
                    <td
                      style={{
                        padding: "7px 10px",
                        fontWeight: 600,
                        color: "#0f172a",
                        borderBottom: "1px solid #f1f5f9",
                        borderRight: "2px solid #e2e8f0",
                        whiteSpace: "nowrap",
                        fontSize: "11px",
                      }}
                    >
                      {row.revenue_range}
                    </td>
                    <td
                      style={{
                        padding: "7px 8px",
                        textAlign: "center",
                        fontWeight: 500,
                        color: "#475569",
                        borderBottom: "1px solid #f1f5f9",
                        borderRight: "2px solid #cbd5e1",
                        fontSize: "11px",
                      }}
                    >
                      {Number.isFinite(row.num_companies)
                        ? row.num_companies.toLocaleString()
                        : "—"}
                    </td>
                    {metricsWithLabel.map((m, i) => {
                      const isLastFin = i === SECTOR_FIN_METRICS.length - 1;
                      const isInSub = i >= SECTOR_FIN_METRICS.length;
                      const val = getVal(row, m.key);
                      const formatted = sectorFormatValue(
                        val,
                        m.format,
                        currencyInfo.symbol,
                        fxRates,
                        currency
                      );
                      return (
                        <td
                          key={m.key}
                          style={{
                            padding: "7px 6px",
                            textAlign: "right",
                            color: formatted === "—" ? "#cbd5e1" : "#0f172a",
                            borderBottom: "1px solid #f1f5f9",
                            borderRight: isLastFin ? "2px solid #bfdbfe" : undefined,
                            fontVariantNumeric: "tabular-nums",
                            fontSize: "11px",
                            background: isInSub
                              ? "rgba(240,253,250,0.3)"
                              : "rgba(239,246,255,0.3)",
                          }}
                        >
                          {formatted}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            <div
              style={{
                padding: "8px 12px",
                borderTop: "1px solid #f1f5f9",
                fontSize: "10px",
                color: "#94a3b8",
                display: "flex",
                gap: "8px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <span>
                Monetary values in <strong>{currencyInfo.symbol}M</strong>.{" "}
                {view === "mean" ? "Mean" : "Median"} values shown.
              </span>
              {currency !== "USD" && fxRates && (
                <span>
                  · 1 USD ≈ {fxRates[currency]?.toFixed(4)} {currency}
                </span>
              )}
              {!fxRates && currency !== "USD" && (
                <span style={{ color: "#f59e0b" }}>
                  · FX rates unavailable — showing USD values
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>

    {/* ── Corporate Events ── */}
    <div style={{ marginTop: "20px" }}>
      <CorporateEventsSection
        title="Corporate Events"
        events={ceItems as CorporateEvent[]}
        loading={ceLoading}
        showSectors={true}
        primarySectors={primarySectorIds.map((id, i) => ({
          sector_id: id,
          sector_name: primarySectorNames?.[i] ?? "",
          Sector_importance: "Primary",
        }))}
        secondarySectors={[]}
        maxInitialEvents={CE_PER_PAGE}
        truncateDescriptionLength={180}
        titleStyle={{ fontSize: "20px", fontFamily: "Georgia, serif", fontWeight: 700, color: "#0f172a" }}
      />
      {!ceLoading && !ceError && cePag.pageTotal > 1 && (
        <div
          style={{
            marginTop: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>
            Page {cePag.curPage} of {cePag.pageTotal}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
            {cePaginationButtons(
              cePag.curPage,
              cePag.pageTotal,
              cePag.nextPage,
              cePag.prevPage,
              setCePage
            )}
          </div>
        </div>
      )}
    </div>
    </>)}
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────

// Main Company Detail Component
function MarketLandscapeCard({
  peers,
  acquirers,
  loading,
}: {
  peers: SearchCompanyOption[];
  acquirers: SearchCompanyOption[];
  loading: boolean;
}) {
  const PREVIEW_COUNT = 5;
  const [showAll, setShowAll] = useState(false);

  const visiblePeers = showAll ? peers : peers.slice(0, PREVIEW_COUNT);
  const visibleAcquirers = showAll ? acquirers : acquirers.slice(0, PREVIEW_COUNT);
  const hasMore = peers.length > PREVIEW_COUNT || acquirers.length > PREVIEW_COUNT;
  const rowCount = Math.max(visiblePeers.length, visibleAcquirers.length);

  const itemStyle: React.CSSProperties = {
    display: "block",
    padding: "8px 14px",
    background: "#eef2fb",
    borderRadius: "6px",
    fontSize: "13px",
    color: "#1d4ed8",
    fontWeight: 500,
    width: "100%",
    boxSizing: "border-box",
  };

  const colHeaderStyle: React.CSSProperties = {
    fontSize: "12px",
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    paddingBottom: "8px",
    borderBottom: "1px solid #e2e8f0",
  };

  return (
    <div
      style={{
        padding: "20px",
        backgroundColor: "#fff",
        borderRadius: "10px",
        border: "1px solid #e2e8f0",
      }}
    >
      <div style={{ fontSize: "18px", fontWeight: 700, color: "#0f172a", marginBottom: "16px" }}>
        Market Landscape
      </div>

      {loading && peers.length === 0 && acquirers.length === 0 ? (
        <div style={{ fontSize: "13px", color: "#94a3b8" }}>Loading…</div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px 20px",
              padding: "16px",
              background: "#f8fafc",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={colHeaderStyle}>Peers &amp; Competitors</div>
            <div style={colHeaderStyle}>Potential Acquirers</div>

            {Array.from({ length: rowCount }).map((_, i) => (
              <React.Fragment key={i}>
                <div>{visiblePeers[i] ? <span style={itemStyle}>{visiblePeers[i].label}</span> : null}</div>
                <div>{visibleAcquirers[i] ? <span style={itemStyle}>{visibleAcquirers[i].label}</span> : null}</div>
              </React.Fragment>
            ))}
          </div>

          {hasMore && (
            <div style={{ textAlign: "center", marginTop: "14px" }}>
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#1d4ed8",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                {showAll ? "Show less" : "See more"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const CompanyDetail = () => {
  const params = useParams();
  const companyId = params.companyId as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldOpenReview = searchParams.get("review") === "1";
  const authToken = authService.getAuthToken();
  const isPublicContributorSession =
    !authToken || isTokenExpired(authToken);
  const isAdminSession = isAdminUser(authService.getUser());

  useEffect(() => {
    if (isPublicContributorSession) return;

    const user = authService.getUser();
    if (user && isAdminUser(user)) return;

    const boundCompanyId = contributorAccessService.getCompanyId();
    if (boundCompanyId != null && String(boundCompanyId) !== String(companyId)) {
      router.replace(`/contributor-crm/${boundCompanyId}`);
    }
  }, [companyId, isPublicContributorSession, router]);

  const [company, setCompany] = useState<Company | null>(null);
  /** Label from get_company_transaction_status (authoritative when set). */
  const [transactionStatusApiLabel, setTransactionStatusApiLabel] =
    useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<number>>(
    new Set()
  );

  const [isMobile, setIsMobile] = useState(false);
  const [showAllPrimarySectors, setShowAllPrimarySectors] = useState(false);
  const [showAllSecondarySectors, setShowAllSecondarySectors] = useState(false);
  const [corporateEvents, setCorporateEvents] = useState<
    CompanyCorporateEvent[]
  >([]);
  const [corporateEventsLoading, setCorporateEventsLoading] = useState(true);
  const [showAllSubsidiaries, setShowAllSubsidiaries] = useState(false);
  const [companyArticles, setCompanyArticles] = useState<ContentArticle[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [exportingPdfId, setExportingPdfId] = useState<number | null>(null);
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
  /** First row from GET get_company_competitors — API keys peers_and_competitors / potential_acquirers / acquisition_targets */
  const [companyCompetitorsPreload, setCompanyCompetitorsPreload] = useState<{
    peers_and_competitors?: unknown;
    potential_acquirers?: unknown;
    acquisition_targets?: unknown;
  } | null>(null);
  const [competitorsPreloadLoading, setCompetitorsPreloadLoading] = useState(false);
  const [showSuggestChangeForm, setShowSuggestChangeForm] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isDescriptionExpandable, setIsDescriptionExpandable] = useState(false);
  const [activeTab, setActiveTab] = useState<ContributorTabKey>(
    "contribute-financial-metrics"
  );
  const [contributorYears, setContributorYears] = useState<ContributorYearItem[]>(
    []
  );
  const [selectedContributionYearId, setSelectedContributionYearId] =
    useState<number | null>(null);
  const [existingMetricsByYearId, setExistingMetricsByYearId] = useState<
    Record<number, Record<string, string>>
  >({});
  const [rawExistingMetricsByYearId, setRawExistingMetricsByYearId] = useState<
    Record<number, Record<string, unknown>>
  >({});
  const [loadingContributionYearId, setLoadingContributionYearId] = useState<
    number | null
  >(null);
  const [hasUserSelectedContributionYear, setHasUserSelectedContributionYear] =
    useState(false);
  const [loadedContributionYearIds, setLoadedContributionYearIds] = useState<
    number[]
  >([]);
  const descriptionRef = useRef<HTMLDivElement | null>(null);

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


  const toggleDescription = (subsidiaryId: number) => {
    setExpandedDescriptions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(subsidiaryId)) {
        newSet.delete(subsidiaryId);
      } else {
        newSet.add(subsidiaryId);
      }
      return newSet;
    });
  };

  // Fetch company with intelligent fallbacks (GET first, then POST with common payload keys)
  const requestCompany = useCallback(
    async (id: string): Promise<CompanyResponse> => {
      const token = localStorage.getItem("outreach_crm_auth_token");
      if (!token) {
        return (await fetchPublicContributorCompany(id)) as CompanyResponse;
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
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

  const handleExportArticlePdf = useCallback(
    async (article: ContentArticle) => {
      if (exportingPdfId !== null) return;
      setExportingPdfId(article.id);
      try {
        const articleAny = article as ContentArticle & {
          Company_of_Focus?: unknown;
          Related_Corporate_Event?: unknown[];
          sectors?: Array<
            | { id?: number; sector_name?: string; Sector_importance?: string }
            | Array<{ id?: number; sector_name?: string; Sector_importance?: string }>
          >;
        };
        const ct = (articleAny.Content_Type || "").trim();
        const cof = articleAny.Company_of_Focus;
        const hasCompanyOfFocus =
          typeof cof === "string"
            ? cof
            : cof && typeof cof === "object"
            ? (cof as { name?: string }).name || ""
            : "";
        const parsedSummary = articleAny.summary || "";
        const companies = Array.isArray(articleAny.companies_mentioned)
          ? articleAny.companies_mentioned
          : [];
        const rawSectors = Array.isArray(articleAny.sectors) ? articleAny.sectors : [];
        const sectors: Array<{
          id?: number;
          sector_name?: string;
          Sector_importance?: string;
        }> = rawSectors.flatMap((s) => (Array.isArray(s) ? s : [s]));
        const relatedEvents = Array.isArray(articleAny.Related_Corporate_Event)
          ? articleAny.Related_Corporate_Event
          : [];

        const payload = {
          id: articleAny.id,
          Headline: articleAny.Headline || "",
          Strapline: articleAny.Strapline || undefined,
          Publication_Date: articleAny.Publication_Date || "",
          Transaction_status:
            (articleAny as unknown as { Transaction_status?: string })
              .Transaction_status || undefined,
          Content_Type: ct,
          Company_of_Focus: hasCompanyOfFocus,
          summary: parsedSummary,
          Body: articleAny.Body || "",
          companies_mentioned: companies
            .map((c) => ({ id: c?.id, name: c?.name }))
            .filter((c) => (c?.name || "").trim()),
          sectors: sectors
            .map((s) => ({
              id: getSectorId(s),
              sector_name: s?.sector_name,
              Sector_importance: s?.Sector_importance,
            }))
            .filter((s) => (s.sector_name || "").trim()),
          Related_Corporate_Event: relatedEvents.map((e: unknown) => ({
            ...(e as Record<string, unknown>),
          })),
        };

        const endpoint =
          process.env.NEXT_PUBLIC_PDF_SERVICE_URL ||
          "https://asymmetrix-pdf-service.fly.dev/api/export-article-pdf";

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          throw new Error(`PDF export failed: ${res.status} ${errText}`);
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(article.Headline || "article").replace(/[^a-zA-Z0-9 _-]/g, "").slice(0, 80)}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("PDF export error:", err);
        alert(
          err instanceof Error
            ? err.message
            : "Failed to export PDF. Please try again."
        );
      } finally {
        setExportingPdfId(null);
      }
    },
    [exportingPdfId, getSectorId]
  );

  // Fetch financial metrics (auth required) with GET + POST fallbacks
  const fetchFinancialMetrics = useCallback(async (id: string | number) => {
    try {
      const token = localStorage.getItem("outreach_crm_auth_token");
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
      const token = localStorage.getItem("outreach_crm_auth_token");
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

  const fetchContributorYears = useCallback(async () => {
    try {
      const maxSelectableYear = new Date().getFullYear() + 1;
      const years = await getContributorYears();
      const filtered = years
        .filter((year) => {
          const numericYear = extractValidYear(year.Year);
          return numericYear !== null && numericYear <= maxSelectableYear;
        })
        .sort(
          (a, b) =>
            (extractValidYear(b.Year) ?? 0) - (extractValidYear(a.Year) ?? 0)
        );

      setContributorYears(filtered);
      setSelectedContributionYearId((current) => {
        if (current != null) return current;
        const currentYear = new Date().getFullYear();
        const defaultYear =
          filtered.find(
            (year) => extractValidYear(year.Year) === currentYear
          ) ?? filtered[0];
        return defaultYear?.id ?? null;
      });
    } catch (err) {
      console.error("Error fetching contributor years:", err);
      setContributorYears([]);
    }
  }, []);

  const fetchContributorMetricsForYear = useCallback(
    async (yearId: number, newRecord: boolean) => {
      const newCompanyId = Number(companyId);
      if (!Number.isFinite(newCompanyId)) return;
      setLoadingContributionYearId(yearId);
      try {
        const token = localStorage.getItem("outreach_crm_auth_token");
        const payload = await getContributorMetricsByCompany(
          newCompanyId,
          yearId,
          token,
          newRecord
        );
        if (payload && typeof payload === "object") {
          setRawExistingMetricsByYearId((prev) => ({
            ...prev,
            [yearId]: payload,
          }));
        } else {
          setRawExistingMetricsByYearId((prev) => {
            const next = { ...prev };
            delete next[yearId];
            return next;
          });
        }
        const mapped = mapContributorMetricsToFormValues(payload);
        const hasValues = Object.values(mapped).some((value) => value !== "");
        if (hasValues) {
          setExistingMetricsByYearId((prev) => ({ ...prev, [yearId]: mapped }));
        } else {
          setExistingMetricsByYearId((prev) => {
            const next = { ...prev };
            delete next[yearId];
            return next;
          });
        }
      } catch (err) {
        console.error("Error fetching contributor metrics:", err);
      } finally {
        setLoadedContributionYearIds((prev) =>
          prev.includes(yearId) ? prev : [...prev, yearId]
        );
        setLoadingContributionYearId((current) =>
          current === yearId ? null : current
        );
      }
    },
    [companyId]
  );

  useEffect(() => {
    const fetchCompanyData = async () => {
      setLoading(true);
      setError(null);
      setTransactionStatusApiLabel("");

      try {
        let data: CompanyResponse;
        try {
          data = await requestCompany(companyId);
        } catch (apiErr) {
          const msg = apiErr instanceof Error ? apiErr.message : String(apiErr);
          if (msg.includes("404")) {
            throw new Error("Company not found");
          }
          if (isAuthenticationErrorMessage(msg)) {
            setCompany(createMinimalContributorCompany(companyId));
            setCorporateEventsLoading(false);
            setLoading(false);
            return;
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
              .Revenue_Model_ || data.Company?.Revenue_Model_,
          Lifecycle_stage:
            data.Company?.Lifecycle_stage ||
            (data as unknown as { Lifecycle_stage?: LifecycleStage })
              .Lifecycle_stage ||
            undefined,
          Transaction_Status:
            data.Company?.Transaction_Status ??
            (data as unknown as { Transaction_Status?: Company["Transaction_Status"] })
              .Transaction_Status ??
            undefined,
          peers_competitors:
            data.peers_competitors ?? data.Company.peers_competitors,
          potential_acquirers:
            data.potential_acquirers ?? data.Company.potential_acquirers,
          acquisition_targets:
            data.acquisition_targets ?? data.Company.acquisition_targets,
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
          const tid = Number(enrichedCompany.id);
          if (Number.isFinite(tid)) {
            const token = localStorage.getItem("outreach_crm_auth_token");
            void getCompanyTransactionStatusLabel(tid, token)
              .then(setTransactionStatusApiLabel)
              .catch(() => setTransactionStatusApiLabel(""));
          }
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch company data";

        if (isAuthenticationErrorMessage(message)) {
          setCompany(createMinimalContributorCompany(companyId));
          setLoading(false);
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
    }
  }, [
    companyId,
    fetchCompanyArticles,
    fetchContributorMetricsForYear,
    fetchContributorYears,
    requestCompany,
    fetchFinancialMetrics,
    fetchCompanyInvestors,
    router,
    shouldOpenReview,
  ]);

  useEffect(() => {
    if (isPublicContributorSession) return;
    if (!shouldOpenReview) return;
    if (loading || !company) return;
    setShowSuggestChangeForm(true);
    setActiveTab("company-profile");
  }, [company, isPublicContributorSession, loading, shouldOpenReview]);

  // Preload peers / acquirers / targets from dedicated endpoint when not on main company payload
  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    setCompetitorsPreloadLoading(true);
    setCompanyCompetitorsPreload(null);

    const run = async () => {
      try {
        const token = localStorage.getItem("outreach_crm_auth_token");
        const headers: Record<string, string> = {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
        const params = new URLSearchParams();
        params.set("new_company_id", String(companyId));
        const url = `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/get_company_competitors?${params.toString()}`;
        const res = await fetch(url, {
          method: "GET",
          headers,
          credentials: "include",
        });
        if (cancelled) return;
        if (!res.ok) {
          setCompanyCompetitorsPreload(null);
          return;
        }
        const data: unknown = await res.json();
        const row =
          Array.isArray(data) && data.length > 0 && data[0] && typeof data[0] === "object"
            ? (data[0] as Record<string, unknown>)
            : null;
        if (!row) {
          setCompanyCompetitorsPreload(null);
          return;
        }
        setCompanyCompetitorsPreload({
          peers_and_competitors: row.peers_and_competitors,
          potential_acquirers: row.potential_acquirers,
          acquisition_targets: row.acquisition_targets,
        });
      } catch {
        if (!cancelled) setCompanyCompetitorsPreload(null);
      } finally {
        if (!cancelled) setCompetitorsPreloadLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    void fetchContributorYears();
  }, [companyId, fetchContributorYears]);

  useEffect(() => {
    if (selectedContributionYearId == null) return;
    const newRecord = hasUserSelectedContributionYear;
    void fetchContributorMetricsForYear(selectedContributionYearId, newRecord);
  }, [
    fetchContributorMetricsForYear,
    hasUserSelectedContributionYear,
    selectedContributionYearId,
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

      const collapsedHeight = lineHeight * 3;
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

  // Handle PDF export (ported from develop)
  const handleExportPdf = useCallback(async () => {
    if (!company?.id) {
      console.error("Company ID not available");
      return;
    }

    try {
      setExportingPdf(true);
      const token = localStorage.getItem("outreach_crm_auth_token");
      const response = await fetch(
        "https://asymmetrix-pdf-service.fly.dev/api/export-company-pdf",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ company_id: company.id, source: "contributor" }),
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
      const filename = `Asymmetrix ${companyName} Company Profile.pdf`;

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
    }
  }, [company?.id, company?.name]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9fafb]">
        <div style={{ padding: "40px", textAlign: "center" }}>
          <div style={{ fontSize: "18px", color: "#666" }}>
            Loading company data...
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: "#9ca3af" }}>
            If this takes more than a few seconds, please refresh.
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f9fafb]">
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
                <span
                  style={{
                    color: "#0075df",
                    fontSize: "16px",
                  }}
                >
                  ← Back to Companies
                </span>
              </div>
            ) : (
              <div>
                <h1 style={{ fontSize: "24px", marginBottom: "16px" }}>
                  Error Loading Company
                </h1>
                <p style={{ marginBottom: "24px" }}>{error}</p>
                <span
                  style={{
                    color: "#0075df",
                    fontSize: "16px",
                  }}
                >
                  ← Back to Companies
                </span>
              </div>
            )}
          </div>
        </div>
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

  // Determine if there is management data to display
  const hasCurrentManagement = Boolean(
    company.Managmant_Roles_current && company.Managmant_Roles_current.length > 0
  );
  const hasPastManagement = Boolean(
    company.Managmant_Roles_past && company.Managmant_Roles_past.length > 0
  );
  const hasManagement = hasCurrentManagement || hasPastManagement;

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
      value:
        getNumeric(item?.pc_of_revenues) !== undefined
          ? `${Math.round(getNumeric(item?.pc_of_revenues) || 0)}%`
          : "Not available",
    }))
    .filter((item) => item.label);

  const dataCollectionMethodRows =
    parseStructuredArray<CompanyDataCollectionMethodItem>(
      company.Data_Collection_Method
    )
      .map((item) => ({
        label: String(item?.Data_Collection_Method || "").trim(),
        value: String(item?.Predominance || "").trim() || "Not available",
      }))
      .filter((item) => item.label);

  const revenueModelRows = parseStructuredArray<CompanyRevenueModelItem>(
    company.Revenue_Model_
  )
    .map((item) => ({
      label: String(item?.Revenue_Model_ || "").trim(),
      value: String(item?.Predominance || "").trim() || "Not available",
    }))
    .filter((item) => item.label);

  const companyAttributeSections = [
    {
      title: "Product Type",
      valueHeader: "% of revenue",
      rows: productTypeRows,
    },
    {
      title: "Data Collection Method",
      valueHeader: "Predominance",
      rows: dataCollectionMethodRows,
    },
    {
      title: "Revenue Model",
      valueHeader: "Predominance",
      rows: revenueModelRows,
    },
  ].filter((section) => section.rows.length > 0);

  const validApiInvestors = apiInvestors.filter(
    (investor) =>
      investor &&
      typeof investor.investor_id === "number" &&
      investor.investor_name
  );

  const investorsDisplayText = (() => {
    if (apiInvestorsLoading) {
      return "Loading...";
    }
    if (validApiInvestors.length > 0) {
      const names = validApiInvestors
        .map((investor) => investor.investor_name.trim())
        .filter(Boolean);
      if (names.length > 0) {
        return names.join(", ");
      }
    }
    return "Not available";
  })();

  const peersCompetitorsOptions = parseCompanyRelationList(
    pickRelationListWithPreload(
      company.peers_competitors,
      companyCompetitorsPreload?.peers_and_competitors
    )
  );
  const potentialAcquirersOptions = parseCompanyRelationList(
    pickRelationListWithPreload(
      company.potential_acquirers,
      companyCompetitorsPreload?.potential_acquirers
    )
  );
  const acquisitionTargetsOptions = parseCompanyRelationList(
    pickRelationListWithPreload(
      company.acquisition_targets,
      companyCompetitorsPreload?.acquisition_targets
    )
  );

  const parentCompanyDisplay = (() => {
    if (
      company.have_parent_company?.have_parent_companies &&
      Array.isArray(company.have_parent_company?.Parant_companies) &&
      company.have_parent_company.Parant_companies!.length > 0
    ) {
      const parent = company.have_parent_company.Parant_companies![0];
      return (parent?.name || "").trim() || "Not available";
    }
    return "Not available";
  })();

  const parentCompanyId = (() => {
    if (
      company.have_parent_company?.have_parent_companies &&
      Array.isArray(company.have_parent_company?.Parant_companies) &&
      company.have_parent_company.Parant_companies!.length > 0
    ) {
      const parent = company.have_parent_company.Parant_companies![0];
      return parent?.id != null ? String(parent.id) : "";
    }
    return "";
  })();

  const suggestChangeCurrentValues: SuggestChangeCurrentValues = {
    primarySectors:
      augmentedPrimarySectors
        .map((sector) => sector?.sector_name?.trim())
        .filter(Boolean)
        .join(", ") || "Not available",
    secondarySectors:
      secondarySectors
        .map((sector) => sector?.sector_name?.trim())
        .filter(Boolean)
        .join(", ") || "Not available",
    yearFounded: getYearFoundedDisplay(company),
    website: company.url || "Not available",
    ownership: company._ownership_type?.ownership || "Not available",
    hq: fullAddress || "Not available",
    lifecycleStage: company.Lifecycle_stage?.Lifecycle_Stage || "Not available",
    transactionStatus:
      resolveTransactionStatusDisplay(transactionStatusApiLabel, company) ||
      "Not available",
    investors: investorsDisplayText,
    investorCompanies: validApiInvestors.map((investor) => ({
      id: String(investor.investor_id),
      label: investor.investor_name.trim(),
    })),
    peersCompetitors: relationCompaniesDisplayText(peersCompetitorsOptions),
    peersCompetitorCompanies: peersCompetitorsOptions,
    potentialAcquirers: relationCompaniesDisplayText(potentialAcquirersOptions),
    potentialAcquirerCompanies: potentialAcquirersOptions,
    acquisitionTargets: relationCompaniesDisplayText(acquisitionTargetsOptions),
    acquisitionTargetCompanies: acquisitionTargetsOptions,
    description: company.description || "Not available",
    parentCompany: parentCompanyDisplay,
    parentCompanyId,
    managementPeople: [
      ...(company.Managmant_Roles_current || []).map((person) => ({
        localId: `current-${person.id}`,
        name: person.Individual_text || "",
        roles: getManagementJobTitleStrings(person.job_titles_id),
        status: "Current" as const,
        location: "",
        bio: "",
        linkedinUrl: "",
        companyProfileUrl: "",
      })),
      ...(company.Managmant_Roles_past || []).map((person) => ({
        localId: `past-${person.id}`,
        name: person.Individual_text || "",
        roles: getManagementJobTitleStrings(person.job_titles_id),
        status: "Past" as const,
        location: "",
        bio: "",
        linkedinUrl: "",
        companyProfileUrl: "",
      })),
    ].map((person) => ({
      ...person,
      roles: person.roles.length > 0 ? person.roles : [""],
    })),
    subsidiaries: (
      company.have_subsidiaries_companies?.Subsidiaries_companies || []
    ).map((subsidiary, index) => ({
      localId: `subsidiary-${subsidiary.id ?? index}`,
      name: subsidiary.name || "",
      companyId: subsidiary.id != null ? String(subsidiary.id) : "",
      description: subsidiary.description || "",
      sectors:
        (subsidiary.sectors_id || [])
          .map((sector) => sector?.sector_name || "")
          .filter(Boolean) || [],
      linkedinMembers:
        subsidiary._linkedin_data_of_new_company?.linkedin_employee != null
          ? String(subsidiary._linkedin_data_of_new_company.linkedin_employee)
          : "",
      country: subsidiary._locations?.Country || "",
    })).map((subsidiary) => ({
      ...subsidiary,
      sectors: subsidiary.sectors.length > 0 ? subsidiary.sectors : [""],
    })),
    corporateEvents:
      corporateEvents.length > 0
        ? corporateEvents.map((event, index) => {
            const newEvent = event as NewCorporateEvent;
            const targetCounterparties = newEvent.targets || [];
            const buyerCounterparties = newEvent.buyers || [];
            const sellerCounterparties = newEvent.sellers || [];
            const investorCounterparties = newEvent.investors || [];
            const legacyCounterparties = newEvent.buyers_investors || [];
            const otherCounterparties = newEvent.other_counterparties || [];

            const mappedCounterparties: SuggestCounterparty[] = [
              ...targetCounterparties.map((item, counterpartyIndex) => ({
                localId: `event-${event.id ?? index}-target-${counterpartyIndex}`,
                companyName: item.name || "",
                companyId: item.id != null ? String(item.id) : "",
                roleType: "Target",
                websiteUrl: "",
                linkedinUrl: "",
                pressReleaseUrl: item.counterparty_announcement_url || "",
                individuals: [],
              })),
              ...buyerCounterparties.map((item, counterpartyIndex) => ({
                localId: `event-${event.id ?? index}-buyer-${counterpartyIndex}`,
                companyName: item.name || "",
                companyId: item.id != null ? String(item.id) : "",
                roleType: "Buyer",
                websiteUrl: "",
                linkedinUrl: "",
                pressReleaseUrl: item.counterparty_announcement_url || "",
                individuals: [],
              })),
              ...sellerCounterparties.map((item, counterpartyIndex) => ({
                localId: `event-${event.id ?? index}-seller-${counterpartyIndex}`,
                companyName: item.name || "",
                companyId: item.id != null ? String(item.id) : "",
                roleType: "Seller",
                websiteUrl: "",
                linkedinUrl: "",
                pressReleaseUrl: item.counterparty_announcement_url || "",
                individuals: [],
              })),
              ...investorCounterparties.map((item, counterpartyIndex) => ({
                localId: `event-${event.id ?? index}-investor-${counterpartyIndex}`,
                companyName: item.name || "",
                companyId: item.id != null ? String(item.id) : "",
                roleType: "Investor",
                websiteUrl: "",
                linkedinUrl: "",
                pressReleaseUrl: item.counterparty_announcement_url || "",
                individuals: [],
              })),
              ...legacyCounterparties.map((item, counterpartyIndex) => ({
                localId: `event-${event.id ?? index}-legacy-${counterpartyIndex}`,
                companyName: item.name || "",
                companyId: item.id != null ? String(item.id) : "",
                roleType: "Counterparty",
                websiteUrl: "",
                linkedinUrl: "",
                pressReleaseUrl: item.counterparty_announcement_url || "",
                individuals: [],
              })),
              ...otherCounterparties.map((item, counterpartyIndex) => ({
                localId: `event-${event.id ?? index}-other-${counterpartyIndex}`,
                companyName: item.name || "",
                companyId: item.id != null ? String(item.id) : "",
                roleType: item.counterparty_status || "Counterparty",
                websiteUrl: "",
                linkedinUrl: "",
                pressReleaseUrl: item.counterparty_announcement_url || "",
                individuals: [],
              })),
            ].filter((counterparty) => Boolean(counterparty.companyName));

            return {
              localId: `event-${event.id ?? index}`,
              title: newEvent.target_label || event.description || "",
              announcementDate: event.announcement_date || "",
              closedDate: "",
              dealType: event.deal_type || "",
              dealStatus: "",
              amountMillions: "",
              currency: "",
              fundingStage: "",
              amountSourceUrl: "",
              sourceUrl: "",
              longDescription: event.description || "",
              counterparties:
                mappedCounterparties.length > 0
                  ? mappedCounterparties
                  : [createEmptyCounterparty()],
            };
          })
        : [],
    productType: parseStructuredArray<CompanyProductTypeItem>(company.Product_Type).filter(
      (item) => String(item?.Product_Type || "").trim()
    ),
    dataCollectionMethod: parseStructuredArray<CompanyDataCollectionMethodItem>(
      company.Data_Collection_Method
    ).filter((item) => String(item?.Data_Collection_Method || "").trim()),
    revenueModel: parseStructuredArray<CompanyRevenueModelItem>(company.Revenue_Model_).filter(
      (item) => String(item?.Revenue_Model_ || "").trim()
    ),
  };

  const styles = {
    container: {
      backgroundColor: "#f9fafb",
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column" as const,
    },
    maxWidth: {
      width: "100%",
      maxWidth: "100%",
      padding: "24px",
      flex: "1",
      display: "flex",
      flexDirection: "column" as const,
      overflow: "hidden",
    },
    header: {
      backgroundColor: "white",
      borderRadius: "12px",
      padding: "24px 24px",
      marginBottom: "24px",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
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
      fontSize: "28px",
      fontWeight: "700",
      color: "#1a202c",
      margin: "0",
    },
    formerName: {
      marginTop: "4px",
      fontSize: "14px",
      color: "#4a5568",
    },
    headerRight: {
      display: "flex",
      alignItems: "center",
      gap: "16px",
    },
    scoreBadge: {
      backgroundColor: "#f7fafc",
      color: "#4a5568",
      padding: "8px 16px",
      borderRadius: "20px",
      fontSize: "14px",
      fontWeight: "500",
    },
    reportButton: {
      backgroundColor: "#38a169",
      color: "white",
      border: "none",
      padding: "8px 16px",
      borderRadius: "6px",
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer",
      textDecoration: "none",
    },

    card: {
      backgroundColor: "white",
      borderRadius: "12px",
      padding: "24px 20px",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
      // Important for CSS grid: allow cards to shrink so inner overflow containers can scroll
      minWidth: 0,
    },
    sectionTitle: {
      fontSize: "20px",
      fontWeight: "600",
      color: "#1a202c",
      marginBottom: "24px",
      marginTop: "0",
    },
    infoRow: {
      display: "grid",
      gridTemplateColumns: "minmax(180px, 220px) 1fr auto",
      columnGap: "4px",
      alignItems: "center",
      padding: "10px 0",
      borderBottom: "1px solid #e2e8f0",
    },
    infoRowLast: {
      display: "grid",
      gridTemplateColumns: "minmax(180px, 220px) 1fr",
      columnGap: "4px",
      alignItems: "flex-start",
      padding: "10px 0",
      borderBottom: "none",
    },
    label: {
      fontSize: "14px",
      color: "#4a5568",
      fontWeight: "500",
      width: "220px",
    },
    value: {
      fontSize: "14px",
      color: "#1a202c",
      fontWeight: "400",
      textAlign: "left" as const,
      marginLeft: "0",
      wordBreak: "break-word" as const,
      overflowWrap: "break-word" as const,
    },
    sourceValue: {
      fontSize: "12px",
      color: "#9ca3af",
      textAlign: "right" as const,
      whiteSpace: "nowrap" as const,
      paddingLeft: "8px",
    },
    link: {
      color: "#0075df",
      textDecoration: "underline",
      cursor: "pointer",
    },
    description: {
      fontSize: "14px",
      color: "#1a202c",
      lineHeight: "1.6",
      marginTop: "16px",
    },
    chartContainer: {
      marginTop: "24px",
      overflow: "hidden",
    },
    chartTitle: {
      fontSize: "16px",
      fontWeight: "600",
      color: "#1a202c",
      marginBottom: "16px",
    },
    currentCount: {
      fontSize: "24px",
      fontWeight: "700",
      color: "#0075df",
      marginBottom: "16px",
    },
    linkedinLink: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      color: "#0075df",
      textDecoration: "none",
      fontSize: "14px",
      fontWeight: "500",
    },
    tagContainer: {
      display: "flex",
      flexWrap: "wrap" as const,
      gap: "6px",
      marginTop: "4px",
    },
    sectorTag: {
      backgroundColor: "#f3e5f5",
      color: "#7b1fa2",
      padding: "4px 8px",
      borderRadius: "4px",
      fontSize: "12px",
      fontWeight: "500",
      cursor: "pointer",
      transition: "background-color 0.2s ease",
      textDecoration: "none",
      display: "inline-block",
    },
    companyTag: {
      backgroundColor: "#e8f5e8",
      color: "#2e7d32",
      padding: "4px 8px",
      borderRadius: "4px",
      fontSize: "12px",
      fontWeight: "500",
      cursor: "pointer",
      transition: "background-color 0.2s ease",
      textDecoration: "none",
      display: "inline-block",
    },
    responsiveGrid: {
      display: "grid",
      // Allow grid children to shrink and prevent wide tables from pushing/clipping the right column
      gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
      gap: "24px",
      flex: "1",
      maxWidth: "100%",
      overflow: "hidden",
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
        padding: "16px 4px",
      },
      card: {
        padding: "14px 12px",
      },
      companyName: {
        fontSize: "22px",
        lineHeight: "1.3",
      },
      formerName: {
        fontSize: "12px",
      },
      sectionTitle: {
        fontSize: "17px",
        marginBottom: "12px",
      },
      infoRow: {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "2px",
        padding: "8px 0",
        width: "100%",
      },
      label: {
        fontSize: "12px",
        color: "#718096",
        fontWeight: "600",
        minWidth: "auto",
        marginBottom: "2px",
      },
      value: {
        fontSize: "13px",
        textAlign: "left",
        marginLeft: "0",
        lineHeight: "1.35",
        wordBreak: "break-word" as const,
        overflowWrap: "break-word" as const,
        width: "100%",
      },
      description: {
        fontSize: "13px",
        lineHeight: "1.5",
        marginTop: "8px",
      },
      chartTitle: {
        fontSize: "15px",
        marginBottom: "12px",
      },
      currentCount: {
        fontSize: "20px",
        marginBottom: "12px",
      },

      scoreBadge: {
        fontSize: "12px",
        padding: "6px 12px",
      },
      reportButton: {
        fontSize: "12px",
        padding: "6px 12px",
      },
      linkedinLink: {
        fontSize: "13px",
        justifyContent: "center",
        padding: "12px",
        backgroundColor: "#f7fafc",
        borderRadius: "8px",
        width: "100%",
      },
      // Hide chart in desktop financial metrics on mobile
      chartContainer: {
        marginTop: "20px",
        overflow: "hidden",
        padding: "0 8px",
        width: "100%",
        display: "none", // Hide on mobile by default
      },
      // Show mobile chart section on mobile
      mobileChartSection: {
        display: "block",
      },
    },
  };

  const responsiveCss = `
    .company-detail-page { overflow-x: hidden; }
    .responsiveGrid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 24px; max-width: 100%; }
    .responsiveGrid > * { min-width: 0; }
    .card { background: white; border-radius: 12px; min-width: 0; }
    /* Give Overview right column more room on desktop */
    .overview-card .info-row { grid-template-columns: minmax(140px, 170px) 1fr auto !important; }
    .overview-card .info-label { width: 170px !important; }
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
    /* Management card hover effects */
    .management-card:hover {
      background-color: #e6f0ff !important;
      border-color: #0075df !important;
      transform: translateY(-2px);
      box-shadow: 0 4px 6px rgba(0, 117, 223, 0.1);
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
      .desktop-financial-metrics { display: none !important; }
      .mobile-financial-metrics { display: block !important; }
      .desktop-linkedin-section { display: none !important; }
      .management-grid { grid-template-columns: 1fr !important; }
      .overview-card .info-row { padding: 8px 0 !important; display: block !important; }
      .overview-card .info-label { font-size: 12px !important; color: #718096 !important; margin-bottom: 2px !important; }
      .overview-card .info-value { font-size: 13px !important; line-height: 1.35 !important; display: block !important; margin-left: 0 !important; word-break: break-word !important; overflow-wrap: break-word !important; }
      .overview-card { padding: 14px 8px !important; }
      .overview-grid { grid-template-columns: 1fr !important; }
      .overview-description { order: 2; margin-top: 16px !important; }
      .overview-fields { order: 1; }
      .suggest-change-header-row,
      .suggest-change-row {
        grid-template-columns: 1fr !important;
      }
      .suggest-change-form {
        margin-left: -2px;
        margin-right: -2px;
      }
      .suggest-management-grid {
        grid-template-columns: 1fr !important;
      }
      .suggest-management-card {
        padding: 14px !important;
      }
      .suggest-corporate-event-grid,
      .suggest-counterparty-grid {
        grid-template-columns: 1fr !important;
      }
      .suggest-corporate-event-card,
      .suggest-counterparty-card {
        padding: 14px !important;
      }
    }
  `;

  return (
    <div className="company-detail-page" style={styles.container}>
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="company-detail-content" style={styles.maxWidth}>

          {/* Top header bar: logo + company name on the left, Sign Out on the right */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "14px",
              marginBottom: "24px",
              padding: "12px 18px",
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              boxShadow: "0 1px 4px 0 rgba(15,23,42,0.05)",
            }}
          >
            {/* Left: logo + portal label + company name */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
              {company._linkedin_data_of_new_company?.linkedin_logo ? (
                <img
                  src={`data:image/jpeg;base64,${company._linkedin_data_of_new_company.linkedin_logo}`}
                  alt={`${company.name} logo`}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "8px",
                    objectFit: "contain",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "8px",
                    background: "#0f172a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    color: "#fff",
                    fontSize: "17px",
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {company.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "10px", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 2 }}>
                  Data Contribution Portal
                </div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {company.name}
                </div>
              </div>
            </div>

            {/* Right: admin switch + sign out */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "8px",
                flexWrap: "wrap",
                flexShrink: 0,
              }}
            >
              {isAdminSession && (
                <button
                  type="button"
                  onClick={() => router.push("/contributor-crm/internal-crm")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 14px",
                    border: "1.5px solid #bfdbfe",
                    borderRadius: "8px",
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "#93c5fd";
                    (e.currentTarget as HTMLButtonElement).style.background = "#dbeafe";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "#bfdbfe";
                    (e.currentTarget as HTMLButtonElement).style.background = "#eff6ff";
                  }}
                >
                  Internal CRM
                </button>
              )}
              {!isPublicContributorSession && (
              <button
                type="button"
                onClick={() => {
                  const user = authService.getUser();
                  authService.clearUser();
                  contributorAccessService.clear();
                  if (user && isAdminUser(user)) {
                    window.location.href = buildTeamLoginPath();
                  } else {
                    window.location.href = buildContributorLoginPath(companyId);
                  }
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 14px",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: "8px",
                  background: "#f8fafc",
                  color: "#64748b",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#fca5a5";
                  (e.currentTarget as HTMLButtonElement).style.color = "#dc2626";
                  (e.currentTarget as HTMLButtonElement).style.background = "#fef2f2";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#e2e8f0";
                  (e.currentTarget as HTMLButtonElement).style.color = "#64748b";
                  (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc";
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Sign Out
              </button>
              )}
            </div>
          </div>

          {!isPublicContributorSession && (
          <div
            style={{
              display: "flex",
              gap: "28px",
              alignItems: "center",
              borderBottom: "1px solid #d1d5db",
              marginBottom: "24px",
              overflowX: "auto",
            }}
          >
            {CONTRIBUTOR_TABS.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "0 0 14px 0",
                    border: "none",
                    borderBottom: active ? "3px solid #111827" : "3px solid transparent",
                    background: "transparent",
                    color: active ? "#111827" : "#9ca3af",
                    fontSize: "15px",
                    fontWeight: active ? 700 : 500,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  <ContributorTabIcon name={tab.icon} active={active} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
          )}

          {(isPublicContributorSession || activeTab === "contribute-financial-metrics") && (
            <div style={{ display: "flex", justifyContent: "center" }}>
            <ContributeFinancialMetricsTab
              companyName={company.name}
              companyId={companyId}
              yearOptions={contributorYears}
              selectedYearId={selectedContributionYearId}
              onSelectYearId={(yearId) => {
                setHasUserSelectedContributionYear(true);
                setSelectedContributionYearId(yearId);
              }}
              hasUserSelectedYear={hasUserSelectedContributionYear}
              existingMetricsByYearId={existingMetricsByYearId}
              rawExistingMetricsByYearId={rawExistingMetricsByYearId}
              isLoadingYearData={loadingContributionYearId === selectedContributionYearId}
              hasLoadedYearData={
                selectedContributionYearId != null &&
                loadedContributionYearIds.includes(selectedContributionYearId)
              }
            />
            </div>
          )}

          {!isPublicContributorSession && activeTab === "sector-intelligence" && (
            <SectorIntelligenceTab
              primarySectorIds={primarySectors
                .map((s) => s.sector_id)
                .filter((id): id is number => typeof id === "number" && id > 0)}
              secondarySectorIds={secondarySectors
                .map((s) => s.sector_id)
                .filter((id): id is number => typeof id === "number" && id > 0)}
              primarySectorNames={primarySectors
                .map((s) => s.sector_name)
                .filter((n): n is string => typeof n === "string" && n.trim().length > 0)}
              hasContributed={null /* resolved internally via submissions API */}
              onGoToMetrics={() => setActiveTab("contribute-financial-metrics")}
            />
          )}

          {!isPublicContributorSession && activeTab === "company-profile" && (
          <>
          {/* Desktop grid */}
          <div style={styles.responsiveGrid} className="responsiveGrid">
            {/* Overview card */}
            <div style={styles.card} className="card overview-card">
              {/* Instructional banner */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  marginBottom: "20px",
                  fontSize: "13.5px",
                  color: "#1e40af",
                  lineHeight: 1.55,
                }}
              >
                <span style={{ fontSize: "16px", flexShrink: 0, marginTop: "1px" }}>ℹ️</span>
                <span>
                  Below is <strong>{company.name}</strong>&apos;s profile as it appears on the Asymmetrix platform.
                  Please request updates by clicking on the <strong>Suggest Change</strong> button below.
                </span>
              </div>
              {/* Company header moved into Overview */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "16px",
                  paddingBottom: "16px",
                  marginBottom: "16px",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    minWidth: 0,
                  }}
                >
                  <CompanyLogo
                    logo={company._linkedin_data_of_new_company?.linkedin_logo}
                    name={company.name}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "22px",
                        fontWeight: 700,
                        color: "#1a202c",
                        lineHeight: 1.2,
                      }}
                    >
                      {company.name}
                    </div>
                    {formerNameDisplay && (
                      <div style={{ ...styles.formerName, marginTop: "4px" }}>
                        (Formerly {formerNameDisplay})
                      </div>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    onClick={handleExportPdf}
                    disabled={exportingPdf || !company?.id}
                    style={{
                      ...styles.reportButton,
                      backgroundColor: exportingPdf ? "#9ca3af" : "#0075df",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: "212px",
                      minHeight: "56px",
                      padding: "12px 28px",
                      borderRadius: "9px",
                      fontSize: "15px",
                      fontWeight: 700,
                      letterSpacing: "0.01em",
                      cursor:
                        exportingPdf || !company?.id
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    {exportingPdf ? "Exporting..." : "Export PDF"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setShowSuggestChangeForm((current) => !current)
                    }
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: "212px",
                      minHeight: "56px",
                      padding: "12px 28px",
                      backgroundColor: showSuggestChangeForm ? "#1d4ed8" : "#16a34a",
                      color: "#fff",
                      border: "none",
                      borderRadius: "9px",
                      fontSize: "15px",
                      fontWeight: 700,
                      cursor: "pointer",
                      letterSpacing: "0.01em",
                      boxShadow: showSuggestChangeForm ? "none" : "0 2px 8px rgba(22,163,74,0.25)",
                      transition: "all 0.15s",
                    }}
                  >
                    {showSuggestChangeForm ? (
                      "Close"
                    ) : (
                      "Suggest Change"
                    )}
                  </button>
                </div>
              </div>
              {showSuggestChangeForm && (
                <SuggestBasicCompanyChangeForm
                  companyId={String(company.id)}
                  companyName={company.name}
                  currentValues={suggestChangeCurrentValues}
                  autoExpandAll={shouldOpenReview}
                  onClose={() => setShowSuggestChangeForm(false)}
                />
              )}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 0.85fr) minmax(0, 1.15fr)",
                  gap: "24px",
                }}
                className="overview-grid"
              >
                {/* Left column: Basic fields */}
                <div className="overview-fields">
              <div style={styles.infoRow} className="info-row">
                <span style={styles.label} className="info-label">
                  Primary Sector(s):
                </span>
                <div style={styles.value} className="info-value">
                  {augmentedPrimarySectors.length > 0 ? (
                    <>
                      <div style={styles.tagContainer}>
                        {(isMobile && !showAllPrimarySectors
                          ? augmentedPrimarySectors.slice(0, 4)
                          : augmentedPrimarySectors
                        ).map((sector) => {
                          if (!sector || !sector.sector_name) return null;
                          const id = getSectorId(sector);
                          return (
                            <span
                              key={`sector-${id ?? sector.sector_name}`}
                              style={styles.sectorTag}
                            >
                              {sector.sector_name}
                            </span>
                          );
                        })}
                      </div>
                      {isMobile && augmentedPrimarySectors.length > 4 && (
                        <button
                          onClick={() => setShowAllPrimarySectors((v) => !v)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#0075df",
                            cursor: "pointer",
                            fontSize: "12px",
                            textDecoration: "underline",
                            marginTop: "8px",
                            padding: 0,
                          }}
                        >
                          {showAllPrimarySectors ? "Show less" : "Show more"}
                        </button>
                      )}
                    </>
                  ) : (
                    "Not available"
                  )}
                </div>
              </div>
              <div style={styles.infoRow} className="info-row">
                <span style={styles.label} className="info-label">
                  Secondary Sector(s):
                </span>
                <div style={styles.value} className="info-value">
                  {secondarySectors.length > 0 ? (
                    <>
                      <div style={styles.tagContainer}>
                        {(isMobile && !showAllSecondarySectors
                          ? secondarySectors.slice(0, 4)
                          : secondarySectors
                        ).map((sector) => {
                          if (!sector || !sector.sector_name) return null;
                          const id = getSectorId(sector);
                          return (
                            <span
                              key={`sub-sector-${id ?? sector.sector_name}`}
                              style={styles.sectorTag}
                            >
                              {sector.sector_name}
                            </span>
                          );
                        })}
                      </div>
                      {isMobile && secondarySectors.length > 4 && (
                        <button
                          onClick={() => setShowAllSecondarySectors((v) => !v)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#0075df",
                            cursor: "pointer",
                            fontSize: "12px",
                            textDecoration: "underline",
                            marginTop: "8px",
                            padding: 0,
                          }}
                        >
                          {showAllSecondarySectors ? "Show less" : "Show more"}
                        </button>
                      )}
                    </>
                  ) : (
                    "Not available"
                  )}
                </div>
              </div>
              <div style={styles.infoRow} className="info-row">
                <span style={styles.label} className="info-label">
                  Year Founded:
                </span>
                <span style={styles.value} className="info-value">
                  {getYearFoundedDisplay(company)}
                </span>
              </div>
              <div style={styles.infoRow} className="info-row">
                <span style={styles.label} className="info-label">
                  Website:
                </span>
                <span style={styles.value} className="info-value">
                  {company.url || "Not available"}
                </span>
              </div>
              <div style={styles.infoRow} className="info-row">
                <span style={styles.label} className="info-label">
                  Ownership:
                </span>
                <span style={styles.value} className="info-value">
                  {company._ownership_type?.ownership || "Not available"}
                </span>
              </div>
              <div style={styles.infoRow} className="info-row">
                <span style={styles.label} className="info-label">
                  HQ:
                </span>
                <span style={styles.value} className="info-value">
                  {fullAddress || "Not available"}
                </span>
              </div>
              <div style={styles.infoRow} className="info-row">
                <span style={styles.label} className="info-label">
                  Lifecycle stage:
                </span>
                <span style={styles.value} className="info-value">
                  {company.Lifecycle_stage?.Lifecycle_Stage || "Not available"}
                </span>
              </div>
              <div style={styles.infoRow} className="info-row">
                <span style={styles.label} className="info-label">
                  Transaction status:
                </span>
                <span style={styles.value} className="info-value">
                  {resolveTransactionStatusDisplay(
                    transactionStatusApiLabel,
                    company
                  ) || "Not available"}
                </span>
              </div>
              {company.have_parent_company?.have_parent_companies &&
              Array.isArray(
                company.have_parent_company?.Parant_companies
              ) &&
              company.have_parent_company!.Parant_companies!.length > 0 &&
              // If first parent company's primary_business_focus_id is NOT Financial Services (74), show as Parent Company
              !extractPrimaryBusinessFocusIds(
                company.have_parent_company!.Parant_companies![0]
                  ?.primary_business_focus_id
              ).includes(FINANCIAL_SERVICES_FOCUS_ID) && (
                <div style={styles.infoRow} className="info-row">
                  <span style={styles.label} className="info-label">
                    Parent Company:
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
                            <span style={styles.companyTag}>
                              {parentName}
                            </span>
                          </div>
                        );
                      }
                      return parentName || "Not available";
                    })()}
                  </div>
                </div>
              )}
              <div style={styles.infoRow} className="info-row">
                <span style={styles.label} className="info-label">
                  Investors:
                </span>
                <div style={styles.value} className="info-value">
                  {validApiInvestors.length > 0 ? (
                    <div style={styles.tagContainer}>
                      {validApiInvestors.map((investor) => (
                        <span
                          key={`api-investor-${investor.investor_id}`}
                          style={styles.companyTag}
                        >
                          {investor.investor_name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    investorsDisplayText
                  )}
                </div>
              </div>
              <div style={styles.infoRow} className="info-row">
                <span style={styles.label} className="info-label">
                  Potential Acquirers:
                </span>
                <div style={styles.value} className="info-value">
                  {potentialAcquirersOptions.length > 0 ? (
                    <div style={styles.tagContainer}>
                      {potentialAcquirersOptions.map((c) => (
                        <span key={`pacq-${c.id}`} style={styles.companyTag}>
                          {c.label}
                        </span>
                      ))}
                    </div>
                  ) : competitorsPreloadLoading &&
                    parseCompanyRelationList(company.potential_acquirers).length === 0 ? (
                    "Loading..."
                  ) : (
                    "Not available"
                  )}
                </div>
              </div>
              <div style={styles.infoRow} className="info-row">
                <span style={styles.label} className="info-label">
                  Acquisition Targets:
                </span>
                <div style={styles.value} className="info-value">
                  {acquisitionTargetsOptions.length > 0 ? (
                    <div style={styles.tagContainer}>
                      {acquisitionTargetsOptions.map((c) => (
                        <span key={`actg-${c.id}`} style={styles.companyTag}>
                          {c.label}
                        </span>
                      ))}
                    </div>
                  ) : competitorsPreloadLoading &&
                    parseCompanyRelationList(company.acquisition_targets).length === 0 ? (
                    "Loading..."
                  ) : (
                    "Not available"
                  )}
                </div>
              </div>
              {hasManagement && (
                <div style={{ marginTop: "16px" }}>
                  <h3
                    style={{
                      ...styles.sectionTitle,
                      fontSize: "17px",
                      marginBottom: "12px",
                    }}
                  >
                    Management
                  </h3>

                  {hasCurrentManagement && (
                    <div style={{ marginBottom: hasPastManagement ? "20px" : 0 }}>
                      <IndividualCards
                        title="Current:"
                        individuals={(company.Managmant_Roles_current || []).map(
                          (person) => ({
                            id: person.id,
                            name: person.Individual_text,
                            jobTitles: getManagementJobTitleStrings(person.job_titles_id),
                            individualId: person.individuals_id,
                          })
                        )}
                        emptyMessage="Not available"
                      />
                    </div>
                  )}

                  {hasPastManagement && (
                    <div>
                      <IndividualCards
                        title="Past:"
                        individuals={(company.Managmant_Roles_past || []).map(
                          (person) => ({
                            id: person.id,
                            name: person.Individual_text,
                            jobTitles: getManagementJobTitleStrings(person.job_titles_id),
                            individualId: person.individuals_id,
                          })
                        )}
                        emptyMessage="Not available"
                      />
                    </div>
                  )}
                </div>
              )}
                </div>
                {/* Right column: Description + Insights */}
                <div
                  className="overview-description"
                  style={{
                    alignSelf: "start",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                    minWidth: 0,
                  }}
                >
                  {/* Description */}
                  <div
                    style={{
                      padding: "16px",
                      backgroundColor: "#f9fafb",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <div
                      ref={descriptionRef}
                      style={{
                        fontSize: "14px",
                        color: "#1a202c",
                        lineHeight: "1.6",
                        overflow: "hidden",
                        transition: "max-height 0.2s ease",
                        display: isDescriptionExpanded ? "block" : "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: isDescriptionExpanded ? "unset" : 3,
                      }}
                    >
                      {company.description || "No description available"}
                    </div>
                    {isDescriptionExpandable && (
                      <button
                        onClick={() =>
                          setIsDescriptionExpanded((expanded) => !expanded)
                        }
                        style={{
                          marginTop: "8px",
                          padding: 0,
                          border: "none",
                          background: "none",
                          color: "#0075df",
                          fontSize: "14px",
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        {isDescriptionExpanded ? "Show less" : "Expand"}
                      </button>
                    )}
                  </div>

                  {companyAttributeSections.length > 0 && (
                    <div
                      style={{
                        padding: "16px",
                        backgroundColor: "#f9fafb",
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "14px",
                        }}
                      >
                        {companyAttributeSections.map((section) => (
                          <div key={section.title}>
                            <div
                              style={{
                                fontSize: "13px",
                                fontWeight: 600,
                                color: "#334155",
                                marginBottom: "8px",
                              }}
                            >
                              {section.title}
                            </div>
                            <div style={{ overflowX: "auto" }}>
                              <table
                                style={{
                                  width: "100%",
                                  borderCollapse: "collapse",
                                  fontSize: "12px",
                                }}
                              >
                                <tbody>
                                  {section.rows.map((row) => (
                                    <tr key={`${section.title}-${row.label}`}>
                                      <td
                                        style={{
                                          padding: "7px 0",
                                          borderBottom: "1px solid #f1f5f9",
                                          color: "#1e293b",
                                        }}
                                      >
                                        {row.label}
                                      </td>
                                      <td
                                        style={{
                                          padding: "7px 0",
                                          borderBottom: "1px solid #f1f5f9",
                                          textAlign: "right",
                                          color: "#475569",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {row.value}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Market Landscape card */}
                  {(peersCompetitorsOptions.length > 0 || potentialAcquirersOptions.length > 0 || competitorsPreloadLoading) && (
                    <MarketLandscapeCard
                      peers={peersCompetitorsOptions}
                      acquirers={potentialAcquirersOptions}
                      loading={competitorsPreloadLoading}
                    />
                  )}

                  {/* Insights & Analysis (scrollable card) */}
                  {(articlesLoading || companyArticles.length > 0) && (
                    <div
                      className="bg-white rounded-xl border shadow-lg border-slate-200/60 flex flex-col overflow-hidden"
                      style={{
                        height:
                          articlesLoading || companyArticles.length >= 4
                            ? "535px"
                            : "auto",
                      }}
                    >
                      <div className="px-5 py-4 border-b border-slate-100 flex-shrink-0">
                        <div className="flex justify-between items-center">
                          <div className="flex gap-3 items-center min-w-0">
                            <span className="inline-flex justify-center items-center w-8 h-8 bg-blue-50 rounded-lg flex-shrink-0">
                              <svg
                                className="w-4 h-4 text-blue-600"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                              </svg>
                            </span>
                            <span className="font-semibold text-slate-900 truncate">
                              Recent Insights &amp; Analysis
                            </span>
                          </div>
                        </div>
                      </div>
                      <div
                        className="px-5 py-4 overflow-hidden"
                        style={{
                          flex:
                            articlesLoading || companyArticles.length >= 4
                              ? "1 1 0"
                              : "0 0 auto",
                          minHeight: 0,
                        }}
                      >
                        {articlesLoading ? (
                          <div className="space-y-3 animate-pulse">
                            {[1, 2, 3].map((i) => (
                              <div
                                key={i}
                                className="space-y-1.5 pb-3 border-b border-slate-100 last:border-0"
                              >
                                <div className="h-3.5 bg-slate-200 rounded w-1/4"></div>
                                <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                                <div className="h-3 bg-slate-200 rounded w-full"></div>
                                <div className="h-3 bg-slate-200 rounded w-4/5"></div>
                              </div>
                            ))}
                          </div>
                        ) : companyArticles.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                              <svg
                                className="w-6 h-6 text-slate-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                                />
                              </svg>
                            </div>
                            <p className="text-slate-500 text-sm">
                              No insights available for this company yet
                            </p>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100 overflow-y-auto overflow-x-hidden h-full">
                            {companyArticles.map((article) => {
                                const contentType = (article.Content_Type || "")
                                  .toLowerCase()
                                  .trim();
                                const pinnedRaw = (
                                  article as unknown as { pinned?: unknown }
                                )?.pinned;
                                const isPinned =
                                  pinnedRaw === true ||
                                  pinnedRaw === 1 ||
                                  String(pinnedRaw ?? "")
                                    .trim()
                                    .toLowerCase() === "yes" ||
                                  String(pinnedRaw ?? "")
                                    .trim()
                                    .toLowerCase() === "true";
                                const badgeStyle =
                                  contentType === "company analysis"
                                    ? {
                                        background: "#ecfdf5",
                                        color: "#065f46",
                                        border: "1px solid #a7f3d0",
                                      }
                                    : contentType === "deal analysis"
                                    ? {
                                        background: "#eff6ff",
                                        color: "#1e40af",
                                        border: "1px solid #bfdbfe",
                                      }
                                    : contentType === "sector analysis"
                                    ? {
                                        background: "#f5f3ff",
                                        color: "#5b21b6",
                                        border: "1px solid #ddd6fe",
                                      }
                                    : contentType === "hot take"
                                    ? {
                                        background: "#fff7ed",
                                        color: "#9a3412",
                                        border: "1px solid #fed7aa",
                                      }
                                    : contentType === "executive interview"
                                    ? {
                                        background: "#f0fdf4",
                                        color: "#166534",
                                        border: "1px solid #bbf7d0",
                                      }
                                    : {
                                        background: "#f8fafc",
                                        color: "#475569",
                                        border: "1px solid #e2e8f0",
                                      };

                                const dateLabel = (() => {
                                  if (!article.Publication_Date) return "";
                                  try {
                                    return new Date(
                                      article.Publication_Date
                                    ).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    });
                                  } catch {
                                    return "";
                                  }
                                })();

                                return (
                                  <div
                                    key={article.id}
                                    className="block py-3 first:pt-0 group -mx-5 px-5"
                                  >
                                    <div className="flex items-center gap-2 mb-1">
                                      {article.Content_Type && (
                                        <span
                                          className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full leading-none flex-shrink-0"
                                          style={badgeStyle}
                                        >
                                          {article.Content_Type}
                                        </span>
                                      )}
                                      {isPinned && (
                                        <span
                                          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full leading-none flex-shrink-0"
                                          style={{
                                            background: "#fff7ed",
                                            color: "#9a3412",
                                            border: "1px solid #fed7aa",
                                          }}
                                          title="Pinned"
                                        >
                                          <svg
                                            width="12"
                                            height="12"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                            aria-hidden="true"
                                          >
                                            <path
                                              d="M14 3L21 10L19 12L16 9L10 15V18L8 20V15L3 10L5 8H8L14 3Z"
                                              fill="currentColor"
                                            />
                                          </svg>
                                          Pinned
                                        </span>
                                      )}
                                      {dateLabel && (
                                        <span className="text-xs text-slate-400 flex-shrink-0">
                                          {dateLabel}
                                        </span>
                                      )}
                                      {isPinned && (
                                        <button
                                          type="button"
                                          disabled={exportingPdfId === article.id}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleExportArticlePdf(article);
                                          }}
                                          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full leading-none flex-shrink-0 transition-colors ml-auto"
                                          style={{
                                            background:
                                              exportingPdfId === article.id
                                                ? "#e2e8f0"
                                                : "#eff6ff",
                                            color:
                                              exportingPdfId === article.id
                                                ? "#94a3b8"
                                                : "#1e40af",
                                            border: "1px solid #bfdbfe",
                                            cursor:
                                              exportingPdfId === article.id
                                                ? "wait"
                                                : "pointer",
                                          }}
                                          title="Export as PDF"
                                        >
                                          {exportingPdfId === article.id ? (
                                            <svg
                                              className="animate-spin"
                                              width="12"
                                              height="12"
                                              viewBox="0 0 24 24"
                                              fill="none"
                                              xmlns="http://www.w3.org/2000/svg"
                                              aria-hidden="true"
                                            >
                                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round" />
                                            </svg>
                                          ) : (
                                            <svg
                                              width="12"
                                              height="12"
                                              viewBox="0 0 24 24"
                                              fill="none"
                                              xmlns="http://www.w3.org/2000/svg"
                                              aria-hidden="true"
                                            >
                                              <path
                                                d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                              />
                                              <path
                                                d="M14 2v6h6M12 18v-6M9 15l3 3 3-3"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                              />
                                            </svg>
                                          )}
                                          {exportingPdfId === article.id
                                            ? "Exporting…"
                                            : "Export PDF"}
                                        </button>
                                      )}
                                    </div>
                                    <h3 className="text-sm font-semibold text-slate-900 leading-snug mb-1 group-hover:text-blue-700 transition-colors line-clamp-1">
                                      {article.Headline || "Untitled"}
                                    </h3>
                                    {article.Strapline && (
                                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                                        {article.Strapline}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* Corporate Events moved into Overview */}
              <CorporateEventsSection
                events={corporateEvents}
                loading={corporateEventsLoading}
                showSectors={true}
                primarySectors={augmentedPrimarySectors}
                secondarySectors={secondarySectors}
                maxInitialEvents={3}
                truncateDescriptionLength={180}
                hideWhenEmpty={true}
                dividerTop={true}
                titleStyle={{
                  ...styles.sectionTitle,
                  fontSize: "17px",
                  marginBottom: "12px",
                }}
              />

              {/* Current Subsidiaries section */}
              {hasSubsidiaries && (
                <div
                  style={{
                    marginTop: "16px",
                    paddingTop: "16px",
                    borderTop: "1px solid #e2e8f0",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "24px",
                    }}
                  >
                    <h3
                      style={{
                        ...styles.sectionTitle,
                        fontSize: "17px",
                        marginBottom: "0",
                      }}
                    >
                      Current Subsidiaries
                    </h3>
                    {company.have_subsidiaries_companies?.Subsidiaries_companies &&
                    company.have_subsidiaries_companies.Subsidiaries_companies
                      .length > 3 ? (
                      <button
                        onClick={() => setShowAllSubsidiaries((prev) => !prev)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#0075df",
                          fontSize: "14px",
                          textDecoration: "underline",
                          cursor: "pointer",
                        }}
                      >
                        {showAllSubsidiaries ? "Show less" : "See more"}
                      </button>
                    ) : null}
                  </div>
                  <div style={{ overflowX: "auto", maxWidth: "100%" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        minWidth: "800px",
                      }}
                    >
                      <thead>
                        <tr>
                          {[
                            "Logo",
                            "Name",
                            "Description",
                            "Sectors",
                            "LinkedIn Members",
                            "Country",
                          ].map((header) => (
                            <th
                              key={header}
                              style={{
                                textAlign: "left",
                                padding: "12px 8px",
                                borderBottom: "1px solid #e2e8f0",
                                fontSize: "14px",
                                fontWeight: 700,
                                color: "#0f172a",
                              }}
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(
                          company.have_subsidiaries_companies
                            ?.Subsidiaries_companies ?? []
                        )
                          .filter(
                            // Ensure valid objects with numeric ids before rendering
                            (s) =>
                              typeof s === "object" &&
                              s !== null &&
                              typeof (s as { id?: unknown }).id === "number"
                          )
                          .slice(0, showAllSubsidiaries ? undefined : 3)
                          .map((subsidiary) => (
                            <tr key={subsidiary.id}>
                              <td
                                style={{
                                  padding: "12px 8px",
                                  borderBottom: "1px solid #e2e8f0",
                                }}
                              >
                                {subsidiary._linkedin_data_of_new_company
                                  ?.linkedin_logo ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={`data:image/jpeg;base64,${subsidiary._linkedin_data_of_new_company.linkedin_logo}`}
                                    alt={`${subsidiary.name} logo`}
                                    style={{
                                      width: "40px",
                                      height: "30px",
                                      objectFit: "contain",
                                    }}
                                  />
                                ) : (
                                  <div
                                    style={{
                                      width: "40px",
                                      height: "30px",
                                      backgroundColor: "#f7fafc",
                                      borderRadius: "4px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: "10px",
                                      color: "#718096",
                                    }}
                                  >
                                    N/A
                                  </div>
                                )}
                              </td>
                              <td
                                style={{
                                  padding: "12px 8px",
                                  borderBottom: "1px solid #e2e8f0",
                                }}
                              >
                                <span style={styles.link}>
                                  {subsidiary.name}
                                </span>
                              </td>
                              <td
                                style={{
                                  padding: "12px 8px",
                                  borderBottom: "1px solid #e2e8f0",
                                  fontSize: "14px",
                                  maxWidth: "250px",
                                  wordBreak: "break-word" as const,
                                  overflowWrap: "break-word" as const,
                                }}
                              >
                                {subsidiary.description ? (
                                  <div>
                                    {expandedDescriptions.has(subsidiary.id) ||
                                    subsidiary.description.length <= 100
                                      ? subsidiary.description
                                      : `${subsidiary.description.substring(
                                          0,
                                          100
                                        )}...`}
                                    {subsidiary.description.length > 100 && (
                                      <button
                                        onClick={() =>
                                          toggleDescription(subsidiary.id)
                                        }
                                        style={{
                                          background: "none",
                                          border: "none",
                                          color: "#0075df",
                                          cursor: "pointer",
                                          fontSize: "12px",
                                          textDecoration: "underline",
                                          marginLeft: "4px",
                                          padding: "0",
                                        }}
                                      >
                                        {expandedDescriptions.has(subsidiary.id)
                                          ? "Show less"
                                          : "Expand description"}
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  "N/A"
                                )}
                              </td>
                              <td
                                style={{
                                  padding: "12px 8px",
                                  borderBottom: "1px solid #e2e8f0",
                                  fontSize: "14px",
                                }}
                              >
                                {subsidiary.sectors_id
                                  ?.filter(
                                    (s) => s && typeof s.sector_name === "string"
                                  )
                                  .map((sector) => sector.sector_name)
                                  .join(", ") || "N/A"}
                              </td>
                              <td
                                style={{
                                  padding: "12px 8px",
                                  borderBottom: "1px solid #e2e8f0",
                                  fontSize: "14px",
                                  textAlign: "center",
                                }}
                              >
                                {subsidiary._linkedin_data_of_new_company &&
                                subsidiary._linkedin_data_of_new_company
                                  .linkedin_employee !== undefined &&
                                subsidiary._linkedin_data_of_new_company
                                  .linkedin_employee !== null
                                  ? formatNumber(
                                      subsidiary._linkedin_data_of_new_company
                                        .linkedin_employee
                                    )
                                  : "N/A"}
                              </td>
                              <td
                                style={{
                                  padding: "12px 8px",
                                  borderBottom: "1px solid #e2e8f0",
                                  fontSize: "14px",
                                }}
                              >
                                {subsidiary._locations?.Country || "N/A"}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

            {/* Desktop Financial Metrics */}
            <div style={styles.card} className="card desktop-financial-metrics">
              <h2 style={styles.sectionTitle}>
                Financial Metrics{metricsCurrencySuffix}
              </h2>
              {financialMetricsPeriodDisplay && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(180px, 220px) 1fr auto",
                    marginTop: "-12px",
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
                <div style={{ marginTop: "16px" }}>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: 600,
                      marginBottom: 8,
                    }}
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
                              padding: "8px",
                              borderBottom: "1px solid #e2e8f0",
                            }}
                          >
                            Financial Period
                          </th>
                          <th
                            style={{
                              textAlign: "right",
                              padding: "8px",
                              borderBottom: "1px solid #e2e8f0",
                            }}
                          >
                            Revenue (m)
                          </th>
                          <th
                            style={{
                              textAlign: "right",
                              padding: "8px",
                              borderBottom: "1px solid #e2e8f0",
                            }}
                          >
                            EBIT (m)
                          </th>
                          <th
                            style={{
                              textAlign: "right",
                              padding: "8px",
                              borderBottom: "1px solid #e2e8f0",
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
                                  padding: "8px",
                                  borderBottom: "1px solid #e2e8f0",
                                }}
                              >
                                {period || "—"}
                              </td>
                              <td
                                style={{
                                  padding: "8px",
                                  borderBottom: "1px solid #e2e8f0",
                                  textAlign: "right",
                                }}
                              >
                                {fmt(row.revenue)}
                              </td>
                              <td
                                style={{
                                  padding: "8px",
                                  borderBottom: "1px solid #e2e8f0",
                                  textAlign: "right",
                                }}
                              >
                                {fmt(row.ebit)}
                              </td>
                              <td
                                style={{
                                  padding: "8px",
                                  borderBottom: "1px solid #e2e8f0",
                                  textAlign: "right",
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
                <span style={styles.label}>Recurring Revenue:</span>
                <span style={styles.value}>
                  {formatPercent(financialMetrics?.ARR_pc)}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.ARR_source_label,
                    financialMetrics?.ARR_source
                  )}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>ARR (m):</span>
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
                <span style={styles.label}>Churn:</span>
                <span style={styles.value}>
                  {formatPercent(financialMetrics?.Churn_pc)}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.Churn_source_label,
                    financialMetrics?.Churn_Source
                  )}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>GRR:</span>
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
                <span style={styles.label}>Cross-sell:</span>
                <span style={styles.value}>
                  {formatPercent(financialMetrics?.Cross_sell_pc)}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.Cross_sell_source_label,
                    financialMetrics?.Cross_sell_source
                  )}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Price increase:</span>
                <span style={styles.value}>
                  {formatPercent(financialMetrics?.Price_increase_pc)}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.Price_increase_source_label,
                    financialMetrics?.Price_increase_source
                  )}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Revenue expansion:</span>
                <span style={styles.value}>
                  {formatPercent(financialMetrics?.Rev_expansion_pc)}
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
                <span style={styles.label}>New clients revenue growth:</span>
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

              {/* Other Metrics */}
              <div
                style={{ ...styles.chartTitle, marginTop: 20, marginBottom: 8 }}
              >
                Other Metrics
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>EBIT (m):</span>
                <span style={styles.value}>
                  {formatPlainNumber(financialMetrics?.EBIT_m)}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.EBIT_source_label,
                    financialMetrics?.EBIT_source
                  )}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Number of clients:</span>
                <span style={styles.value}>
                  {typeof financialMetrics?.No_of_Clients === "number"
                    ? financialMetrics.No_of_Clients.toLocaleString()
                    : "Not available"}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.No_of_Clients_source_label,
                    financialMetrics?.No_Clients_source
                  )}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Revenue per client:</span>
                <span style={styles.value}>
                  {formatWholeNumber(financialMetrics?.Rev_per_client)}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.Rev_per_client_source_label,
                    financialMetrics?.Rev_per_client_source
                  )}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Number of employees:</span>
                <span style={styles.value}>
                  {typeof financialMetrics?.No_Employees === "number"
                    ? financialMetrics.No_Employees.toLocaleString()
                    : formatNumber(currentEmployeeCount)}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.No_Employees_source_label,
                    financialMetrics?.No_Employees_source
                  )}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Revenue per employee:</span>
                <span style={styles.value}>
                  {formatWholeNumber(financialMetrics?.Revenue_per_employee)}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.Revenue_per_employee_source_label,
                    financialMetrics?.Rev_per_employee_source
                  )}
                </span>
              </div>
              <div style={styles.chartContainer} className="chartContainer">
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
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "30px",
                      height: "30px",
                      backgroundColor: "#0077b5",
                      borderRadius: "6px",
                      color: "white",
                    }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </div>
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
                <span style={styles.label}>Recurring Revenue:</span>
                <span style={styles.value}>
                  {formatPercent(financialMetrics?.ARR_pc)}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.ARR_source_label,
                    financialMetrics?.ARR_source
                  )}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>ARR (m):</span>
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
                <span style={styles.label}>Churn:</span>
                <span style={styles.value}>
                  {formatPercent(financialMetrics?.Churn_pc)}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.Churn_source_label,
                    financialMetrics?.Churn_Source
                  )}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>GRR:</span>
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
                <span style={styles.label}>Cross-sell:</span>
                <span style={styles.value}>
                  {formatPercent(financialMetrics?.Cross_sell_pc)}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.Cross_sell_source_label,
                    financialMetrics?.Cross_sell_source
                  )}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Price increase:</span>
                <span style={styles.value}>
                  {formatPercent(financialMetrics?.Price_increase_pc)}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.Price_increase_source_label,
                    financialMetrics?.Price_increase_source
                  )}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Revenue expansion:</span>
                <span style={styles.value}>
                  {formatPercent(financialMetrics?.Rev_expansion_pc)}
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
                <span style={styles.label}>New clients revenue growth:</span>
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

              {/* Other Metrics */}
              <div
                style={{ ...styles.chartTitle, marginTop: 20, marginBottom: 8 }}
              >
                Other Metrics
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>EBIT (m):</span>
                <span style={styles.value}>
                  {formatPlainNumber(financialMetrics?.EBIT_m)}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.EBIT_source_label,
                    financialMetrics?.EBIT_source
                  )}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Number of clients:</span>
                <span style={styles.value}>
                  {typeof financialMetrics?.No_of_Clients === "number"
                    ? financialMetrics.No_of_Clients.toLocaleString()
                    : "Not available"}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.No_of_Clients_source_label,
                    financialMetrics?.No_Clients_source
                  )}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Revenue per client:</span>
                <span style={styles.value}>
                  {formatWholeNumber(financialMetrics?.Rev_per_client)}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.Rev_per_client_source_label,
                    financialMetrics?.Rev_per_client_source
                  )}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Number of employees:</span>
                <span style={styles.value}>
                  {typeof financialMetrics?.No_Employees === "number"
                    ? financialMetrics.No_Employees.toLocaleString()
                    : formatNumber(currentEmployeeCount)}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.No_Employees_source_label,
                    financialMetrics?.No_Employees_source
                  )}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Revenue per employee:</span>
                <span style={styles.value}>
                  {formatWholeNumber(financialMetrics?.Revenue_per_employee)}
                </span>
                <span style={styles.sourceValue}>
                  {getSourceText(
                    financialMetrics?.Revenue_per_employee_source_label,
                    financialMetrics?.Rev_per_employee_source
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
            </div>
          </div>

          {/* LinkedIn section (desktop only) removed per request */}

          {/* Management section moved into Overview above */}
          </>
          )}
        </div>
        <style dangerouslySetInnerHTML={{ __html: responsiveCss }} />
      </main>
    </div>
  );
};

export default CompanyDetail;


//