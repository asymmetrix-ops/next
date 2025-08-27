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
  id: number;
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

interface NewCompany {
  id: number;
  name: string;
  created_at: number;
  _locations: {
    Country: string;
  };
  _linkedin_data_of_new_company?: {
    linkedin_employee: number;
    linkedin_logo: string;
  };
  _sectors_primary?: Array<{
    sector_name: string;
  }>;
  _sectors_secondary?: Array<{
    sector_name: string;
  }>;
}

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

  // Helper function to get related primary sector from secondary sectors
  const getRelatedPrimarySectors = (
    secondarySectors: { sector_name: string }[] | undefined
  ) => {
    if (!secondarySectors || secondarySectors.length === 0)
      return "Not available";

    // Mapping based on known relationships between secondary and primary sectors
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
      .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates

    return relatedPrimary.join(", ");
  };

  // Corporate Event navigation handler
  const handleCorporateEventClick = useCallback(
    (eventId: number) => {
      router.push(`/corporate-event/${eventId}`);
    },
    [router]
  );

  const [isLoading, setIsLoading] = useState(true);
  const [asymmetrixData, setAsymmetrixData] = useState<AsymmetrixData[]>([]);
  const [corporateEvents, setCorporateEvents] = useState<CorporateEvent[]>([]);
  const [insightsArticles, setInsightsArticles] = useState<InsightArticle[]>(
    []
  );
  const [newCompanies, setNewCompanies] = useState<NewCompany[]>([]);

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
        newCompaniesResponse,
      ] = await Promise.allSettled([
        dashboardApiService.getHeroScreenStatisticCompanies(),
        dashboardApiService.getHeroScreenStatisticEventsCount(),
        dashboardApiService.getAllIndividualsCount(),
        dashboardApiService.getHeroScreenStatisticSectors(),
        dashboardApiService.getHeroScreenStatisticAdvisorsCount(),
        dashboardApiService.getHeroScreenStatisticInvestors(),
        dashboardApiService.getCorporateEvents(),
        dashboardApiService.getAllContentArticlesHome(),
        dashboardApiService.getRecentlyAddedCompanies(),
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

      // Handle new companies
      if (newCompaniesResponse.status === "fulfilled") {
        // Try different possible structures
        let newCompaniesData: NewCompany[] = [];
        const responseValue = newCompaniesResponse.value as unknown as Record<
          string,
          unknown
        >;

        if (responseValue.data) {
          newCompaniesData = responseValue.data as NewCompany[];
        } else if (Array.isArray(responseValue)) {
          newCompaniesData = responseValue as NewCompany[];
        }

        setNewCompanies(newCompaniesData || []);
      } else {
        setNewCompanies([]);
      }
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
          <div className="bg-white rounded-lg shadow">
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
                      {corporateEvents.slice(0, 10).map((event) => (
                        <div
                          key={event.id}
                          className="p-3 space-y-2 bg-gray-50 rounded-lg"
                        >
                          <div className="flex justify-between items-start">
                            <a
                              href={`/corporate-event/${event.id}`}
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
                                handleCorporateEventClick(event.id);
                              }}
                            >
                              {event.description}
                            </a>
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
                              <strong>Amount:</strong>{" "}
                              {event.investment_data?.investment_amount_m &&
                              event.investment_data?.currrency?.Currency
                                ? `${event.investment_data.investment_amount_m} ${event.investment_data.currrency.Currency}`
                                : "Not Available"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Desktop view - table */}
                  <div className="hidden lg:block overflow-x-auto max-h-[800px]">
                    <table className="w-full min-w-max">
                      <thead className="sticky top-0 bg-gray-50">
                        <tr>
                          <th className="px-4 py-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            Event Details
                          </th>
                          <th className="px-4 py-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            Target & Sectors
                          </th>
                          <th className="px-4 py-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            Financial Data
                          </th>
                          <th className="px-4 py-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            Parties Involved
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {corporateEvents.slice(0, 25).map((event) => (
                          <tr key={event.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 max-w-xs text-xs text-gray-900">
                              <div className="mb-2">
                                <a
                                  href={`/corporate-event/${event.id}`}
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
                                    handleCorporateEventClick(event.id);
                                  }}
                                >
                                  {event.description}
                                </a>
                              </div>
                              <div className="mb-1 text-xs text-gray-500">
                                Date: {formatDate(event.announcement_date)}
                              </div>
                              <div className="text-xs text-gray-500">
                                Type: {event.deal_type || "Not Available"}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-xs text-gray-900">
                              <div className="mb-2">
                                <span className="font-medium">
                                  {event.Target_Counterparty?.new_company
                                    ?.name || "Not Available"}
                                </span>
                              </div>
                              <div className="mb-1 text-xs text-gray-500">
                                <strong>Primary:</strong>{" "}
                                {event.Target_Counterparty?.new_company?._sectors_objects?.sectors_id?.find(
                                  (sector) =>
                                    sector.Sector_importance === "Primary"
                                )?.sector_name || "Not Available"}
                              </div>
                              <div className="text-xs text-gray-500">
                                <strong>Secondary:</strong>{" "}
                                {event.Target_Counterparty?.new_company?._sectors_objects?.sectors_id
                                  ?.filter(
                                    (sector) =>
                                      sector.Sector_importance !== "Primary"
                                  )
                                  .map((sector) => sector.sector_name)
                                  .join(", ") || "Not Available"}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-xs text-gray-900">
                              <div className="mb-2">
                                <div className="mb-1 text-xs text-gray-500">
                                  <strong>Investment:</strong>{" "}
                                  {event.investment_data?.investment_amount_m &&
                                  event.investment_data?.currrency?.Currency
                                    ? `${event.investment_data.investment_amount_m} ${event.investment_data.currrency.Currency}`
                                    : "Not Available"}
                                </div>
                                <div className="text-xs text-gray-500">
                                  <strong>EV:</strong>{" "}
                                  {event.ev_data?.enterprise_value_m &&
                                  event.ev_data?.Currency
                                    ? `${event.ev_data.enterprise_value_m} ${event.ev_data.Currency}`
                                    : "Not Available"}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-xs text-gray-900">
                              <div className="mb-2">
                                <div className="mb-1 text-xs text-gray-500">
                                  <strong>Other Parties:</strong>
                                </div>
                                <div className="text-xs text-gray-600">
                                  {event.Other_Counterparties_of_Corporate_Event &&
                                  event.Other_Counterparties_of_Corporate_Event
                                    .length > 0
                                    ? event.Other_Counterparties_of_Corporate_Event.map(
                                        (cp) => cp._new_company?.name
                                      )
                                        .filter(Boolean)
                                        .map((companyName, index, array) => (
                                          <span
                                            key={`${event.id}-counterparty-${index}`}
                                          >
                                            <a
                                              href={`/companies?search=${encodeURIComponent(
                                                companyName!
                                              )}`}
                                              className="text-blue-600 underline hover:text-blue-800"
                                              style={{ fontWeight: "500" }}
                                            >
                                              {companyName}
                                            </a>
                                            {index < array.length - 1 && ", "}
                                          </span>
                                        ))
                                    : "Not Available"}
                                </div>
                              </div>
                              <div>
                                <div className="mb-1 text-xs text-gray-500">
                                  <strong>Advisors:</strong>
                                </div>
                                <div className="text-xs text-gray-600">
                                  {event.Advisors_of_Corporate_Event &&
                                  event.Advisors_of_Corporate_Event.length > 0
                                    ? event.Advisors_of_Corporate_Event.map(
                                        (advisor) => advisor._new_company?.name
                                      )
                                        .filter(Boolean)
                                        .join(", ")
                                    : "Not Available"}
                                </div>
                              </div>
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
                        href={`/article/${article.id}`}
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
                          router.push(`/article/${article.id}`);
                        }}
                      >
                        {article.Headline}
                      </a>
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
                          href={`/article/${article.id}`}
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
                            router.push(`/article/${article.id}`);
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

          {/* New Companies Added */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-3 border-b border-gray-200 sm:p-4">
              <div className="flex items-center space-x-2">
                <span className="text-lg text-green-600">+</span>
                <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
                  New Companies Added
                </h2>
              </div>
            </div>
            <div className="p-3 sm:p-4">
              {newCompanies.length > 0 ? (
                <div className="relative">
                  {/* Vertical timeline line */}
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-green-500"></div>

                  <div className="pl-6 space-y-4 sm:space-y-6">
                    {newCompanies.map((company) => (
                      <div
                        key={company.id}
                        className="flex items-start space-x-3"
                      >
                        {/* Company icon/logo */}
                        <div className="flex-shrink-0">
                          {company._linkedin_data_of_new_company
                            ?.linkedin_logo ? (
                            <img
                              src={`data:image/jpeg;base64,${company._linkedin_data_of_new_company.linkedin_logo}`}
                              alt={company.name}
                              className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                              onError={(e) => {
                                // Fallback to a placeholder if the image fails to load
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="flex justify-center items-center w-6 h-6 bg-gray-300 rounded-full border-2 border-white shadow-sm">
                              <span className="text-xs font-medium text-gray-600">
                                {company.name.charAt(0)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Company details */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900">
                            <a
                              href={`/company/${company.id}`}
                              style={{
                                fontWeight: "500",
                                textDecoration: "underline",
                              }}
                            >
                              {company.name}
                            </a>
                          </div>
                          <p className="text-xs text-gray-500">
                            {company._locations?.Country}
                          </p>
                          {/* Display related primary sector based on secondary sectors (e.g., Crypto -> Web 3) */}
                          <p className="text-xs font-medium text-blue-600">
                            {getRelatedPrimarySectors(
                              company._sectors_secondary
                            )}
                          </p>
                          {company._linkedin_data_of_new_company
                            ?.linkedin_employee && (
                            <p className="text-xs text-gray-400">
                              LinkedIn Members:{" "}
                              {
                                company._linkedin_data_of_new_company
                                  .linkedin_employee
                              }
                            </p>
                          )}
                          <p className="text-xs text-gray-400">
                            Date added:{" "}
                            {new Date(company.created_at).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center sm:py-8">
                  <p className="text-sm text-gray-500">
                    No new companies available
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
