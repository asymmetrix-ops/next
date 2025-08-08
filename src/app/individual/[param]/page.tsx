"use client";

import { useParams, useRouter } from "next/navigation";
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
  formatAdvisorsList,
} from "../../../utils/individualHelpers";
import {
  IndividualRole,
  CorporateEvent,
  RelatedIndividual,
} from "../../../types/individual";
// import { useRightClick } from "../../../hooks/useRightClick";

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
  const router = useRouter();
  const individualId = parseInt(params.param as string);
  const [eventsExpanded, setEventsExpanded] = useState(false);
  // Right-click handled via native anchors now

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
                  <strong>LinkedIn:</strong>{" "}
                  {Individual.linkedin_URL ? (
                    <a
                      href={Individual.linkedin_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "#3b82f6",
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                      title="Open LinkedIn profile"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.761 0 5-2.239 5-5v-14c0-2.761-2.239-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764 0-.974.784-1.764 1.75-1.764s1.75.79 1.75 1.764c0 .974-.784 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-1.337-.026-3.059-1.865-3.059-1.865 0-2.151 1.455-2.151 2.961v5.702h-3v-11h2.879v1.507h.041c.401-.759 1.379-1.561 2.84-1.561 3.038 0 3.6 2.001 3.6 4.604v6.45z" />
                      </svg>
                      LinkedIn
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
                              href={`/company/${role.new_company.id}`}
                              style={{
                                color: "#3b82f6",
                                textDecoration: "underline",
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
                          Other Individuals
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
                                href={`/corporate-event/${event.id}`}
                                style={{
                                  color: "#3b82f6",
                                  textDecoration: "none",
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
                                  router.push(`/corporate-event/${event.id}`);
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
                              {(() => {
                                const advised =
                                  event
                                    ._counterparty_advised_of_corporate_events?.[0];
                                return (
                                  advised?._counterpartys_type
                                    ?.counterparty_status || "Not available"
                                );
                              })()}
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
                              event.ev_data._currency &&
                              event.ev_data._currency.Currency
                                ? formatCurrency(
                                    event.ev_data.enterprise_value_m,
                                    event.ev_data._currency.Currency
                                  )
                                : "—"}
                            </td>
                            <td style={{ padding: "8px", fontSize: "12px" }}>
                              {event._related_to_corporate_event_individuals &&
                              event._related_to_corporate_event_individuals
                                .length > 0
                                ? event._related_to_corporate_event_individuals.map(
                                    (ind, i) => (
                                      <span key={`${ind.id}-${i}`}>
                                        <a
                                          href={`/individual/${ind.id}`}
                                          style={{
                                            color: "#3b82f6",
                                            textDecoration: "none",
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
                                            router.push(
                                              `/individual/${ind.id}`
                                            );
                                          }}
                                          title="Click to open individual's profile"
                                        >
                                          {ind.advisor_individuals}
                                        </a>
                                        {i <
                                        event
                                          ._related_to_corporate_event_individuals
                                          .length -
                                          1
                                          ? ", "
                                          : ""}
                                      </span>
                                    )
                                  )
                                : "—"}
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
                              <span
                                style={{
                                  color: "#3b82f6",
                                  textDecoration: "none",
                                  cursor: "pointer",
                                }}
                                onClick={() =>
                                  router.push(
                                    `/company/${relatedIndividual._new_company.id}`
                                  )
                                }
                                title="Click to open company page"
                              >
                                {relatedIndividual._new_company.name}
                              </span>
                            </td>
                            <td style={{ padding: "8px", fontSize: "12px" }}>
                              <span
                                style={{
                                  color: "#3b82f6",
                                  textDecoration: "none",
                                  cursor: "pointer",
                                }}
                                onClick={() =>
                                  router.push(
                                    `/individual/${relatedIndividual._individuals.id}`
                                  )
                                }
                                title="Click to open individual's profile"
                              >
                                {
                                  relatedIndividual._individuals
                                    .advisor_individuals
                                }
                              </span>
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
