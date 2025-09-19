"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { corporateEventsService } from "../../../lib/corporateEventsService";
import {
  CorporateEventDetailResponse,
  CorporateEventAdvisor,
} from "../../../types/corporateEvents";
import { useRightClick } from "@/hooks/useRightClick";

// Narrow type for optional counterparty shape used in advisors references
type MaybeCounterparty =
  | {
      _new_company?: {
        id?: number;
        name?: string;
        _is_that_investor?: boolean;
      };
      new_company_counterparty?: number;
    }
  | undefined;

// Type-safe check for Data & Analytics company flag
const isDataAnalyticsCompany = (candidate: unknown): boolean => {
  if (!candidate || typeof candidate !== "object") return false;
  const obj = candidate as { _is_that_data_analytic_company?: unknown };
  return typeof obj._is_that_data_analytic_company === "boolean"
    ? obj._is_that_data_analytic_company
    : false;
};

// Company Logo Component
const CompanyLogo = ({ logo, name }: { logo?: string; name: string }) => {
  const buildLogoSrc = (raw?: string): string | undefined => {
    if (!raw) return undefined;
    // Normalize by trimming and removing whitespace/newlines often present in base64 blobs
    const value = String(raw).trim();
    const compact = value.replace(/\s+/g, "");
    if (!value) return undefined;
    if (/^data:/i.test(value)) return value;
    if (/^https?:\/\//i.test(value)) {
      try {
        const u = new URL(value);
        const host = u.hostname.toLowerCase();
        // Skip LinkedIn CDN/hosts to avoid frequent 403s; prefer base64 for those
        if (host.endsWith("licdn.com") || host.endsWith("linkedin.com")) {
          return undefined;
        }
        return value;
      } catch {
        return undefined;
      }
    }
    // Heuristic: treat as base64 when it does not look like a URL
    if (/^[A-Za-z0-9+/=]+$/.test(compact)) {
      return `data:image/jpeg;base64,${compact}`;
    }
    return undefined;
  };

  const src = buildLogoSrc(logo);
  if (src) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={`${name} logo`} className="company-logo" />
      </>
    );
  }

  return (
    <div className="placeholder-logo">
      {(name || "").charAt(0).toUpperCase()}
    </div>
  );
};

// Corporate Event Detail Component
const CorporateEventDetail = ({
  data,
}: {
  data: CorporateEventDetailResponse;
}) => {
  const { createClickableElement } = useRightClick();
  const event =
    Array.isArray(data?.Event) && data.Event.length > 0
      ? data.Event[0]
      : undefined;
  const counterparties = Array.isArray(data?.Event_counterparties)
    ? data.Event_counterparties
    : [];
  const subSectors = Array.isArray(data?.["Sub-sectors"])
    ? data["Sub-sectors"]
    : [];
  const advisors: CorporateEventAdvisor[] = Array.isArray(data?.Event_advisors)
    ? data.Event_advisors
    : [];

  // Fallback logo cache for investor counterparties when logo not present in payload
  const [logoMap, setLogoMap] = useState<Record<number, string | undefined>>(
    {}
  );

  useEffect(() => {
    // Identify investor counterparties missing logos
    const ids = (Array.isArray(counterparties) ? counterparties : [])
      .filter((cp) => {
        const nc = cp?._new_company;
        const isInvestor = Boolean(nc?._is_that_investor);
        const hasLogo = Boolean(
          nc?._linkedin_data_of_new_company?.linkedin_logo ||
            nc?.linkedin_data?.linkedin_logo
        );
        return isInvestor && !hasLogo && typeof nc?.id === "number";
      })
      .map((cp) => cp._new_company.id);

    const uniqueIds = Array.from(new Set(ids)).filter((id) => !(id in logoMap));
    if (uniqueIds.length === 0) return;

    let cancelled = false;
    const fetchLogos = async () => {
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("asymmetrix_auth_token")
            : null;
        await Promise.all(
          uniqueIds.map(async (companyId) => {
            try {
              const resp = await fetch(
                `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/Get_new_company/${companyId}`,
                {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                  },
                  credentials: "include",
                }
              );
              if (!resp.ok) return;
              const data = await resp.json();
              const b64Logo =
                data?.Company?._linkedin_data_of_new_company?.linkedin_logo ||
                data?._linkedin_data_of_new_company?.linkedin_logo ||
                data?.linkedin_data?.linkedin_logo ||
                data?.Company?.linkedin_data?.linkedin_logo;
              if (!cancelled && b64Logo) {
                setLogoMap((prev) => ({ ...prev, [companyId]: b64Logo }));
              }
            } catch {
              // ignore individual fetch errors
            }
          })
        );
      } catch {
        // ignore batch errors
      }
    };

    fetchLogos();
    return () => {
      cancelled = true;
    };
  }, [counterparties, logoMap]);

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
    if (!amount || !currency) return "Not available";
    const n = Number(amount);
    if (Number.isNaN(n)) return "Not available";
    const formatted = n.toLocaleString(undefined, { maximumFractionDigits: 3 });
    return `${currency}${formatted}m`;
  };

  // Prefer investment currency if present; otherwise fall back to EV currency
  const getInvestmentCurrency = (): string | undefined => {
    const inv = event?.investment_data as
      | { _currency?: { Currency?: string }; currency?: { Currency?: string } }
      | undefined;
    const fromInvestment = inv?.currency?.Currency || inv?._currency?.Currency;
    return fromInvestment || event?.ev_data?._currency?.Currency || undefined;
  };

  const formatInvestmentAmount = (): string => {
    const amount = event?.investment_data?.investment_amount_m;
    if (!amount) return "Not available";
    const currency = getInvestmentCurrency();
    return currency ? formatCurrency(amount, currency) : "Not available";
  };

  // Removed navigation helpers in favor of createClickableElement to support right-click

  // const handleIndividualClick = (individualId: number) => {
  //   try {
  //     router.push(`/individual/${individualId}`);
  //   } catch (error) {
  //     console.error("Navigation error:", error);
  //   }
  // };

  const style = `
    .corporate-event-container {
      background-color: #f9fafb;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    .corporate-event-content {
      padding: 32px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .corporate-event-card {
      background-color: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      padding: 32px 24px;
      margin-bottom: 0;
    }
    .corporate-event-header {
      position: relative;
    }
    .corporate-event-title {
      font-size: 24px;
      font-weight: 700;
      color: #1a202c;
      margin-bottom: 8px;
      margin-top: 0px;
    }
    .corporate-event-subtitle {
      font-size: 20px;
      font-weight: 600;
      color: #1a202c;
      margin-bottom: 12px;
    }
    .report-button {
      background-color: #dc2626;
      color: white;
      font-weight: 600;
      padding: 8px 16px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      font-size: 14px;
      float: right;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 24px;
    }
    .info-column {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .info-label {
      font-size: 14px;
      color: #6b7280;
      font-weight: 500;
    }
    .info-value {
      font-size: 16px;
      color: #1a202c;
      font-weight: 600;
    }
    /* Names: keep words intact, no mid-word splits */
    .corporate-event-link {
      color: #2563eb;
      text-decoration: underline;
      cursor: pointer;
      word-break: keep-all;
      overflow-wrap: normal;
      white-space: normal;
      hyphens: none;
      display: inline;
    }
    /* URLs: allow breaking anywhere to avoid overflow */
    .corporate-event-link-url {
      color: #2563eb;
      text-decoration: underline;
      cursor: pointer;
      word-break: break-word;
      overflow-wrap: anywhere;
      white-space: normal;
      line-break: anywhere;
      display: inline;
    }
    .info-item a.corporate-event-link-url,
    .advisors-table td a.corporate-event-link-url,
    .counterparties-table td a.corporate-event-link-url {
      word-break: break-word;
      overflow-wrap: anywhere;
      white-space: normal;
      line-break: anywhere;
    }
    .corporate-event-description {
      font-size: 16px;
      color: #374151;
      line-height: 1.6;
      margin-top: 24px;
    }
    .counterparties-table-container {
      overflow-x: auto;
    }
    .counterparties-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
    }
    .counterparties-table th {
      background-color: #f9fafb;
      border-bottom: 2px solid #e5e7eb;
      padding: 12px 16px;
      text-align: left;
      font-weight: 600;
      font-size: 14px;
      color: #374151;
    }
    .counterparties-table td {
      padding: 12px 16px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 14px;
      color: #374151;
    }
    .company-logo {
      width: 40px;
      height: 40px;
      border-radius: 4px;
      object-fit: cover;
    }
    .placeholder-logo {
      width: 40px;
      height: 40px;
      background-color: #e5e7eb;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      color: #6b7280;
    }
    .counterparties-cards { display: none; }
    .advisors-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    .advisors-table th { background-color: #f9fafb; border-bottom: 2px solid #e5e7eb; padding: 12px 16px; text-align: left; font-weight: 600; font-size: 14px; color: #374151; }
    .advisors-table td { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151; }
    .advisors-cards { display: none; }
    .counterparty-card {
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
    }
    .counterparty-card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .counterparty-card-name {
      font-size: 16px;
      font-weight: 600;
      color: #2563eb;
      cursor: pointer;
      text-decoration: underline;
    }
    .counterparty-card-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      font-size: 14px;
    }
    .counterparty-card-info-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .counterparty-card-info-label {
      font-weight: 600;
      color: #374151;
      font-size: 12px;
    }
    .counterparty-card-info-value {
      color: #6b7280;
      font-size: 12px;
    }
    .counterparty-card-full-width {
      grid-column: 1 / -1;
    }

    @media (max-width: 768px) {
      .corporate-event-content {
        padding: 16px !important;
        gap: 16px !important;
      }
      .corporate-event-card {
        padding: 16px !important;
        border-radius: 8px !important;
      }
      .corporate-event-header {
        display: flex !important;
        flex-direction: column !important;
        gap: 12px !important;
      }
      .corporate-event-title {
        font-size: 20px !important;
        margin-bottom: 0 !important;
      }
      .corporate-event-subtitle {
        font-size: 18px !important;
        margin-bottom: 8px !important;
      }
      .report-button {
        float: none !important;
        align-self: flex-start !important;
        width: fit-content !important;
      }
      .info-grid {
        grid-template-columns: 1fr !important;
        gap: 16px !important;
        margin-top: 16px !important;
      }
      .info-column {
        gap: 12px !important;
      }
      .info-label {
        font-size: 13px !important;
      }
      .info-value {
        font-size: 15px !important;
      }
      .corporate-event-link {
        font-size: 14px !important;
      }
      .corporate-event-description {
        font-size: 15px !important;
        margin-top: 16px !important;
      }
      .counterparties-table-container { display: none !important; }
      .counterparties-cards { display: block !important; margin-top: 16px !important; }
      .advisors-cards { display: block !important; margin-top: 16px !important; }
      .advisors-table { display: none !important; }
    }

    @media (min-width: 769px) {
      .counterparties-cards { display: none !important; }
      .counterparties-table-container { display: block !important; }
      .advisors-cards { display: none !important; }
      .advisors-table { display: table !important; }
    }
  `;

  return (
    <div className="corporate-event-container">
      <div className="corporate-event-content">
        {/* Event Details Card */}
        <div className="corporate-event-card">
          <div className="corporate-event-header">
            <h1 className="corporate-event-title">
              {event?.description || "Not available"}
            </h1>
            <a
              className="report-button"
              href={`mailto:a.boden@asymmetrixintelligence.com?subject=${encodeURIComponent(
                `Report Incorrect Corporate Event Data – ${
                  event?.description ?? "Unknown"
                } (ID ${event?.id ?? "Unknown"})`
              )}&body=${encodeURIComponent(
                "Please describe the issue you found for this corporate event page."
              )}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Report Incorrect Data
            </a>
          </div>

          <div className="info-grid">
            <div className="info-column">
              <div className="info-item">
                <span className="info-label">Deal Type:</span>
                <span className="info-value">
                  {event?.deal_type || "Not available"}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Date Announced:</span>
                <span className="info-value">
                  {event?.announcement_date
                    ? formatDate(event.announcement_date)
                    : "Not available"}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Date Closed:</span>
                <span className="info-value">
                  {event?.closed_date
                    ? formatDate(event.closed_date)
                    : "Not available"}
                </span>
              </div>
            </div>
            <div className="info-column">
              <div className="info-item">
                <span className="info-label">Investment Amount:</span>
                <span className="info-value">{formatInvestmentAmount()}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Enterprise Value:</span>
                <span className="info-value">
                  {event?.ev_data?._currency?.Currency
                    ? formatCurrency(
                        event?.ev_data?.enterprise_value_m || "",
                        event?.ev_data?._currency?.Currency || ""
                      )
                    : "Not available"}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Enterprise Source:</span>
                {event?.ev_data?.ev_source ? (
                  <a
                    href={event.ev_data.ev_source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="corporate-event-link"
                  >
                    {event.ev_data.ev_source}
                  </a>
                ) : (
                  <span className="info-value">Not available</span>
                )}
              </div>
            </div>
          </div>

          <p className="corporate-event-description">
            {event?.long_description || "Not available"}
          </p>
        </div>

        {/* Sectors Card */}
        <div className="corporate-event-card">
          <h2 className="corporate-event-subtitle">Sectors</h2>
          <div className="info-grid">
            <div className="info-column">
              <div className="info-item">
                <span className="info-label">Primary Sectors:</span>
                <span className="info-value">
                  {(() => {
                    // Derive primary sectors from sub-sectors mapping when needed
                    const existing = Array.isArray(data.Primary_sectors)
                      ? data.Primary_sectors.map((s) => s.sector_name)
                      : [];
                    // Support both legacy single object `related_primary_sector`
                    // and new array `related_primary_sectors` on sub-sectors
                    const derived = Array.isArray(subSectors)
                      ? subSectors
                          .flatMap((s) => {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const anyS = s as any;
                            const single = anyS?.related_primary_sector;
                            const many = anyS?.related_primary_sectors;
                            if (Array.isArray(many)) {
                              return many
                                .map(
                                  (x: { sector_name?: string }) =>
                                    x?.sector_name
                                )
                                .filter(
                                  (v: unknown): v is string =>
                                    typeof v === "string" && v.length > 0
                                );
                            }
                            const name: unknown = single?.sector_name;
                            return typeof name === "string" && name.length > 0
                              ? [name]
                              : [];
                          })
                          .filter((v): v is string => Boolean(v))
                      : [];
                    const combined = Array.from(
                      new Set([...existing, ...derived])
                    );
                    return combined.length > 0
                      ? combined.join(", ")
                      : "Not available";
                  })()}
                </span>
              </div>
            </div>
            <div className="info-column">
              <div className="info-item">
                <span className="info-label">Sub-Sector(s):</span>
                <span className="info-value">
                  {subSectors.length > 0
                    ? subSectors.map((s) => s.sector_name).join(", ")
                    : "Not available"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Counterparties Card */}
        <div className="corporate-event-card">
          <h2 className="corporate-event-subtitle">Counterparties</h2>

          {/* Desktop Table View */}
          <div className="counterparties-table-container">
            <table className="counterparties-table">
              <thead>
                <tr>
                  <th>Logo</th>
                  <th>Company</th>
                  <th>Counterparty type</th>
                  <th>Announcement URL</th>
                  <th>Individuals</th>
                </tr>
              </thead>
              <tbody>
                {counterparties.map((counterparty) => (
                  <tr key={counterparty.id}>
                    <td>
                      <CompanyLogo
                        logo={
                          counterparty._new_company
                            ._linkedin_data_of_new_company?.linkedin_logo ||
                          counterparty._new_company.linkedin_data
                            ?.linkedin_logo ||
                          logoMap[counterparty._new_company.id]
                        }
                        name={counterparty._new_company.name}
                      />
                    </td>
                    <td>
                      {(() => {
                        const nc = counterparty._new_company;
                        const isInvestor = Boolean(nc?._is_that_investor);
                        // Treat as Data & Analytics company only if backend flag is present
                        const isDA = isDataAnalyticsCompany(nc);
                        const href = isInvestor
                          ? `/investors/${counterparty.new_company_counterparty}`
                          : isDA
                          ? `/company/${Number(nc?.id)}`
                          : undefined;
                        if (href) {
                          return createClickableElement(
                            href,
                            nc?.name ?? "N/A",
                            "corporate-event-link"
                          );
                        }
                        return (
                          <span style={{ color: "#000" }}>
                            {nc?.name ?? "N/A"}
                          </span>
                        );
                      })()}
                    </td>
                    <td>
                      {counterparty._counterpartys_type?.counterparty_status ||
                        counterparty._counterparty_type?.counterparty_status ||
                        "N/A"}
                    </td>
                    <td>
                      {counterparty.counterparty_announcement_url ? (
                        <a
                          href={counterparty.counterparty_announcement_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="corporate-event-link-url"
                        >
                          {counterparty.counterparty_announcement_url}
                        </a>
                      ) : (
                        "Not available"
                      )}
                    </td>
                    <td>
                      {Array.isArray(counterparty.counterparty_individuals) &&
                      counterparty.counterparty_individuals.length > 0
                        ? counterparty.counterparty_individuals.map(
                            (individual, idx) => (
                              <span key={individual.id}>
                                <a
                                  href={`/individual/${individual.individuals_id}`}
                                  className="corporate-event-link"
                                >
                                  {individual.advisor_individuals}
                                </a>
                                {idx <
                                  counterparty.counterparty_individuals.length -
                                    1 && ", "}
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

          {/* Mobile Cards View */}
          <div className="counterparties-cards">
            {counterparties.map((counterparty) => (
              <div key={counterparty.id} className="counterparty-card">
                <div className="counterparty-card-header">
                  <CompanyLogo
                    logo={
                      counterparty._new_company._linkedin_data_of_new_company
                        ?.linkedin_logo ||
                      counterparty._new_company.linkedin_data?.linkedin_logo ||
                      logoMap[counterparty._new_company.id]
                    }
                    name={counterparty._new_company.name}
                  />
                  <div className="counterparty-card-name">
                    {(() => {
                      const nc = counterparty._new_company;
                      const isInvestor = Boolean(nc?._is_that_investor);
                      const isDA = isDataAnalyticsCompany(nc);
                      const href = isInvestor
                        ? `/investors/${counterparty.new_company_counterparty}`
                        : isDA
                        ? `/company/${Number(nc?.id)}`
                        : undefined;
                      if (href) {
                        return createClickableElement(href, nc?.name ?? "N/A");
                      }
                      return (
                        <span
                          style={{ color: "#2563eb", textDecoration: "none" }}
                        >
                          {nc?.name ?? "N/A"}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div className="counterparty-card-info">
                  <div className="counterparty-card-info-item">
                    <span className="counterparty-card-info-label">Type:</span>
                    <span className="counterparty-card-info-value">
                      {counterparty._counterpartys_type?.counterparty_status ||
                        counterparty._counterparty_type?.counterparty_status ||
                        "N/A"}
                    </span>
                  </div>
                  <div className="counterparty-card-info-item">
                    <span className="counterparty-card-info-label">
                      Individuals:
                    </span>
                    <span className="counterparty-card-info-value">
                      {Array.isArray(counterparty.counterparty_individuals) &&
                      counterparty.counterparty_individuals.length > 0
                        ? counterparty.counterparty_individuals.map(
                            (individual, idx) => (
                              <span key={individual.id}>
                                <a
                                  href={`/individual/${individual.individuals_id}`}
                                  className="corporate-event-link"
                                >
                                  {individual.advisor_individuals}
                                </a>
                                {idx <
                                  counterparty.counterparty_individuals.length -
                                    1 && ", "}
                              </span>
                            )
                          )
                        : "Not available"}
                    </span>
                  </div>
                  {counterparty.counterparty_announcement_url && (
                    <div className="counterparty-card-info-item counterparty-card-full-width">
                      <span className="counterparty-card-info-label">
                        Announcement URL:
                      </span>
                      <a
                        href={counterparty.counterparty_announcement_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="corporate-event-link"
                        style={{ fontSize: "12px" }}
                      >
                        {counterparty.counterparty_announcement_url}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Advisors Card */}
        <div className="corporate-event-card">
          <h2 className="corporate-event-subtitle">Advisors</h2>
          {/* Desktop Table */}
          <table className="advisors-table">
            <thead>
              <tr>
                <th>Advisor</th>
                <th>Role</th>
                <th>Advising</th>
                <th>Announcement URL</th>
              </tr>
            </thead>
            <tbody>
              {advisors.length > 0 ? (
                advisors.map((a) => (
                  <tr key={a.id}>
                    <td>
                      {createClickableElement(
                        `/advisor/${a._new_company.id}`,
                        a._new_company.name,
                        "corporate-event-link"
                      )}
                    </td>
                    <td>{a._advisor_role?.counterparty_status || "N/A"}</td>
                    <td>
                      {(() => {
                        const cp = a._counterparties as MaybeCounterparty;
                        const nc = cp?._new_company;
                        const isInvestor = Boolean(nc?._is_that_investor);
                        const isDA = isDataAnalyticsCompany(nc);
                        const href = isInvestor
                          ? `/investors/${cp?.new_company_counterparty}`
                          : isDA
                          ? `/company/${Number(nc?.id)}`
                          : undefined;
                        if (href) {
                          return createClickableElement(
                            href,
                            nc?.name || "N/A",
                            "corporate-event-link"
                          );
                        }
                        return (
                          <span style={{ color: "#000" }}>
                            {nc?.name || "N/A"}
                          </span>
                        );
                      })()}
                    </td>
                    <td>
                      {a.announcement_url ? (
                        <a
                          href={a.announcement_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="corporate-event-link"
                        >
                          {a.announcement_url}
                        </a>
                      ) : (
                        "Not available"
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>Not available</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Mobile Cards */}
          <div className="advisors-cards">
            {advisors.length > 0 ? (
              advisors.map((a) => (
                <div key={a.id} className="counterparty-card">
                  <div
                    className="counterparty-card-header"
                    style={{ marginBottom: 8 }}
                  >
                    <div className="counterparty-card-name">
                      {createClickableElement(
                        `/advisor/${a._new_company.id}`,
                        a._new_company.name
                      )}
                    </div>
                  </div>
                  <div className="counterparty-card-info">
                    <div className="counterparty-card-info-item">
                      <span className="counterparty-card-info-label">
                        Role:
                      </span>
                      <span className="counterparty-card-info-value">
                        {a._advisor_role?.counterparty_status || "N/A"}
                      </span>
                    </div>
                    <div className="counterparty-card-info-item">
                      <span className="counterparty-card-info-label">
                        Advising:
                      </span>
                      <span className="counterparty-card-info-value">
                        {(() => {
                          const cp = a._counterparties as MaybeCounterparty;
                          const nc = cp?._new_company;
                          const isInvestor = Boolean(nc?._is_that_investor);
                          const isDA = isDataAnalyticsCompany(nc);
                          const href = isInvestor
                            ? `/investors/${cp?.new_company_counterparty}`
                            : isDA
                            ? `/company/${Number(nc?.id)}`
                            : undefined;
                          if (href) {
                            return createClickableElement(
                              href,
                              nc?.name || "N/A",
                              "corporate-event-link"
                            );
                          }
                          return (
                            <span style={{ color: "#000" }}>
                              {nc?.name || "N/A"}
                            </span>
                          );
                        })()}
                      </span>
                    </div>
                    {a.announcement_url && (
                      <div className="counterparty-card-info-item counterparty-card-full-width">
                        <span className="counterparty-card-info-label">
                          Announcement URL:
                        </span>
                        <a
                          href={a.announcement_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="corporate-event-link"
                          style={{ fontSize: 12 }}
                        >
                          {a.announcement_url}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: "#6b7280", fontSize: 14 }}>
                Not available
              </div>
            )}
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: style }} />
    </div>
  );
};

// Main Page Component
const CorporateEventDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<CorporateEventDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const corporateEventId = params.id as string;

      // Safety check for missing ID
      if (!corporateEventId) {
        throw new Error("Corporate event ID is required");
      }

      const response = await corporateEventsService.getCorporateEvent(
        corporateEventId
      );
      setData(response);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";

      // Handle authentication errors by redirecting to login
      if (
        errorMessage === "Authentication required" ||
        errorMessage.includes("Authentication token not found")
      ) {
        router.push("/login");
        return;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    if (params.id) {
      fetchData();
    }
  }, [fetchData, params.id]);

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

//
