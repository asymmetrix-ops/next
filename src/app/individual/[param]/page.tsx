"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import Head from "next/head";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CorporateEventDealMetrics } from "@/components/corporate-events/CorporateEventDealMetrics";
import { useIndividualProfile } from "../../../hooks/useIndividualProfile";
import {
  formatIndividualLocation,
  formatDate,
  formatJobTitles,
  formatAdvisorsList,
} from "../../../utils/individualHelpers";
import {
  IndividualRole,
  CorporateEvent,
  RelatedIndividual,
} from "../../../types/individual";
// import { useRightClick } from "../../../hooks/useRightClick";
import { individualService } from "../../../lib/individualService";

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
  const [otherIndividualNames, setOtherIndividualNames] = useState<
    Record<number, string>
  >({});
  // Right-click handled via native anchors now

  const { profileData, eventsData, individualName, loading, error } =
    useIndividualProfile({
      individualId,
    });

  // Load display names for "Other Individuals" in events table when only IDs are present
  useEffect(() => {
    const events = eventsData?.events || [];
    const ids = new Set<number>();
    events.forEach((evt) => {
      (evt._related_to_corporate_event_individuals || []).forEach((ind) => {
        if (ind?.id && ind.id !== individualId) ids.add(ind.id);
      });
    });
    const missing = Array.from(ids).filter(
      (id) => otherIndividualNames[id] == null
    );
    if (missing.length === 0) return;

    let cancelled = false;
    (async () => {
      const pairs = await Promise.all(
        missing.map(async (id) => {
          try {
            const name = await individualService.getIndividualName(id);
            return [id, String(name)] as const;
          } catch {
            return [id, `Individual ${id}`] as const;
          }
        })
      );
      if (!cancelled) {
        setOtherIndividualNames((prev) => {
          const next = { ...prev } as Record<number, string>;
          pairs.forEach(([id, name]) => (next[id] = name));
          return next;
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eventsData?.events, individualId, otherIndividualNames]);

  // Update page title when individual data is loaded
  if (
    typeof document !== "undefined" &&
    (profileData?.Individual?.advisor_individuals || "")
  ) {
    document.title = `Asymmetrix – ${profileData?.Individual?.advisor_individuals}`;
  }

  // mailto link used instead of handler

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
      {Individual?.advisor_individuals && (
        <Head>
          <title>{`Asymmetrix – ${Individual.advisor_individuals}`}</title>
        </Head>
      )}
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
          <a
            href={`mailto:asymmetrix@asymmetrixintelligence.com?subject=${encodeURIComponent(
              `Contribute Individual Data – ${
                individualName || Individual.advisor_individuals
              } (ID ${individualId})`
            )}&body=${encodeURIComponent(
              "Please describe the data you would like to contribute for this individual page."
            )}`}
            style={{
              padding: "8px 16px",
              backgroundColor: "#16a34a",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              textDecoration: "none",
            }}
            target="_blank"
            rel="noopener noreferrer"
          >
            Contribute Data
          </a>
        </div>

        <div style={{ display: "flex", gap: "32px", flexWrap: "wrap" }}>
          {/* Left Column - Overview & Corporate Events */}
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

                {Individual.bio && (
                  <div style={{ marginTop: "8px" }}>
                    <h3
                      style={{
                        margin: "8px 0 8px",
                        fontSize: "16px",
                        fontWeight: "bold",
                      }}
                    >
                      Bio
                    </h3>
                    <div style={{ whiteSpace: "pre-wrap" }}>
                      {Individual.bio}
                    </div>
                  </div>
                )}
              </div>
            </div>

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
                      minWidth: "1100px",
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
                                  textDecoration: "underline",
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
                                const target =
                                  event._target_counterparty_of_corporate_events;
                                return target?.name || "—";
                              })()}
                            </td>
                            <td style={{ padding: "8px", fontSize: "12px" }}>
                              {(() => {
                                const arr =
                                  event._other_counterparties_of_corporate_events ||
                                  [];
                                if (arr.length === 0) return "—";
                                return arr
                                  .map((cp) => cp.name || "—")
                                  .join(", ");
                              })()}
                            </td>
                            <td style={{ padding: "8px", fontSize: "12px" }}>
                              <CorporateEventDealMetrics
                                dealType={event.deal_type}
                                evMillions={event.ev_data?.enterprise_value_m}
                                evCurrency={event.ev_data?._currency?.Currency}
                              />
                            </td>
                            <td style={{ padding: "8px", fontSize: "12px" }}>
                              {(() => {
                                const others =
                                  event._related_to_corporate_event_individuals?.filter(
                                    (ind) => ind.id !== individualId
                                  ) || [];
                                if (others.length === 0) return "—";
                                return others.map((ind, i) => (
                                  <span key={`${ind.id}-${i}`}>
                                    <a
                                      href={`/individual/${ind.id}`}
                                      style={{
                                        color: "#3b82f6",
                                        textDecoration: "underline",
                                      }}
                                    >
                                      {otherIndividualNames[ind.id] ||
                                        ind.advisor_individuals ||
                                        `Individual ${ind.id}`}
                                    </a>
                                    {i < others.length - 1 ? ", " : ""}
                                  </span>
                                ));
                              })()}
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
          </div>

          {/* Right Column - Related Individuals & Roles */}
          <div style={{ flex: "1", minWidth: "300px" }}>
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
                                    ?._linkedin_data_of_new_company
                                    ?.linkedin_logo || ""
                                }
                                name={
                                  relatedIndividual._new_company?.name || "—"
                                }
                              />
                            </td>
                            <td style={{ padding: "8px", fontSize: "12px" }}>
                              {relatedIndividual._new_company?.id ? (
                                <a
                                  href={`/company/${relatedIndividual._new_company.id}`}
                                  style={{
                                    color: "#3b82f6",
                                    textDecoration: "underline",
                                  }}
                                  title="Open company page"
                                >
                                  {relatedIndividual._new_company?.name}
                                </a>
                              ) : (
                                <span style={{ color: "#6b7280" }}>
                                  {relatedIndividual._new_company?.name || "—"}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: "8px", fontSize: "12px" }}>
                              <a
                                href={`/individual/${relatedIndividual._individuals.id}`}
                                style={{
                                  color: "#3b82f6",
                                  textDecoration: "underline",
                                }}
                                title="Open individual's profile"
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
            {/* Roles Section */}
            <div
              style={{
                marginTop: "24px",
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
                                role.new_company?._linkedin_data_of_new_company
                                  ?.linkedin_logo || ""
                              }
                              name={role.new_company?.name || "—"}
                            />
                          </td>
                          <td style={{ padding: "8px", fontSize: "12px" }}>
                            {role.new_company?.id ? (
                              <a
                                href={`/company/${role.new_company.id}`}
                                style={{
                                  color: "#3b82f6",
                                  textDecoration: "underline",
                                }}
                              >
                                {role.new_company?.name}
                              </a>
                            ) : (
                              <span style={{ color: "#6b7280" }}>
                                {role.new_company?.name || "—"}
                              </span>
                            )}
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
        </div>
      </div>
      <Footer />
    </div>
  );
}
