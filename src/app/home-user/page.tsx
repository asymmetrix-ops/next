"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { dashboardApiService } from "@/lib/dashboardApi";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

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
}

export default function HomeUserPage() {
  const router = useRouter();
  const { isAuthenticated, logout, loading: authLoading } = useAuth();

  // Corporate Event navigation handler
  const handleCorporateEventClick = useCallback(
    (eventId: number) => {
      router.push(`/corporate-event/${eventId}`);
    },
    [router]
  );

  // Company/Investor navigation handler
  const handleCompanyClick = useCallback(
    async (companyName: string) => {
      try {
        // Search for the company in investors
        const response = await fetch(
          `https://xdil-abvj-o7rq.e2.xano.io/api:617tZc8l/get_all_investors?search_query=${encodeURIComponent(
            companyName
          )}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("authToken")}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const exactMatch = data.investors?.items?.find(
            (investor: {
              company_name?: string;
              original_new_company_id?: number;
            }) =>
              investor.company_name?.toLowerCase() === companyName.toLowerCase()
          );

          if (exactMatch?.original_new_company_id) {
            router.push(`/investors/${exactMatch.original_new_company_id}`);
            return;
          }
        }

        // If not found in investors, try companies
        const companiesResponse = await fetch(
          `https://xdil-abvj-o7rq.e2.xano.io/api:617tZc8l/get_all_companies?search_query=${encodeURIComponent(
            companyName
          )}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("authToken")}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (companiesResponse.ok) {
          const companiesData = await companiesResponse.json();
          const exactMatch = companiesData.items?.find(
            (company: { name?: string; id?: number }) =>
              company.name?.toLowerCase() === companyName.toLowerCase()
          );

          if (exactMatch?.id) {
            router.push(`/company/${exactMatch.id}`);
            return;
          }
        }

        // If no exact match found, navigate to general companies page with search
        router.push(`/companies?search=${encodeURIComponent(companyName)}`);
      } catch (error) {
        console.error("Error searching for company:", error);
        // Fallback to companies page with search
        router.push(`/companies?search=${encodeURIComponent(companyName)}`);
      }
    },
    [router]
  );

  // Insights company navigation handler - prioritizes dynamic company pages
  const handleInsightsCompanyClick = useCallback(
    async (companyName: string) => {
      try {
        // First search in companies (prioritize company pages for insights)
        const companiesResponse = await fetch(
          `https://xdil-abvj-o7rq.e2.xano.io/api:617tZc8l/get_all_companies?search_query=${encodeURIComponent(
            companyName
          )}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("authToken")}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (companiesResponse.ok) {
          const companiesData = await companiesResponse.json();
          const exactMatch = companiesData.items?.find(
            (company: { name?: string; id?: number }) =>
              company.name?.toLowerCase() === companyName.toLowerCase()
          );

          if (exactMatch?.id) {
            router.push(`/company/${exactMatch.id}`);
            return;
          }
        }

        // If not found in companies, try investors as fallback
        const response = await fetch(
          `https://xdil-abvj-o7rq.e2.xano.io/api:617tZc8l/get_all_investors?search_query=${encodeURIComponent(
            companyName
          )}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("authToken")}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const exactMatch = data.investors?.items?.find(
            (investor: {
              company_name?: string;
              original_new_company_id?: number;
            }) =>
              investor.company_name?.toLowerCase() === companyName.toLowerCase()
          );

          if (exactMatch?.original_new_company_id) {
            router.push(`/investors/${exactMatch.original_new_company_id}`);
            return;
          }
        }

        // If no exact match found, navigate to general companies page with search
        router.push(`/companies?search=${encodeURIComponent(companyName)}`);
      } catch (error) {
        console.error("Error searching for company:", error);
        // Fallback to companies page with search
        router.push(`/companies?search=${encodeURIComponent(companyName)}`);
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
  const [newCompanies, setNewCompanies] = useState<NewCompany[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredInsights, setFilteredInsights] = useState<InsightArticle[]>(
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Filter insights based on search query
    if (searchQuery.trim()) {
      const filtered = insightsArticles.filter((article) =>
        article.Headline.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredInsights(filtered);
    } else {
      setFilteredInsights(insightsArticles);
    }
  };

  // Update filtered insights when insightsArticles changes
  useEffect(() => {
    setFilteredInsights(insightsArticles);
  }, [insightsArticles]);

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
      <main className="px-4 py-8 mx-auto w-full">
        {/* Dashboard Subheader */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Asymmetrix Dashboard
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-4 lg:grid-cols-2">
          {/* Asymmetrix Data */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Asymmetrix Data
              </h2>
            </div>
            <div className="p-4">
              {asymmetrixData.length > 0 ? (
                <div className="space-y-3">
                  {asymmetrixData.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-2 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{item.icon}</span>
                        <span className="text-xs text-gray-600">
                          {item.label}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm text-gray-500">
                    No statistics available
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Corporate Events */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Corporate Events
              </h2>
            </div>
            <div className="overflow-x-auto max-h-[800px]">
              {corporateEvents.length > 0 ? (
                <table className="w-full min-w-max">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr>
                      <th className="px-4 py-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Description
                      </th>
                      <th className="px-4 py-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-4 py-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Target
                      </th>
                      <th className="px-4 py-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Primary Sector
                      </th>
                      <th className="px-4 py-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Secondary Sectors
                      </th>
                      <th className="px-4 py-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Type
                      </th>
                      <th className="px-4 py-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Amount
                      </th>
                      <th className="px-4 py-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Enterprise Value
                      </th>
                      <th className="px-4 py-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Other Counterparties
                      </th>
                      <th className="px-4 py-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Advisors
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {corporateEvents.slice(0, 25).map((event) => (
                      <tr key={event.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 max-w-xs text-xs text-gray-900">
                          <span
                            onClick={() => handleCorporateEventClick(event.id)}
                            className="text-blue-600 underline cursor-pointer hover:text-blue-800"
                            style={{
                              textDecoration: "underline",
                              color: "#0075df",
                              cursor: "pointer",
                              fontWeight: "500",
                            }}
                          >
                            {event.description}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-xs text-gray-500">
                          {event.announcement_date || "Not Available"}
                        </td>
                        <td className="px-4 py-4 text-xs text-gray-900">
                          {event.Target_Counterparty?.new_company?.name ||
                            "Not Available"}
                        </td>
                        <td className="px-4 py-4 text-xs text-gray-900">
                          {event.Target_Counterparty?.new_company?._sectors_objects?.sectors_id?.find(
                            (sector) => sector.Sector_importance === "Primary"
                          )?.sector_name || "Not Available"}
                        </td>
                        <td className="px-4 py-4 text-xs text-gray-900">
                          {event.Target_Counterparty?.new_company?._sectors_objects?.sectors_id
                            ?.filter(
                              (sector) => sector.Sector_importance !== "Primary"
                            )
                            .map((sector) => sector.sector_name)
                            .join(", ") || "Not Available"}
                        </td>
                        <td className="px-4 py-4 text-xs text-gray-900">
                          {event.deal_type || "Not Available"}
                        </td>
                        <td className="px-4 py-4 text-xs text-gray-900">
                          {event.investment_data?.investment_amount_m &&
                          event.investment_data?.currrency?.Currency
                            ? `${event.investment_data.investment_amount_m} ${event.investment_data.currrency.Currency}`
                            : "Not Available"}
                        </td>
                        <td className="px-4 py-4 text-xs text-gray-900">
                          {event.ev_data?.enterprise_value_m &&
                          event.ev_data?.Currency
                            ? `${event.ev_data.enterprise_value_m} ${event.ev_data.Currency}`
                            : "Not Available"}
                        </td>
                        <td className="px-4 py-4 text-xs text-gray-900">
                          {event.Other_Counterparties_of_Corporate_Event &&
                          event.Other_Counterparties_of_Corporate_Event.length >
                            0
                            ? event.Other_Counterparties_of_Corporate_Event.map(
                                (cp) => cp._new_company?.name
                              )
                                .filter(Boolean)
                                .map((companyName, index, array) => (
                                  <span
                                    key={`${event.id}-counterparty-${index}`}
                                  >
                                    <span
                                      onClick={() =>
                                        handleCompanyClick(companyName!)
                                      }
                                      className="text-blue-600 underline cursor-pointer hover:text-blue-800"
                                      style={{
                                        textDecoration: "underline",
                                        color: "#0075df",
                                        cursor: "pointer",
                                        fontWeight: "500",
                                      }}
                                    >
                                      {companyName}
                                    </span>
                                    {index < array.length - 1 && ", "}
                                  </span>
                                ))
                            : "Not Available"}
                        </td>
                        <td className="px-4 py-4 text-xs text-gray-900">
                          {event.Advisors_of_Corporate_Event &&
                          event.Advisors_of_Corporate_Event.length > 0
                            ? event.Advisors_of_Corporate_Event.map(
                                (advisor) => advisor._new_company?.name
                              )
                                .filter(Boolean)
                                .join(", ")
                            : "Not Available"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
            <div className="p-4 border-b border-gray-200">
              <h2 className="mb-3 text-lg font-bold text-gray-900">
                Insights & Analysis
              </h2>
              <div className="space-y-2">
                <span className="text-sm text-gray-700">
                  Search for Articles:
                </span>
                <form onSubmit={handleSearch} className="flex max-w-xs">
                  <input
                    type="text"
                    placeholder="Keyword search"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (e.target.value.trim()) {
                        const filtered = insightsArticles.filter((article) =>
                          article.Headline.toLowerCase().includes(
                            e.target.value.toLowerCase()
                          )
                        );
                        setFilteredInsights(filtered);
                      } else {
                        setFilteredInsights(insightsArticles);
                      }
                    }}
                    className="flex-1 px-3 py-1 text-sm rounded-l-md border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1 text-sm text-white bg-blue-600 rounded-r-md hover:bg-blue-700"
                  >
                    Search
                  </button>
                </form>
              </div>
            </div>
            <div className="p-4">
              {filteredInsights.length > 0 ? (
                <div className="space-y-3">
                  {filteredInsights.slice(0, 10).map((article) => (
                    <div key={article.id} className="p-3 bg-gray-50 rounded-lg">
                      {article.image && (
                        <img
                          src={article.image}
                          alt={article.Headline}
                          className="object-cover mb-2 w-full h-20 rounded"
                        />
                      )}
                      <h3 className="mb-1 text-xs font-medium text-gray-900">
                        {article.Headline}
                      </h3>
                      {article.Strapline && (
                        <p className="mb-1 text-xs text-gray-600">
                          {article.Strapline.substring(0, 150)}
                          {article.Strapline.length > 150 ? "..." : ""}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {article.Publication_Date}
                      </p>
                      {article.companies_mentioned &&
                        article.companies_mentioned.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {article.companies_mentioned.map(
                              (company, index) => (
                                <span
                                  key={company.id}
                                  onClick={() =>
                                    handleInsightsCompanyClick(company.name)
                                  }
                                  className="text-xs text-blue-600 cursor-pointer hover:text-blue-800"
                                  style={{
                                    textDecoration: "underline",
                                    fontWeight: "500",
                                  }}
                                >
                                  {company.name}
                                  {index <
                                    article.companies_mentioned!.length - 1 &&
                                    ", "}
                                </span>
                              )
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
                      {article.related_documents &&
                        article.related_documents.length > 0 && (
                          <a
                            href={article.related_documents[0].url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-1 text-xs text-blue-600 hover:text-blue-800"
                          >
                            Read full article →
                          </a>
                        )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm text-gray-500">No insights available</p>
                </div>
              )}
            </div>
          </div>

          {/* New Companies Added */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <span className="text-lg text-green-600">+</span>
                <h2 className="text-lg font-semibold text-gray-900">
                  New Companies Added
                </h2>
              </div>
            </div>
            <div className="p-4">
              {newCompanies.length > 0 ? (
                <div className="relative">
                  {/* Vertical timeline line */}
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-green-500"></div>

                  <div className="pl-6 space-y-6">
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
                          <p className="text-sm font-medium text-gray-900">
                            {company.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {company._locations?.Country}
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
                <div className="py-8 text-center">
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
