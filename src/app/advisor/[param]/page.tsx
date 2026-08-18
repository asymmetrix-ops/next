"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useRef, useMemo } from "react";
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
import { normalizeAdvisorDealEvent } from "@/lib/normalizeAdvisorDealEvent";
import { buildCorporateEventsBrowseAllHref } from "@/lib/corporateEventsFilterPayload";
import {
  formatDate,
  getAdvisorYearFoundedDisplay,
} from "../../../utils/advisorHelpers";
import { formatCorporateEventEnterpriseValue } from "@/lib/corporateEventAmountDisplay";
import { usePlatformCurrency } from "@/components/providers/PlatformCurrencyProvider";
import { HeadcountCard } from "@/components/redesign/HeadcountCard";
import { DescriptionCard } from "@/components/redesign/DescriptionCard";
import { LinkPanel, T } from "@/components/redesign/primitives";
import { normalizeLinkedInProfileUrl } from "@/lib/linkedinUrl";
import {
  fetchCompanyLinkedIn,
  formatLinkedInEmployeeCountDate,
  mapLinkedInHistoryToTimeSeries,
  resolveLinkedInDisplayEmployeeCount,
  type CompanyLinkedInResponse,
  type EmployeeTimeSeriesPoint,
} from "@/lib/companyLinkedIn";
import { parseLinkedInGrowthPctValue } from "@/components/subsidiaries/SubsidiariesProfilePanel";
import { AdvisorOverviewCard } from "@/components/advisors/AdvisorOverviewCard";
import {
  AdvisorPeopleCard,
  type AdvisorPerson,
} from "@/components/advisors/AdvisorPeopleCard";
import {
  formatJobTitlesWithLookup,
  getIndividualLinkedInUrl,
} from "@/utils/individualHelpers";
import {
  AdvisorDealsProfilePanel,
  type AdvisorDealEvent,
} from "@/components/advisors/AdvisorDealsProfilePanel";
import type {
  Advisor,
  AdvisorIndividual,
  AdvisorRoleRef,
  AdvisorResponse,
} from "../../../types/advisor";

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

function computeEmployeeYoYFromMonthly(data: EmployeeTimeSeriesPoint[]): string | null {
  if (!Array.isArray(data) || data.length < 2) return null;
  const sorted = [...data].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const latest = sorted[sorted.length - 1];
  const latestCount = latest?.employees_count;
  if (typeof latestCount !== "number" || latestCount <= 0) return null;
  const latestT = new Date(latest.date).getTime();
  const yearMs = 365 * 86_400_000;
  let best: EmployeeTimeSeriesPoint | null = null;
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

function resolveChartEmployeeCount(data: EmployeeTimeSeriesPoint[]): number {
  if (!Array.isArray(data) || data.length === 0) return 0;
  const numericData = data.map((e) => e.employees_count);
  const hasAnyNonZero = numericData.some((v) => v > 0);
  const filtered = hasAnyNonZero ? numericData.filter((v) => v > 0) : numericData;
  const lastNonZero = filtered.length > 0 ? filtered[filtered.length - 1]! : 0;
  const last = numericData[numericData.length - 1] ?? 0;
  return last > 0 ? last : lastNonZero;
}

const DEALS_PREVIEW_COUNT = 3;

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

function coercePositiveInt(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function buildJobTitleLookup(data: unknown): Map<number, string> {
  const map = new Map<number, string>();
  if (!Array.isArray(data)) return map;

  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const id = coercePositiveInt(record.id);
    const title =
      typeof record.job_title === "string"
        ? record.job_title.trim()
        : typeof record.Job_Title === "string"
        ? record.Job_Title.trim()
        : "";
    if (id != null && title) map.set(id, title);
  }

  return map;
}

async function fetchAdvisorJobTitleLookup(): Promise<Map<number, string>> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("asymmetrix_auth_token")
      : null;
  if (!token) return new Map();

  const endpoints = [
    "https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob/get_all_job_titles",
    "https://xdil-abvj-o7rq.e2.xano.io/api:8Bv5PK4I/job_titles_list",
  ];

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) continue;
      const data = await response.json();
      const lookup = buildJobTitleLookup(data);
      if (lookup.size > 0) return lookup;
    } catch {
      // try next endpoint
    }
  }

  return new Map();
}

function isPastAdvisorIndividual(status: unknown): boolean {
  return String(status ?? "").trim().toLowerCase() === "past";
}

function mapAdvisorIndividualToPerson(
  individual: AdvisorIndividual,
  jobTitleById: Map<number, string>
): AdvisorPerson {
  return {
    id: individual.id,
    name: individual.advisor_individuals,
    role: formatJobTitlesWithLookup(
      individual.job_titles_id,
      jobTitleById,
      individual.job_titles
    ),
    individualId: individual.individuals_id,
    linkedinUrl: getIndividualLinkedInUrl(individual),
  };
}

function resolveAdvisorIndividualsLists(advisorData: AdvisorResponse): {
  current: AdvisorIndividual[];
  past: AdvisorIndividual[];
} {
  if (
    advisorData.Advisors_individuals_current?.length ||
    advisorData.Advisors_individuals_past?.length
  ) {
    return {
      current: advisorData.Advisors_individuals_current ?? [],
      past: advisorData.Advisors_individuals_past ?? [],
    };
  }

  const current: AdvisorIndividual[] = [];
  const past: AdvisorIndividual[] = [];

  for (const individual of advisorData.Advisors_individuals ?? []) {
    if (isPastAdvisorIndividual(individual.Status)) {
      past.push(individual);
    } else {
      current.push(individual);
    }
  }

  return { current, past };
}

function buildAdvisorPeopleLists(
  advisorData: AdvisorResponse,
  jobTitleById: Map<number, string>
): { current: AdvisorPerson[]; past: AdvisorPerson[] } {
  const { current, past } = resolveAdvisorIndividualsLists(advisorData);

  return {
    current: current.map((individual) =>
      mapAdvisorIndividualToPerson(individual, jobTitleById)
    ),
    past: past.map((individual) =>
      mapAdvisorIndividualToPerson(individual, jobTitleById)
    ),
  };
}

export default function AdvisorProfilePage() {
  const params = useParams();
  const advisorId = parseInt(params.param as string);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [companyLinkedIn, setCompanyLinkedIn] =
    useState<CompanyLinkedInResponse | null>(null);
  const [jobTitleById, setJobTitleById] = useState<Map<number, string>>(
    () => new Map()
  );
  const [dealsPage, setDealsPage] = useState(1);
  const { currencyId: preferredCurrencyId } = usePlatformCurrency();

  const { advisorData, corporateEvents, loading, error } = useAdvisorProfile({
    advisorId,
  });

  // Removed: handleAdvisorClick (replaced with createClickableElement in list)

  // Replaced corporate event navigation with right-clickable links via createClickableElement

  // Removed unused handler; replaced by mailto link button

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

  const buildAdvisorPageSnapshot = () => {
    const safeEvents: AdvisorDealEvent[] = Array.isArray(corporateEvents)
      ? corporateEvents.map((event) => normalizeAdvisorDealEvent(event))
      : [];

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

    const normalizedDeals = safeEvents.map((event) => {
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
      const evFormatted = formatCorporateEventEnterpriseValue(
        {
          ev_display: event.ev_display,
          currency_name: currency,
          ev_data: {
            enterprise_value_m: value,
            _currency: currency ? { Currency: currency } : undefined,
          },
        },
        "-"
      );

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
          ...(event.ev_display ? { ev_display: event.ev_display } : {}),
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
      if (!advisorData) {
        return {
          current: [] as Array<{
            id: number;
            individual_id: number;
            name: string;
            job_titles: string[];
            linkedin_url: string | null;
          }>,
          past: [] as Array<{
            id: number;
            individual_id: number;
            name: string;
            job_titles: string[];
            linkedin_url: string | null;
          }>,
        };
      }

      const { current, past } = buildAdvisorPeopleLists(advisorData, jobTitleById);

      const toSnapshotPerson = (person: AdvisorPerson) => ({
        id: person.id ?? 0,
        individual_id: person.individualId ?? 0,
        name: person.name,
        job_titles: person.role ? person.role.split(", ") : [],
        linkedin_url: person.linkedinUrl ?? null,
      });

      return {
        current: current.map(toSnapshotPerson),
        past: past.map(toSnapshotPerson),
      };
    };

    const { current, past } = buildPeopleLists();

    return {
      schema_version: "1.0.0",
      captured_at: new Date().toISOString(),
      source: {
        app: "asymmetrix-nextjs",
        environment: env,
        page_path: pagePath,
        page_url: pageUrl,
        advisor_id: advisorId,
        preferred_currency_id: preferredCurrencyId,
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
          logo_base64_jpeg:
            companyLinkedIn?.profile?.logo ||
            linkedInNew?.linkedin_logo ||
            linkedInLegacy?.linkedin_logo ||
            null,
          employee_count:
            typeof companyLinkedIn?.profile?.employee_count === "number"
              ? companyLinkedIn.profile.employee_count
              : typeof linkedInNew?.linkedin_employee === "number"
              ? linkedInNew.linkedin_employee
              : typeof linkedInLegacy?.LinkedIn_Employee === "number"
              ? linkedInLegacy.LinkedIn_Employee
              : null,
          employee_count_date:
            companyLinkedIn?.profile?.employee_count_date ||
            linkedInNew?.linkedin_emp_date ||
            linkedInLegacy?.LinkedIn_Emp__Date ||
            null,
          linkedin_url:
            companyLinkedIn?.profile?.linkedin_url ||
            linkedInLegacy?.LinkedIn_URL ||
            null,
        },
        portfolio_companies_count: advisorData?.Portfolio_companies_count ?? 0,
      },
      deals_advised: {
        total_count: safeEvents.length,
        filtered_count: safeEvents.length,
        active_filters: {
          primary_sector_ids: [],
          secondary_sector_ids: [],
        },
        items: normalizedDeals,
      },
      linkedin_history: {
        monthly_employee_counts: (
          companyLinkedIn?.employee_history &&
          companyLinkedIn.employee_history.length > 0
            ? mapLinkedInHistoryToTimeSeries(companyLinkedIn.employee_history)
            : []
        ).map((x) => ({
          date: x.date,
          employees_count: x.employees_count,
        })),
      },
      advisor_people: {
        current,
        past,
        sources: {
          preferred: "advisor_profile_individuals",
        },
      },
      deal_filter_option_lists: {
        primary_sectors: [],
        secondary_sectors: [],
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

  useEffect(() => {
    void (async () => {
      try {
        const lookup = await fetchAdvisorJobTitleLookup();
        if (lookup.size > 0) setJobTitleById(lookup);
      } catch (err) {
        console.warn("Failed to fetch job titles for advisor people:", err);
      }
    })();
  }, []);

  useEffect(() => {
    if (!advisorId) return;

    setCompanyLinkedIn(null);
    void (async () => {
      try {
        const token = localStorage.getItem("asymmetrix_auth_token");
        const data = await fetchCompanyLinkedIn(advisorId, token);
        setCompanyLinkedIn(data);
      } catch (err) {
        console.warn("Failed to fetch advisor LinkedIn data:", err);
      }
    })();
  }, [advisorId]);

  // Update page title when advisor data is loaded
  useEffect(() => {
    if (advisorData?.Advisor?.name && typeof document !== "undefined") {
      document.title = `Asymmetrix – ${advisorData.Advisor.name}`;
    }
  }, [advisorData?.Advisor?.name]);

  useEffect(() => {
    setDealsPage(1);
  }, [advisorId]);

  const safeEvents: AdvisorDealEvent[] = useMemo(
    () =>
      Array.isArray(corporateEvents)
        ? corporateEvents.map((event) => normalizeAdvisorDealEvent(event))
        : [],
    [corporateEvents]
  );

  const sortedDeals = useMemo(
    () =>
      [...safeEvents].sort((a, b) => {
        const ta = a.announcement_date
          ? new Date(a.announcement_date).getTime()
          : 0;
        const tb = b.announcement_date
          ? new Date(b.announcement_date).getTime()
          : 0;
        return tb - ta;
      }),
    [safeEvents]
  );

  const dealsTotal = sortedDeals.length;
  const dealsTotalPages =
    dealsTotal > 0 ? Math.ceil(dealsTotal / DEALS_PREVIEW_COUNT) : 0;
  const dealsShowingFrom =
    dealsTotal > 0 ? (dealsPage - 1) * DEALS_PREVIEW_COUNT + 1 : 0;
  const dealsShowingTo =
    dealsTotal > 0
      ? Math.min(dealsPage * DEALS_PREVIEW_COUNT, dealsTotal)
      : 0;
  const displayedDeals = useMemo(() => {
    const start = (dealsPage - 1) * DEALS_PREVIEW_COUNT;
    return sortedDeals.slice(start, start + DEALS_PREVIEW_COUNT);
  }, [sortedDeals, dealsPage]);
  const canDealsPrev = dealsTotal > 0 && dealsPage > 1;
  const canDealsNext = dealsTotal > 0 && dealsPage < dealsTotalPages;

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

  const { Advisor, Portfolio_companies_count } = advisorData;
  const { current: peopleCurrent, past: peoplePast } = buildAdvisorPeopleLists(
    advisorData,
    jobTitleById
  );

  const extractAdvisorFocus = (advisor: Advisor): string[] => {
    const raw = advisor.primary_business_focus_id;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item) => {
        const focus = item?.business_focus;
        return typeof focus === "string" ? focus.trim() : "";
      })
      .filter(Boolean);
  };

  const extractAdvisorType = (advisor: Advisor): string | null => {
    const roleLists: AdvisorRoleRef[][] = [];
    if (Array.isArray(advisor._advisor_roles)) roleLists.push(advisor._advisor_roles);
    if (Array.isArray(advisor.advisor_roles)) roleLists.push(advisor.advisor_roles);

    for (const roles of roleLists) {
      for (const role of roles) {
        const label =
          role.role_name?.trim() ||
          role.advisor_role?.trim() ||
          role.name?.trim() ||
          role.counterparty_status?.trim();
        if (label) return label;
      }
    }

    const focus = extractAdvisorFocus(advisor);
    return focus[0] ?? null;
  };

  const extractAdvisorOwnership = (advisor: Advisor): string | null => {
    return advisor._ownership_type?.ownership?.trim() || null;
  };

  const extractAdvisorTicker = (advisor: Advisor): string | null => {
    const ticker = advisor.ticker ?? advisor.Ticker;
    return typeof ticker === "string" && ticker.trim() ? ticker.trim() : null;
  };

  const extractAdvisorStatus = (advisor: Advisor): string => {
    const lifecycle = advisor.Lifecycle_stage?.Lifecycle_Stage?.trim();
    if (lifecycle) return lifecycle;
    const status = advisor.status?.trim();
    if (status) return status;
    return "Active";
  };

  const hq = `${Advisor._locations?.City || ""}, ${
    Advisor._locations?.State__Province__County || ""
  }, ${Advisor._locations?.Country || ""}`
    .replace(/^,\s*/, "")
    .replace(/,\s*$/, "");

  const employeeData =
    companyLinkedIn?.employee_history && companyLinkedIn.employee_history.length > 0
      ? mapLinkedInHistoryToTimeSeries(companyLinkedIn.employee_history)
      : [];
  const currentHeadcount = resolveLinkedInDisplayEmployeeCount(
    companyLinkedIn,
    resolveChartEmployeeCount(employeeData) ||
      Advisor._linkedin_data_of_new_company?.linkedin_employee ||
      Advisor.linkedin_data?.LinkedIn_Employee ||
      0
  );
  const headcountYoY = (() => {
    const liGrowth = parseLinkedInGrowthPctValue(companyLinkedIn?.growth_1y_pct);
    if (liGrowth !== null) {
      const rounded = Math.round(liGrowth * 10) / 10;
      return `${rounded >= 0 ? "+" : ""}${rounded}% YoY`;
    }
    return computeEmployeeYoYFromMonthly(employeeData);
  })();
  const linkedinUrl = normalizeLinkedInProfileUrl(
    companyLinkedIn?.profile?.linkedin_url ?? Advisor.linkedin_data?.LinkedIn_URL
  );
  const employeeCountAsOf =
    formatLinkedInEmployeeCountDate(companyLinkedIn?.profile?.employee_count_date) ??
    (() => {
      const latest = employeeData[employeeData.length - 1];
      if (!latest?.date) return undefined;
      return formatLinkedInEmployeeCountDate(latest.date);
    })();

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
    .advisor-grid-people { grid-column: 3; grid-row: ${dealsGridRow}; display: flex; flex-direction: column; min-height: 0; align-self: stretch; }
    .advisor-grid-deals { grid-column: 1 / span 2; grid-row: ${dealsGridRow}; display: flex; flex-direction: column; min-height: 0; align-self: stretch; overflow: hidden; max-width: 100%; }
    .advisor-grid-deals > * { min-width: 0; max-width: 100%; width: 100%; }
    .advisor-grid-people > * { min-width: 0; max-width: 100%; width: 100%; }
    @media (max-width: 768px) {
      .responsiveGrid { grid-template-columns: 1fr !important; gap: 12px !important; max-width: 100% !important; }
      .advisor-grid-overview,
      .advisor-grid-description,
      .advisor-grid-headcount,
      .advisor-grid-people,
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
              logo={
                companyLinkedIn?.profile?.logo ||
                Advisor._linkedin_data_of_new_company?.linkedin_logo ||
                ""
              }
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
                type={extractAdvisorType(Advisor)}
                focus={extractAdvisorFocus(Advisor)}
                yearFounded={getAdvisorYearFoundedDisplay(Advisor)}
                website={Advisor.url}
                websiteLabel={
                  Advisor.url?.trim() ? formatWebsiteDisplayLabel(Advisor.url) : undefined
                }
                hq={hq || undefined}
                linkedinUrl={linkedinUrl}
                ownership={extractAdvisorOwnership(Advisor)}
                ticker={extractAdvisorTicker(Advisor)}
                status={extractAdvisorStatus(Advisor)}
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

            {employeeData.length > 0 && (
            <div className="advisor-grid-headcount">
              <HeadcountCard
                fillGridCell
                data={employeeData.map((e) => e.employees_count)}
                dates={employeeData.map((e) => e.date)}
                count={currentHeadcount}
                yoyLabel={headcountYoY || undefined}
                asOf={employeeCountAsOf}
                linkedinUrl={linkedinUrl}
              />
            </div>
            )}

            <div className="advisor-grid-deals">
              <LinkPanel fillGridCell className="advisor-deals-v3-card">
                <AdvisorDealsProfilePanel
                  variant="summary"
                  events={displayedDeals}
                  totalCount={dealsTotal}
                  rangeStart={dealsShowingFrom}
                  rangeEnd={dealsShowingTo}
                  canPrev={canDealsPrev}
                  canNext={canDealsNext}
                  onPrev={() => {
                    if (dealsPage > 1) setDealsPage(dealsPage - 1);
                  }}
                  onNext={() => {
                    if (dealsPage < dealsTotalPages) setDealsPage(dealsPage + 1);
                  }}
                  browseAllHref={buildCorporateEventsBrowseAllHref({
                    advisorId,
                  })}
                  fillGridCell
                />
              </LinkPanel>
            </div>

            <div className="advisor-grid-people">
              <AdvisorPeopleCard
                fillGridCell
                current={peopleCurrent}
                past={peoplePast}
              />
            </div>
          </div>
        </div>
        <style dangerouslySetInnerHTML={{ __html: responsiveCss }} />
      </main>

      <Footer />
    </div>
  );
}
