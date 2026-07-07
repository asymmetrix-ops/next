"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FollowButton } from "@/components/FollowButton";
import {
  BellIcon,
  ArrowUpTrayIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { HeadcountCard } from "@/components/redesign/HeadcountCard";
import { DescriptionCard } from "@/components/redesign/DescriptionCard";
import { T } from "@/components/redesign/primitives";
import { type CorporateEvent as CorporateEventsTableEvent } from "@/components/corporate-events/CorporateEventsTable";
import { InvestorOverviewCard } from "@/components/investors/InvestorOverviewCard";
import {
  InvestorPortfolioProfilePanel,
  type InvestorPortfolioCompany,
} from "@/components/investors/InvestorPortfolioProfilePanel";
import {
  InvestorFocusMixCard,
  type InvestorMixRow,
} from "@/components/investors/InvestorFocusMixCard";
import { InvestorPeopleCard, type InvestorTeamMember } from "@/components/investors/InvestorPeopleCard";
import { InvestorCorporateEventsProfilePanel } from "@/components/investors/InvestorCorporateEventsProfilePanel";

const INVESTOR_PROFILE_TABS = [
  "Summary",
  "Strategy",
  "Portfolio",
  "People",
  "Deals",
  "Market",
] as const;

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
  job_titles_id: Array<{ job_title: string }>;
  current_employer_url: string;
  individuals_id?: number;
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
  items: PortfolioCompany[];
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  perPage: number;
  pageTotal: number;
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

function formatWebsiteDisplayLabel(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(withProto);
    const host = url.hostname.replace(/^www\./i, "");
    const path = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
    return path ? `${host}${path}` : host;
  } catch {
    return trimmed
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .replace(/\/$/, "");
  }
}

function computeEmployeeYoYFromMonthly(data: LinkedInHistory[]): string | null {
  if (!Array.isArray(data) || data.length < 2) return null;
  const sorted = [...data].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const latest = sorted[sorted.length - 1];
  const latestCount = latest?.employees_count;
  if (typeof latestCount !== "number" || latestCount <= 0) return null;
  const latestT = new Date(latest.date).getTime();
  const yearMs = 365 * 86_400_000;
  let best: LinkedInHistory | null = null;
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
  if (!best || typeof best.employees_count !== "number" || best.employees_count <= 0) {
    return null;
  }
  const pct = ((latestCount - best.employees_count) / best.employees_count) * 100;
  const rounded = Math.round(pct * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}% YoY`;
}

function resolveChartEmployeeCount(data: LinkedInHistory[]): number {
  if (!Array.isArray(data) || data.length === 0) return 0;
  const numericData = data.map((e) => e.employees_count);
  const hasAnyNonZero = numericData.some((v) => v > 0);
  const filtered = hasAnyNonZero ? numericData.filter((v) => v > 0) : numericData;
  const lastNonZero = filtered.length > 0 ? filtered[filtered.length - 1]! : 0;
  const last = numericData[numericData.length - 1] ?? 0;
  return last > 0 ? last : lastNonZero;
}

interface PortfolioMixApiRow {
  label: string;
  company_count?: number;
  percentage?: string | number;
}

interface PortfolioMixResponse {
  investor_id?: number;
  sector_mix?: PortfolioMixApiRow[];
  stage_focus?: PortfolioMixApiRow[];
  geography?: PortfolioMixApiRow[];
}

function mapPortfolioMixRows(rows: PortfolioMixApiRow[] | undefined): InvestorMixRow[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((row) => row?.label?.trim())
    .map((row) => {
      const pctRaw = row.percentage;
      const pct =
        typeof pctRaw === "number"
          ? pctRaw
          : Number.parseFloat(String(pctRaw ?? "").replace(/%/g, "").trim());
      return {
        label: row.label.trim(),
        pct: Number.isFinite(pct) ? pct : 0,
      };
    });
}

function extractOptionalString(raw: unknown, keys: string[]): string | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (Array.isArray(value) && value.length > 0) {
      const first = value[0];
      if (typeof first === "string" && first.trim()) return first.trim();
    }
  }
  return null;
}

const CompanyLogo = ({ logo, name }: { logo: string; name: string }) => {
  if (logo) {
    return (
      <Image
        src={`data:image/jpeg;base64,${logo}`}
        alt={`${name} logo`}
        width={40}
        height={40}
        style={{
          objectFit: "contain",
          borderRadius: "50%",
          border: `1px solid ${T.divider}`,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: 40,
        height: 40,
        backgroundColor: T.inset,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 600,
        color: T.muted,
        border: `1px solid ${T.divider}`,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
};

const InvestorDetailPage = () => {
  const params = useParams();
  const investorId = params.id as string;
  const descriptionRef = useRef<HTMLDivElement>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState<string>("Summary");

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
  const [linkedinUrl, setLinkedinUrl] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [pastPortfolioLoading, setPastPortfolioLoading] = useState(false);
  const [portfolioMix, setPortfolioMix] = useState<PortfolioMixResponse | null>(null);
  const [portfolioMixLoading, setPortfolioMixLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [resolvedIndividualIds, setResolvedIndividualIds] = useState<
    Map<string, number>
  >(new Map());

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
        `https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm:develop/get_the_investor_new_company?${params.toString()}`,
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
          `https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm:develop/get_investors_current_partfolio?${params.toString()}`,
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

        if (Array.isArray(raw)) {
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
            nextPage: data.nextPage || null,
            prevPage: data.prevPage || null,
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
          `https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm:develop/get_investors_past_portfolio?${params.toString()}`,
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

        if (Array.isArray(raw)) {
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
            nextPage: data.nextPage || null,
            prevPage: data.prevPage || null,
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

  // Fetch corporate events
  const fetchCorporateEvents = useCallback(async () => {
    setCorporateEventsLoading(true);
    try {
      const token = localStorage.getItem("asymmetrix_auth_token");

      const params = new URLSearchParams();
      params.append("new_company_id", investorId);

      const response = await fetch(
        `https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm:develop/Get_investors_corporate_events?${params.toString()}`,
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
    try {
      const token = localStorage.getItem("asymmetrix_auth_token");

      const response = await fetch(
        `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au:develop/Get_new_company/${investorId}`,
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
    }
  }, [investorId]);

  const fetchPortfolioMix = useCallback(async () => {
    setPortfolioMixLoading(true);
    try {
      const token = localStorage.getItem("asymmetrix_auth_token");
      const response = await fetch(
        `https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm:develop/investor_portfolio_mix/${encodeURIComponent(investorId)}`,
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
        throw new Error(`Portfolio mix API request failed: ${response.statusText}`);
      }

      const data = (await response.json()) as PortfolioMixResponse;
      setPortfolioMix(data);
    } catch (err) {
      console.error("Error fetching investor portfolio mix:", err);
      setPortfolioMix(null);
    } finally {
      setPortfolioMixLoading(false);
    }
  }, [investorId]);

  useEffect(() => {
    if (investorId) {
      fetchInvestorData();
      fetchPortfolioCompanies(1);
      fetchPastPortfolioCompanies(1);
      fetchCorporateEvents();
      fetchLinkedInHistory();
      fetchPortfolioMix();
    }
  }, [
    fetchInvestorData,
    fetchPortfolioCompanies,
    fetchPastPortfolioCompanies,
    fetchCorporateEvents,
    fetchLinkedInHistory,
    fetchPortfolioMix,
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

  // Resolve individual id by name via API
  const resolveIndividualIdByName = async (
    individualName: string
  ): Promise<number | null> => {
    try {
      const token = localStorage.getItem("asymmetrix_auth_token");
      const params = new URLSearchParams();
      params.append("search_query", individualName);
      params.append("Offset", "1");
      params.append("Per_page", "10");
      const response = await fetch(
        `https://xdil-abvj-o7rq.e2.xano.io/api:Xpykjv0R:develop/get_all_individuals?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );
      if (!response.ok) return null;
      const data = await response.json();
      const normalizedName = individualName.trim().toLowerCase();
      const match = data.Individuals_list?.items?.find(
        (ind: { advisor_individuals: string; id: number }) =>
          ind.advisor_individuals?.trim().toLowerCase() === normalizedName
      );
      return match?.id ?? null;
    } catch (error) {
      console.error("Error resolving individual by name:", error);
      return null;
    }
  };

  // Resolve all individual IDs when investor data loads
  useEffect(() => {
    const resolveAllIds = async () => {
      if (!investorData) return;

      const allNames = new Set<string>();
      investorData.Investment_Team_Roles_current.forEach((member) => {
        allNames.add(member.Individual_text);
      });
      investorData.Investment_Team_Roles_past.forEach((member) => {
        allNames.add(member.Individual_text);
      });

      const resolved = new Map<string, number>();
      await Promise.all(
        Array.from(allNames).map(async (name) => {
          const id = await resolveIndividualIdByName(name);
          if (id) {
            resolved.set(name, id);
          }
        })
      );

      setResolvedIndividualIds(resolved);
    };

    resolveAllIds();
  }, [investorData]);

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
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: T.paper, fontFamily: T.sans }}>
        <Header />
        <div style={{ flex: 1, padding: 32, display: "flex", justifyContent: "center", alignItems: "center", color: T.muted }}>
          Loading investor data…
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: T.paper, fontFamily: T.sans }}>
        <Header />
        <div style={{ flex: 1, padding: 32, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ color: T.ink, fontFamily: T.sans }}>Error Loading Investor</h2>
            <p style={{ color: T.muted }}>{error}</p>
            <button
              type="button"
              onClick={fetchInvestorData}
              style={{
                padding: "8px 16px",
                backgroundColor: T.azure,
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontFamily: T.sans,
                fontSize: 13,
                fontWeight: 600,
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
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: T.paper, fontFamily: T.sans }}>
        <Header />
        <div style={{ flex: 1, padding: 32, display: "flex", justifyContent: "center", alignItems: "center", color: T.muted }}>
          Investor not found
        </div>
        <Footer />
      </div>
    );
  }

  const {
    Investor,
    Focus,
    Investment_Team_Roles_current,
    Investment_Team_Roles_past,
  } = investorData;

  const investorRaw = Investor as Investor & Record<string, unknown>;
  const investorType =
    extractOptionalString(investorRaw, ["investor_type", "type"]) ||
    extractOptionalString(investorData as unknown, ["investor_type"]);
  const investorOwnership =
    extractOptionalString(investorRaw, ["ownership", "ownership_type"]) ||
    (investorRaw._ownership_type && typeof investorRaw._ownership_type === "object"
      ? extractOptionalString(investorRaw._ownership_type, ["ownership"])
      : null);
  const investorStatus =
    extractOptionalString(investorRaw, ["status", "investor_status"]) || "Active";

  const hq = `${Investor._locations?.City || ""}, ${
    Investor._locations?.State__Province__County || ""
  }, ${Investor._locations?.Country || ""}`
    .replace(/^,\s*/, "")
    .replace(/,\s*$/, "");

  const resolveTeamMemberIndividualId = (member: TeamMember): number | undefined => {
    if (typeof member.individuals_id === "number" && member.individuals_id > 0) {
      return member.individuals_id;
    }
    return resolvedIndividualIds.get(member.Individual_text);
  };

  const teamMembers: InvestorTeamMember[] = [
    ...Investment_Team_Roles_current.map((member) => ({
      name: member.Individual_text,
      role: member.job_titles_id.map((jt) => jt.job_title).join(", "),
      individualId: resolveTeamMemberIndividualId(member),
      tenure: null,
    })),
    ...Investment_Team_Roles_past.map((member) => ({
      name: member.Individual_text,
      role: member.job_titles_id.map((jt) => jt.job_title).join(", "),
      individualId: resolveTeamMemberIndividualId(member),
      tenure: null,
    })),
  ];

  const mapPortfolioCompany = (
    company: PortfolioCompany,
    variant: "current" | "past"
  ): InvestorPortfolioCompany => ({
    id: company.id,
    name: company.name,
    sectors: company.sectors_id.map((s) => s.sector_name).filter(Boolean),
    yearLabel: variant === "past" ? company.year_exited : company.year_invested,
    relatedIndividuals: company.related_to_investor_individuals,
    country: company._locations?.Country,
    logo: company._linkedin_data_of_new_company?.linkedin_logo,
  });

  const currentPortfolioRows = portfolioCompanies.map((c) =>
    mapPortfolioCompany(c, "current")
  );
  const pastPortfolioRows = pastPortfolioCompanies.map((c) =>
    mapPortfolioCompany(c, "past")
  );

  const currentHeadcount = resolveChartEmployeeCount(linkedInHistory);
  const headcountYoY = computeEmployeeYoYFromMonthly(linkedInHistory);
  const headcountHistoryMonths = linkedInHistory.filter((e) => e.employees_count > 0).length;

  const sectorMix = mapPortfolioMixRows(portfolioMix?.sector_mix);
  const stageFocus = mapPortfolioMixRows(portfolioMix?.stage_focus);
  const geographyMix = mapPortfolioMixRows(portfolioMix?.geography);

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
      flex: 1,
      display: "flex",
      flexDirection: "column" as const,
      overflow: "hidden",
    },
    responsiveGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      gap: "12px",
      flex: 1,
      maxWidth: "100%",
      overflow: "hidden",
      alignItems: "stretch",
    },
  };

  const responsiveCss = `
    .investor-detail-page { overflow-x: hidden; }
    .responsiveGrid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      max-width: 100%;
      align-items: stretch;
    }
    .responsiveGrid > * { min-width: 0; min-height: 0; }
    .investor-grid-overview { grid-column: 1; grid-row: 1; display: flex; flex-direction: column; min-height: 0; align-self: stretch; }
    .investor-grid-description { grid-column: 2; grid-row: 1; display: flex; flex-direction: column; min-height: 0; align-self: stretch; }
    .investor-grid-focus-mix { grid-column: 3; grid-row: 1; display: flex; flex-direction: column; min-height: 0; align-self: stretch; }
    .investor-grid-portfolio { grid-column: 1 / span 2; grid-row: 2; display: flex; flex-direction: column; min-height: 0; align-self: stretch; overflow: hidden; max-width: 100%; }
    .investor-grid-people { grid-column: 3; grid-row: 2; display: flex; flex-direction: column; min-height: 0; align-self: stretch; }
    .investor-grid-corporate-events { grid-column: 1 / span 2; grid-row: 3; display: flex; flex-direction: column; min-height: 0; align-self: stretch; overflow: hidden; max-width: 100%; }
    .investor-grid-headcount { grid-column: 3; grid-row: 3; display: flex; flex-direction: column; min-height: 0; align-self: stretch; }
    .investor-grid-portfolio > *,
    .investor-grid-corporate-events > *,
    .investor-grid-people > *,
    .investor-grid-headcount > * {
      min-width: 0;
      max-width: 100%;
      width: 100%;
    }
    @media (max-width: 768px) {
      .responsiveGrid { grid-template-columns: 1fr !important; gap: 12px !important; max-width: 100% !important; }
      .investor-grid-overview,
      .investor-grid-description,
      .investor-grid-focus-mix,
      .investor-grid-portfolio,
      .investor-grid-people,
      .investor-grid-corporate-events,
      .investor-grid-headcount {
        grid-column: 1 / -1 !important;
        grid-row: auto !important;
        align-self: stretch !important;
      }
    }
  `;

  return (
    <div className="investor-detail-page" style={styles.container}>
      <Header />

      <div style={{ backgroundColor: T.paper, borderBottom: `1px solid ${T.divider}`, padding: "0 24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            padding: "22px 0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0, flex: 1 }}>
            <CompanyLogo
              logo={Investor._linkedin_data_of_new_company?.linkedin_logo || ""}
              name={Investor.name}
            />
            <span
              style={{
                fontSize: 24,
                fontWeight: 600,
                color: T.ink,
                letterSpacing: "-0.4px",
                lineHeight: 1.2,
                fontFamily: T.sans,
              }}
            >
              {Investor.name}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {investorId && !Number.isNaN(Number(investorId)) && (
              <FollowButton
                followKey="followed_investors"
                entityId={Number(investorId)}
                entityType="investor"
                label="Investor"
                icon={<BellIcon width={15} height={15} strokeWidth={2} aria-hidden />}
              />
            )}
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={exportingPdf || !investorData}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontFamily: T.sans,
                fontSize: 12.5,
                fontWeight: 600,
                color: "#fff",
                backgroundColor: exportingPdf ? T.faint : "#475569",
                border: "none",
                borderRadius: 6,
                padding: "8px 14px",
                cursor: exportingPdf || !investorData ? "not-allowed" : "pointer",
              }}
            >
              <ArrowUpTrayIcon width={15} height={15} strokeWidth={2} aria-hidden />
              {exportingPdf ? "Exporting…" : "Export PDF"}
            </button>
            <a
              href={reportMailTo}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontFamily: T.sans,
                fontSize: 12.5,
                fontWeight: 600,
                color: "#fff",
                backgroundColor: T.emerald,
                borderRadius: 6,
                padding: "8px 14px",
                textDecoration: "none",
              }}
            >
              <PlusIcon width={15} height={15} strokeWidth={2} aria-hidden />
              Contribute Data
            </a>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "2px",
            overflowX: "auto" as const,
            scrollbarWidth: "none" as const,
          }}
        >
          {INVESTOR_PROFILE_TABS.map((tab) => {
            const active = tab === activeProfileTab;
            const disabled = tab !== "Summary";
            return (
              <button
                key={tab}
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (!disabled) setActiveProfileTab(tab);
                }}
                style={{
                  padding: "10px 14px",
                  fontFamily: T.sans,
                  fontSize: "13px",
                  fontWeight: active ? 600 : 500,
                  color: disabled ? T.faint : active ? T.ink : T.muted,
                  borderBottom: `2px solid ${active ? T.azure : "transparent"}`,
                  marginBottom: "-1px",
                  cursor: disabled ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap" as const,
                  transition: "color 120ms",
                  background: "transparent",
                  borderTop: "none",
                  borderLeft: "none",
                  borderRight: "none",
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="investor-detail-content" style={styles.maxWidth}>
          {activeProfileTab === "Summary" ? (
          <div style={styles.responsiveGrid} className="responsiveGrid">
            <div className="investor-grid-overview">
              <InvestorOverviewCard
                fillGridCell
                focusSectors={Focus.filter((f) => f?.sector_name).map((f) => ({
                  name: f.sector_name,
                  href: f.id ? `/sector/${f.id}` : undefined,
                }))}
                type={investorType}
                yearFounded={Investor._years?.Year || Investor.year_founded || null}
                website={Investor.url}
                websiteLabel={
                  Investor.url?.trim() ? formatWebsiteDisplayLabel(Investor.url) : undefined
                }
                hq={hq || undefined}
                linkedinUrl={
                  linkedinUrl ||
                  Investor._linkedin_data_of_new_company?.LinkedIn_URL ||
                  undefined
                }
                ownership={investorOwnership}
                status={investorStatus}
                employees={currentHeadcount > 0 ? currentHeadcount : null}
                employeesYoY={headcountYoY || undefined}
              />
            </div>

            <div
              className="investor-grid-description"
              style={{
                minWidth: 0,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                alignSelf: isDescriptionExpanded ? "start" : "stretch",
                overflow: isDescriptionExpanded ? "visible" : "hidden",
              }}
            >
              <DescriptionCard
                text={Investor.description ?? ""}
                expanded={isDescriptionExpanded}
                onToggleExpand={() => setIsDescriptionExpanded((e) => !e)}
                contentRef={descriptionRef}
                fillGridCell={!isDescriptionExpanded}
              />
            </div>

            <div className="investor-grid-focus-mix">
              <InvestorFocusMixCard
                fillGridCell
                loading={portfolioMixLoading}
                sectorMix={sectorMix}
                stageFocus={stageFocus}
                geography={geographyMix}
              />
            </div>

            <div className="investor-grid-portfolio">
              <InvestorPortfolioProfilePanel
                fillGridCell
                currentCompanies={currentPortfolioRows}
                pastCompanies={pastPortfolioRows}
                currentTotal={portfolioPagination.itemsReceived || undefined}
                pastTotal={pastPortfolioPagination.itemsReceived || undefined}
                loadingCurrent={portfolioLoading}
                loadingPast={pastPortfolioLoading}
                currentPagination={{
                  curPage: portfolioPagination.curPage,
                  pageTotal: portfolioPagination.pageTotal,
                  itemsReceived: portfolioPagination.itemsReceived,
                  perPage: portfolioPagination.perPage,
                }}
                pastPagination={{
                  curPage: pastPortfolioPagination.curPage,
                  pageTotal: pastPortfolioPagination.pageTotal,
                  itemsReceived: pastPortfolioPagination.itemsReceived,
                  perPage: pastPortfolioPagination.perPage,
                }}
                onCurrentPageChange={handlePortfolioPageChange}
                onPastPageChange={handlePastPortfolioPageChange}
                pageSize={4}
              />
            </div>

            <div className="investor-grid-people">
              <InvestorPeopleCard fillGridCell members={teamMembers} maxVisible={6} />
            </div>

            <div className="investor-grid-corporate-events">
              <InvestorCorporateEventsProfilePanel
                fillGridCell
                events={corporateEvents as unknown as CorporateEventsTableEvent[]}
                loading={corporateEventsLoading}
                maxInitialEvents={5}
              />
            </div>

            <div className="investor-grid-headcount">
              <HeadcountCard
                fillGridCell
                data={linkedInHistory.map((e) => e.employees_count)}
                dates={linkedInHistory.map((e) => e.date)}
                count={currentHeadcount}
                yoyLabel={headcountYoY || undefined}
                asOf={(() => {
                  const nonZero = linkedInHistory.filter((e) => e.employees_count > 0);
                  const ref =
                    nonZero.length > 0
                      ? nonZero[nonZero.length - 1]
                      : linkedInHistory[linkedInHistory.length - 1];
                  if (!ref?.date) return undefined;
                  try {
                    return new Date(ref.date).toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    });
                  } catch {
                    return undefined;
                  }
                })()}
                historyLabel={
                  headcountHistoryMonths > 0
                    ? `${headcountHistoryMonths}-month history`
                    : undefined
                }
                linkedinUrl={
                  linkedinUrl ||
                  Investor._linkedin_data_of_new_company?.LinkedIn_URL ||
                  undefined
                }
              />
            </div>
          </div>
          ) : (
            <div
              style={{
                padding: "48px 24px",
                textAlign: "center",
                color: T.muted,
                fontFamily: T.sans,
                fontSize: 14,
              }}
            >
              {activeProfileTab} view coming soon.
            </div>
          )}
        </div>
        <style dangerouslySetInnerHTML={{ __html: responsiveCss }} />
      </main>

      <Footer />
    </div>
  );
};

const InvestorPage = () => {
  return <InvestorDetailPage />;
};

export default InvestorPage;
