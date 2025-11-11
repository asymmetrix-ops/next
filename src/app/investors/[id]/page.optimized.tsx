"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CompanyLogo from "@/components/investor/CompanyLogo";
import CompanyDescription from "@/components/investor/CompanyDescription";
import InvestorOverview from "@/components/investor/InvestorOverview";
import InvestmentTeam from "@/components/investor/InvestmentTeam";
import Pagination from "@/components/investor/Pagination";
import { useInvestorData } from "@/hooks/useInvestorData";
import { usePortfolioData } from "@/hooks/usePortfolioData";
import { useCorporateEventsData } from "@/hooks/useCorporateEventsData";
import { formatNumber, formatDate } from "@/utils/investorHelpers";
import type {
  PortfolioCompany,
  PaginationState,
  MappedCorporateEvent,
} from "@/types/investor";

type TabType = "current" | "past" | "corporate";

const InvestorDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const investorId = params.id as string;

  // Data hooks
  const { investorData, loading, error, refetch } = useInvestorData(investorId);
  const {
    portfolioCompanies,
    portfolioPagination,
    portfolioLoading,
    fetchPortfolioCompanies,
    pastPortfolioCompanies,
    pastPortfolioPagination,
    pastPortfolioLoading,
    fetchPastPortfolioCompanies,
  } = usePortfolioData(investorId);
  const {
    mappedCorporateEvents,
    loading: corporateEventsLoading,
    fetchCorporateEvents,
  } = useCorporateEventsData(investorId);

  // UI state
  const [activePortfolioTab, setActivePortfolioTab] =
    useState<TabType>("current");

  // Initialize data
  useEffect(() => {
    if (investorId) {
      fetchPortfolioCompanies(1);
      fetchPastPortfolioCompanies(1);
      fetchCorporateEvents();
    }
  }, [
    investorId,
    fetchPortfolioCompanies,
    fetchPastPortfolioCompanies,
    fetchCorporateEvents,
  ]);

  // Navigation handlers
  const handleCompanyClick = useCallback(
    (companyId: number) => {
      router.push(`/company/${companyId}`);
    },
    [router]
  );

  const handleCompanyNameClick = useCallback(
    async (companyName: string) => {
      try {
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
          const matchingCompany = data.companies?.items?.find(
            (company: { name: string; id: number }) =>
              company.name === companyName
          );

          if (matchingCompany?.id) {
            router.push(`/company/${matchingCompany.id}`);
          } else {
            router.push(`/companies?search=${encodeURIComponent(companyName)}`);
          }
        } else {
          router.push(`/companies?search=${encodeURIComponent(companyName)}`);
        }
      } catch (error) {
        console.error("Error handling company name click:", error);
        router.push(`/companies?search=${encodeURIComponent(companyName)}`);
      }
    },
    [router]
  );

  const handleCorporateEventDescriptionClick = useCallback(
    async (eventId?: number, eventDescription?: string) => {
      if (eventId) {
        router.push(`/corporate-event/${eventId}`);
        return;
      }

      if (!eventDescription) return;

      try {
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
          const matchingEvent = data.items?.find(
            (event: { description: string; id: number }) =>
              event.description === eventDescription
          );

          if (matchingEvent?.id) {
            router.push(`/corporate-event/${matchingEvent.id}`);
          } else {
            router.push(
              `/corporate-events?search=${encodeURIComponent(eventDescription)}`
            );
          }
        } else {
          router.push(
            `/corporate-events?search=${encodeURIComponent(eventDescription)}`
          );
        }
      } catch (error) {
        console.error("Error searching for event:", error);
        router.push(
          `/corporate-events?search=${encodeURIComponent(eventDescription)}`
        );
      }
    },
    [router]
  );

  const handleAdvisorClick = useCallback(
    async (advisorName: string) => {
      try {
        const token = localStorage.getItem("asymmetrix_auth_token");
        const params = new URLSearchParams();
        params.append("search_query", advisorName);
        params.append("Page", "0");
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
          const matchingIndividual = data.Individuals_list?.items?.find(
            (individual: { advisor_individuals: string; id: number }) =>
              individual.advisor_individuals === advisorName
          );

          if (matchingIndividual?.id) {
            router.push(`/individual/${matchingIndividual.id}`);
          }
        }
      } catch (error) {
        console.error("Error handling advisor click:", error);
      }
    },
    [router]
  );

  const handleReportIncorrectData = useCallback(() => {
    const name = investorData?.Investor?.name ?? "";
    const subject = `Contribute Investor Data – ${name} (ID ${investorId})`;
    const body =
      "Please describe the data you would like to contribute for this investor page.";
    const mailto = `mailto:asymmetrix@asymmetrixintelligence.com?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
    if (typeof window !== "undefined") {
      window.location.href = mailto;
    }
  }, [investorData?.Investor?.name, investorId]);

  // Loading state
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

  // Error state
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
              onClick={refetch}
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

  // No data state
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

  const { Investor } = investorData;

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <Header />

      <div style={{ flex: "1", padding: "32px", width: "100%" }}>
        {/* Page Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "32px",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              flex: "1",
            }}
          >
            <CompanyLogo
              logo={Investor._linkedin_data_of_new_company?.linkedin_logo || ""}
              name={Investor.name}
            />
            <div>
              <h1 style={{ margin: "0", fontSize: "32px", fontWeight: "bold" }}>
                {Investor.name}
              </h1>
            </div>
          </div>
          <button
            onClick={handleReportIncorrectData}
            style={{
              padding: "8px 16px",
              backgroundColor: "#16a34a",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Contribute Data
          </button>
        </div>

        <div style={{ display: "flex", gap: "32px", flexWrap: "wrap" }}>
          {/* Left Column - Overview */}
          <InvestorOverview investorData={investorData} />

          {/* Investment Team */}
          <InvestmentTeam
            currentTeam={investorData.Investment_Team_Roles_current}
            pastTeam={investorData.Investment_Team_Roles_past}
          />

          {/* Right Column - Portfolio and Corporate Events */}
          <div style={{ flex: "2", minWidth: "600px" }}>
            {/* Portfolio Section */}
            <div
              style={{
                backgroundColor: "white",
                padding: "24px",
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                marginBottom: "24px",
              }}
            >
              <div style={{ marginBottom: "16px" }}>
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  {(["current", "past", "corporate"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActivePortfolioTab(tab)}
                      style={{
                        padding: "12px 16px",
                        backgroundColor:
                          activePortfolioTab === tab
                            ? "#3b82f6"
                            : "transparent",
                        color: activePortfolioTab === tab ? "white" : "#64748b",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "500",
                        borderBottom:
                          activePortfolioTab === tab
                            ? "2px solid #3b82f6"
                            : "none",
                      }}
                    >
                      {tab === "current" && "Current Portfolio"}
                      {tab === "past" && "Past Portfolio"}
                      {tab === "corporate" && "Corporate Events"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              {activePortfolioTab === "current" && (
                <PortfolioTable
                  companies={portfolioCompanies}
                  loading={portfolioLoading}
                  pagination={portfolioPagination}
                  onCompanyClick={handleCompanyClick}
                  onPageChange={fetchPortfolioCompanies}
                />
              )}

              {activePortfolioTab === "past" && (
                <PortfolioTable
                  companies={pastPortfolioCompanies}
                  loading={pastPortfolioLoading}
                  pagination={pastPortfolioPagination}
                  onCompanyClick={handleCompanyClick}
                  onPageChange={fetchPastPortfolioCompanies}
                />
              )}

              {activePortfolioTab === "corporate" && (
                <CorporateEventsTable
                  events={mappedCorporateEvents}
                  loading={corporateEventsLoading}
                  onEventClick={handleCorporateEventDescriptionClick}
                  onCompanyClick={handleCompanyNameClick}
                  onAdvisorClick={handleAdvisorClick}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

// Memoized sub-components
const PortfolioTable = React.memo<{
  companies: PortfolioCompany[];
  loading: boolean;
  pagination: PaginationState;
  onCompanyClick: (id: number) => void;
  onPageChange: (page: number) => void;
}>(({ companies, loading, pagination, onCompanyClick, onPageChange }) => {
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "24px" }}>
        Loading portfolio companies...
      </div>
    );
  }

  return (
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
            {companies.length > 0 ? (
              companies.map((company) => (
                <tr
                  key={company.id}
                  style={{ borderBottom: "1px solid #e2e8f0" }}
                >
                  <td style={{ padding: "12px" }}>
                    <CompanyLogo
                      logo={
                        company._linkedin_data_of_new_company?.linkedin_logo ||
                        ""
                      }
                      name={company.name}
                    />
                  </td>
                  <td style={{ padding: "12px" }}>
                    <span
                      style={{
                        color: "#3b82f6",
                        textDecoration: "none",
                        fontWeight: "500",
                        cursor: "pointer",
                      }}
                      onClick={() => onCompanyClick(company.id)}
                    >
                      {company.name}
                    </span>
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
                  <td style={{ padding: "12px", maxWidth: "200px" }}>
                    <CompanyDescription description={company.description} />
                  </td>
                  <td style={{ padding: "12px" }}>
                    <span style={{ color: "#64748b" }}>Not available</span>
                  </td>
                  <td style={{ padding: "12px" }}>
                    {formatNumber(
                      company._linkedin_data_of_new_company?.linkedin_employee
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
                  No portfolio companies found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination pagination={pagination} onPageChange={onPageChange} />
    </>
  );
});

const CorporateEventsTable = React.memo<{
  events: MappedCorporateEvent[];
  loading: boolean;
  onEventClick: (id?: number, description?: string) => void;
  onCompanyClick: (name: string) => void;
  onAdvisorClick: (name: string) => void;
}>(({ events, loading, onEventClick, onCompanyClick, onAdvisorClick }) => {
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "24px" }}>
        Loading corporate events...
      </div>
    );
  }

  return (
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
          minWidth: "900px",
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
          {events.length > 0 ? (
            events.map((event, index) => (
              <tr key={index} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "12px" }}>
                  <div style={{ maxWidth: "200px" }}>
                    <span
                      style={{
                        color: "#3b82f6",
                        textDecoration: "none",
                        fontWeight: "500",
                        cursor: "pointer",
                      }}
                      onClick={() => onEventClick(event.id, event.description)}
                    >
                      <CompanyDescription description={event.description} />
                    </span>
                  </div>
                </td>
                <td style={{ padding: "12px" }}>
                  {event.announcement_date
                    ? formatDate(event.announcement_date)
                    : "—"}
                </td>
                <td style={{ padding: "12px" }}>{event.type || "—"}</td>
                <td style={{ padding: "12px" }}>{event.counterparty_status}</td>
                <td style={{ padding: "12px" }}>
                  <div style={{ maxWidth: "150px", fontSize: "12px" }}>
                    {event.other_counterparties !== "—"
                      ? event.other_counterparties
                          .split(", ")
                          .map((companyName: string, idx: number) => (
                            <span key={idx}>
                              <span
                                style={{
                                  color: "#3b82f6",
                                  textDecoration: "none",
                                  fontWeight: "500",
                                  cursor: "pointer",
                                }}
                                onClick={() => onCompanyClick(companyName)}
                              >
                                {companyName}
                              </span>
                              {idx <
                                event.other_counterparties.split(", ").length -
                                  1 && ", "}
                            </span>
                          ))
                      : "—"}
                  </div>
                </td>
                <td style={{ padding: "12px" }}>{event.enterprise_value}</td>
                <td style={{ padding: "12px" }}>
                  <div style={{ maxWidth: "150px", fontSize: "12px" }}>
                    {event.advisors !== "—"
                      ? event.advisors
                          .split(", ")
                          .map((advisorName: string, idx: number) => (
                            <span key={idx}>
                              <span
                                style={{
                                  color: "#3b82f6",
                                  textDecoration: "none",
                                  fontWeight: "500",
                                  cursor: "pointer",
                                }}
                                onClick={() => onAdvisorClick(advisorName)}
                              >
                                {advisorName}
                              </span>
                              {idx < event.advisors.split(", ").length - 1 &&
                                ", "}
                            </span>
                          ))
                      : "—"}
                  </div>
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
  );
});

PortfolioTable.displayName = "PortfolioTable";
CorporateEventsTable.displayName = "CorporateEventsTable";

const InvestorPage = () => {
  return <InvestorDetailPage />;
};

export default InvestorPage;
