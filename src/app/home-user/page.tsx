"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/auth";
import { dashboardApiService } from "@/lib/dashboardApi";

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
}

interface NewCompany {
  id: number;
  name: string;
  created_at: number;
  sectors_id: Array<{
    id: number;
    sector_name: string;
    Sector_importance: string;
  }>;
  _locations: {
    Country: string;
  };
  linkedin_data?: {
    LinkedIn_Employee: number;
    linkedin_logo: string;
  };
  _linkedin_data_of_new_company?: {
    linkedin_employee: number;
    linkedin_logo: string;
  };
}

export default function HomeUserPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [asymmetrixData, setAsymmetrixData] = useState<AsymmetrixData[]>([]);
  const [corporateEvents, setCorporateEvents] = useState<CorporateEvent[]>([]);
  const [insightsArticles, setInsightsArticles] = useState<InsightArticle[]>(
    []
  );
  const [newCompanies] = useState<NewCompany[]>([
    {
      id: 1,
      name: "Idera, Inc",
      created_at: Date.now() - 86400000, // 1 day ago
      sectors_id: [
        {
          id: 1,
          sector_name: "Technology",
          Sector_importance: "Primary",
        },
      ],
      _locations: {
        Country: "US",
      },
      _linkedin_data_of_new_company: {
        linkedin_employee: 150,
        linkedin_logo: "https://via.placeholder.com/24x24/0077B5/FFFFFF?text=I",
      },
    },
    {
      id: 2,
      name: "Nest Data",
      created_at: Date.now() - 172800000, // 2 days ago
      sectors_id: [
        {
          id: 2,
          sector_name: "Data Analytics",
          Sector_importance: "Primary",
        },
      ],
      _locations: {
        Country: "UK",
      },
      _linkedin_data_of_new_company: {
        linkedin_employee: 89,
        linkedin_logo: "https://via.placeholder.com/24x24/0077B5/FFFFFF?text=N",
      },
    },
    {
      id: 3,
      name: "Coremetrix",
      created_at: Date.now() - 259200000, // 3 days ago
      sectors_id: [
        {
          id: 3,
          sector_name: "Healthcare",
          Sector_importance: "Primary",
        },
      ],
      _locations: {
        Country: "UK",
      },
      _linkedin_data_of_new_company: {
        linkedin_employee: 234,
        linkedin_logo: "https://via.placeholder.com/24x24/0077B5/FFFFFF?text=C",
      },
    },
    {
      id: 4,
      name: "TechFlow Solutions",
      created_at: Date.now() - 345600000, // 4 days ago
      sectors_id: [
        {
          id: 4,
          sector_name: "Fintech",
          Sector_importance: "Primary",
        },
      ],
      _locations: {
        Country: "US",
      },
      _linkedin_data_of_new_company: {
        linkedin_employee: 67,
        linkedin_logo: "https://via.placeholder.com/24x24/0077B5/FFFFFF?text=T",
      },
    },
    {
      id: 5,
      name: "GreenEnergy Corp",
      created_at: Date.now() - 432000000, // 5 days ago
      sectors_id: [
        {
          id: 5,
          sector_name: "Clean Energy",
          Sector_importance: "Primary",
        },
      ],
      _locations: {
        Country: "Germany",
      },
      _linkedin_data_of_new_company: {
        linkedin_employee: 189,
        linkedin_logo: "https://via.placeholder.com/24x24/0077B5/FFFFFF?text=G",
      },
    },
    {
      id: 6,
      name: "DataVault Systems",
      created_at: Date.now() - 518400000, // 6 days ago
      sectors_id: [
        {
          id: 6,
          sector_name: "Cybersecurity",
          Sector_importance: "Primary",
        },
      ],
      _locations: {
        Country: "Israel",
      },
      _linkedin_data_of_new_company: {
        linkedin_employee: 112,
        linkedin_logo: "https://via.placeholder.com/24x24/0077B5/FFFFFF?text=D",
      },
    },
    {
      id: 7,
      name: "BioTech Innovations",
      created_at: Date.now() - 604800000, // 7 days ago
      sectors_id: [
        {
          id: 7,
          sector_name: "Biotechnology",
          Sector_importance: "Primary",
        },
      ],
      _locations: {
        Country: "Switzerland",
      },
      _linkedin_data_of_new_company: {
        linkedin_employee: 78,
        linkedin_logo: "https://via.placeholder.com/24x24/0077B5/FFFFFF?text=B",
      },
    },
    {
      id: 8,
      name: "CloudSync Inc",
      created_at: Date.now() - 691200000, // 8 days ago
      sectors_id: [
        {
          id: 8,
          sector_name: "Cloud Computing",
          Sector_importance: "Primary",
        },
      ],
      _locations: {
        Country: "Canada",
      },
      _linkedin_data_of_new_company: {
        linkedin_employee: 203,
        linkedin_logo: "https://via.placeholder.com/24x24/0077B5/FFFFFF?text=C",
      },
    },
    {
      id: 9,
      name: "SmartCity Labs",
      created_at: Date.now() - 777600000, // 9 days ago
      sectors_id: [
        {
          id: 9,
          sector_name: "Smart Cities",
          Sector_importance: "Primary",
        },
      ],
      _locations: {
        Country: "Netherlands",
      },
      _linkedin_data_of_new_company: {
        linkedin_employee: 145,
        linkedin_logo: "https://via.placeholder.com/24x24/0077B5/FFFFFF?text=S",
      },
    },
    {
      id: 10,
      name: "Quantum Computing Ltd",
      created_at: Date.now() - 864000000, // 10 days ago
      sectors_id: [
        {
          id: 10,
          sector_name: "Quantum Computing",
          Sector_importance: "Primary",
        },
      ],
      _locations: {
        Country: "UK",
      },
      _linkedin_data_of_new_company: {
        linkedin_employee: 92,
        linkedin_logo: "https://via.placeholder.com/24x24/0077B5/FFFFFF?text=Q",
      },
    },
    {
      id: 11,
      name: "AI Solutions Pro",
      created_at: Date.now() - 950400000, // 11 days ago
      sectors_id: [
        {
          id: 11,
          sector_name: "Artificial Intelligence",
          Sector_importance: "Primary",
        },
      ],
      _locations: {
        Country: "US",
      },
      _linkedin_data_of_new_company: {
        linkedin_employee: 167,
        linkedin_logo: "https://via.placeholder.com/24x24/0077B5/FFFFFF?text=A",
      },
    },
    {
      id: 12,
      name: "Blockchain Ventures",
      created_at: Date.now() - 1036800000, // 12 days ago
      sectors_id: [
        {
          id: 12,
          sector_name: "Blockchain",
          Sector_importance: "Primary",
        },
      ],
      _locations: {
        Country: "Singapore",
      },
      _linkedin_data_of_new_company: {
        linkedin_employee: 134,
        linkedin_logo: "https://via.placeholder.com/24x24/0077B5/FFFFFF?text=B",
      },
    },
    {
      id: 13,
      name: "Robotics Dynamics",
      created_at: Date.now() - 1123200000, // 13 days ago
      sectors_id: [
        {
          id: 13,
          sector_name: "Robotics",
          Sector_importance: "Primary",
        },
      ],
      _locations: {
        Country: "Japan",
      },
      _linkedin_data_of_new_company: {
        linkedin_employee: 256,
        linkedin_logo: "https://via.placeholder.com/24x24/0077B5/FFFFFF?text=R",
      },
    },
    {
      id: 14,
      name: "E-commerce Plus",
      created_at: Date.now() - 1209600000, // 14 days ago
      sectors_id: [
        {
          id: 14,
          sector_name: "E-commerce",
          Sector_importance: "Primary",
        },
      ],
      _locations: {
        Country: "Brazil",
      },
      _linkedin_data_of_new_company: {
        linkedin_employee: 98,
        linkedin_logo: "https://via.placeholder.com/24x24/0077B5/FFFFFF?text=E",
      },
    },
    {
      id: 15,
      name: "Digital Marketing Hub",
      created_at: Date.now() - 1296000000, // 15 days ago
      sectors_id: [
        {
          id: 15,
          sector_name: "Digital Marketing",
          Sector_importance: "Primary",
        },
      ],
      _locations: {
        Country: "Australia",
      },
      _linkedin_data_of_new_company: {
        linkedin_employee: 73,
        linkedin_logo: "https://via.placeholder.com/24x24/0077B5/FFFFFF?text=D",
      },
    },
    {
      id: 16,
      name: "IoT Connect",
      created_at: Date.now() - 1382400000, // 16 days ago
      sectors_id: [
        {
          id: 16,
          sector_name: "Internet of Things",
          Sector_importance: "Primary",
        },
      ],
      _locations: {
        Country: "South Korea",
      },
      _linkedin_data_of_new_company: {
        linkedin_employee: 181,
        linkedin_logo: "https://via.placeholder.com/24x24/0077B5/FFFFFF?text=I",
      },
    },
    {
      id: 17,
      name: "VR Experience Lab",
      created_at: Date.now() - 1468800000, // 17 days ago
      sectors_id: [
        {
          id: 17,
          sector_name: "Virtual Reality",
          Sector_importance: "Primary",
        },
      ],
      _locations: {
        Country: "France",
      },
      _linkedin_data_of_new_company: {
        linkedin_employee: 119,
        linkedin_logo: "https://via.placeholder.com/24x24/0077B5/FFFFFF?text=V",
      },
    },
    {
      id: 18,
      name: "Mobile Gaming Studio",
      created_at: Date.now() - 1555200000, // 18 days ago
      sectors_id: [
        {
          id: 18,
          sector_name: "Mobile Gaming",
          Sector_importance: "Primary",
        },
      ],
      _locations: {
        Country: "Finland",
      },
      _linkedin_data_of_new_company: {
        linkedin_employee: 156,
        linkedin_logo: "https://via.placeholder.com/24x24/0077B5/FFFFFF?text=M",
      },
    },
    {
      id: 19,
      name: "Supply Chain Tech",
      created_at: Date.now() - 1641600000, // 19 days ago
      sectors_id: [
        {
          id: 19,
          sector_name: "Supply Chain",
          Sector_importance: "Primary",
        },
      ],
      _locations: {
        Country: "India",
      },
      _linkedin_data_of_new_company: {
        linkedin_employee: 223,
        linkedin_logo: "https://via.placeholder.com/24x24/0077B5/FFFFFF?text=S",
      },
    },
    {
      id: 20,
      name: "EdTech Solutions",
      created_at: Date.now() - 1728000000, // 20 days ago
      sectors_id: [
        {
          id: 20,
          sector_name: "Education Technology",
          Sector_importance: "Primary",
        },
      ],
      _locations: {
        Country: "Canada",
      },
      _linkedin_data_of_new_company: {
        linkedin_employee: 87,
        linkedin_logo: "https://via.placeholder.com/24x24/0077B5/FFFFFF?text=E",
      },
    },
  ]);
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
        console.log(
          "Full companies count response:",
          companiesCountResponse.value
        );
        // Raw number response
        let companiesCount: number = 0;
        const responseValue = companiesCountResponse.value as unknown as number;
        companiesCount = responseValue || 0;

        console.log("Companies count response:", companiesCount);
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

        console.log("Events count response:", eventsCount);
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

      console.log("Final statsData:", statsData);
      setAsymmetrixData(statsData);

      // Handle corporate events
      if (eventsResponse.status === "fulfilled") {
        console.log("Full corporate events response:", eventsResponse.value);
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

        console.log("Corporate events response:", eventsData);
        setCorporateEvents(eventsData || []);
      } else {
        setCorporateEvents([]);
      }

      // Handle insights articles
      if (insightsResponse.status === "fulfilled") {
        console.log("Full insights response:", insightsResponse.value);
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

        console.log("Insights response:", insightsData);
        setInsightsArticles(insightsData || []);
      } else {
        setInsightsArticles([]);
      }

      // New Companies are using static data for now
      console.log("Using static new companies data");
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check authentication on component mount
  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }
    fetchDashboardData();
  }, [router, fetchDashboardData]);

  const handleLogout = () => {
    authService.logout();
    router.push("/login");
  };

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="px-4 mx-auto w-full">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/home-user" className="flex items-center">
                <img
                  src="https://www.asymmetrixintelligence.com/images/logo.svg?_wwcv=682"
                  alt="Asymmetrix"
                  className="mr-2 w-auto h-8"
                />
              </Link>

              <nav className="hidden space-x-8 md:flex">
                <Link href="/home-user" className="font-medium text-blue-600">
                  Dashboard
                </Link>
                <button
                  className="text-gray-500 cursor-not-allowed hover:text-gray-700"
                  disabled
                >
                  Companies
                </button>
                <button
                  className="text-gray-500 cursor-not-allowed hover:text-gray-700"
                  disabled
                >
                  Sectors
                </button>
                <button
                  className="text-gray-500 cursor-not-allowed hover:text-gray-700"
                  disabled
                >
                  Insights & Analysis
                </button>
                <button
                  className="text-gray-500 cursor-not-allowed hover:text-gray-700"
                  disabled
                >
                  Investors
                </button>
                <button
                  className="text-gray-500 cursor-not-allowed hover:text-gray-700"
                  disabled
                >
                  Advisors
                </button>
                <button
                  className="text-gray-500 cursor-not-allowed hover:text-gray-700"
                  disabled
                >
                  Individuals
                </button>
              </nav>
            </div>

            <button
              onClick={handleLogout}
              className="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-8 mx-auto w-full">
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
            <div className="overflow-x-auto max-h-96">
              {corporateEvents.length > 0 ? (
                <table className="w-full min-w-max">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Description
                      </th>
                      <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Target
                      </th>
                      <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Primary Sector
                      </th>
                      <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Secondary Sectors
                      </th>
                      <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Type
                      </th>
                      <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Enterprise Value
                      </th>
                      <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Other Counterparties
                      </th>
                      <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Advisors
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {corporateEvents.slice(0, 10).map((event) => (
                      <tr key={event.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 max-w-xs text-xs text-gray-900">
                          {event.description}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {event.announcement_date || "Not Available"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-900">
                          {event.Target_Counterparty?.new_company?.name ||
                            "Not Available"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-900">
                          {event.Target_Counterparty?.new_company?._sectors_objects?.sectors_id?.find(
                            (sector) => sector.Sector_importance === "Primary"
                          )?.sector_name || "Not Available"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-900">
                          {event.Target_Counterparty?.new_company?._sectors_objects?.sectors_id
                            ?.filter(
                              (sector) => sector.Sector_importance !== "Primary"
                            )
                            .map((sector) => sector.sector_name)
                            .join(", ") || "Not Available"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-900">
                          {event.deal_type || "Not Available"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-900">
                          {event.investment_data?.investment_amount_m &&
                          event.investment_data?.currrency?.Currency
                            ? `${event.investment_data.investment_amount_m} ${event.investment_data.currrency.Currency}`
                            : "Not Available"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-900">
                          {event.ev_data?.enterprise_value_m &&
                          event.ev_data?.Currency
                            ? `${event.ev_data.enterprise_value_m} ${event.ev_data.Currency}`
                            : "Not Available"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-900">
                          {event.Other_Counterparties_of_Corporate_Event &&
                          event.Other_Counterparties_of_Corporate_Event.length >
                            0
                            ? event.Other_Counterparties_of_Corporate_Event.map(
                                (cp) => cp._new_company?.name
                              )
                                .filter(Boolean)
                                .join(", ")
                            : "Not Available"}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-900">
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
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">
                  Insights & Analysis
                </h2>
                <form onSubmit={handleSearch} className="flex">
                  <input
                    type="text"
                    placeholder="Search headlines..."
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
                    className="px-2 py-1 text-xs rounded-l-md border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-2 py-1 text-xs text-white bg-blue-600 rounded-r-md hover:bg-blue-700"
                  >
                    Search
                  </button>
                </form>
              </div>
            </div>
            <div className="p-4">
              {filteredInsights.length > 0 ? (
                <div className="space-y-3">
                  {filteredInsights.slice(0, 3).map((article) => (
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
              <h2 className="text-lg font-semibold text-gray-900">
                New Companies Added
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {newCompanies.length > 0 ? (
                newCompanies.map((company) => (
                  <div key={company.id} className="p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        {company._linkedin_data_of_new_company
                          ?.linkedin_logo && (
                          <img
                            src={
                              company._linkedin_data_of_new_company
                                .linkedin_logo
                            }
                            alt={company.name}
                            className="w-6 h-6 rounded"
                          />
                        )}
                        <div>
                          <p className="text-xs font-medium text-gray-900">
                            {company.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {company._locations?.Country} •{" "}
                            {company.sectors_id?.[0]?.sector_name ||
                              "Unknown Sector"}
                          </p>
                          {company._linkedin_data_of_new_company
                            ?.linkedin_employee && (
                            <p className="text-xs text-gray-400">
                              {
                                company._linkedin_data_of_new_company
                                  .linkedin_employee
                              }{" "}
                              LinkedIn members
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(company.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center">
                  <p className="text-sm text-gray-500">
                    No new companies available
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
