"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Head from "next/head";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useRightClick } from "@/hooks/useRightClick";
import { CorporateEventsSection } from "@/components/corporate-events/CorporateEventsSection";
import { type CorporateEvent as CorporateEventsTableEvent } from "@/components/corporate-events/CorporateEventsTable";
import IndividualCards from "@/components/shared/IndividualCards";
import { NewFeatureCallout } from "@/components/ui/new-feature-callout";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Types for API integration
interface InvestorLocation {
  City: string;
  State__Province__County: string;
  Country: string;
}

interface InvestorYears {
  id: number;
  Year: string;
}

interface LinkedInData {
  linkedin_employee: number;
  linkedin_emp_date: string;
  linkedin_logo: string;
  LinkedIn_URL?: string;
}

interface LinkedInHistory {
  date: string;
  employees_count: number;
}

interface Investor {
  id: number;
  name: string;
  description: string;
  url: string;
  street_address: string;
  year_founded: number;
  _years: InvestorYears;
  _locations: InvestorLocation;
  _linkedin_data_of_new_company: LinkedInData;
}

interface FocusSector {
  id: number;
  sector_name: string;
}

interface TeamMember {
  Individual_text: string;
  individuals_id?: number;
  job_titles_id: Array<{ job_title: string }>;
  current_employer_url: string;
}

interface PortfolioCompany {
  id: number;
  name: string;
  locations_id: number;
  sectors_id: Array<{
    sector_name: string;
    Sector_importance: string;
  }>;
  description: string;
  year_exited?: number | string | null;
  year_invested?: number | string | null;
  linkedin_data: {
    LinkedIn_Employee: number;
    linkedin_logo: string;
  };
  _locations: {
    Country: string;
  };
  _is_that_investor: boolean;
  _linkedin_data_of_new_company: {
    linkedin_employee: number;
    linkedin_logo: string;
  };
  related_to_investor_individuals?: Array<{
    id: number;
    name: string;
    job_titles?: string[];
  }>;
}

interface PortfolioResponse {
  items?: PortfolioCompany[];
  itemsReceived?: number;
  curPage?: number;
  nextPage?: number | null;
  prevPage?: number | null;
  offset?: number;
  perPage?: number;
  pageTotal?: number;
}

/** New API shape: current/past_portfolio arrays + result (current) or results (past) for pagination */
interface PortfolioResultMeta {
  itemsReceived?: number;
  curPage?: number;
  nextPage?: number | null;
  prevPage?: number | null;
  pageTotal?: number;
}
interface PortfolioApiResponse {
  current_portfolio?: unknown[];
  past_portfolio?: unknown[];
  result?: PortfolioResultMeta;
  results?: PortfolioResultMeta;
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
    enterprise_value_m?: number | string;
    ev_band?: string;
    currency?: { id?: number; Currency?: string } | null;
    currency_id?: string;
  };
  investment_data?: {
    investment_amount_m?: string;
    Funding_stage?: string;
    funding_stage?: string;
    currency?: { Currency?: string } | null;
    currency_id?: string;
  };
  investment_display?: string | null;
  ev_display?: string | null;
  // New API fields for targets
  targets?: Array<{
    id: number;
    name: string;
    path?: string;
    route?: string;
    entity_type?: string;
  }>;
  target_label?: string;
  target_counterparty?: {
    new_company_counterparty?: number;
    new_company?: {
      id?: number;
      name?: string;
      _location?: { Country?: string };
    };
    _new_company?: {
      id?: number;
      name?: string;
      _location?: { Country?: string };
    };
  };
  other_counterparties?: Array<{
    // New API format
    id?: number;
    name?: string;
    page_type?: string;
    counterparty_id?: number;
    is_data_analytics?: boolean;
    counterparty_status?: string;
    counterparty_type_id?: number;
    counterparty_announcement_url?: string | null;
    // Legacy format
    _new_company?: {
      id?: number;
      name?: string;
      _is_that_investor?: boolean;
    };
    _counterparty_type?: {
      counterparty_status?: string;
    };
  }>;
  advisors?: Array<{
    id?: number;
    // Normalized shape used by `CorporateEventsTable`
    advisor_company?: { id?: number; name?: string };
    announcement_url?: string | null;
    new_company_advised?: number;
    counterparty_advised?: number;

    // Raw API fields sometimes returned by investor corporate events endpoint
    advisor_company_id?: number;
    advisor_company_name?: string;
    advised_company?: {
      id?: number;
      name?: string;
      path?: string;
      route?: string;
      entity_type?: string;
      counterparty_type?: number;
      counterparty_status?: string;
    };
  }>;
  "0"?: Array<{
    _new_company?: {
      id?: number;
      name: string;
      _is_that_investor?: boolean;
    };
  }>;
  "1"?: Array<{
    _new_company?: {
      id?: number;
      name: string;
    };
  }>;
}

interface CorporateEventsResponse {
  New_Events_Wits_Advisors?: CorporateEvent[];
  Corporate_Events?: CorporateEvent[];
}

interface InvestorData {
  Investor: Investor;
  Focus: FocusSector[];
  Invested_DA_sectors: FocusSector[];
  Investment_Team_Roles_current: TeamMember[];
  Investment_Team_Roles_past: TeamMember[];
}

const PDF_SERVICE_BASE_URL = "https://asymmetrix-pdf-service.fly.dev";

// Utility functions
const formatNumber = (num: number | undefined): string => {
  if (num === undefined || num === null) return "0";
  return num.toLocaleString();
};


const formatChartDate = (dateString: string): string => {
  const [year, month] = dateString.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
};

// LinkedIn History Chart Component
const LinkedInHistoryChart = ({ data }: { data: LinkedInHistory[] }) => {
  const chartData = data.map((item) => ({
    date: formatChartDate(item.date),
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
            borderRadius: "4px",
            padding: "10px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          <p style={{ margin: 0, fontWeight: "bold" }}>{`${label}`}</p>
          <p style={{ margin: 0, color: "#0075df" }}>
            {`Employees: ${formatNumber(payload[0].value)}`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: "100%", height: "300px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#0075df"
            strokeWidth={2}
            dot={{ fill: "#0075df", strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: "#0075df" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Company Logo Component
const CompanyLogo = ({ logo, name }: { logo: string; name: string }) => {
  if (logo) {
    return (
      <Image
        src={`data:image/jpeg;base64,${logo}`}
        alt={`${name} logo`}
        width={40}
        height={40}
        className="company-logo"
        style={{
          objectFit: "contain",
          borderRadius: "50%",
          border: "1px solid #e2e8f0",
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: "40px",
        height: "40px",
        backgroundColor: "#f7fafc",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "12px",
        fontWeight: "bold",
        color: "#64748b",
        border: "1px solid #e2e8f0",
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
};

const InvestorDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const { createClickableElement } = useRightClick();
  const investorId = params.id as string;

  const [investorData, setInvestorData] = useState<InvestorData | null>(null);
  const [portfolioCompanies, setPortfolioCompanies] = useState<
    PortfolioCompany[]
  >([]);
  const [portfolioPagination, setPortfolioPagination] = useState({
    itemsReceived: 0,
    curPage: 1,
    nextPage: null as number | null,
    prevPage: null as number | null,
    offset: 0,
    perPage: 50,
    pageTotal: 0,
  });
  const [pastPortfolioCompanies, setPastPortfolioCompanies] = useState<
    PortfolioCompany[]
  >([]);
  const [pastPortfolioPagination, setPastPortfolioPagination] = useState({
    itemsReceived: 0,
    curPage: 1,
    nextPage: null as number | null,
    prevPage: null as number | null,
    offset: 0,
    perPage: 50,
    pageTotal: 0,
  });
  const [corporateEvents, setCorporateEvents] = useState<CorporateEvent[]>([]);
  const [corporateEventsLoading, setCorporateEventsLoading] = useState(false);
  const [linkedInHistory, setLinkedInHistory] = useState<LinkedInHistory[]>([]);
  const [linkedInHistoryLoading, setLinkedInHistoryLoading] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [pastPortfolioLoading, setPastPortfolioLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingPortfolio, setExportingPortfolio] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // Fetch investor data
  const fetchInvestorData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("asymmetrix_auth_token");

      const params = new URLSearchParams();
      params.append("new_comp_id", investorId);

      const response = await fetch(
        `https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm/get_the_investor_new_company?${params.toString()}`,
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
        if (response.status === 404) {
          throw new Error("Investor not found");
        }
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const raw = await response.json();

      // Normalize Invested_DA_sectors: support both legacy array and new investor_snapshot string
      let normalizedSectors: FocusSector[] = Array.isArray(
        raw?.Invested_DA_sectors
      )
        ? raw.Invested_DA_sectors
        : [];

      try {
        if (
          (!normalizedSectors || normalizedSectors.length === 0) &&
          raw?.Invested_DA_sectors?.da_sectors?.length > 0
        ) {
          const snapshotStr =
            raw.Invested_DA_sectors.da_sectors[0]?.investor_snapshot;
          if (typeof snapshotStr === "string" && snapshotStr.length > 0) {
            const snapshot = JSON.parse(snapshotStr);
            if (Array.isArray(snapshot?.Invested_DA_sectors)) {
              normalizedSectors = snapshot.Invested_DA_sectors;
            }
          }
        }
      } catch (e) {
        console.warn(
          "Failed to parse investor_snapshot for Invested_DA_sectors",
          e
        );
      }

      const data: InvestorData = {
        ...raw,
        Invested_DA_sectors: normalizedSectors || [],
      };
      setInvestorData(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch investor data"
      );
      console.error("Error fetching investor data:", err);
    } finally {
      setLoading(false);
    }
  }, [investorId]);

  // Fetch portfolio companies
  const safeParseJSON = <T,>(value: unknown, fallback: T): T => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === "string") {
      try {
        return JSON.parse(value) as T;
      } catch {
        return fallback;
      }
    }
    if (typeof value === "object") return (value as T) ?? fallback;
    return fallback;
  };

  const asRecord = (v: unknown): Record<string, unknown> =>
    typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};

  const mapPortfolioItem = useCallback((item: unknown): PortfolioCompany => {
    const obj = asRecord(item);
    const sectors = safeParseJSON<
      Array<{ sector_name: string; Sector_importance: string }>
    >(obj["sectors_id"], []);

    const locations = safeParseJSON<{ Country?: string }>(
      obj["_locations"],
      {}
    );

    const linkedinDataNew = safeParseJSON<{
      linkedin_employee?: number;
      linkedin_logo?: string;
    }>(obj["_linkedin_data_of_new_company"], {});

    const linkedinDataOld = safeParseJSON<{
      LinkedIn_Employee?: number;
      linkedin_logo?: string;
    }>(obj["linkedin_data"], {});

    // API returns stringified JSON: [{ id, name, job_titles: string[] }]
    // Keep backwards compatibility if legacy field `advisor_individuals` exists.
    const relatedIndividualsRaw = safeParseJSON<
      Array<{
        id?: number;
        name?: string;
        advisor_individuals?: string;
        job_titles?: unknown;
      }>
    >(obj["related_to_investor_individuals"], []);

    const relatedIndividuals = (Array.isArray(relatedIndividualsRaw)
      ? relatedIndividualsRaw
      : []
    )
      .map((ri) => {
        const id = Number(ri?.id);
        const name = String(
          (ri?.name || ri?.advisor_individuals || "").trim()
        );
        const jobTitles = Array.isArray(ri?.job_titles)
          ? (ri.job_titles as unknown[]).map((t) => String(t)).filter(Boolean)
          : [];
        return { id, name, job_titles: jobTitles };
      })
      .filter((ri) => Number.isFinite(ri.id) && ri.id > 0 && ri.name.length > 0);

    return {
      id: Number(obj["id"]),
      name: String((obj["name"] as string) ?? ""),
      locations_id: Number((obj["locations_id"] as number) ?? 0),
      sectors_id: Array.isArray(sectors) ? sectors : [],
      description: String((obj["description"] as string) ?? ""),
      year_exited:
        typeof obj["year_exited"] === "number" || typeof obj["year_exited"] === "string"
          ? (obj["year_exited"] as number | string)
          : typeof obj["Year_Exited"] === "number" || typeof obj["Year_Exited"] === "string"
            ? (obj["Year_Exited"] as number | string)
            : typeof obj["yearExited"] === "number" || typeof obj["yearExited"] === "string"
              ? (obj["yearExited"] as number | string)
              : null,
      year_invested:
        typeof obj["year_invested"] === "number" || typeof obj["year_invested"] === "string"
          ? (obj["year_invested"] as number | string)
          : typeof obj["Year_Invested"] === "number" || typeof obj["Year_Invested"] === "string"
            ? (obj["Year_Invested"] as number | string)
            : typeof obj["yearInvested"] === "number" || typeof obj["yearInvested"] === "string"
              ? (obj["yearInvested"] as number | string)
              : null,
      linkedin_data: {
        LinkedIn_Employee: Number(linkedinDataOld?.LinkedIn_Employee ?? 0),
        linkedin_logo: String(linkedinDataOld?.linkedin_logo ?? ""),
      },
      _locations: {
        Country: String(locations?.Country ?? ""),
      },
      _is_that_investor: Boolean(
        (obj["_is_that_investor"] as boolean) ?? false
      ),
      _linkedin_data_of_new_company: {
        linkedin_employee: Number(linkedinDataNew?.linkedin_employee ?? 0),
        linkedin_logo: String(linkedinDataNew?.linkedin_logo ?? ""),
      },
      related_to_investor_individuals: relatedIndividuals,
    };
  }, []);

  const fetchPortfolioCompanies = useCallback(
    async (page: number = 1) => {
      setPortfolioLoading(true);
      try {
        const token = localStorage.getItem("asymmetrix_auth_token");

        const params = new URLSearchParams();
        params.append("new_comp_id", investorId);
        params.append("page", page.toString());
        params.append("per_page", "50");

        const response = await fetch(
          `https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm/get_investors_current_partfolio?${params.toString()}`,
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
            `Portfolio API request failed: ${response.statusText}`
          );
        }

        const raw = await response.json();

        const api = raw as PortfolioApiResponse;
        if (Array.isArray(api.current_portfolio)) {
          const items = api.current_portfolio.map(mapPortfolioItem);
          const res = api.result ?? api.results;
          setPortfolioCompanies(items);
          setPortfolioPagination({
            itemsReceived: res?.itemsReceived ?? items.length,
            curPage: res?.curPage ?? page,
            nextPage: res?.nextPage ?? null,
            prevPage: res?.prevPage ?? null,
            offset: 0,
            perPage: 50,
            pageTotal: res?.pageTotal ?? 0,
          });
        } else if (Array.isArray(raw)) {
          const items = raw.map(mapPortfolioItem);
          const first = raw[0] ?? {};
          setPortfolioCompanies(items);
          setPortfolioPagination({
            itemsReceived: Number(first?.itemsreceived ?? items.length ?? 0),
            curPage: Number(first?.curpage ?? page ?? 1),
            nextPage:
              first?.nextpage === null || first?.nextpage === undefined
                ? null
                : Number(first?.nextpage),
            prevPage:
              first?.prevpage === null || first?.prevpage === undefined
                ? null
                : Number(first?.prevpage),
            offset: Number(first?.offset ?? 0),
            perPage: 50,
            pageTotal: Number(first?.pagetotal ?? 0),
          });
        } else {
          const data = raw as PortfolioResponse;
          setPortfolioCompanies((data.items || []).map(mapPortfolioItem));
          setPortfolioPagination({
            itemsReceived: data.itemsReceived || 0,
            curPage: data.curPage || 1,
            nextPage: data.nextPage ?? null,
            prevPage: data.prevPage ?? null,
            offset: data.offset || 0,
            perPage: data.perPage || 50,
            pageTotal: data.pageTotal || 0,
          });
        }
      } catch (err) {
        console.error("Error fetching portfolio companies:", err);
        // Don't set main error state for portfolio loading failure
      } finally {
        setPortfolioLoading(false);
      }
    },
    [investorId, mapPortfolioItem]
  );

  // Fetch past portfolio companies
  const fetchPastPortfolioCompanies = useCallback(
    async (page: number = 1) => {
      setPastPortfolioLoading(true);
      try {
        const token = localStorage.getItem("asymmetrix_auth_token");

        const params = new URLSearchParams();
        params.append("new_comp_id", investorId);
        params.append("page", page.toString());
        params.append("per_page", "50");

        const response = await fetch(
          `https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm/get_investors_past_portfolio?${params.toString()}`,
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
            `Past Portfolio API request failed: ${response.statusText}`
          );
        }

        const raw = await response.json();

        const api = raw as PortfolioApiResponse;
        if (Array.isArray(api.past_portfolio)) {
          const items = api.past_portfolio.map(mapPortfolioItem);
          const res = api.result ?? api.results;
          setPastPortfolioCompanies(items);
          setPastPortfolioPagination({
            itemsReceived: res?.itemsReceived ?? items.length,
            curPage: res?.curPage ?? page,
            nextPage: res?.nextPage ?? null,
            prevPage: res?.prevPage ?? null,
            offset: 0,
            perPage: 50,
            pageTotal: res?.pageTotal ?? 0,
          });
        } else if (Array.isArray(raw)) {
          const items = raw.map(mapPortfolioItem);
          const first = raw[0] ?? {};
          setPastPortfolioCompanies(items);
          setPastPortfolioPagination({
            itemsReceived: Number(first?.itemsreceived ?? items.length ?? 0),
            curPage: Number(first?.curpage ?? page ?? 1),
            nextPage:
              first?.nextpage === null || first?.nextpage === undefined
                ? null
                : Number(first?.nextpage),
            prevPage:
              first?.prevpage === null || first?.prevpage === undefined
                ? null
                : Number(first?.prevpage),
            offset: Number(first?.offset ?? 0),
            perPage: 50,
            pageTotal: Number(first?.pagetotal ?? 0),
          });
        } else {
          const data = raw as PortfolioResponse;
          setPastPortfolioCompanies((data.items || []).map(mapPortfolioItem));
          setPastPortfolioPagination({
            itemsReceived: data.itemsReceived || 0,
            curPage: data.curPage || 1,
            nextPage: data.nextPage ?? null,
            prevPage: data.prevPage ?? null,
            offset: data.offset || 0,
            perPage: data.perPage || 50,
            pageTotal: data.pageTotal || 0,
          });
        }
      } catch (err) {
        console.error("Error fetching past portfolio companies:", err);
        // Don't set main error state for portfolio loading failure
      } finally {
        setPastPortfolioLoading(false);
      }
    },
    [investorId, mapPortfolioItem]
  );

  // Fetch all portfolio items: first request gets itemsReceived, then request with per_page=itemsReceived
  const fetchAllPortfolioPages = useCallback(
    async (
      baseUrl: string,
      token: string | null
    ): Promise<PortfolioCompany[]> => {
      const paramsFirst = new URLSearchParams();
      paramsFirst.append("new_comp_id", investorId);
      paramsFirst.append("page", "1");
      paramsFirst.append("per_page", "50");

      const response = await fetch(`${baseUrl}?${paramsFirst.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: "include",
      });

      if (!response.ok) throw new Error(`Portfolio request failed: ${response.statusText}`);

      const raw = await response.json();

      const api = raw as PortfolioApiResponse;
      const result = api.result ?? api.results;
      const total = Number(
        result?.itemsReceived ??
        (raw as PortfolioResponse & { itemsreceived?: number }).itemsReceived ??
        (raw as PortfolioResponse & { itemsreceived?: number }).itemsreceived ??
        0
      );
      const items =
        Array.isArray(api.current_portfolio)
          ? api.current_portfolio
          : Array.isArray(api.past_portfolio)
            ? api.past_portfolio
            : Array.isArray(raw)
              ? raw
              : (raw as PortfolioResponse)?.items ?? [];

      if (total <= 0) {
        return items.map(mapPortfolioItem);
      }

      const paramsExport = new URLSearchParams();
      paramsExport.append("new_comp_id", investorId);
      paramsExport.append("page", "1");
      paramsExport.append("per_page", String(total));

      const responseAll = await fetch(`${baseUrl}?${paramsExport.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: "include",
      });

      if (!responseAll.ok) throw new Error(`Portfolio export request failed: ${responseAll.statusText}`);

      const rawAll = await responseAll.json();
      const apiAll = rawAll as PortfolioApiResponse;
      const fullItems =
        Array.isArray(apiAll.current_portfolio)
          ? apiAll.current_portfolio
          : Array.isArray(apiAll.past_portfolio)
            ? apiAll.past_portfolio
            : Array.isArray(rawAll)
              ? rawAll
              : (rawAll as PortfolioResponse)?.items ?? [];
      return fullItems.map(mapPortfolioItem);
    },
    [investorId, mapPortfolioItem]
  );

  const escapeCsv = (value: unknown): string => {
    const str = value === undefined || value === null ? "" : String(value);
    return `"${str.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
  };

  const handleExportPortfolio = useCallback(async () => {
    if (!investorId) return;
    setExportingPortfolio(true);
    try {
      const token = localStorage.getItem("asymmetrix_auth_token");
      const currentUrl = "https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm/get_investors_current_partfolio";
      const pastUrl = "https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm/get_investors_past_portfolio";

      const [currentItems, pastItems] = await Promise.all([
        fetchAllPortfolioPages(currentUrl, token),
        fetchAllPortfolioPages(pastUrl, token),
      ]);

      const headers = [
        "Portfolio Type",
        "Name",
        "Sectors",
        "Year Invested",
        "Year Exited",
        "Related Individuals",
        "LinkedIn Members",
        "Country",
        "Company Link",
      ];

      const row = (c: PortfolioCompany, type: "Current" | "Past") => {
        const link =
          typeof window !== "undefined"
            ? `${window.location.origin}/company/${c.id}`
            : `/company/${c.id}`;
        const sectors = c.sectors_id.map((s) => s.sector_name).join(", ");
        const individuals =
          c.related_to_investor_individuals
            ?.map((i) => i.name)
            .filter(Boolean)
            .join(", ") ?? "";
        return [
          type,
          c.name,
          sectors,
          c.year_invested != null && String(c.year_invested).trim() !== "" ? String(c.year_invested) : "",
          c.year_exited != null && String(c.year_exited).trim() !== "" ? String(c.year_exited) : "",
          individuals,
          String(c._linkedin_data_of_new_company?.linkedin_employee ?? 0),
          c._locations?.Country ?? "",
          link,
        ];
      };

      const rows: string[][] = [
        headers,
        ...currentItems.map((c) => row(c, "Current")),
        ...pastItems.map((c) => row(c, "Past")),
      ];

      const csvBody = rows.map((r) => r.map(escapeCsv).join(",")).join("\r\n");
      const BOM = "\uFEFF";
      const csv = BOM + csvBody;

      const name = investorData?.Investor?.name;
      const filename = `portfolio_${name ? name.replace(/[<>:"/\\|?*]/g, "") : investorId}_${new Date().toISOString().split("T")[0]}.csv`;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting portfolio:", err);
      alert("Failed to export portfolio. Please try again.");
    } finally {
      setExportingPortfolio(false);
    }
  }, [investorId, fetchAllPortfolioPages, investorData]);

  // Fetch corporate events
  const fetchCorporateEvents = useCallback(async () => {
    setCorporateEventsLoading(true);
    try {
      const token = localStorage.getItem("asymmetrix_auth_token");

      const params = new URLSearchParams();
      params.append("new_company_id", investorId);

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
      // Handle both API response formats
      const events = data.Corporate_Events || data.New_Events_Wits_Advisors || [];

      // Normalize advisors so `CorporateEventsTable` can render + link them.
      // Investor CE endpoint often returns { advisor_company_id, advisor_company_name } instead of { advisor_company: {id,name} }.
      const isRecord = (v: unknown): v is Record<string, unknown> =>
        typeof v === "object" && v !== null;

      const getNestedNumber = (
        obj: Record<string, unknown>,
        key: string,
        nestedKey: string
      ): number | undefined => {
        const child = obj[key];
        if (!isRecord(child)) return undefined;
        const value = child[nestedKey];
        return typeof value === "number" ? value : undefined;
      };

      const getNestedString = (
        obj: Record<string, unknown>,
        key: string,
        nestedKey: string
      ): string | undefined => {
        const child = obj[key];
        if (!isRecord(child)) return undefined;
        const value = child[nestedKey];
        return typeof value === "string" ? value : undefined;
      };

      const normalizedEvents: CorporateEvent[] = (Array.isArray(events) ? events : []).map(
        (ev): CorporateEvent => {
        const rawAdvisors = (ev as unknown as { advisors?: unknown }).advisors;
        if (!Array.isArray(rawAdvisors)) return ev;

        const normalizedAdvisors: NonNullable<CorporateEvent["advisors"]> = rawAdvisors
          .map((a) => {
            const advisor = a as Record<string, unknown>;
            const advisorCompanyId =
              typeof advisor["advisor_company_id"] === "number"
                ? (advisor["advisor_company_id"] as number)
                : getNestedNumber(advisor, "advisor_company", "id");

            const advisorCompanyName =
              typeof advisor["advisor_company_name"] === "string"
                ? (advisor["advisor_company_name"] as string)
                : getNestedString(advisor, "advisor_company", "name") ??
                  getNestedString(advisor, "_new_company", "name");

            const announcementUrl =
              typeof advisor["announcement_url"] === "string" ||
              advisor["announcement_url"] === null
                ? (advisor["announcement_url"] as string | null)
                : null;

            const advisorCompanyFromObj = isRecord(advisor["advisor_company"])
              ? {
                  id: getNestedNumber(advisor, "advisor_company", "id"),
                  name: getNestedString(advisor, "advisor_company", "name"),
                }
              : undefined;

            return {
              id: typeof advisor["id"] === "number" ? advisor["id"] : undefined,
              announcement_url: announcementUrl,
              new_company_advised:
                typeof advisor["new_company_advised"] === "number"
                  ? advisor["new_company_advised"]
                  : undefined,
              counterparty_advised:
                typeof advisor["counterparty_advised"] === "number"
                  ? advisor["counterparty_advised"]
                  : undefined,
              advisor_company_id:
                typeof advisor["advisor_company_id"] === "number"
                  ? advisor["advisor_company_id"]
                  : undefined,
              advisor_company_name:
                typeof advisor["advisor_company_name"] === "string"
                  ? advisor["advisor_company_name"]
                  : undefined,
              advisor_company:
                advisorCompanyId || advisorCompanyName
                  ? { id: advisorCompanyId, name: advisorCompanyName }
                  : advisorCompanyFromObj,
            };
          })
          .filter((a) => {
            const name = a?.advisor_company?.name ?? "";
            return typeof name === "string" && name.trim().length > 0;
          });

        return { ...ev, advisors: normalizedAdvisors };
      });

      setCorporateEvents(normalizedEvents as CorporateEvent[]);
    } catch (err) {
      console.error("Error fetching corporate events:", err);
      // Don't set main error state for corporate events loading failure
    } finally {
      setCorporateEventsLoading(false);
    }
  }, [investorId]);

  // Fetch LinkedIn history data using the same API pattern as company page
  const fetchLinkedInHistory = useCallback(async () => {
    setLinkedInHistoryLoading(true);
    try {
      const token = localStorage.getItem("asymmetrix_auth_token");

      const response = await fetch(
        `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/Get_new_company/${investorId}`,
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
          `LinkedIn History API request failed: ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("LinkedIn history API response", data);

      const employeeData =
        data.Company?._companies_employees_count_monthly || [];
      const historyData = employeeData.map(
        (item: { date?: string; employees_count?: number }) => ({
          date: item.date || "",
          employees_count: item.employees_count || 0,
        })
      );
      setLinkedInHistory(historyData);

      // Prefer URL from Company.linkedin_data if present
      const historyLinkedinUrl: string | undefined =
        data.Company?.linkedin_data?.LinkedIn_URL ||
        data.Company?._linkedin_data_of_new_company?.LinkedIn_URL;
      if (historyLinkedinUrl) setLinkedinUrl(historyLinkedinUrl);
    } catch (err) {
      console.error("Error fetching LinkedIn history:", err);
      // Don't set main error state for LinkedIn history loading failure
    } finally {
      setLinkedInHistoryLoading(false);
    }
  }, [investorId]);

  useEffect(() => {
    if (investorId) {
      fetchInvestorData();
      fetchPortfolioCompanies(1);
      fetchPastPortfolioCompanies(1);
      fetchCorporateEvents();
      fetchLinkedInHistory();
    }
  }, [
    fetchInvestorData,
    fetchPortfolioCompanies,
    fetchPastPortfolioCompanies,
    fetchCorporateEvents,
    fetchLinkedInHistory,
    investorId,
  ]);

  // Update page title when investor data is loaded
  useEffect(() => {
    if (investorData?.Investor?.name && typeof document !== "undefined") {
      document.title = `Asymmetrix – ${investorData.Investor.name}`;
    }
  }, [investorData?.Investor?.name]);

  const reportMailTo = `mailto:asymmetrix@asymmetrixintelligence.com?subject=${encodeURIComponent(
    "Contribute Investor Data"
  )}&body=${encodeURIComponent(
    `Please describe the data you would like to contribute for this investor page.%0D%0A%0D%0AInvestor: ${
      investorId || ""
    } - ${investorData?.Investor?.name || ""}%0D%0AURL: ${
      typeof window !== "undefined" ? window.location.href : ""
    }`
  )}`;

  // Removed: handleCompanyNameClick - no longer used, navigation goes directly to corporate-event/{event.id}

  const handleAdvisorClick = async (advisorName: string) => {
    console.log("Advisor clicked:", advisorName);
    try {
      // Search for the advisor using the advisors API
      const token = localStorage.getItem("asymmetrix_auth_token");

      const params = new URLSearchParams();
      params.append("search_query", advisorName);
      params.append("page", "0");
      params.append("per_page", "10");

      const response = await fetch(
        `https://xdil-abvj-o7rq.e2.xano.io/api:Cd_uVQYn/get_all_advisors_list?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Advisor search results:", data);

        // Find the matching advisor by name
        const matchingAdvisor = data.Advisors_companies?.items?.find(
          (advisor: { name: string; id: number }) =>
            advisor.name === advisorName
        );

        if (matchingAdvisor && matchingAdvisor.id) {
          console.log("Found matching advisor with ID:", matchingAdvisor.id);

          // Verify the advisor exists using the get_the_advisor_new_company API
          const advisorResponse = await fetch(
            `https://xdil-abvj-o7rq.e2.xano.io/api:Cd_uVQYn/get_the_advisor_new_company?new_comp_id=${matchingAdvisor.id}`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` }),
              },
            }
          );

          if (advisorResponse.ok) {
            console.log(
              "Advisor profile confirmed, navigating to:",
              `/advisor/${matchingAdvisor.id}`
            );
            router.push(`/advisor/${matchingAdvisor.id}`);
          } else {
            console.error(
              "Advisor profile not found:",
              advisorResponse.statusText
            );
          }
        } else {
          console.log("No matching advisor found with ID - no navigation");
        }
      } else {
        console.error("Failed to search for advisor:", response.statusText);
      }
    } catch (error) {
      console.error("Error handling advisor click:", error);
    }
  };

  const handleCorporateEventDescriptionClick = async (
    eventId?: number,
    eventDescription?: string
  ) => {
    console.log("Corporate event description clicked:", {
      eventId,
      eventDescription,
    });

    // If we have a direct ID, use it immediately
    if (eventId) {
      console.log("Using direct event ID:", eventId);
      router.push(`/corporate-event/${eventId}`);
      return;
    }

    // Fallback: search by description if no ID available
    if (!eventDescription) {
      console.error("No event ID or description provided");
      return;
    }

    try {
      // Try to find the event ID by searching the main corporate events API
      const token = localStorage.getItem("asymmetrix_auth_token");

      const params = new URLSearchParams();
      params.append("search_query", eventDescription);
      params.append("Page", "0");
      params.append("Per_page", "10");

      const response = await fetch(
        `https://xdil-abvj-o7rq.e2.xano.io/api:617tZc8l/get_all_corporate_events?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Search results:", data);

        // Find the matching event by description
        const matchingEvent = data.items?.find(
          (event: { description: string; id: number }) =>
            event.description === eventDescription
        );

        if (matchingEvent && matchingEvent.id) {
          console.log("Found matching event with ID:", matchingEvent.id);
          router.push(`/corporate-event/${matchingEvent.id}`);
        } else {
          console.log("No matching event found with ID");
          // Fallback: navigate to corporate events page with search
          router.push(
            `/corporate-events?search=${encodeURIComponent(eventDescription)}`
          );
        }
      } else {
        console.error("Failed to search for event:", response.statusText);
        // Fallback: navigate to corporate events page with search
        router.push(
          `/corporate-events?search=${encodeURIComponent(eventDescription)}`
        );
      }
    } catch (error) {
      console.error("Error searching for event:", error);
      // Fallback: navigate to corporate events page with search
      router.push(
        `/corporate-events?search=${encodeURIComponent(eventDescription)}`
      );
    }
  };

  const handlePortfolioPageChange = (page: number) => {
    fetchPortfolioCompanies(page);
  };

  const handlePastPortfolioPageChange = (page: number) => {
    fetchPastPortfolioCompanies(page);
  };

  const handleExportPdf = useCallback(async () => {
    if (!investorId) return;
    if (!investorData) return;

    try {
      setExportingPdf(true);

      const response = await fetch(
        `${PDF_SERVICE_BASE_URL}/api/export-investor-pdf`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            investor: investorData,
            linkedin: {
              url:
                linkedinUrl ||
                investorData?.Investor?._linkedin_data_of_new_company?.LinkedIn_URL ||
                null,
              history: linkedInHistory,
            },
            corporate_events: corporateEvents,
            portfolio: {
              current: {
                pagination: portfolioPagination,
                items: portfolioCompanies,
              },
              past: {
                pagination: pastPortfolioPagination,
                items: pastPortfolioCompanies,
              },
            },
          }),
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

      const investorName = investorData?.Investor?.name
        ? sanitizeFilename(investorData.Investor.name)
        : `Investor-${investorId}`;
      const filename = `Asymmetrix ${investorName} Investor Profile.pdf`;

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
  }, [
    corporateEvents,
    investorData,
    investorId,
    linkedInHistory,
    linkedinUrl,
    pastPortfolioCompanies,
    pastPortfolioPagination,
    portfolioCompanies,
    portfolioPagination,
  ]);

  if (loading) {
    return (
      <div
        style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
      >
        <Header />
        <div
          style={{
            flex: "1",
            padding: "32px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div>Loading investor data...</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
      >
        <Header />
        <div
          style={{
            flex: "1",
            padding: "32px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <h2>Error Loading Investor</h2>
            <p>{error}</p>
            <button
              onClick={fetchInvestorData}
              style={{
                padding: "8px 16px",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Retry
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!investorData) {
    return (
      <div
        style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
      >
        <Header />
        <div
          style={{
            flex: "1",
            padding: "32px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div>Investor not found</div>
        </div>
        <Footer />
      </div>
    );
  }

  const {
    Investor,
    Focus,
    Invested_DA_sectors,
    Investment_Team_Roles_current,
    Investment_Team_Roles_past,
  } = investorData;

  const hq = `${Investor._locations?.City || ""}, ${
    Investor._locations?.State__Province__County || ""
  }, ${Investor._locations?.Country || ""}`
    .replace(/^,\s*/, "")
    .replace(/,\s*$/, "");

  const style = `
    .investor-detail-page {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .investor-content {
      flex: 1;
      padding: 32px;
      width: 100%;
    }
    .investor-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .investor-title-section {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;
    }
    .investor-title {
      margin: 0;
      font-size: 32px;
      font-weight: bold;
    }
    .report-button {
      padding: 8px 16px;
      background-color: #16a34a;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .export-button {
      padding: 8px 16px;
      background-color: #0075df;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .export-button:disabled {
      background-color: #9ca3af;
      cursor: not-allowed;
    }
    .investor-layout {
      display: flex;
      gap: 32px;
      flex-wrap: wrap;
    }
    .investor-left-column {
      flex: 1;
      min-width: 300px;
    }
    .investor-right-column {
      flex: 2;
      min-width: 600px;
    }
    .investor-section {
      background-color: white;
      padding: 24px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-bottom: 24px;
    }
    .section-title {
      margin: 0 0 16px 0;
      font-size: 20px;
      font-weight: bold;
    }
    .section-subtitle {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: bold;
    }
    .info-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .info-label {
      font-weight: bold;
      color: #374151;
    }
    .info-value {
      color: #6b7280;
    }

    .portfolio-table-container {
      overflow-x: auto;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }
    .portfolio-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    .portfolio-table thead {
      background-color: #f8fafc;
    }
    .portfolio-table th,
    .portfolio-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    .portfolio-table th {
      font-weight: 600;
      color: #374151;
    }
    .portfolio-table td {
      color: #6b7280;
    }
    .company-name {
      color: #3b82f6;
      text-decoration: none;
      font-weight: 500;
      cursor: pointer;
    }
    .company-name:hover {
      text-decoration: underline;
    }
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      margin-top: 16px;
      padding: 16px;
    }
    .pagination-button {
      padding: 8px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    .pagination-button:disabled {
      background-color: #e2e8f0;
      color: #64748b;
      cursor: not-allowed;
    }
    .pagination-button:not(:disabled) {
      background-color: #3b82f6;
      color: white;
    }
    .pagination-info {
      font-size: 14px;
      color: #64748b;
    }
    .portfolio-cards {
      display: none;
    }
    .portfolio-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
    }
    .portfolio-card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .portfolio-card-name {
      font-size: 16px;
      font-weight: 600;
      color: #3b82f6;
      cursor: pointer;
    }
    .portfolio-card-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      font-size: 14px;
    }
    .portfolio-card-info-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .portfolio-card-info-label {
      font-weight: 600;
      color: #374151;
      font-size: 12px;
    }
    .portfolio-card-info-value {
      color: #6b7280;
      font-size: 12px;
    }
    .corporate-event-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
    }
    .corporate-event-card-title {
      font-size: 16px;
      font-weight: 600;
      color: #3b82f6;
      cursor: pointer;
      margin-bottom: 12px;
      line-height: 1.4;
    }
    .corporate-event-card-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      font-size: 14px;
    }
    .corporate-event-card-info-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .corporate-event-card-info-label {
      font-weight: 600;
      color: #374151;
      font-size: 12px;
    }
    .corporate-event-card-info-value {
      color: #6b7280;
      font-size: 12px;
    }
    .loading {
      text-align: center;
      padding: 24px;
      color: #6b7280;
    }
    .no-data {
      text-align: center;
      padding: 24px;
      color: #64748b;
    }
    .pill { display: inline-block; padding: 2px 8px; font-size: 12px; border-radius: 999px; font-weight: 600; }
    .pill-blue { background-color: #e6f0ff; color: #1d4ed8; }
    .pill-green { background-color: #dcfce7; color: #15803d; }
    /* Management/Individual cards hover effects */
    .management-card:hover {
      background-color: #e6f0ff !important;
      border-color: #0075df !important;
      transform: translateY(-2px);
      box-shadow: 0 4px 6px rgba(0, 117, 223, 0.1);
    }
    /* Investment Team: make cards smaller and fit 2 per row on desktop */
    .investor-detail-page .management-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 10px !important;
    }
    .investor-detail-page .management-card {
      padding: 8px !important;
      border-radius: 6px !important;
    }

    @media (max-width: 768px) {
      .investor-content {
        padding: 16px !important;
      }
      .investor-header {
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 16px !important;
      }
      .investor-title-section {
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 12px !important;
      }
      .investor-title {
        font-size: 24px !important;
      }
      .report-button {
        align-self: flex-start !important;
        width: fit-content !important;
      }
      .export-button {
        align-self: flex-start !important;
        width: fit-content !important;
      }
      .investor-layout {
        flex-direction: column !important;
        gap: 16px !important;
      }
      .investor-left-column,
      .investor-right-column {
        flex: none !important;
        min-width: auto !important;
        width: 100% !important;
      }
      .investor-section {
        padding: 16px !important;
        margin-bottom: 16px !important;
      }
      .section-title {
        font-size: 18px !important;
        margin-bottom: 12px !important;
      }

      .portfolio-table-container {
        display: none !important;
      }
      .portfolio-cards {
        display: block !important;
      }
      .pagination {
        flex-wrap: wrap !important;
        gap: 8px !important;
        padding: 12px 8px !important;
      }
      .pagination-button {
        padding: 6px 10px !important;
        font-size: 13px !important;
        min-width: 70px !important;
      }
      .pagination-info {
        font-size: 13px !important;
        text-align: center !important;
        width: 100% !important;
        order: -1 !important;
      }
      .management-grid {
        grid-template-columns: 1fr !important;
      }
    }

    @media (min-width: 769px) {
      .portfolio-cards {
        display: none !important;
      }
      .portfolio-table-container {
        display: block !important;
      }
    }
  `;

  return (
    <div className="investor-detail-page">
      {Investor?.name && (
        <Head>
          <title>{`Asymmetrix – ${Investor.name}`}</title>
        </Head>
      )}
      <Header />

      <div className="investor-content">
        {/* Page Header */}
        <div className="investor-header">
          <div className="investor-title-section">
            <CompanyLogo
              logo={Investor._linkedin_data_of_new_company?.linkedin_logo || ""}
              name={Investor.name}
            />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h1 className="investor-title" style={{ margin: 0 }}>
                  {Investor.name}
                </h1>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <NewFeatureCallout
              featureKey="investor-profile-pdf-export"
              launchedAt="2026-02-02T00:00:00.000Z"
            >
              <button
                onClick={handleExportPdf}
                disabled={exportingPdf || !investorData}
                className="export-button"
                type="button"
              >
                {exportingPdf ? "Exporting..." : "Export PDF"}
              </button>
            </NewFeatureCallout>
            <a
              href={reportMailTo}
              className="report-button"
              target="_blank"
              rel="noopener noreferrer"
            >
              Contribute Data
            </a>
          </div>
        </div>

        <div className="investor-layout">
          {/* Left Column - Overview */}
          <div className="investor-left-column">
            {/* Overview Section */}
            <div className="investor-section">
              <h2 className="section-title">Overview</h2>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Focus:</span>
                  <span className="info-value">
                    {Focus.map((f) => f.sector_name).join(", ") ||
                      "Not available"}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Year founded:</span>
                  <span className="info-value">
                    {Investor._years?.Year || "Not available"}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">HQ:</span>
                  <span className="info-value">{hq || "Not available"}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Website:</span>
                  <span className="info-value">
                    {Investor.url ? (
                      <a
                        href={Investor.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {Investor.url}
                      </a>
                    ) : (
                      "Not available"
                    )}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">LinkedIn:</span>
                  <span className="info-value">
                    {linkedinUrl ||
                    Investor._linkedin_data_of_new_company?.LinkedIn_URL ? (
                      <a
                        href={
                          linkedinUrl ||
                          Investor._linkedin_data_of_new_company?.LinkedIn_URL
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open LinkedIn profile"
                        style={{ display: "inline-flex", alignItems: "center" }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 72 72"
                          width="20"
                          height="20"
                          aria-hidden="true"
                        >
                          <g fill="none" fillRule="evenodd">
                            <path
                              d="M8,72 L64,72 C68.418278,72 72,68.418278 72,64 L72,8 C72,3.581722 68.418278,-8.11624501e-16 64,0 L8,0 C3.581722,8.11624501e-16 -5.41083001e-16,3.581722 0,8 L0,64 C5.41083001e-16,68.418278 3.581722,72 8,72 Z"
                              fill="#007EBB"
                            />
                            <path
                              d="M62,62 L51.315625,62 L51.315625,43.8021149 C51.315625,38.8127542 49.4197917,36.0245323 45.4707031,36.0245323 C41.1746094,36.0245323 38.9300781,38.9261103 38.9300781,43.8021149 L38.9300781,62 L28.6333333,62 L28.6333333,27.3333333 L38.9300781,27.3333333 L38.9300781,32.0029283 C38.9300781,32.0029283 42.0260417,26.2742151 49.3825521,26.2742151 C56.7356771,26.2742151 62,30.7644705 62,40.051212 L62,62 Z M16.349349,22.7940133 C12.8420573,22.7940133 10,19.9296567 10,16.3970067 C10,12.8643566 12.8420573,10 16.349349,10 C19.8566406,10 22.6970052,12.8643566 22.6970052,16.3970067 C22.6970052,19.9296567 19.8566406,22.7940133 16.349349,22.7940133 Z M11.0325521,62 L21.769401,62 L21.769401,27.3333333 L11.0325521,27.3333333 L11.0325521,62 Z"
                              fill="#FFF"
                            />
                          </g>
                        </svg>
                      </a>
                    ) : (
                      "Not available"
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Historic LinkedIn Data Section */}
            <div className="investor-section">
              <h2 className="section-title">Historic LinkedIn Data</h2>
              {linkedInHistoryLoading ? (
                <div className="loading">Loading LinkedIn history...</div>
              ) : linkedInHistory.length > 0 ? (
                <LinkedInHistoryChart data={linkedInHistory} />
              ) : (
                <div className="no-data">
                  No LinkedIn history data available
                </div>
              )}
            </div>

            {/* Invested D&A Sectors Section */}
            <div className="investor-section">
              <h2 className="section-title">Invested D&A sectors:</h2>
              <div className="info-value">
                {Invested_DA_sectors.length > 0
                  ? Invested_DA_sectors.map((sector, index) => (
                      <span key={sector.id}>
                        <a href={`/sector/${sector.id}`}>
                          {sector.sector_name}
                        </a>
                        {index < Invested_DA_sectors.length - 1 ? ", " : ""}
                      </span>
                    ))
                  : "Not available"}
              </div>
            </div>

            {/* Description Section */}
            <div className="investor-section">
              <h2 className="section-title">Description:</h2>
              <div className="info-value" style={{ whiteSpace: "pre-wrap" }}>
                {Investor.description || "Not available"}
              </div>
            </div>

            {/* Investment Team Section */}
            <div className="investor-section">
              <h2 className="section-title">Investment Team</h2>

              {/* Current Team */}
              <div style={{ marginBottom: "20px" }}>
                <IndividualCards
                  title="Current:"
                  individuals={Investment_Team_Roles_current.map((member) => ({
                    id: member.individuals_id,
                    name: member.Individual_text,
                    jobTitles: member.job_titles_id.map((jt) => jt.job_title),
                    individualId: member.individuals_id,
                  }))}
                  emptyMessage="Not available"
                />
              </div>

              {/* Past Team - Only show if there are past team members */}
              {Investment_Team_Roles_past && Investment_Team_Roles_past.length > 0 && (
                <div>
                  <IndividualCards
                    title="Past:"
                    individuals={Investment_Team_Roles_past.map((member) => ({
                      id: member.individuals_id,
                      name: member.Individual_text,
                      jobTitles: member.job_titles_id.map((jt) => jt.job_title),
                      individualId: member.individuals_id,
                    }))}
                    emptyMessage="Not available"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Portfolio and Corporate Events */}
          <div className="investor-right-column">
            {/* Current Portfolio Section */}
            <div className="investor-section">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 12,
                }}
              >
                <h2 className="section-title" style={{ marginBottom: 0 }}>Current Portfolio</h2>
                <button
                  onClick={handleExportPortfolio}
                  disabled={exportingPortfolio || !investorData}
                  className="export-button"
                  type="button"
                  style={{ backgroundColor: "#22c55e" }}
                >
                  {exportingPortfolio ? "Exporting..." : "Export Portfolio"}
                </button>
              </div>
              {portfolioLoading ? (
                <div className="loading">
                  Loading current portfolio companies...
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="portfolio-table-container">
                    <table className="portfolio-table">
                      <thead>
                        <tr>
                          <th>Logo</th>
                          <th>Name</th>
                          <th>Sectors</th>
                          <th>Year Invested</th>
                          <th>Related Individuals</th>
                          <th>LinkedIn Members</th>
                          <th>Country</th>
                        </tr>
                      </thead>
                      <tbody>
                        {portfolioCompanies.length > 0 ? (
                          portfolioCompanies.map((company) => (
                            <tr key={company.id}>
                              <td>
                                <CompanyLogo
                                  logo={
                                    company._linkedin_data_of_new_company
                                      ?.linkedin_logo || ""
                                  }
                                  name={company.name}
                                />
                              </td>
                              <td>
                                {createClickableElement(
                                  `/company/${company.id}`,
                                  company.name,
                                  "company-name"
                                )}
                              </td>
                              <td>
                                <div style={{ fontSize: "12px" }}>
                                  {company.sectors_id
                                    .slice(0, 3)
                                    .map((s) => s.sector_name)
                                    .join(", ")}
                                  {company.sectors_id.length > 3 && "..."}
                                </div>
                              </td>
                              <td>
                                {company.year_invested !== null &&
                                company.year_invested !== undefined &&
                                String(company.year_invested).trim().length > 0
                                  ? String(company.year_invested)
                                  : "Not available"}
                              </td>
                              <td>
                                {company.related_to_investor_individuals &&
                                company.related_to_investor_individuals.length >
                                  0 ? (
                                  <div style={{ fontSize: "12px" }}>
                                    {company.related_to_investor_individuals
                                      .slice(0, 3)
                                      .map((individual, index) => (
                                        <span key={individual.id}>
                                          {createClickableElement(
                                            `/individual/${individual.id}`,
                                            individual.name,
                                            undefined,
                                            {
                                              textDecoration: "none",
                                              fontSize: "12px",
                                            }
                                          )}
                                          {index <
                                          Math.min(
                                            company.related_to_investor_individuals!
                                              .length,
                                            3
                                          ) -
                                            1
                                            ? ", "
                                            : ""}
                                        </span>
                                      ))}
                                    {company.related_to_investor_individuals
                                      .length > 3 && "..."}
                                  </div>
                                ) : (
                                  <span
                                    style={{
                                      color: "#64748b",
                                      fontSize: "12px",
                                    }}
                                  >
                                    Not available
                                  </span>
                                )}
                              </td>
                              <td>
                                {formatNumber(
                                  company._linkedin_data_of_new_company
                                    ?.linkedin_employee
                                )}
                              </td>
                              <td>
                                {company._locations?.Country || "Not available"}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="no-data">
                              No portfolio companies found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards View */}
                  <div className="portfolio-cards">
                    {portfolioCompanies.length > 0 ? (
                      portfolioCompanies.map((company) => (
                        <div key={company.id} className="portfolio-card">
                          <div className="portfolio-card-header">
                            <CompanyLogo
                              logo={
                                company._linkedin_data_of_new_company
                                  ?.linkedin_logo || ""
                              }
                              name={company.name}
                            />
                            {createClickableElement(
                              `/company/${company.id}`,
                              company.name,
                              "portfolio-card-name"
                            )}
                          </div>
                          <div className="portfolio-card-info">
                            <div className="portfolio-card-info-item">
                              <span className="portfolio-card-info-label">
                                Sectors:
                              </span>
                              <span className="portfolio-card-info-value">
                                {company.sectors_id
                                  .slice(0, 3)
                                  .map((s) => s.sector_name)
                                  .join(", ")}
                                {company.sectors_id.length > 3 && "..."}
                              </span>
                            </div>
                            <div className="portfolio-card-info-item">
                              <span className="portfolio-card-info-label">
                                LinkedIn:
                              </span>
                              <span className="portfolio-card-info-value">
                                {formatNumber(
                                  company._linkedin_data_of_new_company
                                    ?.linkedin_employee
                                )}
                              </span>
                            </div>
                            <div className="portfolio-card-info-item">
                              <span className="portfolio-card-info-label">
                                Year Invested:
                              </span>
                              <span className="portfolio-card-info-value">
                                {company.year_invested !== null &&
                                company.year_invested !== undefined &&
                                String(company.year_invested).trim().length > 0
                                  ? String(company.year_invested)
                                  : "Not available"}
                              </span>
                            </div>
                            <div className="portfolio-card-info-item">
                              <span className="portfolio-card-info-label">
                                Country:
                              </span>
                              <span className="portfolio-card-info-value">
                                {company._locations?.Country || "Not available"}
                              </span>
                            </div>
                            <div className="portfolio-card-info-item">
                              <span className="portfolio-card-info-label">
                                Individuals:
                              </span>
                              <span className="portfolio-card-info-value">
                                {company.related_to_investor_individuals &&
                                company.related_to_investor_individuals.length >
                                  0 ? (
                                  <>
                                    {company.related_to_investor_individuals
                                      .slice(0, 2)
                                      .map((individual, index) => (
                                        <span key={individual.id}>
                                          {createClickableElement(
                                            `/individual/${individual.id}`,
                                            individual.name,
                                            undefined,
                                            {
                                              textDecoration: "none",
                                              fontSize: "12px",
                                            }
                                          )}
                                          {index <
                                          Math.min(
                                            company.related_to_investor_individuals!
                                              .length,
                                            2
                                          ) -
                                            1
                                            ? ", "
                                            : ""}
                                        </span>
                                      ))}
                                    {company.related_to_investor_individuals
                                      .length > 2 && "..."}
                                  </>
                                ) : (
                                  "Not available"
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-data">
                        No portfolio companies found
                      </div>
                    )}
                  </div>

                  {/* Pagination */}
                  {portfolioPagination.pageTotal > 1 && (
                    <div className="pagination">
                      <span className="pagination-info">
                        Page {portfolioPagination.curPage} of{" "}
                        {portfolioPagination.pageTotal}
                      </span>
                      <button
                        onClick={() =>
                          handlePortfolioPageChange(
                            portfolioPagination.curPage - 1
                          )
                        }
                        disabled={!portfolioPagination.prevPage}
                        className="pagination-button"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() =>
                          handlePortfolioPageChange(
                            portfolioPagination.curPage + 1
                          )
                        }
                        disabled={!portfolioPagination.nextPage}
                        className="pagination-button"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Past Portfolio Section */}
            <div className="investor-section" style={{ marginTop: "32px" }}>
              <h2 className="section-title">Past Portfolio</h2>
              {pastPortfolioLoading ? (
                <div style={{ textAlign: "center", padding: "24px" }}>
                  Loading past portfolio companies...
                </div>
              ) : (
                <>
                  <div
                    style={{
                      overflowX: "auto",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                    }}
                  >
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "14px",
                      }}
                    >
                      <thead>
                        <tr style={{ backgroundColor: "#f8fafc" }}>
                          <th
                            style={{
                              padding: "12px",
                              textAlign: "left",
                              borderBottom: "1px solid #e2e8f0",
                            }}
                          >
                            Logo
                          </th>
                          <th
                            style={{
                              padding: "12px",
                              textAlign: "left",
                              borderBottom: "1px solid #e2e8f0",
                            }}
                          >
                            Name
                          </th>
                          <th
                            style={{
                              padding: "12px",
                              textAlign: "left",
                              borderBottom: "1px solid #e2e8f0",
                            }}
                          >
                            Sectors
                          </th>
                          <th
                            style={{
                              padding: "12px",
                              textAlign: "left",
                              borderBottom: "1px solid #e2e8f0",
                            }}
                          >
                            Year Exited
                          </th>
                          <th
                            style={{
                              padding: "12px",
                              textAlign: "left",
                              borderBottom: "1px solid #e2e8f0",
                            }}
                          >
                            Related Individuals
                          </th>
                          <th
                            style={{
                              padding: "12px",
                              textAlign: "left",
                              borderBottom: "1px solid #e2e8f0",
                            }}
                          >
                            LinkedIn Members
                          </th>
                          <th
                            style={{
                              padding: "12px",
                              textAlign: "left",
                              borderBottom: "1px solid #e2e8f0",
                            }}
                          >
                            Country
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {pastPortfolioCompanies.length > 0 ? (
                          pastPortfolioCompanies.map((company) => (
                            <tr
                              key={company.id}
                              style={{ borderBottom: "1px solid #e2e8f0" }}
                            >
                              <td style={{ padding: "12px" }}>
                                <CompanyLogo
                                  logo={
                                    company._linkedin_data_of_new_company
                                      ?.linkedin_logo || ""
                                  }
                                  name={company.name}
                                />
                              </td>
                              <td style={{ padding: "12px" }}>
                                {createClickableElement(
                                  `/company/${company.id}`,
                                  company.name,
                                  undefined,
                                  {
                                    textDecoration: "none",
                                    fontWeight: "500",
                                  }
                                )}
                              </td>
                              <td style={{ padding: "12px" }}>
                                <div style={{ fontSize: "12px" }}>
                                  {company.sectors_id
                                    .slice(0, 3)
                                    .map((s) => s.sector_name)
                                    .join(", ")}
                                  {company.sectors_id.length > 3 && "..."}
                                </div>
                              </td>
                              <td
                                style={{ padding: "12px" }}
                              >
                                {company.year_exited !== null &&
                                company.year_exited !== undefined &&
                                String(company.year_exited).trim().length > 0
                                  ? String(company.year_exited)
                                  : "Not available"}
                              </td>
                              <td style={{ padding: "12px" }}>
                                {company.related_to_investor_individuals &&
                                company.related_to_investor_individuals.length >
                                  0 ? (
                                  <div style={{ fontSize: "12px" }}>
                                    {company.related_to_investor_individuals
                                      .slice(0, 3)
                                      .map((individual, index) => (
                                        <span key={individual.id}>
                                          {createClickableElement(
                                            `/individual/${individual.id}`,
                                            individual.name,
                                            undefined,
                                            {
                                              textDecoration: "none",
                                              fontSize: "12px",
                                            }
                                          )}
                                          {index <
                                          Math.min(
                                            company.related_to_investor_individuals!
                                              .length,
                                            3
                                          ) -
                                            1
                                            ? ", "
                                            : ""}
                                        </span>
                                      ))}
                                    {company.related_to_investor_individuals
                                      .length > 3 && "..."}
                                  </div>
                                ) : (
                                  <span
                                    style={{
                                      color: "#64748b",
                                      fontSize: "12px",
                                    }}
                                  >
                                    Not available
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: "12px" }}>
                                {formatNumber(
                                  company._linkedin_data_of_new_company
                                    ?.linkedin_employee
                                )}
                              </td>
                              <td style={{ padding: "12px" }}>
                                {company._locations?.Country || "Not available"}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={7}
                              style={{
                                padding: "24px",
                                textAlign: "center",
                                color: "#64748b",
                              }}
                            >
                              No past portfolio companies found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {pastPortfolioPagination.pageTotal > 1 && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: "8px",
                        marginTop: "16px",
                        padding: "16px",
                      }}
                    >
                      <button
                        onClick={() =>
                          handlePastPortfolioPageChange(
                            pastPortfolioPagination.curPage - 1
                          )
                        }
                        disabled={!pastPortfolioPagination.prevPage}
                        style={{
                          padding: "8px 12px",
                          backgroundColor: pastPortfolioPagination.prevPage
                            ? "#3b82f6"
                            : "#e2e8f0",
                          color: pastPortfolioPagination.prevPage
                            ? "white"
                            : "#64748b",
                          border: "none",
                          borderRadius: "4px",
                          cursor: pastPortfolioPagination.prevPage
                            ? "pointer"
                            : "not-allowed",
                          fontSize: "14px",
                        }}
                      >
                        Previous
                      </button>

                      <span style={{ fontSize: "14px", color: "#64748b" }}>
                        Page {pastPortfolioPagination.curPage} of{" "}
                        {pastPortfolioPagination.pageTotal}
                      </span>

                      <button
                        onClick={() =>
                          handlePastPortfolioPageChange(
                            pastPortfolioPagination.curPage + 1
                          )
                        }
                        disabled={!pastPortfolioPagination.nextPage}
                        style={{
                          padding: "8px 12px",
                          backgroundColor: pastPortfolioPagination.nextPage
                            ? "#3b82f6"
                            : "#e2e8f0",
                          color: pastPortfolioPagination.nextPage
                            ? "white"
                            : "#64748b",
                          border: "none",
                          borderRadius: "4px",
                          cursor: pastPortfolioPagination.nextPage
                            ? "pointer"
                            : "not-allowed",
                          fontSize: "14px",
                        }}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Corporate Events Section */}
            <div className="investor-section" style={{ marginTop: "32px" }}>
              <CorporateEventsSection
                title="Corporate Events"
                events={corporateEvents as unknown as CorporateEventsTableEvent[]}
                loading={corporateEventsLoading}
                onEventClick={handleCorporateEventDescriptionClick}
                onAdvisorClick={(advisorId, advisorName) => {
                  if (advisorId) {
                    router.push(`/advisor/${advisorId}`);
                  } else if (advisorName) {
                    handleAdvisorClick(advisorName);
                  }
                }}
                showSectors={false}
                maxInitialEvents={3}
                truncateDescriptionLength={180}
              />
            </div>
          </div>
        </div>
      </div>

      <Footer />
      <style dangerouslySetInnerHTML={{ __html: style }} />
    </div>
  );
};

const InvestorPage = () => {
  return <InvestorDetailPage />;
};

export default InvestorPage;
