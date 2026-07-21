"use client";

import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { resolveCompanyLogoSrc } from "@/lib/companyLogo";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FollowButton } from "@/components/FollowButton";
import {
  BellIcon,
  ArrowUpTrayIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { CorporateEventsProfilePanel } from "@/components/corporate-events/CorporateEventsProfilePanel";
import {
  SubsidiariesProfilePanel,
  parseLinkedInGrowthPctValue,
} from "@/components/subsidiaries/SubsidiariesProfilePanel";
import { fetchCompanyTableDataByIds } from "@/lib/companyTableData";
import {
  extractJobTitleStrings,
  getManagementRoleDisplayName,
} from "@/utils/individualHelpers";
import { COMPANIES_API_BASE } from "@/lib/companiesFilterPayload";
import {
  fetchCompanyLinkedIn,
  formatLinkedInEmployeeCountDate,
  mapLinkedInHistoryToTimeSeries,
  resolveLinkedInDisplayEmployeeCount,
  type CompanyLinkedInResponse,
} from "@/lib/companyLinkedIn";
import { useTimeSinceLastInvestment } from "@/hooks/useTimeSinceLastInvestment";
import { ManagementProfilePanel } from "@/components/company/ManagementProfilePanel";
import { ManagementCard } from "@/components/redesign/ManagementCard";
import { HeadcountCard } from "@/components/redesign/HeadcountCard";
import { OverviewCard } from "@/components/redesign/OverviewCard";
import { ProductAttributesCard } from "@/components/redesign/ProductAttributesCard";
import { InsightsCard } from "@/components/redesign/InsightsCard";
import { DescriptionCard } from "@/components/redesign/DescriptionCard";
import {
  ProductUsersListCard,
  type ProductUsersSection,
} from "@/components/redesign/ProductUsersListCard";
import {
  LinkPanel,
  descriptionBodyStyle,
  kvLabelStyle,
  kvValueStyle,
  FIN_METRIC_COMPACT_BODY_FONT_SIZE,
  FIN_METRIC_COMPACT_PERIOD_FONT_SIZE,
  FIN_METRIC_COMPACT_LABEL_COL_WIDTH,
  FIN_METRIC_SOURCE_COL_WIDTH,
} from "@/components/redesign/primitives";
import {
  FinMetricsIncomeCard,
  FinMetricsPrimaryCard,
  FinMetricsSecondaryCard,
} from "@/components/redesign/FinMetricsIncomeCard";
import { buildFinancialMetricsSections } from "@/lib/buildFinancialMetricsSections";
import { EMPTY_DISPLAY, isEmptyDisplayValue } from "@/lib/emptyDisplay";
import {
  buildSubsidiaryAcquisitionYearMap,
  type SubsidiaryAcquisitionEvent,
} from "@/lib/subsidiaryAcquisitionYears";
import { fetchCompanyCorporateEvents } from "@/lib/companyCorporateEvents";
import { buildSectorNameLookup } from "@/lib/sectorLinks";
import { useGlobalSectorNameLookup } from "@/hooks/useGlobalSectorNameLookup";
import {
  normalizeExternalProfileUrl,
  normalizeLinkedInProfileUrl,
} from "@/lib/linkedinUrl";
import { individualService } from "@/lib/individualService";
import { AIRiskCard } from "@/components/redesign/AIRiskCard";
import {
  fetchCompanyAiRisksV2,
  type CompanyAiRiskData,
} from "@/lib/companyAiRisks";
import { fetchCompanyProductUsers } from "@/lib/companyProductUsers";
import {
  isCompanyMcpPopulated,
  readCompanyMcpStatus,
} from "@/lib/companyMcp";
import { ContentArticle } from "@/types/insightsAnalysis";
import { parseInsightsArticlesPage } from "@/lib/sectorInsightsArticles";
// Investor classification rule constants (module scope; stable across renders)
const FINANCIAL_SERVICES_FOCUS_ID = 74;
const FINANCIAL_METRICS_EXPORT_SOURCE = "contribution_email";

type CompanyPdfExportType = "profile" | "financial_metrics";

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
  Subscription_revenue_pc?: number | null;
  Subscription_revenue_m?: number | null;
  Subscription_revenue_source_label?: string | null;
  Subscription_revenue_source?: number | string | null;
  Subscription_revenue_currency_display?: string | null;
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

/** One row from API `product_and_users` — segment → list of descriptive strings */
interface ProductAndUsersEntry {
  accounting_tax_firms?: unknown;
  corporate_tax_departments?: unknown;
  tax_attorneys?: unknown;
  financial_advisors_wealth_managers?: unknown;
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

type ManagementRoleRecord = {
  id: number;
  Individual_text?: string;
  advisor_individuals?: string;
  individuals_id: number;
  individual_id?: number;
  employee_new_company_id?: number;
  current_employer_url?: string;
  Status: string;
  job_titles_id?: unknown;
  job_titles?: unknown;
  linkedin_url?: string;
  linkedin_URL?: string;
  LinkedIn_URL?: string;
  _individuals?: { linkedin_URL?: string; LinkedIn_URL?: string };
  Individual?: { linkedin_URL?: string; LinkedIn_URL?: string };
};

function managementProfileUrlFromRole(
  person: ManagementRoleRecord,
  byIndividualId: Map<number, string>,
  fetchedLinkedInByIndividualId: Record<number, string>
): string | undefined {
  const fromRole =
    normalizeLinkedInProfileUrl(person.linkedin_url) ||
    normalizeLinkedInProfileUrl(person.linkedin_URL) ||
    normalizeLinkedInProfileUrl(person.LinkedIn_URL) ||
    normalizeLinkedInProfileUrl(person._individuals?.linkedin_URL) ||
    normalizeLinkedInProfileUrl(person._individuals?.LinkedIn_URL) ||
    normalizeLinkedInProfileUrl(person.Individual?.linkedin_URL) ||
    normalizeLinkedInProfileUrl(person.Individual?.LinkedIn_URL);
  if (fromRole) return fromRole;
  if (typeof person.individuals_id === "number") {
    const fromFetched = fetchedLinkedInByIndividualId[person.individuals_id];
    if (fromFetched) return fromFetched;
    const fromManagement = byIndividualId.get(person.individuals_id);
    if (fromManagement) return fromManagement;
  }
  return normalizeExternalProfileUrl(person.current_employer_url);
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
  sectors?: {
    Primary?: Array<{ id: number; name: string }>;
    Secondary?: Array<{ id: number; name: string }>;
  };
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
  /** LinkedIn 1y headcount growth % (root or Company). */
  linkedin_growth_1y_pct?: number | string | null;
  _companies_employees_count_monthly: EmployeeCount[];
  /** Root-level headcount history from get_company_profile (fallback when monthly array is empty) */
  employees_deduped?: EmployeeCount[];
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
      linkedin_growth_1y_pct?: number | string | null;
    }>;
  };
  Managmant_Roles_current?: ManagementRoleRecord[];
  Managmant_Roles_past?: ManagementRoleRecord[];
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
  /** Optional: end-user / buyer segments for Product & users card (flat list fallback) */
  product_users?: string[] | string | null;
  /** Optional: structured Product & users segments (accordion); merged from API root or Company */
  product_and_users?: ProductAndUsersEntry[];
  /** MCP server availability when API provides it */
  has_mcp?: boolean;
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
  has_mcp?: boolean;
  income_statement?: Array<{
    income_statements?: IncomeStatementEntry[] | string;
  }>;
  // Root-level new sectors data (alternate placement used by backend)
  new_sectors_data?: Array<{
    sectors_payload?: string | unknown;
  }>;
  /** Headcount history at API root (get_company_profile) */
  employees_deduped?: EmployeeCount[];
  product_and_users?: ProductAndUsersEntry[];
  Managmant_Roles_current?: ManagementRoleRecord[];
  Managmant_Roles_past?: ManagementRoleRecord[];
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
      linkedin_growth_1y_pct?: number | string | null;
    }>;
  };
}

type SubsidiariesBlock = NonNullable<Company["have_subsidiaries_companies"]>;
type SubsidiaryRecord = SubsidiariesBlock["Subsidiaries_companies"][number];

type RawSubsidiaryRecord = SubsidiaryRecord & {
  linkedin_data?: {
    LinkedIn_Employee?: number;
    linkedin_logo?: string;
    linkedin_growth_1y_pct?: number | string | null;
    LinkedIn_Growth_1y_Pct?: number | string | null;
  };
};

/** Normalize subsidiary shape from get_company_profile (linkedin_data vs legacy fields). */
function normalizeSubsidiaryRecord(sub: RawSubsidiaryRecord): SubsidiaryRecord {
  const ld = sub.linkedin_data;
  const legacy = sub._linkedin_data_of_new_company;
  const linkedin_employee =
    legacy?.linkedin_employee ??
    ld?.LinkedIn_Employee ??
    0;
  const linkedin_logo = legacy?.linkedin_logo || ld?.linkedin_logo || "";
  const linkedin_growth_1y_pct =
    sub.linkedin_growth_1y_pct ??
    ld?.linkedin_growth_1y_pct ??
    ld?.LinkedIn_Growth_1y_Pct ??
    null;

  return {
    ...sub,
    _linkedin_data_of_new_company: {
      linkedin_employee,
      linkedin_logo,
    },
    linkedin_growth_1y_pct,
  };
}

/** Merge subsidiary lists from Company + root so fields like `linkedin_growth_1y_pct` are kept. */
function mergeHaveSubsidiariesCompanies(
  fromCompany?: SubsidiariesBlock,
  fromRoot?: SubsidiariesBlock
): SubsidiariesBlock {
  const companyList = fromCompany?.Subsidiaries_companies ?? [];
  const rootList = fromRoot?.Subsidiaries_companies ?? [];
  if (companyList.length === 0 && rootList.length === 0) {
    return { have_subsidiaries_companies: false, Subsidiaries_companies: [] };
  }
  const byId = new Map<number, RawSubsidiaryRecord>();
  for (const s of rootList) {
    if (typeof s?.id === "number") byId.set(s.id, s as RawSubsidiaryRecord);
  }
  for (const s of companyList) {
    if (typeof s?.id === "number") {
      const prev = byId.get(s.id);
      byId.set(
        s.id,
        prev
          ? { ...prev, ...(s as RawSubsidiaryRecord) }
          : (s as RawSubsidiaryRecord)
      );
    }
  }
  const merged = Array.from(byId.values()).map(normalizeSubsidiaryRecord);
  return {
    have_subsidiaries_companies:
      Boolean(fromCompany?.have_subsidiaries_companies) ||
      Boolean(fromRoot?.have_subsidiaries_companies) ||
      merged.length > 0,
    Subsidiaries_companies: merged,
  };
}

/** get_company_profile subsidiaries omit YoY growth; batch-fetch from get_company_table_data. */
async function enrichSubsidiariesLinkedInGrowth(
  subsidiaries: SubsidiaryRecord[],
  token: string
): Promise<SubsidiaryRecord[]> {
  const ids = subsidiaries
    .map((s) => s.id)
    .filter((id) => typeof id === "number" && id > 0);
  if (ids.length === 0) return subsidiaries;

  const tableRows = await fetchCompanyTableDataByIds(ids, token);
  return subsidiaries.map((sub) => {
    const row = tableRows.get(sub.id);
    if (!row) return sub;
    const pct = parseLinkedInGrowthPctValue(row.linkedin_growth_1y_pct);
    if (pct === null) return sub;
    return { ...sub, linkedin_growth_1y_pct: pct };
  });
}

// Utility functions
// isNotAvailable no longer used in Financial Metrics rendering

// Normalize displays like "40 EUR" -> "EUR 40" and allow fallback currency
// normalizeCurrencyDisplay removed; we now show currency once in heading

const formatWholeNumber = (value?: number | string | null): string => {
  const n = getNumeric(value);
  if (n === undefined) return "-";
  return Math.round(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
};

// Plain number formatter (no currency, preserve decimals as given)
const formatPlainNumber = (value?: number | string | null): string => {
  if (value === undefined || value === null) return "-";
  if (typeof value === "number") {
    return value.toLocaleString("en-US", { maximumFractionDigits: 10 });
  }
  const trimmed = String(value).trim();
  if (trimmed.length === 0 || isEmptyDisplayValue(trimmed)) return "-";
  const num = Number(trimmed.replace(/,/g, ""));
  if (!Number.isFinite(num)) return "-";
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
const CE_PREVIEW_COUNT = 2;

// RANGE_DASH moved to InsightsCard component

const PRODUCT_USERS_ACCORDION_FIELDS: {
  key: keyof ProductAndUsersEntry;
  title: string;
}[] = [
  { key: "accounting_tax_firms", title: "Accounting & Tax Firms" },
  {
    key: "corporate_tax_departments",
    title: "Corporate Tax Departments",
  },
  { key: "tax_attorneys", title: "Tax Attorneys" },
  {
    key: "financial_advisors_wealth_managers",
    title: "Financial Advisors & Wealth Managers",
  },
];

function normalizeProductUsersStrings(v: unknown): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) {
    return v
      .map((x) => String(x ?? "").trim())
      .filter((s) => s.length > 0);
  }
  if (typeof v === "string") {
    const t = v.trim();
    return t ? [t] : [];
  }
  return [];
}

function buildProductUsersAccordionSections(
  company: Company
): ProductUsersSection[] {
  const raw = company.product_and_users;
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const merged: Partial<Record<keyof ProductAndUsersEntry, string[]>> = {};
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const entry = row as ProductAndUsersEntry;
    for (const { key } of PRODUCT_USERS_ACCORDION_FIELDS) {
      const part = normalizeProductUsersStrings(entry[key]);
      if (!merged[key]) merged[key] = [];
      merged[key]!.push(...part);
    }
  }
  return PRODUCT_USERS_ACCORDION_FIELDS.map(({ key, title }) => ({
    title,
    items: merged[key] ?? [],
  })).filter((s) => s.items.length > 0);
}

function buildCoreProductsSections(
  company: Company,
  caSections: ProductUsersSection[] | null
): ProductUsersSection[] {
  if (caSections && caSections.length > 0) return caSections;
  const accordion = buildProductUsersAccordionSections(company);
  if (accordion.length > 0) return accordion;
  const raw = company.product_users;
  const lines: string[] = [];
  if (Array.isArray(raw)) {
    lines.push(...raw.map((x) => String(x).trim()).filter(Boolean));
  } else if (typeof raw === "string" && raw.trim()) {
    try {
      const j = JSON.parse(raw) as unknown;
      if (Array.isArray(j)) {
        lines.push(...j.map((x) => String(x).trim()).filter(Boolean));
      }
    } catch {
      lines.push(
        ...raw
          .split(/[,;\n]/)
          .map((s) => s.trim())
          .filter(Boolean)
      );
    }
  }
  if (lines.length > 0) {
    return lines.map((title) => ({ title }));
  }
  return [];
}

// formatInsightBadgeLabel moved to InsightsCard component

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
        return `$${(v / 1_000_000_000).toFixed(1)}bn`;
      if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(0)}m`;
      if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
      return `$${v.toLocaleString("en-US")}`;
    }
    const s = String(v).trim();
    if (s.length > 0 && !isEmptyDisplayValue(s)) {
      return s.replace(/US\$\s*/gi, "$");
    }
  }
  return null;
}

/** Parse employee series date (full ISO or YYYY-MM buckets). */
function parseEmployeeSeriesDate(iso: string): number {
  const trimmed = String(iso ?? "").trim();
  if (!trimmed) return 0;
  const parsed = new Date(trimmed).getTime();
  if (!Number.isNaN(parsed)) return parsed;
  const [year, month, day] = trimmed.split("-").map((p) => parseInt(p, 10));
  if (Number.isFinite(year) && Number.isFinite(month)) {
    return new Date(year, month - 1, day || 1).getTime();
  }
  return 0;
}

/** Employee headcount history — root `employees_deduped` from get_company_profile. */
function resolveEmployeeTimeSeries(
  company: Pick<Company, "employees_deduped">
): EmployeeCount[] {
  const series = company.employees_deduped;
  if (!Array.isArray(series) || series.length === 0) return [];
  return [...series].sort(
    (a, b) => parseEmployeeSeriesDate(a.date) - parseEmployeeSeriesDate(b.date)
  );
}

/** Latest headcount from deduped series (most recent date). */
function resolveChartEmployeeCount(data: EmployeeCount[]): number {
  if (!Array.isArray(data) || data.length === 0) return 0;
  const sorted = [...data].sort(
    (a, b) => parseEmployeeSeriesDate(a.date) - parseEmployeeSeriesDate(b.date)
  );
  for (let i = sorted.length - 1; i >= 0; i--) {
    const count = sorted[i]?.employees_count;
    if (typeof count === "number" && count > 0) return count;
  }
  return sorted[sorted.length - 1]?.employees_count ?? 0;
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

/**
 * When merging API root + `Company`, root fields like `Data_Collection_Method: []`
 * are truthy in JS, so `root || company` incorrectly drops nested rows.
 * Prefer the first array with length > 0 or non-empty string; otherwise last defined.
 */
function firstNonEmptyStructuredField(
  ...candidates: unknown[]
): unknown {
  for (const c of candidates) {
    if (c == null) continue;
    if (Array.isArray(c) && c.length > 0) return c;
    if (typeof c === "string" && c.trim().length > 0) return c;
  }
  for (const c of candidates) {
    if (c != null) return c;
  }
  return undefined;
}

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
  if (n === undefined) return "-";
  return `${Math.round(n)}%`;
};

const formatMultiple = (value?: number | string | null): string => {
  const n = getNumeric(value);
  if (n === undefined) return "-";
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
  return resolved ?? "-";
};

// Removed short currency helper; we now display plain numbers

// Normalize various currency representations to a displayable 3-letter code
const normalizeCurrency = (candidate: unknown): string | undefined => {
  if (!candidate) return undefined;
  if (typeof candidate === "string") {
    const trimmed = candidate.trim();
    // If backend sent an id like "7", ignore it
    if (/^\d+$/.test(trimmed)) return undefined;
    const compact = trimmed.replace(/\s/g, "").toUpperCase();
    if (compact === "US$" || compact === "US") return "USD";
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

  return EMPTY_DISPLAY;
};

// Company Logo Component
const CompanyLogo = ({
  logo,
  fallbackLogo,
  name,
}: {
  logo?: string | null;
  fallbackLogo?: string | null;
  name: string;
}) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const candidates = useMemo(() => {
    const out: string[] = [];
    for (const raw of [logo, fallbackLogo]) {
      const resolved = resolveCompanyLogoSrc(raw);
      if (resolved && !out.includes(resolved)) out.push(resolved);
    }
    return out;
  }, [logo, fallbackLogo]);

  const src =
    candidates.find((candidate) => candidate !== failedSrc) ?? null;

  useEffect(() => {
    setFailedSrc(null);
  }, [candidates]);

  const logoStyle = {
    objectFit: "contain" as const,
    borderRadius: "8px",
    width: 80,
    height: 60,
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

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`${name} logo`}
        className="company-logo"
        style={logoStyle}
        onError={() => setFailedSrc(src)}
      />
    );
  }

  return <div style={placeholderStyle}>No Logo</div>;
};

// Main Company Detail Component
const CompanyDetail = () => {
  const params = useParams();
  const companyId = params.param as string;
  const {
    display: timeSinceLastInvestment,
    loading: timeSinceLastInvestmentLoading,
  } = useTimeSinceLastInvestment(companyId);
  const globalSectorNameToId = useGlobalSectorNameLookup();

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAllPrimarySectors, setShowAllPrimarySectors] = useState(false);
  const [showAllSecondarySectors, setShowAllSecondarySectors] = useState(false);
  const [corporateEvents, setCorporateEvents] = useState<
    CompanyCorporateEvent[]
  >([]);
  const [corporateEventsForSubsidiaries, setCorporateEventsForSubsidiaries] =
    useState<CompanyCorporateEvent[]>([]);
  const [corporateEventsLoading, setCorporateEventsLoading] = useState(false);
  const [cePage, setCePage] = useState(1);
  const [ceTotal, setCeTotal] = useState(0);
  const [ceTotalPages, setCeTotalPages] = useState(0);
  const [ceShowingFrom, setCeShowingFrom] = useState(0);
  const [ceShowingTo, setCeShowingTo] = useState(0);
  const [companyArticles, setCompanyArticles] = useState<ContentArticle[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [insightsPage, setInsightsPage] = useState(1);
  const [insightsTotal, setInsightsTotal] = useState(0);
  const [insightsShowingFrom, setInsightsShowingFrom] = useState(0);
  const [insightsShowingTo, setInsightsShowingTo] = useState(0);
  const [insightsHasNext, setInsightsHasNext] = useState(false);
  const [insightsHasPrev, setInsightsHasPrev] = useState(false);
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
  const [aiRiskData, setAiRiskData] = useState<CompanyAiRiskData | null>(null);
  const [productServicesData, setProductServicesData] = useState<ProductUsersSection[] | null>(null);
  const [usersUseCasesData, setUsersUseCasesData] = useState<ProductUsersSection[] | null>(null);
  // New investors from company_investors API endpoint
  const [apiInvestors, setApiInvestors] = useState<
    CompanyInvestorFromAPI[]
  >([]);
  const [apiInvestorsLoading, setApiInvestorsLoading] = useState(false);
  const [transactionStatusLabel, setTransactionStatusLabel] = useState<string>("");
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingPdfType, setExportingPdfType] =
    useState<CompanyPdfExportType | null>(null);
  const [showPdfExportOptions, setShowPdfExportOptions] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [rowOneCardHeight, setRowOneCardHeight] = useState(0);
  const [rowTwoCardHeight, setRowTwoCardHeight] = useState(0);
  const overviewGridRef = useRef<HTMLDivElement | null>(null);
  const descriptionGridRef = useRef<HTMLDivElement | null>(null);
  const descriptionRef = useRef<HTMLDivElement | null>(null);
  const insightsRowRef = useRef<HTMLDivElement | null>(null);
  const financeSecondaryRowRef = useRef<HTMLDivElement | null>(null);
  const financePrimaryGridRef = useRef<HTMLDivElement | null>(null);
  const profileFinancialsMobileRef = useRef<HTMLDivElement | null>(null);
  const [managementIndividualLinkedIn, setManagementIndividualLinkedIn] =
    useState<Record<number, string>>({});
  const [companyLinkedIn, setCompanyLinkedIn] =
    useState<CompanyLinkedInResponse | null>(null);
  const pdfExportMenuRef = useRef<HTMLDivElement | null>(null);

  const transactionStatusDisplayLabel = useMemo(() => {
    const raw = String(transactionStatusLabel || "").trim();
    if (!raw) return "";
    // Company page only: omit the leading "Transaction" and ensure "Anticipated" is capitalized.
    const withoutTransaction = raw.replace(/^transaction\s+/i, "");
    return withoutTransaction.replace(/^anticipated\b/i, "Anticipated");
  }, [transactionStatusLabel]);

  const managementLinkedInByIndividualId = useMemo(() => {
    const map = new Map<number, string>();
    const rows = [
      ...(company?.management_current || []),
      ...(company?.management_past || []),
    ];
    for (const row of rows) {
      const url = normalizeLinkedInProfileUrl(row.linkedin_url);
      const individualId = row.individual_id ?? row.id;
      if (url && typeof individualId === "number") {
        map.set(individualId, url);
      }
    }
    return map;
  }, [company?.management_current, company?.management_past]);

  useEffect(() => {
    const roles = [
      ...(company?.Managmant_Roles_current ?? []),
      ...(company?.Managmant_Roles_past ?? []),
    ];
    const ids = Array.from(
      new Set(
        roles
          .map((r) => r.individuals_id)
          .filter((id): id is number => typeof id === "number")
      )
    );
    if (ids.length === 0) {
      setManagementIndividualLinkedIn({});
      return;
    }

    let cancelled = false;
    void (async () => {
      const next: Record<number, string> = {};
      await Promise.all(
        ids.map(async (individualId) => {
          try {
            const data = await individualService.getIndividual(individualId);
            const url = normalizeLinkedInProfileUrl(
              data.Individual?.linkedin_URL
            );
            if (url) next[individualId] = url;
          } catch {
            // skip failed individual lookups
          }
        })
      );
      if (!cancelled) setManagementIndividualLinkedIn(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    company?.id,
    company?.Managmant_Roles_current,
    company?.Managmant_Roles_past,
  ]);

  const managementCurrentPeople = useMemo(
    () =>
      (company?.Managmant_Roles_current || []).map((person) => ({
        id: person.id,
        name: getManagementRoleDisplayName(person),
        role: extractJobTitleStrings(person.job_titles_id, person.job_titles).join(
          ", "
        ),
        individualId: person.individuals_id,
        linkedinUrl: managementProfileUrlFromRole(
          person,
          managementLinkedInByIndividualId,
          managementIndividualLinkedIn
        ),
      })),
    [company, managementLinkedInByIndividualId, managementIndividualLinkedIn]
  );

  const managementPastPeople = useMemo(
    () =>
      (company?.Managmant_Roles_past || []).map((person) => ({
        id: person.id,
        name: getManagementRoleDisplayName(person),
        role: extractJobTitleStrings(person.job_titles_id, person.job_titles).join(
          ", "
        ),
        individualId: person.individuals_id,
        linkedinUrl: managementProfileUrlFromRole(
          person,
          managementLinkedInByIndividualId,
          managementIndividualLinkedIn
        ),
      })),
    [company, managementLinkedInByIndividualId, managementIndividualLinkedIn]
  );

  const subsidiaryAcquisitionYearByCompanyId = useMemo(() => {
    if (!company?.id) return {} as Record<number, number>;
    const map = buildSubsidiaryAcquisitionYearMap(
      company.id,
      corporateEventsForSubsidiaries as SubsidiaryAcquisitionEvent[]
    );
    return Object.fromEntries(map) as Record<number, number>;
  }, [company?.id, corporateEventsForSubsidiaries]);

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


  const requestCompany = useCallback(
    async (id: string): Promise<CompanyResponse> => {
      const token = localStorage.getItem("asymmetrix_auth_token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const endpoint = `${COMPANIES_API_BASE}/Get_new_company/${id}`;

      const response = await fetch(endpoint, {
        method: "GET",
        headers,
        credentials: "include",
      });
      if (response.status === 401) {
        throw new Error("Authentication required");
      }
      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(
          `API request failed: ${response.status} ${response.statusText} ${errorText}`
        );
      }

      return (await Promise.race([
        response.json(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request timed out")), 20000)
        ),
      ])) as CompanyResponse;
    },
    []
  );


  // Fetch Asymmetrix content articles via public companies_articles endpoint
  const fetchCompanyArticles = useCallback(
    async (companyIdForContent: string | number, page = 1) => {
      if (companyIdForContent === undefined || companyIdForContent === null)
        return;
      setArticlesLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("new_company_id", String(companyIdForContent));
        params.append("page", String(page));
        params.append("per_page", String(INSIGHTS_PREVIEW_COUNT));
        const url = `${COMPANIES_API_BASE}/companies_articles?${params.toString()}`;
        const response = await fetch(url, { method: "GET" });
        if (!response.ok) {
          setCompanyArticles([]);
          setInsightsTotal(0);
          setInsightsShowingFrom(0);
          setInsightsShowingTo(0);
          setInsightsPage(1);
          setInsightsHasNext(false);
          setInsightsHasPrev(false);
        } else {
          const data = await response.json();
          const result = parseInsightsArticlesPage(
            data as ContentArticle[] | Record<string, unknown>,
            page,
            INSIGHTS_PREVIEW_COUNT
          );
          setCompanyArticles(result.articles);
          setInsightsTotal(result.total);
          setInsightsShowingFrom(result.showingFrom);
          setInsightsShowingTo(result.showingTo);
          setInsightsPage(result.page);
          setInsightsHasNext(result.hasNext);
          setInsightsHasPrev(result.hasPrev);
        }
      } catch {
        setCompanyArticles([]);
        setInsightsTotal(0);
        setInsightsShowingFrom(0);
        setInsightsShowingTo(0);
        setInsightsPage(1);
        setInsightsHasNext(false);
        setInsightsHasPrev(false);
      } finally {
        setArticlesLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    setInsightsPage(1);
    setCompanyArticles([]);
    setInsightsTotal(0);
    setInsightsShowingFrom(0);
    setInsightsShowingTo(0);
    setInsightsHasNext(false);
    setInsightsHasPrev(false);
  }, [company?.id]);

  /** Only render I&A when the company has linked articles. */
  const showInsights = insightsTotal > 0;

  const fetchCompanyCorporateEventsPage = useCallback(
    async (companyIdForEvents: string | number, page = 1) => {
      if (companyIdForEvents === undefined || companyIdForEvents === null) {
        return;
      }
      setCorporateEventsLoading(true);
      try {
        const data = await fetchCompanyCorporateEvents(
          companyIdForEvents,
          page,
          CE_PREVIEW_COUNT
        );
        if (!data) {
          setCorporateEvents([]);
          setCeTotal(0);
          setCeTotalPages(0);
          setCeShowingFrom(0);
          setCeShowingTo(0);
          setCePage(1);
          return;
        }
        setCorporateEvents(data.items as CompanyCorporateEvent[]);
        setCeTotal(data.total);
        setCeTotalPages(data.total_pages);
        setCeShowingFrom(data.showing_from);
        setCeShowingTo(data.showing_to);
        setCePage(data.page);

        if (page === 1 && data.total > 0) {
          const subsPageSize = Math.min(Math.max(data.total, 1), 100);
          if (subsPageSize > CE_PREVIEW_COUNT) {
            const allData = await fetchCompanyCorporateEvents(
              companyIdForEvents,
              1,
              subsPageSize
            );
            setCorporateEventsForSubsidiaries(
              (allData?.items ?? data.items) as CompanyCorporateEvent[]
            );
          } else {
            setCorporateEventsForSubsidiaries(
              data.items as CompanyCorporateEvent[]
            );
          }
        }
      } catch {
        setCorporateEvents([]);
        setCorporateEventsForSubsidiaries([]);
        setCeTotal(0);
        setCeTotalPages(0);
        setCeShowingFrom(0);
        setCeShowingTo(0);
        setCePage(1);
      } finally {
        setCorporateEventsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    setCePage(1);
    setCorporateEvents([]);
    setCorporateEventsForSubsidiaries([]);
    setCeTotal(0);
    setCeTotalPages(0);
    setCeShowingFrom(0);
    setCeShowingTo(0);
  }, [company?.id]);

  // Fetch financial metrics (auth required) with GET + POST fallbacks
  const fetchFinancialMetrics = useCallback(async (id: string | number) => {
    try {
      const token = localStorage.getItem("asymmetrix_auth_token");
      if (!token) {
        setFinancialMetrics(null);
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

      if (!res.ok) {
        setFinancialMetrics(null);
        return;
      }
      const data = await res.json();
      // API may return a single object or an array
      const payload: CompanyFinancialMetrics | null = Array.isArray(data)
        ? (data[0] as CompanyFinancialMetrics | undefined) || null
        : (data as CompanyFinancialMetrics);
      if (payload && typeof payload === "object") {
        setFinancialMetrics(payload);
      } else {
        setFinancialMetrics(null);
      }
    } catch {
      setFinancialMetrics(null);
    }
  }, []);

  const fetchCompanyAiRisksData = useCallback(async (id: string | number) => {
    setAiRiskData(null);
    try {
      const data = await fetchCompanyAiRisksV2(id);
      setAiRiskData(data);
    } catch (err) {
      console.error("Error fetching company AI risks:", err);
      setAiRiskData(null);
    }
  }, []);

  const fetchCompanyProductUsersData = useCallback(async (id: string | number) => {
    setProductServicesData(null);
    setUsersUseCasesData(null);
    try {
      const { products, users } = await fetchCompanyProductUsers(id);
      if (products.length > 0) setProductServicesData(products);
      if (users.length > 0) setUsersUseCasesData(users);
    } catch {
      // Non-fatal; fall back to static company payload
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

  const fetchCompanyTransactionStatus = useCallback(async (id: string | number) => {
    try {
      const params = new URLSearchParams();
      params.append("new_company_id", String(id));
      const res = await fetch(
        `${COMPANIES_API_BASE}/get_company_transaction_status?${params.toString()}`,
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
          // If the GET request failed, rethrow with a nicer message
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

        const mcpStatus = readCompanyMcpStatus(data.Company, data);

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
          Former_name: parseStructuredArray<string>(
            firstNonEmptyStructuredField(
              (data as unknown as { Former_name?: unknown })?.Former_name,
              (data as unknown as { former_names?: unknown })?.former_names,
              (data.Company as unknown as { Former_name?: unknown })
                ?.Former_name
            )
          ),
          // Merge Company + root subsidiary payloads (growth % may only exist on one).
          have_subsidiaries_companies: mergeHaveSubsidiariesCompanies(
            data.Company.have_subsidiaries_companies,
            data.have_subsidiaries_companies
          ),
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
          Product_Type: firstNonEmptyStructuredField(
            (data as { Product_Type?: CompanyProductTypeItem[] | string })
              .Product_Type,
            data.Company?.Product_Type
          ) as Company["Product_Type"],
          Data_Collection_Method: firstNonEmptyStructuredField(
            (
              data as {
                Data_Collection_Method?:
                  | CompanyDataCollectionMethodItem[]
                  | string;
              }
            ).Data_Collection_Method,
            (
              data.Company as {
                Data_Collection_Method?:
                  | CompanyDataCollectionMethodItem[]
                  | string;
              }
            )?.Data_Collection_Method
          ) as Company["Data_Collection_Method"],
          Revenue_Model_: firstNonEmptyStructuredField(
            (data as { Revenue_Model_?: CompanyRevenueModelItem[] | string })
              .Revenue_Model_,
            (data as { Revenue_Model?: CompanyRevenueModelItem[] | string })
              .Revenue_Model,
            data.Company?.Revenue_Model_,
            (data.Company as { Revenue_Model?: CompanyRevenueModelItem[] | string })
              ?.Revenue_Model
          ) as Company["Revenue_Model_"],
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
          ...(isCompanyMcpPopulated(mcpStatus) ? { has_mcp: mcpStatus } : {}),
          employees_deduped:
            (data as unknown as { employees_deduped?: EmployeeCount[] })
              .employees_deduped ??
            (
              data.Company as unknown as {
                employees_deduped?: EmployeeCount[];
              }
            )?.employees_deduped,
          linkedin_growth_1y_pct:
            (data as unknown as { linkedin_growth_1y_pct?: number | string })
              .linkedin_growth_1y_pct ??
            (
              data.Company as unknown as {
                linkedin_growth_1y_pct?: number | string;
              }
            )?.linkedin_growth_1y_pct,
          product_and_users: firstNonEmptyStructuredField(
            (data as unknown as { product_and_users?: ProductAndUsersEntry[] })
              .product_and_users,
            (
              data.Company as unknown as {
                product_and_users?: ProductAndUsersEntry[];
              }
            )?.product_and_users
          ) as Company["product_and_users"],
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

        setCompany(enrichedCompany);

        const token = localStorage.getItem("asymmetrix_auth_token");
        const initialSubs =
          enrichedCompany.have_subsidiaries_companies?.Subsidiaries_companies ??
          [];
        if (token && initialSubs.length > 0) {
          void enrichSubsidiariesLinkedInGrowth(initialSubs, token)
            .then((enrichedSubs) => {
              setCompany((prev) => {
                if (!prev?.have_subsidiaries_companies) return prev;
                return {
                  ...prev,
                  have_subsidiaries_companies: {
                    ...prev.have_subsidiaries_companies,
                    Subsidiaries_companies: enrichedSubs,
                  },
                };
              });
            })
            .catch((err) => {
              console.warn("[subsidiaries] linkedin growth enrich failed:", err);
            });
        }

        // Trigger fetching related articles + corporate events (requires auth)
        if (enrichedCompany?.id) {
          fetchCompanyArticles(enrichedCompany.id);
          void fetchCompanyCorporateEventsPage(enrichedCompany.id, 1);
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
      setFinancialMetrics(null);
      fetchCompanyData();
      fetchFinancialMetrics(companyId);
      fetchCompanyInvestors(companyId);
      fetchCompanyTransactionStatus(companyId);
      fetchCompanyAiRisksData(companyId);
      fetchCompanyProductUsersData(companyId);

      setCompanyLinkedIn(null);
      void (async () => {
        try {
          const token = localStorage.getItem("asymmetrix_auth_token");
          const data = await fetchCompanyLinkedIn(companyId, token);
          setCompanyLinkedIn(data);
        } catch (err) {
          console.warn("Failed to fetch company LinkedIn data:", err);
        }
      })();
    }
  }, [
    companyId,
    fetchCompanyArticles,
    requestCompany,
    fetchFinancialMetrics,
    fetchCompanyInvestors,
    fetchCompanyTransactionStatus,
    fetchCompanyAiRisksData,
    fetchCompanyProductUsersData,
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


  useEffect(() => {
    setIsDescriptionExpanded(false);
  }, [company?.description]);

  const rowOneHeightStyle = useMemo((): React.CSSProperties => {
    if (rowOneCardHeight <= 0) return {};
    return {
      height: rowOneCardHeight,
      minHeight: rowOneCardHeight,
      maxHeight: rowOneCardHeight,
    };
  }, [rowOneCardHeight]);

  // Lock Overview + Description + Financial Metrics to the same height (driven by Overview / Finance, not description text)
  useEffect(() => {
    setRowOneCardHeight(0);
  }, [
    company?.id,
    financialMetrics,
    transactionStatusDisplayLabel,
    apiInvestorsLoading,
    company?.have_parent_company,
  ]);

  useEffect(() => {
    if (!isDescriptionExpanded) {
      setRowOneCardHeight(0);
    }
  }, [isDescriptionExpanded]);

  useLayoutEffect(() => {
    if (isDescriptionExpanded || rowOneCardHeight !== 0) return;

    const overviewEl = overviewGridRef.current;
    const financeEl = financePrimaryGridRef.current;
    const descEl = descriptionGridRef.current;
    if (!overviewEl || !financeEl || typeof ResizeObserver === "undefined") {
      return;
    }

    const measure = () => {
      const prevDisplay = descEl?.style.display ?? "";
      if (descEl) descEl.style.display = "none";
      const max = Math.max(overviewEl.offsetHeight, financeEl.offsetHeight);
      if (descEl) descEl.style.display = prevDisplay;
      if (max > 0) setRowOneCardHeight(max);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(overviewEl);
    ro.observe(financeEl);
    return () => ro.disconnect();
  }, [
    rowOneCardHeight,
    isDescriptionExpanded,
    company?.id,
    financialMetrics,
    transactionStatusDisplayLabel,
    apiInvestorsLoading,
    company?.have_parent_company,
  ]);

  // Match Insights + Subscription/Other metrics to the taller card's natural content height
  useEffect(() => {
    setRowTwoCardHeight(0);
  }, [
    company?.id,
    showInsights,
    articlesLoading,
    companyArticles.length,
    insightsPage,
    financialMetrics,
  ]);

  useEffect(() => {
    if (!showInsights || rowTwoCardHeight !== 0) return;

    const insightsEl = insightsRowRef.current;
    const financeEl = financeSecondaryRowRef.current;
    if (!insightsEl || !financeEl || typeof ResizeObserver === "undefined") {
      return;
    }

    const measure = () => {
      const max = Math.max(insightsEl.offsetHeight, financeEl.offsetHeight);
      if (max > 0) setRowTwoCardHeight(max);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(insightsEl);
    ro.observe(financeEl);
    return () => ro.disconnect();
  }, [
    rowTwoCardHeight,
    showInsights,
    company?.id,
    articlesLoading,
    companyArticles.length,
    insightsPage,
    financialMetrics,
  ]);

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
            version: "v2",
            company_name: company.name,
            financial_metrics_period: financialMetricsPeriod,
            financial_metrics_year: financialMetricsYear,
            source: FINANCIAL_METRICS_EXPORT_SOURCE,
          }
        : { company_id: company.id, version: "v2" };
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

  const linkedinUrl = normalizeLinkedInProfileUrl(
    companyLinkedIn?.profile?.linkedin_url ?? company.linkedin_data?.LinkedIn_URL
  );

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

  const corporateEventPrimarySectorsByCompanyId: Record<number, CompanySector[]> =
    (() => {
      const map: Record<number, CompanySector[]> = {};
      if (company?.id && augmentedPrimarySectors.length > 0) {
        map[company.id] = augmentedPrimarySectors;
      }
      const subsidiaries =
        company?.have_subsidiaries_companies?.Subsidiaries_companies ?? [];
      for (const sub of subsidiaries) {
        if (!sub?.id || !Array.isArray(sub.sectors_id)) continue;
        const primaries = (
          sub.sectors_id as Array<{
            sector_name?: string;
            Sector_importance?: string;
            sector_id?: number;
            id?: number;
          }>
        )
          .filter((s) => {
            const importance = String(s?.Sector_importance ?? "Primary").trim();
            return importance === "Primary" && Boolean(s?.sector_name);
          })
          .map((s) => ({
            sector_name: String(s.sector_name).trim(),
            Sector_importance: "Primary" as const,
            sector_id: getSectorId(s) ?? 0,
          }))
          .filter((s) => Boolean(s.sector_name));
        if (primaries.length > 0) map[sub.id] = primaries;
      }
      return map;
    })();

  const sectorNameToId = (() => {
    const lookup = { ...globalSectorNameToId };
    Object.assign(
      lookup,
      buildSectorNameLookup([
        ...augmentedPrimarySectors,
        ...secondarySectors,
      ])
    );
    const subsidiaries =
      company?.have_subsidiaries_companies?.Subsidiaries_companies ?? [];
    for (const sub of subsidiaries) {
      if (!Array.isArray(sub.sectors_id)) continue;
      Object.assign(lookup, buildSectorNameLookup(sub.sectors_id));
    }
    return lookup;
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
  // Use revenue currency if valid; otherwise fall back to EV currency (income statement only)
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

  const revenuePlain = formatPlainNumber(financialMetrics?.Revenue_m);
  const ebitdaPlain = formatPlainNumber(financialMetrics?.EBITDA_m);
  const evPlain = formatPlainNumber(financialMetrics?.EV);

  // Currency suffix to show once in heading (from company_financial_metrics only)
  const metricsCurrencyCode =
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
    normalizeCurrency(
      (financialMetrics as unknown as { _currency?: { Currency?: string } })
        ?._currency
    ) ||
    normalizeCurrency(financialMetrics?.Rev_Currency) ||
    normalizeCurrency(financialMetrics?.EBITDA_currency) ||
    normalizeCurrency(financialMetrics?.EV_currency) ||
    normalizeCurrency(financialMetrics?.EBIT_currency) ||
    undefined;
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
      // Sort ascending by period_end_date; take the 3 most recent for display
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
      return da - db;
    })
    .slice(-3);

  // Show Income Statement only if there is at least one numeric value
  const hasIncomeStatementData =
    isPublicOwnership &&
    normalizedIncomeStatements.some(
      (row) =>
        typeof row.revenue === "number" ||
        typeof row.ebit === "number" ||
        typeof row.ebitda === "number"
    );

  const employeeData =
    companyLinkedIn?.employee_history && companyLinkedIn.employee_history.length > 0
      ? mapLinkedInHistoryToTimeSeries(companyLinkedIn.employee_history)
      : resolveEmployeeTimeSeries(company);
  const currentEmployeeCount = resolveLinkedInDisplayEmployeeCount(
    companyLinkedIn,
    resolveChartEmployeeCount(employeeData)
  );

  const employeeCountAsOf =
    formatLinkedInEmployeeCountDate(
      companyLinkedIn?.profile?.employee_count_date
    ) ??
    (() => {
      const latest = employeeData[employeeData.length - 1];
      if (!latest?.date) return undefined;
      return formatLinkedInEmployeeCountDate(latest.date);
    })();

  const finMetricsData = buildFinancialMetricsSections({
    financialMetrics,
    hasIncomeStatementData,
    revenuePlain,
    ebitdaPlain,
    evPlain,
    currencyCode: metricsCurrencyCode,
    getSourceText,
    formatPercent,
    formatMultiple,
    formatPlainNumber,
    formatWholeNumber,
    getNumeric,
    periodDisplay: financialMetricsPeriodDisplay || undefined,
  });

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
    if (typeof currentEmployeeCount === "number" && currentEmployeeCount > 0) {
      return currentEmployeeCount;
    }
    if (
      typeof fmEmployeeHeadcount === "number" &&
      fmEmployeeHeadcount > 0
    ) {
      return fmEmployeeHeadcount;
    }
    return null;
  })();

  const overviewEmployeesYoY = (() => {
    const direct = company.employees_yoy_pct;
    if (typeof direct === "number" && Number.isFinite(direct)) {
      const rounded = Math.round(direct * 10) / 10;
      return `${rounded >= 0 ? "+" : ""}${rounded}% YoY`;
    }
    const liGrowth = parseLinkedInGrowthPctValue(
      companyLinkedIn?.growth_1y_pct ?? company.linkedin_growth_1y_pct
    );
    if (liGrowth !== null) {
      const rounded = Math.round(liGrowth * 10) / 10;
      return `${rounded >= 0 ? "+" : ""}${rounded}% YoY`;
    }
    return computeEmployeeYoYFromMonthly(employeeData);
  })();

  // Market Overview removed: no TradingView symbols computation

  const formerNameDisplay = (() => {
    const names = parseStructuredArray<string>(company?.Former_name).filter(
      (v) => typeof v === "string" && v.trim().length > 0
    );
    return names.length > 0 ? names.join(", ") : null;
  })();

  const productTypeRows = parseStructuredArray<CompanyProductTypeItem>(
    company.Product_Type
  )
    .map((item) => ({
      label: String(item?.Product_Type || "").trim(),
      // If percentage is missing, leave the cell empty instead of showing "-"
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
      }))
      .filter((item) => item.label);

  const revenueModelRows = parseStructuredArray<CompanyRevenueModelItem>(
    company.Revenue_Model_ ??
      (company as { Revenue_Model?: CompanyRevenueModelItem[] | string })
        .Revenue_Model
  )
    .map((item) => ({
      label: String(item?.Revenue_Model_ || "").trim(),
      value: String(item?.Predominance || "").trim(),
    }))
    .filter((item) => item.label);

  const tickerDisplay = company.ticker && company.exchange
    ? `${company.exchange}: ${company.ticker}`
    : company.ticker || null;

  const canInsightPrev = insightsHasPrev;
  const canInsightNext = insightsHasNext;
  const canCePrev = ceTotal > 0 && cePage > 1;
  const canCeNext = ceTotal > 0 && cePage < ceTotalPages;

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
    sans:    'var(--font-geist-sans, "Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif)',
    mono:    'var(--font-geist-mono, "Geist Mono", ui-monospace, "SF Mono", Menlo, monospace)',
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
      gap: "12px",
    },
    headerLeft: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
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
    finInfoRow: {
      display: "grid",
      gridTemplateColumns: "minmax(180px, 220px) 1fr auto",
      columnGap: "4px",
      alignItems: "center",
      padding: "10px 0",
      borderBottom: `1px solid ${T.hair}`,
      fontSize: "12.5px",
    },
    finSourceValue: {
      fontSize: "11px",
      color: T.muted,
      textAlign: "right" as const,
      whiteSpace: "nowrap" as const,
      paddingLeft: "8px",
    },
    infoRow: {
      display: "grid",
      gridTemplateColumns: "120px 1fr",
      columnGap: "10px",
      alignItems: "start",
      padding: "7px 0",
      borderBottom: `1px solid ${T.hair}`,
    },
    infoRowLast: {
      display: "grid",
      gridTemplateColumns: "120px 1fr",
      columnGap: "10px",
      alignItems: "flex-start",
      padding: "7px 0",
      borderBottom: "none",
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
      ...kvLabelStyle,
    },
    value: {
      ...kvValueStyle,
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
      ...descriptionBodyStyle,
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
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      gap: "12px",
      flex: "1",
      maxWidth: "100%",
      overflow: "hidden",
      alignItems: "stretch",
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
        ...kvLabelStyle,
        minWidth: "auto",
        marginBottom: "1px",
      },
      value: {
        ...kvValueStyle,
        textAlign: "left",
        marginLeft: "0",
        wordBreak: "break-word" as const,
        overflowWrap: "break-word" as const,
        width: "100%",
      },
      description: {
        ...descriptionBodyStyle,
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

  const coreProductsSections = buildCoreProductsSections(
    company,
    productServicesData
  );
  const usersUseCaseSections = usersUseCasesData ?? [];

  const productTypeBarRows = productTypeRows.map((row, i) => {
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
        });

  const productDataToggleDataRows = dataCollectionMethodRows;

  const companyMcpStatus = readCompanyMcpStatus(company);
  const showCompanyMcp = isCompanyMcpPopulated(companyMcpStatus);

  /** Dynamic grid rows — cards pack upward when optional sections are hidden */
  const PRODUCT_ROW_START = showInsights ? 3 : 2;
  /** Col 3 row 2 is always subscription/other metrics; headcount stacks below. */
  const FINANCE_SECONDARY_ROW = 2;
  const rightRailHeadcountRow = showInsights
    ? PRODUCT_ROW_START
    : FINANCE_SECONDARY_ROW + 1;
  const showProductType = productTypeRows.length > 0 || showCompanyMcp;
  const showRevenueModel = revenueModelRows.length > 0;
  const showCoreProducts =
    coreProductsSections.length > 0 || usersUseCaseSections.length > 0;
  const showDataCollection = dataCollectionMethodRows.length > 0;
  const showProductAttributes =
    showProductType || showRevenueModel || showDataCollection;
  const showAiRisk = aiRiskData != null && aiRiskData.axes.length > 0;
  const showCorporateEvents =
    corporateEventsLoading || ceTotal > 0 || corporateEvents.length > 0;

  let productMixGridRow = 0;
  let productMixGridSpan = 1;
  let coreProductsGridRow = 0;
  let coreProductsGridSpan = 1;
  let headcountGridRow = 0;
  let managementGridRow = 0;
  let corporateEventsGridRow = 0;
  let subsidiariesGridRow = 0;

  if (showAiRisk) {
    const col1Stack = showProductAttributes ? 1 : 0;
    const col2Stack = showCoreProducts ? 1 : 0;
    const productZoneHeight = Math.max(col1Stack, col2Stack, 2);
    const wideSectionStartRow = PRODUCT_ROW_START + productZoneHeight;

    productMixGridRow = showProductAttributes ? PRODUCT_ROW_START : 0;
    productMixGridSpan = showProductAttributes ? productZoneHeight : 1;
    coreProductsGridRow = showCoreProducts ? PRODUCT_ROW_START : 0;
    coreProductsGridSpan = showCoreProducts ? productZoneHeight : 1;
    headcountGridRow = Math.max(wideSectionStartRow, rightRailHeadcountRow);
    managementGridRow = hasManagement ? headcountGridRow + 1 : 0;
    corporateEventsGridRow = showCorporateEvents ? wideSectionStartRow : 0;
    subsidiariesGridRow = hasSubsidiaries
      ? wideSectionStartRow + (showCorporateEvents ? 1 : 0)
      : 0;
  } else {
    const leftTopStack = Math.max(
      showProductAttributes ? 1 : 0,
      showCoreProducts ? 1 : 0
    );
    const wideSectionStartRow = PRODUCT_ROW_START + leftTopStack;

    productMixGridRow = showProductAttributes ? PRODUCT_ROW_START : 0;
    productMixGridSpan = 1;
    coreProductsGridRow = showCoreProducts ? PRODUCT_ROW_START : 0;
    coreProductsGridSpan = 1;
    headcountGridRow = rightRailHeadcountRow;
    managementGridRow = hasManagement ? rightRailHeadcountRow + 1 : 0;
    corporateEventsGridRow = showCorporateEvents ? wideSectionStartRow : 0;
    subsidiariesGridRow = hasSubsidiaries
      ? wideSectionStartRow + (showCorporateEvents ? 1 : 0)
      : 0;
  }

  const responsiveCss = `
    .company-detail-page { overflow-x: hidden; }
    .responsiveGrid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      max-width: 100%;
      align-items: stretch;
    }
    .responsiveGrid > * { min-width: 0; min-height: 0; }
    .company-grid-overview {
      grid-column: 1;
      grid-row: 1;
      min-height: 0;
      align-self: stretch;
      display: flex;
      flex-direction: column;
    }
    .company-grid-description {
      grid-column: 2;
      grid-row: 1;
      min-height: 0;
      align-self: stretch;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .company-grid-finance-primary {
      grid-column: 3;
      grid-row: 1;
      min-width: 0;
      min-height: 0;
      display: flex;
      flex-direction: column;
      align-self: stretch;
    }
    .company-grid-finance-secondary {
      grid-column: 3;
      grid-row: ${FINANCE_SECONDARY_ROW};
      min-width: 0;
      min-height: 0;
      display: flex;
      flex-direction: column;
      align-self: start;
    }
    .company-grid-insights {
      grid-column: 1 / span 2;
      grid-row: 2;
      min-height: 0;
      align-self: start;
      display: flex;
      flex-direction: column;
    }
    .company-grid-product-mix { grid-column: 1; grid-row: ${productMixGridRow} / span ${productMixGridSpan}; min-width: 0; min-height: 0; align-self: stretch; display: flex; flex-direction: column; justify-content: flex-start; }
    .company-grid-product-users { grid-column: 2; grid-row: ${coreProductsGridRow} / span ${coreProductsGridSpan}; min-width: 0; min-height: 0; align-self: stretch; display: flex; flex-direction: column; }
    .company-grid-ai-risk { grid-column: 3; grid-row: ${PRODUCT_ROW_START} / span 2; min-width: 0; min-height: 0; align-self: stretch; display: flex; flex-direction: column; }
    .company-grid-corporate-events,
    .company-grid-subsidiaries,
    .company-grid-headcount,
    .company-grid-management {
      min-width: 0;
      min-height: 0;
      align-self: stretch;
      display: flex;
      flex-direction: column;
    }
    .company-grid-corporate-events { grid-column: 1 / span 2; grid-row: ${corporateEventsGridRow}; overflow: hidden; max-width: 100%; }
    .company-grid-subsidiaries { grid-column: 1 / span 2; grid-row: ${subsidiariesGridRow}; overflow: hidden; max-width: 100%; }
    .company-grid-corporate-events > *,
    .company-grid-subsidiaries > * {
      min-width: 0;
      max-width: 100%;
      width: 100%;
    }
    .company-grid-headcount { grid-column: 3; grid-row: ${headcountGridRow}; }
    .company-grid-management { grid-column: 3; grid-row: ${managementGridRow}; }
    .card {
      background: ${T.panel};
      border-radius: ${T.rLg}px;
      min-width: 0;
      border: 1px solid ${T.divider};
      transition: box-shadow 160ms ease, border-color 160ms ease;
    }
    .card:hover,
    .v3-finance-tabbed-card:hover,
    .management-v3-card:hover {
      border-color: oklch(58% 0.16 258 / 0.42);
      box-shadow: 0 8px 28px oklch(54% 0.18 258 / 0.14);
      z-index: 1;
    }
    .v3-finance-tabbed-card,
    .management-v3-card {
      transition: box-shadow 160ms ease, border-color 160ms ease;
    }
    /* insights-summary-card grid-column set via inline style */
    .transaction-status-pill {
      display: inline-flex;
      align-items: center;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 100%;
    }
    /* overview-card now uses OverviewCard component — legacy overrides removed */
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
    /* Financial Metrics rows aligned with Overview KV layout */
    .fin-tab-scroll::-webkit-scrollbar {
      display: none;
    }
    .desktop-financial-metrics .info-row:not(.income-statement-row) > :nth-child(2),
    .desktop-financial-metrics .fin-metric-period-header > :nth-child(2),
    .mobile-financial-metrics .info-row:not(.income-statement-row) > :nth-child(2),
    .mobile-financial-metrics .fin-metric-period-header > :nth-child(2) {
      min-width: 0;
      text-align: center !important;
      justify-self: center !important;
      width: 100%;
    }
    /* Shared fin-metrics grid + period headers (both cards align when stacked) */
    .company-grid-finance-primary.desktop-financial-metrics .info-row:not(.income-statement-row):not(.fin-metric-period-header),
    .company-grid-finance-secondary.desktop-financial-metrics .info-row:not(.income-statement-row):not(.fin-metric-period-header),
    .mobile-financial-metrics .fin-metrics-card--primary .info-row:not(.income-statement-row):not(.fin-metric-period-header),
    .mobile-financial-metrics .fin-metrics-card--secondary .info-row:not(.income-statement-row):not(.fin-metric-period-header) {
      padding: 4px 0 !important;
      grid-template-columns: ${FIN_METRIC_COMPACT_LABEL_COL_WIDTH}px 1fr ${FIN_METRIC_SOURCE_COL_WIDTH}px !important;
      column-gap: 8px !important;
      align-items: center !important;
    }
    .company-grid-finance-primary.desktop-financial-metrics .fin-metric-period-header,
    .company-grid-finance-secondary.desktop-financial-metrics .fin-metric-period-header,
    .mobile-financial-metrics .fin-metrics-card--primary .fin-metric-period-header,
    .mobile-financial-metrics .fin-metrics-card--secondary .fin-metric-period-header {
      padding: 6px 14px 4px !important;
      grid-template-columns: ${FIN_METRIC_COMPACT_LABEL_COL_WIDTH}px 1fr ${FIN_METRIC_SOURCE_COL_WIDTH}px !important;
      column-gap: 8px !important;
      align-items: center !important;
    }
    .company-grid-finance-primary.desktop-financial-metrics .fin-metric-period-header > :nth-child(2),
    .company-grid-finance-primary.desktop-financial-metrics .fin-metric-period-col,
    .company-grid-finance-secondary.desktop-financial-metrics .fin-metric-period-header > :nth-child(2),
    .company-grid-finance-secondary.desktop-financial-metrics .fin-metric-period-col,
    .mobile-financial-metrics .fin-metrics-card--primary .fin-metric-period-header > :nth-child(2),
    .mobile-financial-metrics .fin-metrics-card--primary .fin-metric-period-col,
    .mobile-financial-metrics .fin-metrics-card--secondary .fin-metric-period-header > :nth-child(2),
    .mobile-financial-metrics .fin-metrics-card--secondary .fin-metric-period-col {
      font-family: ${T.sans} !important;
      font-size: ${FIN_METRIC_COMPACT_PERIOD_FONT_SIZE}px !important;
      line-height: 1.4 !important;
      font-weight: 500 !important;
      color: ${T.muted} !important;
      letter-spacing: 0.35px !important;
      text-transform: uppercase !important;
    }
    .company-grid-finance-primary.desktop-financial-metrics .fin-metric-period-header > :nth-child(3),
    .company-grid-finance-primary.desktop-financial-metrics .fin-metric-period-source-col,
    .company-grid-finance-secondary.desktop-financial-metrics .fin-metric-period-header > :nth-child(3),
    .company-grid-finance-secondary.desktop-financial-metrics .fin-metric-period-source-col,
    .mobile-financial-metrics .fin-metrics-card--primary .fin-metric-period-header > :nth-child(3),
    .mobile-financial-metrics .fin-metrics-card--primary .fin-metric-period-source-col,
    .mobile-financial-metrics .fin-metrics-card--secondary .fin-metric-period-header > :nth-child(3),
    .mobile-financial-metrics .fin-metrics-card--secondary .fin-metric-period-source-col {
      font-family: ${T.sans} !important;
      font-size: ${FIN_METRIC_COMPACT_PERIOD_FONT_SIZE}px !important;
      line-height: 1.4 !important;
      font-weight: 500 !important;
      color: ${T.muted} !important;
      letter-spacing: 0.35px !important;
      text-transform: uppercase !important;
      text-align: center !important;
      justify-self: stretch !important;
      width: 100% !important;
      min-width: 0 !important;
    }
    /* Shared fin-metrics row typography (Financial + Subscription cards) */
    .company-grid-finance-primary.desktop-financial-metrics .info-row:not(.fin-metric-period-header) .fin-metric-value,
    .company-grid-finance-secondary.desktop-financial-metrics .info-row:not(.fin-metric-period-header) .fin-metric-value,
    .mobile-financial-metrics .fin-metrics-card--primary .info-row:not(.fin-metric-period-header) .fin-metric-value,
    .mobile-financial-metrics .fin-metrics-card--secondary .info-row:not(.fin-metric-period-header) .fin-metric-value {
      font-family: ${T.sans} !important;
      font-size: ${FIN_METRIC_COMPACT_BODY_FONT_SIZE}px !important;
      line-height: 1.55 !important;
      font-weight: 400 !important;
      color: ${T.body} !important;
    }
    .company-grid-finance-primary.desktop-financial-metrics .info-row:not(.income-statement-row):not(.fin-metric-period-header) > :nth-child(1),
    .company-grid-finance-secondary.desktop-financial-metrics .info-row:not(.income-statement-row):not(.fin-metric-period-header) > :nth-child(1),
    .mobile-financial-metrics .fin-metrics-card--primary .info-row:not(.income-statement-row):not(.fin-metric-period-header) > :nth-child(1),
    .mobile-financial-metrics .fin-metrics-card--secondary .info-row:not(.income-statement-row):not(.fin-metric-period-header) > :nth-child(1) {
      text-align: left !important;
      justify-self: start !important;
      font-family: ${T.sans} !important;
      font-size: ${FIN_METRIC_COMPACT_BODY_FONT_SIZE}px !important;
      line-height: 1.35 !important;
      font-weight: 400 !important;
      color: ${T.muted} !important;
    }
    .company-grid-finance-primary.desktop-financial-metrics .info-row:not(.income-statement-row):not(.fin-metric-period-header) > :nth-child(3),
    .company-grid-finance-primary.desktop-financial-metrics .info-row:not(.fin-metric-period-header) .fin-metric-source-col,
    .company-grid-finance-secondary.desktop-financial-metrics .info-row:not(.income-statement-row):not(.fin-metric-period-header) > :nth-child(3),
    .company-grid-finance-secondary.desktop-financial-metrics .info-row:not(.fin-metric-period-header) .fin-metric-source-col,
    .mobile-financial-metrics .fin-metrics-card--primary .info-row:not(.income-statement-row):not(.fin-metric-period-header) > :nth-child(3),
    .mobile-financial-metrics .fin-metrics-card--primary .info-row:not(.fin-metric-period-header) .fin-metric-source-col,
    .mobile-financial-metrics .fin-metrics-card--secondary .info-row:not(.income-statement-row):not(.fin-metric-period-header) > :nth-child(3),
    .mobile-financial-metrics .fin-metrics-card--secondary .info-row:not(.fin-metric-period-header) .fin-metric-source-col {
      font-family: ${T.sans} !important;
      font-size: ${FIN_METRIC_COMPACT_BODY_FONT_SIZE}px !important;
      line-height: 1.35 !important;
      font-weight: 400 !important;
      color: ${T.muted} !important;
      text-align: center !important;
      justify-self: stretch !important;
      width: 100% !important;
      min-width: 0 !important;
    }
    /* Income Statement — table layout; year headers align with values (primary card only) */
    .company-grid-finance-primary.desktop-financial-metrics .income-statement-grid th,
    .mobile-financial-metrics .fin-metrics-card--primary .income-statement-grid th,
    .company-grid-finance-primary.desktop-financial-metrics .income-statement-grid td,
    .mobile-financial-metrics .fin-metrics-card--primary .income-statement-grid td {
      font-family: ${T.sans} !important;
    }
    .company-grid-finance-primary.desktop-financial-metrics .income-statement-grid th,
    .mobile-financial-metrics .fin-metrics-card--primary .income-statement-grid th {
      font-size: ${FIN_METRIC_COMPACT_PERIOD_FONT_SIZE}px !important;
      font-weight: 500 !important;
      color: ${T.muted} !important;
      text-transform: uppercase !important;
      letter-spacing: 0.35px !important;
      text-align: center !important;
    }
    .company-grid-finance-primary.desktop-financial-metrics .income-statement-grid td:first-child,
    .mobile-financial-metrics .fin-metrics-card--primary .income-statement-grid td:first-child {
      font-family: ${T.sans} !important;
      color: ${T.muted} !important;
      font-size: ${FIN_METRIC_COMPACT_BODY_FONT_SIZE}px !important;
      line-height: 1.35 !important;
      font-weight: 400 !important;
      text-align: left !important;
    }
    .company-grid-finance-primary.desktop-financial-metrics .income-statement-grid td:not(:first-child),
    .mobile-financial-metrics .fin-metrics-card--primary .income-statement-grid td:not(:first-child) {
      text-align: center !important;
      font-family: ${T.sans} !important;
      font-size: ${FIN_METRIC_COMPACT_BODY_FONT_SIZE}px !important;
      line-height: 1.55 !important;
      font-weight: 400 !important;
      color: ${T.body} !important;
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
      .company-grid-overview,
      .company-grid-description,
      .company-grid-finance-primary,
      .company-grid-finance-secondary,
      .company-grid-insights,
      .company-grid-product-mix,
      .company-grid-product-users,
      .company-grid-ai-risk,
      .company-grid-corporate-events,
      .company-grid-subsidiaries,
      .company-grid-headcount,
      .company-grid-management {
        grid-column: 1 / -1 !important;
        grid-row: auto !important;
        align-self: stretch !important;
      }
      .desktop-financial-metrics { display: none !important; }
      .mobile-financial-metrics { display: block !important; }
      .desktop-linkedin-section { display: none !important; }
      .overview-card .info-row { padding: 8px 0 !important; display: block !important; }
      .overview-card .info-label { font-size: 12px !important; color: #718096 !important; margin-bottom: 2px !important; }
      .overview-card .info-value { font-size: 13px !important; line-height: 1.35 !important; display: block !important; margin-left: 0 !important; word-break: break-word !important; overflow-wrap: break-word !important; }
      .overview-card { padding: 14px 8px !important; }
      .overview-grid { grid-template-columns: 1fr !important; }
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
          {/* Left: logo + name */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", minWidth: 0, flex: 1 }}>
                  <CompanyLogo
                    logo={companyLinkedIn?.profile?.logo}
                    fallbackLogo={
                      company._linkedin_data_of_new_company?.linkedin_logo
                    }
                    name={company.name}
                  />
                  <div style={{ minWidth: 0 }}>
                    <span style={{
                      fontSize: "24px", fontWeight: 600, color: T.ink,
                      letterSpacing: "-0.4px", lineHeight: 1.2, fontFamily: T.sans,
                    }}>
                      {company.name}
                    </span>
                    {formerNameDisplay && (
                      <div style={styles.formerName}>
                        (Formerly {formerNameDisplay})
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
                      entityType="company"
                      label="Company"
                      icon={<BellIcon width={15} height={15} strokeWidth={2} aria-hidden />}
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
                  backgroundColor: exportingPdf ? T.faint : "#475569",
                  border: "none", borderRadius: "6px",
                  padding: "8px 14px",
                  cursor: exportingPdf || !company?.id ? "not-allowed" : "pointer",
                      }}
                    >
                      <ArrowUpTrayIcon width={15} height={15} strokeWidth={2} aria-hidden />
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
                display: "inline-flex", alignItems: "center", gap: "5px",
                fontFamily: T.sans, fontSize: "12.5px", fontWeight: 600,
                color: "#fff", backgroundColor: T.emerald,
                borderRadius: "6px", padding: "8px 14px",
                textDecoration: "none",
              }}
                  >
                    <PlusIcon width={15} height={15} strokeWidth={2} aria-hidden />
                    Contribute Data
                  </a>
                </div>
              </div>

        {/* Navigation tabs — Summary only until other sections are available */}
        <div style={{ display: "flex", gap: "2px", overflowX: "auto" as const, scrollbarWidth: "none" as const }}>
          <span
            style={{
              padding: "10px 14px",
              fontFamily: T.sans,
              fontSize: "13px",
              fontWeight: 600,
              color: T.ink,
              borderBottom: `2px solid ${T.azure}`,
              marginBottom: "-1px",
              whiteSpace: "nowrap" as const,
            }}
          >
            Summary
          </span>
        </div>
      </div>

      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="company-detail-content" style={styles.maxWidth}>
          {/* Desktop grid */}
          <div style={styles.responsiveGrid} className="responsiveGrid">

            {/* ── Overview card (grid row 1, col 1) ── */}
            <div
              ref={overviewGridRef}
              style={{
                minWidth: 0,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                width: "100%",
                ...rowOneHeightStyle,
              }}
              className="overview-card company-grid-overview"
            >
              <OverviewCard
                fillGridCell
                transactionStatus={transactionStatusDisplayLabel}
                primarySectors={augmentedPrimarySectors
                  .filter((s) => s?.sector_name)
                  .map((s) => ({
                    name: s.sector_name!,
                    href: getSectorId(s) ? `/sector/${getSectorId(s)}` : undefined,
                  }))}
                secondarySectors={secondarySectors
                  .filter((s) => s?.sector_name)
                  .map((s) => ({
                    name: s.sector_name!,
                    href: getSectorId(s) ? `/sub-sector/${getSectorId(s)}` : undefined,
                  }))}
                yearFounded={getYearFoundedDisplay(company)}
                website={company.url}
                websiteLabel={company.url?.trim() ? formatWebsiteDisplayLabel(company.url) : undefined}
                ownership={company._ownership_type?.ownership}
                hq={fullAddress}
                lifecycle={company.Lifecycle_stage?.Lifecycle_Stage}
                totalAmountRaised={totalAmountRaisedDisplay ?? undefined}
                employees={overviewHeadcount}
                employeesYoY={overviewEmployeesYoY ?? undefined}
                ticker={tickerDisplay ?? undefined}
                parentCompany={
                  haveParentCompany && company.have_parent_company?.Parant_companies?.[0]
                    ? {
                        id: company.have_parent_company.Parant_companies[0].id,
                        name: (company.have_parent_company.Parant_companies[0].name || "").trim(),
                      }
                    : null
                }
                investors={
                  !haveParentCompany && apiInvestors.length > 0
                    ? apiInvestors
                        .filter(
                          (inv) =>
                            inv &&
                            typeof inv.investor_id === "number" &&
                            inv.investor_name
                        )
                        .map((inv) => ({ id: inv.investor_id!, name: inv.investor_name! }))
                    : []
                }
                investorsLoading={!haveParentCompany && apiInvestorsLoading}
                lastInvestment={
                  !haveParentCompany
                    ? timeSinceLastInvestmentLoading
                      ? "Loading…"
                      : timeSinceLastInvestment
                    : undefined
                }
              />
            {/* legacy invisible wrappers closed below */}
            <div style={{ display: "none" }} className="overview-fields">
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
                    EMPTY_DISPLAY
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
                    EMPTY_DISPLAY
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
                    EMPTY_DISPLAY
                  )}
                </span>
              </div>
              <div style={styles.infoRow} className="info-row">
                <span style={styles.label} className="info-label">
                  Ownership
                </span>
                <span style={styles.value} className="info-value">
                  {company._ownership_type?.ownership?.trim() || EMPTY_DISPLAY}
                </span>
              </div>
              <div style={styles.infoRow} className="info-row">
                <span style={styles.label} className="info-label">
                  HQ
                </span>
                <span style={styles.value} className="info-value">
                  {fullAddress?.trim() || EMPTY_DISPLAY}
                </span>
              </div>
              <div style={styles.infoRow} className="info-row">
                <span style={styles.label} className="info-label">
                  Lifecycle stage
                </span>
                <span style={styles.value} className="info-value">
                  {company.Lifecycle_stage?.Lifecycle_Stage?.trim() || EMPTY_DISPLAY}
                </span>
              </div>
              <div style={styles.infoRow} className="info-row">
                <span style={styles.label} className="info-label">
                  Total amount raised
                </span>
                <span style={styles.value} className="info-value">
                  {totalAmountRaisedDisplay ?? EMPTY_DISPLAY}
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
                    EMPTY_DISPLAY
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
                              href={`/company/${parentId}`}
                              style={styles.companyTag}
                              prefetch={false}
                            >
                              {parentName}
                            </Link>
                          </div>
                        );
                      }
                      return parentName || EMPTY_DISPLAY;
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
                        return EMPTY_DISPLAY;
                      })()}
                    </div>
                  </div>
                  <div style={styles.infoRow} className="info-row">
                    <span style={styles.label} className="info-label">
                      Time since last investment
                    </span>
                    <div style={styles.value} className="info-value">
                      {timeSinceLastInvestmentLoading
                        ? "Loading…"
                        : timeSinceLastInvestment}
                    </div>
                  </div>
                </>
              )}
              </div>{/* end legacy hidden content */}
            </div>{/* end overview card wrapper */}

            {/* ── Description card (grid row 1, col 2) ── */}
            <div
              ref={descriptionGridRef}
              style={{
                minWidth: 0,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                width: "100%",
                alignSelf: isDescriptionExpanded ? "start" : "stretch",
                overflow: isDescriptionExpanded ? "visible" : "hidden",
                ...(!isDescriptionExpanded ? rowOneHeightStyle : {}),
              }}
              className="overview-description company-grid-description"
            >
              <DescriptionCard
                text={company.description ?? ""}
                expanded={isDescriptionExpanded}
                onToggleExpand={() => setIsDescriptionExpanded((e) => !e)}
                contentRef={descriptionRef}
                fillGridCell={!isDescriptionExpanded}
              />
            </div>

            {/* ── Row 2: Insights (grid row 2, cols 1–2) — hidden when no I&A ── */}
            {showInsights && (
              <div
                ref={insightsRowRef}
                className="insights-summary-card company-grid-insights"
                style={{
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                  ...(rowTwoCardHeight > 0 ? { height: rowTwoCardHeight } : {}),
                }}
              >
                <InsightsCard
                  fillGridCell={rowTwoCardHeight > 0}
                  articles={companyArticles}
                  loading={articlesLoading}
                  totalCount={insightsTotal}
                  rangeStart={insightsShowingFrom}
                  rangeEnd={insightsShowingTo}
                  canPrev={canInsightPrev}
                  canNext={canInsightNext}
                  onPrev={() => {
                    if (company?.id && insightsPage > 1) {
                      fetchCompanyArticles(company.id, insightsPage - 1);
                    }
                  }}
                  onNext={() => {
                    if (company?.id && canInsightNext) {
                      fetchCompanyArticles(company.id, insightsPage + 1);
                    }
                  }}
                  companyId={company.id}
                  companyName={company.name}
                />
              </div>
            )}

            {/* Rows 3–4: Product attributes (type + revenue + data collection) | Core products | AI Defensibility Index (tall) */}
            {showProductAttributes && (
              <div className="company-grid-product-mix">
                <ProductAttributesCard
                  productRows={productTypeBarRows}
                  revenueRows={revenueModelRows.map((r) => ({
                    name: r.label,
                    weight: r.value,
                  }))}
                  dataRows={productDataToggleDataRows}
                  mcpStatus={companyMcpStatus}
                />
              </div>
            )}

            {showCoreProducts && (
              <div className="company-grid-product-users">
                <ProductUsersListCard
                  sections={coreProductsSections}
                  useCaseSections={usersUseCaseSections}
                  fillGridCell
                />
              </div>
            )}

            {aiRiskData != null && aiRiskData.axes.length > 0 && (
              <div className="company-grid-ai-risk">
                <AIRiskCard
                  fillGridCell
                  axes={aiRiskData.axes}
                  avgDefensibility={aiRiskData.avgDefensibility}
                  tier={aiRiskData.tier}
                  defaultActiveKey="data_moat"
                />
              </div>
            )}

            {/* Rows 5–6: Col 1 = events + subs (Revenue-model width); Col 3 = headcount + management under AI Defensibility Index */}
            {corporateEvents.length > 0 && (
              <div className="company-grid-corporate-events">
                <LinkPanel
                  fillGridCell
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
                    primarySectorsByCompanyId={corporateEventPrimarySectorsByCompanyId}
                    sectorNameToId={sectorNameToId}
                    totalCount={ceTotal}
                    rangeStart={ceShowingFrom}
                    rangeEnd={ceShowingTo}
                    canPrev={canCePrev}
                    canNext={canCeNext}
                    onPrev={() => {
                      if (company?.id && cePage > 1) {
                        void fetchCompanyCorporateEventsPage(company.id, cePage - 1);
                      }
                    }}
                    onNext={() => {
                      if (company?.id && cePage < ceTotalPages) {
                        void fetchCompanyCorporateEventsPage(company.id, cePage + 1);
                      }
                    }}
                    browseAllHref={
                      company?.id
                        ? `/corporate-events?target_company_id=${company.id}`
                        : "/corporate-events"
                    }
                    fillGridCell
                  />
                </LinkPanel>
              </div>
            )}

            {employeeData.length > 0 && (
            <div className="company-grid-headcount">
              <HeadcountCard
                fillGridCell
                data={employeeData.map((e) => e.employees_count)}
                dates={employeeData.map((e) => e.date)}
                count={currentEmployeeCount}
                yoyLabel={overviewEmployeesYoY || undefined}
                asOf={employeeCountAsOf}
                linkedinUrl={linkedinUrl}
              />
            </div>
            )}

            {hasSubsidiaries && (
              <div className="company-grid-subsidiaries">
                <LinkPanel
                  fillGridCell
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
                    acquisitionYearByCompanyId={subsidiaryAcquisitionYearByCompanyId}
                    sectorNameToId={sectorNameToId}
                    maxInitial={3}
                  />
                  </LinkPanel>
              </div>
            )}

            {hasManagement && (
              <div className="company-grid-management">
                <ManagementCard
                  fillGridCell
                  current={managementCurrentPeople}
                  past={managementPastPeople}
                  maxVisible={4}
                />
              </div>
            )}

            {/* ══ Col 3 row 1: Primary financial metrics (aligned with Overview + Description) ══ */}
            <div
              id="profile-financials"
              ref={financePrimaryGridRef}
              className="company-grid-finance-primary desktop-financial-metrics v3-right-rail"
              style={{
                minWidth: 0,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                width: "100%",
                scrollMarginTop: 24,
                ...rowOneHeightStyle,
              }}
            >
              <FinMetricsPrimaryCard
                fillGridCell
                primary={finMetricsData.primary}
                hasIncomeStatement={hasIncomeStatementData}
                incomeStatementRows={normalizedIncomeStatements}
                incomeStatementCurrency={evCurrency || revenueCurrency || ""}
              />
            </div>

            {/* ══ Col 3 row 2: Subscription / other metrics (aligned with Insights when shown) ══ */}
            <div
              ref={financeSecondaryRowRef}
              className="company-grid-finance-secondary desktop-financial-metrics v3-right-rail"
              style={{
                minWidth: 0,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                width: "100%",
                ...(showInsights && rowTwoCardHeight > 0
                  ? { height: rowTwoCardHeight }
                  : {}),
              }}
            >
              <FinMetricsSecondaryCard
                fillGridCell={showInsights && rowTwoCardHeight > 0}
                subscription={finMetricsData.subscription}
                other={finMetricsData.other}
              />
            </div>

            {/* Market Overview removed */}
          </div>

          {/* Mobile Financial Metrics */}
          <div
            id="profile-financials-mobile"
            ref={profileFinancialsMobileRef}
            style={{ display: "none", marginTop: "8px", scrollMarginTop: 24 }}
            className="mobile-financial-metrics"
          >
            <FinMetricsIncomeCard
              fillGridCell={false}
              data={finMetricsData}
              hasIncomeStatement={hasIncomeStatementData}
              incomeStatementRows={normalizedIncomeStatements}
              incomeStatementCurrency={evCurrency || revenueCurrency || ""}
            />

            <div style={{ marginTop: 20 }}>
                <HeadcountCard
                  data={employeeData.map((e) => e.employees_count)}
                  dates={employeeData.map((e) => e.date)}
                  count={currentEmployeeCount}
                  yoyLabel={overviewEmployeesYoY || undefined}
                  asOf={employeeCountAsOf}
                  linkedinUrl={linkedinUrl}
                />
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