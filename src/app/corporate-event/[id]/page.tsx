"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { corporateEventsService } from "../../../lib/corporateEventsService";
import { CorporateEventDetailResponse } from "../../../types/corporateEvents";

// Shared styles object
const styles = {
  container: {
    backgroundColor: "#f9fafb",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  maxWidth: {
    padding: "32px",
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: "24px",
  },
  card: {
    backgroundColor: "white",
    borderRadius: "12px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    padding: "32px 24px",
    marginBottom: "0",
  },
  heading: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#1a202c",
    marginBottom: "8px",
    marginTop: "0px",
  },
  subHeading: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#1a202c",
    marginBottom: "12px",
  },
  reportButton: {
    backgroundColor: "#dc2626",
    color: "white",
    fontWeight: "600",
    padding: "8px 16px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
    float: "right" as const,
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "24px",
    marginTop: "24px",
  },
  infoColumn: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
  },
  infoItem: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
  },
  infoLabel: {
    fontSize: "14px",
    color: "#6b7280",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: "16px",
    color: "#1a202c",
    fontWeight: "600",
  },
  link: {
    color: "#2563eb",
    textDecoration: "underline",
    cursor: "pointer",
  },
  description: {
    fontSize: "16px",
    color: "#374151",
    lineHeight: "1.6",
    marginTop: "24px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    marginTop: "16px",
  },
  tableHeader: {
    backgroundColor: "#f9fafb",
    borderBottom: "2px solid #e5e7eb",
    padding: "12px 16px",
    textAlign: "left" as const,
    fontWeight: "600",
    fontSize: "14px",
    color: "#374151",
  },
  tableCell: {
    padding: "12px 16px",
    borderBottom: "1px solid #e5e7eb",
    fontSize: "14px",
    color: "#374151",
  },
  logo: {
    width: "40px",
    height: "40px",
    borderRadius: "4px",
    objectFit: "cover" as const,
  },
  placeholderLogo: {
    width: "40px",
    height: "40px",
    backgroundColor: "#e5e7eb",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    color: "#6b7280",
  },
};

// Company Logo Component
const CompanyLogo = ({ logo, name }: { logo: string; name: string }) => {
  if (logo) {
    return (
      <img
        src={`data:image/jpeg;base64,${logo}`}
        alt={`${name} logo`}
        style={styles.logo}
      />
    );
  }

  return (
    <div style={styles.placeholderLogo}>{name.charAt(0).toUpperCase()}</div>
  );
};

// Corporate Event Detail Component
const CorporateEventDetail = ({
  data,
}: {
  data: CorporateEventDetailResponse;
}) => {
  const router = useRouter();
  const event = data.Event[0];
  const counterparties = data.Event_counterparties;
  const subSectors = data["Sub-sectors"];

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not available";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: string, currency: string) => {
    if (!amount) return "Not available";
    return `${currency} ${amount}`;
  };

  const handleCompanyClick = (companyId: number) => {
    console.log("Company clicked:", companyId);
    try {
      router.push(`/company/${companyId}`);
    } catch (error) {
      console.error("Navigation error:", error);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.maxWidth}>
        {/* Event Details Card */}
        <div style={styles.card}>
          <div style={{ position: "relative" }}>
            <h1 style={styles.heading}>{event.description}</h1>
            <button style={styles.reportButton}>Report Incorrect Data</button>
          </div>

          <div style={styles.infoGrid}>
            <div style={styles.infoColumn}>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Deal Type:</span>
                <span style={styles.infoValue}>{event.deal_type}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Date Announced:</span>
                <span style={styles.infoValue}>
                  {formatDate(event.announcement_date)}
                </span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Date Closed:</span>
                <span style={styles.infoValue}>
                  {formatDate(event.closed_date)}
                </span>
              </div>
            </div>
            <div style={styles.infoColumn}>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Enterprise Value:</span>
                <span style={styles.infoValue}>
                  {event.ev_data._currency?.Currency
                    ? formatCurrency(
                        event.ev_data.enterprise_value_m,
                        event.ev_data._currency.Currency
                      )
                    : "Not available"}
                </span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Enterprise source:</span>
                <a
                  href={event.ev_data.ev_source}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.link}
                >
                  {event.ev_data.ev_source}
                </a>
              </div>
            </div>
          </div>

          <p style={styles.description}>{event.long_description}</p>
        </div>

        {/* Sectors Card */}
        <div style={styles.card}>
          <h2 style={styles.subHeading}>Sectors</h2>
          <div style={styles.infoGrid}>
            <div style={styles.infoColumn}>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Primary Sectors:</span>
                <span style={styles.infoValue}>
                  {data.Primary_sectors.length > 0
                    ? data.Primary_sectors.map((s) => s.sector_name).join(", ")
                    : "Not available"}
                </span>
              </div>
            </div>
            <div style={styles.infoColumn}>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Sub-Sector(s):</span>
                <span style={styles.infoValue}>
                  {subSectors.length > 0
                    ? subSectors.map((s) => s.sector_name).join(", ")
                    : "Not available"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Counterparties Card */}
        <div style={styles.card}>
          <h2 style={styles.subHeading}>Counterparties</h2>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.tableHeader}>Logo</th>
                <th style={styles.tableHeader}>Company</th>
                <th style={styles.tableHeader}>Counterparty type</th>
                <th style={styles.tableHeader}>Announcement URL</th>
                <th style={styles.tableHeader}>Individuals</th>
              </tr>
            </thead>
            <tbody>
              {counterparties.map((counterparty) => (
                <tr key={counterparty.id}>
                  <td style={styles.tableCell}>
                    <CompanyLogo
                      logo={
                        counterparty._new_company._linkedin_data_of_new_company
                          ?.linkedin_logo ||
                        counterparty._new_company.linkedin_data.linkedin_logo
                      }
                      name={counterparty._new_company.name}
                    />
                  </td>
                  <td style={styles.tableCell}>
                    <span
                      style={{
                        ...styles.link,
                        cursor: "pointer",
                      }}
                      onClick={(e) => {
                        console.log("Company data:", counterparty._new_company);
                        e.currentTarget.style.backgroundColor = "#f0f0f0";
                        setTimeout(() => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }, 200);
                        handleCompanyClick(counterparty._new_company.id);
                      }}
                    >
                      {counterparty._new_company.name}
                    </span>
                  </td>
                  <td style={styles.tableCell}>
                    {counterparty._counterpartys_type.counterparty_status}
                  </td>
                  <td style={styles.tableCell}>
                    {counterparty.counterparty_announcement_url ? (
                      <a
                        href={counterparty.counterparty_announcement_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.link}
                      >
                        {counterparty.counterparty_announcement_url}
                      </a>
                    ) : (
                      "Not available"
                    )}
                  </td>
                  <td style={styles.tableCell}>
                    {counterparty.counterparty_individuals.length > 0
                      ? counterparty.counterparty_individuals.map(
                          (individual) => (
                            <span key={individual.id} style={styles.link}>
                              {individual.advisor_individuals}
                            </span>
                          )
                        )
                      : "Not available"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Main Page Component
const CorporateEventDetailPage = () => {
  const params = useParams();
  const [data, setData] = useState<CorporateEventDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const corporateEventId = params.id as string;
      const response = await corporateEventsService.getCorporateEvent(
        corporateEventId
      );
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div style={{ padding: "32px 24px" }}>
          <div style={{ textAlign: "center", padding: "40px" }}>
            <div style={{ fontSize: "18px", color: "#4a5568" }}>
              Loading corporate event details...
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <Header />
        <div style={{ padding: "32px 24px" }}>
          <div
            style={{
              textAlign: "center",
              padding: "20px",
              color: "#e53e3e",
              backgroundColor: "#fed7d7",
              borderRadius: "6px",
              marginBottom: "16px",
            }}
          >
            {error}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen">
        <Header />
        <div style={{ padding: "32px 24px" }}>
          <div
            style={{
              textAlign: "center",
              padding: "20px",
              color: "#666",
              backgroundColor: "#f7fafc",
              borderRadius: "6px",
              marginBottom: "16px",
            }}
          >
            Corporate event not found
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <CorporateEventDetail data={data} />
      <Footer />
    </div>
  );
};

export default CorporateEventDetailPage;
