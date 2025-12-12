"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { dashboardApiService } from "@/lib/dashboardApi";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
// import { useRightClick } from "@/hooks/useRightClick";

// Types for dashboard data
interface AsymmetrixData {
  label: string;
  value: string;
  icon: string;
  color: string;
}

interface CorporateEvent {
  id?: number;
  corporate_event_id?: number;
  description: string;
  announcement_date?: string;
  // New home events endpoint fields
  date?: string;
  type?: string;
  target?: unknown;
  investors?: unknown;
  amount?: unknown;
  primary?: unknown;
  secondary?: unknown;
  buyers?: unknown;
  sales?: unknown;
  all_targets?: unknown;
  deal_status?: string;
  created_at?: number;
  Target_Counterparty?: {
    new_company?: {
      name: string;
      _locations?: {
        Country: string;
      };
      _sectors_objects?: {
        sectors_id: Array<{
          sector_name: string;
          Sector_importance: string;
          // When a sector is Secondary, API may include related Primary sectors here
          Related_to_primary_sectors?: Array<
            | {
                id: number;
                sector_name: string;
                Sector_importance: string;
              }
            | {
                secondary_sectors?: {
                  id?: number;
                  sector_name?: string;
                  Sector_importance?: string;
                };
              }
          >;
        }>;
      };
    };
  };
  deal_type?: string;
  investment_data?: {
    investment_amount_m?: string;
    currrency?: {
      Currency: string;
    };
  };
  ev_data?: {
    enterprise_value_m?: string;
    Currency?: string;
  };
  Other_Counterparties_of_Corporate_Event?: Array<{
    _new_company?: {
      name: string;
    };
  }>;
  Advisors_of_Corporate_Event?: Array<{
    _new_company?: {
      name: string;
    };
  }>;
}

interface InsightArticle {
  id: number;
  Headline: string;
  Strapline?: string;
  Publication_Date?: string;
  created_at?: number;
  // Content type fields may arrive in different shapes/keys
  Content_Type?: string;
  content_type?: string;
  Content?: { Content_type?: string; Content_Type?: string };
  keywords?: string[];
  related_documents?: Array<{
    url: string;
  }>;
  image?: string;
  companies_mentioned?: Array<{
    id: number;
    name: string;
    locations_id: number;
    _locations: {
      Country: string;
    };
    _is_that_investor: boolean;
  }>;
}

// Removed NewCompany interface along with the related UI section

export default function HomeUserPage() {
  const router = useRouter();
  const {
    isAuthenticated,
    logout,
    loading: authLoading,
    isTrialActive,
    trialDaysLeft,
  } = useAuth();
  // Right-click handled via native anchors now

  // Helper function to format dates consistently
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not Available";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  // Resolve corporate event id from inconsistent API shapes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getCorporateEventId = (ev: any): number | undefined => {
    const possible = (ev?.id ??
      ev?.event_id ??
      ev?.events_id ??
      ev?.corporate_event_id ??
      ev?.corporate_events_id ??
      ev?.CorporateEvent_id ??
      ev?.Corporate_Events_id) as unknown;
    const n = Number(possible);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  // (removed unused parseBraceList helper)

  // Safe JSON.parse for stringified objects like '{"Type":"Investment"}'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safeParseJson = <T = any,>(value?: unknown): T | null => {
    if (!value || typeof value !== "string") return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  };

  // Parse strings that look like "{A,B,\"C D\"}" into ["A","B","C D"]
  const parseBraceList = (value?: unknown): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(String).filter(Boolean);
    if (typeof value === "object") {
      // Sometimes APIs accidentally return an object; best-effort flatten
      try {
        return Object.values(value as Record<string, unknown>)
          .map(String)
          .map((s) => s.trim())
          .filter(Boolean);
      } catch {
        return [];
      }
    }
    if (typeof value !== "string") return [];

    const raw = value.trim();
    if (!raw || raw === "{}" || raw === "{ }") return [];

    // Try JSON first (e.g. '["A","B"]' or '{"a":"A"}')
    const parsed = safeParseJson<unknown>(raw);
    if (Array.isArray(parsed))
      return (parsed as unknown[]).map(String).map((s) => s.trim()).filter(Boolean);
    if (parsed && typeof parsed === "object") {
      return Object.values(parsed as Record<string, unknown>)
        .map(String)
        .map((s) => s.trim())
        .filter(Boolean);
    }

    // Strip outer braces if present
    const stripped = raw.replace(/^\{/, "").replace(/\}$/, "").trim();
    if (!stripped) return [];
    return stripped
      .split(",")
      .map((s) => s.trim())
      .map((s) => s.replace(/^"(.*)"$/, "$1"))
      .filter(Boolean);
  };

  type SectorRef = { id: number; name: string };
  const parseSectorRefs = (value?: unknown): SectorRef[] => {
    if (!value) return [];
    if (Array.isArray(value)) {
      return (value as unknown[])
        .map((v) => v as Partial<SectorRef>)
        .filter(
          (v): v is SectorRef =>
            typeof v?.id === "number" &&
            Number.isFinite(v.id) &&
            v.id > 0 &&
            typeof v?.name === "string" &&
            Boolean(v.name.trim())
        )
        .map((v) => ({ id: v.id, name: v.name.trim() }));
    }
    if (typeof value === "string") {
      const parsed = safeParseJson<unknown>(value);
      if (Array.isArray(parsed)) return parseSectorRefs(parsed);
      return [];
    }
    return [];
  };

  // Normalize entity link based on new API flags (route/path/entity_type)
  // Prefer ID-based routes; fall back to path when ID or route is missing/unknown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalizeEntityHref = (entity: any | null | undefined): string => {
    if (!entity || typeof entity !== "object") return "";
    const id = Number((entity as { id?: unknown }).id);
    const route = String(
      ((entity as { route?: unknown }).route ||
        (entity as { entity_type?: unknown }).entity_type ||
        "company") as string
    )
      .toLowerCase()
      .trim();
    if (Number.isFinite(id) && id > 0) {
      // Our app uses plural investors route
      if (route === "investor" || route === "investors")
        return `/investors/${id}`;
      return `/company/${id}`;
    }
    // Fallback to provided path (normalize investor singular to plural)
    const rawPath = String((entity as { path?: unknown }).path || "").trim();
    if (rawPath) {
      return rawPath.replace(/^\/investor\//, "/investors/");
    }
    return "";
  };

  const dedupeById = (entities: EntityRef[]): EntityRef[] => {
    const seenIds = new Set<number>();
    const result: EntityRef[] = [];
    for (const e of entities) {
      const id = Number(e?.id);
      if (Number.isFinite(id) && id > 0) {
        if (seenIds.has(id)) continue;
        seenIds.add(id);
      }
      result.push(e);
    }
    return result;
  };

  type EntityRef = {
    id?: number;
    name?: string;
    path?: string;
    route?: string;
    entity_type?: string;
  };

  // Parse list of entities from new API fields which may be JSON strings or arrays
  const parseEntityArray = <T = unknown,>(value?: unknown): T[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value as unknown[] as T[];
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? (parsed as T[]) : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  // Helper function to normalize primary sector(s) from either old or new shape
  const getRelatedPrimarySectors = (
    secondarySectorsOrObjects:
      | { sector_name: string }[]
      | {
          sector_name: string;
          Sector_importance: string;
          Related_to_primary_sectors?: Array<{
            secondary_sectors?: { sector_name?: string };
          }>;
        }[]
      | undefined
  ) => {
    if (!secondarySectorsOrObjects || secondarySectorsOrObjects.length === 0)
      return "Not available";

    // If new endpoint structure (contains Sector_importance), derive primaries from mapping
    if (
      typeof secondarySectorsOrObjects[0] === "object" &&
      (secondarySectorsOrObjects[0] as { Sector_importance?: string })
        .Sector_importance !== undefined
    ) {
      const sectors = secondarySectorsOrObjects as Array<{
        sector_name: string;
        Sector_importance: string;
        Related_to_primary_sectors?: Array<{
          secondary_sectors?: { sector_name?: string };
        }>;
      }>;
      const explicitPrimaries = sectors
        .filter((s) => s && s.Sector_importance === "Primary")
        .map((s) => s.sector_name)
        .filter(Boolean);
      const relatedFromSecondaries = sectors
        .filter((s) => s && s.Sector_importance !== "Primary")
        .flatMap((s) =>
          Array.isArray(s.Related_to_primary_sectors)
            ? (s.Related_to_primary_sectors.map(
                (r) =>
                  // Support both shapes: { sector_name } and { secondary_sectors: { sector_name } }
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (r as any)?.secondary_sectors?.sector_name ??
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (r as any)?.sector_name
              ).filter(Boolean) as string[])
            : []
        );
      const combined = Array.from(
        new Set([...(explicitPrimaries as string[]), ...relatedFromSecondaries])
      );
      return combined.length > 0 ? combined.join(", ") : "Not available";
    }

    // Otherwise old shape (array of secondary names) – use fallback mapping
    const secondarySectors = secondarySectorsOrObjects as {
      sector_name: string;
    }[];
    const sectorMapping: { [key: string]: string } = {
      Crypto: "Web 3",
      Blockchain: "Web 3",
      DeFi: "Web 3",
      NFT: "Web 3",
      Web3: "Web 3",
      "Business Intelligence": "Data Analytics",
      "Data Science": "Data Analytics",
      "Machine Learning": "Data Analytics",
      AI: "Data Analytics",
      Analytics: "Data Analytics",
      "Big Data": "Data Analytics",
      "Cloud Computing": "Infrastructure",
      SaaS: "Software",
      Cybersecurity: "Security",
      FinTech: "Financial Services",
      InsurTech: "Financial Services",
      PropTech: "Real Estate",
      HealthTech: "Healthcare",
      EdTech: "Education",
      LegalTech: "Legal",
      HRTech: "Human Resources",
      MarTech: "Marketing",
      AdTech: "Advertising",
      Gaming: "Entertainment",
      "E-commerce": "Retail",
      Logistics: "Supply Chain",
      IoT: "Internet of Things",
      Robotics: "Automation",
    };
    const relatedPrimary = secondarySectors
      .map((s) => sectorMapping[s.sector_name] || s.sector_name)
      .filter((value, index, self) => self.indexOf(value) === index);
    return relatedPrimary.join(", ");
  };

  // Derive primary sector(s) for an event's target from provided structure
  const getEventPrimarySectors = (event: CorporateEvent): string => {
    const sectors =
      event.Target_Counterparty?.new_company?._sectors_objects?.sectors_id ||
      [];

    // 1) Any explicitly marked Primary sectors
    const explicitPrimary = sectors
      .filter((s) => s && s.Sector_importance === "Primary")
      .map((s) => s.sector_name)
      .filter(Boolean);

    // 2) For Secondary sectors, collect their related primary sectors (from API)
    const relatedFromSecondaries = sectors
      .filter((s) => s && s.Sector_importance !== "Primary")
      .flatMap((s) =>
        Array.isArray(s.Related_to_primary_sectors)
          ? (s.Related_to_primary_sectors.map(
              (p) =>
                // Support both shapes: { sector_name } and { secondary_sectors: { sector_name } }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (p as any)?.secondary_sectors?.sector_name ??
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (p as any)?.sector_name
            ).filter(Boolean) as string[])
          : []
      );

    const combined = Array.from(
      new Set([...explicitPrimary, ...relatedFromSecondaries])
    );
    if (combined.length > 0) return combined.join(", ");

    // 3) Fallback: map secondary names via heuristic mapping (e.g., Crypto -> Web 3)
    const fallbackSecondaries = sectors
      .filter((s) => s && s.Sector_importance !== "Primary")
      .map((s) => ({ sector_name: s.sector_name }));
    const mapped = getRelatedPrimarySectors(fallbackSecondaries);
    return mapped || "Not Available";
  };

  // Corporate Event navigation handler with graceful fallback to search
  const handleCorporateEventClick = useCallback(
    (eventId?: number, description?: string) => {
      if (eventId) {
        router.push(`/corporate-event/${eventId}`);
        return;
      }
      if (description) {
        router.push(
          `/corporate-events?search=${encodeURIComponent(description)}`
        );
      }
    },
    [router]
  );

  const [isLoading, setIsLoading] = useState(true);
  const [asymmetrixData, setAsymmetrixData] = useState<AsymmetrixData[]>([]);
  const [corporateEvents, setCorporateEvents] = useState<CorporateEvent[]>([]);
  const [insightsArticles, setInsightsArticles] = useState<InsightArticle[]>(
    []
  );

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch all dashboard data in parallel using exact endpoints from Vue app
      const [
        companiesCountResponse,
        eventsCountResponse,
        individualsCountResponse,
        sectorsCountResponse,
        advisorsCountResponse,
        investorsResponse,
        eventsResponse,
        insightsResponse,
      ] = await Promise.allSettled([
        dashboardApiService.getHeroScreenStatisticCompanies(),
        dashboardApiService.getHeroScreenStatisticEventsCount(),
        dashboardApiService.getAllIndividualsCount(),
        dashboardApiService.getHeroScreenStatisticSectors(),
        dashboardApiService.getHeroScreenStatisticAdvisorsCount(),
        dashboardApiService.getHeroScreenStatisticInvestors(),
        dashboardApiService.getCorporateEventsForHomePage(),
        dashboardApiService.getAllContentArticlesHome(),
      ]);

      // Handle asymmetrix data - build from individual statistics
      const statsData: AsymmetrixData[] = [];

      // Companies count
      if (companiesCountResponse.status === "fulfilled") {
        // Raw number response
        let companiesCount: number = 0;
        const responseValue = companiesCountResponse.value as unknown as number;
        companiesCount = responseValue || 0;
        if (companiesCount) {
          statsData.push({
            label: "Companies",
            value: companiesCount.toString(),
            icon: "📊",
            color: "blue",
          });
        }
      }

      // Events count
      if (eventsCountResponse.status === "fulfilled") {
        let eventsCount: number = 0;
        const responseValue = eventsCountResponse.value as unknown as Record<
          string,
          unknown
        >;

        if (responseValue && typeof responseValue === "object") {
          eventsCount = (responseValue.Corporate_Events_count as number) || 0;
        }

        if (eventsCount) {
          statsData.push({
            label: "Corporate Events",
            value: eventsCount.toString(),
            icon: "📈",
            color: "purple",
          });
        }
      }

      // Individuals count
      if (individualsCountResponse.status === "fulfilled") {
        let individualsCount: number = 0;
        const responseValue =
          individualsCountResponse.value as unknown as Record<string, unknown>;

        if (responseValue && typeof responseValue === "object") {
          individualsCount = (responseValue.count as number) || 0;
        }

        if (individualsCount) {
          statsData.push({
            label: "Individuals",
            value: individualsCount.toString(),
            icon: "👤",
            color: "green",
          });
        }
      }

      // Sectors count
      if (sectorsCountResponse.status === "fulfilled") {
        let primarySectorsCount: number = 0;
        let secondarySectorsCount: number = 0;
        const responseValue = sectorsCountResponse.value as unknown as Record<
          string,
          unknown
        >;

        if (responseValue && typeof responseValue === "object") {
          primarySectorsCount = (responseValue.primarySectors as number) || 0;
          secondarySectorsCount =
            (responseValue.secondarySectors as number) || 0;
        }

        if (primarySectorsCount) {
          statsData.push({
            label: "Primary Sectors",
            value: primarySectorsCount.toString(),
            icon: "🎯",
            color: "orange",
          });
        }

        if (secondarySectorsCount) {
          statsData.push({
            label: "Secondary Sectors",
            value: secondarySectorsCount.toString(),
            icon: "🎯",
            color: "orange",
          });
        }
      }

      // Investors (PE and VC)
      if (investorsResponse.status === "fulfilled") {
        let peInvestors: number = 0;
        let vcInvestors: number = 0;
        const responseValue = investorsResponse.value as unknown as Record<
          string,
          unknown
        >;

        if (responseValue && typeof responseValue === "object") {
          peInvestors = (responseValue.peInvestors as number) || 0;
          vcInvestors = (responseValue.vcInvestors as number) || 0;
        }

        if (peInvestors) {
          statsData.push({
            label: "PE investors",
            value: peInvestors.toString(),
            icon: "💰",
            color: "green",
          });
        }

        if (vcInvestors) {
          statsData.push({
            label: "VC investors",
            value: vcInvestors.toString(),
            icon: "💎",
            color: "gold",
          });
        }
      }

      // Advisors count
      if (advisorsCountResponse.status === "fulfilled") {
        let advisorsCount: number = 0;
        const responseValue = advisorsCountResponse.value as unknown as Record<
          string,
          unknown
        >;

        if (responseValue && typeof responseValue === "object") {
          advisorsCount =
            (responseValue.Advisorc_companies_count as number) || 0;
        }

        if (advisorsCount) {
          statsData.push({
            label: "Advisors",
            value: advisorsCount.toString(),
            icon: "👨‍💼",
            color: "blue",
          });
        }
      }

      setAsymmetrixData(statsData);

      // Handle corporate events
      if (eventsResponse.status === "fulfilled") {
        // Try different possible structures
        let eventsData: CorporateEvent[] = [];
        const responseValue = eventsResponse.value as unknown as Record<
          string,
          unknown
        >;

        if (responseValue.CorporateEvents) {
          eventsData = responseValue.CorporateEvents as CorporateEvent[];
        } else if (responseValue.data) {
          eventsData = responseValue.data as CorporateEvent[];
        } else if (Array.isArray(responseValue)) {
          eventsData = responseValue as CorporateEvent[];
        }

        setCorporateEvents(eventsData || []);
      } else {
        setCorporateEvents([]);
      }

      // Handle insights articles
      if (insightsResponse.status === "fulfilled") {
        // Try different possible structures
        let insightsData: InsightArticle[] = [];
        const responseValue = insightsResponse.value as unknown as Record<
          string,
          unknown
        >;

        if (responseValue.data) {
          insightsData = responseValue.data as InsightArticle[];
        } else if (Array.isArray(responseValue)) {
          insightsData = responseValue as InsightArticle[];
        }

        setInsightsArticles(insightsData || []);
      } else {
        setInsightsArticles([]);
      }

      // Removed New Companies fetch handling
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      // If it's an authentication error, redirect to login
      if (
        error instanceof Error &&
        error.message === "Authentication required"
      ) {
        console.log("Dashboard - Authentication error, redirecting to login");
        logout();
        router.push("/login");
        return;
      }
    } finally {
      setIsLoading(false);
    }
  }, [logout, router]);

  // Check authentication on component mount
  useEffect(() => {
    console.log("Dashboard page - authLoading:", authLoading);
    console.log("Dashboard page - isAuthenticated:", isAuthenticated);

    // Wait for auth context to finish loading
    if (authLoading) {
      console.log("Dashboard page - Still loading auth, waiting...");
      return;
    }

    if (!isAuthenticated) {
      console.log("Dashboard page - Not authenticated, redirecting to login");
      router.push("/login");
      return;
    }

    console.log("Dashboard page - Authenticated, fetching data");
    // Only fetch data if we're authenticated
    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [router, fetchDashboardData, isAuthenticated, authLoading]);

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full border-b-2 border-blue-600 animate-spin"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, don't render the dashboard
  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full border-b-2 border-red-600 animate-spin"></div>
          <p className="mt-4 text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full border-b-2 border-blue-600 animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const handleClickCapture: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!isTrialActive) return;
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
    if (
      anchor &&
      anchor.getAttribute("href") &&
      anchor.getAttribute("href") !== "#"
    ) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div className="min-h-screen">
      <Header />

      {/* Main Content */}
      <main
        className="px-2 py-4 mx-auto w-full sm:px-4 sm:py-8"
        style={{ position: "relative" }}
        onClickCapture={handleClickCapture}
      >
        {isTrialActive && (
          <div className="px-4 py-3 mb-4 text-yellow-900 bg-yellow-50 rounded-lg border border-yellow-300 sm:mb-6">
            <div className="font-semibold">Trial access</div>
            <div className="text-sm">
              You have limited navigation.{" "}
              {typeof trialDaysLeft === "number" && trialDaysLeft >= 0
                ? `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left`
                : "Expires soon"}
              .
            </div>
          </div>
        )}
        {/* Dashboard Subheader */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
            Asymmetrix Dashboard
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2 xl:grid-cols-[repeat(20,minmax(0,1fr))]">
          {/* Asymmetrix Data */}
          <div className="bg-white rounded-lg shadow order-3 lg:col-span-2 xl:col-span-7">
            <div className="p-3 border-b border-gray-200 sm:p-4">
              <div className="flex items-center gap-2">
                <img
                  src="/icons/logo.svg"
                  alt="Asymmetrix"
                  className="w-5 h-5"
                />
                <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
                  Asymmetrix Data
                </h2>
              </div>
            </div>
            <div className="p-3 sm:p-4">
              {asymmetrixData.length > 0 ? (
                <div className="space-y-2 sm:space-y-3">
                  {asymmetrixData.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-2 bg-gray-50 rounded-lg sm:p-2"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-base sm:text-lg">
                          {item.icon}
                        </span>
                        <span className="text-xs text-gray-600">
                          {item.label}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {parseInt(item.value)
                          ? parseInt(item.value).toLocaleString()
                          : item.value}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center sm:py-8">
                  <p className="text-sm text-gray-500">
                    No statistics available
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Insights & Analysis */}
          <div className="bg-white rounded-lg shadow order-1 lg:col-span-1 xl:col-span-6">
            <div className="flex items-center gap-3 p-3 border-b border-gray-200 sm:p-4">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 text-blue-700">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M9 21h6M10 17h4M8.5 14.6c-1.9-1.3-3.1-3.4-3.1-5.7C5.4 5.6 8.4 3 12 3s6.6 2.6 6.6 5.9c0 2.3-1.2 4.4-3.1 5.7-.8.5-1.3 1.4-1.3 2.4V18H9.8v-1c0-1-.5-1.9-1.3-2.4Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
                Insights &amp; Analysis
              </h2>
            </div>
            <div className="p-3 sm:p-4">
              {insightsArticles.length > 0 ? (
                <div className="space-y-4">
                  {insightsArticles.slice(0, 10).map((article) => {
                    const ct = (
                      article.Content_Type ||
                      article.content_type ||
                      article.Content?.Content_type ||
                      article.Content?.Content_Type ||
                      ""
                    ).trim();
                    const href = `/article/${article.id}?from=home`;

                    return (
                      <div
                        key={article.id}
                        className="p-4 rounded-xl border border-blue-100 bg-white shadow-sm hover:shadow transition-shadow"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg border border-blue-100">
                            {ct || "Insight"}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(article.Publication_Date)}
                          </span>
                        </div>

                        <a
                          href={href}
                          className="block mt-3 text-sm font-semibold text-gray-900 hover:text-blue-700"
                          onClick={(e) => {
                            if (
                              e.defaultPrevented ||
                              e.button !== 0 ||
                              e.metaKey ||
                              e.ctrlKey ||
                              e.shiftKey ||
                              e.altKey
                            )
                              return;
                            e.preventDefault();
                            router.push(href);
                          }}
                        >
                          {article.Headline}
                        </a>

                        {article.Strapline ? (
                          <p className="mt-2 text-xs leading-5 text-gray-600 line-clamp-3">
                            {article.Strapline}
                          </p>
                        ) : null}

                        <a
                          href={href}
                          className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-blue-600 hover:text-blue-800"
                          onClick={(e) => {
                            if (
                              e.defaultPrevented ||
                              e.button !== 0 ||
                              e.metaKey ||
                              e.ctrlKey ||
                              e.shiftKey ||
                              e.altKey
                            )
                              return;
                            e.preventDefault();
                            router.push(href);
                          }}
                        >
                          Read full article <span aria-hidden="true">→</span>
                        </a>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center sm:py-8">
                  <p className="text-sm text-gray-500">No insights available</p>
                </div>
              )}
            </div>
          </div>

          {/* Corporate Events */}
          <div className="bg-white rounded-lg shadow order-2 lg:col-span-1 xl:col-span-7">
            <div className="flex items-center justify-between p-3 border-b border-gray-200 sm:p-4">
              <div className="flex items-center gap-2">
                <img
                  src="/icons/logo.svg"
                  alt="Asymmetrix"
                  className="w-5 h-5"
                />
                <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
                  Corporate Events
                </h2>
              </div>
              <a
                href="/corporate-events"
                className="text-xs font-medium text-blue-600 underline hover:text-blue-800"
                style={{ fontWeight: "500" }}
              >
                View all
              </a>
            </div>
            <div className="overflow-hidden">
              {corporateEvents.length > 0 ? (
                <div className="min-w-full">
                  {/* Mobile view - cards */}
                  <div className="block lg:hidden">
                    <div className="p-3 space-y-3">
                      {corporateEvents.slice(0, 10).map((event, idx) => (
                        <div
                          key={getCorporateEventId(event) ?? `ev-card-${idx}`}
                          className="p-3 space-y-2 bg-gray-50 rounded-lg"
                        >
                          <div className="flex justify-between items-start">
                            {(() => {
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              const eid = getCorporateEventId(event as any);
                              const desc = event.description;
                              const safeHref = eid
                                ? `/corporate-event/${eid}`
                                : desc
                                ? `/corporate-events?search=${encodeURIComponent(
                                    desc
                                  )}`
                                : "#";
                              return (
                                <a
                                  href={safeHref}
                                  className="flex-1 text-sm font-medium text-blue-600 underline break-words hover:text-blue-800"
                                  style={{
                                    textDecoration: "underline",
                                    color: "#0075df",
                                    fontWeight: "500",
                                  }}
                                  onClick={(e) => {
                                    if (
                                      e.defaultPrevented ||
                                      e.button !== 0 ||
                                      e.metaKey ||
                                      e.ctrlKey ||
                                      e.shiftKey ||
                                      e.altKey
                                    ) {
                                      return;
                                    }
                                    e.preventDefault();
                                    handleCorporateEventClick(eid, desc);
                                  }}
                                >
                                  {event.description}
                                </a>
                              );
                            })()}
                          </div>
                          <div className="space-y-1 text-xs text-gray-500">
                            <div>
                              <strong>Date:</strong>{" "}
                              {formatDate(
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                (event as any)?.date || event.announcement_date
                              )}
                            </div>
                            <div>
                              <strong>Target:</strong>{" "}
                              {(() => {
                                const tgtVal = (
                                  event as unknown as {
                                    target?: unknown;
                                    all_targets?: unknown;
                                  }
                                ).target;
                                const allTargets = parseEntityArray<EntityRef>(
                                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                  (event as any)?.all_targets
                                );
                                const tgtObj =
                                  (typeof tgtVal === "string"
                                    ? safeParseJson<EntityRef>(tgtVal)
                                    : typeof tgtVal === "object"
                                    ? (tgtVal as EntityRef)
                                    : null) || null;
                                const tgtFallback =
                                  !tgtObj && allTargets.length > 0
                                    ? allTargets[0]
                                    : null;
                                const name =
                                  tgtObj?.name ||
                                  tgtFallback?.name ||
                                  event.Target_Counterparty?.new_company?.name;
                                const href = tgtObj
                                  ? normalizeEntityHref(tgtObj)
                                  : tgtFallback
                                  ? normalizeEntityHref(tgtFallback)
                                  : "";
                                if (!name) return <span>Not Available</span>;
                                return href ? (
                                  <a
                                    href={href}
                                    className="text-blue-600 underline hover:text-blue-800"
                                    style={{ fontWeight: "500" }}
                                  >
                                    {name}
                                  </a>
                                ) : (
                                  <span>{name}</span>
                                );
                              })()}
                            </div>
                            <div>
                              <strong>Type:</strong>{" "}
                              {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                (event as any)?.type ||
                                  event.deal_type ||
                                  "Not Available"
                              }
                            </div>
                            <div>
                              <strong>Amount (m):</strong>{" "}
                              {(() => {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const amountRaw = (event as any)?.amount;
                                const parsed = safeParseJson<{
                                  formatted?: string;
                                  currency?: string;
                                  value?: string | number;
                                }>(amountRaw);
                                const fromNew =
                                  parsed?.formatted ||
                                  (parsed?.currency &&
                                  parsed.value !== undefined &&
                                  parsed.value !== null
                                    ? `${String(parsed.value)} ${String(
                                        parsed.currency
                                      )}`
                                    : "");
                                if (fromNew) return fromNew;
                                if (
                                  event.investment_data?.investment_amount_m &&
                                  event.investment_data?.currrency?.Currency
                                ) {
                                  return `${event.investment_data.currrency.Currency}${event.investment_data.investment_amount_m}`;
                                }
                                return "Not Available";
                              })()}
                            </div>
                            <div>
                              <strong>Primary:</strong>{" "}
                              {(() => {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const primaryRefs = parseSectorRefs((event as any)?.primary);
                                if (primaryRefs.length === 0) return "Not Available";
                                return (
                                  <>
                                    {primaryRefs.map((s, i, arr) => (
                                      <span key={`m-primary-${s.id}`}>
                                        <a
                                          href={`/sector/${s.id}`}
                                          className="text-blue-600 underline hover:text-blue-800"
                                          style={{ fontWeight: "500" }}
                                        >
                                          {s.name}
                                        </a>
                                        {i < arr.length - 1 && ", "}
                                      </span>
                                    ))}
                                  </>
                                );
                              })()}
                            </div>
                            <div>
                              <strong>Secondary:</strong>{" "}
                              {(() => {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const secondaryRefs = parseSectorRefs((event as any)?.secondary);
                                if (secondaryRefs.length === 0) return "Not Available";
                                return (
                                  <>
                                    {secondaryRefs.map((s, i, arr) => (
                                      <span key={`m-secondary-${s.id}`}>
                                        <a
                                          href={`/sub-sector/${s.id}`}
                                          className="text-blue-600 underline hover:text-blue-800"
                                          style={{ fontWeight: "500" }}
                                        >
                                          {s.name}
                                        </a>
                                        {i < arr.length - 1 && ", "}
                                      </span>
                                    ))}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Desktop view - table */}
                  <div className="hidden lg:block p-4">
                    <div className="space-y-4 max-h-[800px] overflow-y-auto pr-1">
                      {corporateEvents.slice(0, 25).map((event, idx) => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const ev: any = event as any;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const eid = getCorporateEventId(event as any);
                        const desc = event.description;

                        // Target (new endpoint: target or all_targets; old endpoint: Target_Counterparty)
                        const targetObj =
                          (safeParseJson<EntityRef>(ev.target) ||
                            (typeof ev.target === "object"
                              ? (ev.target as Record<string, unknown>)
                              : null)) as EntityRef | null;
                        const allTargets = parseEntityArray<EntityRef>(ev.all_targets);
                        const targetObjFallback =
                          !targetObj && allTargets.length > 0 ? allTargets[0] : null;
                        const targetLegacyName =
                          event.Target_Counterparty?.new_company?.name;
                        const targetName =
                          targetObj?.name ||
                          targetObjFallback?.name ||
                          targetLegacyName;
                        const targetHref = targetObj
                          ? normalizeEntityHref(targetObj)
                          : targetObjFallback
                          ? normalizeEntityHref(targetObjFallback)
                          : "";

                        // Investors (new endpoint: investors; fallback: buyers (for acquisitions) or old buyers_investors)
                        const investorsNew = parseEntityArray<EntityRef>(ev.investors);
                        const buyersNew = parseEntityArray<EntityRef>(
                          ev.buyers || ev.buyers_investors
                        );
                        const buyersFromLegacy = (
                          event.Other_Counterparties_of_Corporate_Event || []
                        )
                          .map((cp) => cp._new_company?.name)
                          .filter((v): v is string => Boolean(v));

                        // Deal details
                        const details = safeParseJson<{
                          Type?: string;
                          Amount?: string;
                        }>(ev.deal_details);
                        const dealType =
                          details?.Type || event.deal_type || ev.type || "";
                        const rawAmount = (details?.Amount || "")
                          .toString()
                          .trim();
                        const cleanedAmount = rawAmount.replace(
                          /^amount:\s*/i,
                          ""
                        );
                        const formatAmount = (value: string): string => {
                          const v = (value || "").trim();
                          if (!v) return "";
                          const m1 = v.match(
                            /^(?:Currency:)?\s*([A-Z]{3})\s*([0-9]+(?:[.,][0-9]+)?)/i
                          ); // USD 1900
                          if (m1) return `${m1[1].toUpperCase()}${m1[2]}`;
                          const m2 = v.match(
                            /^([0-9]+(?:[.,][0-9]+)?)\s*([A-Z]{3})$/i
                          ); // 1900 USD
                          if (m2) return `${m2[2].toUpperCase()}${m2[1]}`;
                          const m3 = v.match(/^([A-Z]{3})([0-9].*)$/i); // USD1900
                          if (m3) return `${m3[1].toUpperCase()}${m3[2]}`;
                          return v;
                        };
                        const amountFromDetails = formatAmount(cleanedAmount);
                        const amountFromNew = (() => {
                          // new endpoint: amount is a JSON string like {"value":15,"currency":"USD","formatted":"15 USD"}
                          const parsed = safeParseJson<{
                            formatted?: string;
                            currency?: string;
                            value?: string | number;
                          }>(ev.amount);
                          if (parsed?.formatted) return String(parsed.formatted).trim();
                          if (
                            parsed &&
                            parsed.currency &&
                            (parsed.value !== undefined && parsed.value !== null)
                          ) {
                            return `${String(parsed.value)} ${String(parsed.currency)}`.trim();
                          }
                          return "";
                        })();
                        const amount =
                          amountFromDetails ||
                          amountFromNew ||
                          (event.investment_data?.investment_amount_m &&
                          event.investment_data?.currrency?.Currency
                            ? `${String(
                                event.investment_data.currrency.Currency
                              )}${String(
                                event.investment_data.investment_amount_m
                              )}`
                            : "");

                        // Sectors
                        const sectors = safeParseJson<{
                          Primary?: string[];
                          Secondary?: string[];
                        }>(ev.sectors);
                        const primaryFromNewJson = Array.isArray(sectors?.Primary)
                          ? (sectors!.Primary as string[])
                              .filter(Boolean)
                              .join(", ")
                          : "";
                        const secondaryFromNewJson = Array.isArray(sectors?.Secondary)
                          ? (sectors!.Secondary as string[]).filter(Boolean)
                          : [];

                        // new endpoint: primary/secondary are JSON arrays of {id,name} (stringified)
                        const primaryRefs = parseSectorRefs(ev.primary);
                        const secondaryRefs = parseSectorRefs(ev.secondary);

                        // backward compat (older endpoint previously returned "{A,B}" strings)
                        const primaryFromBrace = parseBraceList(ev.primary).join(", ");
                        const secondaryFromBraceArr = parseBraceList(ev.secondary);

                        const primary =
                          primaryFromNewJson ||
                          (primaryRefs.length > 0
                            ? primaryRefs.map((s) => s.name).join(", ")
                            : "") ||
                          primaryFromBrace ||
                          getEventPrimarySectors(event);
                        const list =
                          event.Target_Counterparty?.new_company?._sectors_objects
                            ?.sectors_id || [];
                        const secondaryLegacy = list
                          .filter(
                            (sector) =>
                              sector && sector.Sector_importance !== "Primary"
                          )
                          .map((sector) => sector.sector_name)
                          .filter(Boolean);
                        const secondary =
                          secondaryFromNewJson.length > 0
                            ? secondaryFromNewJson
                            : secondaryRefs.length > 0
                            ? secondaryRefs.map((s) => s.name)
                            : secondaryFromBraceArr.length > 0
                            ? secondaryFromBraceArr
                            : secondaryLegacy;

                        const investorEntities: EntityRef[] =
                          investorsNew.length > 0
                            ? dedupeById(investorsNew)
                            : buyersNew.length > 0
                            ? dedupeById(buyersNew)
                            : [];
                        const investorNames: string[] =
                          investorEntities.length > 0 ? [] : buyersFromLegacy;

                        return (
                          <div
                            key={eid ?? `ev-row-${idx}`}
                            className="p-4 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow transition-shadow"
                          >
                            <div className="mb-3">
                              <a
                                href={
                                  eid
                                    ? `/corporate-event/${eid}`
                                    : desc
                                    ? `/corporate-events?search=${encodeURIComponent(
                                        desc
                                      )}`
                                    : "#"
                                }
                                className="text-sm font-semibold text-blue-700 hover:text-blue-900"
                                onClick={(e) => {
                                  if (
                                    e.defaultPrevented ||
                                    e.button !== 0 ||
                                    e.metaKey ||
                                    e.ctrlKey ||
                                    e.shiftKey ||
                                    e.altKey
                                  )
                                    return;
                                  e.preventDefault();
                                  handleCorporateEventClick(eid, desc);
                                }}
                              >
                                {desc}
                              </a>
                            </div>

                            <div className="space-y-2 text-sm">
                              <div className="flex gap-3">
                                <div className="w-28 text-gray-500">Target</div>
                                <div className="flex-1 font-medium text-gray-900">
                                  {targetName ? (
                                    targetHref ? (
                                      <a
                                        href={targetHref}
                                        className="text-blue-700 hover:text-blue-900"
                                      >
                                        {targetName}
                                      </a>
                                    ) : (
                                      <span>{targetName}</span>
                                    )
                                  ) : (
                                    <span className="text-gray-400">
                                      Not Available
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex gap-3">
                                <div className="w-28 text-gray-500">
                                  Investor(s)
                                </div>
                                <div className="flex-1 font-medium text-gray-900">
                                  {investorEntities.length > 0 ? (
                                    investorEntities.map((b, i, arr) => {
                                      const href = normalizeEntityHref(b);
                                      const name = b?.name || "Unknown";
                                      return (
                                        <span key={`investor-${i}`}>
                                          {href ? (
                                            <a
                                              href={href}
                                              className="text-blue-700 hover:text-blue-900"
                                            >
                                              {name}
                                            </a>
                                          ) : (
                                            <span>{name}</span>
                                          )}
                                          {i < arr.length - 1 && ", "}
                                        </span>
                                      );
                                    })
                                  ) : investorNames.length > 0 ? (
                                    <span>{investorNames.join(", ")}</span>
                                  ) : (
                                    <span className="text-gray-400">
                                      Not Available
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex gap-3">
                                <div className="w-28 text-gray-500">Type</div>
                                <div className="flex-1 font-medium text-gray-900">
                                  {dealType || (
                                    <span className="text-gray-400">
                                      Not Available
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex gap-3">
                                <div className="w-28 text-gray-500">Amount</div>
                                <div className="flex-1 font-medium text-gray-900">
                                  {amount || (
                                    <span className="text-gray-400">
                                      Not Available
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex gap-3">
                                <div className="w-28 text-gray-500">Primary</div>
                                <div className="flex-1 font-medium text-gray-900">
                                  {primaryRefs.length > 0 ? (
                                    primaryRefs.map((s, i, arr) => (
                                      <span key={`primary-${s.id}`}>
                                        <a
                                          href={`/sector/${s.id}`}
                                          className="text-blue-700 hover:text-blue-900"
                                        >
                                          {s.name}
                                        </a>
                                        {i < arr.length - 1 && ", "}
                                      </span>
                                    ))
                                  ) : primary && primary !== "Not Available" ? (
                                    <span>{primary}</span>
                                  ) : (
                                    <span className="text-gray-400">
                                      Not Available
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex gap-3">
                                <div className="w-28 text-gray-500">
                                  Secondary
                                </div>
                                <div className="flex-1 font-medium text-gray-900">
                                  {secondaryRefs.length > 0 ? (
                                    secondaryRefs.map((s, i, arr) => (
                                      <span key={`secondary-${s.id}`}>
                                        <a
                                          href={`/sub-sector/${s.id}`}
                                          className="text-blue-700 hover:text-blue-900"
                                        >
                                          {s.name}
                                        </a>
                                        {i < arr.length - 1 && ", "}
                                      </span>
                                    ))
                                  ) : secondary.length > 0 ? (
                                    <span>{secondary.join(", ")}</span>
                                  ) : (
                                    <span className="text-gray-400">
                                      Not Available
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="pt-2 mt-1 border-t border-gray-100 text-sm">
                                <span className="text-gray-500">Date:</span>{" "}
                                <span className="text-gray-700">
                                  {formatDate(ev.date || event.announcement_date)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center">
                  <p className="text-sm text-gray-500">
                    No corporate events available
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
