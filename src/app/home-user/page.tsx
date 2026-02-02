"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

import {
  type GlobalSearchResult,
  type GlobalSearchPagination,
  fetchGlobalSearchPaginated,
  badgeClassForSearchType,
  resolveSearchHref,
  getSearchBadgeLabel,
} from "@/lib/globalSearch";

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

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);
  const [searchPopupOpen, setSearchPopupOpen] = useState(false);
  const [searchPagination, setSearchPagination] =
    useState<GlobalSearchPagination | null>(null);
  const [popupResults, setPopupResults] = useState<GlobalSearchResult[]>([]);
  const [popupLoadingMore, setPopupLoadingMore] = useState(false);

  const runSearch = useCallback(
    async (
      q: string,
      page: number,
      signal?: AbortSignal
    ): Promise<{ items: GlobalSearchResult[]; pagination: GlobalSearchPagination }> => {
      return fetchGlobalSearchPaginated(q, page, signal);
    },
    []
  );

  useEffect(() => {
    if (isTrialActive) {
      setSearchOpen(false);
      return;
    }
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }
    if (q.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    const ac = new AbortController();
    setSearchLoading(true);
    setSearchError(null);
    setSearchOpen(true);

    const t = window.setTimeout(async () => {
      try {
        const { items, pagination } = await runSearch(q, 1, ac.signal);
        setSearchResults(items);
        setSearchPagination(pagination);
        setPopupResults(items);
      } catch (err) {
        const name =
          err && typeof err === "object" ? String((err as { name?: unknown }).name) : "";
        if (name === "AbortError") return;
        setSearchResults([]);
        setSearchPagination(null);
        setSearchError("Search failed. Please try again.");
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(t);
      ac.abort();
    };
  }, [searchQuery, runSearch, isTrialActive]);

  const handleLoadMoreInPopup = useCallback(async () => {
    const q = searchQuery.trim();
    const pag = searchPagination;
    if (!q || !pag?.next_page) return;
    setPopupLoadingMore(true);
    try {
      const { items, pagination: nextPag } = await runSearch(q, pag.next_page);
      setPopupResults((prev) => [...prev, ...items]);
      setSearchPagination(nextPag);
    } catch {
      // ignore
    } finally {
      setPopupLoadingMore(false);
    }
  }, [searchQuery, searchPagination, runSearch]);

  const openSearchPopup = useCallback(() => {
    setPopupResults(searchResults);
    setSearchPopupOpen(true);
  }, [searchResults]);

  const closeSearchPopup = useCallback(() => {
    setSearchPopupOpen(false);
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      const el = searchWrapRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [searchOpen]);

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
        <div className="flex flex-col gap-3 mb-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
            Asymmetrix Dashboard
          </h1>

          <div
            ref={searchWrapRef}
            className="relative w-full sm:max-w-xl md:max-w-2xl"
          >
            <input
              type="search"
              value={searchQuery}
              disabled={isTrialActive}
              placeholder={
                isTrialActive
                  ? "Search is disabled during trial access"
                  : "Search all pages..."
              }
              className={`w-full px-3 py-2 text-sm rounded-md border shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                isTrialActive
                  ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                  : "bg-white"
              }`}
              onFocus={() => {
                if (!isTrialActive) setSearchOpen(true);
              }}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
            />

            {searchOpen && !isTrialActive && searchQuery.trim().length >= 2 && (
              <div className="absolute z-50 mt-2 w-full bg-white rounded-md border shadow-lg">
                {searchLoading ? (
                  <div className="px-3 py-3 text-xs text-gray-600">
                    Searching…
                  </div>
                ) : searchError ? (
                  <div className="px-3 py-3 text-xs text-red-600">
                    {searchError}
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-gray-600">
                    No results
                  </div>
                ) : (
                  <>
                    <ul className="py-1 max-h-72 overflow-auto">
                      {searchResults.slice(0, 25).map((r, idx) => {
                        const href = resolveSearchHref(r);
                        const t = String(r.type || "").toLowerCase().trim();
                        const isInsight =
                          t === "insight" || t === "insights" || t === "article";
                        const badgeLabel = getSearchBadgeLabel(r.type);
                        return (
                          <li key={`${r.type}-${r.id}-${idx}`}>
                            <a
                              href={href || "#"}
                              className="group flex items-start justify-between gap-3 px-3 py-2 w-full hover:bg-blue-50 hover:shadow-sm no-underline cursor-pointer transition-all duration-150 rounded-md"
                              onClick={(e) => {
                                if (!href) {
                                  e.preventDefault();
                                  return;
                                }
                                // Allow default behavior for right-click, ctrl+click, cmd+click, etc.
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
                                setSearchOpen(false);
                                setSearchQuery("");
                                setSearchResults([]);
                                setSearchPopupOpen(false);
                                router.push(href);
                              }}
                            >
                              <span className="text-sm text-gray-900 group-hover:text-blue-700 transition-colors">
                                {r.title}
                              </span>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold tracking-wide rounded-full border shrink-0 ${badgeClassForSearchType(
                                  String(r.type || "")
                                )} ${isInsight ? "normal-case" : "uppercase"}`}
                              >
                                {badgeLabel}
                              </span>
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="px-3 py-3 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => {
                          openSearchPopup();
                        }}
                        className="w-full py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                      >
                        View more
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Search results popup */}
        {searchPopupOpen && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="search-popup-title"
            onClick={closeSearchPopup}
          >
            <div
              className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2
                  id="search-popup-title"
                  className="text-lg font-semibold text-gray-900"
                >
                  Search: &quot;{searchQuery}&quot;
                </h2>
                <button
                  type="button"
                  onClick={closeSearchPopup}
                  className="p-2 text-gray-500 rounded-md hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {popupResults.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4">No results</p>
                ) : (
                  <ul className="space-y-1">
                    {popupResults.map((r, idx) => {
                      const href = resolveSearchHref(r);
                      const t = String(r.type || "").toLowerCase().trim();
                      const isInsight =
                        t === "insight" || t === "insights" || t === "article";
                      const badgeLabel = getSearchBadgeLabel(r.type);
                      return (
                        <li key={`popup-${r.type}-${r.id}-${idx}`}>
                          <a
                            href={href || "#"}
                            className="group flex items-start justify-between gap-3 px-3 py-2.5 w-full rounded-md hover:bg-blue-50 hover:shadow-sm no-underline cursor-pointer transition-all duration-150"
                            onClick={(e) => {
                              if (!href) {
                                e.preventDefault();
                                return;
                              }
                              // Allow default behavior for right-click, ctrl+click, cmd+click, etc.
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
                              closeSearchPopup();
                              setSearchOpen(false);
                              setSearchQuery("");
                              setSearchResults([]);
                              router.push(href);
                            }}
                          >
                            <span className="text-sm text-gray-900 group-hover:text-blue-700 line-clamp-2 transition-colors">
                              {r.title}
                            </span>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold tracking-wide rounded-full border shrink-0 ${badgeClassForSearchType(
                                String(r.type || "")
                              )} ${isInsight ? "normal-case" : "uppercase"}`}
                            >
                              {badgeLabel}
                            </span>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div className="p-4 border-t border-gray-200 space-y-3">
                {searchPagination && (
                  <p className="text-xs text-gray-600">
                    Page {searchPagination.current_page} of{" "}
                    {searchPagination.total_pages || 1} · Showing{" "}
                    {popupResults.length} of {searchPagination.total_results}{" "}
                    results
                  </p>
                )}
                {searchPagination?.next_page ? (
                  <button
                    type="button"
                    onClick={handleLoadMoreInPopup}
                    disabled={popupLoadingMore}
                    className="w-full py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {popupLoadingMore ? "Loading…" : "Load more"}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2 xl:grid-cols-[repeat(20,minmax(0,1fr))]">
          {/* Asymmetrix Data */}
          <div className="bg-white rounded-lg shadow order-1 lg:col-span-2 xl:col-span-4">
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
          <div className="flex flex-col bg-white rounded-lg shadow border-2 border-blue-200 order-2 lg:col-span-1 xl:col-span-8">
            <div className="flex items-center justify-between p-3 border-b border-gray-200 sm:p-4">
              <div className="flex items-center gap-3">
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
              <a
                href="/insights-analysis"
                className="text-xs font-medium text-blue-600 underline hover:text-blue-800"
                style={{ fontWeight: "500" }}
              >
                View all
              </a>
            </div>
            <div className="flex-1 p-3 overflow-y-auto sm:p-4">
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
          <div className="flex flex-col bg-white rounded-lg shadow order-3 lg:col-span-1 xl:col-span-8">
            <div className="flex items-center justify-between p-3 border-b border-gray-200 sm:p-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-purple-100 text-purple-700">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
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
            <div className="flex-1 overflow-y-auto">
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
                              {(() => {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const ev: any = event as any;
                                return formatDate(ev.date || event.announcement_date);
                              })()}
                            </div>
                            <div>
                              <strong>Target:</strong>{" "}
                              {(() => {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const ev: any = event as any;
                                const isPartnership =
                                  (ev.deal_type || "")
                                    .toLowerCase()
                                    .trim() === "partnership";

                                const targetsArr =
                                  parseEntityArray<EntityRef>(ev.targets);

                                const targetObj = (safeParseJson<EntityRef>(
                                  ev.target
                                ) ||
                                  (typeof ev.target === "object"
                                    ? (ev.target as Record<string, unknown>)
                                    : null)) as EntityRef | null;
                                const targetLegacyName =
                                  event.Target_Counterparty?.new_company?.name;

                                const displayTargets =
                                  targetsArr.length > 0
                                    ? isPartnership
                                      ? dedupeById(targetsArr)
                                      : dedupeById(targetsArr).slice(0, 1)
                                    : [];

                                const targetName =
                                  targetObj?.name || targetLegacyName;
                                const targetHref = targetObj
                                  ? normalizeEntityHref(targetObj)
                                  : "";

                                if (displayTargets.length > 0) {
                                  return (
                                    <>
                                      {displayTargets.map((tgt, i, arr) => {
                                        const href = normalizeEntityHref(tgt);
                                        const name = tgt?.name || "Unknown";
                                        return (
                                          <span key={`m-tgt-${tgt?.id ?? i}`}>
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
                                } else if (targetName) {
                                  return targetHref ? (
                                    <a
                                      href={targetHref}
                                      className="text-blue-600 underline hover:text-blue-800"
                                      style={{ fontWeight: "500" }}
                                    >
                                      {targetName}
                                    </a>
                                  ) : (
                                    <span>{targetName}</span>
                                  );
                                }
                                return <span>Not Available</span>;
                              })()}
                            </div>
                            <div>
                              <strong>Seller(s):</strong>{" "}
                              {(() => {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const ev: any = event as any;
                                const sellersNew = parseEntityArray<EntityRef>(
                                  ev.sales
                                );

                                if (sellersNew.length === 0) {
                                  return <span>Not Available</span>;
                                }

                                return (
                                  <>
                                    {dedupeById(sellersNew).map((s, i, arr) => {
                                      const href = normalizeEntityHref(s);
                                      const name = s?.name || "Unknown";
                                      return (
                                        <span key={`m-seller-${s?.id ?? i}`}>
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
                              {(() => {
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
                                  details?.Type || ev.deal_type || ev.type;
                                return dealType || "Not Available";
                              })()}
                            </div>
                            <div>
                              <strong>Deal Stage:</strong>{" "}
                              {(() => {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const ev: any = event as any;
                                const details = safeParseJson<{
                                  Funding_Stage?: string;
                                }>(ev.deal_details);

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

                                if (!fundingStage) return "Not Available";
                                return (
                                  <span className="inline-block px-2 py-0.5 ml-1 text-[10px] font-semibold rounded-full bg-green-100 text-green-800">
                                    {fundingStage}
                                  </span>
                                );
                              })()}
                            </div>
                            <div>
                              <strong>Amount (m):</strong>{" "}
                              {(() => {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const ev: any = event as any;
                                const details = safeParseJson<{
                                  Amount?: string;
                                  Investment_Amount?: {
                                    value?: number;
                                    currency?: string;
                                    formatted?: string;
                                  };
                                }>(ev.deal_details);

                                const rawAmount = (details?.Amount || "")
                                  .toString()
                                  .trim();
                                const cleanedAmount = rawAmount.replace(
                                  /^amount:\s*/i,
                                  ""
                                );
                                const formatAmountString = (
                                  value: string
                                ): string => {
                                  const v = (value || "").trim();
                                  if (!v) return "";
                                  const m1 = v.match(
                                    /^(?:Currency:)?\s*([A-Z]{3})\s*([0-9]+(?:[.,][0-9]+)?)/i
                                  );
                                  if (m1)
                                    return `${m1[1].toUpperCase()}${m1[2]}`;
                                  const m2 = v.match(
                                    /^([0-9]+(?:[.,][0-9]+)?)\s*([A-Z]{3})$/i
                                  );
                                  if (m2)
                                    return `${m2[2].toUpperCase()}${m2[1]}`;
                                  const m3 = v.match(/^([A-Z]{3})([0-9].*)$/i);
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

                                const amount =
                                  amountFromDetailsObject ||
                                  amountFromDetailsString ||
                                  fromNew ||
                                  (event.investment_data?.investment_amount_m &&
                                  event.investment_data?.currrency?.Currency
                                    ? `${event.investment_data.currrency.Currency}${event.investment_data.investment_amount_m}`
                                    : "");

                                return amount || "Not Available";
                              })()}
                            </div>
                            <div>
                              <strong>EV (m):</strong>{" "}
                              {(() => {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const ev: any = event as any;
                                const details = safeParseJson<{
                                  Enterprise_Value?: {
                                    value?: number;
                                    currency?: string;
                                    formatted?: string;
                                  } | null;
                                }>(ev.deal_details);

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

                                return valuation || "Not Available";
                              })()}
                            </div>
                            <div>
                              <strong>Primary:</strong>{" "}
                              {(() => {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const ev: any = event as any;
                                const sectors = safeParseJson<{
                                  Primary?: string[];
                                  Secondary?: string[];
                                }>(ev.sectors);

                                const primaryNewArr = Array.isArray(sectors?.Primary)
                                  ? (sectors!.Primary as string[]).filter(Boolean)
                                  : [];

                                const primaryRefs = parseSectorRefs(ev.primary);

                                const primaryFromNew = primaryNewArr.join(", ");

                                const primary =
                                  primaryFromNew ||
                                  (primaryRefs.length > 0
                                    ? primaryRefs.map((s) => s.name).join(", ")
                                    : "") ||
                                  getEventPrimarySectors(event);

                                if (!primary || primary === "Not Available") {
                                  return "Not Available";
                                }

                                return primaryRefs.length > 0 ? (
                                  <>
                                    {primaryRefs.map((s, idx, arr) => (
                                      <span key={`m-primary-${s.id}`}>
                                        <a
                                          href={`/sector/${s.id}`}
                                          className="text-blue-600 underline hover:text-blue-800"
                                          style={{ fontWeight: "500" }}
                                        >
                                          {s.name}
                                        </a>
                                        {idx < arr.length - 1 && ", "}
                                      </span>
                                    ))}
                                  </>
                                ) : (
                                  <>
                                    {primary.split(",").map((name, idx, arr) => {
                                      const trimmed = name.trim();
                                      return (
                                        <span key={`m-primary-str-${idx}`}>
                                          {trimmed}
                                          {idx < arr.length - 1 && ", "}
                                        </span>
                                      );
                                    })}
                                  </>
                                );
                              })()}
                            </div>
                            <div>
                              <strong>Secondary:</strong>{" "}
                              {(() => {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const ev: any = event as any;
                                const sectors = safeParseJson<{
                                  Primary?: string[];
                                  Secondary?: string[];
                                }>(ev.sectors);

                                const secondaryNewArr = Array.isArray(sectors?.Secondary)
                                  ? (sectors!.Secondary as string[]).filter(Boolean)
                                  : [];

                                const secondaryRefs = parseSectorRefs(ev.secondary);

                                const secondaryFromNew = secondaryNewArr.slice(0, 3);

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
                                  secondaryFromNew.length > 0
                                    ? secondaryFromNew
                                    : secondaryRefs.length > 0
                                    ? secondaryRefs.slice(0, 3).map((s) => s.name)
                                    : secondaryLegacy;

                                if (secondary.length === 0) {
                                  return "Not Available";
                                }

                                return secondaryRefs.length > 0 ? (
                                  <>
                                    {secondaryRefs.slice(0, 3).map((s, idx, arr) => (
                                      <span key={`m-secondary-${s.id}`}>
                                        <a
                                          href={`/sub-sector/${s.id}`}
                                          className="text-blue-600 underline hover:text-blue-800"
                                          style={{ fontWeight: "500" }}
                                        >
                                          {s.name}
                                        </a>
                                        {idx < arr.length - 1 && ", "}
                                      </span>
                                    ))}
                                  </>
                                ) : (
                                  <>
                                    {secondary.map((name, idx, arr) => (
                                      <span key={`m-secondary-str-${idx}`}>
                                        {name}
                                        {idx < arr.length - 1 && ", "}
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
                        {corporateEvents.slice(0, 25).map((event, idx) => {
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          const eid = getCorporateEventId(event as any);
                          const desc = event.description;
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          const ev: any = event as any;

                          return (
                            <tr
                              key={eid ?? `ev-row-${idx}`}
                              className="hover:bg-gray-50"
                            >
                              <td className="px-4 py-4 max-w-xs text-xs text-gray-900">
                                <div className="mb-2">
                                  {(() => {
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
                                  Date: {formatDate(
                                    ev.date || event.announcement_date
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-xs text-gray-900">
                                {/* Parties column */}
                                {(() => {
                                  const isPartnership =
                                    (ev.deal_type || "")
                                      .toLowerCase()
                                      .trim() === "partnership";

                                  const targetsArr =
                                    parseEntityArray<EntityRef>(ev.targets);

                                  const targetObj = (safeParseJson<EntityRef>(
                                    ev.target
                                  ) ||
                                    (typeof ev.target === "object"
                                      ? (ev.target as Record<string, unknown>)
                                      : null)) as EntityRef | null;
                                  const targetLegacyName =
                                    event.Target_Counterparty?.new_company?.name;

                                  const buyersArr = parseEntityArray<EntityRef>(
                                    (ev as { buyers?: unknown }).buyers
                                  );
                                  const investorsArr =
                                    parseEntityArray<EntityRef>(
                                      (ev as { investors?: unknown }).investors
                                    );
                                  const buyersInvestorsCombined =
                                    parseEntityArray<EntityRef>(
                                      (ev as { buyers_investors?: unknown })
                                        .buyers_investors
                                    );
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

                                  const sellersNew = parseEntityArray<EntityRef>(
                                    ev.sales
                                  );

                                  const advisors = (
                                    event.Advisors_of_Corporate_Event || []
                                  )
                                    .map((a) => a._new_company?.name)
                                    .filter(Boolean);

                                  const displayTargets =
                                    targetsArr.length > 0
                                      ? isPartnership
                                        ? dedupeById(targetsArr)
                                        : dedupeById(targetsArr).slice(0, 1)
                                      : [];

                                  const targetName =
                                    targetObj?.name || targetLegacyName;
                                  const targetHref = targetObj
                                    ? normalizeEntityHref(targetObj)
                                    : "";

                                  return (
                                    <div className="space-y-1">
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

                                  const rawAmount = (details?.Amount || "")
                                    .toString()
                                    .trim();
                                  const cleanedAmount = rawAmount.replace(
                                    /^amount:\s*/i,
                                    ""
                                  );
                                  const formatAmountString = (
                                    value: string
                                  ): string => {
                                    const v = (value || "").trim();
                                    if (!v) return "";
                                    const m1 = v.match(
                                      /^(?:Currency:)?\s*([A-Z]{3})\s*([0-9]+(?:[.,][0-9]+)?)/i
                                    );
                                    if (m1)
                                      return `${m1[1].toUpperCase()}${m1[2]}`;
                                    const m2 = v.match(
                                      /^([0-9]+(?:[.,][0-9]+)?)\s*([A-Z]{3})$/i
                                    );
                                    if (m2)
                                      return `${m2[2].toUpperCase()}${m2[1]}`;
                                    const m3 = v.match(/^([A-Z]{3})([0-9].*)$/i);
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
                                          <strong>EV (m):</strong> {valuation}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </td>
                              <td className="px-4 py-4 text-xs text-gray-900">
                                {/* Sectors column */}
                                {(() => {
                                  const sectors = safeParseJson<{
                                    Primary?: string[];
                                    Secondary?: string[];
                                  }>(ev.sectors);

                                  const primaryNewArr = Array.isArray(sectors?.Primary)
                                    ? (sectors!.Primary as string[]).filter(Boolean)
                                    : [];
                                  const secondaryNewArr = Array.isArray(sectors?.Secondary)
                                    ? (sectors!.Secondary as string[]).filter(Boolean)
                                    : [];

                                  const primaryRefs = parseSectorRefs(ev.primary);
                                  const secondaryRefs = parseSectorRefs(ev.secondary);

                                  const primaryFromNew = primaryNewArr.join(", ");
                                  const secondaryFromNew = secondaryNewArr.slice(0, 3);

                                  const primary =
                                    primaryFromNew ||
                                    (primaryRefs.length > 0
                                      ? primaryRefs.map((s) => s.name).join(", ")
                                      : "") ||
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
                                    secondaryFromNew.length > 0
                                      ? secondaryFromNew
                                      : secondaryRefs.length > 0
                                      ? secondaryRefs.slice(0, 3).map((s) => s.name)
                                      : secondaryLegacy;
                                  return (
                                    <div className="space-y-1">
                                      {primary && primary !== "Not Available" && (
                                        <div className="text-xs text-gray-500">
                                          <strong>Primary:</strong>{" "}
                                          {primaryRefs.length > 0
                                            ? primaryRefs.map((s, idx, arr) => (
                                                <span key={`primary-${s.id}`}>
                                                  <a
                                                    href={`/sector/${s.id}`}
                                                    className="text-blue-600 underline hover:text-blue-800"
                                                  >
                                                    {s.name}
                                                  </a>
                                                  {idx < arr.length - 1 && ", "}
                                                </span>
                                              ))
                                            : primary.split(",").map((name, idx, arr) => {
                                                const trimmed = name.trim();
                                                return (
                                                  <span key={`primary-${idx}`}>
                                                    {trimmed}
                                                    {idx < arr.length - 1 && ", "}
                                                  </span>
                                                );
                                              })}
                                        </div>
                                      )}
                                      {secondary.length > 0 && (
                                        <div className="text-xs text-gray-500">
                                          <strong>Secondary:</strong>{" "}
                                          {secondaryRefs.length > 0
                                            ? secondaryRefs.slice(0, 3).map((s, idx, arr) => (
                                                <span key={`secondary-${s.id}`}>
                                                  <a
                                                    href={`/sub-sector/${s.id}`}
                                                    className="text-blue-600 underline hover:text-blue-800"
                                                  >
                                                    {s.name}
                                                  </a>
                                                  {idx < arr.length - 1 && ", "}
                                                </span>
                                              ))
                                            : secondary.map((name, idx, arr) => (
                                                <span key={`secondary-${idx}`}>
                                                  {name}
                                                  {idx < arr.length - 1 && ", "}
                                                </span>
                                              ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </td>
                            </tr>
                          );
                        })}
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
        </div>
      </main>
      <Footer />
    </div>
  );
}
