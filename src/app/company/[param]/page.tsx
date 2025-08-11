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
  if (!value || value === "nan" || value === "null") return "Not available";

  const normalizedCurrency = (currency || "").toString().trim();
  const isDigitsOnly = /^\d+$/.test(normalizedCurrency);

  // If currency is available and not a numeric id, prepend it to the value
  if (
    normalizedCurrency &&
    !isDigitsOnly &&
    normalizedCurrency.toLowerCase() !== "nan" &&
    normalizedCurrency.toLowerCase() !== "null"
  ) {
    return `${normalizedCurrency}${value}`;
  }

  return value;
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
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
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

  // Fetch Asymmetrix content articles related to this company (by name search)
  const fetchCompanyArticles = useCallback(async (companyName: string) => {
    if (!companyName) return;
    setArticlesLoading(true);
    try {
      const token = localStorage.getItem("asymmetrix_auth_token");
      if (!token) return;

      const params = new URLSearchParams();
      params.append("Offset", "1");
      params.append("Per_page", "5");
      params.append("search_query", companyName);

      const url = `https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu/Get_All_Content_Articles?${params.toString()}`;
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
      setCompanyArticles((data?.items as ContentArticle[]) || []);
    } catch (err) {
      console.error("Error fetching company articles:", err);
      setCompanyArticles([]);
    } finally {
      setArticlesLoading(false);
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
        // Trigger fetching related articles using company name
        if (enrichedCompany?.name) {
          fetchCompanyArticles(enrichedCompany.name);
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
  const hasArticles = Boolean(!articlesLoading && companyArticles.length > 0);

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
      padding: "32px",
      flex: "1",
      display: "flex",
      flexDirection: "column" as const,
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
      gridTemplateColumns: "220px 1fr",
      columnGap: "4px",
      alignItems: "center",
      padding: "10px 0",
      borderBottom: "1px solid #e2e8f0",
    },
    infoRowLast: {
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
    },
    "@media (max-width: 768px)": {
      responsiveGrid: {
        gridTemplateColumns: "1fr",
        gap: "16px",
      },
      header: {
        flexDirection: "column",
        alignItems: "flex-start",
        padding: "20px 16px",
        gap: "12px",
      },
      headerLeft: {
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "12px",
        width: "100%",
      },
      headerRight: {
        alignSelf: "stretch",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "8px",
      },
      maxWidth: {
        padding: "16px",
      },
      card: {
        padding: "20px 16px",
      },
      companyName: {
        fontSize: "22px",
        lineHeight: "1.3",
      },
      sectionTitle: {
        fontSize: "18px",
        marginBottom: "20px",
      },
      infoRow: {
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "4px",
        padding: "16px 0",
      },
      label: {
        fontSize: "13px",
        color: "#718096",
        fontWeight: "600",
        minWidth: "auto",
        marginBottom: "4px",
      },
      value: {
        fontSize: "14px",
        textAlign: "left",
        marginLeft: "0",
        lineHeight: "1.4",
        wordBreak: "break-word",
      },
      description: {
        fontSize: "14px",
        lineHeight: "1.5",
        marginTop: "12px",
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

  return React.createElement(
    "div",
    { className: "company-detail-page" },
    React.createElement(Header, null),
    React.createElement(
      "div",
      { style: styles.maxWidth },
      React.createElement(
        "div",
        { style: styles.header },
        React.createElement(
          "div",
          { style: styles.headerLeft },
          React.createElement(CompanyLogo, {
            logo: company._linkedin_data_of_new_company?.linkedin_logo,
            name: company.name,
          }),
          React.createElement("h1", { style: styles.companyName }, company.name)
        ),
        React.createElement(
          "div",
          { style: styles.headerRight },
          React.createElement(
            "div",
            { style: styles.scoreBadge },
            "Asymmetrix Score: Coming Soon"
          ),
          React.createElement(
            "a",
            {
              style: {
                ...styles.reportButton,
                display: "inline-flex",
                alignItems: "center",
              },
              href: "mailto:a.boden@asymmetrixintelligence.com?subject=Report%20Incorrect%20Company%20Data&body=Please%20describe%20the%20issue%20you%20found.",
            },
            "Report Incorrect Data"
          )
        )
      ),
      React.createElement(
        "div",
        { style: styles.responsiveGrid, className: "responsiveGrid" },
        React.createElement(
          "div",
          { style: styles.card, className: "card" },
          React.createElement("h2", { style: styles.sectionTitle }, "Overview"),
          React.createElement(
            "div",
            { style: styles.infoRow },
            React.createElement(
              "span",
              { style: styles.label },
              "Primary Sector:"
            ),
            React.createElement(
              "div",
              { style: styles.value },
              primarySectors.length > 0
                ? primarySectors.map((sector, index) => {
                    const id = getSectorId(sector);
                    return React.createElement(
                      "span",
                      { key: `${sector.sector_name}-${index}` },
                      [
                        id
                          ? createClickableElement(
                              `/sector/${id}`,
                              sector.sector_name
                            )
                          : React.createElement(
                              "span",
                              { style: { color: "#000" } },
                              sector.sector_name
                            ),
                        index < primarySectors.length - 1 && ", ",
                      ]
                    );
                  })
                : "Not available"
            )
          ),
          React.createElement(
            "div",
            { style: styles.infoRow },
            React.createElement(
              "span",
              { style: styles.label },
              "Secondary Sector(s):"
            ),
            React.createElement(
              "div",
              { style: styles.value },
              secondarySectors.length > 0
                ? secondarySectors.map((sector, index) => {
                    const id = getSectorId(sector);
                    return React.createElement(
                      "span",
                      { key: `${sector.sector_name}-${index}` },
                      [
                        id
                          ? createClickableElement(
                              `/sector/${id}`,
                              sector.sector_name
                            )
                          : React.createElement(
                              "span",
                              { style: { color: "#000" } },
                              sector.sector_name
                            ),
                        index < secondarySectors.length - 1 && ", ",
                      ]
                    );
                  })
                : "Not available"
            )
          ),
          React.createElement(
            "div",
            { style: styles.infoRow },
            React.createElement(
              "span",
              { style: styles.label },
              "Year Founded:"
            ),
            React.createElement(
              "span",
              { style: styles.value },
              getYearFoundedDisplay(company)
            )
          ),
          React.createElement(
            "div",
            { style: styles.infoRow },
            React.createElement("span", { style: styles.label }, "Website:"),
            React.createElement(
              "span",
              { style: styles.value },
              company.url
                ? React.createElement(
                    "a",
                    {
                      href: company.url,
                      target: "_blank",
                      rel: "noopener noreferrer",
                      style: styles.link,
                    },
                    company.url
                  )
                : "Not available"
            )
          ),
          React.createElement(
            "div",
            { style: styles.infoRow },
            React.createElement("span", { style: styles.label }, "Ownership:"),
            React.createElement(
              "span",
              { style: styles.value },
              company._ownership_type?.ownership || "Not available"
            )
          ),
          React.createElement(
            "div",
            { style: styles.infoRow },
            React.createElement("span", { style: styles.label }, "HQ:"),
            React.createElement(
              "span",
              { style: styles.value },
              fullAddress || "Not available"
            )
          ),
          React.createElement(
            "div",
            { style: styles.infoRow },
            React.createElement(
              "span",
              { style: styles.label },
              "Lifecycle stage:"
            ),
            React.createElement(
              "span",
              { style: styles.value },
              company.Lifecycle_stage?.Lifecycle_Stage || "Not available"
            )
          ),
          React.createElement(
            "div",
            { style: styles.infoRow },
            React.createElement("span", { style: styles.label }, "Investors:"),
            React.createElement(
              "span",
              { style: styles.value },
              company.investors && company.investors.length > 0
                ? company.investors.map((investor, index) =>
                    React.createElement("span", { key: investor.id }, [
                      createClickableElement(
                        `/investors/${investor.id}`,
                        investor.name
                      ),
                      index < company.investors!.length - 1 && ", ",
                    ])
                  )
                : "Not available"
            )
          ),
          React.createElement(
            "div",
            { style: styles.infoRowLast },
            React.createElement("span", { style: styles.label }, "Description:")
          ),
          React.createElement(
            "div",
            { style: styles.description },
            company.description || "No description available"
          )
        ),
        // Desktop Financial Metrics (stays in grid for desktop)
        React.createElement(
          "div",
          { style: styles.card, className: "card desktop-financial-metrics" },
          React.createElement(
            "h2",
            { style: styles.sectionTitle },
            "Financial Metrics"
          ),
          React.createElement(
            "div",
            { style: styles.infoRow },
            React.createElement(
              "span",
              { style: styles.label },
              "Revenue (m):"
            ),
            React.createElement("span", { style: styles.value }, revenue)
          ),
          React.createElement(
            "div",
            { style: styles.infoRow },
            React.createElement("span", { style: styles.label }, "EBITDA (m):"),
            React.createElement("span", { style: styles.value }, ebitda)
          ),
          React.createElement(
            "div",
            { style: styles.infoRow },
            React.createElement(
              "span",
              { style: styles.label },
              "Enterprise Value:"
            ),
            React.createElement(
              "span",
              { style: styles.value },
              enterpriseValue
            )
          ),
          React.createElement(
            "div",
            { style: styles.chartContainer, className: "chartContainer" },
            React.createElement(
              "div",
              { style: styles.chartTitle },
              "LinkedIn Employee Count"
            ),
            React.createElement(
              "div",
              { style: styles.currentCount },
              `${formatNumber(currentEmployeeCount)} employees`
            ),
            employeeData.length > 0
              ? React.createElement(EmployeeChart, { data: employeeData })
              : React.createElement(
                  "div",
                  {
                    style: {
                      textAlign: "center",
                      padding: "40px",
                      color: "#666",
                      fontSize: "14px",
                    },
                  },
                  "No employee data available"
                )
          )
        )
      ),
      // Mobile Financial Metrics (shown on mobile)
      React.createElement(
        "div",
        {
          style: { display: "none", marginTop: "8px" },
          className: "mobile-financial-metrics",
        },
        React.createElement(
          "div",
          {
            style: {
              ...styles.card,
              width: "100%",
              padding: "20px 16px", // Ensure consistent mobile padding
            },
          },
          React.createElement(
            "h2",
            { style: styles.sectionTitle },
            "Financial Metrics"
          ),
          React.createElement(
            "div",
            { style: styles.infoRow },
            React.createElement(
              "span",
              { style: styles.label },
              "Revenue (m):"
            ),
            React.createElement("span", { style: styles.value }, revenue)
          ),
          React.createElement(
            "div",
            { style: styles.infoRow },
            React.createElement("span", { style: styles.label }, "EBITDA (m):"),
            React.createElement("span", { style: styles.value }, ebitda)
          ),
          React.createElement(
            "div",
            { style: styles.infoRow },
            React.createElement(
              "span",
              { style: styles.label },
              "Enterprise Value:"
            ),
            React.createElement(
              "span",
              { style: styles.value },
              enterpriseValue
            )
          ),
          React.createElement(
            "div",
            { style: styles.chartContainer },
            React.createElement(
              "div",
              { style: styles.chartTitle },
              "LinkedIn Employee Count"
            ),
            React.createElement(
              "div",
              { style: styles.currentCount },
              `${formatNumber(currentEmployeeCount)} employees`
            ),
            employeeData.length > 0
              ? React.createElement(EmployeeChart, { data: employeeData })
              : React.createElement(
                  "div",
                  {
                    style: {
                      textAlign: "center",
                      padding: "40px",
                      color: "#666",
                      fontSize: "14px",
                    },
                  },
                  "No employee data available"
                )
          )
        )
      ),
      // LinkedIn section (desktop only) - only render if LinkedIn URL exists
      company._linkedin_data_of_new_company?.LinkedIn_URL &&
        React.createElement(
          "div",
          { style: styles.card, className: "desktop-linkedin-section" },
          React.createElement(
            "div",
            { style: { display: "flex", justifyContent: "center" } },
            React.createElement(
              "a",
              {
                href: company._linkedin_data_of_new_company.LinkedIn_URL,
                target: "_blank",
                rel: "noopener noreferrer",
                style: styles.linkedinLink,
              },
              [
                React.createElement(
                  "svg",
                  {
                    key: "svg",
                    width: "20",
                    height: "20",
                    viewBox: "0 0 24 24",
                    fill: "currentColor",
                  },
                  React.createElement("path", {
                    d: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
                  })
                ),
                "View on LinkedIn",
              ]
            )
          )
        ),
      // Management section
      hasManagement &&
        React.createElement(
          "div",
          { style: { ...styles.card, marginTop: "32px" } },
          React.createElement(
            "h2",
            { style: { ...styles.sectionTitle, marginBottom: "32px" } },
            "Management"
          ),
          React.createElement(
            "div",
            {
              style: {
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "24px",
              },
              className: "management-grid",
            },
            React.createElement(
              "div",
              null,
              React.createElement(
                "h3",
                {
                  style: {
                    ...styles.label,
                    fontSize: "16px",
                    marginBottom: "16px",
                    fontWeight: "600",
                  },
                },
                "Current:"
              ),
              (() => {
                console.log("=== MANAGEMENT RENDERING CHECK ===");
                console.log(
                  "company.Managmant_Roles_current:",
                  company.Managmant_Roles_current
                );
                console.log(
                  "Is array?",
                  Array.isArray(company.Managmant_Roles_current)
                );
                console.log("Length:", company.Managmant_Roles_current?.length);
                console.log(
                  "Condition result:",
                  company.Managmant_Roles_current &&
                    company.Managmant_Roles_current.length > 0
                );
                console.log("===================================");
                return company.Managmant_Roles_current &&
                  company.Managmant_Roles_current.length > 0
                  ? company.Managmant_Roles_current.map((person) => {
                      console.log(
                        "Rendering current management person:",
                        person
                      );
                      return React.createElement(
                        "div",
                        {
                          key: person.id,
                          style: { marginBottom: "12px", fontSize: "14px" },
                        },
                        createClickableElement(
                          `/individual/${person.individuals_id}`,
                          `${person.Individual_text}: ${person.job_titles_id
                            .map((job) => job.job_title)
                            .join(", ")}`
                        )
                      );
                    })
                  : React.createElement(
                      "div",
                      { style: { color: "#6b7280", fontSize: "14px" } },
                      "Not available"
                    );
              })()
            ),
            React.createElement(
              "div",
              null,
              React.createElement(
                "h3",
                {
                  style: {
                    ...styles.label,
                    fontSize: "16px",
                    marginBottom: "16px",
                    fontWeight: "600",
                  },
                },
                "Past:"
              ),
              company.Managmant_Roles_past &&
                company.Managmant_Roles_past.length > 0
                ? company.Managmant_Roles_past.map((person) => {
                    console.log("Rendering past management person:", person);
                    return React.createElement(
                      "div",
                      {
                        key: person.id,
                        style: { marginBottom: "12px", fontSize: "14px" },
                      },
                      createClickableElement(
                        `/individual/${person.individuals_id}`,
                        `${person.Individual_text}: ${person.job_titles_id
                          .map((job) => job.job_title)
                          .join(", ")}`
                      )
                    );
                  })
                : React.createElement(
                    "div",
                    { style: { color: "#6b7280", fontSize: "14px" } },
                    "Not available"
                  )
            )
          )
        ),
      // Current Subsidiaries section
      hasSubsidiaries &&
        React.createElement(
          "div",
          { style: { ...styles.card, marginTop: "32px" } },
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "24px",
              },
            },
            React.createElement(
              "h2",
              { style: styles.sectionTitle },
              "Current Subsidiaries"
            ),
            company.have_subsidiaries_companies?.Subsidiaries_companies &&
              company.have_subsidiaries_companies.Subsidiaries_companies
                .length > 3
              ? React.createElement(
                  "button",
                  {
                    onClick: () => setShowAllSubsidiaries((prev) => !prev),
                    style: {
                      background: "none",
                      border: "none",
                      color: "#0075df",
                      fontSize: "14px",
                      textDecoration: "underline",
                      cursor: "pointer",
                    },
                  },
                  showAllSubsidiaries ? "Show less" : "See more"
                )
              : null
          ),
          React.createElement(
            "div",
            { style: { overflowX: "auto" } },
            React.createElement(
              "table",
              { style: { width: "100%", borderCollapse: "collapse" } },
              React.createElement(
                "thead",
                null,
                React.createElement(
                  "tr",
                  null,
                  [
                    "Logo",
                    "Name",
                    "Description",
                    "Sectors",
                    "LinkedIn Members",
                    "Country",
                  ].map((header) =>
                    React.createElement(
                      "th",
                      {
                        key: header,
                        style: {
                          textAlign: "left",
                          padding: "12px 8px",
                          borderBottom: "1px solid #e2e8f0",
                          fontSize: "14px",
                          fontWeight: "600",
                          color: "#4a5568",
                        },
                      },
                      header
                    )
                  )
                )
              ),
              React.createElement(
                "tbody",
                null,
                (
                  company.have_subsidiaries_companies?.Subsidiaries_companies ??
                  []
                )
                  .slice(0, showAllSubsidiaries ? undefined : 3)
                  .map((subsidiary) =>
                    React.createElement(
                      "tr",
                      { key: subsidiary.id },
                      React.createElement(
                        "td",
                        {
                          style: {
                            padding: "12px 8px",
                            borderBottom: "1px solid #e2e8f0",
                          },
                        },
                        subsidiary._linkedin_data_of_new_company?.linkedin_logo
                          ? React.createElement("img", {
                              src: `data:image/jpeg;base64,${subsidiary._linkedin_data_of_new_company.linkedin_logo}`,
                              alt: `${subsidiary.name} logo`,
                              style: {
                                width: "40px",
                                height: "30px",
                                objectFit: "contain",
                              },
                            })
                          : React.createElement(
                              "div",
                              {
                                style: {
                                  width: "40px",
                                  height: "30px",
                                  backgroundColor: "#f7fafc",
                                  borderRadius: "4px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "10px",
                                  color: "#718096",
                                },
                              },
                              "N/A"
                            )
                      ),
                      React.createElement(
                        "td",
                        {
                          style: {
                            padding: "12px 8px",
                            borderBottom: "1px solid #e2e8f0",
                          },
                        },
                        createClickableElement(
                          `/company/${subsidiary.id}`,
                          subsidiary.name
                        )
                      ),
                      React.createElement(
                        "td",
                        {
                          style: {
                            padding: "12px 8px",
                            borderBottom: "1px solid #e2e8f0",
                            fontSize: "14px",
                            maxWidth: "300px",
                          },
                        },
                        subsidiary.description
                          ? React.createElement(
                              "div",
                              null,
                              expandedDescriptions.has(subsidiary.id) ||
                                subsidiary.description.length <= 100
                                ? subsidiary.description
                                : `${subsidiary.description.substring(
                                    0,
                                    100
                                  )}...`,
                              subsidiary.description.length > 100 &&
                                React.createElement(
                                  "button",
                                  {
                                    onClick: () =>
                                      toggleDescription(subsidiary.id),
                                    style: {
                                      background: "none",
                                      border: "none",
                                      color: "#0075df",
                                      cursor: "pointer",
                                      fontSize: "12px",
                                      textDecoration: "underline",
                                      marginLeft: "4px",
                                      padding: "0",
                                    },
                                  },
                                  expandedDescriptions.has(subsidiary.id)
                                    ? "Show less"
                                    : "Expand description"
                                )
                            )
                          : "N/A"
                      ),
                      React.createElement(
                        "td",
                        {
                          style: {
                            padding: "12px 8px",
                            borderBottom: "1px solid #e2e8f0",
                            fontSize: "14px",
                          },
                        },
                        subsidiary.sectors_id
                          ?.map((sector) => sector.sector_name)
                          .join(", ") || "N/A"
                      ),
                      React.createElement(
                        "td",
                        {
                          style: {
                            padding: "12px 8px",
                            borderBottom: "1px solid #e2e8f0",
                            fontSize: "14px",
                            textAlign: "center",
                          },
                        },
                        subsidiary._linkedin_data_of_new_company
                          ?.linkedin_employee || "N/A"
                      ),
                      React.createElement(
                        "td",
                        {
                          style: {
                            padding: "12px 8px",
                            borderBottom: "1px solid #e2e8f0",
                            fontSize: "14px",
                          },
                        },
                        subsidiary._locations?.Country || "N/A"
                      )
                    )
                  )
              )
            ),
            // Corporate Events section
            (corporateEventsLoading || corporateEvents.length > 0) &&
              React.createElement(
                "div",
                { style: { ...styles.card, marginTop: "32px" } },
                React.createElement(
                  "div",
                  {
                    style: {
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "24px",
                    },
                  },
                  React.createElement(
                    "h2",
                    { style: styles.sectionTitle },
                    "Corporate Events"
                  )
                ),
                corporateEventsLoading
                  ? React.createElement(
                      "div",
                      {
                        style: {
                          textAlign: "center",
                          padding: "40px",
                          color: "#666",
                          fontSize: "14px",
                        },
                      },
                      "Loading corporate events..."
                    )
                  : React.createElement(
                      "div",
                      { style: { overflowX: "auto" } },
                      React.createElement(
                        "table",
                        {
                          style: { width: "100%", borderCollapse: "collapse" },
                        },
                        React.createElement(
                          "thead",
                          null,
                          React.createElement(
                            "tr",
                            null,
                            [
                              "Description",
                              "Date Announced",
                              "Type",
                              "Counterparty status",
                              "Other counterparties",
                              "Enterprise value",
                              "Advisors",
                            ].map((header) =>
                              React.createElement(
                                "th",
                                {
                                  key: header,
                                  style: {
                                    textAlign: "left",
                                    padding: "12px 8px",
                                    borderBottom: "1px solid #e2e8f0",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    color: "#4a5568",
                                  },
                                },
                                header
                              )
                            )
                          )
                        ),
                        React.createElement(
                          "tbody",
                          null,
                          (showAllCorporateEvents
                            ? corporateEvents
                            : corporateEvents.slice(0, 3)
                          ).map((event, index) =>
                            React.createElement(
                              "tr",
                              { key: event.id || index },
                              React.createElement(
                                "td",
                                {
                                  style: {
                                    padding: "12px 8px",
                                    borderBottom: "1px solid #e2e8f0",
                                  },
                                },
                                createClickableElement(
                                  `/corporate-event/${event.id}`,
                                  event.description
                                )
                              ),
                              React.createElement(
                                "td",
                                {
                                  style: {
                                    padding: "12px 8px",
                                    borderBottom: "1px solid #e2e8f0",
                                    fontSize: "14px",
                                  },
                                },
                                new Date(
                                  event.announcement_date
                                ).toLocaleDateString()
                              ),
                              React.createElement(
                                "td",
                                {
                                  style: {
                                    padding: "12px 8px",
                                    borderBottom: "1px solid #e2e8f0",
                                    fontSize: "14px",
                                  },
                                },
                                event.deal_type || "N/A"
                              ),
                              React.createElement(
                                "td",
                                {
                                  style: {
                                    padding: "12px 8px",
                                    borderBottom: "1px solid #e2e8f0",
                                    fontSize: "14px",
                                  },
                                },
                                event.counterparty_status?.counterparty_syayus
                                  ?.counterparty_status || "N/A"
                              ),
                              React.createElement(
                                "td",
                                {
                                  style: {
                                    padding: "12px 8px",
                                    borderBottom: "1px solid #e2e8f0",
                                    fontSize: "14px",
                                  },
                                },
                                [
                                  ...(event["0"] || []).map(
                                    (item) => item._new_company?.name
                                  ),
                                  ...(event["1"] || []).map(
                                    (item) => item._new_company?.name
                                  ),
                                ]
                                  .filter(Boolean)
                                  .join(", ") || "N/A"
                              ),
                              React.createElement(
                                "td",
                                {
                                  style: {
                                    padding: "12px 8px",
                                    borderBottom: "1px solid #e2e8f0",
                                    fontSize: "14px",
                                  },
                                },
                                event.ev_data?.enterprise_value_m
                                  ? `$${event.ev_data.enterprise_value_m}M`
                                  : event.ev_data?.ev_band || "Not available"
                              ),
                              React.createElement(
                                "td",
                                {
                                  style: {
                                    padding: "12px 8px",
                                    borderBottom: "1px solid #e2e8f0",
                                    fontSize: "14px",
                                  },
                                },
                                "N/A"
                              )
                            )
                          )
                        )
                      ),
                      // Show "See More" button if there are more than 3 events
                      corporateEvents.length > 3 &&
                        React.createElement(
                          "div",
                          {
                            style: {
                              textAlign: "center",
                              marginTop: "16px",
                            },
                          },
                          React.createElement(
                            "button",
                            {
                              onClick: () =>
                                setShowAllCorporateEvents(
                                  !showAllCorporateEvents
                                ),
                              style: {
                                background: "none",
                                border: "none",
                                color: "#0075df",
                                textDecoration: "underline",
                                cursor: "pointer",
                                fontSize: "14px",
                                padding: "8px 0",
                              },
                            },
                            showAllCorporateEvents ? "Show Less" : "See More"
                          )
                        )
                    )
              ),
            // Asymmetrix Content (Insights & Analysis) related to this company
            hasArticles &&
              React.createElement(
                "div",
                { style: { ...styles.card, marginTop: "32px" } },
                React.createElement(
                  "div",
                  {
                    style: {
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "24px",
                    },
                  },
                  React.createElement(
                    "h2",
                    { style: styles.sectionTitle },
                    "Asymmetrix Insights & Analysis"
                  )
                ),
                articlesLoading
                  ? React.createElement(
                      "div",
                      {
                        style: {
                          textAlign: "center",
                          padding: "40px",
                          color: "#666",
                          fontSize: "14px",
                        },
                      },
                      "Loading content..."
                    )
                  : companyArticles.length > 0
                  ? React.createElement(
                      "div",
                      {
                        style: {
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "16px",
                        },
                      },
                      companyArticles.slice(0, 4).map((article) =>
                        React.createElement(
                          "div",
                          {
                            key: article.id,
                            style: {
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                              padding: "12px 12px",
                              cursor: "pointer",
                              background: "#fff",
                            },
                            onClick: () =>
                              (window.location.href = `/article/${article.id}`),
                          },
                          React.createElement(
                            "div",
                            {
                              style: {
                                fontWeight: 700,
                                marginBottom: 6,
                                color: "#1a202c",
                              },
                            },
                            article.Headline || "Untitled"
                          ),
                          React.createElement(
                            "div",
                            {
                              style: {
                                fontSize: 12,
                                color: "#6b7280",
                                marginBottom: 8,
                              },
                            },
                            new Date(
                              article.Publication_Date
                            ).toLocaleDateString()
                          ),
                          React.createElement(
                            "div",
                            { style: { fontSize: 14, color: "#374151" } },
                            article.Strapline || ""
                          )
                        )
                      )
                    )
                  : React.createElement(
                      "div",
                      {
                        style: {
                          textAlign: "center",
                          padding: "40px",
                          color: "#666",
                          fontSize: "14px",
                        },
                      },
                      "No related content found"
                    )
              ),
            React.createElement(Footer, null)
          )
        )
    )
  );
};

export default CompanyDetail;
