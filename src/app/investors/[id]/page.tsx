"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useRightClick } from "@/hooks/useRightClick";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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
    advisor_individuals: string;
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
    enterprise_value_m?: number;
    ev_band?: string;
  };
  "0"?: Array<{
    _new_company?: {
      name: string;
    };
  }>;
  "1"?: Array<{
    _new_company?: {
      name: string;
    };
  }>;
}

interface CorporateEventsResponse {
  New_Events_Wits_Advisors: CorporateEvent[];
}

interface InvestorData {
  Investor: Investor;
  Focus: FocusSector[];
  Invested_DA_sectors: FocusSector[];
  Investment_Team_Roles_current: TeamMember[];
  Investment_Team_Roles_past: TeamMember[];
}

// Utility functions
const formatNumber = (num: number | undefined): string => {
  if (num === undefined || num === null) return "0";
  return num.toLocaleString();
};

const formatDate = (dateString: string | null): string => {
  if (!dateString) return "Not available";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "Not available";
  }
};

const formatChartDate = (dateString: string): string => {
  const [year, month] = dateString.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
};

// LinkedIn History Chart Component
const LinkedInHistoryChart = ({ data }: { data: LinkedInHistory[] }) => {
  const chartData = data.map((item) => ({
    date: formatChartDate(item.date),
    count: item.employees_count,
    fullDate: item.date,
  }));

  interface TooltipProps {
    active?: boolean;
    payload?: Array<{
      value: number;
      dataKey: string;
    }>;
    label?: string;
  }

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            backgroundColor: "white",
            border: "1px solid #ccc",
            borderRadius: "4px",
            padding: "10px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          <p style={{ margin: 0, fontWeight: "bold" }}>{`${label}`}</p>
          <p style={{ margin: 0, color: "#0075df" }}>
            {`Employees: ${formatNumber(payload[0].value)}`}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: "100%", height: "300px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#0075df"
            strokeWidth={2}
            dot={{ fill: "#0075df", strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, fill: "#0075df" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const truncateDescription = (
  description: string,
  maxLength: number = 150
): { text: string; isLong: boolean } => {
  const isLong = description.length > maxLength;
  const truncated = isLong
    ? description.substring(0, maxLength) + "..."
    : description;
  return { text: truncated, isLong };
};

// Company Logo Component
const CompanyLogo = ({ logo, name }: { logo: string; name: string }) => {
  if (logo) {
    return (
      <Image
        src={`data:image/jpeg;base64,${logo}`}
        alt={`${name} logo`}
        width={40}
        height={40}
        className="company-logo"
        style={{
          objectFit: "contain",
          borderRadius: "50%",
          border: "1px solid #e2e8f0",
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: "40px",
        height: "40px",
        backgroundColor: "#f7fafc",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "12px",
        fontWeight: "bold",
        color: "#64748b",
        border: "1px solid #e2e8f0",
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
};

// Company Description Component
const CompanyDescription = ({ description }: { description: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { text, isLong } = truncateDescription(description);

  const toggleDescription = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div>
      <span>{isExpanded ? description : text}</span>
      {isLong && (
        <button
          onClick={toggleDescription}
          style={{
            background: "none",
            border: "none",
            color: "#3b82f6",
            cursor: "pointer",
            fontSize: "12px",
            marginLeft: "8px",
          }}
        >
          {isExpanded ? "Show less" : "Expand description"}
        </button>
      )}
    </div>
  );
};

const InvestorDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const { createClickableElement } = useRightClick();
  const investorId = params.id as string;

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
  const [linkedInHistoryLoading, setLinkedInHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [pastPortfolioLoading, setPastPortfolioLoading] = useState(false);

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
        `https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm/get_the_investor_new_company?${params.toString()}`,
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

      const data: InvestorData = await response.json();
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
          `https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm/get_investors_current_partfolio?${params.toString()}`,
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

        const data: PortfolioResponse = await response.json();
        setPortfolioCompanies(data.items || []);
        setPortfolioPagination({
          itemsReceived: data.itemsReceived || 0,
          curPage: data.curPage || 1,
          nextPage: data.nextPage || null,
          prevPage: data.prevPage || null,
          offset: data.offset || 0,
          perPage: data.perPage || 50,
          pageTotal: data.pageTotal || 0,
        });
      } catch (err) {
        console.error("Error fetching portfolio companies:", err);
        // Don't set main error state for portfolio loading failure
      } finally {
        setPortfolioLoading(false);
      }
    },
    [investorId]
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
          `https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm/get_investors_past_portfolio?${params.toString()}`,
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

        const data: PortfolioResponse = await response.json();
        setPastPortfolioCompanies(data.items || []);
        setPastPortfolioPagination({
          itemsReceived: data.itemsReceived || 0,
          curPage: data.curPage || 1,
          nextPage: data.nextPage || null,
          prevPage: data.prevPage || null,
          offset: data.offset || 0,
          perPage: data.perPage || 50,
          pageTotal: data.pageTotal || 0,
        });
      } catch (err) {
        console.error("Error fetching past portfolio companies:", err);
        // Don't set main error state for portfolio loading failure
      } finally {
        setPastPortfolioLoading(false);
      }
    },
    [investorId]
  );

  // Fetch corporate events
  const fetchCorporateEvents = useCallback(async () => {
    setCorporateEventsLoading(true);
    try {
      const token = localStorage.getItem("asymmetrix_auth_token");

      const params = new URLSearchParams();
      params.append("new_company_id", investorId);

      const response = await fetch(
        `https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm/Get_investors_corporate_events?${params.toString()}`,
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
      setCorporateEvents(data.New_Events_Wits_Advisors || []);
    } catch (err) {
      console.error("Error fetching corporate events:", err);
      // Don't set main error state for corporate events loading failure
    } finally {
      setCorporateEventsLoading(false);
    }
  }, [investorId]);

  // Fetch LinkedIn history data
  const fetchLinkedInHistory = useCallback(async () => {
    setLinkedInHistoryLoading(true);
    try {
      const token = localStorage.getItem("asymmetrix_auth_token");

      const params = new URLSearchParams();
      params.append("new_company_id", investorId);

      const response = await fetch(
        `https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm/companies_employees_count_monthly?${params.toString()}`,
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
      console.log("LinkedIn history API response:", data);

      // Transform the data to match our interface - same format as company page
      const historyData = (data || []).map(
        (item: { date?: string; employees_count?: number }) => ({
          date: item.date || "",
          employees_count: item.employees_count || 0,
        })
      );

      setLinkedInHistory(historyData);
    } catch (err) {
      console.error("Error fetching LinkedIn history:", err);
      // Don't set main error state for LinkedIn history loading failure
    } finally {
      setLinkedInHistoryLoading(false);
    }
  }, [investorId]);

  useEffect(() => {
    if (investorId) {
      fetchInvestorData();
      fetchPortfolioCompanies(1);
      fetchPastPortfolioCompanies(1);
      fetchCorporateEvents();
      fetchLinkedInHistory();
    }
  }, [
    fetchInvestorData,
    fetchPortfolioCompanies,
    fetchPastPortfolioCompanies,
    fetchCorporateEvents,
    fetchLinkedInHistory,
    investorId,
  ]);

  const handleReportIncorrectData = () => {
    // TODO: Implement report incorrect data functionality
    console.log("Report incorrect data clicked");
  };

  const handleAdvisorClick = async (advisorName: string) => {
    console.log("Advisor clicked:", advisorName);
    try {
      // Search for the advisor using the individuals API
      const token = localStorage.getItem("asymmetrix_auth_token");

      const params = new URLSearchParams();
      params.append("search_query", advisorName);
      params.append("Offset", "1");
      params.append("Per_page", "10");

      const response = await fetch(
        `https://xdil-abvj-o7rq.e2.xano.io/api:Xpykjv0R/get_all_individuals?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Advisor search results:", data);

        // Find the matching individual by name (try exact match first, then partial match)
        let matchingIndividual = data.Individuals_list?.items?.find(
          (individual: { Individual_text: string; id: number }) =>
            individual.Individual_text === advisorName
        );

        // If no exact match, try partial match
        if (!matchingIndividual) {
          matchingIndividual = data.Individuals_list?.items?.find(
            (individual: { Individual_text: string; id: number }) =>
              individual.Individual_text?.toLowerCase().includes(
                advisorName.toLowerCase()
              ) ||
              advisorName
                .toLowerCase()
                .includes(individual.Individual_text?.toLowerCase())
          );
        }

        if (matchingIndividual && matchingIndividual.id) {
          console.log("Found matching advisor with ID:", matchingIndividual.id);
          router.push(`/individual/${matchingIndividual.id}`);
        } else {
          console.log("No matching advisor found with ID");
          // Fallback: navigate to individuals page with search
          router.push(`/individuals?search=${encodeURIComponent(advisorName)}`);
        }
      } else {
        console.error("Failed to search for advisor:", response.statusText);
        // Fallback: navigate to individuals page with search
        router.push(`/individuals?search=${encodeURIComponent(advisorName)}`);
      }
    } catch (error) {
      console.error("Error handling advisor click:", error);
      // Fallback: navigate to individuals page with search
      router.push(`/individuals?search=${encodeURIComponent(advisorName)}`);
    }
  };

  const handleCompanyNameClick = async (companyName: string) => {
    console.log("Company name clicked:", companyName);
    try {
      // Search for the company using the companies API
      const token = localStorage.getItem("asymmetrix_auth_token");

      const params = new URLSearchParams();
      params.append("search_query", companyName);
      params.append("page", "1");
      params.append("per_page", "10");

      const response = await fetch(
        `https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm/get_all_companies?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Company search results:", data);

        // Find the matching company by name
        const matchingCompany = data.companies?.items?.find(
          (company: { name: string; id: number }) =>
            company.name === companyName
        );

        if (matchingCompany && matchingCompany.id) {
          console.log("Found matching company with ID:", matchingCompany.id);
          router.push(`/company/${matchingCompany.id}`);
        } else {
          console.log("No matching company found with ID");
          // Fallback: navigate to companies page with search
          router.push(`/companies?search=${encodeURIComponent(companyName)}`);
        }
      } else {
        console.error("Failed to search for company:", response.statusText);
        // Fallback: navigate to companies page with search
        router.push(`/companies?search=${encodeURIComponent(companyName)}`);
      }
    } catch (error) {
      console.error("Error handling company name click:", error);
      // Fallback: navigate to companies page with search
      router.push(`/companies?search=${encodeURIComponent(companyName)}`);
    }
  };

  const handleCorporateEventDescriptionClick = async (
    eventId?: number,
    eventDescription?: string
  ) => {
    console.log("Corporate event description clicked:", {
      eventId,
      eventDescription,
    });

    // If we have a direct ID, use it immediately
    if (eventId) {
      console.log("Using direct event ID:", eventId);
      router.push(`/corporate-event/${eventId}`);
      return;
    }

    // Fallback: search by description if no ID available
    if (!eventDescription) {
      console.error("No event ID or description provided");
      return;
    }

    try {
      // Try to find the event ID by searching the main corporate events API
      const token = localStorage.getItem("asymmetrix_auth_token");

      const params = new URLSearchParams();
      params.append("search_query", eventDescription);
      params.append("Page", "0");
      params.append("Per_page", "10");

      const response = await fetch(
        `https://xdil-abvj-o7rq.e2.xano.io/api:617tZc8l/get_all_corporate_events?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Search results:", data);

        // Find the matching event by description
        const matchingEvent = data.items?.find(
          (event: { description: string; id: number }) =>
            event.description === eventDescription
        );

        if (matchingEvent && matchingEvent.id) {
          console.log("Found matching event with ID:", matchingEvent.id);
          router.push(`/corporate-event/${matchingEvent.id}`);
        } else {
          console.log("No matching event found with ID");
          // Fallback: navigate to corporate events page with search
          router.push(
            `/corporate-events?search=${encodeURIComponent(eventDescription)}`
          );
        }
      } else {
        console.error("Failed to search for event:", response.statusText);
        // Fallback: navigate to corporate events page with search
        router.push(
          `/corporate-events?search=${encodeURIComponent(eventDescription)}`
        );
      }
    } catch (error) {
      console.error("Error searching for event:", error);
      // Fallback: navigate to corporate events page with search
      router.push(
        `/corporate-events?search=${encodeURIComponent(eventDescription)}`
      );
    }
  };

  const handlePortfolioPageChange = (page: number) => {
    fetchPortfolioCompanies(page);
  };

  const handlePastPortfolioPageChange = (page: number) => {
    fetchPastPortfolioCompanies(page);
  };

  if (loading) {
    return (
      <div
        style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
      >
        <Header />
        <div
          style={{
            flex: "1",
            padding: "32px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div>Loading investor data...</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
      >
        <Header />
        <div
          style={{
            flex: "1",
            padding: "32px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <h2>Error Loading Investor</h2>
            <p>{error}</p>
            <button
              onClick={fetchInvestorData}
              style={{
                padding: "8px 16px",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
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
      <div
        style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
      >
        <Header />
        <div
          style={{
            flex: "1",
            padding: "32px",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div>Investor not found</div>
        </div>
        <Footer />
      </div>
    );
  }

  const {
    Investor,
    Focus,
    Invested_DA_sectors,
    Investment_Team_Roles_current,
    Investment_Team_Roles_past,
  } = investorData;

  const hq = `${Investor._locations?.City || ""}, ${
    Investor._locations?.State__Province__County || ""
  }, ${Investor._locations?.Country || ""}`
    .replace(/^,\s*/, "")
    .replace(/,\s*$/, "");

  // Map corporate events for display
  const mappedCorporateEvents = corporateEvents.map((event, index) => {
    const counterparties = event["0"] || [];

    // Get other counterparties (filter out new_company_counterparty === 6662 if needed)
    const otherCounterparties = counterparties
      .filter((c) => c._new_company?.name)
      .map((c) => c._new_company?.name || "")
      .filter(Boolean)
      .join(", ");

    // Get advisors if present in index "1"
    const advisorEntries = event["1"] || [];
    const advisorNames = advisorEntries
      .map((a) => a._new_company?.name)
      .filter(Boolean)
      .join(", ");

    return {
      id: event.id,
      originalIndex: index, // Fallback for navigation if no ID
      description: event.description,
      announcement_date: event.announcement_date,
      type: event.deal_type,
      counterparty_status:
        event.counterparty_status?.counterparty_syayus?.counterparty_status ||
        "—",
      other_counterparties: otherCounterparties || "—",
      enterprise_value: event.ev_data?.enterprise_value_m
        ? `$${Number(event.ev_data.enterprise_value_m).toLocaleString()}`
        : event.ev_data?.ev_band || "—",
      advisors: advisorNames || "—",
    };
  });

  const style = `
    .investor-detail-page {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .investor-content {
      flex: 1;
      padding: 32px;
      width: 100%;
    }
    .investor-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .investor-title-section {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;
    }
    .investor-title {
      margin: 0;
      font-size: 32px;
      font-weight: bold;
    }
    .report-button {
      padding: 8px 16px;
      background-color: #dc2626;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    .investor-layout {
      display: flex;
      gap: 32px;
      flex-wrap: wrap;
    }
    .investor-left-column {
      flex: 1;
      min-width: 300px;
    }
    .investor-right-column {
      flex: 2;
      min-width: 600px;
    }
    .investor-section {
      background-color: white;
      padding: 24px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-bottom: 24px;
    }
    .section-title {
      margin: 0 0 16px 0;
      font-size: 20px;
      font-weight: bold;
    }
    .section-subtitle {
      margin: 0 0 8px 0;
      font-size: 16px;
      font-weight: bold;
    }
    .info-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .info-label {
      font-weight: bold;
      color: #374151;
    }
    .info-value {
      color: #6b7280;
    }

    .portfolio-table-container {
      overflow-x: auto;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }
    .portfolio-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    .portfolio-table thead {
      background-color: #f8fafc;
    }
    .portfolio-table th,
    .portfolio-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    .portfolio-table th {
      font-weight: 600;
      color: #374151;
    }
    .portfolio-table td {
      color: #6b7280;
    }
    .company-name {
      color: #3b82f6;
      text-decoration: none;
      font-weight: 500;
      cursor: pointer;
    }
    .company-name:hover {
      text-decoration: underline;
    }
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      margin-top: 16px;
      padding: 16px;
    }
    .pagination-button {
      padding: 8px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    .pagination-button:disabled {
      background-color: #e2e8f0;
      color: #64748b;
      cursor: not-allowed;
    }
    .pagination-button:not(:disabled) {
      background-color: #3b82f6;
      color: white;
    }
    .pagination-info {
      font-size: 14px;
      color: #64748b;
    }
    .portfolio-cards {
      display: none;
    }
    .portfolio-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
    }
    .portfolio-card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .portfolio-card-name {
      font-size: 16px;
      font-weight: 600;
      color: #3b82f6;
      cursor: pointer;
    }
    .portfolio-card-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      font-size: 14px;
    }
    .portfolio-card-info-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .portfolio-card-info-label {
      font-weight: 600;
      color: #374151;
      font-size: 12px;
    }
    .portfolio-card-info-value {
      color: #6b7280;
      font-size: 12px;
    }
    .corporate-event-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
    }
    .corporate-event-card-title {
      font-size: 16px;
      font-weight: 600;
      color: #3b82f6;
      cursor: pointer;
      margin-bottom: 12px;
      line-height: 1.4;
    }
    .corporate-event-card-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      font-size: 14px;
    }
    .corporate-event-card-info-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .corporate-event-card-info-label {
      font-weight: 600;
      color: #374151;
      font-size: 12px;
    }
    .corporate-event-card-info-value {
      color: #6b7280;
      font-size: 12px;
    }
    .loading {
      text-align: center;
      padding: 24px;
      color: #6b7280;
    }
    .no-data {
      text-align: center;
      padding: 24px;
      color: #64748b;
    }

    @media (max-width: 768px) {
      .investor-content {
        padding: 16px !important;
      }
      .investor-header {
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 16px !important;
      }
      .investor-title-section {
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 12px !important;
      }
      .investor-title {
        font-size: 24px !important;
      }
      .report-button {
        align-self: flex-start !important;
        width: fit-content !important;
      }
      .investor-layout {
        flex-direction: column !important;
        gap: 16px !important;
      }
      .investor-left-column,
      .investor-right-column {
        flex: none !important;
        min-width: auto !important;
        width: 100% !important;
      }
      .investor-section {
        padding: 16px !important;
        margin-bottom: 16px !important;
      }
      .section-title {
        font-size: 18px !important;
        margin-bottom: 12px !important;
      }

      .portfolio-table-container {
        display: none !important;
      }
      .portfolio-cards {
        display: block !important;
      }
      .pagination {
        flex-wrap: wrap !important;
        gap: 8px !important;
        padding: 12px 8px !important;
      }
      .pagination-button {
        padding: 6px 10px !important;
        font-size: 13px !important;
        min-width: 70px !important;
      }
      .pagination-info {
        font-size: 13px !important;
        text-align: center !important;
        width: 100% !important;
        order: -1 !important;
      }
    }

    @media (min-width: 769px) {
      .portfolio-cards {
        display: none !important;
      }
      .portfolio-table-container {
        display: block !important;
      }
    }
  `;

  return (
    <div className="investor-detail-page">
      <Header />

      <div className="investor-content">
        {/* Page Header */}
        <div className="investor-header">
          <div className="investor-title-section">
            <CompanyLogo
              logo={Investor._linkedin_data_of_new_company?.linkedin_logo || ""}
              name={Investor.name}
            />
            <div>
              <h1 className="investor-title">{Investor.name}</h1>
            </div>
          </div>
          <button onClick={handleReportIncorrectData} className="report-button">
            Report Incorrect Data
          </button>
        </div>

        <div className="investor-layout">
          {/* Left Column - Overview */}
          <div className="investor-left-column">
            {/* Overview Section */}
            <div className="investor-section">
              <h2 className="section-title">Overview</h2>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Focus:</span>
                  <span className="info-value">
                    {Focus.map((f) => f.sector_name).join(", ") ||
                      "Not available"}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Year founded:</span>
                  <span className="info-value">
                    {Investor._years?.Year || "Not available"}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">HQ:</span>
                  <span className="info-value">{hq || "Not available"}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Website:</span>
                  <span className="info-value">
                    {Investor.url
                      ? createClickableElement(
                          Investor.url,
                          Investor.url,
                          undefined,
                          { textDecoration: "none" }
                        )
                      : "Not available"}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">LinkedIn Members:</span>
                  <span className="info-value">
                    {formatNumber(
                      Investor._linkedin_data_of_new_company?.linkedin_employee
                    )}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">LinkedIn Members Date:</span>
                  <span className="info-value">
                    {formatDate(
                      Investor._linkedin_data_of_new_company?.linkedin_emp_date
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Historic LinkedIn Data Section */}
            <div className="investor-section">
              <h2 className="section-title">Historic LinkedIn Data</h2>
              {linkedInHistoryLoading ? (
                <div className="loading">Loading LinkedIn history...</div>
              ) : linkedInHistory.length > 0 ? (
                <LinkedInHistoryChart data={linkedInHistory} />
              ) : (
                <div className="no-data">
                  No LinkedIn history data available
                </div>
              )}
            </div>

            {/* Invested D&A Sectors Section */}
            <div className="investor-section">
              <h2 className="section-title">Invested D&A sectors:</h2>
              <div className="info-value">
                {Invested_DA_sectors.length > 0
                  ? Invested_DA_sectors.map((sector, index) => (
                      <span key={sector.id}>
                        {createClickableElement(
                          `/sector/${sector.id}`,
                          sector.sector_name,
                          undefined,
                          { textDecoration: "none" }
                        )}
                        {index < Invested_DA_sectors.length - 1 ? ", " : ""}
                      </span>
                    ))
                  : "Not available"}
              </div>
            </div>

            {/* Description Section */}
            <div className="investor-section">
              <h2 className="section-title">Description:</h2>
              <div className="info-value" style={{ whiteSpace: "pre-wrap" }}>
                {Investor.description || "Not available"}
              </div>
            </div>

            {/* Investment Team Section */}
            <div className="investor-section">
              <h2 className="section-title">Investment Team</h2>

              {/* Current Team */}
              <div style={{ marginBottom: "16px" }}>
                <h3 className="section-subtitle">Current:</h3>
                {Investment_Team_Roles_current.length > 0 ? (
                  <div className="info-grid">
                    {Investment_Team_Roles_current.map((member, index) => (
                      <div key={index} className="info-value">
                        {member.current_employer_url ? (
                          createClickableElement(
                            member.current_employer_url,
                            member.Individual_text,
                            undefined,
                            { textDecoration: "none" }
                          )
                        ) : (
                          <span>{member.Individual_text}</span>
                        )}
                        :{" "}
                        {member.job_titles_id
                          .map((jt) => jt.job_title)
                          .join(", ")}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="info-value">Not available</div>
                )}
              </div>

              {/* Past Team */}
              <div>
                <h3 className="section-subtitle">Past:</h3>
                {Investment_Team_Roles_past.length > 0 ? (
                  <div className="info-grid">
                    {Investment_Team_Roles_past.map((member, index) => (
                      <div key={index} className="info-value">
                        {member.current_employer_url ? (
                          createClickableElement(
                            member.current_employer_url,
                            member.Individual_text,
                            undefined,
                            { textDecoration: "none" }
                          )
                        ) : (
                          <span>{member.Individual_text}</span>
                        )}
                        :{" "}
                        {member.job_titles_id
                          .map((jt) => jt.job_title)
                          .join(", ")}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="info-value">Not available</div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Portfolio and Corporate Events */}
          <div className="investor-right-column">
            {/* Current Portfolio Section */}
            <div className="investor-section">
              <h2 className="section-title">Current Portfolio</h2>
              {portfolioLoading ? (
                <div className="loading">
                  Loading current portfolio companies...
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="portfolio-table-container">
                    <table className="portfolio-table">
                      <thead>
                        <tr>
                          <th>Logo</th>
                          <th>Name</th>
                          <th>Sectors</th>
                          <th>Description</th>
                          <th>Related Individuals</th>
                          <th>LinkedIn Members</th>
                          <th>Country</th>
                        </tr>
                      </thead>
                      <tbody>
                        {portfolioCompanies.length > 0 ? (
                          portfolioCompanies.map((company) => (
                            <tr key={company.id}>
                              <td>
                                <CompanyLogo
                                  logo={
                                    company._linkedin_data_of_new_company
                                      ?.linkedin_logo || ""
                                  }
                                  name={company.name}
                                />
                              </td>
                              <td>
                                {createClickableElement(
                                  `/company/${company.id}`,
                                  company.name,
                                  "company-name"
                                )}
                              </td>
                              <td>
                                <div style={{ fontSize: "12px" }}>
                                  {company.sectors_id
                                    .slice(0, 3)
                                    .map((s) => s.sector_name)
                                    .join(", ")}
                                  {company.sectors_id.length > 3 && "..."}
                                </div>
                              </td>
                              <td style={{ maxWidth: "350px" }}>
                                <CompanyDescription
                                  description={company.description}
                                />
                              </td>
                              <td>
                                {company.related_to_investor_individuals &&
                                company.related_to_investor_individuals.length >
                                  0 ? (
                                  <div style={{ fontSize: "12px" }}>
                                    {company.related_to_investor_individuals
                                      .slice(0, 3)
                                      .map((individual, index) => (
                                        <span key={individual.id}>
                                          {createClickableElement(
                                            `/individual/${individual.id}`,
                                            individual.advisor_individuals,
                                            undefined,
                                            {
                                              textDecoration: "none",
                                              fontSize: "12px",
                                            }
                                          )}
                                          {index <
                                          Math.min(
                                            company.related_to_investor_individuals!
                                              .length,
                                            3
                                          ) -
                                            1
                                            ? ", "
                                            : ""}
                                        </span>
                                      ))}
                                    {company.related_to_investor_individuals
                                      .length > 3 && "..."}
                                  </div>
                                ) : (
                                  <span
                                    style={{
                                      color: "#64748b",
                                      fontSize: "12px",
                                    }}
                                  >
                                    Not available
                                  </span>
                                )}
                              </td>
                              <td>
                                {formatNumber(
                                  company._linkedin_data_of_new_company
                                    ?.linkedin_employee
                                )}
                              </td>
                              <td>
                                {company._locations?.Country || "Not available"}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="no-data">
                              No portfolio companies found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards View */}
                  <div className="portfolio-cards">
                    {portfolioCompanies.length > 0 ? (
                      portfolioCompanies.map((company) => (
                        <div key={company.id} className="portfolio-card">
                          <div className="portfolio-card-header">
                            <CompanyLogo
                              logo={
                                company._linkedin_data_of_new_company
                                  ?.linkedin_logo || ""
                              }
                              name={company.name}
                            />
                            {createClickableElement(
                              `/company/${company.id}`,
                              company.name,
                              "portfolio-card-name"
                            )}
                          </div>
                          <div className="portfolio-card-info">
                            <div className="portfolio-card-info-item">
                              <span className="portfolio-card-info-label">
                                Sectors:
                              </span>
                              <span className="portfolio-card-info-value">
                                {company.sectors_id
                                  .slice(0, 3)
                                  .map((s) => s.sector_name)
                                  .join(", ")}
                                {company.sectors_id.length > 3 && "..."}
                              </span>
                            </div>
                            <div className="portfolio-card-info-item">
                              <span className="portfolio-card-info-label">
                                LinkedIn:
                              </span>
                              <span className="portfolio-card-info-value">
                                {formatNumber(
                                  company._linkedin_data_of_new_company
                                    ?.linkedin_employee
                                )}
                              </span>
                            </div>
                            <div className="portfolio-card-info-item">
                              <span className="portfolio-card-info-label">
                                Country:
                              </span>
                              <span className="portfolio-card-info-value">
                                {company._locations?.Country || "Not available"}
                              </span>
                            </div>
                            <div className="portfolio-card-info-item">
                              <span className="portfolio-card-info-label">
                                Individuals:
                              </span>
                              <span className="portfolio-card-info-value">
                                {company.related_to_investor_individuals &&
                                company.related_to_investor_individuals.length >
                                  0 ? (
                                  <>
                                    {company.related_to_investor_individuals
                                      .slice(0, 2)
                                      .map((individual, index) => (
                                        <span key={individual.id}>
                                          {createClickableElement(
                                            `/individual/${individual.id}`,
                                            individual.advisor_individuals,
                                            undefined,
                                            {
                                              textDecoration: "none",
                                              fontSize: "12px",
                                            }
                                          )}
                                          {index <
                                          Math.min(
                                            company.related_to_investor_individuals!
                                              .length,
                                            2
                                          ) -
                                            1
                                            ? ", "
                                            : ""}
                                        </span>
                                      ))}
                                    {company.related_to_investor_individuals
                                      .length > 2 && "..."}
                                  </>
                                ) : (
                                  "Not available"
                                )}
                              </span>
                            </div>
                          </div>
                          <div style={{ marginTop: "12px" }}>
                            <CompanyDescription
                              description={company.description}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-data">
                        No portfolio companies found
                      </div>
                    )}
                  </div>

                  {/* Pagination */}
                  {portfolioPagination.pageTotal > 1 && (
                    <div className="pagination">
                      <span className="pagination-info">
                        Page {portfolioPagination.curPage} of{" "}
                        {portfolioPagination.pageTotal}
                      </span>
                      <button
                        onClick={() =>
                          handlePortfolioPageChange(
                            portfolioPagination.curPage - 1
                          )
                        }
                        disabled={!portfolioPagination.prevPage}
                        className="pagination-button"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() =>
                          handlePortfolioPageChange(
                            portfolioPagination.curPage + 1
                          )
                        }
                        disabled={!portfolioPagination.nextPage}
                        className="pagination-button"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Past Portfolio Section */}
            <div className="investor-section" style={{ marginTop: "32px" }}>
              <h2 className="section-title">Past Portfolio</h2>
              {pastPortfolioLoading ? (
                <div style={{ textAlign: "center", padding: "24px" }}>
                  Loading past portfolio companies...
                </div>
              ) : (
                <>
                  <div
                    style={{
                      overflowX: "auto",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                    }}
                  >
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "14px",
                      }}
                    >
                      <thead>
                        <tr style={{ backgroundColor: "#f8fafc" }}>
                          <th
                            style={{
                              padding: "12px",
                              textAlign: "left",
                              borderBottom: "1px solid #e2e8f0",
                            }}
                          >
                            Logo
                          </th>
                          <th
                            style={{
                              padding: "12px",
                              textAlign: "left",
                              borderBottom: "1px solid #e2e8f0",
                            }}
                          >
                            Name
                          </th>
                          <th
                            style={{
                              padding: "12px",
                              textAlign: "left",
                              borderBottom: "1px solid #e2e8f0",
                            }}
                          >
                            Sectors
                          </th>
                          <th
                            style={{
                              padding: "12px",
                              textAlign: "left",
                              borderBottom: "1px solid #e2e8f0",
                            }}
                          >
                            Description
                          </th>
                          <th
                            style={{
                              padding: "12px",
                              textAlign: "left",
                              borderBottom: "1px solid #e2e8f0",
                            }}
                          >
                            Related Individuals
                          </th>
                          <th
                            style={{
                              padding: "12px",
                              textAlign: "left",
                              borderBottom: "1px solid #e2e8f0",
                            }}
                          >
                            LinkedIn Members
                          </th>
                          <th
                            style={{
                              padding: "12px",
                              textAlign: "left",
                              borderBottom: "1px solid #e2e8f0",
                            }}
                          >
                            Country
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {pastPortfolioCompanies.length > 0 ? (
                          pastPortfolioCompanies.map((company) => (
                            <tr
                              key={company.id}
                              style={{ borderBottom: "1px solid #e2e8f0" }}
                            >
                              <td style={{ padding: "12px" }}>
                                <CompanyLogo
                                  logo={
                                    company._linkedin_data_of_new_company
                                      ?.linkedin_logo || ""
                                  }
                                  name={company.name}
                                />
                              </td>
                              <td style={{ padding: "12px" }}>
                                {createClickableElement(
                                  `/company/${company.id}`,
                                  company.name,
                                  undefined,
                                  {
                                    textDecoration: "none",
                                    fontWeight: "500",
                                  }
                                )}
                              </td>
                              <td style={{ padding: "12px" }}>
                                <div style={{ fontSize: "12px" }}>
                                  {company.sectors_id
                                    .slice(0, 3)
                                    .map((s) => s.sector_name)
                                    .join(", ")}
                                  {company.sectors_id.length > 3 && "..."}
                                </div>
                              </td>
                              <td
                                style={{ padding: "12px", maxWidth: "350px" }}
                              >
                                <CompanyDescription
                                  description={company.description}
                                />
                              </td>
                              <td style={{ padding: "12px" }}>
                                {company.related_to_investor_individuals &&
                                company.related_to_investor_individuals.length >
                                  0 ? (
                                  <div style={{ fontSize: "12px" }}>
                                    {company.related_to_investor_individuals
                                      .slice(0, 3)
                                      .map((individual, index) => (
                                        <span key={individual.id}>
                                          {createClickableElement(
                                            `/individual/${individual.id}`,
                                            individual.advisor_individuals,
                                            undefined,
                                            {
                                              textDecoration: "none",
                                              fontSize: "12px",
                                            }
                                          )}
                                          {index <
                                          Math.min(
                                            company.related_to_investor_individuals!
                                              .length,
                                            3
                                          ) -
                                            1
                                            ? ", "
                                            : ""}
                                        </span>
                                      ))}
                                    {company.related_to_investor_individuals
                                      .length > 3 && "..."}
                                  </div>
                                ) : (
                                  <span
                                    style={{
                                      color: "#64748b",
                                      fontSize: "12px",
                                    }}
                                  >
                                    Not available
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: "12px" }}>
                                {formatNumber(
                                  company._linkedin_data_of_new_company
                                    ?.linkedin_employee
                                )}
                              </td>
                              <td style={{ padding: "12px" }}>
                                {company._locations?.Country || "Not available"}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={7}
                              style={{
                                padding: "24px",
                                textAlign: "center",
                                color: "#64748b",
                              }}
                            >
                              No past portfolio companies found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {pastPortfolioPagination.pageTotal > 1 && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: "8px",
                        marginTop: "16px",
                        padding: "16px",
                      }}
                    >
                      <button
                        onClick={() =>
                          handlePastPortfolioPageChange(
                            pastPortfolioPagination.curPage - 1
                          )
                        }
                        disabled={!pastPortfolioPagination.prevPage}
                        style={{
                          padding: "8px 12px",
                          backgroundColor: pastPortfolioPagination.prevPage
                            ? "#3b82f6"
                            : "#e2e8f0",
                          color: pastPortfolioPagination.prevPage
                            ? "white"
                            : "#64748b",
                          border: "none",
                          borderRadius: "4px",
                          cursor: pastPortfolioPagination.prevPage
                            ? "pointer"
                            : "not-allowed",
                          fontSize: "14px",
                        }}
                      >
                        Previous
                      </button>

                      <span style={{ fontSize: "14px", color: "#64748b" }}>
                        Page {pastPortfolioPagination.curPage} of{" "}
                        {pastPortfolioPagination.pageTotal}
                      </span>

                      <button
                        onClick={() =>
                          handlePastPortfolioPageChange(
                            pastPortfolioPagination.curPage + 1
                          )
                        }
                        disabled={!pastPortfolioPagination.nextPage}
                        style={{
                          padding: "8px 12px",
                          backgroundColor: pastPortfolioPagination.nextPage
                            ? "#3b82f6"
                            : "#e2e8f0",
                          color: pastPortfolioPagination.nextPage
                            ? "white"
                            : "#64748b",
                          border: "none",
                          borderRadius: "4px",
                          cursor: pastPortfolioPagination.nextPage
                            ? "pointer"
                            : "not-allowed",
                          fontSize: "14px",
                        }}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Corporate Events Section */}
            <div className="investor-section" style={{ marginTop: "32px" }}>
              <h2 className="section-title">Corporate Events</h2>
              {corporateEventsLoading ? (
                <div style={{ textAlign: "center", padding: "24px" }}>
                  Loading corporate events...
                </div>
              ) : (
                <div
                  style={{
                    overflowX: "auto",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "14px",
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: "#f8fafc" }}>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          Description
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          Date Announced
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          Type
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          Counterparty Status
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          Other Counterparties
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          Enterprise Value
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          Advisors
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {mappedCorporateEvents.length > 0 ? (
                        mappedCorporateEvents.map((event, index) => (
                          <tr
                            key={index}
                            style={{ borderBottom: "1px solid #e2e8f0" }}
                          >
                            <td style={{ padding: "12px" }}>
                              <div style={{ maxWidth: "350px" }}>
                                <span
                                  style={{
                                    color: "#3b82f6",
                                    textDecoration: "none",
                                    fontWeight: "500",
                                    cursor: "pointer",
                                  }}
                                  onClick={() =>
                                    handleCorporateEventDescriptionClick(
                                      event.id,
                                      event.description
                                    )
                                  }
                                  onContextMenu={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (event.id) {
                                      window.open(
                                        `/corporate-event/${event.id}`,
                                        "_blank",
                                        "noopener,noreferrer"
                                      );
                                    }
                                  }}
                                  title="Left click to navigate, Right click to open in new tab"
                                >
                                  <CompanyDescription
                                    description={event.description}
                                  />
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: "12px" }}>
                              {event.announcement_date
                                ? formatDate(event.announcement_date)
                                : "—"}
                            </td>
                            <td style={{ padding: "12px" }}>
                              {event.type || "—"}
                            </td>
                            <td style={{ padding: "12px" }}>
                              {event.counterparty_status}
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                maxWidth: "150px",
                                fontSize: "12px",
                              }}
                            >
                              {event.other_counterparties !== "—"
                                ? event.other_counterparties
                                    .split(", ")
                                    .map((companyName, index) => (
                                      <span key={index}>
                                        <span
                                          style={{
                                            color: "#3b82f6",
                                            textDecoration: "none",
                                            fontWeight: "500",
                                            cursor: "pointer",
                                          }}
                                          onClick={() => {
                                            console.log(
                                              "Other counterparty clicked:",
                                              companyName
                                            );
                                            handleCompanyNameClick(companyName);
                                          }}
                                          onContextMenu={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            window.open(
                                              `/companies?search=${encodeURIComponent(
                                                companyName
                                              )}`,
                                              "_blank",
                                              "noopener,noreferrer"
                                            );
                                          }}
                                          title="Left click to navigate, Right click to open in new tab"
                                        >
                                          {companyName}
                                        </span>
                                        {index <
                                          event.other_counterparties.split(", ")
                                            .length -
                                            1 && ", "}
                                      </span>
                                    ))
                                : "—"}
                            </td>
                            <td style={{ padding: "12px" }}>
                              {event.enterprise_value}
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                maxWidth: "150px",
                                fontSize: "12px",
                              }}
                            >
                              {event.advisors !== "—"
                                ? event.advisors
                                    .split(", ")
                                    .map((companyName, index) => (
                                      <span key={index}>
                                        <span
                                          style={{
                                            color: "#3b82f6",
                                            textDecoration: "none",
                                            fontWeight: "500",
                                            cursor: "pointer",
                                          }}
                                          onClick={() => {
                                            console.log(
                                              "Advisor clicked:",
                                              companyName
                                            );
                                            handleAdvisorClick(companyName);
                                          }}
                                          onContextMenu={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            window.open(
                                              `/individuals?search=${encodeURIComponent(
                                                companyName
                                              )}`,
                                              "_blank",
                                              "noopener,noreferrer"
                                            );
                                          }}
                                          title="Left click to navigate, Right click to open in new tab"
                                        >
                                          {companyName}
                                        </span>
                                        {index <
                                          event.advisors.split(", ").length -
                                            1 && ", "}
                                      </span>
                                    ))
                                : "—"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={7}
                            style={{
                              padding: "24px",
                              textAlign: "center",
                              color: "#64748b",
                            }}
                          >
                            No corporate events found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
      <style dangerouslySetInnerHTML={{ __html: style }} />
    </div>
  );
};

const InvestorPage = () => {
  return <InvestorDetailPage />;
};

export default InvestorPage;
