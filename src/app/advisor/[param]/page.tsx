"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FollowButton } from "@/components/FollowButton";
import {
  BellIcon,
  ArrowUpTrayIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useAdvisorProfile } from "../../../hooks/useAdvisorProfile";
import {
  formatCurrency,
  formatDate,
  getAdvisorYearFoundedDisplay,
} from "../../../utils/advisorHelpers";
import { locationsService } from "@/lib/locationsService";
import { HeadcountCard } from "@/components/redesign/HeadcountCard";
import { DescriptionCard } from "@/components/redesign/DescriptionCard";
import { ManagementCard } from "@/components/redesign/ManagementCard";
import { LinkPanel, T } from "@/components/redesign/primitives";
import { AdvisorOverviewCard } from "@/components/advisors/AdvisorOverviewCard";
import {
  AdvisorDealsProfilePanel,
  type AdvisorDealEvent,
} from "@/components/advisors/AdvisorDealsProfilePanel";

interface LinkedInHistory {
  date: string;
  employees_count: number;
}

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

export default function AdvisorProfilePage() {
  const params = useParams();
  const advisorId = parseInt(params.param as string);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [exportingDeals, setExportingDeals] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [linkedInHistory, setLinkedInHistory] = useState<LinkedInHistory[]>([]);
  // Roles fetched from the LinkedIn/company endpoint (includes job titles)
  interface RoleItem {
    id: number;
    individuals_id: number;
    Individual_text?: string;
    advisor_individuals?: string;
    job_titles_id?: Array<{ id?: number; job_title: string }>;
  }
  const [rolesCurrent, setRolesCurrent] = useState<RoleItem[]>([]);
  const [rolesPast, setRolesPast] = useState<RoleItem[]>([]);
  // Sector filter state
  const [filterPrimarySectors, setFilterPrimarySectors] = useState<Array<{ id: number; sector_name: string }>>([]);
  const [filterSecondarySectors, setFilterSecondarySectors] = useState<Array<{ id: number; sector_name: string }>>([]);
  const [selectedFilterPrimary, setSelectedFilterPrimary] = useState<number[]>([]);
  const [selectedFilterSecondary, setSelectedFilterSecondary] = useState<number[]>([]);
  const [loadingFilterPrimary, setLoadingFilterPrimary] = useState(false);
  const [loadingFilterSecondary, setLoadingFilterSecondary] = useState(false);

  const { advisorData, corporateEvents, loading, error } = useAdvisorProfile({
    advisorId,
  });

  // Removed: handleAdvisorClick (replaced with createClickableElement in list)

  // Replaced corporate event navigation with right-clickable links via createClickableElement

  // Removed unused handler; replaced by mailto link button

  const escapeCsvField = (value: string): string => {
    if (value == null) return "";
    const s = String(value).trim();
    if (s.includes('"') || s.includes("\n") || s.includes(",")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const coerceUnknownToArray = (raw: unknown): unknown[] => {
    if (Array.isArray(raw)) return raw;
    if (raw === null || raw === undefined) return [];
    if (typeof raw !== "string") return [];
    const trimmed = raw.trim();
    if (!trimmed || trimmed === "[]") return [];
    try {
      const normalized = trimmed.replace(/\\u0022/g, '"');
      const parsed = JSON.parse(normalized) as unknown;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const getEventRowForCsv = (event: AdvisorDealEvent): string[] => {
    const date = event.announcement_date
      ? formatDate(event.announcement_date)
      : "-";
    const counterparty = (event.company_advised_role || event.company_advised_name || "-").trim() || "-";
    const clientName = (event.company_advised_name || "").trim() || "-";
    const sectors = (() => {
      const arr = coerceUnknownToArray(event.primary_sectors as unknown);
      return arr
        .map((s) => String((s as { sector_name?: string })?.sector_name || "").trim())
        .filter(Boolean)
        .join(", ") || "-";
    })();
    let ev = "-";
    const value = event.enterprise_value_m;
    const currency = (event.currency_name || "").trim();
    if (value != null && value !== "") {
      ev = currency ? formatCurrency(String(value), currency) : String(value);
    }
    const individuals = coerceUnknownToArray(event.advisor_individuals as unknown)
      .map((p) => String((p as { name?: string })?.name || "").trim())
      .filter(Boolean)
      .join(", ") || "-";
    const otherAdvisors = coerceUnknownToArray(event.other_advisors as unknown)
      .map((a) =>
        String((a as { advisor_company_name?: string })?.advisor_company_name || "").trim()
      )
      .filter(Boolean)
      .join(", ") || "-";
    return [
      event.description ?? "",
      date,
      event.deal_type ?? "-",
      counterparty,
      clientName,
      sectors,
      ev,
      individuals,
      otherAdvisors,
    ];
  };

  const exportDealsToCsv = () => {
    if (filteredEvents.length === 0) return;
    setExportingDeals(true);
    try {
      const headers = [
        "Description",
        "Date Announced",
        "Type",
        "Counterparty Advised",
        "Client Name",
        "Sector(s)",
        "Enterprise Value",
        "Individuals",
        "Other Advisors",
      ];
      const rows = filteredEvents.map((event) =>
        getEventRowForCsv(event).map(escapeCsvField).join(",")
      );
      // Prepend UTF-8 BOM so Excel and other tools correctly detect encoding.
      const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const urlObj = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = urlObj;
      a.download = `advisor-${advisorId}-deals-advised-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(urlObj);
    } catch (err) {
      console.error("Export Deals Advised failed:", err);
    } finally {
      setExportingDeals(false);
    }
  };

  const buildAdvisorPageSnapshot = () => {
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://www.asymmetrixintelligence.com";
    const pagePath = `/advisor/${advisorId}`;
    const pageUrl = `${baseUrl}${pagePath}`;

    const env =
      process.env.NEXT_PUBLIC_ENVIRONMENT ||
      process.env.NEXT_PUBLIC_VERCEL_ENV ||
      "unknown";

    const advisor = advisorData?.Advisor;
    const loc = advisor?._locations;
    const hqFormatted = `${loc?.City || ""}, ${loc?.State__Province__County || ""}, ${
      loc?.Country || ""
    }`
      .replace(/^,\s*/, "")
      .replace(/,\s*$/, "");

    const linkedInNew = advisor?._linkedin_data_of_new_company as
      | { linkedin_logo?: string; linkedin_employee?: number; linkedin_emp_date?: string }
      | undefined;
    const linkedInLegacy = advisor?.linkedin_data as
      | { LinkedIn_URL?: string; LinkedIn_Employee?: number; LinkedIn_Emp__Date?: string; linkedin_logo?: string }
      | undefined;

    const normalizedDeals = filteredEvents.map((event) => {
      const companyAdvisedId = event.company_advised_id ?? null;
      const companyAdvisedName = (event.company_advised_name || "").trim() || null;
      const companyAdvisedRole = (event.company_advised_role || "").trim() || null;

      const roleLc = String(companyAdvisedRole || "").toLowerCase();
      const companyAdvisedPath =
        companyAdvisedId && companyAdvisedName
          ? roleLc.includes("investor")
            ? `/investors/${companyAdvisedId}`
            : `/company/${companyAdvisedId}`
          : null;

      const currency = (event.currency_name || "").trim() || null;
      const value = event.enterprise_value_m ?? null;
      const evFormatted =
        value === null || value === undefined || value === ""
          ? "-"
          : currency
          ? formatCurrency(String(value), currency)
          : String(value);

      const sectorsArr = coerceUnknownToArray(event.primary_sectors as unknown).map(
        (s) => {
          const obj = s as {
            id?: number;
            sector_name?: string;
            sector_importance?: string;
            is_derived?: boolean;
          };
          return {
            id: typeof obj.id === "number" ? obj.id : null,
            sector_name: obj.sector_name ?? null,
            sector_importance: obj.sector_importance ?? null,
            is_derived: typeof obj.is_derived === "boolean" ? obj.is_derived : null,
          };
        }
      );

      const advisorIndividualsArr = coerceUnknownToArray(
        event.advisor_individuals as unknown
      ).map((p) => {
        const obj = p as { id?: number; name?: string };
        return {
          id: typeof obj.id === "number" ? obj.id : null,
          name: obj.name ?? null,
        };
      });

      const otherAdvisorsArr = coerceUnknownToArray(event.other_advisors as unknown).map(
        (a) => {
          const obj = a as {
            id?: number;
            advisor_company_id?: number;
            advisor_company_name?: string;
            individuals_id?: number[];
          };
          return {
            id: typeof obj.id === "number" ? obj.id : null,
            advisor_company_id:
              typeof obj.advisor_company_id === "number" ? obj.advisor_company_id : null,
            advisor_company_name: obj.advisor_company_name ?? null,
            individuals_id: Array.isArray(obj.individuals_id) ? obj.individuals_id : null,
          };
        }
      );

      return {
        id: event.id,
        description: event.description ?? null,
        announcement_date: event.announcement_date ?? null,
        announcement_date_display: event.announcement_date
          ? formatDate(event.announcement_date)
          : "-",
        deal_type: event.deal_type ?? null,
        company_advised: {
          id: companyAdvisedId,
          name: companyAdvisedName,
          role: companyAdvisedRole,
        },
        enterprise_value: {
          value_m: value,
          currency_name: currency,
          formatted: evFormatted,
        },
        sectors: sectorsArr,
        advisor_individuals: advisorIndividualsArr,
        other_advisors: otherAdvisorsArr,
        links: {
          corporate_event_path: `/corporate-event/${event.id}`,
          company_advised_path: companyAdvisedPath,
        },
      };
    });

    const buildPeopleLists = () => {
      const fallbacksUsed: string[] = [];

      const fromRoles = (roles: RoleItem[]) =>
        roles.map((role) => ({
          id: role.id,
          individual_id: role.individuals_id,
          name:
            (role.advisor_individuals || role.Individual_text || "").trim() || "Unknown",
          job_titles: role.job_titles_id?.map((jt) => jt.job_title) || [],
        }));

      const fromProfileIndividuals = (
        arr: Array<{
          id: number;
          individuals_id: number;
          advisor_individuals: string;
          job_titles_id?: Array<{ id?: number; job_title: string }>;
        }>
      ) =>
        arr.map((individual) => ({
          id: individual.id,
          individual_id: individual.individuals_id,
          name: (individual.advisor_individuals || "").trim() || "Unknown",
          job_titles: individual.job_titles_id?.map((jt) => jt.job_title) || [],
        }));

      let current: Array<{
        id: number;
        individual_id: number;
        name: string;
        job_titles: string[];
      }> = [];
      let past: Array<{
        id: number;
        individual_id: number;
        name: string;
        job_titles: string[];
      }> = [];

      if (rolesCurrent.length > 0) {
        current = fromRoles(rolesCurrent);
      } else if (
        advisorData?.Advisors_individuals_current &&
        advisorData.Advisors_individuals_current.length > 0
      ) {
        current = fromProfileIndividuals(advisorData.Advisors_individuals_current);
        fallbacksUsed.push("advisor_profile_current");
      } else if (advisorData?.Advisors_individuals && advisorData.Advisors_individuals.length > 0) {
        current = fromProfileIndividuals(advisorData.Advisors_individuals);
        fallbacksUsed.push("advisor_profile_all");
      }

      if (rolesPast.length > 0) {
        past = fromRoles(rolesPast);
      } else if (
        advisorData?.Advisors_individuals_past &&
        advisorData.Advisors_individuals_past.length > 0
      ) {
        past = fromProfileIndividuals(advisorData.Advisors_individuals_past);
        fallbacksUsed.push("advisor_profile_past");
      }

      return { current, past, fallbacksUsed };
    };

    const { current, past, fallbacksUsed } = buildPeopleLists();

    return {
      schema_version: "1.0.0",
      captured_at: new Date().toISOString(),
      source: {
        app: "asymmetrix-nextjs",
        environment: env,
        page_path: pagePath,
        page_url: pageUrl,
        advisor_id: advisorId,
      },
      advisor: {
        id: advisor?.id ?? advisorId,
        name: advisor?.name ?? "",
        description: advisor?.description ?? null,
        website_url: advisor?.url ?? null,
        year_founded_display: advisor ? getAdvisorYearFoundedDisplay(advisor) : "-",
        hq: {
          city: loc?.City ?? null,
          state_province_county: loc?.State__Province__County ?? null,
          country: loc?.Country ?? null,
          formatted: hqFormatted,
        },
        linkedin: {
          logo_base64_jpeg: linkedInNew?.linkedin_logo || linkedInLegacy?.linkedin_logo || null,
          employee_count:
            typeof linkedInNew?.linkedin_employee === "number"
              ? linkedInNew.linkedin_employee
              : typeof linkedInLegacy?.LinkedIn_Employee === "number"
              ? linkedInLegacy.LinkedIn_Employee
              : null,
          employee_count_date: linkedInNew?.linkedin_emp_date || linkedInLegacy?.LinkedIn_Emp__Date || null,
          linkedin_url: linkedInLegacy?.LinkedIn_URL || null,
        },
        portfolio_companies_count: advisorData?.Portfolio_companies_count ?? 0,
      },
      deals_advised: {
        total_count: safeEvents.length,
        filtered_count: filteredEvents.length,
        active_filters: {
          primary_sector_ids: selectedFilterPrimary,
          secondary_sector_ids: selectedFilterSecondary,
        },
        items: normalizedDeals,
      },
      linkedin_history: {
        monthly_employee_counts: linkedInHistory.map((x) => ({
          date: x.date,
          employees_count: x.employees_count,
        })),
      },
      advisor_people: {
        current,
        past,
        sources: {
          preferred: "linkedin_company_endpoint_roles",
          fallbacks_used: fallbacksUsed,
        },
      },
      deal_filter_option_lists: {
        primary_sectors: filterPrimarySectors.map((s) => ({
          id: s.id,
          sector_name: s.sector_name,
        })),
        secondary_sectors: filterSecondarySectors.map((s) => ({
          id: s.id,
          sector_name: s.sector_name,
        })),
      },
    };
  };

  const exportAdvisorPdf = async () => {
    if (!advisorData?.Advisor) return;
    setExportingPdf(true);
    try {
      const payload = { advisor: buildAdvisorPageSnapshot() };
      const res = await fetch(
        "https://asymmetrix-pdf-service.fly.dev/api/export-advisor-pdf",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `PDF export failed: ${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`
        );
      }
      const blob = await res.blob();
      const urlObj = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = urlObj;
      const safeNamePart = (input: string) =>
        input
          .trim()
          .replace(/[^a-zA-Z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 60)
          .toLowerCase();
      const advisorName = String(advisorData.Advisor?.name || "").trim();
      const date = new Date().toISOString().slice(0, 10);
      const namePart = safeNamePart(advisorName) || `advisor-${advisorId}`;
      a.download = `${namePart}-${date}.pdf`;
      a.click();
      URL.revokeObjectURL(urlObj);
    } catch (e) {
      console.error("Export PDF failed:", e);
    } finally {
      setExportingPdf(false);
    }
  };

  // Fetch LinkedIn history data using the same API pattern as company page
  const fetchLinkedInHistory = useCallback(async () => {
    try {
      const token = localStorage.getItem("asymmetrix_auth_token");

      const response = await fetch(
        `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au:develop/Get_new_company/${advisorId}`,
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
      console.log("Advisor LinkedIn history API response:", data);

      // Extract employee count data from the same field as company page
      const employeeData =
        data.Company?._companies_employees_count_monthly || [];

      // Transform the data to match our interface - same format as company page
      const historyData = employeeData.map(
        (item: { date?: string; employees_count?: number }) => ({
          date: item.date || "",
          employees_count: item.employees_count || 0,
        })
      );

      setLinkedInHistory(historyData);

      // Capture roles (with job titles) if provided by this endpoint
      const currentRoles: RoleItem[] = Array.isArray(
        data.Managmant_Roles_current
      )
        ? data.Managmant_Roles_current
        : [];
      const pastRoles: RoleItem[] = Array.isArray(data.Managmant_Roles_past)
        ? data.Managmant_Roles_past
        : [];
      setRolesCurrent(currentRoles);
      setRolesPast(pastRoles);
    } catch (err) {
      console.error("Error fetching advisor LinkedIn history:", err);
    }
  }, [advisorId]);

  useEffect(() => {
    if (advisorId) {
      fetchLinkedInHistory();
    }
  }, [advisorId, fetchLinkedInHistory]);

  // Update page title when advisor data is loaded
  useEffect(() => {
    if (advisorData?.Advisor?.name && typeof document !== "undefined") {
      document.title = `Asymmetrix – ${advisorData.Advisor.name}`;
    }
  }, [advisorData?.Advisor?.name]);

  // Fetch primary sectors for deal filters
  useEffect(() => {
    let cancelled = false;
    const fetchPrimary = async () => {
      setLoadingFilterPrimary(true);
      try {
        const data = await locationsService.getPrimarySectors();
        if (!cancelled) setFilterPrimarySectors(data);
      } catch {
        // silent fail
      } finally {
        if (!cancelled) setLoadingFilterPrimary(false);
      }
    };
    fetchPrimary();
    return () => { cancelled = true; };
  }, []);

  // Fetch secondary sectors when primary selection changes
  useEffect(() => {
    if (selectedFilterPrimary.length === 0) {
      setFilterSecondarySectors([]);
      setSelectedFilterSecondary([]);
      return;
    }
    let cancelled = false;
    const fetchSecondary = async () => {
      setLoadingFilterSecondary(true);
      try {
        const data = await locationsService.getSecondarySectors(selectedFilterPrimary);
        if (!cancelled) setFilterSecondarySectors(data);
      } catch {
        // silent fail
      } finally {
        if (!cancelled) setLoadingFilterSecondary(false);
      }
    };
    fetchSecondary();
    return () => { cancelled = true; };
  }, [selectedFilterPrimary]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: T.paper, fontFamily: T.sans }}>
        <Header />
        <div style={{ flex: 1, padding: 32, display: "flex", justifyContent: "center", alignItems: "center", color: T.muted }}>
          Loading advisor data…
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
            <h2 style={{ color: T.ink, fontFamily: T.sans }}>Error Loading Advisor</h2>
            <p style={{ color: T.muted }}>{error}</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!advisorData) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: T.paper, fontFamily: T.sans }}>
        <Header />
        <div style={{ flex: 1, padding: 32, display: "flex", justifyContent: "center", alignItems: "center", color: T.muted }}>
          Advisor not found
        </div>
        <Footer />
      </div>
    );
  }

  const { Advisor, Portfolio_companies_count, Advisors_individuals, Advised_DA_sectors } =
    advisorData;

  const hq = `${Advisor._locations?.City || ""}, ${
    Advisor._locations?.State__Province__County || ""
  }, ${Advisor._locations?.Country || ""}`
    .replace(/^,\s*/, "")
    .replace(/,\s*$/, "");

  const coerceArray = <T,>(raw: unknown): T[] => {
    if (Array.isArray(raw)) return raw as T[];
    if (raw === null || raw === undefined) return [];
    if (typeof raw !== "string") return [];
    const trimmed = raw.trim();
    if (!trimmed || trimmed === "[]") return [];
    try {
      const normalized = trimmed.replace(/\\u0022/g, '"');
      const parsed = JSON.parse(normalized) as unknown;
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  };

  const safeEvents: AdvisorDealEvent[] = Array.isArray(corporateEvents)
    ? (corporateEvents as unknown as AdvisorDealEvent[])
    : [];

  const filteredEvents = (() => {
    if (selectedFilterPrimary.length === 0 && selectedFilterSecondary.length === 0) {
      return safeEvents;
    }
    return safeEvents.filter((event) => {
      const sectors = coerceArray<{
        id?: number;
        sector_name?: string;
        sector_importance?: string;
      }>(event.primary_sectors);
      if (selectedFilterPrimary.length > 0) {
        const primaryIds = sectors
          .filter((s) => String(s.sector_importance || "").toLowerCase().includes("primary"))
          .map((s) => s.id);
        if (!selectedFilterPrimary.some((id) => primaryIds.includes(id))) return false;
      }
      if (selectedFilterSecondary.length > 0) {
        const secondaryIds = sectors
          .filter((s) => !String(s.sector_importance || "").toLowerCase().includes("primary"))
          .map((s) => s.id);
        if (!selectedFilterSecondary.some((id) => secondaryIds.includes(id))) return false;
      }
      return true;
    });
  })();

  const managementCurrentPeople = (() => {
    if (rolesCurrent.length > 0) {
      return rolesCurrent.map((role) => ({
        name: role.advisor_individuals || role.Individual_text || "Unknown",
        role: role.job_titles_id?.map((jt) => jt.job_title).join(", ") || "",
        individualId: role.individuals_id,
      }));
    }
    if (advisorData.Advisors_individuals_current?.length) {
      return advisorData.Advisors_individuals_current.map((individual) => ({
        name: individual.advisor_individuals,
        role: individual.job_titles_id?.map((jt) => jt.job_title).join(", ") || "",
        individualId: individual.individuals_id,
      }));
    }
    if (Advisors_individuals?.length) {
      return Advisors_individuals.map((individual) => ({
        name: individual.advisor_individuals,
        role: individual.job_titles_id?.map((jt) => jt.job_title).join(", ") || "",
        individualId: individual.individuals_id,
      }));
    }
    return [];
  })();

  const managementPastPeople = (() => {
    if (rolesPast.length > 0) {
      return rolesPast.map((role) => ({
        name: role.advisor_individuals || role.Individual_text || "Unknown",
        role: role.job_titles_id?.map((jt) => jt.job_title).join(", ") || "",
        individualId: role.individuals_id,
      }));
    }
    if (advisorData.Advisors_individuals_past?.length) {
      return advisorData.Advisors_individuals_past.map((individual) => ({
        name: individual.advisor_individuals,
        role: individual.job_titles_id?.map((jt) => jt.job_title).join(", ") || "",
        individualId: individual.individuals_id,
      }));
    }
    return [];
  })();

  const hasManagement = managementCurrentPeople.length > 0 || managementPastPeople.length > 0;
  const currentHeadcount = resolveChartEmployeeCount(linkedInHistory);
  const headcountYoY = computeEmployeeYoYFromMonthly(linkedInHistory);
  const linkedinUrl = Advisor.linkedin_data?.LinkedIn_URL;

  const WIDE_ROW_START = 2;
  const dealsGridRow = WIDE_ROW_START;

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
    .advisor-detail-page { overflow-x: hidden; }
    .responsiveGrid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      max-width: 100%;
      align-items: stretch;
    }
    .responsiveGrid > * { min-width: 0; min-height: 0; }
    .advisor-grid-overview { grid-column: 1; grid-row: 1; display: flex; flex-direction: column; min-height: 0; align-self: stretch; }
    .advisor-grid-description { grid-column: 2; grid-row: 1; display: flex; flex-direction: column; min-height: 0; align-self: stretch; }
    .advisor-grid-headcount { grid-column: 3; grid-row: 1; display: flex; flex-direction: column; min-height: 0; align-self: stretch; }
    .advisor-grid-management { grid-column: 3; grid-row: 2; display: flex; flex-direction: column; min-height: 0; align-self: stretch; }
    .advisor-grid-deals { grid-column: 1 / span 2; grid-row: ${dealsGridRow}; display: flex; flex-direction: column; min-height: 0; align-self: stretch; overflow: hidden; max-width: 100%; }
    .advisor-grid-deals > * { min-width: 0; max-width: 100%; width: 100%; }
    @media (max-width: 768px) {
      .responsiveGrid { grid-template-columns: 1fr !important; gap: 12px !important; max-width: 100% !important; }
      .advisor-grid-overview,
      .advisor-grid-description,
      .advisor-grid-headcount,
      .advisor-grid-management,
      .advisor-grid-deals {
        grid-column: 1 / -1 !important;
        grid-row: auto !important;
        align-self: stretch !important;
      }
    }
  `;

  const reportMailTo = `mailto:asymmetrix@asymmetrixintelligence.com?subject=${encodeURIComponent(
    `Contribute Advisor Data – ${Advisor.name} (ID ${Advisor.id})`
  )}&body=${encodeURIComponent(
    "Please describe the data you would like to contribute for this advisor page."
  )}`;

  return (
    <div className="advisor-detail-page" style={styles.container}>
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
              logo={Advisor._linkedin_data_of_new_company?.linkedin_logo || ""}
              name={Advisor.name}
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
              {Advisor.name}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {Advisor?.id != null && Number.isFinite(Advisor.id) && (
              <FollowButton
                followKey="followed_advisors"
                entityId={Advisor.id}
                entityType="advisor"
                label="Advisor"
                icon={<BellIcon width={15} height={15} strokeWidth={2} aria-hidden />}
              />
            )}
            <button
              type="button"
              onClick={exportAdvisorPdf}
              disabled={exportingPdf || !advisorData?.Advisor}
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
                cursor: exportingPdf || !advisorData?.Advisor ? "not-allowed" : "pointer",
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
      </div>

      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="advisor-detail-content" style={styles.maxWidth}>
          <div style={styles.responsiveGrid} className="responsiveGrid">
            <div className="advisor-grid-overview">
              <AdvisorOverviewCard
                fillGridCell
                advisedDaSectors={(Advised_DA_sectors || [])
                  .filter((s) => s?.sector_name)
                  .map((s) => ({
                    name: s.sector_name,
                    href: s.id ? `/sector/${s.id}` : undefined,
                  }))}
                yearFounded={getAdvisorYearFoundedDisplay(Advisor)}
                website={Advisor.url}
                websiteLabel={
                  Advisor.url?.trim() ? formatWebsiteDisplayLabel(Advisor.url) : undefined
                }
                hq={hq || undefined}
                transactionsAdvised={Portfolio_companies_count}
              />
            </div>

            <div
              className="advisor-grid-description"
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
                text={Advisor.description ?? ""}
                expanded={isDescriptionExpanded}
                onToggleExpand={() => setIsDescriptionExpanded((e) => !e)}
                contentRef={descriptionRef}
                fillGridCell={!isDescriptionExpanded}
              />
            </div>

            <div className="advisor-grid-headcount">
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
                linkedinUrl={linkedinUrl}
              />
            </div>

            {hasManagement && (
              <div className="advisor-grid-management">
                <ManagementCard
                  fillGridCell
                  current={managementCurrentPeople}
                  past={managementPastPeople}
                  maxVisible={6}
                />
              </div>
            )}

            <div className="advisor-grid-deals">
              <LinkPanel fillGridCell className="advisor-deals-v3-card">
                <AdvisorDealsProfilePanel
                  events={filteredEvents}
                  totalCount={safeEvents.length}
                  filterPrimarySectors={filterPrimarySectors}
                  filterSecondarySectors={filterSecondarySectors}
                  selectedFilterPrimary={selectedFilterPrimary}
                  selectedFilterSecondary={selectedFilterSecondary}
                  loadingFilterPrimary={loadingFilterPrimary}
                  loadingFilterSecondary={loadingFilterSecondary}
                  onAddPrimaryFilter={(id) => {
                    if (!selectedFilterPrimary.includes(id)) {
                      setSelectedFilterPrimary((prev) => [...prev, id]);
                    }
                  }}
                  onRemovePrimaryFilter={(id) => {
                    setSelectedFilterPrimary((prev) => prev.filter((x) => x !== id));
                  }}
                  onAddSecondaryFilter={(id) => {
                    if (!selectedFilterSecondary.includes(id)) {
                      setSelectedFilterSecondary((prev) => [...prev, id]);
                    }
                  }}
                  onRemoveSecondaryFilter={(id) => {
                    setSelectedFilterSecondary((prev) => prev.filter((x) => x !== id));
                  }}
                  onClearFilters={() => {
                    setSelectedFilterPrimary([]);
                    setSelectedFilterSecondary([]);
                  }}
                  onExportCsv={exportDealsToCsv}
                  exportingDeals={exportingDeals}
                  maxInitial={10}
                />
              </LinkPanel>
            </div>
          </div>
        </div>
        <style dangerouslySetInnerHTML={{ __html: responsiveCss }} />
      </main>

      <Footer />
    </div>
  );
}
