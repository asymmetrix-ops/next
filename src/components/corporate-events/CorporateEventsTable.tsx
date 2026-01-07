"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CorporateEventDealMetrics } from "./CorporateEventDealMetrics";

// Types compatible with both company and investor pages
interface LegacyCorporateEvent {
  id?: number;
  description: string;
  announcement_date: string;
  deal_type: string;
  ev_data?: {
    enterprise_value_m?: number | string;
    ev_band?: string;
    currency?: { Currency?: string } | null;
    _currency?: { Currency?: string };
    currency_id?: string;
  };
  investment_data?: {
    investment_amount_m?: number | string;
    investment_amount?: number | string;
    currency?: { Currency?: string } | null;
    _currency?: { Currency?: string };
    currency_id?: string;
    Funding_stage?: string;
    funding_stage?: string;
  };
  investment_display?: string | null;
  ev_display?: string | null;
  target_counterparty?: {
    new_company_counterparty?: number;
    new_company?: {
      id?: number;
      name?: string;
      _location?: { Country?: string };
    };
    _new_company?: {
      id?: number;
      name?: string;
      _location?: { Country?: string };
    };
  };
  targets?: Array<{
    id: number;
    name: string;
    path?: string;
    route?: string;
    entity_type?: string;
  }>;
  target_label?: string;
  other_counterparties?: Array<{
    id?: number;
    name?: string;
    page_type?: string;
    counterparty_id?: number;
    is_data_analytics?: boolean;
    counterparty_status?: string;
    counterparty_type_id?: number;
    counterparty_announcement_url?: string | null;
    _new_company?: {
      id?: number;
      name?: string;
      _is_that_investor?: boolean;
    };
    _counterparty_type?: {
      counterparty_status?: string;
    };
  }>;
  advisors?: Array<{
    id?: number;
    advisor_company?: {
      id?: number;
      name?: string;
    };
    announcement_url?: string | null;
    new_company_advised?: number;
    counterparty_advised?: number;
  }>;
  "0"?: Array<{
    _new_company?: {
      id?: number;
      name: string;
      _is_that_investor?: boolean;
    };
  }>;
  "1"?: Array<{
    _new_company?: {
      id?: number;
      name: string;
    };
  }>;
}

interface NewTargetEntity {
  id: number;
  name: string;
  page_type?: string;
  route?: string;
  counterparty_announcement_url?: string;
}

interface NewCounterpartyMinimal {
  id: number;
  name: string;
  page_type?: string;
}

interface NewOtherCounterparty {
  id?: number;
  name?: string;
  page_type?: string;
  counterparty_id?: number;
  counterparty_status?: string;
  _new_company?: {
    id?: number;
    name?: string;
    _is_that_investor?: boolean;
  };
}

interface NewAdvisorMinimal {
  id?: number;
  advisor_company?: { id?: number; name?: string };
  _new_company?: { id?: number; name?: string };
}

interface NewCorporateEvent {
  id?: number;
  description?: string;
  announcement_date?: string;
  deal_type?: string;
  target_company?: {
    id?: number;
    name?: string;
    page_type?: string;
  };
  targets?: NewTargetEntity[];
  target_label?: string;
  target_counterparty?: {
    new_company_counterparty?: number;
    new_company?: {
      id?: number;
      name?: string;
      _location?: { Country?: string };
    };
    _new_company?: {
      id?: number;
      name?: string;
      _location?: { Country?: string };
    };
  };
  buyer_investor_label?: string | null;
  buyers?: NewCounterpartyMinimal[];
  sellers?: NewCounterpartyMinimal[];
  investors?: NewCounterpartyMinimal[];
  buyers_investors?: NewCounterpartyMinimal[];
  other_counterparties?: NewOtherCounterparty[];
  advisors?: NewAdvisorMinimal[];
  advisors_names?: string[];
  investment_data?: {
    investment_amount_m?: number | string;
    investment_amount?: number | string;
    currency?: { Currency?: string } | null;
    _currency?: { Currency?: string };
    currency_id?: string;
    Funding_stage?: string;
    funding_stage?: string;
  };
  investment_display?: string | null;
  ev_display?: string | null;
  ev_data?: {
    enterprise_value_m?: number | string;
    ev_band?: string;
    currency?: { Currency?: string };
    _currency?: { Currency?: string };
  };
  "0"?: Array<{
    _new_company?: {
      id?: number;
      name: string;
      _is_that_investor?: boolean;
    };
  }>;
  "1"?: Array<{
    _new_company?: {
      id?: number;
      name: string;
    };
  }>;
}

export type CorporateEvent = LegacyCorporateEvent | NewCorporateEvent;

interface CorporateEventsTableProps {
  events: CorporateEvent[];
  loading?: boolean;
  onEventClick?: (eventId: number, description?: string) => void;
  onAdvisorClick?: (advisorId?: number, advisorName?: string) => void;
  showSectors?: boolean;
  maxInitialEvents?: number;
  truncateDescriptionLength?: number;
}

const formatDate = (dateString: string | null | undefined): string => {
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

const truncateDescription = (
  description: string,
  maxLength: number = 150
): { text: string; isLong: boolean } => {
  if (!description) return { text: "Not available", isLong: false };
  const isLong = description.length > maxLength;
  const truncated = isLong
    ? description.substring(0, maxLength) + "..."
    : description;
  return { text: truncated, isLong };
};

const sanitizeAmountValue = (
  value?: number | string | null
): number | string | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const num = Number(trimmed.replace(/,/g, ""));
  return Number.isNaN(num) ? trimmed : num;
};

export const CorporateEventsTable: React.FC<CorporateEventsTableProps> = ({
  events,
  loading = false,
  onEventClick,
  onAdvisorClick,
  showSectors = false,
  maxInitialEvents = 3,
  truncateDescriptionLength = 180,
}) => {
  const router = useRouter();
  const [showAllEvents, setShowAllEvents] = useState(false);

  const handleEventClick = (eventId: number | undefined, description?: string) => {
    if (eventId && onEventClick) {
      onEventClick(eventId, description);
    } else if (eventId) {
      router.push(`/corporate-event/${eventId}`);
    }
  };

  const handleAdvisorClick = (advisorId?: number, advisorName?: string) => {
    if (onAdvisorClick) {
      onAdvisorClick(advisorId, advisorName);
    } else if (advisorId) {
      router.push(`/advisor/${advisorId}`);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "24px" }}>
        Loading corporate events...
      </div>
    );
  }

  const displayedEvents = showAllEvents
    ? events
    : events.slice(0, maxInitialEvents);

  return (
    <div>
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
            minWidth: showSectors ? "1200px" : "900px",
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
                Event Details
              </th>
              <th
                style={{
                  padding: "12px",
                  textAlign: "left",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                Parties
              </th>
              <th
                style={{
                  padding: "12px",
                  textAlign: "left",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                Deal Details
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
              {showSectors && (
                <th
                  style={{
                    padding: "12px",
                    textAlign: "left",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  Sectors
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {displayedEvents.length > 0 ? (
              displayedEvents.map((event, index) => {
                const newEvent = event as NewCorporateEvent;
                const legacyEvent = event as LegacyCorporateEvent;
                const isPartnership = /partnership/i.test(
                  newEvent.deal_type || legacyEvent.deal_type || ""
                );

                // Extract target info
                const targets = newEvent.targets;
                const legacyTarget =
                  newEvent.target_counterparty?.new_company ||
                  newEvent.target_counterparty?._new_company;
                const legacyTargetId =
                  newEvent.target_counterparty?.new_company_counterparty;
                const targetCountry =
                  legacyTarget?._location?.Country || "Not Available";

                // Get advisors
                const newAdvisors = newEvent.advisors || [];
                const legacyAdvisors = legacyEvent["1"] || [];
                const advisorsNames = Array.isArray(newEvent.advisors_names)
                  ? newEvent.advisors_names
                  : typeof newEvent.advisors_names === "string"
                  ? [newEvent.advisors_names]
                  : [];
                const advisorList = [
                  ...newAdvisors.map((a) => ({
                    id: a.advisor_company?.id || a._new_company?.id,
                    name: a.advisor_company?.name || a._new_company?.name || "",
                  })),
                  ...legacyAdvisors.map((a) => ({
                    id: a._new_company?.id,
                    name: a._new_company?.name || "",
                  })),
                  ...advisorsNames.map((name) => ({
                    id: undefined,
                    name: typeof name === "string" ? name : "",
                  })),
                ].filter((a) => Boolean(a.name));

                // Extract deal metrics
                const anyEvent = event as unknown as {
                  investment_data?: {
                    investment_amount_m?: number | string;
                    investment_amount?: number | string;
                    currency?: { Currency?: string };
                    _currency?: { Currency?: string };
                    Funding_stage?: string;
                    funding_stage?: string;
                  };
                  ev_data?: {
                    enterprise_value_m?: number | string;
                    ev_band?: string;
                    currency?: { Currency?: string };
                    _currency?: { Currency?: string };
                  };
                };

                const dealType = newEvent.deal_type || legacyEvent.deal_type;
                const amountDisplay = newEvent.investment_display || null;
                const amountRaw =
                  anyEvent.investment_data?.investment_amount_m ??
                  anyEvent.investment_data?.investment_amount ??
                  null;
                const amountMillions = sanitizeAmountValue(amountRaw);
                const amountCurrency: string | undefined =
                  anyEvent.investment_data?.currency?.Currency ||
                  anyEvent.investment_data?._currency?.Currency;

                const evDataRaw = legacyEvent.ev_data || newEvent.ev_data;
                const evMillions = sanitizeAmountValue(
                  evDataRaw?.enterprise_value_m ?? null
                );
                const evCurrency: string | undefined =
                  evDataRaw?._currency?.Currency ||
                  evDataRaw?.currency?.Currency;
                const hasEvNumeric =
                  evMillions !== null &&
                  typeof evCurrency === "string" &&
                  evCurrency.trim().length > 0;
                const evDisplay = hasEvNumeric
                  ? null
                  : (newEvent.ev_display || null);
                const evBandFallback = hasEvNumeric
                  ? null
                  : evDataRaw?.ev_band || null;

                const fundingStage = (
                  anyEvent.investment_data?.Funding_stage ||
                  anyEvent.investment_data?.funding_stage ||
                  ""
                ).trim();

                const description =
                  newEvent.description || legacyEvent.description || "";
                const { text: truncatedDescription } = truncateDescription(
                  description,
                  truncateDescriptionLength
                );

                return (
                  <tr
                    key={event.id || index}
                    style={{ borderBottom: "1px solid #e2e8f0" }}
                  >
                    {/* Event Details */}
                    <td
                      style={{
                        padding: "12px",
                        verticalAlign: "top",
                      }}
                    >
                      <div style={{ maxWidth: "300px" }}>
                        <a
                          href={
                            event.id ? `/corporate-event/${event.id}` : "#"
                          }
                          style={{
                            color: "#3b82f6",
                            textDecoration: "underline",
                            fontWeight: "500",
                            cursor: "pointer",
                            lineHeight: 1.4,
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            handleEventClick(event.id, description);
                          }}
                        >
                          {truncatedDescription}
                        </a>
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#64748b",
                          marginTop: "4px",
                        }}
                      >
                        Date:{" "}
                        {formatDate(
                          newEvent.announcement_date ||
                            legacyEvent.announcement_date
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#64748b",
                        }}
                      >
                        Target HQ: {targetCountry}
                      </div>
                    </td>

                    {/* Parties */}
                    <td
                      style={{
                        padding: "12px",
                        verticalAlign: "top",
                        fontSize: "12px",
                      }}
                    >
                      {/* Target */}
                      <div style={{ marginBottom: "4px" }}>
                        <strong>
                          {newEvent.target_label ||
                            (isPartnership ? "Target(s)" : "Target")}
                          :
                        </strong>{" "}
                        {(() => {
                          // Use new targets array if available
                          if (Array.isArray(targets) && targets.length > 0) {
                            const displayTargets = isPartnership
                              ? targets
                              : targets.slice(0, 1);
                            return displayTargets.map((tgt, i, arr) => {
                              const pageType =
                                tgt.page_type === "investor"
                                  ? "investors"
                                  : tgt.route === "investor" ||
                                    tgt.route === "investors"
                                  ? "investors"
                                  : "company";
                              const href = `/${pageType}/${tgt.id}`;
                              return (
                                <span key={`tgt-${tgt.id}-${i}`}>
                                  <a
                                    href={href}
                                    style={{
                                      color: "#3b82f6",
                                      textDecoration: "underline",
                                    }}
                                  >
                                    {tgt.name}
                                  </a>
                                  {i < arr.length - 1 && ", "}
                                </span>
                              );
                            });
                          }
                          // Fallback to legacy target
                          if (legacyTarget?.name && legacyTargetId) {
                            return (
                              <a
                                href={`/company/${legacyTargetId}`}
                                style={{
                                  color: "#3b82f6",
                                  textDecoration: "underline",
                                }}
                              >
                                {legacyTarget.name}
                              </a>
                            );
                          }
                          // Fallback to target_company
                          if (newEvent.target_company?.name) {
                            const pageType =
                              newEvent.target_company.page_type === "investor"
                                ? "investors"
                                : "company";
                            const href = newEvent.target_company.id
                              ? `/${pageType}/${newEvent.target_company.id}`
                              : undefined;
                            if (href) {
                              return (
                                <a
                                  href={href}
                                  style={{
                                    color: "#3b82f6",
                                    textDecoration: "underline",
                                  }}
                                >
                                  {newEvent.target_company.name}
                                </a>
                              );
                            }
                            return <span>{newEvent.target_company.name}</span>;
                          }
                          return "Not Available";
                        })()}
                      </div>

                      {/* Buyers/Investors (skip for partnerships) */}
                      {!isPartnership && (
                        <div style={{ marginBottom: "4px" }}>
                          <strong>
                            {newEvent.buyer_investor_label ||
                              "Buyer(s) / Investor(s)"}
                            :
                          </strong>{" "}
                          {(() => {
                            // Prefer new other_counterparties with counterparty_status
                            if (
                              Array.isArray(newEvent.other_counterparties) &&
                              newEvent.other_counterparties.length > 0
                            ) {
                              // Filter for buyers/investors (not divestors/targets)
                              const buyersInvestors =
                                newEvent.other_counterparties.filter((cp) => {
                                  if (cp.counterparty_status) {
                                    const status =
                                      cp.counterparty_status.toLowerCase();
                                    if (
                                      status.includes("divestor") ||
                                      status.includes("seller")
                                    )
                                      return false;
                                    if (
                                      status.includes("acquirer") ||
                                      status.includes("buyer") ||
                                      status.includes("investor")
                                    )
                                      return true;
                                  }
                                  // In new format, check if it has direct id/name
                                  if (
                                    "id" in cp &&
                                    "name" in cp &&
                                    cp.id &&
                                    cp.name
                                  )
                                    return true;
                                  // In legacy format, check _new_company
                                  if (
                                    "_new_company" in cp &&
                                    cp._new_company?.name
                                  )
                                    return true;
                                  return false;
                                });

                              if (buyersInvestors.length > 0) {
                                return buyersInvestors.map((cp, idx) => {
                                  // Handle new API format
                                  if (
                                    "id" in cp &&
                                    "name" in cp &&
                                    cp.id &&
                                    cp.name
                                  ) {
                                    const pageType =
                                      cp.page_type === "investor"
                                        ? "investors"
                                        : "company";
                                    const href = `/${pageType}/${cp.id}`;
                                    return (
                                      <span key={`cp-${cp.id}-${idx}`}>
                                        <a
                                          href={href}
                                          style={{
                                            color: "#3b82f6",
                                            textDecoration: "underline",
                                          }}
                                        >
                                          {cp.name}
                                        </a>
                                        {idx < buyersInvestors.length - 1 && ", "}
                                      </span>
                                    );
                                  }
                                  // Handle legacy format
                                  if (
                                    "_new_company" in cp &&
                                    cp._new_company
                                  ) {
                                    const newCompany = cp._new_company;
                                    const href = newCompany.id
                                      ? newCompany._is_that_investor
                                        ? `/investors/${newCompany.id}`
                                        : `/company/${newCompany.id}`
                                      : undefined;
                                    return (
                                      <span
                                        key={`cp-${newCompany.id || idx}-${idx}`}
                                      >
                                        {href ? (
                                          <a
                                            href={href}
                                            style={{
                                              color: "#3b82f6",
                                              textDecoration: "underline",
                                            }}
                                          >
                                            {newCompany.name}
                                          </a>
                                        ) : (
                                          <span>{newCompany.name}</span>
                                        )}
                                        {idx < buyersInvestors.length - 1 && ", "}
                                      </span>
                                    );
                                  }
                                  return null;
                                });
                              }
                            }

                            // Fallback to buyers_investors array
                            if (
                              Array.isArray(newEvent.buyers_investors) &&
                              newEvent.buyers_investors.length > 0
                            ) {
                              return newEvent.buyers_investors.map(
                                (c, idx) => {
                                  const href =
                                    c.page_type === "investor"
                                      ? `/investors/${c.id}`
                                      : `/company/${c.id}`;
                                  return (
                                    <span key={`${c.id}-${idx}`}>
                                      <a
                                        href={href}
                                        style={{
                                          color: "#3b82f6",
                                          textDecoration: "underline",
                                        }}
                                      >
                                        {c.name}
                                      </a>
                                      {idx < newEvent.buyers_investors!.length - 1 && ", "}
                                    </span>
                                  );
                                }
                              );
                            }

                            // Fallback to legacy format from event["0"]
                            const legacyList = (legacyEvent["0"] || []).filter(
                              (c) => c._new_company?.name
                            );
                            if (legacyList.length > 0) {
                              return legacyList.map((it, idx) => {
                                const id = it._new_company?.id;
                                const isInvestor =
                                  it._new_company?._is_that_investor;
                                const href = id
                                  ? isInvestor
                                    ? `/investors/${id}`
                                    : `/company/${id}`
                                  : undefined;
                                return (
                                  <span key={`${id || idx}-${idx}`}>
                                    {href ? (
                                      <a
                                        href={href}
                                        style={{
                                          color: "#3b82f6",
                                          textDecoration: "underline",
                                        }}
                                      >
                                        {it._new_company!.name}
                                      </a>
                                    ) : (
                                      <span>{it._new_company!.name}</span>
                                    )}
                                    {idx < legacyList.length - 1 && ", "}
                                  </span>
                                );
                              });
                            }

                            return "Not Available";
                          })()}
                        </div>
                      )}

                      {/* Sellers (skip for partnerships) */}
                      {!isPartnership && (
                        <div style={{ marginBottom: "4px" }}>
                          <strong>Seller(s):</strong>{" "}
                          {(() => {
                            // First, check for sellers array (new API format)
                            const sellersArray = Array.isArray(newEvent.sellers)
                              ? newEvent.sellers
                              : [];
                            if (sellersArray.length > 0) {
                              return sellersArray.map((seller, idx) => {
                                const href =
                                  seller.page_type === "investor"
                                    ? `/investors/${seller.id}`
                                    : `/company/${seller.id}`;
                                return (
                                  <span key={`seller-${seller.id}-${idx}`}>
                                    <a
                                      href={href}
                                      style={{
                                        color: "#3b82f6",
                                        textDecoration: "underline",
                                      }}
                                    >
                                      {seller.name}
                                    </a>
                                    {idx < sellersArray.length - 1 && ", "}
                                  </span>
                                );
                              });
                            }

                            // Also check other_counterparties for divestors
                            if (
                              Array.isArray(newEvent.other_counterparties) &&
                              newEvent.other_counterparties.length > 0
                            ) {
                              const divestors =
                                newEvent.other_counterparties.filter((cp) => {
                                  if (cp.counterparty_status) {
                                    return /divestor|seller/i.test(
                                      cp.counterparty_status
                                    );
                                  }
                                  return false;
                                });

                              if (divestors.length > 0) {
                                return divestors.map((cp, idx) => {
                                  const href =
                                    cp.page_type === "investor"
                                      ? `/investors/${cp.id}`
                                      : `/company/${cp.id}`;
                                  return (
                                    <span key={`divestor-${cp.id}-${idx}`}>
                                      <a
                                        href={href}
                                        style={{
                                          color: "#3b82f6",
                                          textDecoration: "underline",
                                        }}
                                      >
                                        {cp.name}
                                      </a>
                                      {idx < divestors.length - 1 && ", "}
                                    </span>
                                  );
                                });
                              }
                            }

                            return "Not Available";
                          })()}
                        </div>
                      )}
                    </td>

                    {/* Deal Details */}
                    <td
                      style={{
                        padding: "12px",
                        verticalAlign: "top",
                        fontSize: "12px",
                      }}
                    >
                      <CorporateEventDealMetrics
                        dealType={dealType}
                        fundingStage={fundingStage || undefined}
                        isPartnership={isPartnership}
                        amountDisplay={amountDisplay}
                        amountMillions={amountMillions}
                        amountCurrency={amountCurrency}
                        evDisplay={evDisplay}
                        evMillions={evMillions}
                        evCurrency={evCurrency}
                        evBandFallback={evBandFallback}
                      />
                    </td>

                    {/* Advisors */}
                    <td
                      style={{
                        padding: "12px",
                        verticalAlign: "top",
                        fontSize: "12px",
                      }}
                    >
                      {advisorList.length > 0
                        ? advisorList.map((advisor, idx) => (
                            <span key={advisor.id ?? `${advisor.name}-${idx}`}>
                              <span
                                style={{
                                  color: "#3b82f6",
                                  cursor: "pointer",
                                }}
                                onClick={() => {
                                  handleAdvisorClick(advisor.id, advisor.name);
                                }}
                              >
                                {advisor.name}
                              </span>
                              {idx < advisorList.length - 1 && ", "}
                            </span>
                          ))
                        : "Not Available"}
                    </td>

                    {/* Sectors - only shown if showSectors is true */}
                    {showSectors && (
                      <td
                        style={{
                          padding: "12px",
                          verticalAlign: "top",
                          fontSize: "12px",
                        }}
                      >
                        {/* Sectors would be passed as props if needed */}
                        <div className="muted-row">
                          <span>Not available</span>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={showSectors ? 5 : 4}
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

      {events.length > maxInitialEvents && (
        <div style={{ textAlign: "center", marginTop: "16px" }}>
          <button
            onClick={() => setShowAllEvents(!showAllEvents)}
            style={{
              background: "none",
              border: "none",
              color: "#0075df",
              textDecoration: "underline",
              cursor: "pointer",
              fontSize: "14px",
              padding: "8px 0",
            }}
          >
            {showAllEvents ? "Show Less" : "See More"}
          </button>
        </div>
      )}
    </div>
  );
};

