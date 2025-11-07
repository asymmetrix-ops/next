"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useRightClick } from "@/hooks/useRightClick";
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
// import { locationsService } from "@/lib/locationsService"; // removed: sectors normalization not used anymore
// Investor classification rule constants (module scope; stable across renders)
const FINANCIAL_SERVICES_FOCUS_ID = 74;
const INVESTOR_SECTOR_IDS = new Set<number>([
  23877, // Venture Capital
  23699, // Private Equity
  23253, // Asset Management
  23463, // Family Office
  23887, // Wealth Management
  23563, // Investment Management
  23226, // Accelerator
]);

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
  Rev_Currency?: unknown;
  Revenue_m?: number | null;
  Rev_source?: number | string | null;
  ARR_pc?: number | null;
  ARR_currency?: unknown;
  ARR_m?: number | null;
  ARR_source?: number | string | null;
  Churn_pc?: number | null;
  Churn_Source?: number | string | null;
  GRR_pc?: number | null;
  GRR_source?: number | string | null;
  Upsell_pc?: number | null;
  Upsell_source?: number | string | null;
  Cross_sell_pc?: number | null;
  Cross_sell_source?: number | string | null;
  Price_increase_pc?: number | null;
  Price_increase_source?: number | string | null;
  Rev_expansion_pc?: number | null;
  Rev_expansion_source?: number | string | null;
  NRR?: number | null;
  NRR_source?: number | string | null;
  New_client_growth_pc?: number | null;
  New_Client_Growth_Source?: number | string | null;
  Rev_Growth_PC?: number | null;
  Rev_Growth_source?: number | string | null;
  EBITDA_margin?: number | null;
  EBITDA_margin_source?: number | string | null;
  EBITDA_currency?: unknown;
  EBITDA_m?: number | null;
  EBITDA_source?: number | string | null;
  Rule_of_40?: number | null;
  Rule_of_40_source?: number | string | null;
  Revenue_multiple?: number | null;
  Rev_x_source?: number | string | null;
  EV_currency?: unknown;
  EV?: number | null;
  EV_source?: number | string | null;
  EBIT_currency?: unknown;
  EBIT_m?: number | null;
  EBIT_source?: number | string | null;
  No_of_Clients?: number | null;
  No_Clients_source?: number | string | null;
  Rev_per_client?: number | null;
  Rev_per_client_source?: number | string | null;
  No_Employees?: number | null;
  No_Employees_source?: number | string | null;
  Revenue_per_employee?: number | null;
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

interface NewAdvisorMinimal {
  id: number;
  advisor_company?: { id: number; name: string };
  announcement_url?: string;
  new_company_advised?: number;
  counterparty_advised?: number;
  _new_company?: { id: number; name: string };
}

interface NewCorporateEvent {
  id?: number;
  advisors?: NewAdvisorMinimal[];
  advisors_names?: string[];
  deal_type?: string;
  ev_display?: string | null;
  description?: string;
  announcement_date?: string;
  investment_display?: string;
  this_company_status?: string;
  other_counterparties?: NewCounterpartyMinimal[];
}

type CompanyCorporateEvent = LegacyCorporateEvent | NewCorporateEvent;

type NewCorporateEventsEnvelope = {
  new_counterparties: Array<{ items: string | NewCorporateEvent[] }>;
};

type LegacyCorporateEventsEnvelope = {
  New_Events_Wits_Advisors: LegacyCorporateEvent[];
};

function isNewCorporateEventsEnvelope(
  value: unknown
): value is NewCorporateEventsEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray(
      (value as { new_counterparties?: unknown }).new_counterparties
    )
  );
}

function isLegacyCorporateEventsEnvelope(
  value: unknown
): value is LegacyCorporateEventsEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray(
      (value as { New_Events_Wits_Advisors?: unknown }).New_Events_Wits_Advisors
    )
  );
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
  investors?: CompanyInvestor[];
  investors_new_company?: CompanyInvestor[];
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

// Convert absolute amounts to thousands (k) with up to 2 decimals
const toThousandsPlain = (value?: number | null): string => {
  if (typeof value !== "number" || !Number.isFinite(value))
    return "Not available";
  const thousands = value / 1000;
  return thousands.toLocaleString("en-US", { maximumFractionDigits: 2 });
};

// Map Xano source codes to human-readable labels (best-known mapping)
const sourceLabel = (code?: number | string | null): string | undefined => {
  const n = typeof code === "string" ? parseInt(code, 10) : code ?? undefined;
  switch (n) {
    case 1:
      return "Public";
    case 5:
      return "Proprietary";
    case 4:
      return "Estimate";
    default:
      return undefined;
  }
};

// Removed currency formatting helper; we show currency once in heading

// Format helpers for additional financial metrics
const formatPercent = (value?: number | null): string => {
  if (typeof value !== "number" || !Number.isFinite(value))
    return "Not available";
  return `${Math.round(value)}%`;
};

const formatMultiple = (value?: number | null): string => {
  if (typeof value !== "number" || !Number.isFinite(value))
    return "Not available";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toLocaleString()}x`;
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
  const chartData = data.map((item) => ({
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
  const router = useRouter();

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
  const [showAllCorporateEvents, setShowAllCorporateEvents] = useState(false);
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
  // New investors payload (current/past) parsed from investors_data
  const [newInvestorsCurrent, setNewInvestorsCurrent] = useState<
    CompanyInvestor[]
  >([]);
  const [newInvestorsPast, setNewInvestorsPast] = useState<CompanyInvestor[]>(
    []
  );
  // Computed routing targets for investor/company entities referenced in Investors section
  const [investorRouteTargetById, setInvestorRouteTargetById] = useState<
    Record<number, string>
  >({});

  // Removed sectors normalization/mapping; rely solely on API-provided primary sectors

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

  // Extract numeric sector ids from various shapes (array of objects or ids)
  const extractSectorIds = (payload: unknown): number[] => {
    if (!payload) return [];
    if (Array.isArray(payload)) {
      return (payload as unknown[])
        .map((item) => {
          if (typeof item === "number") return item;
          if (typeof item === "string") {
            const n = parseInt(item, 10);
            return Number.isFinite(n) ? n : undefined;
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const obj = item as any;
          const candidate = obj?.sector_id ?? obj?.id ?? obj?.Sector_id;
          if (typeof candidate === "number") return candidate;
          if (typeof candidate === "string") {
            const n = parseInt(candidate, 10);
            return Number.isFinite(n) ? n : undefined;
          }
          return undefined;
        })
        .filter((v): v is number => typeof v === "number");
    }
    return [];
  };

  // Decide route based on business focus and sectors
  const decideEntityRoute = useCallback(
    (meta: unknown, entityId: number): string => {
      const focusIds = extractPrimaryBusinessFocusIds(meta);
      const sectors = extractSectorIds(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (meta as any)?.sectors_id ?? (meta as any)?.Sectors_id
      );
      const isFinancialServices = focusIds.includes(
        FINANCIAL_SERVICES_FOCUS_ID
      );
      const hasInvestorSector = sectors.some((id) =>
        INVESTOR_SECTOR_IDS.has(id)
      );
      if (isFinancialServices && hasInvestorSector) {
        return `/investors/${entityId}`;
      }
      return `/company/${entityId}`;
    },
    []
  );

  // Probe investor API to confirm if an entity is an investor
  const verifyIsInvestorViaApi = async (
    id: number,
    headers: Record<string, string>,
    signal?: AbortSignal
  ): Promise<boolean> => {
    try {
      const params = new URLSearchParams();
      params.append("new_comp_id", String(id));
      const res = await fetch(
        `https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm/get_the_investor_new_company?${params.toString()}`,
        { method: "GET", headers, signal, credentials: "include" }
      );
      if (!res.ok) return false;
      const data = await res.json();
      // Heuristic: presence of Investor object or Focus array indicates investor profile exists
      const hasInvestor = Boolean(
        (data &&
          (data.Investor || data.Focus || data.Invested_DA_sectors)) as unknown
      );
      return hasInvestor;
    } catch {
      return false;
    }
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

      const endpoint = `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/Get_new_company/${id}`;

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

  // Fetch corporate events
  const fetchCorporateEvents = useCallback(async () => {
    setCorporateEventsLoading(true);
    try {
      const token = localStorage.getItem("asymmetrix_auth_token");
      if (!token) {
        // No token → skip calling protected endpoint
        setCorporateEvents((prev) => prev);
        return;
      }

      const params = new URLSearchParams();
      params.append("new_company_id", companyId);

      const response = await fetch(
        `https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm/Get_investors_corporate_events?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Corporate Events API request failed: ${response.statusText}`
        );
      }

      const data: unknown = await response.json();
      console.log("Corporate events API response:", data);
      if (isNewCorporateEventsEnvelope(data)) {
        const items: NewCorporateEvent[] = [];
        for (const entry of data.new_counterparties) {
          const raw = entry?.items;
          if (typeof raw === "string") {
            try {
              const parsed = JSON.parse(raw) as unknown;
              if (Array.isArray(parsed))
                items.push(...(parsed as NewCorporateEvent[]));
            } catch (e) {
              console.warn("Failed to parse new_counterparties.items JSON", e);
            }
          } else if (Array.isArray(raw)) {
            items.push(...(raw as NewCorporateEvent[]));
          }
        }
        setCorporateEvents(items);
      } else if (isLegacyCorporateEventsEnvelope(data)) {
        setCorporateEvents(data.New_Events_Wits_Advisors || []);
      } else {
        setCorporateEvents([]);
      }
    } catch (err) {
      console.error("Error fetching corporate events:", err);
    } finally {
      setCorporateEventsLoading(false);
    }
  }, [companyId]);

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

        // Parse corporate events from Get_new_company payload (preferred, no auth)
        try {
          const newCounterparties = (
            data as unknown as {
              new_counterparties?: Array<{ items?: unknown }>;
            }
          )?.new_counterparties;
          const parsedEvents: NewCorporateEvent[] = [];
          if (Array.isArray(newCounterparties)) {
            for (const entry of newCounterparties) {
              const raw = (entry as { items?: unknown })?.items;
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
              }
            }
          }
          if (parsedEvents.length > 0) {
            setCorporateEvents(parsedEvents);
            setCorporateEventsLoading(false);
          }
        } catch {
          // non-fatal
        }

        // Parse optional investors_data → { current: [], past: [] } (stringified JSON or object)
        const parsedCurrent: CompanyInvestor[] = [];
        const parsedPast: CompanyInvestor[] = [];
        try {
          const rawInvestors = (
            data as unknown as {
              investors_data?: Array<{ items?: unknown }>;
            }
          )?.investors_data;
          if (Array.isArray(rawInvestors)) {
            for (const entry of rawInvestors) {
              const rawItems = (entry as { items?: unknown })?.items;
              let payload: unknown = rawItems;
              if (typeof rawItems === "string") {
                try {
                  payload = JSON.parse(rawItems as string);
                } catch {
                  // ignore malformed JSON
                }
              }
              const obj = (payload || {}) as {
                current?: Array<{
                  name?: string;
                  investor_id?: number | null;
                  new_company_id?: number | null;
                }>;
                past?: Array<{
                  name?: string;
                  investor_id?: number | null;
                  new_company_id?: number | null;
                }>;
              };
              const toCompanyInvestor = (
                list?: Array<{
                  name?: string;
                  investor_id?: number | null;
                  new_company_id?: number | null;
                }>
              ): CompanyInvestor[] =>
                (Array.isArray(list) ? list : [])
                  .map((v) => ({
                    id: (typeof v?.new_company_id === "number"
                      ? v?.new_company_id
                      : undefined) as number | undefined,
                    name: (v?.name || "").trim(),
                  }))
                  .filter((v) => v.id && v.name) as CompanyInvestor[];
              parsedCurrent.push(...toCompanyInvestor(obj?.current));
              parsedPast.push(...toCompanyInvestor(obj?.past));
            }
          }
        } catch {
          // non-fatal
        }

        setNewInvestorsCurrent(parsedCurrent);
        setNewInvestorsPast(parsedPast);
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
      // Only fall back to protected events endpoint when token exists
      const token = localStorage.getItem("asymmetrix_auth_token");
      if (token) fetchCorporateEvents();
      fetchFinancialMetrics(companyId);
    }
  }, [
    companyId,
    fetchCorporateEvents,
    fetchCompanyArticles,
    requestCompany,
    fetchFinancialMetrics,
  ]);

  // Fetch minimal metadata for each investor to determine correct routing target
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    const run = async () => {
      try {
        const list = (
          [
            ...(Array.isArray(company?.investors)
              ? (company?.investors as unknown as CompanyInvestor[])
              : []),
            ...newInvestorsCurrent,
            ...newInvestorsPast,
          ] as CompanyInvestor[]
        ).filter((v): v is CompanyInvestor =>
          Boolean(v && typeof v.id === "number")
        );
        if (list.length === 0) return;

        const token = localStorage.getItem("asymmetrix_auth_token");
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        const entries = await Promise.all(
          list.map(async (inv) => {
            try {
              const url = `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/Get_new_company/${inv.id}`;
              const res = await fetch(url, { method: "GET", headers, signal });
              if (!res.ok) throw new Error(String(res.status));
              const data = await res.json();
              const meta = data?.Company ?? data;
              let target = decideEntityRoute(meta, inv.id);
              // If rule says company, double-check investor API and override when confirmed investor
              if (target.startsWith("/company/")) {
                const isInvestor = await verifyIsInvestorViaApi(
                  inv.id,
                  headers,
                  signal
                );
                if (isInvestor) target = `/investors/${inv.id}`;
              }
              return [inv.id, target] as const;
            } catch {
              // Fallback to heuristic using existing flag
              const target = inv._is_that_investor
                ? `/investors/${inv.id}`
                : `/company/${inv.id}`;
              return [inv.id, target] as const;
            }
          })
        );

        const map: Record<number, string> = {};
        for (const [id, target] of entries) map[id] = target;
        setInvestorRouteTargetById(map);
      } catch {
        // ignore
      }
    };
    run();
    return () => controller.abort();
  }, [
    company?.investors,
    newInvestorsCurrent,
    newInvestorsPast,
    decideEntityRoute,
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

      let payload: {
        primary_sectors?: Array<{ id?: number | string; sector_name?: string }>;
        secondary_sectors?: Array<{
          id?: number | string;
          sector_name?: string;
        }>;
      } = {};

      if (typeof rawPayload === "string") {
        const jsonString = rawPayload.replace(/\\u0022/g, '"');
        payload = JSON.parse(jsonString);
      } else if (rawPayload && typeof rawPayload === "object") {
        payload = rawPayload as typeof payload;
      } else {
        return null;
      }
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

  const primarySectors =
    (parsedNewSectors?.primary && parsedNewSectors.primary.length > 0
      ? parsedNewSectors.primary
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
    (parsedNewSectors?.secondary && parsedNewSectors.secondary.length > 0
      ? parsedNewSectors.secondary
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
    typeof financialMetrics?.Revenue_m === "number"
      ? formatPlainNumber(financialMetrics?.Revenue_m)
      : undefined;
  const ebitdaFromMetrics =
    typeof financialMetrics?.EBITDA_m === "number"
      ? formatPlainNumber(financialMetrics?.EBITDA_m)
      : undefined;
  const evFromMetrics =
    typeof financialMetrics?.EV === "number"
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
    normalizeCurrency(financialMetrics?.Rev_Currency) ||
    normalizeCurrency(financialMetrics?.EBITDA_currency) ||
    normalizeCurrency(financialMetrics?.EV_currency) ||
    displayCurrency;
  const metricsCurrencySuffix = metricsCurrencyCode
    ? ` (${metricsCurrencyCode})`
    : "";

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

  // Determine if there are articles to display
  const hasArticles = companyArticles.length > 0;

  // Market Overview removed: no TradingView symbols computation

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
      padding: "32px 24px",
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
    responsiveGrid: {
      display: "grid",
      gridTemplateColumns: "2fr 1fr",
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
        padding: "16px 14px",
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
    .responsiveGrid { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; max-width: 100%; }
    .card { background: white; border-radius: 12px; }
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
    @media (max-width: 768px) {
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
              <h1 style={styles.companyName}>{company.name}</h1>
            </div>
            <div style={styles.headerRight}>
              <a
                style={{
                  ...styles.reportButton,
                  display: "inline-flex",
                  alignItems: "center",
                }}
                href="mailto:a.boden@asymmetrixintelligence.com?subject=Report%20Incorrect%20Company%20Data&body=Please%20describe%20the%20issue%20you%20found."
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
              <div style={styles.infoRow} className="info-row">
                <span style={styles.label} className="info-label">
                  Primary Sector:
                </span>
                <div style={styles.value} className="info-value">
                  {augmentedPrimarySectors.length > 0 ? (
                    <>
                      {(isMobile && !showAllPrimarySectors
                        ? augmentedPrimarySectors.slice(0, 4)
                        : augmentedPrimarySectors
                      ).map((sector, index) => {
                        if (!sector || !sector.sector_name) return null;
                        const id = getSectorId(sector);
                        const content = id ? (
                          createClickableElement(
                            `/sector/${id}`,
                            sector.sector_name
                          )
                        ) : (
                          <span style={{ color: "#000" }}>
                            {sector.sector_name}
                          </span>
                        );
                        return (
                          <span key={`${sector.sector_name}-${index}`}>
                            {content}
                            {index <
                              (isMobile && !showAllPrimarySectors
                                ? Math.min(augmentedPrimarySectors.length, 4) -
                                  1
                                : augmentedPrimarySectors.length - 1) && ", "}
                          </span>
                        );
                      })}
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
                            marginLeft: 6,
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
                      {(isMobile && !showAllSecondarySectors
                        ? secondarySectors.slice(0, 4)
                        : secondarySectors
                      ).map((sector, index) => {
                        if (!sector || !sector.sector_name) return null;
                        const id = getSectorId(sector);
                        const content = id ? (
                          createClickableElement(
                            `/sector/${id}`,
                            sector.sector_name
                          )
                        ) : (
                          <span style={{ color: "#000" }}>
                            {sector.sector_name}
                          </span>
                        );
                        return (
                          <span key={`${sector.sector_name}-${index}`}>
                            {content}
                            {index <
                              (isMobile && !showAllSecondarySectors
                                ? Math.min(secondarySectors.length, 4) - 1
                                : secondarySectors.length - 1) && ", "}
                          </span>
                        );
                      })}
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
                            marginLeft: 6,
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
              <div style={styles.infoRow} className="info-row">
                <span style={styles.label} className="info-label">
                  {company.have_parent_company?.have_parent_companies &&
                  Array.isArray(
                    company.have_parent_company?.Parant_companies
                  ) &&
                  company.have_parent_company!.Parant_companies!.length > 0 &&
                  // If first parent company's primary_business_focus_id is NOT Financial Services (74), label as Parent Company
                  !extractPrimaryBusinessFocusIds(
                    company.have_parent_company!.Parant_companies![0]
                      ?.primary_business_focus_id
                  ).includes(FINANCIAL_SERVICES_FOCUS_ID)
                    ? "Parent Company:"
                    : newInvestorsCurrent.length > 0
                    ? "Current Investors:"
                    : "Investors:"}
                </span>
                <span style={styles.value} className="info-value">
                  {company.have_parent_company?.have_parent_companies &&
                  Array.isArray(
                    company.have_parent_company?.Parant_companies
                  ) &&
                  company.have_parent_company!.Parant_companies!.length > 0 &&
                  !extractPrimaryBusinessFocusIds(
                    company.have_parent_company!.Parant_companies![0]
                      ?.primary_business_focus_id
                  ).includes(FINANCIAL_SERVICES_FOCUS_ID)
                    ? (() => {
                        const parent =
                          company.have_parent_company!.Parant_companies![0];
                        const parentId = parent?.id;
                        const parentName = (parent?.name || "").trim();
                        if (parentId && parentName) {
                          return createClickableElement(
                            `/company/${parentId}`,
                            parentName
                          );
                        }
                        return parentName || "Not available";
                      })()
                    : newInvestorsCurrent.length > 0
                    ? newInvestorsCurrent
                        .filter(
                          (investor) =>
                            investor &&
                            typeof investor.id === "number" &&
                            investor.name
                        )
                        .map((investor, index, arr) => {
                          const href =
                            investorRouteTargetById[investor.id] ||
                            `/investors/${investor.id}`;
                          return (
                            <span key={`current-${investor.id}`}>
                              {createClickableElement(href, investor.name)}
                              {index < arr.length - 1 && ", "}
                            </span>
                          );
                        })
                    : company.investors && company.investors.length > 0
                    ? company.investors
                        .filter(
                          (investor) =>
                            investor &&
                            typeof investor.id === "number" &&
                            investor.name
                        )
                        .map((investor, index, arr) => {
                          const href =
                            investorRouteTargetById[investor.id] ||
                            (investor._is_that_investor
                              ? `/investors/${investor.id}`
                              : `/company/${investor.id}`);
                          return (
                            <span key={investor.id}>
                              {createClickableElement(href, investor.name)}
                              {index < arr.length - 1 && ", "}
                            </span>
                          );
                        })
                    : "Not available"}
                </span>
              </div>
              {newInvestorsPast.length > 0 && (
                <div style={styles.infoRow} className="info-row">
                  <span style={styles.label} className="info-label">
                    Past Investors:
                  </span>
                  <span style={styles.value} className="info-value">
                    {newInvestorsPast
                      .filter(
                        (investor) =>
                          investor &&
                          typeof investor.id === "number" &&
                          investor.name
                      )
                      .map((investor, index, arr) => {
                        const href =
                          investorRouteTargetById[investor.id] ||
                          `/investors/${investor.id}`;
                        return (
                          <span key={`past-${investor.id}`}>
                            {createClickableElement(href, investor.name)}
                            {index < arr.length - 1 && ", "}
                          </span>
                        );
                      })}
                  </span>
                </div>
              )}
              <div style={styles.infoRowLast} className="info-row">
                <span style={styles.label} className="info-label">
                  Description:
                </span>
                <div style={styles.value} className="info-value">
                  {company.description || "No description available"}
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
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "24px",
                    }}
                    className="management-grid"
                  >
                    <div>
                      <h4
                        style={{
                          ...styles.label,
                          fontSize: "14px",
                          marginBottom: "8px",
                          fontWeight: 600,
                        }}
                      >
                        Current:
                      </h4>
                      {company.Managmant_Roles_current &&
                      company.Managmant_Roles_current.length > 0 ? (
                        company.Managmant_Roles_current.map((person) => (
                          <div
                            key={person.id}
                            style={{ marginBottom: "8px", fontSize: "14px" }}
                          >
                            {createClickableElement(
                              `/individual/${person.individuals_id}`,
                              `${person.Individual_text}: ${(
                                person.job_titles_id || []
                              )
                                .map((job) => job?.job_title)
                                .filter(Boolean)
                                .join(", ")}`
                            )}
                          </div>
                        ))
                      ) : (
                        <div style={{ color: "#6b7280", fontSize: "14px" }}>
                          Not available
                        </div>
                      )}
                    </div>
                    <div>
                      <h4
                        style={{
                          ...styles.label,
                          fontSize: "14px",
                          marginBottom: "8px",
                          fontWeight: 600,
                        }}
                      >
                        Past:
                      </h4>
                      {company.Managmant_Roles_past &&
                      company.Managmant_Roles_past.length > 0 ? (
                        company.Managmant_Roles_past.map((person) => (
                          <div
                            key={person.id}
                            style={{ marginBottom: "8px", fontSize: "14px" }}
                          >
                            {createClickableElement(
                              `/individual/${person.individuals_id}`,
                              `${person.Individual_text}: ${(
                                person.job_titles_id || []
                              )
                                .map((job) => job?.job_title)
                                .filter(Boolean)
                                .join(", ")}`
                            )}
                          </div>
                        ))
                      ) : (
                        <div style={{ color: "#6b7280", fontSize: "14px" }}>
                          Not available
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Corporate Events moved into Overview */}
              <>
                <div
                  style={{
                    marginTop: "16px",
                    paddingTop: "16px",
                    borderTop: "1px solid #e2e8f0",
                  }}
                >
                  <h3
                    style={{
                      ...styles.sectionTitle,
                      fontSize: "17px",
                      marginBottom: "12px",
                    }}
                  >
                    Corporate Events{" "}
                    {corporateEventsLoading
                      ? ""
                      : `(${corporateEvents.length})`}
                  </h3>
                  {corporateEventsLoading ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "20px",
                        color: "#666",
                        fontSize: "14px",
                      }}
                    >
                      Loading corporate events...
                    </div>
                  ) : corporateEvents.length > 0 ? (
                    <div style={{ overflowX: "auto", maxWidth: "100%" }}>
                      <table className="corporate-event-table">
                        <thead>
                          <tr>
                            <th>Event Details</th>
                            <th>Parties</th>
                            <th>Deal Details</th>
                            <th>Advisors</th>
                            <th>Sectors</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(showAllCorporateEvents
                            ? corporateEvents
                            : corporateEvents.slice(0, 3)
                          ).map((event, index) => {
                            const isPartnership = /partnership/i.test(
                              (event as NewCorporateEvent).deal_type ||
                                (event as LegacyCorporateEvent).deal_type ||
                                ""
                            );
                            const eventDate = (() => {
                              const raw =
                                (event as NewCorporateEvent)
                                  .announcement_date ||
                                (event as LegacyCorporateEvent)
                                  .announcement_date;
                              try {
                                return new Date(raw).toLocaleDateString(
                                  "en-US",
                                  {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  }
                                );
                              } catch {
                                return "Not available";
                              }
                            })();
                            return (
                              <tr key={event.id || index}>
                                {/* Event Details */}
                                <td>
                                  <div style={{ marginBottom: "6px" }}>
                                    <a
                                      href={`/corporate-event/${event.id}`}
                                      className="corporate-event-name"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        router.replace(
                                          `/corporate-event/${event.id}`
                                        );
                                      }}
                                    >
                                      {event.description || "Not Available"}
                                    </a>
                                  </div>
                                  <div className="muted-row">
                                    Date: {eventDate}
                                  </div>
                                  <div className="muted-row">
                                    Target HQ: {fullAddress || "Not available"}
                                  </div>
                                </td>
                                {/* Parties */}
                                <td>
                                  <div className="muted-row">
                                    <strong>Target:</strong>{" "}
                                    <a
                                      href={`/company/${companyId}`}
                                      className="link-blue"
                                    >
                                      {company.name}
                                    </a>
                                  </div>
                                  <div className="muted-row">
                                    <strong>Other counterparties:</strong>{" "}
                                    {(() => {
                                      const newEvent =
                                        event as NewCorporateEvent;
                                      if (
                                        Array.isArray(
                                          newEvent.other_counterparties
                                        )
                                      ) {
                                        const list =
                                          newEvent.other_counterparties.filter(
                                            (c) =>
                                              c &&
                                              typeof c.id === "number" &&
                                              c.name
                                          );
                                        if (list.length === 0)
                                          return <span>Not Available</span>;
                                        return list.map((c, idx) => {
                                          const href =
                                            c.page_type === "investor"
                                              ? `/investors/${c.id}`
                                              : `/company/${c.id}`;
                                          return (
                                            <span key={`${c.id}-${idx}`}>
                                              <a
                                                href={href}
                                                className="link-blue"
                                              >
                                                {c.name}
                                              </a>
                                              {idx < list.length - 1 && ", "}
                                            </span>
                                          );
                                        });
                                      }
                                      const legacy =
                                        event as LegacyCorporateEvent;
                                      const items = (legacy["0"] || []).filter(
                                        (it) =>
                                          it &&
                                          it._new_company &&
                                          it._new_company.name
                                      );
                                      if (items.length === 0)
                                        return <span>Not Available</span>;
                                      return items.map((it, idx) => {
                                        const id = it._new_company?.id;
                                        const isInvestor = Boolean(
                                          it._new_company?._is_that_investor
                                        );
                                        const href = isInvestor
                                          ? `/investors/${id}`
                                          : `/company/${id}`;
                                        if (!id) {
                                          return (
                                            <span
                                              key={`${it._new_company?.name}-${idx}`}
                                            >
                                              {it._new_company?.name}
                                              {idx < items.length - 1 && ", "}
                                            </span>
                                          );
                                        }
                                        return (
                                          <span key={`${id}-${idx}`}>
                                            <a
                                              href={href}
                                              className="link-blue"
                                            >
                                              {it._new_company!.name}
                                            </a>
                                            {idx < items.length - 1 && ", "}
                                          </span>
                                        );
                                      });
                                    })()}
                                  </div>
                                </td>
                                {/* Deal Details */}
                                <td>
                                  <div className="muted-row">
                                    <strong>Deal Type:</strong>{" "}
                                    {(event as NewCorporateEvent).deal_type ||
                                    (event as LegacyCorporateEvent)
                                      .deal_type ? (
                                      <span className="pill pill-blue">
                                        {(event as NewCorporateEvent)
                                          .deal_type ||
                                          (event as LegacyCorporateEvent)
                                            .deal_type}
                                      </span>
                                    ) : (
                                      <span>Not Available</span>
                                    )}
                                  </div>
                                  {!isPartnership && (
                                    <div className="muted-row">
                                      <strong>Amount (m):</strong>{" "}
                                      {(() => {
                                        const display = (
                                          event as NewCorporateEvent
                                        ).investment_display;
                                        if (display && display.trim())
                                          return display;
                                        const legacy =
                                          event as LegacyCorporateEvent;
                                        const legacyAny = legacy as unknown as {
                                          investment_data?: {
                                            investment_amount_m?:
                                              | number
                                              | string;
                                            investment_amount?: number | string;
                                            currency?: { Currency?: string };
                                            _currency?: { Currency?: string };
                                            currrency?: { Currency?: string };
                                          };
                                          investment_amount_m?: number | string;
                                          investment_amount?: number | string;
                                        };
                                        const amount =
                                          legacyAny?.investment_data
                                            ?.investment_amount_m ??
                                          legacyAny?.investment_data
                                            ?.investment_amount ??
                                          legacyAny?.investment_amount_m ??
                                          legacyAny?.investment_amount;
                                        const currency: string | undefined =
                                          legacyAny?.investment_data?.currency
                                            ?.Currency ||
                                          legacyAny?.investment_data?._currency
                                            ?.Currency ||
                                          legacyAny?.investment_data?.currrency
                                            ?.Currency;
                                        if (amount != null && currency) {
                                          const n = Number(amount);
                                          if (!Number.isNaN(n))
                                            return `${currency}${n.toLocaleString()}m`;
                                        }
                                        return "Not available";
                                      })()}
                                    </div>
                                  )}
                                  {!isPartnership && (
                                    <div className="muted-row">
                                      <strong>EV (m):</strong>{" "}
                                      {(() => {
                                        const display = (
                                          event as NewCorporateEvent
                                        ).ev_display as string | undefined;
                                        if (display && display.trim())
                                          return display;
                                        const legacy =
                                          event as LegacyCorporateEvent;
                                        const amount = legacy.ev_data
                                          ?.enterprise_value_m as
                                          | number
                                          | string
                                          | undefined;
                                        const currency: string | undefined =
                                          legacy.ev_data?.currency?.Currency ||
                                          legacy.ev_data?._currency?.Currency;
                                        if (amount != null && currency) {
                                          const n = Number(amount);
                                          if (!Number.isNaN(n))
                                            return `${currency}${n.toLocaleString()}m`;
                                        }
                                        return (
                                          legacy.ev_data?.ev_band ||
                                          "Not available"
                                        );
                                      })()}
                                    </div>
                                  )}
                                </td>
                                {/* Advisors */}
                                <td>
                                  <div className="muted-row">
                                    <strong>Advisors:</strong>{" "}
                                    {(() => {
                                      const newEvent =
                                        event as NewCorporateEvent;
                                      const namesFromArray = Array.isArray(
                                        newEvent.advisors_names
                                      )
                                        ? newEvent.advisors_names
                                            .map((n) =>
                                              typeof n === "string" ? n : ""
                                            )
                                            .filter(
                                              (n) => n && n.trim().length > 0
                                            )
                                        : [];
                                      const namesFromString =
                                        typeof (
                                          newEvent as unknown as {
                                            advisors_names?: unknown;
                                          }
                                        ).advisors_names === "string"
                                          ? [
                                              String(
                                                (
                                                  newEvent as unknown as {
                                                    advisors_names?: string;
                                                  }
                                                ).advisors_names
                                              ),
                                            ]
                                          : [];
                                      const namesFromObjects = Array.isArray(
                                        newEvent.advisors
                                      )
                                        ? newEvent.advisors
                                            .map(
                                              (a) =>
                                                a?.advisor_company?.name ||
                                                a?._new_company?.name ||
                                                ""
                                            )
                                            .filter(
                                              (n) => n && n.trim().length > 0
                                            )
                                        : [];
                                      let combined = [
                                        ...namesFromArray,
                                        ...namesFromString,
                                        ...namesFromObjects,
                                      ];
                                      if (combined.length === 0) {
                                        const legacy =
                                          event as LegacyCorporateEvent;
                                        const legacyNames = (
                                          (legacy["1"] || []).map(
                                            (item) =>
                                              item._new_company?.name || ""
                                          ) as Array<string>
                                        ).filter(
                                          (n) => n && n.trim().length > 0
                                        );
                                        combined = legacyNames;
                                      }
                                      const unique = Array.from(
                                        new Set(combined.map((n) => n.trim()))
                                      );
                                      return unique.length > 0
                                        ? unique.join(", ")
                                        : "N/A";
                                    })()}
                                  </div>
                                </td>
                                {/* Sectors */}
                                <td>
                                  <div className="muted-row">
                                    <strong>Primary:</strong>{" "}
                                    {augmentedPrimarySectors.length > 0
                                      ? augmentedPrimarySectors
                                          .map((s) => s?.sector_name)
                                          .filter(Boolean)
                                          .join(", ")
                                      : "Not available"}
                                  </div>
                                  <div className="muted-row">
                                    <strong>Secondary:</strong>{" "}
                                    {secondarySectors.length > 0
                                      ? secondarySectors
                                          .map((s) => s?.sector_name)
                                          .filter(Boolean)
                                          .join(", ")
                                      : "Not available"}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {corporateEvents.length > 3 && (
                        <div style={{ textAlign: "center", marginTop: "16px" }}>
                          <button
                            onClick={() =>
                              setShowAllCorporateEvents(!showAllCorporateEvents)
                            }
                            style={{
                              background: "none",
                              border: "none",
                              color: "#0075df",
                              textDecoration: "underline",
                              cursor: "pointer",
                              fontSize: "14px",
                              padding: "8px 0",
                            }}
                          >
                            {showAllCorporateEvents ? "Show Less" : "See More"}
                          </button>
                        </div>
                      )}
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
                      No corporate events found
                    </div>
                  )}
                </div>
              </>

              {/* Divider between Corporate Events and Insights */}
              {hasArticles &&
                (corporateEventsLoading || corporateEvents.length > 0) && (
                  <div
                    style={{ borderTop: "1px solid #e2e8f0", margin: "16px 0" }}
                  />
                )}

              {/* Asymmetrix Insights & Analysis moved into Overview */}
              <>
                <div style={{ marginTop: "8px" }}>
                  <h3
                    style={{
                      ...styles.sectionTitle,
                      fontSize: "17px",
                      marginBottom: "12px",
                    }}
                  >
                    Asymmetrix Insights & Analysis{" "}
                    {articlesLoading ? "" : `(${companyArticles.length})`}
                  </h3>
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
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "16px",
                      }}
                    >
                      {companyArticles.slice(0, 4).map((article) => (
                        <a
                          key={article.id}
                          href={`/article/${article.id}`}
                          style={{
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                            padding: "12px 12px",
                            background: "#fff",
                            display: "block",
                            textDecoration: "none",
                            color: "inherit",
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 700,
                              marginBottom: 6,
                              color: "#1a202c",
                            }}
                          >
                            {article.Headline || "Untitled"}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#6b7280",
                              marginBottom: 8,
                            }}
                          >
                            {new Date(
                              article.Publication_Date
                            ).toLocaleDateString()}
                          </div>
                          <div style={{ fontSize: 14, color: "#374151" }}>
                            {article.Strapline || ""}
                          </div>
                        </a>
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
              </>
            </div>

            {/* Desktop Financial Metrics */}
            <div style={styles.card} className="card desktop-financial-metrics">
              <h2 style={styles.sectionTitle}>
                Financial Metrics{metricsCurrencySuffix}
              </h2>
              {!hasIncomeStatementData && (
                <div style={styles.infoRow}>
                  <span style={styles.label}>Revenue (m):</span>
                  <span
                    style={styles.value}
                    title={
                      sourceLabel(financialMetrics?.Rev_source)
                        ? `Source: ${sourceLabel(financialMetrics?.Rev_source)}`
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
                      sourceLabel(financialMetrics?.EBITDA_source)
                        ? `Source: ${sourceLabel(
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
                    sourceLabel(financialMetrics?.EV_source)
                      ? `Source: ${sourceLabel(financialMetrics?.EV_source)}`
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
                    sourceLabel(financialMetrics?.Rev_x_source)
                      ? `Source: ${sourceLabel(financialMetrics?.Rev_x_source)}`
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
                    sourceLabel(financialMetrics?.Rev_Growth_source)
                      ? `Source: ${sourceLabel(
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
                    sourceLabel(financialMetrics?.EBITDA_margin_source)
                      ? `Source: ${sourceLabel(
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
                    sourceLabel(financialMetrics?.Rule_of_40_source)
                      ? `Source: ${sourceLabel(
                          financialMetrics?.Rule_of_40_source
                        )}`
                      : undefined
                  }
                >
                  {typeof financialMetrics?.Rule_of_40 === "number"
                    ? Math.round(financialMetrics.Rule_of_40).toLocaleString()
                    : "Not available"}
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
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>ARR (m):</span>
                <span
                  style={styles.value}
                  title={
                    sourceLabel(financialMetrics?.ARR_source)
                      ? `Source: ${sourceLabel(financialMetrics?.ARR_source)}`
                      : undefined
                  }
                >
                  {typeof financialMetrics?.ARR_m === "number"
                    ? formatPlainNumber(financialMetrics.ARR_m)
                    : "Not available"}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Churn:</span>
                <span style={styles.value}>
                  {formatPercent(financialMetrics?.Churn_pc)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>GRR:</span>
                <span style={styles.value}>
                  {formatPercent(financialMetrics?.GRR_pc)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Upsell:</span>
                <span style={styles.value}>
                  {formatPercent(financialMetrics?.Upsell_pc)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Cross-sell:</span>
                <span style={styles.value}>
                  {formatPercent(financialMetrics?.Cross_sell_pc)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Price increase:</span>
                <span style={styles.value}>
                  {formatPercent(financialMetrics?.Price_increase_pc)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Revenue expansion:</span>
                <span style={styles.value}>
                  {formatPercent(financialMetrics?.Rev_expansion_pc)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>NRR:</span>
                <span style={styles.value}>
                  {typeof financialMetrics?.NRR === "number"
                    ? `${Math.round(financialMetrics.NRR)}%`
                    : "Not available"}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>New clients revenue growth:</span>
                <span style={styles.value}>
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
                    sourceLabel(financialMetrics?.EBIT_source)
                      ? `Source: ${sourceLabel(financialMetrics?.EBIT_source)}`
                      : undefined
                  }
                >
                  {typeof financialMetrics?.EBIT_m === "number"
                    ? formatPlainNumber(financialMetrics.EBIT_m)
                    : "Not available"}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Number of clients:</span>
                <span style={styles.value}>
                  {typeof financialMetrics?.No_of_Clients === "number"
                    ? financialMetrics.No_of_Clients.toLocaleString()
                    : "Not available"}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Revenue per client (k):</span>
                <span style={styles.value}>
                  {typeof financialMetrics?.Rev_per_client === "number"
                    ? toThousandsPlain(financialMetrics.Rev_per_client)
                    : "Not available"}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Number of employees:</span>
                <span style={styles.value}>
                  {typeof financialMetrics?.No_Employees === "number"
                    ? financialMetrics.No_Employees.toLocaleString()
                    : formatNumber(currentEmployeeCount)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Revenue per employee (k):</span>
                <span style={styles.value}>
                  {typeof financialMetrics?.Revenue_per_employee === "number"
                    ? toThousandsPlain(financialMetrics.Revenue_per_employee)
                    : "Not available"}
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
              {!hasIncomeStatementData && (
                <div style={styles.infoRow}>
                  <span style={styles.label}>Revenue (m):</span>
                  <span
                    style={styles.value}
                    title={
                      sourceLabel(financialMetrics?.Rev_source)
                        ? `Source: ${sourceLabel(financialMetrics?.Rev_source)}`
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
                      sourceLabel(financialMetrics?.EBITDA_source)
                        ? `Source: ${sourceLabel(
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
                    sourceLabel(financialMetrics?.EV_source)
                      ? `Source: ${sourceLabel(financialMetrics?.EV_source)}`
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
                    sourceLabel(financialMetrics?.Rev_x_source)
                      ? `Source: ${sourceLabel(financialMetrics?.Rev_x_source)}`
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
                    sourceLabel(financialMetrics?.Rev_Growth_source)
                      ? `Source: ${sourceLabel(
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
                    sourceLabel(financialMetrics?.EBITDA_margin_source)
                      ? `Source: ${sourceLabel(
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
                    sourceLabel(financialMetrics?.Rule_of_40_source)
                      ? `Source: ${sourceLabel(
                          financialMetrics?.Rule_of_40_source
                        )}`
                      : undefined
                  }
                >
                  {typeof financialMetrics?.Rule_of_40 === "number"
                    ? Math.round(financialMetrics.Rule_of_40).toLocaleString()
                    : "Not available"}
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
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>ARR (m):</span>
                <span
                  style={styles.value}
                  title={
                    sourceLabel(financialMetrics?.ARR_source)
                      ? `Source: ${sourceLabel(financialMetrics?.ARR_source)}`
                      : undefined
                  }
                >
                  {typeof financialMetrics?.ARR_m === "number"
                    ? formatPlainNumber(financialMetrics.ARR_m)
                    : "Not available"}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Churn:</span>
                <span style={styles.value}>
                  {formatPercent(financialMetrics?.Churn_pc)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>GRR:</span>
                <span style={styles.value}>
                  {formatPercent(financialMetrics?.GRR_pc)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Upsell:</span>
                <span style={styles.value}>
                  {formatPercent(financialMetrics?.Upsell_pc)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Cross-sell:</span>
                <span style={styles.value}>
                  {formatPercent(financialMetrics?.Cross_sell_pc)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Price increase:</span>
                <span style={styles.value}>
                  {formatPercent(financialMetrics?.Price_increase_pc)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Revenue expansion:</span>
                <span style={styles.value}>
                  {formatPercent(financialMetrics?.Rev_expansion_pc)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>NRR:</span>
                <span style={styles.value}>
                  {typeof financialMetrics?.NRR === "number"
                    ? `${Math.round(financialMetrics.NRR)}%`
                    : "Not available"}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>New clients revenue growth:</span>
                <span style={styles.value}>
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
                    sourceLabel(financialMetrics?.EBIT_source)
                      ? `Source: ${sourceLabel(financialMetrics?.EBIT_source)}`
                      : undefined
                  }
                >
                  {typeof financialMetrics?.EBIT_m === "number"
                    ? formatPlainNumber(financialMetrics.EBIT_m)
                    : "Not available"}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Number of clients:</span>
                <span style={styles.value}>
                  {typeof financialMetrics?.No_of_Clients === "number"
                    ? financialMetrics.No_of_Clients.toLocaleString()
                    : "Not available"}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Revenue per client (k):</span>
                <span style={styles.value}>
                  {typeof financialMetrics?.Rev_per_client === "number"
                    ? toThousandsPlain(financialMetrics.Rev_per_client)
                    : "Not available"}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Number of employees:</span>
                <span style={styles.value}>
                  {typeof financialMetrics?.No_Employees === "number"
                    ? financialMetrics.No_Employees.toLocaleString()
                    : formatNumber(currentEmployeeCount)}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Revenue per employee (k):</span>
                <span style={styles.value}>
                  {typeof financialMetrics?.Revenue_per_employee === "number"
                    ? toThousandsPlain(financialMetrics.Revenue_per_employee)
                    : "Not available"}
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

          {/* Current Subsidiaries section */}
          {hasSubsidiaries && (
            <div style={{ ...styles.card, marginTop: "32px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "24px",
                }}
              >
                <h2 style={styles.sectionTitle}>Current Subsidiaries</h2>
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

          {/* Corporate Events section moved into Overview above */}
          {(corporateEventsLoading || corporateEvents.length > 0) && (
            <div style={{ display: "none" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "24px",
                }}
              >
                <h2 style={styles.sectionTitle}>Corporate Events</h2>
              </div>
              {corporateEventsLoading ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "#666",
                    fontSize: "14px",
                  }}
                >
                  Loading corporate events...
                </div>
              ) : (
                <div style={{ overflowX: "auto", maxWidth: "100%" }}>
                  <table className="corporate-event-table">
                    <thead>
                      <tr>
                        <th>Event Details</th>
                        <th>Parties</th>
                        <th>Deal Details</th>
                        <th>Advisors</th>
                        <th>Sectors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(showAllCorporateEvents
                        ? corporateEvents
                        : corporateEvents.slice(0, 3)
                      ).map((event, index) => {
                        const isPartnership = /partnership/i.test(
                          (event as NewCorporateEvent).deal_type ||
                            (event as LegacyCorporateEvent).deal_type ||
                            ""
                        );
                        const eventDate = (() => {
                          const raw =
                            (event as NewCorporateEvent).announcement_date ||
                            (event as LegacyCorporateEvent).announcement_date;
                          try {
                            return new Date(raw).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            });
                          } catch {
                            return "Not available";
                          }
                        })();
                        return (
                          <tr key={event.id || index}>
                            {/* Event Details */}
                            <td>
                              <div style={{ marginBottom: "6px" }}>
                                <a
                                  href={`/corporate-event/${event.id}`}
                                  className="corporate-event-name"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    router.replace(
                                      `/corporate-event/${event.id}`
                                    );
                                  }}
                                >
                                  {event.description || "Not Available"}
                                </a>
                              </div>
                              <div className="muted-row">Date: {eventDate}</div>
                              <div className="muted-row">
                                Target HQ: {fullAddress || "Not available"}
                              </div>
                            </td>
                            {/* Parties */}
                            <td>
                              <div className="muted-row">
                                <strong>Target:</strong>{" "}
                                <a
                                  href={`/company/${companyId}`}
                                  className="link-blue"
                                >
                                  {company.name}
                                </a>
                              </div>
                              <div className="muted-row">
                                <strong>Other counterparties:</strong>{" "}
                                {(() => {
                                  const newEvent = event as NewCorporateEvent;
                                  if (
                                    Array.isArray(newEvent.other_counterparties)
                                  ) {
                                    const list =
                                      newEvent.other_counterparties.filter(
                                        (c) =>
                                          c &&
                                          typeof c.id === "number" &&
                                          c.name
                                      );
                                    if (list.length === 0)
                                      return <span>Not Available</span>;
                                    return list.map((c, idx) => {
                                      const href =
                                        c.page_type === "investor"
                                          ? `/investors/${c.id}`
                                          : `/company/${c.id}`;
                                      return (
                                        <span key={`${c.id}-${idx}`}>
                                          <a href={href} className="link-blue">
                                            {c.name}
                                          </a>
                                          {idx < list.length - 1 && ", "}
                                        </span>
                                      );
                                    });
                                  }
                                  const legacy = event as LegacyCorporateEvent;
                                  const items = (legacy["0"] || []).filter(
                                    (it) =>
                                      it &&
                                      it._new_company &&
                                      it._new_company.name
                                  );
                                  if (items.length === 0)
                                    return <span>Not Available</span>;
                                  return items.map((it, idx) => {
                                    const id = it._new_company?.id;
                                    const isInvestor = Boolean(
                                      it._new_company?._is_that_investor
                                    );
                                    const href = isInvestor
                                      ? `/investors/${id}`
                                      : `/company/${id}`;
                                    if (!id) {
                                      return (
                                        <span
                                          key={`${it._new_company?.name}-${idx}`}
                                        >
                                          {it._new_company?.name}
                                          {idx < items.length - 1 && ", "}
                                        </span>
                                      );
                                    }
                                    return (
                                      <span key={`${id}-${idx}`}>
                                        <a href={href} className="link-blue">
                                          {it._new_company!.name}
                                        </a>
                                        {idx < items.length - 1 && ", "}
                                      </span>
                                    );
                                  });
                                })()}
                              </div>
                            </td>
                            {/* Deal Details */}
                            <td>
                              <div className="muted-row">
                                <strong>Deal Type:</strong>{" "}
                                {(event as NewCorporateEvent).deal_type ||
                                (event as LegacyCorporateEvent).deal_type ? (
                                  <span className="pill pill-blue">
                                    {(event as NewCorporateEvent).deal_type ||
                                      (event as LegacyCorporateEvent).deal_type}
                                  </span>
                                ) : (
                                  <span>Not Available</span>
                                )}
                              </div>
                              {!isPartnership && (
                                <div className="muted-row">
                                  <strong>Amount (m):</strong>{" "}
                                  {(() => {
                                    const display = (event as NewCorporateEvent)
                                      .investment_display;
                                    if (display && display.trim())
                                      return display;
                                    const legacy =
                                      event as LegacyCorporateEvent;
                                    const legacyAny = legacy as unknown as {
                                      investment_data?: {
                                        investment_amount_m?: number | string;
                                        investment_amount?: number | string;
                                        currency?: { Currency?: string };
                                        _currency?: { Currency?: string };
                                        currrency?: { Currency?: string };
                                      };
                                      investment_amount_m?: number | string;
                                      investment_amount?: number | string;
                                    };
                                    const amount =
                                      legacyAny?.investment_data
                                        ?.investment_amount_m ??
                                      legacyAny?.investment_data
                                        ?.investment_amount ??
                                      legacyAny?.investment_amount_m ??
                                      legacyAny?.investment_amount;
                                    const currency: string | undefined =
                                      legacyAny?.investment_data?.currency
                                        ?.Currency ||
                                      legacyAny?.investment_data?._currency
                                        ?.Currency ||
                                      legacyAny?.investment_data?.currrency
                                        ?.Currency;
                                    if (amount != null && currency) {
                                      const n = Number(amount);
                                      if (!Number.isNaN(n))
                                        return `${currency}${n.toLocaleString()}m`;
                                    }
                                    return "Not available";
                                  })()}
                                </div>
                              )}
                              {!isPartnership && (
                                <div className="muted-row">
                                  <strong>EV (m):</strong>{" "}
                                  {(() => {
                                    const display = (event as NewCorporateEvent)
                                      .ev_display as string | undefined;
                                    if (display && display.trim())
                                      return display;
                                    const legacy =
                                      event as LegacyCorporateEvent;
                                    const amount = legacy.ev_data
                                      ?.enterprise_value_m as
                                      | number
                                      | string
                                      | undefined;
                                    const currency: string | undefined =
                                      legacy.ev_data?.currency?.Currency ||
                                      legacy.ev_data?._currency?.Currency;
                                    if (amount != null && currency) {
                                      const n = Number(amount);
                                      if (!Number.isNaN(n))
                                        return `${currency}${n.toLocaleString()}m`;
                                    }
                                    return (
                                      legacy.ev_data?.ev_band || "Not available"
                                    );
                                  })()}
                                </div>
                              )}
                            </td>
                            {/* Advisors */}
                            <td>
                              <div className="muted-row">
                                <strong>Advisors:</strong>{" "}
                                {(() => {
                                  const newEvent = event as NewCorporateEvent;
                                  const namesFromArray = Array.isArray(
                                    newEvent.advisors_names
                                  )
                                    ? newEvent.advisors_names
                                        .map((n) =>
                                          typeof n === "string" ? n : ""
                                        )
                                        .filter((n) => n && n.trim().length > 0)
                                    : [];
                                  const namesFromString =
                                    typeof (
                                      newEvent as unknown as {
                                        advisors_names?: unknown;
                                      }
                                    ).advisors_names === "string"
                                      ? [
                                          String(
                                            (
                                              newEvent as unknown as {
                                                advisors_names?: string;
                                              }
                                            ).advisors_names
                                          ),
                                        ]
                                      : [];
                                  const namesFromObjects = Array.isArray(
                                    newEvent.advisors
                                  )
                                    ? newEvent.advisors
                                        .map(
                                          (a) =>
                                            a?.advisor_company?.name ||
                                            a?._new_company?.name ||
                                            ""
                                        )
                                        .filter((n) => n && n.trim().length > 0)
                                    : [];
                                  let combined = [
                                    ...namesFromArray,
                                    ...namesFromString,
                                    ...namesFromObjects,
                                  ];
                                  if (combined.length === 0) {
                                    const legacy =
                                      event as LegacyCorporateEvent;
                                    const legacyNames = (
                                      (legacy["1"] || []).map(
                                        (item) => item._new_company?.name || ""
                                      ) as Array<string>
                                    ).filter((n) => n && n.trim().length > 0);
                                    combined = legacyNames;
                                  }
                                  const unique = Array.from(
                                    new Set(combined.map((n) => n.trim()))
                                  );
                                  return unique.length > 0
                                    ? unique.join(", ")
                                    : "N/A";
                                })()}
                              </div>
                            </td>
                            {/* Sectors */}
                            <td>
                              <div className="muted-row">
                                <strong>Primary:</strong>{" "}
                                {augmentedPrimarySectors.length > 0
                                  ? augmentedPrimarySectors
                                      .map((s) => s?.sector_name)
                                      .filter(Boolean)
                                      .join(", ")
                                  : "Not available"}
                              </div>
                              <div className="muted-row">
                                <strong>Secondary:</strong>{" "}
                                {secondarySectors.length > 0
                                  ? secondarySectors
                                      .map((s) => s?.sector_name)
                                      .filter(Boolean)
                                      .join(", ")
                                  : "Not available"}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {corporateEvents.length > 3 && (
                    <div style={{ textAlign: "center", marginTop: "16px" }}>
                      <button
                        onClick={() =>
                          setShowAllCorporateEvents(!showAllCorporateEvents)
                        }
                        style={{
                          background: "none",
                          border: "none",
                          color: "#0075df",
                          textDecoration: "underline",
                          cursor: "pointer",
                          fontSize: "14px",
                          padding: "8px 0",
                        }}
                      >
                        {showAllCorporateEvents ? "Show Less" : "See More"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Asymmetrix Content moved into Overview above */}
          {hasArticles && (
            <div style={{ display: "none" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "24px",
                }}
              >
                <h2 style={styles.sectionTitle}>
                  Asymmetrix Insights & Analysis
                </h2>
              </div>
              {articlesLoading ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "#666",
                    fontSize: "14px",
                  }}
                >
                  Loading content...
                </div>
              ) : companyArticles.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                  }}
                >
                  {companyArticles.slice(0, 4).map((article) => (
                    <a
                      key={article.id}
                      href={`/article/${article.id}`}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        padding: "12px 12px",
                        background: "#fff",
                        display: "block",
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          marginBottom: 6,
                          color: "#1a202c",
                        }}
                      >
                        {article.Headline || "Untitled"}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#6b7280",
                          marginBottom: 8,
                        }}
                      >
                        {new Date(
                          article.Publication_Date
                        ).toLocaleDateString()}
                      </div>
                      <div style={{ fontSize: 14, color: "#374151" }}>
                        {article.Strapline || ""}
                      </div>
                    </a>
                  ))}
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
                  No related content found
                </div>
              )}
            </div>
          )}
        </div>
        <style dangerouslySetInnerHTML={{ __html: responsiveCss }} />
      </main>
      <Footer />
    </div>
  );
};

export default CompanyDetail;
