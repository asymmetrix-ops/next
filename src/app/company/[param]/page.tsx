"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
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
  revenues_currency: string;
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

interface CompanyLinkedInData {
  linkedin_logo: string;
  LinkedIn_URL: string;
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

interface CorporateEvent {
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
    enterprise_value_m?: number;
    ev_band?: string;
  };
  "0"?: Array<{
    _new_company?: {
      name: string;
    };
  }>;
  "1"?: Array<{
    _new_company?: {
      name: string;
    };
  }>;
}

interface CorporateEventsResponse {
  New_Events_Wits_Advisors: CorporateEvent[];
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
}

interface CompanyResponse {
  Company: Company;
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

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<number>>(
    new Set()
  );

  const [isMobile, setIsMobile] = useState(false);
  const [showAllPrimarySectors, setShowAllPrimarySectors] = useState(false);
  const [showAllSecondarySectors, setShowAllSecondarySectors] = useState(false);
  const [corporateEvents, setCorporateEvents] = useState<CorporateEvent[]>([]);
  const [corporateEventsLoading, setCorporateEventsLoading] = useState(false);
  const [showAllCorporateEvents, setShowAllCorporateEvents] = useState(false);
  const [showAllSubsidiaries, setShowAllSubsidiaries] = useState(false);
  const [companyArticles, setCompanyArticles] = useState<ContentArticle[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);

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

      const data: CorporateEventsResponse = await response.json();
      console.log("Corporate events API response:", data);
      setCorporateEvents(data.New_Events_Wits_Advisors || []);
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
        };

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

  // Process sectors
  const primarySectors =
    company.sectors_id?.filter(
      (sector) => sector.Sector_importance === "Primary"
    ) || [];
  const secondarySectors =
    company.sectors_id?.filter(
      (sector) => sector.Sector_importance !== "Primary"
    ) || [];

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
  const revenueCurrency = normalizeCurrency(
    company.revenues?.revenues_currency
  );
  const evCurrency =
    normalizeCurrency(
      company.ev_data?._currency?.Currency ||
        company.ev_data?.currency?.Currency
    ) || undefined;

  // Use revenue currency if valid; otherwise fall back to EV currency
  const displayCurrency = revenueCurrency || evCurrency;

  const revenue = formatFinancialValue(
    company.revenues?.revenues_m,
    displayCurrency
  );
  const ebitda = formatFinancialValue(
    company.EBITDA?.EBITDA_m,
    displayCurrency
  );
  const enterpriseValue = formatFinancialValue(
    company.ev_data?.ev_value,
    evCurrency || displayCurrency
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
                  {primarySectors.length > 0 ? (
                    <>
                      {(isMobile && !showAllPrimarySectors
                        ? primarySectors.slice(0, 4)
                        : primarySectors
                      ).map((sector, index) => {
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
                                ? Math.min(primarySectors.length, 4) - 1
                                : primarySectors.length - 1) && ", "}
                          </span>
                        );
                      })}
                      {isMobile && primarySectors.length > 4 && (
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
                  Investors:
                </span>
                <span style={styles.value} className="info-value">
                  {company.investors && company.investors.length > 0
                    ? company.investors.map((investor, index) => (
                        <span key={investor.id}>
                          {createClickableElement(
                            `/investors/${investor.id}`,
                            investor.name
                          )}
                          {index < company.investors!.length - 1 && ", "}
                        </span>
                      ))
                    : "Not available"}
                </span>
              </div>
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
              <div style={styles.infoRow}>
                <span style={styles.label}>Revenue (m):</span>
                <span style={styles.value}>{revenue}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>EBITDA (m):</span>
                <span style={styles.value}>{ebitda}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Enterprise Value:</span>
                <span style={styles.value}>{enterpriseValue}</span>
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
              {(company._linkedin_data_of_new_company?.LinkedIn_URL ||
                company._linkedin_data_of_new_company?.linkedin_logo) && (
                <div
                  style={{
                    textAlign: "left",
                    marginTop: "16px",
                    paddingTop: "16px",
                    borderTop: "1px solid #e2e8f0",
                  }}
                >
                  <a
                    href={
                      company._linkedin_data_of_new_company?.LinkedIn_URL ||
                      `https://www.linkedin.com/company/${company.name
                        .toLowerCase()
                        .replace(/[^a-z0-9]/g, "")}` ||
                      "#"
                    }
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
              <div style={styles.infoRow}>
                <span style={styles.label}>Revenue (m):</span>
                <span style={styles.value}>{revenue}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>EBITDA (m):</span>
                <span style={styles.value}>{ebitda}</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.label}>Enterprise Value:</span>
                <span style={styles.value}>{enterpriseValue}</span>
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

          {/* LinkedIn section (desktop only) */}
          {company._linkedin_data_of_new_company?.LinkedIn_URL && (
            <div style={styles.card} className="desktop-linkedin-section">
              <div style={{ display: "flex", justifyContent: "center" }}>
                <a
                  href={company._linkedin_data_of_new_company.LinkedIn_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.linkedinLink}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  View on LinkedIn
                </a>
              </div>
            </div>
          )}

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
                          `${person.Individual_text}: ${person.job_titles_id
                            .map((job) => job.job_title)
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
                          `${person.Individual_text}: ${person.job_titles_id
                            .map((job) => job.job_title)
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
                              ?.map((sector) => sector.sector_name)
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
                              event.announcement_date
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
                            {event.deal_type || "N/A"}
                          </td>
                          <td
                            style={{
                              padding: "12px 8px",
                              borderBottom: "1px solid #e2e8f0",
                              fontSize: "14px",
                            }}
                          >
                            {event.counterparty_status?.counterparty_syayus
                              ?.counterparty_status || "N/A"}
                          </td>
                          <td
                            style={{
                              padding: "12px 8px",
                              borderBottom: "1px solid #e2e8f0",
                              fontSize: "14px",
                            }}
                          >
                            {[
                              ...(event["0"] || []).map(
                                (item) => item._new_company?.name
                              ),
                              ...(event["1"] || []).map(
                                (item) => item._new_company?.name
                              ),
                            ]
                              .filter(Boolean)
                              .join(", ") || "N/A"}
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
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              const anyEvent: any = event as any;
                              const amount = anyEvent?.investment_data
                                ?.investment_amount_m as
                                | number
                                | string
                                | undefined;
                              const currency: string | undefined =
                                anyEvent?.investment_data?.currency?.Currency;
                              if (amount != null && currency) {
                                const n = Number(amount);
                                if (!Number.isNaN(n)) {
                                  return `${currency}${n.toLocaleString()}m`;
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
                              const amount = event.ev_data
                                ?.enterprise_value_m as
                                | number
                                | string
                                | undefined;
                              // Support either ev_data.currency.Currency or ev_data._currency.Currency
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              const anyEv: any = event.ev_data as any;
                              const currency: string | undefined =
                                anyEv?.currency?.Currency ||
                                anyEv?._currency?.Currency;
                              if (amount != null && currency) {
                                const n = Number(amount);
                                if (!Number.isNaN(n)) {
                                  return `${currency}${n.toLocaleString()}m`;
                                }
                              }
                              return event.ev_data?.ev_band || "Not available";
                            })()}
                          </td>
                          <td
                            style={{
                              padding: "12px 8px",
                              borderBottom: "1px solid #e2e8f0",
                              fontSize: "14px",
                            }}
                          >
                            N/A
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
                    <div
                      key={article.id}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        padding: "12px 12px",
                        cursor: "pointer",
                        background: "#fff",
                      }}
                      onClick={() =>
                        (window.location.href = `/article/${article.id}`)
                      }
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
                    </div>
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
