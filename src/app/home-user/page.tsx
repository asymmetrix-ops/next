"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { dashboardApiService } from "@/lib/dashboardApi";
import { locationsService } from "@/lib/locationsService";
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
    Funding_stage?: string;
    funding_stage?: string;
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

  // Sector name normalization helper
  const normalizeSectorName = (name: string | undefined | null): string =>
    (name || "").trim().toLowerCase();

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

  // Name -> id maps for linking primary/secondary sectors to sector pages
  const [primaryNameToId, setPrimaryNameToId] = useState<Record<string, number>>(
    {}
  );
  const [secondaryNameToId, setSecondaryNameToId] = useState<
    Record<string, number>
  >({});

  // Build mapping from sector names to ids (shared across dashboard events)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [primaries, allSecondary] = await Promise.all([
          locationsService.getPrimarySectors(),
          locationsService.getAllSecondarySectorsWithPrimary(),
        ]);

        if (cancelled) return;

        const primaryMap: Record<string, number> = {};
        primaries.forEach((p) => {
          const name = (p as { sector_name?: string }).sector_name;
          const id = (p as { id?: number }).id;
          if (name && typeof id === "number") {
            primaryMap[normalizeSectorName(name)] = id;
          }
        });

        const secondaryMap: Record<string, number> = {};
        (allSecondary || []).forEach((s) => {
          const name = (s as { sector_name?: string }).sector_name;
          const id = (s as { id?: number }).id;
          if (name && typeof id === "number") {
            secondaryMap[normalizeSectorName(name)] = id;
          }
        });

        setPrimaryNameToId(primaryMap);
        setSecondaryNameToId(secondaryMap);
      } catch (e) {
        console.warn(
          "[Home Dashboard] Failed to load sector id mappings for links",
          e
        );
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

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
        dashboardApiService.getCorporateEvents(),
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

        <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-4 lg:grid-cols-2">
          {/* Asymmetrix Data */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-3 border-b border-gray-200 sm:p-4">
              <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
                Asymmetrix Data
              </h2>
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

          {/* Corporate Events */}
          <div className="bg-white rounded-lg shadow xl:col-span-2">
            <div className="p-3 border-b border-gray-200 sm:p-4">
              <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
                Corporate Events
              </h2>
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
                              {formatDate(event.announcement_date)}
                            </div>
                            <div>
                              {(() => {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const ev = event as any;
                                const isPartnership =
                                  (ev.deal_type || "")
                                    .toLowerCase()
                                    .trim() === "partnership";

                                // New API: targets (plural) as JSON string array
                                const targetsArr =
                                  parseEntityArray<EntityRef>(ev.targets);

                                // Fallback: legacy single target field or nested object
                                if (targetsArr.length === 0) {
                                  const tgtVal = ev.target;
                                  const tgtObj =
                                    (typeof tgtVal === "string"
                                      ? safeParseJson<EntityRef>(tgtVal)
                                      : typeof tgtVal === "object"
                                      ? (tgtVal as EntityRef)
                                      : null) || null;
                                  const name =
                                    tgtObj?.name ||
                                    event.Target_Counterparty?.new_company
                                      ?.name;
                                  const href = tgtObj
                                    ? normalizeEntityHref(tgtObj)
                                    : "";
                                  return (
                                    <>
                                      <strong>
                                        {isPartnership ? "Target(s):" : "Target:"}
                                      </strong>{" "}
                                      {name ? (
                                        href ? (
                                          <a
                                            href={href}
                                            className="text-blue-600 underline hover:text-blue-800"
                                            style={{ fontWeight: "500" }}
                                          >
                                            {name}
                                          </a>
                                        ) : (
                                          <span>{name}</span>
                                        )
                                      ) : (
                                        <span>Not Available</span>
                                      )}
                                    </>
                                  );
                                }

                                // For partnerships: show all targets; otherwise show first only
                                const displayTargets = isPartnership
                                  ? dedupeById(targetsArr)
                                  : dedupeById(targetsArr).slice(0, 1);

                                return (
                                  <>
                                    <strong>
                                      {isPartnership ? "Target(s):" : "Target:"}
                                    </strong>{" "}
                                    {displayTargets.map((tgt, i, arr) => {
                                      const href = normalizeEntityHref(tgt);
                                      const name = tgt?.name || "Unknown";
                                      return (
                                        <span key={`tgt-${tgt?.id ?? i}`}>
                                          {href ? (
                                            <a
                                              href={href}
                                              className="text-blue-600 underline hover:text-blue-800"
                                              style={{ fontWeight: "500" }}
                                            >
                                              {name}
                                            </a>
                                          ) : (
                                            <span>{name}</span>
                                          )}
                                          {i < arr.length - 1 && ", "}
                                        </span>
                                      );
                                    })}
                                  </>
                                );
                              })()}
                            </div>
                            <div>
                              <strong>Type:</strong>{" "}
                              {event.deal_type || "Not Available"}
                            </div>
                            <div>
                              <strong>Amount (m):</strong>{" "}
                              {event.investment_data?.investment_amount_m &&
                              event.investment_data?.currrency?.Currency
                                ? `${event.investment_data.currrency.Currency}${event.investment_data.investment_amount_m}`
                                : "Not Available"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Desktop view - table */}
                  <div className="hidden lg:block overflow-x-auto max-h-[800px]">
                    <table className="w-full min-w-max table-fixed">
                      <colgroup>
                        <col />
                        <col style={{ width: "22%" }} />
                        <col />
                        <col />
                      </colgroup>
                      <thead className="sticky top-0 bg-gray-50">
                        <tr>
                          <th className="px-4 py-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            Event Details
                          </th>
                          <th className="px-4 py-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            Parties
                          </th>
                          <th className="px-4 py-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            Deal Details
                          </th>
                          <th className="px-4 py-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            Sectors
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {corporateEvents.slice(0, 25).map((event, idx) => (
                          <tr
                            key={getCorporateEventId(event) ?? `ev-row-${idx}`}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-4 py-4 max-w-xs text-xs text-gray-900">
                              <div className="mb-2">
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
                                      className="font-medium text-blue-600 underline break-words hover:text-blue-800"
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
                                        )
                                          return;
                                        e.preventDefault();
                                        handleCorporateEventClick(eid, desc);
                                      }}
                                    >
                                      {event.description}
                                    </a>
                                  );
                                })()}
                              </div>
                              <div className="mb-1 text-xs text-gray-500">
                                Date: {formatDate(event.announcement_date)}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-xs text-gray-900">
                              {/* Parties column */}
                              {(() => {
                                // Prefer new flat API fields when present
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const ev: any = event as any;

                                // Check if deal is a partnership
                                const isPartnership =
                                  (ev.deal_type || "")
                                    .toLowerCase()
                                    .trim() === "partnership";

                                // New API: targets (plural) as JSON string array
                                const targetsArr =
                                  parseEntityArray<EntityRef>(ev.targets);

                                // Fallback: legacy single target field
                                const targetObj = (safeParseJson<EntityRef>(
                                  ev.target
                                ) ||
                                  (typeof ev.target === "object"
                                    ? (ev.target as Record<string, unknown>)
                                    : null)) as EntityRef | null;
                                const targetLegacyName =
                                  event.Target_Counterparty?.new_company?.name;

                                // Buyers and Investors come separately on the new API
                                const buyersArr = parseEntityArray<EntityRef>(
                                  // new field
                                  (ev as { buyers?: unknown }).buyers
                                );
                                const investorsArr =
                                  parseEntityArray<EntityRef>(
                                    // new field
                                    (ev as { investors?: unknown }).investors
                                  );
                                // Legacy combined field (fallback)
                                const buyersInvestorsCombined =
                                  parseEntityArray<EntityRef>(
                                    (ev as { buyers_investors?: unknown })
                                      .buyers_investors
                                  );
                                // Legacy counterparties fallback (names only if no typed arrays)
                                // Try to split when counterparty status flags exist; otherwise treat as combined
                                type LegacyCounterparty = {
                                  _new_company?: {
                                    name?: string;
                                    _is_that_investor?: boolean;
                                  };
                                  _counterparty_type?: {
                                    counterparty_status?: string;
                                  };
                                };
                                const legacyCounterparties: LegacyCounterparty[] =
                                  event.Other_Counterparties_of_Corporate_Event ||
                                  [];
                                const legacyCombinedNames = legacyCounterparties
                                  .map((cp) => cp?._new_company?.name)
                                  .filter(Boolean) as string[];

                                // Sellers
                                const sellersNew = parseEntityArray<EntityRef>(
                                  ev.sales
                                );

                                // Advisors (legacy only on dashboard feed)
                                const advisors = (
                                  event.Advisors_of_Corporate_Event || []
                                )
                                  .map((a) => a._new_company?.name)
                                  .filter(Boolean);

                                // Determine targets to display
                                const displayTargets =
                                  targetsArr.length > 0
                                    ? isPartnership
                                      ? dedupeById(targetsArr)
                                      : dedupeById(targetsArr).slice(0, 1)
                                    : [];

                                // Fallback target name for legacy data
                                const targetName =
                                  targetObj?.name || targetLegacyName;
                                const targetHref = targetObj
                                  ? normalizeEntityHref(targetObj)
                                  : "";

                                return (
                                  <div className="space-y-1">
                                    {/* Targets row */}
                                    {displayTargets.length > 0 ? (
                                      <div className="text-xs text-gray-500">
                                        <strong>
                                          {isPartnership
                                            ? "Target(s):"
                                            : "Target:"}
                                        </strong>{" "}
                                        {displayTargets.map((tgt, i, arr) => {
                                          const href = normalizeEntityHref(tgt);
                                          const name = tgt?.name || "Unknown";
                                          return (
                                            <span key={`tgt-${tgt?.id ?? i}`}>
                                              {href ? (
                                                <a
                                                  href={href}
                                                  className="text-blue-600 underline hover:text-blue-800"
                                                  style={{ fontWeight: "500" }}
                                                >
                                                  {name}
                                                </a>
                                              ) : (
                                                <span>{name}</span>
                                              )}
                                              {i < arr.length - 1 && ", "}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    ) : targetName ? (
                                      <div className="text-xs text-gray-500">
                                        <strong>
                                          {isPartnership
                                            ? "Target(s):"
                                            : "Target:"}
                                        </strong>{" "}
                                        {targetHref ? (
                                          <a
                                            href={targetHref}
                                            className="text-blue-600 underline hover:text-blue-800"
                                            style={{ fontWeight: "500" }}
                                          >
                                            {targetName}
                                          </a>
                                        ) : (
                                          <span>{targetName}</span>
                                        )}
                                      </div>
                                    ) : null}

                                    {buyersArr.length > 0 && (
                                      <div className="text-xs text-gray-500">
                                        <strong>Buyer(s):</strong>{" "}
                                        {dedupeById(buyersArr).map(
                                          (b, i, arr) => {
                                            const href = normalizeEntityHref(b);
                                            const name = b?.name || "Unknown";
                                            return (
                                              <span key={`buyer-${i}`}>
                                                {href ? (
                                                  <a
                                                    href={href}
                                                    className="text-blue-600 underline hover:text-blue-800"
                                                    style={{
                                                      fontWeight: "500",
                                                    }}
                                                  >
                                                    {name}
                                                  </a>
                                                ) : (
                                                  <span>{name}</span>
                                                )}
                                                {i < arr.length - 1 && ", "}
                                              </span>
                                            );
                                          }
                                        )}
                                      </div>
                                    )}

                                    {investorsArr.length > 0 && (
                                      <div className="text-xs text-gray-500">
                                        <strong>Investor(s):</strong>{" "}
                                        {dedupeById(investorsArr).map(
                                          (inv, i, arr) => {
                                            const href =
                                              normalizeEntityHref(inv);
                                            const name = inv?.name || "Unknown";
                                            return (
                                              <span key={`investor-${i}`}>
                                                {href ? (
                                                  <a
                                                    href={href}
                                                    className="text-blue-600 underline hover:text-blue-800"
                                                    style={{
                                                      fontWeight: "500",
                                                    }}
                                                  >
                                                    {name}
                                                  </a>
                                                ) : (
                                                  <span>{name}</span>
                                                )}
                                                {i < arr.length - 1 && ", "}
                                              </span>
                                            );
                                          }
                                        )}
                                      </div>
                                    )}

                                    {/* Fallback: show combined list if separate arrays absent */}
                                    {buyersArr.length === 0 &&
                                      investorsArr.length === 0 &&
                                      (buyersInvestorsCombined.length > 0 ||
                                        legacyCombinedNames.length > 0) && (
                                        <div className="text-xs text-gray-500">
                                          <strong>
                                            Buyer(s) / Investor(s):
                                          </strong>{" "}
                                          {buyersInvestorsCombined.length > 0
                                            ? dedupeById(
                                                buyersInvestorsCombined
                                              ).map((b, i, arr) => {
                                                const href =
                                                  normalizeEntityHref(b);
                                                const name =
                                                  b?.name || "Unknown";
                                                return (
                                                  <span key={`bi-${i}`}>
                                                    {href ? (
                                                      <a
                                                        href={href}
                                                        className="text-blue-600 underline hover:text-blue-800"
                                                        style={{
                                                          fontWeight: "500",
                                                        }}
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
                                            : legacyCombinedNames.join(", ")}
                                        </div>
                                      )}

                                    {sellersNew.length > 0 && (
                                      <div className="text-xs text-gray-500">
                                        <strong>Seller(s):</strong>{" "}
                                        {dedupeById(sellersNew).map(
                                          (s, i, arr) => {
                                            const href = normalizeEntityHref(s);
                                            const name = s?.name || "Unknown";
                                            return (
                                              <span key={`seller-${i}`}>
                                                {href ? (
                                                  <a
                                                    href={href}
                                                    className="text-blue-600 underline hover:text-blue-800"
                                                    style={{
                                                      fontWeight: "500",
                                                    }}
                                                  >
                                                    {name}
                                                  </a>
                                                ) : (
                                                  <span>{name}</span>
                                                )}
                                                {i < arr.length - 1 && ", "}
                                              </span>
                                            );
                                          }
                                        )}
                                      </div>
                                    )}

                                    {advisors.length > 0 && (
                                      <div className="text-xs text-gray-500">
                                        <strong>Advisor(s):</strong>{" "}
                                        {advisors.join(", ")}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="px-4 py-4 text-xs text-gray-900">
                              {/* Deal Details column */}
                              {(() => {
                                // Prefer new stringified deal_details when available
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const ev: any = event as any;
                                const details = safeParseJson<{
                                  Type?: string;
                                  Funding_Stage?: string;
                                  Amount?: string;
                                  Investment_Amount?: {
                                    value?: number;
                                    currency?: string;
                                    formatted?: string;
                                  };
                                  Enterprise_Value?: {
                                    value?: number;
                                    currency?: string;
                                    formatted?: string;
                                  } | null;
                                }>(ev.deal_details);

                                const dealType =
                                  details?.Type || event.deal_type;

                                const fundingStage = (
                                  (details?.Funding_Stage ||
                                    (event as {
                                      investment_data?: {
                                        Funding_stage?: string;
                                        funding_stage?: string;
                                      };
                                    }).investment_data?.Funding_stage ||
                                    (event as {
                                      investment_data?: {
                                        Funding_stage?: string;
                                        funding_stage?: string;
                                      };
                                    }).investment_data?.funding_stage ||
                                    "") as string
                                ).trim();

                                // Normalize legacy Amount string to avoid duplicated label
                                const rawAmount = (details?.Amount || "")
                                  .toString()
                                  .trim();
                                const cleanedAmount = rawAmount.replace(
                                  /^amount:\s*/i,
                                  ""
                                );
                                // Format amount as CURR before number, no space (e.g., USD1900)
                                const formatAmountString = (
                                  value: string
                                ): string => {
                                  const v = (value || "").trim();
                                  if (!v) return "";
                                  const m1 = v.match(
                                    /^(?:Currency:)?\s*([A-Z]{3})\s*([0-9]+(?:[.,][0-9]+)?)/i
                                  ); // USD 1900
                                  if (m1)
                                    return `${m1[1].toUpperCase()}${m1[2]}`;
                                  const m2 = v.match(
                                    /^([0-9]+(?:[.,][0-9]+)?)\s*([A-Z]{3})$/i
                                  ); // 1900 USD
                                  if (m2)
                                    return `${m2[2].toUpperCase()}${m2[1]}`;
                                  const m3 = v.match(/^([A-Z]{3})([0-9].*)$/i); // USD1900
                                  if (m3)
                                    return `${m3[1].toUpperCase()}${m3[2]}`;
                                  return v;
                                };

                                const formatAmountObject = (opts?: {
                                  value?: number;
                                  currency?: string;
                                  formatted?: string;
                                }): string => {
                                  if (!opts) return "";
                                  const { value, currency, formatted } = opts;
                                  if (formatted && formatted.trim()) {
                                    return formatted.trim();
                                  }
                                  if (
                                    typeof value === "number" &&
                                    typeof currency === "string" &&
                                    currency.trim()
                                  ) {
                                    return `${currency.trim().toUpperCase()}${value}`;
                                  }
                                  return "";
                                };

                                const amountFromDetailsObject =
                                  formatAmountObject(details?.Investment_Amount);
                                const amountFromDetailsString =
                                  formatAmountString(cleanedAmount);

                                const amount =
                                  amountFromDetailsObject ||
                                  amountFromDetailsString ||
                                  (event.investment_data?.investment_amount_m &&
                                  event.investment_data?.currrency?.Currency
                                    ? `${String(
                                        event.investment_data.currrency.Currency
                                      )}${String(
                                        event.investment_data
                                          .investment_amount_m
                                      )}`
                                    : "");

                                const valuationFromDetails =
                                  formatAmountObject(
                                    details?.Enterprise_Value ?? undefined
                                  );
                                const valuationFallback =
                                  event.ev_data?.enterprise_value_m &&
                                  event.ev_data?.Currency
                                    ? `${event.ev_data.enterprise_value_m} ${event.ev_data.Currency}`
                                    : "";
                                const valuation =
                                  valuationFromDetails || valuationFallback;

                                return (
                                  <div className="space-y-1">
                                    {dealType && (
                                      <div className="text-xs text-gray-500">
                                        <strong>Type:</strong> {dealType}
                                      </div>
                                    )}
                                    {fundingStage && (
                                      <div className="text-xs text-gray-500">
                                        <strong>Deal Stage:</strong>{" "}
                                        <span className="inline-block px-2 py-0.5 ml-1 text-[10px] font-semibold rounded-full bg-green-100 text-green-800">
                                          {fundingStage}
                                        </span>
                                      </div>
                                    )}
                                    {amount && (
                                      <div className="text-xs text-gray-500">
                                        <strong>Amount (m):</strong> {amount}
                                      </div>
                                    )}
                                    {valuation && (
                                      <div className="text-xs text-gray-500">
                                        <strong>EV:</strong> {valuation}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="px-4 py-4 text-xs text-gray-900">
                              {/* Sectors column */}
                              {(() => {
                                // Prefer new stringified sectors when available
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const ev: any = event as any;
                                const sectors = safeParseJson<{
                                  Primary?: string[];
                                  Secondary?: string[];
                                }>(ev.sectors);
                                const primaryFromNew = Array.isArray(
                                  sectors?.Primary
                                )
                                  ? (sectors!.Primary as string[])
                                      .filter(Boolean)
                                      .join(", ")
                                  : "";
                                const secondaryFromNew = Array.isArray(
                                  sectors?.Secondary
                                )
                                  ? (sectors!.Secondary as string[])
                                      .filter(Boolean)
                                      .slice(0, 3)
                                  : [];

                                const primary =
                                  primaryFromNew ||
                                  getEventPrimarySectors(event);
                                const list =
                                  event.Target_Counterparty?.new_company
                                    ?._sectors_objects?.sectors_id || [];
                                const secondaryLegacy = list
                                  .filter(
                                    (sector) =>
                                      sector &&
                                      sector.Sector_importance !== "Primary"
                                  )
                                  .map((sector) => sector.sector_name)
                                  .filter(Boolean)
                                  .slice(0, 3);
                                const secondary =
                                  (secondaryFromNew as string[]).length > 0
                                    ? (secondaryFromNew as string[])
                                    : secondaryLegacy;
                                return (
                                  <div className="space-y-1">
                                    {primary && primary !== "Not Available" && (
                                      <div className="text-xs text-gray-500">
                                        <strong>Primary:</strong>{" "}
                                        {(() => {
                                          const names = primary
                                            .split(",")
                                            .map((s) => s.trim())
                                            .filter(Boolean);
                                          if (names.length === 0)
                                            return primary;
                                          return names.map((name, idx) => {
                                            const id =
                                              primaryNameToId[
                                                normalizeSectorName(name)
                                              ];
                                            const node =
                                              typeof id === "number" ? (
                                                <a
                                                  key={`${name}-${id}`}
                                                  href={`/sector/${id}`}
                                                  className="text-blue-600 underline hover:text-blue-800"
                                                >
                                                  {name}
                                                </a>
                                              ) : (
                                                <span key={`${name}-na`}>
                                                  {name}
                                                </span>
                                              );
                                            return (
                                              <span
                                                key={`${name}-${id ?? "na"}`}
                                              >
                                                {node}
                                                {idx < names.length - 1 && ", "}
                                              </span>
                                            );
                                          });
                                        })()}
                                      </div>
                                    )}
                                    {secondary.length > 0 && (
                                      <div className="text-xs text-gray-500">
                                        <strong>Secondary:</strong>{" "}
                                        {secondary.map((name, idx) => {
                                          const id =
                                            secondaryNameToId[
                                              normalizeSectorName(name)
                                            ];
                                          const node =
                                            typeof id === "number" ? (
                                              <a
                                                key={`${name}-${id}`}
                                                href={`/sub-sector/${id}`}
                                                className="text-blue-600 underline hover:text-blue-800"
                                              >
                                                {name}
                                              </a>
                                            ) : (
                                              <span key={`${name}-na`}>
                                                {name}
                                              </span>
                                            );
                                          return (
                                            <span
                                              key={`${name}-${id ?? "na"}`}
                                            >
                                              {node}
                                              {idx < secondary.length - 1 &&
                                                ", "}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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

          {/* Insights & Analysis */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-3 border-b border-gray-200 sm:p-4">
              <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
                Insights & Analysis
              </h2>
            </div>
            <div className="p-3 sm:p-4">
              {insightsArticles.length > 0 ? (
                <div className="space-y-3">
                  {insightsArticles.slice(0, 10).map((article) => (
                    <div key={article.id} className="p-3 bg-gray-50 rounded-lg">
                      {article.image && (
                        <img
                          src={article.image}
                          alt={article.Headline}
                          className="object-cover mb-2 w-full h-20 rounded"
                        />
                      )}
                      <a
                        href={`/article/${article.id}?from=home`}
                        className="mb-1 block max-w-[520px] text-xs font-medium text-gray-900 hover:text-blue-600"
                        style={{
                          textDecoration: "underline",
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
                          )
                            return;
                          e.preventDefault();
                          router.push(`/article/${article.id}?from=home`);
                        }}
                      >
                        {article.Headline}
                      </a>
                      {(() => {
                        const ct = (
                          article.Content_Type ||
                          article.content_type ||
                          article.Content?.Content_type ||
                          article.Content?.Content_Type ||
                          ""
                        ).trim();
                        return ct ? (
                          <div className="mb-1">
                            <span className="inline-block px-2 py-0.5 text-[10px] font-medium rounded bg-blue-100 text-blue-800">
                              {ct}
                            </span>
                          </div>
                        ) : null;
                      })()}
                      {article.Strapline && (
                        <p className="mb-1 text-xs text-gray-600 leading-snug max-w-[520px] break-words">
                          {article.Strapline}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {formatDate(article.Publication_Date)}
                      </p>
                      {article.companies_mentioned &&
                        article.companies_mentioned.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {article.companies_mentioned.map(
                              (company, index) => {
                                const href = company._is_that_investor
                                  ? `/investors/${company.id}`
                                  : `/company/${company.id}`;
                                return (
                                  <span key={company.id}>
                                    <a
                                      href={href}
                                      className="text-xs text-blue-600 hover:text-blue-800"
                                      style={{ fontWeight: "500" }}
                                    >
                                      {company.name}
                                    </a>
                                    {index <
                                      article.companies_mentioned!.length - 1 &&
                                      ", "}
                                  </span>
                                );
                              }
                            )}
                          </div>
                        )}
                      {article.keywords && article.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {article.keywords
                            .slice(0, 3)
                            .map((keyword, index) => (
                              <span
                                key={index}
                                className="px-1 py-0.5 text-xs bg-blue-100 text-blue-800 rounded"
                              >
                                {keyword}
                              </span>
                            ))}
                        </div>
                      )}
                      <div className="flex justify-between items-center mt-2">
                        <a
                          href={`/article/${article.id}?from=home`}
                          className="text-xs text-blue-600 hover:text-blue-800"
                          style={{
                            textDecoration: "underline",
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
                            )
                              return;
                            e.preventDefault();
                            router.push(`/article/${article.id}?from=home`);
                          }}
                        >
                          Read full article →
                        </a>
                        {article.related_documents &&
                          article.related_documents.length > 0 && (
                            <a
                              href={article.related_documents[0].url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-gray-500 hover:text-gray-700"
                            >
                              External link
                            </a>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center sm:py-8">
                  <p className="text-sm text-gray-500">No insights available</p>
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
