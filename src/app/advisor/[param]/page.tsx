"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAdvisorProfile } from "../../../hooks/useAdvisorProfile";
import { formatSectorsList, formatDate } from "../../../utils/advisorHelpers";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Types for LinkedIn History Chart
interface LinkedInHistory {
  date: string;
  employees_count: number;
}

// Utility function for chart date formatting
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

// Company Logo Component
const CompanyLogo = ({ logo, name }: { logo: string; name: string }) => {
  if (logo) {
    return (
      <div style={{ width: "80px", height: "80px", position: "relative" }}>
        <Image
          src={`data:image/jpeg;base64,${logo}`}
          alt={`${name} logo`}
          fill
          style={{ objectFit: "cover", borderRadius: "8px" }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: "80px",
        height: "80px",
        backgroundColor: "#f7fafc",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "24px",
        color: "#718096",
        fontWeight: "bold",
      }}
    >
      {name.charAt(0)}
    </div>
  );
};

// Format number with commas
const formatNumber = (num: number | undefined): string => {
  if (num === undefined || num === null) return "0";
  return num.toLocaleString();
};

export default function AdvisorProfilePage() {
  const params = useParams();
  const router = useRouter();
  const advisorId = parseInt(params.param as string);
  const [eventsExpanded, setEventsExpanded] = useState(false);
  const [linkedInHistory, setLinkedInHistory] = useState<LinkedInHistory[]>([]);
  const [linkedInHistoryLoading, setLinkedInHistoryLoading] = useState(false);

  const { advisorData, corporateEvents, loading, error } = useAdvisorProfile({
    advisorId,
  });

  const handleAdvisorClick = (individualId: number) => {
    console.log("Advisor clicked:", individualId);
    // Directly redirect to the individual page using the individualId
    router.push(`/individual/${individualId}`);
  };

  const handleOtherAdvisorClick = (advisorId: number) => {
    console.log("Other advisor clicked:", advisorId);
    router.push(`/advisor/${advisorId}`);
  };

  const handleCorporateEventClick = (eventId: number) => {
    console.log("Corporate event clicked:", eventId);
    if (!eventId) {
      console.error("Event ID is missing:", eventId);
      return;
    }
    try {
      router.push(`/corporate-event/${eventId}`);
    } catch (error) {
      console.error("Error navigating to corporate event:", error);
    }
  };

  const handleReportIncorrectData = () => {
    // Handle report incorrect data functionality
    console.log("Report incorrect data clicked");
  };

  const handleToggleEvents = () => {
    setEventsExpanded(!eventsExpanded);
  };

  // Fetch LinkedIn history data using the same API pattern as company page
  const fetchLinkedInHistory = useCallback(async () => {
    setLinkedInHistoryLoading(true);
    try {
      const token = localStorage.getItem("asymmetrix_auth_token");

      const response = await fetch(
        `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/Get_new_company/${advisorId}`,
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
    } catch (err) {
      console.error("Error fetching advisor LinkedIn history:", err);
      // Don't set main error state for LinkedIn history loading failure
    } finally {
      setLinkedInHistoryLoading(false);
    }
  }, [advisorId]);

  useEffect(() => {
    if (advisorId) {
      fetchLinkedInHistory();
    }
  }, [advisorId, fetchLinkedInHistory]);

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
          <div>Loading advisor data...</div>
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
            <h2>Error Loading Advisor</h2>
            <p>{error}</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!advisorData) {
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
          <div>Advisor not found</div>
        </div>
        <Footer />
      </div>
    );
  }

  const {
    Advisor,
    Advised_DA_sectors,
    Portfolio_companies_count,
    Advisors_individuals,
  } = advisorData;

  const hq = `${Advisor._locations?.City || ""}, ${
    Advisor._locations?.State__Province__County || ""
  }, ${Advisor._locations?.Country || ""}`
    .replace(/^,\s*/, "")
    .replace(/,\s*$/, "");

  const style = `
    .advisor-detail-page {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .advisor-content {
      flex: 1;
      padding: 32px;
      width: 100%;
    }
    .advisor-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 32px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .advisor-title-section {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;
    }
    .advisor-title {
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
    .advisor-layout {
      display: flex;
      gap: 32px;
      flex-wrap: wrap;
    }
    .advisor-left-column {
      flex: 1;
      min-width: 300px;
    }
    .advisor-right-column {
      flex: 1;
      min-width: 300px;
    }
    .advisor-section {
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
    .corporate-events-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .toggle-button {
      color: #3b82f6;
      text-decoration: none;
      font-size: 14px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
    }
    .events-table-container {
      overflow-x: auto;
    }
    .events-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    .events-table thead tr {
      border-bottom: 2px solid #e2e8f0;
    }
    .events-table th {
      text-align: left;
      padding: 8px;
      font-weight: bold;
      font-size: 12px;
    }
    .events-table tbody tr {
      border-bottom: 1px solid #f1f5f9;
    }
    .events-table td {
      padding: 8px;
      font-size: 12px;
    }
    .event-link {
      color: #3b82f6;
      text-decoration: none;
      cursor: pointer;
    }
    .event-link:hover {
      text-decoration: underline;
    }
    .advisor-link {
      color: #3b82f6;
      text-decoration: none;
      cursor: pointer;
    }
    .advisor-link:hover {
      text-decoration: underline;
    }
    .no-events {
      color: #6b7280;
      text-align: center;
      padding: 20px;
    }
    .events-cards {
      display: none;
    }
    .event-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
    }
    .event-card-title {
      font-size: 16px;
      font-weight: 600;
      color: #3b82f6;
      cursor: pointer;
      margin-bottom: 12px;
      line-height: 1.4;
    }
    .event-card-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      font-size: 14px;
    }
    .event-card-info-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .event-card-info-label {
      font-weight: 600;
      color: #374151;
      font-size: 12px;
    }
    .event-card-info-value {
      color: #6b7280;
      font-size: 12px;
    }
    .loading {
      text-align: center;
      padding: 40px;
      color: #666;
    }

    @media (max-width: 768px) {
      .advisor-content {
        padding: 16px !important;
      }
      .advisor-header {
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 16px !important;
      }
      .advisor-title-section {
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 12px !important;
      }
      .advisor-title {
        font-size: 24px !important;
      }
      .report-button {
        align-self: flex-start !important;
        width: fit-content !important;
      }
      .advisor-layout {
        flex-direction: column !important;
        gap: 16px !important;
      }
      .advisor-left-column,
      .advisor-right-column {
        flex: none !important;
        min-width: auto !important;
        width: 100% !important;
      }
      .advisor-section {
        padding: 16px !important;
        margin-bottom: 16px !important;
      }
      .section-title {
        font-size: 18px !important;
        margin-bottom: 12px !important;
      }
      .events-table-container {
        display: none !important;
      }
      .events-cards {
        display: block !important;
      }
      .corporate-events-header {
        flex-direction: column !important;
        align-items: flex-start !important;
        gap: 8px !important;
      }
    }

    @media (min-width: 769px) {
      .events-cards {
        display: none !important;
      }
      .events-table-container {
        display: block !important;
      }
    }
  `;

  return (
    <div className="advisor-detail-page">
      <Header />

      <div className="advisor-content">
        {/* Page Header */}
        <div className="advisor-header">
          <div className="advisor-title-section">
            <CompanyLogo
              logo={Advisor._linkedin_data_of_new_company?.linkedin_logo || ""}
              name={Advisor.name}
            />
            <div>
              <h1 className="advisor-title">{Advisor.name}</h1>
            </div>
          </div>
          <button onClick={handleReportIncorrectData} className="report-button">
            Report Incorrect Data
          </button>
        </div>

        <div className="advisor-layout">
          {/* Left Column - Overview */}
          <div className="advisor-left-column">
            {/* Overview Section */}
            <div className="advisor-section">
              <h2 className="section-title">Overview</h2>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Advised D&A sectors:</span>
                  <span className="info-value">
                    {formatSectorsList(Advised_DA_sectors) || "Not available"}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Year founded:</span>
                  <span className="info-value">
                    {Advisor.year_founded || "Not available"}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">HQ:</span>
                  <span className="info-value">{hq || "Not available"}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Website:</span>
                  <span className="info-value">
                    {Advisor.url ? (
                      <a
                        href={Advisor.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#3b82f6", textDecoration: "none" }}
                      >
                        {Advisor.url}
                      </a>
                    ) : (
                      "Not available"
                    )}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">
                    Data & Analytics transactions advised:
                  </span>
                  <span className="info-value">
                    {Portfolio_companies_count}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">LinkedIn Members:</span>
                  <span className="info-value">
                    {formatNumber(
                      Advisor._linkedin_data_of_new_company?.linkedin_employee
                    )}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">LinkedIn Members Date:</span>
                  <span className="info-value">
                    {formatDate(
                      Advisor._linkedin_data_of_new_company?.linkedin_emp_date
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Historic LinkedIn Data Section */}
            <div className="advisor-section">
              <h2 className="section-title">Historic LinkedIn Data</h2>
              {linkedInHistoryLoading ? (
                <div className="loading">Loading LinkedIn history...</div>
              ) : linkedInHistory.length > 0 ? (
                <LinkedInHistoryChart data={linkedInHistory} />
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "24px",
                    color: "#6b7280",
                  }}
                >
                  No LinkedIn history data available
                </div>
              )}
            </div>

            {/* Advisors Section */}
            <div className="advisor-section">
              <h2 className="section-title">Advisors</h2>
              <div className="info-value">
                {Advisors_individuals.length > 0
                  ? Advisors_individuals.map((individual, index) => (
                      <span key={individual.id}>
                        <span
                          onClick={() =>
                            handleAdvisorClick(individual.individuals_id)
                          }
                          className="advisor-link"
                        >
                          {individual.advisor_individuals}
                        </span>
                        {index < Advisors_individuals.length - 1 ? ", " : ""}
                      </span>
                    ))
                  : "Not available"}
              </div>
            </div>

            {/* Description Section */}
            <div className="advisor-section">
              <h2 className="section-title">Description</h2>
              <div className="info-value" style={{ whiteSpace: "pre-wrap" }}>
                {Advisor.description || "Not available"}
              </div>
            </div>
          </div>

          {/* Right Column - Corporate Events */}
          <div className="advisor-right-column">
            <div className="advisor-section">
              <div className="corporate-events-header">
                <h2 className="section-title">Corporate Events</h2>
                {corporateEvents?.New_Events_Wits_Advisors &&
                  corporateEvents.New_Events_Wits_Advisors.length > 5 && (
                    <button
                      onClick={handleToggleEvents}
                      className="toggle-button"
                    >
                      {eventsExpanded ? "Show less" : "See more"}
                    </button>
                  )}
              </div>

              {corporateEvents?.New_Events_Wits_Advisors &&
              corporateEvents.New_Events_Wits_Advisors.length > 0 ? (
                <>
                  {/* Desktop Table View */}
                  <div className="events-table-container">
                    <table className="events-table">
                      <thead>
                        <tr>
                          <th>Description</th>
                          <th>Date Announced</th>
                          <th>Type</th>
                          <th>Counterparty Advised</th>
                          <th>Other Counterparties</th>
                          <th>Enterprise Value</th>
                          <th>Individuals</th>
                          <th>Other Advisors</th>
                        </tr>
                      </thead>
                      <tbody>
                        {corporateEvents.New_Events_Wits_Advisors.slice(
                          0,
                          eventsExpanded ? undefined : 5
                        ).map((event, index) => {
                          // Helper functions to extract data
                          const getCounterpartyAdvised = () => {
                            const advised =
                              event
                                ._counterparty_advised_of_corporate_events?.[0];
                            return (
                              advised?._counterpartys_type
                                ?.counterparty_status || "—"
                            );
                          };

                          const getOtherCounterparties = () => {
                            if (
                              !event._other_counterparties_of_corporate_events
                                ?.length
                            )
                              return "—";
                            return event._other_counterparties_of_corporate_events
                              .map((cp) => cp.name)
                              .filter(Boolean)
                              .join(", ");
                          };

                          const getEnterpriseValue = () => {
                            if (
                              !event.ev_data?.enterprise_value_m ||
                              !event.ev_data?._currency ||
                              !event.ev_data._currency.Currency
                            )
                              return "—";
                            const value = parseFloat(
                              event.ev_data.enterprise_value_m
                            );
                            const currency = event.ev_data._currency.Currency;
                            return `${currency}${value.toLocaleString()}`;
                          };

                          const getIndividuals = () => {
                            if (
                              !event
                                .__related_to_corporate_event_advisors_individuals
                                ?.length
                            )
                              return "—";
                            return event.__related_to_corporate_event_advisors_individuals
                              .map(
                                (ind) => ind._individuals?.advisor_individuals
                              )
                              .filter(Boolean)
                              .join(", ");
                          };

                          const getOtherAdvisors = () => {
                            if (
                              !event._other_advisors_of_corporate_event?.length
                            )
                              return "—";
                            return event._other_advisors_of_corporate_event
                              .map((advisor) => ({
                                name: advisor._new_company?.name,
                                id: advisor._new_company?.id,
                              }))
                              .filter((advisor) => advisor.name && advisor.id);
                          };

                          return (
                            <tr key={index}>
                              <td>
                                <span
                                  onClick={() => {
                                    console.log("Event object:", event);
                                    console.log("Event ID:", event.id);
                                    handleCorporateEventClick(event.id);
                                  }}
                                  className="event-link"
                                >
                                  {event.description}
                                </span>
                              </td>
                              <td>{formatDate(event.announcement_date)}</td>
                              <td>{event.deal_type || "—"}</td>
                              <td>{getCounterpartyAdvised()}</td>
                              <td>{getOtherCounterparties()}</td>
                              <td>{getEnterpriseValue()}</td>
                              <td>{getIndividuals()}</td>
                              <td>
                                {(() => {
                                  const advisors = getOtherAdvisors();
                                  if (advisors === "—") return "—";
                                  return advisors.map((advisor, index) => (
                                    <span key={advisor.id}>
                                      <span
                                        onClick={() =>
                                          handleOtherAdvisorClick(advisor.id)
                                        }
                                        className="advisor-link"
                                      >
                                        {advisor.name}
                                      </span>
                                      {index < advisors.length - 1 ? ", " : ""}
                                    </span>
                                  ));
                                })()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards View */}
                  <div className="events-cards">
                    {corporateEvents.New_Events_Wits_Advisors.slice(
                      0,
                      eventsExpanded ? undefined : 5
                    ).map((event, index) => {
                      // Same helper functions for mobile cards
                      const getCounterpartyAdvised = () => {
                        const advised =
                          event._counterparty_advised_of_corporate_events?.[0];
                        return (
                          advised?._counterpartys_type?.counterparty_status ||
                          "—"
                        );
                      };

                      const getOtherCounterparties = () => {
                        if (
                          !event._other_counterparties_of_corporate_events
                            ?.length
                        )
                          return "—";
                        return event._other_counterparties_of_corporate_events
                          .map((cp) => cp.name)
                          .filter(Boolean)
                          .join(", ");
                      };

                      const getEnterpriseValue = () => {
                        if (
                          !event.ev_data?.enterprise_value_m ||
                          !event.ev_data?._currency ||
                          !event.ev_data._currency.Currency
                        )
                          return "—";
                        const value = parseFloat(
                          event.ev_data.enterprise_value_m
                        );
                        const currency = event.ev_data._currency.Currency;
                        return `${currency}${value.toLocaleString()}`;
                      };

                      const getIndividuals = () => {
                        if (
                          !event
                            .__related_to_corporate_event_advisors_individuals
                            ?.length
                        )
                          return "—";
                        return event.__related_to_corporate_event_advisors_individuals
                          .map((ind) => ind._individuals?.advisor_individuals)
                          .filter(Boolean)
                          .join(", ");
                      };

                      const getOtherAdvisors = () => {
                        if (!event._other_advisors_of_corporate_event?.length)
                          return "—";
                        return event._other_advisors_of_corporate_event
                          .map((advisor) => ({
                            name: advisor._new_company?.name,
                            id: advisor._new_company?.id,
                          }))
                          .filter((advisor) => advisor.name && advisor.id);
                      };

                      return (
                        <div key={index} className="event-card">
                          <div
                            className="event-card-title"
                            onClick={() => {
                              console.log("Event object:", event);
                              console.log("Event ID:", event.id);
                              handleCorporateEventClick(event.id);
                            }}
                          >
                            {event.description}
                          </div>
                          <div className="event-card-info">
                            <div className="event-card-info-item">
                              <span className="event-card-info-label">
                                Date:
                              </span>
                              <span className="event-card-info-value">
                                {formatDate(event.announcement_date)}
                              </span>
                            </div>
                            <div className="event-card-info-item">
                              <span className="event-card-info-label">
                                Type:
                              </span>
                              <span className="event-card-info-value">
                                {event.deal_type || "—"}
                              </span>
                            </div>
                            <div className="event-card-info-item">
                              <span className="event-card-info-label">
                                Counterparty:
                              </span>
                              <span className="event-card-info-value">
                                {getCounterpartyAdvised()}
                              </span>
                            </div>
                            <div className="event-card-info-item">
                              <span className="event-card-info-label">
                                Value:
                              </span>
                              <span className="event-card-info-value">
                                {getEnterpriseValue()}
                              </span>
                            </div>
                            <div
                              className="event-card-info-item"
                              style={{ gridColumn: "1 / -1" }}
                            >
                              <span className="event-card-info-label">
                                Other Counterparties:
                              </span>
                              <span className="event-card-info-value">
                                {getOtherCounterparties()}
                              </span>
                            </div>
                            <div
                              className="event-card-info-item"
                              style={{ gridColumn: "1 / -1" }}
                            >
                              <span className="event-card-info-label">
                                Individuals:
                              </span>
                              <span className="event-card-info-value">
                                {getIndividuals()}
                              </span>
                            </div>
                            <div
                              className="event-card-info-item"
                              style={{ gridColumn: "1 / -1" }}
                            >
                              <span className="event-card-info-label">
                                Other Advisors:
                              </span>
                              <span className="event-card-info-value">
                                {(() => {
                                  const advisors = getOtherAdvisors();
                                  if (advisors === "—") return "—";
                                  return advisors.map((advisor, index) => (
                                    <span key={advisor.id}>
                                      <span
                                        onClick={() =>
                                          handleOtherAdvisorClick(advisor.id)
                                        }
                                        className="advisor-link"
                                      >
                                        {advisor.name}
                                      </span>
                                      {index < advisors.length - 1 ? ", " : ""}
                                    </span>
                                  ));
                                })()}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="no-events">No corporate events available</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
      <style dangerouslySetInnerHTML={{ __html: style }} />
    </div>
  );
}
