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
import { ContentArticle } from "@/types/insightsAnalysis";

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
  type FlatEventFields = {
    investment_amount_m?: string | number | null;
    investment_amount?: string | number | null;
    investment_currency?: string | null;
    enterprise_value_m?: string | number | null;
    enterprise_value_currency?: string | null;
  };
  const event =
    Array.isArray(data?.Event) && data.Event.length > 0
      ? data.Event[0]
      : undefined;
  const counterparties = React.useMemo(
    () =>
      Array.isArray(data?.Event_counterparties)
        ? data.Event_counterparties
        : [],
    [data?.Event_counterparties]
  );
  const subSectors = Array.isArray(data?.["Sub-sectors"])
    ? data["Sub-sectors"]
    : [];
  const advisors: CorporateEventAdvisor[] = Array.isArray(data?.Event_advisors)
    ? data.Event_advisors
    : [];

  // Fast lookup for counterparties by id (to map advisor->advised company and announcement URL)
  const counterpartiesById = React.useMemo(() => {
    const map = new Map<number, (typeof counterparties)[number]>();
    for (const cp of counterparties) {
      if (cp && typeof cp.id === "number") map.set(cp.id, cp);
    }
    return map;
  }, [counterparties]);

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
    // Amounts are already in millions; the "(m)" indicator lives in the field
    // label (e.g., "Amount (m)"), so we omit the trailing "m" here.
    return `${currency}${formatted}`;
  };

  // Prefer investment currency if present; otherwise fall back to EV currency
  const getInvestmentCurrency = (): string | undefined => {
    const inv = event?.investment_data as
      | { _currency?: { Currency?: string }; currency?: { Currency?: string } }
      | undefined;
    const fromInvestment = inv?.currency?.Currency || inv?._currency?.Currency;
    // Fallbacks: top-level investment/EV currency when backend sends flattened fields
    const flatEvent = (event ?? {}) as FlatEventFields;
    const topLevelCurrency =
      flatEvent.investment_currency || flatEvent.enterprise_value_currency;
    return (
      fromInvestment ||
      topLevelCurrency ||
      event?.ev_data?._currency?.Currency ||
      undefined
    );
  };

  // Prefer nested investment amount; fallback to top-level fields when present
  const getInvestmentAmount = (): string | undefined => {
    const nested = event?.investment_data?.investment_amount_m;
    if (nested) return nested;
    const flatEvent = (event ?? {}) as FlatEventFields;
    const top =
      flatEvent.investment_amount_m ?? flatEvent.investment_amount ?? undefined;
    if (typeof top === "number") return String(top);
    if (typeof top === "string" && top.trim().length > 0) return top.trim();
    return undefined;
  };

  const formatInvestmentAmount = (): string => {
    const amount = getInvestmentAmount();
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

  const [eventArticles, setEventArticles] = useState<ContentArticle[]>([]);
  const [eventArticlesLoading, setEventArticlesLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      const startedAt = Date.now();
      try {
        const evId = event?.id;
        if (!evId) return;
        console.log("[Insights & Analysis] fetch start", {
          corporate_event_id: evId,
        });
        setEventArticlesLoading(true);
        const qs = new URLSearchParams({ corporate_event_id: String(evId) });
        const url = `https://xdil-abvj-o7rq.e2.xano.io/api:617tZc8l/content?${qs.toString()}`;
        console.log("[Insights & Analysis] GET URL", url);
        const res = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });
        console.log("[Insights & Analysis] fetch response", {
          status: res.status,
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        console.log("[Insights & Analysis] fetch success", {
          count: Array.isArray(data) ? data.length : undefined,
          payload: data,
        });
        setEventArticles(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("[Insights & Analysis] fetch error", error);
        setEventArticles([]);
      } finally {
        console.log("[Insights & Analysis] fetch finished", {
          ms: Date.now() - startedAt,
        });
        setEventArticlesLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id]);

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
      background-color: #16a34a;
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
      grid-template-columns: repeat(4, minmax(0, 1fr));
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
              href={`mailto:asymmetrix@asymmetrixintelligence.com?subject=${encodeURIComponent(
                `Contribute Corporate Event Data – ${
                  event?.description ?? "Unknown"
                } (ID ${event?.id ?? "Unknown"})`
              )}&body=${encodeURIComponent(
                "Please describe the data you would like to contribute for this corporate event page."
              )}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Contribute Data
            </a>
          </div>

          <div className="info-grid">
            {/* Column 1: Dates */}
            <div className="info-column">
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

            {/* Column 2: Deal details */}
            <div className="info-column">
              <div className="info-item">
                <span className="info-label">Deal Type:</span>
                <span className="info-value">
                  {event?.deal_type || "Not available"}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Deal Stage:</span>
                <span className="info-value">
                  {event?.investment_data?.Funding_stage || "Not available"}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Deal Status:</span>
                <span className="info-value">
                  {event?.deal_status || "Not available"}
                </span>
              </div>
            </div>

            {/* Column 3: Investment & EV */}
            <div className="info-column">
              <div className="info-item">
                <span className="info-label">Investment Amount (m):</span>
                <span className="info-value">{formatInvestmentAmount()}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Enterprise Value (m):</span>
                <span className="info-value">
                  {(() => {
                    const flatEvent = (event ?? {}) as FlatEventFields;
                    const amountRaw =
                      event?.ev_data?.enterprise_value_m ??
                      flatEvent.enterprise_value_m ??
                      "";
                    const amount =
                      typeof amountRaw === "number"
                        ? String(amountRaw)
                        : amountRaw;
                    const currency =
                      event?.ev_data?._currency?.Currency ||
                      flatEvent.enterprise_value_currency ||
                      "";
                    return amount && currency
                      ? formatCurrency(amount, currency)
                      : "Not available";
                  })()}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">EV Source:</span>
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

            {/* Column 4: Sectors */}
            <div className="info-column">
              <div className="info-item">
                <span className="info-label">Primary Sector(s):</span>
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

          <p className="corporate-event-description">
            {event?.long_description || "Not available"}
          </p>
        </div>

        {/* Asymmetrix Content (Insights & Analysis) related to this corporate event */}
        {eventArticles.length > 0 && (
          <div className="corporate-event-card">
            <h2 className="corporate-event-subtitle">
              Asymmetrix Insights & Analysis
            </h2>
            {eventArticlesLoading ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px",
                  color: "#666",
                  fontSize: "14px",
                }}
              >
                Loading content...
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                }}
              >
                {eventArticles.slice(0, 4).map((article) => (
                  <a
                    key={article.id}
                    href={`/article/${article.id}`}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "12px 12px",
                      background: "#fff",
                      display: "block",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        marginBottom: 6,
                        color: "#1a202c",
                      }}
                    >
                      {article.Headline || "Untitled"}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        marginBottom: 8,
                      }}
                    >
                      {article.Publication_Date
                        ? new Date(
                            article.Publication_Date
                          ).toLocaleDateString()
                        : ""}
                    </div>
                    <div style={{ fontSize: 14, color: "#374151" }}>
                      {article.Strapline || ""}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

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
                <th>Logo</th>
                <th>Advisor</th>
                <th>Role</th>
                <th>Advising</th>
                <th>Individuals</th>
                <th>Announcement URL</th>
              </tr>
            </thead>
            <tbody>
              {advisors.length > 0 ? (
                advisors.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <CompanyLogo
                        logo={
                          // Prefer nested linkedin logo if present
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          (a as any)?._new_company
                            ?._linkedin_data_of_new_company?.linkedin_logo ||
                          // Fallback to direct linkedin_data
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          (a as any)?._new_company?.linkedin_data?.linkedin_logo
                        }
                        name={
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          ((a as any)?._new_company?.name as string) ||
                          "Advisor"
                        }
                      />
                    </td>
                    <td>
                      {createClickableElement(
                        `/advisor/${a._new_company.id}`,
                        a._new_company.name,
                        "corporate-event-link"
                      )}
                    </td>
                    <td>{a._advisor_role?.counterparty_status || "Advisor"}</td>
                    <td>
                      {(() => {
                        // Prefer using counterparty_advised id to resolve advised entity
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const anyA = a as any;
                        const advisedId: number | undefined =
                          anyA?.counterparty_advised;
                        const cp = advisedId
                          ? counterpartiesById?.get?.(advisedId)
                          : undefined;
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
                      {(() => {
                        // Strictly use advisor-attached individuals from Event_advisors; no fallbacks
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const anyA = a as any;
                        const advisorList = Array.isArray(anyA?.individuals)
                          ? (anyA.individuals as Array<{
                              id: number;
                              individuals_id?: number;
                              advisor_individuals: string;
                            }>)
                          : undefined;
                        const list = advisorList;
                        return Array.isArray(list) && list.length > 0
                          ? list.map((ind, idx) => (
                              <span key={ind.id}>
                                {typeof ind.individuals_id === "number" ? (
                                  <a
                                    href={`/individual/${ind.individuals_id}`}
                                    className="corporate-event-link"
                                  >
                                    {ind.advisor_individuals}
                                  </a>
                                ) : (
                                  <span>{ind.advisor_individuals}</span>
                                )}
                                {idx < list.length - 1 && ", "}
                              </span>
                            ))
                          : "Not available";
                      })()}
                    </td>
                    <td>
                      {(() => {
                        // Advisor-only URL; empty string means no link
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const anyA = a as any;
                        const raw =
                          (anyA?.announcement_url as string | undefined) ?? "";
                        const url = raw.trim();
                        return url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="corporate-event-link-url"
                          >
                            {url}
                          </a>
                        ) : (
                          "Not available"
                        );
                      })()}
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
                    <CompanyLogo
                      logo={
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (a as any)?._new_company?._linkedin_data_of_new_company
                          ?.linkedin_logo ||
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (a as any)?._new_company?.linkedin_data?.linkedin_logo
                      }
                      name={a._new_company.name}
                    />
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
                        {a._advisor_role?.counterparty_status || "Advisor"}
                      </span>
                    </div>
                    <div className="counterparty-card-info-item">
                      <span className="counterparty-card-info-label">
                        Advising:
                      </span>
                      <span className="counterparty-card-info-value">
                        {(() => {
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          const anyA = a as any;
                          const advisedId: number | undefined =
                            anyA?.counterparty_advised;
                          const cp = advisedId
                            ? counterpartiesById?.get?.(advisedId)
                            : undefined;
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
                    <div className="counterparty-card-info-item">
                      <span className="counterparty-card-info-label">
                        Individuals:
                      </span>
                      <span className="counterparty-card-info-value">
                        {(() => {
                          // Strictly use advisor-attached individuals from Event_advisors; no fallbacks
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          const anyA = a as any;
                          const advisorList = Array.isArray(anyA?.individuals)
                            ? (anyA.individuals as Array<{
                                id: number;
                                individuals_id?: number;
                                advisor_individuals: string;
                              }>)
                            : undefined;
                          const list = advisorList;
                          return Array.isArray(list) && list.length > 0
                            ? list.map((ind, idx) => (
                                <span key={ind.id}>
                                  {typeof ind.individuals_id === "number" ? (
                                    <a
                                      href={`/individual/${ind.individuals_id}`}
                                      className="corporate-event-link"
                                    >
                                      {ind.advisor_individuals}
                                    </a>
                                  ) : (
                                    <span>{ind.advisor_individuals}</span>
                                  )}
                                  {idx < list.length - 1 && ", "}
                                </span>
                              ))
                            : "Not available";
                        })()}
                      </span>
                    </div>
                    {(() => {
                      // Advisor-only URL on mobile; empty means no section
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const anyA = a as any;
                      const raw =
                        (anyA?.announcement_url as string | undefined) ?? "";
                      const url = raw.trim();
                      return url ? (
                        <div className="counterparty-card-info-item counterparty-card-full-width">
                          <span className="counterparty-card-info-label">
                            Announcement URL:
                          </span>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="corporate-event-link"
                            style={{ fontSize: 12 }}
                          >
                            {url}
                          </a>
                        </div>
                      ) : null;
                    })()}
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
