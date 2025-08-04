"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useIndividualProfile } from "../../../hooks/useIndividualProfile";
import {
  formatIndividualLocation,
  formatDate,
  formatJobTitles,
  formatCurrency,
  getCounterpartyRole,
  formatIndividualsList,
  formatAdvisorsList,
} from "../../../utils/individualHelpers";
import {
  IndividualRole,
  CorporateEvent,
  RelatedIndividual,
} from "../../../types/individual";

// Company Logo Component
const CompanyLogo = ({ logo, name }: { logo: string; name: string }) => {
  if (!logo) {
    return (
      <div
        style={{
          width: "60px",
          height: "40px",
          backgroundColor: "#f7fafc",
          borderRadius: "4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "10px",
          color: "#718096",
        }}
      >
        {name.charAt(0)}
      </div>
    );
  }

  return (
    <Image
      src={`data:image/jpeg;base64,${logo}`}
      alt={`${name} logo`}
      width={60}
      height={40}
      style={{ objectFit: "contain", borderRadius: "4px" }}
    />
  );
};

export default function IndividualProfilePage() {
  const params = useParams();
  const individualId = parseInt(params.param as string);
  const [eventsExpanded, setEventsExpanded] = useState(false);

  const { profileData, eventsData, individualName, loading, error } =
    useIndividualProfile({
      individualId,
    });

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
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div style={{ textAlign: "center", color: "#666" }}>
            Loading individual profile...
          </div>
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
          <div
            style={{
              textAlign: "center",
              color: "#e53e3e",
              backgroundColor: "#fed7d7",
              padding: "20px",
              borderRadius: "6px",
            }}
          >
            {error}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!profileData) {
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
          <div style={{ textAlign: "center", color: "#666" }}>
            Individual not found
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const { Individual, Roles } = profileData;
  const location = formatIndividualLocation(Individual._locations);

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
            <div>
              <h1 style={{ margin: "0", fontSize: "32px", fontWeight: "bold" }}>
                {individualName || Individual.advisor_individuals}
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
                  <strong>Location:</strong> {location || "Not available"}
                </div>
                <div>
                  <strong>Phone:</strong> {Individual.phone || "Not available"}
                </div>
                <div>
                  <strong>Email:</strong> {Individual.email || "Not available"}
                </div>
                <div>
                  <strong>LinkedIn:</strong>{" "}
                  {Individual.linkedin_URL ? (
                    <a
                      href={Individual.linkedin_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#3b82f6", textDecoration: "none" }}
                    >
                      View Profile
                    </a>
                  ) : (
                    "Not available"
                  )}
                </div>
              </div>
            </div>

            {/* Bio Section */}
            {Individual.bio && (
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
                  Bio
                </h2>
                <div style={{ whiteSpace: "pre-wrap" }}>{Individual.bio}</div>
              </div>
            )}

            {/* Roles Section */}
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
                Roles
              </h2>
              {Roles && Roles.length > 0 ? (
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
                          Logo
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "8px",
                            fontWeight: "bold",
                            fontSize: "12px",
                          }}
                        >
                          Company
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "8px",
                            fontWeight: "bold",
                            fontSize: "12px",
                          }}
                        >
                          Status
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "8px",
                            fontWeight: "bold",
                            fontSize: "12px",
                          }}
                        >
                          Role
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "8px",
                            fontWeight: "bold",
                            fontSize: "12px",
                          }}
                        >
                          URL
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Roles.map((role: IndividualRole, index: number) => (
                        <tr
                          key={index}
                          style={{ borderBottom: "1px solid #f1f5f9" }}
                        >
                          <td style={{ padding: "8px", fontSize: "12px" }}>
                            <CompanyLogo
                              logo={
                                role.new_company._linkedin_data_of_new_company
                                  ?.linkedin_logo || ""
                              }
                              name={role.new_company.name}
                            />
                          </td>
                          <td style={{ padding: "8px", fontSize: "12px" }}>
                            <a
                              href="#"
                              style={{
                                color: "#3b82f6",
                                textDecoration: "none",
                              }}
                            >
                              {role.new_company.name}
                            </a>
                          </td>
                          <td style={{ padding: "8px", fontSize: "12px" }}>
                            <span
                              style={{
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontSize: "10px",
                                backgroundColor:
                                  role.Status === "Current"
                                    ? "#dcfce7"
                                    : "#f3f4f6",
                                color:
                                  role.Status === "Current"
                                    ? "#166534"
                                    : "#374151",
                              }}
                            >
                              {role.Status}
                            </span>
                          </td>
                          <td style={{ padding: "8px", fontSize: "12px" }}>
                            {formatJobTitles(role.job_titles_id)}
                          </td>
                          <td style={{ padding: "8px", fontSize: "12px" }}>
                            {role.current_employer_url ? (
                              <a
                                href={role.current_employer_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: "#3b82f6",
                                  textDecoration: "none",
                                  fontSize: "10px",
                                }}
                              >
                                View Profile
                              </a>
                            ) : (
                              <span
                                style={{ color: "#6b7280", fontSize: "10px" }}
                              >
                                Not available
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
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
                  No roles available
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Corporate Events & Related Individuals */}
          <div style={{ flex: "1", minWidth: "300px" }}>
            {/* Corporate Events Section */}
            <div
              style={{
                backgroundColor: "white",
                padding: "24px",
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                marginBottom: "24px",
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
                  style={{ margin: "0", fontSize: "20px", fontWeight: "bold" }}
                >
                  Corporate Events
                </h2>
                {eventsData?.events && eventsData.events.length > 5 && (
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

              {eventsData?.events && eventsData.events.length > 0 ? (
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
                          Related Counterparty
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
                          Advisors
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventsData.events
                        .slice(0, eventsExpanded ? undefined : 5)
                        .map((event: CorporateEvent, index: number) => (
                          <tr
                            key={index}
                            style={{ borderBottom: "1px solid #f1f5f9" }}
                          >
                            <td style={{ padding: "8px", fontSize: "12px" }}>
                              <a
                                href="#"
                                style={{
                                  color: "#3b82f6",
                                  textDecoration: "none",
                                }}
                              >
                                {event.description}
                              </a>
                            </td>
                            <td style={{ padding: "8px", fontSize: "12px" }}>
                              {formatDate(event.announcement_date)}
                            </td>
                            <td style={{ padding: "8px", fontSize: "12px" }}>
                              {event.deal_type || "—"}
                            </td>
                            <td style={{ padding: "8px", fontSize: "12px" }}>
                              {getCounterpartyRole(event)}
                            </td>
                            <td style={{ padding: "8px", fontSize: "12px" }}>
                              {event._other_counterparties_of_corporate_events
                                .length > 0
                                ? event._other_counterparties_of_corporate_events
                                    .map((cp) => cp.name)
                                    .join(", ")
                                : "—"}
                            </td>
                            <td style={{ padding: "8px", fontSize: "12px" }}>
                              {event.ev_data.enterprise_value_m &&
                              event.ev_data._currency
                                ? formatCurrency(
                                    event.ev_data.enterprise_value_m,
                                    event.ev_data._currency.Currency
                                  )
                                : "—"}
                            </td>
                            <td style={{ padding: "8px", fontSize: "12px" }}>
                              {formatIndividualsList(
                                event._related_to_corporate_event_individuals
                              )}
                            </td>
                            <td style={{ padding: "8px", fontSize: "12px" }}>
                              {formatAdvisorsList(
                                event._related_advisor_to_corporate_events
                              )}
                            </td>
                          </tr>
                        ))}
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

            {/* Related Individuals Section */}
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
                Related Individuals
              </h2>
              {eventsData?.all_related_individuals &&
              eventsData.all_related_individuals.length > 0 ? (
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
                          Logo
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "8px",
                            fontWeight: "bold",
                            fontSize: "12px",
                          }}
                        >
                          Company
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "8px",
                            fontWeight: "bold",
                            fontSize: "12px",
                          }}
                        >
                          Individual
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "8px",
                            fontWeight: "bold",
                            fontSize: "12px",
                          }}
                        >
                          Status
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "8px",
                            fontWeight: "bold",
                            fontSize: "12px",
                          }}
                        >
                          Role
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventsData.all_related_individuals.map(
                        (
                          relatedIndividual: RelatedIndividual,
                          index: number
                        ) => (
                          <tr
                            key={index}
                            style={{ borderBottom: "1px solid #f1f5f9" }}
                          >
                            <td style={{ padding: "8px", fontSize: "12px" }}>
                              <CompanyLogo
                                logo={
                                  relatedIndividual._new_company
                                    ._linkedin_data_of_new_company
                                    ?.linkedin_logo || ""
                                }
                                name={relatedIndividual._new_company.name}
                              />
                            </td>
                            <td style={{ padding: "8px", fontSize: "12px" }}>
                              <a
                                href="#"
                                style={{
                                  color: "#3b82f6",
                                  textDecoration: "none",
                                }}
                              >
                                {relatedIndividual._new_company.name}
                              </a>
                            </td>
                            <td style={{ padding: "8px", fontSize: "12px" }}>
                              <a
                                href="#"
                                style={{
                                  color: "#3b82f6",
                                  textDecoration: "none",
                                }}
                              >
                                {
                                  relatedIndividual._individuals
                                    .advisor_individuals
                                }
                              </a>
                            </td>
                            <td style={{ padding: "8px", fontSize: "12px" }}>
                              <span
                                style={{
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  fontSize: "10px",
                                  backgroundColor:
                                    relatedIndividual.Status === "Current"
                                      ? "#dcfce7"
                                      : "#f3f4f6",
                                  color:
                                    relatedIndividual.Status === "Current"
                                      ? "#166534"
                                      : "#374151",
                                }}
                              >
                                {relatedIndividual.Status}
                              </span>
                            </td>
                            <td style={{ padding: "8px", fontSize: "12px" }}>
                              {relatedIndividual.job_titles_id
                                .map((jt) => jt.job_title)
                                .join(", ") || "—"}
                            </td>
                          </tr>
                        )
                      )}
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
                  No related individuals available
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
