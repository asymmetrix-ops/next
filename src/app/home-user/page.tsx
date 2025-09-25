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
  const { isAuthenticated, logout, loading: authLoading } = useAuth();
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

  // Parse strings like "{A,\"B\",C}" into ["A","B","C"]
  const parseBraceList = (value?: unknown): string[] => {
    if (!value || typeof value !== "string") return [];
    const trimmed = value.trim();
    if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return [];
    const inner = trimmed.slice(1, -1);
    if (!inner) return [];
    return inner
      .split(",")
      .map((s) => s.trim())
      .map((s) => (s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1) : s))
      .filter(Boolean);
  };

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

  return (
    <div className="min-h-screen">
      <Header />

      {/* Main Content */}
      <main className="px-2 py-4 mx-auto w-full sm:px-4 sm:py-8">
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
                              <strong>Target:</strong>{" "}
                              {event.Target_Counterparty?.new_company?.name ||
                                "Not Available"}
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
                                const targetName =
                                  (typeof ev.target === "string" &&
                                    ev.target) ||
                                  event.Target_Counterparty?.new_company?.name;

                                const buyersFromNew = parseBraceList(
                                  ev.buyers_investors
                                );
                                const sellersFromNew = parseBraceList(ev.sales);

                                // Legacy fallbacks
                                const buyersFromLegacy = (
                                  event.Other_Counterparties_of_Corporate_Event ||
                                  []
                                )
                                  .map((cp) => cp._new_company?.name)
                                  .filter(Boolean);
                                const advisors = (
                                  event.Advisors_of_Corporate_Event || []
                                )
                                  .map((a) => a._new_company?.name)
                                  .filter(Boolean);

                                const buyers =
                                  buyersFromNew.length > 0
                                    ? buyersFromNew
                                    : buyersFromLegacy;
                                const sellers = sellersFromNew;

                                return (
                                  <div className="space-y-1">
                                    {targetName && (
                                      <div className="text-xs text-gray-500">
                                        <strong>Target:</strong> {targetName}
                                      </div>
                                    )}
                                    {buyers.length > 0 && (
                                      <div className="text-xs text-gray-500">
                                        <strong>Buyer(s) / Investor(s):</strong>{" "}
                                        {buyers.join(", ")}
                                      </div>
                                    )}
                                    {sellers.length > 0 && (
                                      <div className="text-xs text-gray-500">
                                        <strong>Seller(s):</strong>{" "}
                                        {sellers.join(", ")}
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
                                  Amount?: string;
                                }>(ev.deal_details);
                                const dealType =
                                  details?.Type || event.deal_type;
                                // Normalize amount to avoid duplicated label like "Amount: Amount: 1900 USD"
                                const rawAmount = (details?.Amount || "")
                                  .toString()
                                  .trim();
                                const cleanedAmount = rawAmount.replace(
                                  /^amount:\s*/i,
                                  ""
                                );
                                // Format amount as CURR before number, no space (e.g., USD1900)
                                const formatAmount = (
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
                                const amountFromDetails =
                                  formatAmount(cleanedAmount);
                                const amount =
                                  amountFromDetails ||
                                  (event.investment_data?.investment_amount_m &&
                                  event.investment_data?.currrency?.Currency
                                    ? `${String(
                                        event.investment_data.currrency.Currency
                                      )}${String(
                                        event.investment_data
                                          .investment_amount_m
                                      )}`
                                    : "");
                                const valuation =
                                  event.ev_data?.enterprise_value_m &&
                                  event.ev_data?.Currency
                                    ? `${event.ev_data.enterprise_value_m} ${event.ev_data.Currency}`
                                    : "";
                                return (
                                  <div className="space-y-1">
                                    {dealType && (
                                      <div className="text-xs text-gray-500">
                                        <strong>Type:</strong> {dealType}
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
                                        <strong>Primary:</strong> {primary}
                                      </div>
                                    )}
                                    {secondary.length > 0 && (
                                      <div className="text-xs text-gray-500">
                                        <strong>Secondary:</strong>{" "}
                                        {secondary.join(", ")}
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
                        className="mb-1 text-xs font-medium text-gray-900 hover:text-blue-600"
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
                        <p className="mb-1 text-xs text-gray-600">
                          {article.Strapline.substring(0, 150)}
                          {article.Strapline.length > 150 ? "..." : ""}
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
