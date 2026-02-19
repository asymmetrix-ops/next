"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useRightClick } from "@/hooks/useRightClick";
import { CorporateEventsSection } from "@/components/corporate-events/CorporateEventsSection";
import IndividualCards from "@/components/shared/IndividualCards";
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
import { InsightsAnalysisCard } from "@/components/InsightsAnalysisCard";
// Investor classification rule constants (module scope; stable across renders)
const FINANCIAL_SERVICES_FOCUS_ID = 74;

// Auth `/auth/me` shape (subset)
interface AuthMePayload {
  id: number;
  followed_companies?: unknown[] | null;
}

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

interface EmployeeCount {
  date: string;
  employees_count: number;
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

// Investors data from investors_data field
interface InvestorsDataItem {
  name: string;
  investor_id: number;
  new_company_id?: number;
}

interface ParsedInvestorsData {
  past: InvestorsDataItem[];
  current: InvestorsDataItem[];
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
  id?: number;
  name?: string;
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
  investment_data?: {
    investment_amount_m?: number | string;
    investment_amount?: number | string;
    currency?: string | { Currency?: string } | null;
    _currency?: { Currency?: string };
    currency_id?: number | string;
    Funding_stage?: string;
    funding_stage?: string;
    investment_amount_url?: string | null;
  };
  ev_data?: {
    enterprise_value_m?: number | string;
    ev_band?: string;
    currency?: { Currency?: string };
    _currency?: { Currency?: string };
  };
  ev_display?: string | null;
  description?: string;
  announcement_date?: string;
  investment_display?: string | null;
  this_company_status?: string;
  other_counterparties?: NewOtherCounterparty[];
}

type CompanyCorporateEvent = LegacyCorporateEvent | NewCorporateEvent;

// Related transactions endpoint payload (sector-related corporate events)
interface RelatedTransactionSectorDisplay {
  id: number;
  sector_name: string;
}

interface RelatedTransactionTarget {
  id?: number;
  company_id?: number;
  name?: string;
  page_type?: string;
  logo?: string;
}

interface RelatedTransactionCounterparty {
  id?: number;
  company_id?: number;
  counterparty_id?: number;
  name?: string;
  role?: string;
  counterparty_announcement_url?: string | null;
  page_type?: string;
  logo?: string;
}

interface RelatedTransaction {
  id: number;
  announcement_date?: string;
  closed_date?: string;
  deal_type?: string;
  deal_status?: string;
  description?: string;
  investment_data?:
    | {
        currency_id?: number | string | null;
        Funding_stage?: string | null;
        funding_stage?: string | null;
        investment_amount_m?: number | string | null;
        investment_amount_source?: string | null;
      }
    | string
    | null;
  ev_data?:
    | {
        ev_band?: string | null;
        ev_source?: string | null;
        currency_id?: number | string | null;
        EV_source_type?: string | null;
        enterprise_value_m?: number | string | null;
      }
    | string
    | null;
  deal_terms_data?:
    | {
        deal_terms?: string | null;
        deal_terms_source?: string | null;
      }
    | string
    | null;
  target?: RelatedTransactionTarget | string | null;
  counterparties?: RelatedTransactionCounterparty[] | string | null;
  advisors?: unknown[] | string | null;
  amount_raw?: unknown;
  amount_m?: number | string | null;
  amount_currency?: string | null;
  ev_raw?: unknown;
  ev_m?: number | string | null;
  ev_currency?: string | null;
  primary_sectors_display?: RelatedTransactionSectorDisplay[] | string | null;
  secondary_sectors_display?: RelatedTransactionSectorDisplay[] | string | null;
  // Some backends may include the source company id
  new_company_id?: number | null;
}


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
  have_parent_company?: HaveParentCompany;
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

const toFiniteInt = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = parseInt(value.trim(), 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

// Normalize followed_companies into numeric company ids (robust to backend shapes)
const extractFollowedCompanyIds = (payload: unknown): number[] => {
  if (!Array.isArray(payload)) return [];
  const ids: number[] = [];
  for (const item of payload) {
    if (typeof item === "number" && Number.isFinite(item)) {
      ids.push(item);
      continue;
    }
    if (typeof item === "string") {
      const n = toFiniteInt(item);
      if (n !== null) ids.push(n);
      continue;
    }
    if (item && typeof item === "object") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const obj = item as any;
      const candidate =
        obj?.new_company_id ?? obj?.company_id ?? obj?.id ?? obj?.new_company;
      const n = toFiniteInt(candidate);
      if (n !== null) ids.push(n);
    }
  }
  return ids;
};

// Format as a whole number with thousands separators (e.g. 54170 -> "54,170")
const formatWholeNumber = (value?: number | string | null): string => {
  const n = getNumeric(value);
  if (n === undefined) return "Not available";
  return Math.round(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
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

// Main Company Detail Component
const CompanyDetail = () => {
  const params = useParams();
  const companyId = params.param as string;
  const { createClickableElement } = useRightClick();

  const [company, setCompany] = useState<Company | null>(null);
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
  // Investors from investors_data field in company response
  const [parsedInvestorsData, setParsedInvestorsData] = useState<
    ParsedInvestorsData | null
  >(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [relatedTransactions, setRelatedTransactions] = useState<
    RelatedTransaction[]
  >([]);
  const [relatedTransactionsLoading, setRelatedTransactionsLoading] =
    useState(false);

  // Follow company (auth/me + toggle endpoint)
  const [authMe, setAuthMe] = useState<AuthMePayload | null>(null);
  const [authMeLoading, setAuthMeLoading] = useState(false);
  const [followToggling, setFollowToggling] = useState(false);

  const fetchAuthMe = useCallback(async () => {
    setAuthMeLoading(true);
    try {
      // Use same-origin proxy to avoid CORS (server-to-server call to Xano)
      const res = await fetch("/api/auth-me", {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        setAuthMe(null);
        return;
      }
      const data = (await res.json()) as unknown;
      if (data && typeof data === "object" && typeof (data as AuthMePayload).id === "number") {
        setAuthMe(data as AuthMePayload);
      } else {
        setAuthMe(null);
      }
    } catch {
      setAuthMe(null);
    } finally {
      setAuthMeLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!companyId) return;
    fetchAuthMe();
  }, [companyId, fetchAuthMe]);

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
      const token = localStorage.getItem("asymmetrix_auth_token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const endpoint = `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au:develop/Get_new_company/${id}`;

      // Attempt 1: Standard GET
      const getResponse = await fetch(endpoint, {
        method: "GET",
        headers,
        credentials: "include",
      });
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
        const url = `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au:develop/companies_articles?${params.toString()}`;
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

      const base = `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au:develop/company_financial_metrics`;
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

      const endpoint = `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au:develop/company_investors`;

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

  // Fetch related transactions (auth required) for the company's primary sectors
  const fetchRelatedTransactions = useCallback(async (id: string | number) => {
    setRelatedTransactionsLoading(true);
    try {
      const token = localStorage.getItem("asymmetrix_auth_token");
      if (!token) {
        setRelatedTransactions([]);
        return;
      }
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      };

      const endpoint = `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au:develop/related_transactions`;
      const params = new URLSearchParams();
      params.append("new_company_id", String(id));
      const res = await fetch(`${endpoint}?${params.toString()}`, {
        method: "GET",
        headers,
        credentials: "include",
      });

      if (!res.ok) {
        setRelatedTransactions([]);
        return;
      }

      const data = await res.json();
      setRelatedTransactions(Array.isArray(data) ? (data as RelatedTransaction[]) : []);
    } catch (err) {
      console.error("Error fetching related transactions:", err);
      setRelatedTransactions([]);
    } finally {
      setRelatedTransactionsLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchCompanyData = async () => {
      setLoading(true);
      setError(null);
      setParsedInvestorsData(null); // Reset investors data

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

        // Parse investors_data from Get_new_company payload
        try {
          const rawInvestorsData = (
            data as unknown as {
              investors_data?: Array<{ items?: unknown }>;
            }
          )?.investors_data;
          if (Array.isArray(rawInvestorsData) && rawInvestorsData.length > 0) {
            for (const entry of rawInvestorsData) {
              const raw = (entry as { items?: unknown })?.items;
              let payload: unknown = raw;
              if (typeof raw === "string") {
                try {
                  payload = JSON.parse(raw as string);
                } catch {
                  // ignore malformed JSON
                }
              }
              if (payload && typeof payload === "object") {
                const parsed = payload as ParsedInvestorsData;
                if (
                  Array.isArray(parsed.current) ||
                  Array.isArray(parsed.past)
                ) {
                  setParsedInvestorsData(parsed);
                  break; // use first valid block only
                }
              }
            }
          }
        } catch {
          // non-fatal
        }

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
      fetchRelatedTransactions(companyId);
    }
  }, [
    companyId,
    fetchCompanyArticles,
    requestCompany,
    fetchFinancialMetrics,
    fetchCompanyInvestors,
    fetchRelatedTransactions,
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
      const response = await fetch(
        "https://asymmetrix-pdf-service.fly.dev/api/export-company-pdf",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ company_id: company.id }),
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

  const viewingCompanyId =
    typeof company?.id === "number" && Number.isFinite(company.id)
      ? company.id
      : toFiniteInt(companyId);

  const isFollowingCompany =
    viewingCompanyId !== null &&
    extractFollowedCompanyIds(authMe?.followed_companies).includes(
      viewingCompanyId
    );

  const handleToggleFollowCompany = useCallback(async () => {
    const userId = authMe?.id;
    const newCompanyId =
      typeof company?.id === "number" && Number.isFinite(company.id)
        ? company.id
        : toFiniteInt(companyId);

    if (!userId || newCompanyId === null) return;

    setFollowToggling(true);
    try {
      // Use same-origin proxy to avoid CORS preflight issues
      const res = await fetch("/api/followed-companies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          user_id: userId,
          new_company_id: newCompanyId,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `Follow toggle failed: ${res.status} ${res.statusText} ${text}`
        );
      }

      // Refresh `auth/me` to get the server-truth followed_companies array
      await fetchAuthMe();
    } catch (e) {
      console.error("Error toggling followed company:", e);
      alert("Failed to update follow status. Please try again.");
    } finally {
      setFollowToggling(false);
    }
  }, [authMe?.id, company?.id, companyId, fetchAuthMe]);

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

  // Build "Related Transactions" (5 most recent) from primary sectors only, excluding events
  // where this company is itself a counterparty/target.
  const relatedTransactionEvents: CompanyCorporateEvent[] = (() => {
    const parseJsonMaybe = <T,>(value: unknown): T | null => {
      if (!value) return null;
      if (typeof value === "object") return value as T;
      if (typeof value !== "string") return null;
      const trimmed = value.trim();
      if (!trimmed) return null;
      // Common Xano escaping: \u0022 for quotes; also tolerate CRLF sequences
      const normalized = trimmed.replace(/\\u0022/g, '"');
      try {
        return JSON.parse(normalized) as T;
      } catch {
        // Sometimes we get surrounding quotes or double-encoded strings
        const unquoted = normalized.replace(/^"+|"+$/g, "");
        try {
          const first = JSON.parse(unquoted) as unknown;
          if (typeof first === "string") {
            const normalized2 = first.replace(/\\u0022/g, '"');
            return JSON.parse(normalized2) as T;
          }
          return first as T;
        } catch {
          return null;
        }
      }
    };

    const parseArrayMaybe = <T,>(value: unknown): T[] => {
      if (Array.isArray(value)) return value as T[];
      const parsed = parseJsonMaybe<unknown>(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    };

    const parseObjectMaybe = <T,>(value: unknown): T | null => {
      if (value && typeof value === "object" && !Array.isArray(value))
        return value as T;
      const parsed = parseJsonMaybe<unknown>(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as T)
        : null;
    };

    const primarySectorIds = new Set<number>(
      (augmentedPrimarySectors || [])
        .map((s) => s?.sector_id)
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    );
    if (!primarySectorIds.size) return [];

    const thisCompanyId = company?.id;
    const safeTime = (d?: string) => {
      if (!d) return 0;
      const t = Date.parse(d);
      return Number.isFinite(t) ? t : 0;
    };

    const isThisCompanyInCounterparties = (tx: RelatedTransaction): boolean => {
      if (typeof thisCompanyId !== "number") return false;
      // Some payloads may include it as a direct field
      if (typeof tx.new_company_id === "number" && tx.new_company_id === thisCompanyId)
        return true;
      // Target match (payload may use company_id)
      const targetObj = parseObjectMaybe<RelatedTransactionTarget>(tx.target);
      if (
        (targetObj && typeof targetObj.company_id === "number" && targetObj.company_id === thisCompanyId) ||
        (targetObj && typeof targetObj.id === "number" && targetObj.id === thisCompanyId)
      ) {
        return true;
      }

      // Counterparty match (payload may include company_id)
      const cps = parseArrayMaybe<RelatedTransactionCounterparty>(tx.counterparties);
      return cps.some((cp) => {
        if (!cp) return false;
        if (typeof cp.company_id === "number" && cp.company_id === thisCompanyId) return true;
        if (typeof cp.id === "number" && cp.id === thisCompanyId) return true;
        if (typeof cp.counterparty_id === "number" && cp.counterparty_id === thisCompanyId)
          return true;
        const parsed = parseInt(String((cp as unknown as { id?: unknown }).id ?? ""), 10);
        return Number.isFinite(parsed) && parsed === thisCompanyId;
      });
    };

    const filtered = (relatedTransactions || [])
      .filter((tx) => tx && typeof tx.id === "number")
      .filter((tx) => {
        // Must match at least one of this company's primary sectors
        const txPrimarySectors = parseArrayMaybe<RelatedTransactionSectorDisplay>(
          tx.primary_sectors_display
        );
        const txPrimaryIds = txPrimarySectors
          .map((s) => s?.id)
          .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
        const matchesPrimarySector = txPrimaryIds.some((id) => primarySectorIds.has(id));
        if (!matchesPrimarySector) return false;

        // Exclude transactions where current company is a counterparty/target
        if (isThisCompanyInCounterparties(tx)) return false;
        return true;
      })
      .sort((a, b) => safeTime(b.announcement_date) - safeTime(a.announcement_date))
      .slice(0, 5);

    // Map into the corporate event shape used by the platform tables
    return filtered.map((tx) => {
      const targetObj = parseObjectMaybe<RelatedTransactionTarget>(tx.target);
      const targetCompanyId =
        targetObj && typeof targetObj.company_id === "number"
          ? targetObj.company_id
          : targetObj && typeof targetObj.id === "number"
          ? targetObj.id
          : undefined;
      const targetName =
        targetObj && typeof targetObj.name === "string" ? targetObj.name.trim() : "";
      const targetPageType =
        targetObj && typeof targetObj.page_type === "string"
          ? targetObj.page_type
          : undefined;

      const dealTermsObj = parseObjectMaybe<{ deal_terms_source?: string | null }>(
        tx.deal_terms_data
      );
      const investmentObj = parseObjectMaybe<{
        investment_amount_m?: number | string | null;
        Funding_stage?: string | null;
        funding_stage?: string | null;
        currency_id?: number | string | null;
        investment_amount_source?: string | null;
      }>(tx.investment_data);
      const evObj = parseObjectMaybe<{
        enterprise_value_m?: number | string | null;
        ev_band?: string | null;
      }>(tx.ev_data);

      const targets: NewTargetEntity[] =
        targetCompanyId && targetName
          ? [
              {
                id: targetCompanyId,
                name: targetName,
                page_type: targetPageType,
                counterparty_announcement_url:
                  (typeof dealTermsObj?.deal_terms_source === "string"
                    ? dealTermsObj.deal_terms_source
                    : undefined) ||
                  (typeof investmentObj?.investment_amount_source === "string"
                    ? investmentObj.investment_amount_source
                    : undefined) ||
                  undefined,
              },
            ]
          : [];

      const normalizeRoleToStatus = (role?: string): string | undefined => {
        const r = String(role ?? "").trim().toLowerCase();
        if (!r) return undefined;
        if (r.includes("buyer") || r.includes("acquirer")) return "Acquirer";
        if (r.includes("seller") || r.includes("divestor")) return "Divestor";
        if (r.includes("investor")) return "Investor";
        return undefined;
      };

      const counterpartiesArr = parseArrayMaybe<RelatedTransactionCounterparty>(
        tx.counterparties
      );
      const otherCounterparties: NewOtherCounterparty[] = counterpartiesArr
        .map((cp) => {
          const id =
            typeof cp?.company_id === "number"
              ? cp.company_id
              : typeof cp?.counterparty_id === "number"
              ? cp.counterparty_id
              : typeof cp?.id === "number"
              ? cp.id
              : undefined;
          const name = typeof cp?.name === "string" ? cp.name : undefined;
          const page_type =
            typeof cp?.page_type === "string" ? cp.page_type : undefined;
          const status = normalizeRoleToStatus(cp?.role);

          return {
            id,
            name,
            page_type,
            counterparty_id: typeof cp?.company_id === "number" ? cp.company_id : undefined,
            counterparty_status: status,
            counterparty_announcement_url:
              typeof cp?.counterparty_announcement_url === "string"
                ? cp.counterparty_announcement_url
                : null,
          };
        })
        .filter((cp) => Boolean(cp.id) || Boolean(cp.name));

      const amountCurrency =
        typeof tx.amount_currency === "string" ? tx.amount_currency : undefined;
      const evCurrency = typeof tx.ev_currency === "string" ? tx.ev_currency : undefined;

      const investmentAmountCandidate =
        tx.amount_m ?? investmentObj?.investment_amount_m;
      const investmentAmount =
        investmentAmountCandidate == null ? undefined : investmentAmountCandidate;

      const evAmountCandidate = tx.ev_m ?? evObj?.enterprise_value_m;
      const evAmount = evAmountCandidate == null ? undefined : evAmountCandidate;

      const evData: NonNullable<NewCorporateEvent["ev_data"]> = {
        enterprise_value_m: evAmount,
        ...(typeof evObj?.ev_band === "string" && evObj.ev_band.trim().length > 0
          ? { ev_band: evObj.ev_band }
          : {}),
        ...(evCurrency
          ? {
              _currency: { Currency: evCurrency },
              currency: { Currency: evCurrency },
            }
          : {}),
      };

      const event: NewCorporateEvent = {
        id: tx.id,
        description: tx.description,
        announcement_date: tx.announcement_date,
        deal_type: tx.deal_type,
        targets,
        other_counterparties: otherCounterparties,
        investment_data: {
          investment_amount_m: investmentAmount,
          currency: amountCurrency ?? null,
          Funding_stage:
            (investmentObj?.Funding_stage ??
              investmentObj?.funding_stage ??
              undefined) ||
            undefined,
          currency_id:
            investmentObj?.currency_id == null
              ? undefined
              : investmentObj?.currency_id,
          investment_amount_url: null,
        },
        ev_data: evData,
        ev_display: null,
        advisors: [],
        advisors_names: [],
      };
      return event;
    });
  })();

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
  const hasManagement = Boolean(
    (company.Managmant_Roles_current &&
      company.Managmant_Roles_current.length > 0) ||
      (company.Managmant_Roles_past && company.Managmant_Roles_past.length > 0)
  );

  // Market Overview removed: no TradingView symbols computation

  // Build a readable former name string if present
  const formerNameDisplay =
    Array.isArray(company?.Former_name) && company.Former_name.length > 0
      ? company.Former_name.filter(
          (v) => typeof v === "string" && v.trim().length > 0
        ).join(", ")
      : null;

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
      padding: "32px",
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
      padding: "32px 24px",
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
      gridTemplateColumns: "minmax(180px, 220px) 1fr",
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
        padding: "16px",
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
    .desktop-financial-metrics .info-row { padding: 6px 0 !important; }
    .mobile-financial-metrics .info-row { padding: 6px 0 !important; }
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
      .insights-grid {
        grid-template-columns: 1fr !important;
        gap: 12px !important;
      }
      .responsiveGrid { grid-template-columns: 1fr !important; gap: 12px !important; max-width: 100% !important; }
      .desktop-financial-metrics { display: none !important; }
      .mobile-financial-metrics { display: block !important; }
      .desktop-linkedin-section { display: none !important; }
      .management-grid { grid-template-columns: 1fr !important; }
      .overview-card { padding: 12px 12px !important; }
      .overview-card .info-row { padding: 8px 0 !important; display: block !important; }
      .overview-card .info-label { font-size: 12px !important; color: #718096 !important; margin-bottom: 2px !important; }
      .overview-card .info-value { font-size: 13px !important; line-height: 1.35 !important; display: block !important; margin-left: 0 !important; word-break: break-word !important; overflow-wrap: break-word !important; }
    }
  `;

  return (
    <div className="company-detail-page" style={styles.container}>
      <Header />
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={styles.maxWidth}>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.headerLeft}>
              <CompanyLogo
                logo={company._linkedin_data_of_new_company?.linkedin_logo}
                name={company.name}
              />
              <div>
                <h1 style={styles.companyName}>{company.name}</h1>
                {formerNameDisplay && (
                  <div style={styles.formerName}>
                    (Formerly {formerNameDisplay})
                  </div>
                )}
              </div>
            </div>
            <div style={styles.headerRight}>
              <button
                onClick={handleToggleFollowCompany}
                disabled={
                  followToggling ||
                  authMeLoading ||
                  !authMe?.id ||
                  viewingCompanyId === null
                }
                title={
                  !authMe?.id
                    ? "Sign in to follow companies"
                    : isFollowingCompany
                    ? "Unfollow this company"
                    : "Follow this company"
                }
                style={{
                  ...styles.reportButton,
                  backgroundColor: isFollowingCompany ? "#ef4444" : "#7c3aed",
                  border: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  cursor:
                    followToggling ||
                    authMeLoading ||
                    !authMe?.id ||
                    viewingCompanyId === null
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {followToggling
                  ? "Updating..."
                  : isFollowingCompany
                  ? "Unfollow Company"
                  : "Follow Company"}
              </button>
              <button
                onClick={handleExportPdf}
                disabled={exportingPdf || !company?.id}
                style={{
                  ...styles.reportButton,
                  backgroundColor: exportingPdf ? "#9ca3af" : "#0075df",
                  display: "inline-flex",
                  alignItems: "center",
                  cursor:
                    exportingPdf || !company?.id ? "not-allowed" : "pointer",
                }}
              >
                {exportingPdf ? "Exporting..." : "Export PDF"}
              </button>
              <a
                style={{
                  ...styles.reportButton,
                  display: "inline-flex",
                  alignItems: "center",
                }}
                href="mailto:asymmetrix@asymmetrixintelligence.com?subject=Report%20Incorrect%20Company%20Data&body=Please%20describe%20the%20issue%20you%20found."
                target="_blank"
                rel="noopener noreferrer"
              >
                Contribute Data
              </a>
            </div>
          </div>

          {/* Desktop grid */}
          <div style={styles.responsiveGrid} className="responsiveGrid">
            {/* Overview card */}
            <div style={styles.card} className="card overview-card">
              <h2 style={styles.sectionTitle}>Overview</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }} className="overview-grid">
                {/* Left column: Basic fields */}
                <div>
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
                          if (id) {
                            return (
                              <Link
                                key={`sector-${id}`}
                                href={`/sector/${id}`}
                                style={styles.sectorTag}
                                onMouseEnter={(e) => {
                                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#e1bee7";
                                }}
                                onMouseLeave={(e) => {
                                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#f3e5f5";
                                }}
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
                          if (id) {
                            return (
                              <Link
                                key={`sub-sector-${id}`}
                                href={`/sub-sector/${id}`}
                                style={styles.sectorTag}
                                onMouseEnter={(e) => {
                                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#e1bee7";
                                }}
                                onMouseLeave={(e) => {
                                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#f3e5f5";
                                }}
                                prefetch={false}
                              >
                                {sector.sector_name}
                              </Link>
                            );
                          }
                          return (
                            <span
                              key={`sub-sector-${sector.sector_name}`}
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
                  {company.url ? (
                    <a
                      href={company.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.link}
                    >
                      {company.url}
                    </a>
                  ) : (
                    "Not available"
                  )}
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
                            <Link
                              href={`/company/${parentId}`}
                              style={styles.companyTag}
                              onMouseEnter={(e) => {
                                (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#c8e6c9";
                              }}
                              onMouseLeave={(e) => {
                                (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#e8f5e8";
                              }}
                              prefetch={false}
                            >
                              {parentName}
                            </Link>
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
                  {(() => {
                    // Prefer investors from Company._companies_investors (canonical for company page)
                    if (
                      Array.isArray(company._companies_investors) &&
                      company._companies_investors.length > 0
                    ) {
                      const list = company._companies_investors
                        .filter(
                          (inv) =>
                            inv &&
                            typeof inv.original_new_company_id === "number" &&
                            inv.company_name
                        )
                        .map((inv) => ({
                          id: inv.original_new_company_id,
                          name: inv.company_name,
                        }));

                      if (list.length > 0) {
                        return (
                          <div style={styles.tagContainer}>
                            {list.map((inv) => (
                              <Link
                                key={`company-investor-${inv.id}`}
                                href={`/investors/${inv.id}`}
                                style={styles.companyTag}
                                onMouseEnter={(e) => {
                                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#c8e6c9";
                                }}
                                onMouseLeave={(e) => {
                                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#e8f5e8";
                                }}
                                prefetch={false}
                              >
                                {inv.name}
                              </Link>
                            ))}
                          </div>
                        );
                      }
                    }

                    // Prefer investors from investors_data if available
                    if (parsedInvestorsData?.current && parsedInvestorsData.current.length > 0) {
                      const validInvestors = parsedInvestorsData.current.filter(
                        (investor) =>
                          investor &&
                          typeof investor.investor_id === "number" &&
                          investor.name
                      );
                      if (validInvestors.length > 0) {
                        return (
                          <div style={styles.tagContainer}>
                            {validInvestors.map((investor) => (
                              <Link
                                key={`investor-${investor.investor_id}`}
                                href={`/investors/${investor.investor_id}`}
                                style={styles.companyTag}
                                onMouseEnter={(e) => {
                                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#c8e6c9";
                                }}
                                onMouseLeave={(e) => {
                                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#e8f5e8";
                                }}
                                prefetch={false}
                              >
                                {investor.name}
                              </Link>
                            ))}
                          </div>
                        );
                      }
                    }
                    // Fallback to API investors
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
                                onMouseEnter={(e) => {
                                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#c8e6c9";
                                }}
                                onMouseLeave={(e) => {
                                  (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#e8f5e8";
                                }}
                                prefetch={false}
                              >
                                {investor.investor_name}
                              </Link>
                            ))}
                          </div>
                        );
                      }
                    }
                    return "Not available";
                  })()}
                </div>
              </div>
                </div>
                {/* Right column: Description */}
                <div style={{ 
                  padding: '16px', 
                  backgroundColor: '#f9fafb', 
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}>
                  <h3 style={{ 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: '#4a5568',
                    marginBottom: '12px',
                    marginTop: '0'
                  }}>
                    Description:
                  </h3>
                  <div style={{ 
                    fontSize: '14px', 
                    color: '#1a202c', 
                    lineHeight: '1.6' 
                  }}>
                    {company.description || "No description available"}
                  </div>
                </div>
              </div>
              {/* Management moved into Overview */}
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
                  
                  {/* Current Management */}
                  <div style={{ marginBottom: "20px" }}>
                    <IndividualCards
                      title="Current:"
                      individuals={(company.Managmant_Roles_current || []).map(
                        (person) => ({
                          id: person.id,
                          name: person.Individual_text,
                          jobTitles: (person.job_titles_id || [])
                            .map((job) => job?.job_title)
                            .filter(Boolean),
                          individualId: person.individuals_id,
                        })
                      )}
                      emptyMessage="Not available"
                    />
                  </div>

                  {/* Past Management */}
                  <div>
                    <IndividualCards
                      title="Past:"
                      individuals={(company.Managmant_Roles_past || []).map(
                        (person) => ({
                          id: person.id,
                          name: person.Individual_text,
                          jobTitles: (person.job_titles_id || [])
                            .map((job) => job?.job_title)
                            .filter(Boolean),
                          individualId: person.individuals_id,
                        })
                      )}
                      emptyMessage="Not available"
                    />
                  </div>
                </div>
              )}

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
                                fontWeight: "600",
                                color: "#4a5568",
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
                                {createClickableElement(
                                  `/company/${subsidiary.id}`,
                                  subsidiary.name
                                )}
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
                    gridTemplateColumns: "minmax(180px, 220px) 1fr",
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
                </div>
              )}
              {!hasIncomeStatementData && (
                <div style={styles.infoRow}>
                  <span style={styles.label}>Revenue (m):</span>
                  <span
                    style={styles.value}
                    title={
                      effectiveSourceLabel(
                        financialMetrics?.Revenue_source_label,
                        financialMetrics?.Rev_source
                      )
                        ? `Source: ${effectiveSourceLabel(
                            financialMetrics?.Revenue_source_label,
                            financialMetrics?.Rev_source
                          )}`
                        : undefined
                    }
                  >
                    {revenuePlain}
                  </span>
                </div>
              )}
              {!hasIncomeStatementData && (
                <div style={styles.infoRow}>
                  <span style={styles.label}>EBITDA (m):</span>
                  <span
                    style={styles.value}
                    title={
                      effectiveSourceLabel(
                        financialMetrics?.EBITDA_source_label,
                        financialMetrics?.EBITDA_source
                      )
                        ? `Source: ${effectiveSourceLabel(
                            financialMetrics?.EBITDA_source_label,
                            financialMetrics?.EBITDA_source
                          )}`
                        : undefined
                    }
                  >
                    {ebitdaPlain}
                  </span>
                </div>
              )}
              <div style={styles.infoRow}>
                <span style={styles.label}>Enterprise Value (m):</span>
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.EV_source_label,
                      financialMetrics?.EV_source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.EV_source_label,
                          financialMetrics?.EV_source
                        )}`
                      : undefined
                  }
                >
                  {evPlain}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Revenue multiple:</span>
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.Revenue_multiple_source_label,
                      financialMetrics?.Rev_x_source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.Revenue_multiple_source_label,
                          financialMetrics?.Rev_x_source
                        )}`
                      : undefined
                  }
                >
                  {formatMultiple(financialMetrics?.Revenue_multiple)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Revenue Growth:</span>
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.Rev_growth_source_label,
                      financialMetrics?.Rev_Growth_source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.Rev_growth_source_label,
                          financialMetrics?.Rev_Growth_source
                        )}`
                      : undefined
                  }
                >
                  {formatPercent(financialMetrics?.Rev_Growth_PC)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>EBITDA margin:</span>
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.EBITDA_margin_source_label,
                      financialMetrics?.EBITDA_margin_source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.EBITDA_margin_source_label,
                          financialMetrics?.EBITDA_margin_source
                        )}`
                      : undefined
                  }
                >
                  {formatPercent(financialMetrics?.EBITDA_margin)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Rule of 40:</span>
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.Rule_of_40_source_label,
                      financialMetrics?.Rule_of_40_source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.Rule_of_40_source_label,
                          financialMetrics?.Rule_of_40_source
                        )}`
                      : undefined
                  }
                >
                  {(() => {
                    const n = getNumeric(financialMetrics?.Rule_of_40);
                    return n !== undefined
                      ? Math.round(n).toLocaleString()
                      : "Not available";
                  })()}
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
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.ARR_source_label,
                      financialMetrics?.ARR_source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.ARR_source_label,
                          financialMetrics?.ARR_source
                        )}`
                      : undefined
                  }
                >
                  {formatPercent(financialMetrics?.ARR_pc)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>ARR (m):</span>
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.ARR_source_label,
                      financialMetrics?.ARR_source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.ARR_source_label,
                          financialMetrics?.ARR_source
                        )}`
                      : undefined
                  }
                >
                  {formatPlainNumber(financialMetrics?.ARR_m)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Churn:</span>
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.Churn_source_label,
                      financialMetrics?.Churn_Source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.Churn_source_label,
                          financialMetrics?.Churn_Source
                        )}`
                      : undefined
                  }
                >
                  {formatPercent(financialMetrics?.Churn_pc)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>GRR:</span>
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.GRR_source_label,
                      financialMetrics?.GRR_source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.GRR_source_label,
                          financialMetrics?.GRR_source
                        )}`
                      : undefined
                  }
                >
                  {formatPercent(financialMetrics?.GRR_pc)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Upsell:</span>
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.Upsell_source_label,
                      financialMetrics?.Upsell_source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.Upsell_source_label,
                          financialMetrics?.Upsell_source
                        )}`
                      : undefined
                  }
                >
                  {formatPercent(financialMetrics?.Upsell_pc)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Cross-sell:</span>
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.Cross_sell_source_label,
                      financialMetrics?.Cross_sell_source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.Cross_sell_source_label,
                          financialMetrics?.Cross_sell_source
                        )}`
                      : undefined
                  }
                >
                  {formatPercent(financialMetrics?.Cross_sell_pc)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Price increase:</span>
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.Price_increase_source_label,
                      financialMetrics?.Price_increase_source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.Price_increase_source_label,
                          financialMetrics?.Price_increase_source
                        )}`
                      : undefined
                  }
                >
                  {formatPercent(financialMetrics?.Price_increase_pc)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Revenue expansion:</span>
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.Rev_expansion_source_label,
                      financialMetrics?.Rev_expansion_source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.Rev_expansion_source_label,
                          financialMetrics?.Rev_expansion_source
                        )}`
                      : undefined
                  }
                >
                  {formatPercent(financialMetrics?.Rev_expansion_pc)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>NRR:</span>
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.NRR_source_label,
                      financialMetrics?.NRR_source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.NRR_source_label,
                          financialMetrics?.NRR_source
                        )}`
                      : undefined
                  }
                >
                  {formatPercent(financialMetrics?.NRR)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>New clients revenue growth:</span>
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.New_client_growth_source_label,
                      financialMetrics?.New_Client_Growth_Source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.New_client_growth_source_label,
                          financialMetrics?.New_Client_Growth_Source
                        )}`
                      : undefined
                  }
                >
                  {formatPercent(financialMetrics?.New_client_growth_pc)}
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
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.EBIT_source_label,
                      financialMetrics?.EBIT_source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.EBIT_source_label,
                          financialMetrics?.EBIT_source
                        )}`
                      : undefined
                  }
                >
                  {formatPlainNumber(financialMetrics?.EBIT_m)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Number of clients:</span>
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.No_of_Clients_source_label,
                      financialMetrics?.No_Clients_source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.No_of_Clients_source_label,
                          financialMetrics?.No_Clients_source
                        )}`
                      : undefined
                  }
                >
                  {typeof financialMetrics?.No_of_Clients === "number"
                    ? financialMetrics.No_of_Clients.toLocaleString()
                    : "Not available"}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Revenue per client:</span>
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.Rev_per_client_source_label,
                      financialMetrics?.Rev_per_client_source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.Rev_per_client_source_label,
                          financialMetrics?.Rev_per_client_source
                        )}`
                      : undefined
                  }
                >
                  {formatWholeNumber(financialMetrics?.Rev_per_client)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Number of employees:</span>
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.No_Employees_source_label,
                      financialMetrics?.No_Employees_source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.No_Employees_source_label,
                          financialMetrics?.No_Employees_source
                        )}`
                      : undefined
                  }
                >
                  {typeof financialMetrics?.No_Employees === "number"
                    ? financialMetrics.No_Employees.toLocaleString()
                    : formatNumber(currentEmployeeCount)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Revenue per employee:</span>
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.Revenue_per_employee_source_label,
                      financialMetrics?.Rev_per_employee_source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.Revenue_per_employee_source_label,
                          financialMetrics?.Rev_per_employee_source
                        )}`
                      : undefined
                  }
                >
                  {formatWholeNumber(financialMetrics?.Revenue_per_employee)}
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
            </div>

            {/* Market Overview removed */}
          </div>

          {/* Insights & Analysis - Full Width Section */}
          {(articlesLoading || companyArticles.length > 0) && (
            <div style={{ ...styles.card, marginTop: "24px" }}>
              <h2 style={styles.sectionTitle}>
                Insights & Analysis
              </h2>
              {articlesLoading ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "20px",
                    color: "#666",
                    fontSize: "14px",
                  }}
                >
                  Loading content...
                </div>
              ) : companyArticles.length > 0 ? (
                <div className="insights-grid">
                  {[...companyArticles]
                    .sort((a, b) => {
                      const dateA = a.Publication_Date
                        ? new Date(a.Publication_Date).getTime()
                        : 0;
                      const dateB = b.Publication_Date
                        ? new Date(b.Publication_Date).getTime()
                        : 0;
                      return dateB - dateA; // Most recent first (descending)
                    })
                    .map((article) => (
                      <InsightsAnalysisCard
                        key={article.id}
                        article={article}
                        showMeta={false}
                      />
                    ))}
                </div>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "20px",
                    color: "#666",
                    fontSize: "14px",
                  }}
                >
                  No related content found
                </div>
              )}
            </div>
          )}

          {/* Related Transactions - Full Width Section */}
          {(relatedTransactionsLoading || relatedTransactionEvents.length > 0) && (
            <div style={{ ...styles.card, marginTop: "24px" }}>
              <CorporateEventsSection
                title="Related Transactions"
                events={relatedTransactionEvents}
                loading={relatedTransactionsLoading}
                showSectors={false}
                maxInitialEvents={5}
                truncateDescriptionLength={180}
                hideWhenEmpty={true}
                titleStyle={styles.sectionTitle}
              />
            </div>
          )}

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
                    gridTemplateColumns: "minmax(180px, 220px) 1fr",
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
                </div>
              )}
              {!hasIncomeStatementData && (
                <div style={styles.infoRow}>
                  <span style={styles.label}>Revenue (m):</span>
                  <span
                    style={styles.value}
                    title={
                      effectiveSourceLabel(
                        financialMetrics?.Revenue_source_label,
                        financialMetrics?.Rev_source
                      )
                        ? `Source: ${effectiveSourceLabel(
                            financialMetrics?.Revenue_source_label,
                            financialMetrics?.Rev_source
                          )}`
                        : undefined
                    }
                  >
                    {revenuePlain}
                  </span>
                </div>
              )}
              {!hasIncomeStatementData && (
                <div style={styles.infoRow}>
                  <span style={styles.label}>EBITDA (m):</span>
                  <span
                    style={styles.value}
                    title={
                      effectiveSourceLabel(
                        financialMetrics?.EBITDA_source_label,
                        financialMetrics?.EBITDA_source
                      )
                        ? `Source: ${effectiveSourceLabel(
                            financialMetrics?.EBITDA_source_label,
                            financialMetrics?.EBITDA_source
                          )}`
                        : undefined
                    }
                  >
                    {ebitdaPlain}
                  </span>
                </div>
              )}
              <div style={styles.infoRow}>
                <span style={styles.label}>Enterprise Value (m):</span>
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.EV_source_label,
                      financialMetrics?.EV_source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.EV_source_label,
                          financialMetrics?.EV_source
                        )}`
                      : undefined
                  }
                >
                  {evPlain}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Revenue multiple:</span>
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.Revenue_multiple_source_label,
                      financialMetrics?.Rev_x_source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.Revenue_multiple_source_label,
                          financialMetrics?.Rev_x_source
                        )}`
                      : undefined
                  }
                >
                  {formatMultiple(financialMetrics?.Revenue_multiple)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Revenue Growth:</span>
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.Rev_growth_source_label,
                      financialMetrics?.Rev_Growth_source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.Rev_growth_source_label,
                          financialMetrics?.Rev_Growth_source
                        )}`
                      : undefined
                  }
                >
                  {formatPercent(financialMetrics?.Rev_Growth_PC)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>EBITDA margin:</span>
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.EBITDA_margin_source_label,
                      financialMetrics?.EBITDA_margin_source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.EBITDA_margin_source_label,
                          financialMetrics?.EBITDA_margin_source
                        )}`
                      : undefined
                  }
                >
                  {formatPercent(financialMetrics?.EBITDA_margin)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Rule of 40:</span>
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.Rule_of_40_source_label,
                      financialMetrics?.Rule_of_40_source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.Rule_of_40_source_label,
                          financialMetrics?.Rule_of_40_source
                        )}`
                      : undefined
                  }
                >
                  {(() => {
                    const n = getNumeric(financialMetrics?.Rule_of_40);
                    return n !== undefined
                      ? Math.round(n).toLocaleString()
                      : "Not available";
                  })()}
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
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.ARR_source_label,
                      financialMetrics?.ARR_source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.ARR_source_label,
                          financialMetrics?.ARR_source
                        )}`
                      : undefined
                  }
                >
                  {formatPercent(financialMetrics?.ARR_pc)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>ARR (m):</span>
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.ARR_source_label,
                      financialMetrics?.ARR_source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.ARR_source_label,
                          financialMetrics?.ARR_source
                        )}`
                      : undefined
                  }
                >
                  {formatPlainNumber(financialMetrics?.ARR_m)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Churn:</span>
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.Churn_source_label,
                      financialMetrics?.Churn_Source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.Churn_source_label,
                          financialMetrics?.Churn_Source
                        )}`
                      : undefined
                  }
                >
                  {formatPercent(financialMetrics?.Churn_pc)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>GRR:</span>
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.GRR_source_label,
                      financialMetrics?.GRR_source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.GRR_source_label,
                          financialMetrics?.GRR_source
                        )}`
                      : undefined
                  }
                >
                  {formatPercent(financialMetrics?.GRR_pc)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Upsell:</span>
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.Upsell_source_label,
                      financialMetrics?.Upsell_source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.Upsell_source_label,
                          financialMetrics?.Upsell_source
                        )}`
                      : undefined
                  }
                >
                  {formatPercent(financialMetrics?.Upsell_pc)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Cross-sell:</span>
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.Cross_sell_source_label,
                      financialMetrics?.Cross_sell_source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.Cross_sell_source_label,
                          financialMetrics?.Cross_sell_source
                        )}`
                      : undefined
                  }
                >
                  {formatPercent(financialMetrics?.Cross_sell_pc)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Price increase:</span>
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.Price_increase_source_label,
                      financialMetrics?.Price_increase_source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.Price_increase_source_label,
                          financialMetrics?.Price_increase_source
                        )}`
                      : undefined
                  }
                >
                  {formatPercent(financialMetrics?.Price_increase_pc)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Revenue expansion:</span>
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.Rev_expansion_source_label,
                      financialMetrics?.Rev_expansion_source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.Rev_expansion_source_label,
                          financialMetrics?.Rev_expansion_source
                        )}`
                      : undefined
                  }
                >
                  {formatPercent(financialMetrics?.Rev_expansion_pc)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>NRR:</span>
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.NRR_source_label,
                      financialMetrics?.NRR_source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.NRR_source_label,
                          financialMetrics?.NRR_source
                        )}`
                      : undefined
                  }
                >
                  {formatPercent(financialMetrics?.NRR)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>New clients revenue growth:</span>
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.New_client_growth_source_label,
                      financialMetrics?.New_Client_Growth_Source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.New_client_growth_source_label,
                          financialMetrics?.New_Client_Growth_Source
                        )}`
                      : undefined
                  }
                >
                  {formatPercent(financialMetrics?.New_client_growth_pc)}
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
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.EBIT_source_label,
                      financialMetrics?.EBIT_source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.EBIT_source_label,
                          financialMetrics?.EBIT_source
                        )}`
                      : undefined
                  }
                >
                  {formatPlainNumber(financialMetrics?.EBIT_m)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Number of clients:</span>
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.No_of_Clients_source_label,
                      financialMetrics?.No_Clients_source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.No_of_Clients_source_label,
                          financialMetrics?.No_Clients_source
                        )}`
                      : undefined
                  }
                >
                  {typeof financialMetrics?.No_of_Clients === "number"
                    ? financialMetrics.No_of_Clients.toLocaleString()
                    : "Not available"}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Revenue per client:</span>
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.Rev_per_client_source_label,
                      financialMetrics?.Rev_per_client_source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.Rev_per_client_source_label,
                          financialMetrics?.Rev_per_client_source
                        )}`
                      : undefined
                  }
                >
                  {formatWholeNumber(financialMetrics?.Rev_per_client)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Number of employees:</span>
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.No_Employees_source_label,
                      financialMetrics?.No_Employees_source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.No_Employees_source_label,
                          financialMetrics?.No_Employees_source
                        )}`
                      : undefined
                  }
                >
                  {typeof financialMetrics?.No_Employees === "number"
                    ? financialMetrics.No_Employees.toLocaleString()
                    : formatNumber(currentEmployeeCount)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Revenue per employee:</span>
                <span
                  style={styles.value}
                  title={
                    effectiveSourceLabel(
                      financialMetrics?.Revenue_per_employee_source_label,
                      financialMetrics?.Rev_per_employee_source
                    )
                      ? `Source: ${effectiveSourceLabel(
                          financialMetrics?.Revenue_per_employee_source_label,
                          financialMetrics?.Rev_per_employee_source
                        )}`
                      : undefined
                  }
                >
                  {formatWholeNumber(financialMetrics?.Revenue_per_employee)}
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


        </div>
        <style dangerouslySetInnerHTML={{ __html: responsiveCss }} />
      </main>
      <Footer />
    </div>
  );
};

export default CompanyDetail;
