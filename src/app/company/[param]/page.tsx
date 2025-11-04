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
const isNotAvailable = (v?: string | null): boolean =>
  !v || v.trim().length === 0 || v.trim().toLowerCase() === "not available";

// Normalize displays like "40 EUR" -> "EUR 40" and allow fallback currency
const normalizeCurrencyDisplay = (
  display: string,
  fallbackCode?: string
): string => {
  const trimmed = String(display || "").trim();
  if (isNotAvailable(trimmed)) return "Not available";

  // EUR 40 or USD 1,000
  const codeFirst = trimmed.match(/^([A-Z]{3})\s*(\d[\d,\.]*)$/);
  if (codeFirst) return `${codeFirst[1]} ${codeFirst[2]}`;

  // 40 EUR or 1,000 USD -> reorder
  const numFirst = trimmed.match(/^(\d[\d,\.]*)\s+([A-Z]{3})$/);
  if (numFirst) return `${numFirst[2]} ${numFirst[1]}`;

  // Digits only -> use fallback code if present
  const digitsOnly = trimmed.match(/^(\d[\d,\.]*)$/);
  if (digitsOnly && fallbackCode && /^[A-Z]{3}$/.test(fallbackCode)) {
    // Format number with separators
    const n = Number(digitsOnly[1].replace(/,/g, ""));
    const formatted = Number.isFinite(n)
      ? new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n)
      : digitsOnly[1];
    return `${fallbackCode} ${formatted}`;
  }

  return trimmed;
};
const formatNumber = (num: number | undefined): string => {
  if (num === undefined || num === null) return "0";
  return num.toLocaleString();
};

const formatDate = (dateString: string): string => {
  const [year, month] = dateString.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
};

const formatFinancialValue = (value: string, currency?: string): string => {
  // Guard invalids
  if (
    !value ||
    value.toLowerCase?.() === "nan" ||
    value.toLowerCase?.() === "null"
  ) {
    return "Not available";
  }

  // Strip existing grouping separators and whitespace, keep minus and decimal point
  const sanitized = value.replace(/,/g, "").trim();
  const numeric = Number(sanitized);

  // Fallback: if not a finite number, return as-is with currency prefix when valid
  const normalizedCurrency = (currency || "").toString().trim();
  const isDigitsOnly = /^\d+$/.test(normalizedCurrency);

  if (!Number.isFinite(numeric)) {
    if (
      normalizedCurrency &&
      !isDigitsOnly &&
      normalizedCurrency.toLowerCase() !== "nan" &&
      normalizedCurrency.toLowerCase() !== "null"
    ) {
      return `${normalizedCurrency}${value}`;
    }
    return value;
  }

  // Format with thousand separators (commas) and no decimals
  const formattedNumber = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(numeric);

  if (
    normalizedCurrency &&
    !isDigitsOnly &&
    normalizedCurrency.toLowerCase() !== "nan" &&
    normalizedCurrency.toLowerCase() !== "null"
  ) {
    return `${normalizedCurrency}${formattedNumber}`;
  }

  return formattedNumber;
};

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
  const [corporateEventsLoading, setCorporateEventsLoading] = useState(false);
  const [showAllCorporateEvents, setShowAllCorporateEvents] = useState(false);
  const [showAllSubsidiaries, setShowAllSubsidiaries] = useState(false);
  const [companyArticles, setCompanyArticles] = useState<ContentArticle[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  // Optional preformatted displays from API (ebitda_data)
  const [metricsDisplay, setMetricsDisplay] = useState<
    | {
        revenue?: string;
        ebitda?: string;
        ev?: string;
      }
    | undefined
  >();
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

  // Stock chart parameters - hardcoded for S&P Global (company ID 2142)
  const [chartRange, setChartRange] = useState<string>(DEFAULT_RANGE);
  const [chartInterval, setChartInterval] = useState<string>(DEFAULT_INTERVAL);

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
      // Support new API shape: data.new_counterparties: [{ items: "[ ... ]" | [...] }]
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
      // Don't set main error state for corporate events loading failure
    } finally {
      setCorporateEventsLoading(false);
    }
  }, [companyId]);

  // Fetch Asymmetrix content articles related to this company (by company id)
  const fetchCompanyArticles = useCallback(
    async (companyIdForContent: string | number) => {
      if (companyIdForContent === undefined || companyIdForContent === null)
        return;
      setArticlesLoading(true);
      try {
        const token = localStorage.getItem("asymmetrix_auth_token");
        if (!token) {
          throw new Error("Missing auth token for content fetch");
        }

        const params = new URLSearchParams();
        // API expects the misspelled key 'conpany_id'
        params.append("conpany_id", String(companyIdForContent));
        const url = `https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu/Get_Content_Articles?${params.toString()}`;
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok)
          throw new Error(`Articles fetch failed: ${response.status}`);
        const data = await response.json();
        setCompanyArticles(
          Array.isArray(data) ? (data as ContentArticle[]) : []
        );
      } catch (err) {
        console.error("Error fetching company articles:", err);
        setCompanyArticles([]);
      } finally {
        setArticlesLoading(false);
      }
    },
    []
  );

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
          investors: data.Company.investors_new_company || [],
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
      fetchCorporateEvents();
    }
  }, [companyId, fetchCorporateEvents, fetchCompanyArticles, requestCompany]);

  // Fetch minimal metadata for each investor to determine correct routing target
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    const run = async () => {
      try {
        const list = (
          [
            ...(company?.investors || []),
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
    const prevIdsArray = (company.investors || [])
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

  // Prefer preformatted display values when provided by API (ebitda_data)
  const revenue =
    metricsDisplay && !isNotAvailable(metricsDisplay.revenue)
      ? normalizeCurrencyDisplay(metricsDisplay.revenue!, displayCurrency)
      : formatFinancialValue(company.revenues?.revenues_m, displayCurrency);
  const ebitda =
    metricsDisplay && !isNotAvailable(metricsDisplay.ebitda)
      ? normalizeCurrencyDisplay(metricsDisplay.ebitda!, displayCurrency)
      : formatFinancialValue(company.EBITDA?.EBITDA_m, displayCurrency);
  const enterpriseValue =
    metricsDisplay && !isNotAvailable(metricsDisplay.ev)
      ? normalizeCurrencyDisplay(
          metricsDisplay.ev!,
          evCurrency || displayCurrency
        )
      : formatFinancialValue(
          company.ev_data?.ev_value,
          evCurrency || displayCurrency
        );

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
      backgroundColor: "#e53e3e",
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

  const validatedRange = validateRange(chartRange);
  const validatedInterval = validateInterval(
    validatedRange,
    chartInterval as Interval
  );

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
              <div style={styles.scoreBadge}>Asymmetrix Score: Coming Soon</div>
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
                Report Incorrect Data
              </a>
            </div>
          </div>

          {/* Stock Chart Section - S&P Global (ID: 2142) and Vaisala (ID: 2633) */}
          {company.id === 2142 && (
            <Card style={{ marginBottom: "24px" }}>
              <CardContent className="pt-6 space-y-10 lg:px-40 lg:py-14">
                <StockChartClient
                  ticker="SPGI"
                  range={validatedRange}
                  interval={validatedInterval}
                />
                <FinanceSummaryClient ticker="SPGI" />
                <CompanySummaryCardClient ticker="SPGI" />
                <NewsClient ticker="SPGI" />
              </CardContent>
            </Card>
          )}

          {company.id === 2633 && (
            <Card style={{ marginBottom: "24px" }}>
              <CardContent className="pt-6 space-y-10 lg:px-40 lg:py-14">
                <StockChartClient
                  ticker="VAIAS.HE"
                  range={validatedRange}
                  interval={validatedInterval}
                />
                <FinanceSummaryClient ticker="VAIAS.HE" />
                <CompanySummaryCardClient ticker="VAIAS.HE" />
                <NewsClient ticker="VAIAS.HE" />
              </CardContent>
            </Card>
          )}

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
            </div>

            {/* Desktop Financial Metrics */}
            <div style={styles.card} className="card desktop-financial-metrics">
              <h2 style={styles.sectionTitle}>Financial Metrics</h2>
              {!hasIncomeStatementData && (
                <div style={styles.infoRow}>
                  <span style={styles.label}>Revenue (m):</span>
                  <span style={styles.value}>{revenue}</span>
                </div>
              )}
              {!hasIncomeStatementData && (
                <div style={styles.infoRow}>
                  <span style={styles.label}>EBITDA (m):</span>
                  <span style={styles.value}>{ebitda}</span>
                </div>
              )}
              <div style={styles.infoRow}>
                <span style={styles.label}>Enterprise Value (m):</span>
                <span style={styles.value}>{enterpriseValue}</span>
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
              <h2 style={styles.sectionTitle}>Financial Metrics</h2>
              {!hasIncomeStatementData && (
                <div style={styles.infoRow}>
                  <span style={styles.label}>Revenue (m):</span>
                  <span style={styles.value}>{revenue}</span>
                </div>
              )}
              {!hasIncomeStatementData && (
                <div style={styles.infoRow}>
                  <span style={styles.label}>EBITDA (m):</span>
                  <span style={styles.value}>{ebitda}</span>
                </div>
              )}
              <div style={styles.infoRow}>
                <span style={styles.label}>Enterprise Value (m):</span>
                <span style={styles.value}>{enterpriseValue}</span>
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

          {/* Management section */}
          {hasManagement && (
            <div style={{ ...styles.card, marginTop: "32px" }}>
              <h2 style={{ ...styles.sectionTitle, marginBottom: "32px" }}>
                Management
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "24px",
                }}
                className="management-grid"
              >
                <div>
                  <h3
                    style={{
                      ...styles.label,
                      fontSize: "16px",
                      marginBottom: "16px",
                      fontWeight: "600",
                    }}
                  >
                    Current:
                  </h3>
                  {company.Managmant_Roles_current &&
                  company.Managmant_Roles_current.length > 0 ? (
                    company.Managmant_Roles_current.map((person) => (
                      <div
                        key={person.id}
                        style={{ marginBottom: "12px", fontSize: "14px" }}
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
                  <h3
                    style={{
                      ...styles.label,
                      fontSize: "16px",
                      marginBottom: "16px",
                      fontWeight: "600",
                    }}
                  >
                    Past:
                  </h3>
                  {company.Managmant_Roles_past &&
                  company.Managmant_Roles_past.length > 0 ? (
                    company.Managmant_Roles_past.map((person) => (
                      <div
                        key={person.id}
                        style={{ marginBottom: "12px", fontSize: "14px" }}
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

          {/* Corporate Events section */}
          {(corporateEventsLoading || corporateEvents.length > 0) && (
            <div style={{ ...styles.card, marginTop: "32px" }}>
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
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      minWidth: "1000px",
                    }}
                  >
                    <thead>
                      <tr>
                        {[
                          "Description",
                          "Date Announced",
                          "Type",
                          "Counterparty status",
                          "Other counterparties",
                          "Investment",
                          "Enterprise value",
                          "Advisors",
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
                      {(showAllCorporateEvents
                        ? corporateEvents
                        : corporateEvents.slice(0, 3)
                      ).map((event, index) => (
                        <tr key={event.id || index}>
                          <td
                            style={{
                              padding: "12px 8px",
                              borderBottom: "1px solid #e2e8f0",
                            }}
                          >
                            {createClickableElement(
                              `/corporate-event/${event.id}`,
                              event.description
                            )}
                          </td>
                          <td
                            style={{
                              padding: "12px 8px",
                              borderBottom: "1px solid #e2e8f0",
                              fontSize: "14px",
                            }}
                          >
                            {new Date(
                              (event as NewCorporateEvent).announcement_date ||
                                (event as LegacyCorporateEvent)
                                  .announcement_date
                            ).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </td>
                          <td
                            style={{
                              padding: "12px 8px",
                              borderBottom: "1px solid #e2e8f0",
                              fontSize: "14px",
                            }}
                          >
                            {(event as NewCorporateEvent).deal_type ||
                              (event as LegacyCorporateEvent).deal_type ||
                              "N/A"}
                          </td>
                          <td
                            style={{
                              padding: "12px 8px",
                              borderBottom: "1px solid #e2e8f0",
                              fontSize: "14px",
                            }}
                          >
                            {(() => {
                              const newStatus = (event as NewCorporateEvent)
                                .this_company_status;
                              if (newStatus) return newStatus;
                              const legacy = event as LegacyCorporateEvent;
                              return (
                                legacy.counterparty_status?.counterparty_syayus
                                  ?.counterparty_status || "N/A"
                              );
                            })()}
                          </td>
                          <td
                            style={{
                              padding: "12px 8px",
                              borderBottom: "1px solid #e2e8f0",
                              fontSize: "14px",
                            }}
                          >
                            {(() => {
                              const newEvent = event as NewCorporateEvent;
                              const looksNew =
                                typeof newEvent.this_company_status ===
                                  "string" ||
                                Array.isArray(newEvent.advisors_names) ||
                                Array.isArray(newEvent.other_counterparties);
                              if (looksNew) {
                                const list = (
                                  newEvent.other_counterparties || []
                                ).filter(
                                  (c) =>
                                    c &&
                                    typeof c === "object" &&
                                    typeof c.id === "number" &&
                                    c.name
                                );
                                if (list.length === 0) return "N/A";
                                return (
                                  <>
                                    {list.map((c, idx) => {
                                      const target =
                                        c.page_type === "investor"
                                          ? `/investors/${c.id}`
                                          : `/company/${c.id}`;
                                      return (
                                        <span key={`${c.id}-${idx}`}>
                                          <a
                                            href={target}
                                            onClick={(e) => {
                                              e.preventDefault();
                                              router.replace(target);
                                            }}
                                            style={{
                                              color: "#0075df",
                                              textDecoration: "none",
                                              cursor: "pointer",
                                            }}
                                          >
                                            {c.name}
                                          </a>
                                          {idx < list.length - 1 && ", "}
                                        </span>
                                      );
                                    })}
                                  </>
                                );
                              }
                              const legacy = event as LegacyCorporateEvent;
                              const items = (legacy["0"] || []).filter(
                                (it) =>
                                  it && it._new_company && it._new_company.name
                              );
                              if (items.length === 0) return "N/A";
                              return (
                                <>
                                  {items.map((it, idx) => {
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
                                          onClick={(e) => {
                                            e.preventDefault();
                                            router.replace(href);
                                          }}
                                          style={{
                                            color: "#0075df",
                                            textDecoration: "none",
                                            cursor: "pointer",
                                          }}
                                        >
                                          {it._new_company!.name}
                                        </a>
                                        {idx < items.length - 1 && ", "}
                                      </span>
                                    );
                                  })}
                                </>
                              );
                            })()}
                          </td>
                          {/* Investment */}
                          <td
                            style={{
                              padding: "12px 8px",
                              borderBottom: "1px solid #e2e8f0",
                              fontSize: "14px",
                            }}
                          >
                            {(() => {
                              // Prefer new display field when present
                              const display = (event as NewCorporateEvent)
                                .investment_display;
                              if (display && display.trim()) return display;
                              const legacy = event as LegacyCorporateEvent;
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
                                legacyAny?.investment_data?.investment_amount ??
                                legacyAny?.investment_amount_m ??
                                legacyAny?.investment_amount;
                              const investmentCurrency: string | undefined =
                                legacyAny?.investment_data?.currency
                                  ?.Currency ||
                                legacyAny?.investment_data?._currency
                                  ?.Currency ||
                                legacyAny?.investment_data?.currrency?.Currency;
                              const evCurrency: string | undefined =
                                legacy.ev_data?._currency?.Currency ||
                                legacy.ev_data?.currency?.Currency;
                              const currencySymbol =
                                investmentCurrency || evCurrency;
                              if (amount != null && currencySymbol) {
                                const numeric = Number(amount);
                                if (!Number.isNaN(numeric)) {
                                  return `${currencySymbol}${numeric.toLocaleString()}m`;
                                }
                              }
                              return "Not available";
                            })()}
                          </td>
                          <td
                            style={{
                              padding: "12px 8px",
                              borderBottom: "1px solid #e2e8f0",
                              fontSize: "14px",
                            }}
                          >
                            {(() => {
                              // Prefer new display field when present
                              const display = (event as NewCorporateEvent)
                                .ev_display as string | undefined;
                              if (display && display.trim()) return display;
                              const legacy = event as LegacyCorporateEvent;
                              const amount = legacy.ev_data
                                ?.enterprise_value_m as
                                | number
                                | string
                                | undefined;
                              // Support either ev_data.currency.Currency or ev_data._currency.Currency
                              const currency: string | undefined =
                                legacy.ev_data?.currency?.Currency ||
                                legacy.ev_data?._currency?.Currency;
                              if (amount != null && currency) {
                                const n = Number(amount);
                                if (!Number.isNaN(n)) {
                                  return `${currency}${n.toLocaleString()}m`;
                                }
                              }
                              return legacy.ev_data?.ev_band || "Not available";
                            })()}
                          </td>
                          <td
                            style={{
                              padding: "12px 8px",
                              borderBottom: "1px solid #e2e8f0",
                              fontSize: "14px",
                            }}
                          >
                            {(() => {
                              const newEvent = event as NewCorporateEvent;
                              // Advisors names can be provided as array of strings, string, or derived from advisors list
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
                                // Legacy fallback: advisors provided under group "1"
                                const legacy = event as LegacyCorporateEvent;
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
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Show "See More" button if there are more than 3 events */}
                  {corporateEvents.length > 3 && (
                    <div
                      style={{
                        textAlign: "center",
                        marginTop: "16px",
                      }}
                    >
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

          {/* Asymmetrix Content (Insights & Analysis) related to this company */}
          {hasArticles && (
            <div style={{ ...styles.card, marginTop: "32px" }}>
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
