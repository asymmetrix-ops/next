"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAdvisorProfile } from "../../../hooks/useAdvisorProfile";
import { formatSectorsList, formatDate } from "../../../utils/advisorHelpers";

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
              logo={Advisor._linkedin_data_of_new_company?.linkedin_logo || ""}
              name={Advisor.name}
            />
            <div>
              <h1 style={{ margin: "0", fontSize: "32px", fontWeight: "bold" }}>
                {Advisor.name}
              </h1>
            </div>
          </div>
          <button
            onClick={handleReportIncorrectData}
            style={{
              padding: "8px 16px",
              backgroundColor: "#dc2626",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Report Incorrect Data
          </button>
        </div>

        <div style={{ display: "flex", gap: "32px", flexWrap: "wrap" }}>
          {/* Left Column - Overview */}
          <div style={{ flex: "1", minWidth: "300px" }}>
            {/* Overview Section */}
            <div
              style={{
                backgroundColor: "white",
                padding: "24px",
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                marginBottom: "24px",
              }}
            >
              <h2
                style={{
                  margin: "0 0 16px 0",
                  fontSize: "20px",
                  fontWeight: "bold",
                }}
              >
                Overview
              </h2>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <div>
                  <strong>Advised D&A sectors:</strong>{" "}
                  {formatSectorsList(Advised_DA_sectors) || "Not available"}
                </div>
                <div>
                  <strong>Year founded:</strong>{" "}
                  {Advisor.year_founded || "Not available"}
                </div>
                <div>
                  <strong>HQ:</strong> {hq || "Not available"}
                </div>
                <div>
                  <strong>Website:</strong>{" "}
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
                </div>
                <div>
                  <strong>Data & Analytics transactions advised:</strong>{" "}
                  {Portfolio_companies_count}
                </div>
                <div>
                  <strong>LinkedIn Members:</strong>{" "}
                  {formatNumber(
                    Advisor._linkedin_data_of_new_company?.linkedin_employee
                  )}
                </div>
                <div>
                  <strong>LinkedIn Members Date:</strong>{" "}
                  {formatDate(
                    Advisor._linkedin_data_of_new_company?.linkedin_emp_date
                  )}
                </div>
              </div>
            </div>

            {/* Advisors Section */}
            <div
              style={{
                backgroundColor: "white",
                padding: "24px",
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                marginBottom: "24px",
              }}
            >
              <h2
                style={{
                  margin: "0 0 16px 0",
                  fontSize: "20px",
                  fontWeight: "bold",
                }}
              >
                Advisors
              </h2>
              <div>
                {Advisors_individuals.length > 0
                  ? Advisors_individuals.map((individual, index) => (
                      <span key={individual.id}>
                        <span
                          onClick={() =>
                            handleAdvisorClick(individual.individuals_id)
                          }
                          style={{
                            color: "#3b82f6",
                            textDecoration: "none",
                            cursor: "pointer",
                          }}
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
            <div
              style={{
                backgroundColor: "white",
                padding: "24px",
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <h2
                style={{
                  margin: "0 0 16px 0",
                  fontSize: "20px",
                  fontWeight: "bold",
                }}
              >
                Description
              </h2>
              <div style={{ whiteSpace: "pre-wrap" }}>
                {Advisor.description || "Not available"}
              </div>
            </div>
          </div>

          {/* Right Column - Corporate Events */}
          <div style={{ flex: "1", minWidth: "300px" }}>
            <div
              style={{
                backgroundColor: "white",
                padding: "24px",
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <h2
                  style={{
                    margin: "0",
                    fontSize: "20px",
                    fontWeight: "bold",
                  }}
                >
                  Corporate Events
                </h2>
                {corporateEvents?.New_Events_Wits_Advisors &&
                  corporateEvents.New_Events_Wits_Advisors.length > 5 && (
                    <button
                      onClick={handleToggleEvents}
                      style={{
                        color: "#3b82f6",
                        textDecoration: "none",
                        fontSize: "14px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "0",
                      }}
                    >
                      {eventsExpanded ? "Show less" : "See more"}
                    </button>
                  )}
              </div>

              {corporateEvents?.New_Events_Wits_Advisors &&
              corporateEvents.New_Events_Wits_Advisors.length > 0 ? (
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "14px",
                    }}
                  >
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "8px",
                            fontWeight: "bold",
                            fontSize: "12px",
                          }}
                        >
                          Description
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "8px",
                            fontWeight: "bold",
                            fontSize: "12px",
                          }}
                        >
                          Date Announced
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "8px",
                            fontWeight: "bold",
                            fontSize: "12px",
                          }}
                        >
                          Type
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "8px",
                            fontWeight: "bold",
                            fontSize: "12px",
                          }}
                        >
                          Counterparty Advised
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "8px",
                            fontWeight: "bold",
                            fontSize: "12px",
                          }}
                        >
                          Other Counterparties
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "8px",
                            fontWeight: "bold",
                            fontSize: "12px",
                          }}
                        >
                          Enterprise Value
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "8px",
                            fontWeight: "bold",
                            fontSize: "12px",
                          }}
                        >
                          Individuals
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "8px",
                            fontWeight: "bold",
                            fontSize: "12px",
                          }}
                        >
                          Other Advisors
                        </th>
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
                          <tr
                            key={index}
                            style={{ borderBottom: "1px solid #f1f5f9" }}
                          >
                            <td style={{ padding: "8px", fontSize: "12px" }}>
                              <span
                                onClick={() => {
                                  console.log("Event object:", event);
                                  console.log("Event ID:", event.id);
                                  handleCorporateEventClick(event.id);
                                }}
                                style={{
                                  color: "#3b82f6",
                                  textDecoration: "none",
                                  cursor: "pointer",
                                }}
                              >
                                {event.description}
                              </span>
                            </td>
                            <td style={{ padding: "8px", fontSize: "12px" }}>
                              {formatDate(event.announcement_date)}
                            </td>
                            <td style={{ padding: "8px", fontSize: "12px" }}>
                              {event.deal_type || "—"}
                            </td>
                            <td style={{ padding: "8px", fontSize: "12px" }}>
                              {getCounterpartyAdvised()}
                            </td>
                            <td style={{ padding: "8px", fontSize: "12px" }}>
                              {getOtherCounterparties()}
                            </td>
                            <td style={{ padding: "8px", fontSize: "12px" }}>
                              {getEnterpriseValue()}
                            </td>
                            <td style={{ padding: "8px", fontSize: "12px" }}>
                              {getIndividuals()}
                            </td>
                            <td style={{ padding: "8px", fontSize: "12px" }}>
                              {(() => {
                                const advisors = getOtherAdvisors();
                                if (advisors === "—") return "—";
                                return advisors.map((advisor, index) => (
                                  <span key={advisor.id}>
                                    <span
                                      onClick={() =>
                                        handleOtherAdvisorClick(advisor.id)
                                      }
                                      style={{
                                        color: "#3b82f6",
                                        textDecoration: "none",
                                        cursor: "pointer",
                                      }}
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
              ) : (
                <div
                  style={{
                    color: "#6b7280",
                    textAlign: "center",
                    padding: "20px",
                  }}
                >
                  No corporate events available
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
