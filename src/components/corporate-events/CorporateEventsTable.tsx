"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CorporateEventDealMetrics } from "./CorporateEventDealMetrics";
import {
  CorporateEventPartyLink,
  CorporateEventTargetLink,
} from "./CorporateEventPartyLink";

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
    currency?: string | { Currency?: string } | null;
    _currency?: { Currency?: string };
    currency_id?: number | string;
    Funding_stage?: string;
    funding_stage?: string;
    investment_amount_url?: string | null;
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
    hq_country_iso2?: string | null;
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
  entity_type?: string;
  hq_country_iso2?: string | null;
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
  sales?: NewCounterpartyMinimal[];
  investors?: NewCounterpartyMinimal[];
  buyers_investors?: NewCounterpartyMinimal[];
  other_counterparties?: NewOtherCounterparty[];
  advisors?: NewAdvisorMinimal[];
  advisors_names?: string[];
  investment_data?: {
    investment_amount_m?: number | string;
    investment_amount?: number | string;
    currency?: string | { Currency?: string } | null;
    _currency?: { Currency?: string };
    currency_id?: number | string;
    Funding_stage?: string;
    funding_stage?: string;
    investment_amount_url?: string | null;
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

export interface Sector {
  sector_id?: number;
  sector_name?: string;
  Sector_importance?: string;
}

interface CorporateEventsTableProps {
  events: CorporateEvent[];
  loading?: boolean;
  onEventClick?: (eventId: number, description?: string) => void;
  onAdvisorClick?: (advisorId?: number, advisorName?: string) => void;
  showSectors?: boolean;
  primarySectors?: Sector[];
  secondarySectors?: Sector[];
  maxInitialEvents?: number;
  truncateDescriptionLength?: number;
  /** Match company profile V3 panel (Geist tokens, hairline borders) */
  variant?: "legacy" | "v3";
}

type CePaletteKey = "legacy" | "v3";

const CE_PALETTE: Record<
  CePaletteKey,
  {
    wrapBorder: string;
    wrapRadius: number | string;
    cellBorder: string;
    theadBg: string;
    link: string;
    muted: string;
    tableFont: string;
    thExtra: React.CSSProperties;
    expandBtn: string;
  }
> = {
  legacy: {
    wrapBorder: "1px solid #e2e8f0",
    wrapRadius: "8px",
    cellBorder: "#e2e8f0",
    theadBg: "#f8fafc",
    link: "#3b82f6",
    muted: "#64748b",
    tableFont: "14px",
    thExtra: {},
    expandBtn: "#0075df",
  },
  v3: {
    wrapBorder: "none",
    wrapRadius: 0,
    cellBorder: "rgba(15,17,21,0.06)",
    theadBg: "#F4F3EE",
    link: "oklch(54% 0.22 258)",
    muted: "#6B6E76",
    tableFont: "12.5px",
    thExtra: {
      fontSize: "11.5px",
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      color: "#6B6E76",
    },
    expandBtn: "oklch(54% 0.22 258)",
  },
};

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "-";
  }
};

const truncateDescription = (
  description: string,
  maxLength: number = 150
): { text: string; isLong: boolean } => {
  if (!description) return { text: "-", isLong: false };
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
  primarySectors = [],
  secondarySectors = [],
  maxInitialEvents = 3,
  truncateDescriptionLength = 180,
  variant = "legacy",
}) => {
  const router = useRouter();
  const [showAllEvents, setShowAllEvents] = useState(false);
  const pal = CE_PALETTE[variant === "v3" ? "v3" : "legacy"];

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
      <div
        style={{
          textAlign: "center",
          padding: variant === "v3" ? "20px 16px" : "24px",
          color: pal.muted,
          fontSize: variant === "v3" ? "12.5px" : "14px",
        }}
      >
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
          border: pal.wrapBorder,
          borderRadius: pal.wrapRadius,
        }}
      >
        <table
          style={{
            width: "100%",
            minWidth: showSectors ? "1200px" : "900px",
            borderCollapse: "collapse",
            fontSize: pal.tableFont,
          }}
        >
          <thead>
            <tr style={{ backgroundColor: pal.theadBg }}>
              <th
                style={{
                  padding: variant === "v3" ? "10px 12px" : "12px",
                  textAlign: "left",
                  borderBottom: `1px solid ${pal.cellBorder}`,
                  ...pal.thExtra,
                }}
              >
                Event Details
              </th>
              <th
                style={{
                  padding: variant === "v3" ? "10px 12px" : "12px",
                  textAlign: "left",
                  borderBottom: `1px solid ${pal.cellBorder}`,
                  ...pal.thExtra,
                }}
              >
                Parties
              </th>
              <th
                style={{
                  padding: variant === "v3" ? "10px 12px" : "12px",
                  textAlign: "left",
                  borderBottom: `1px solid ${pal.cellBorder}`,
                  ...pal.thExtra,
                }}
              >
                Deal Details
              </th>
              <th
                style={{
                  padding: variant === "v3" ? "10px 12px" : "12px",
                  textAlign: "left",
                  borderBottom: `1px solid ${pal.cellBorder}`,
                  ...pal.thExtra,
                }}
              >
                Advisor(s)
              </th>
              {showSectors && (
                <th
                  style={{
                    padding: variant === "v3" ? "10px 12px" : "12px",
                    textAlign: "left",
                    borderBottom: `1px solid ${pal.cellBorder}`,
                    ...pal.thExtra,
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
                  legacyTarget?._location?.Country || "-";

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
                    currency?: string | { Currency?: string };
                    _currency?: { Currency?: string };
                    currency_id?: number | string;
                    Funding_stage?: string;
                    funding_stage?: string;
                    investment_amount_url?: string | null;
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
                // Handle both string format (new API) and object format (legacy)
                const amountCurrency: string | undefined =
                  typeof anyEvent.investment_data?.currency === "string"
                    ? anyEvent.investment_data.currency
                    : anyEvent.investment_data?.currency?.Currency ||
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
                    style={{ borderBottom: `1px solid ${pal.cellBorder}` }}
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
                            color: pal.link,
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
                          color: pal.muted,
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
                          color: pal.muted,
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
                                  <CorporateEventTargetLink
                                    name={tgt.name}
                                    href={href}
                                    entity={tgt as unknown as Record<string, unknown>}
                                    linkStyle={{
                                      color: pal.link,
                                      textDecoration: "underline",
                                    }}
                                  />
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
                                  color: pal.link,
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
                                    color: pal.link,
                                    textDecoration: "underline",
                                  }}
                                >
                                  {newEvent.target_company.name}
                                </a>
                              );
                            }
                            return <span>{newEvent.target_company.name}</span>;
                          }
                          return "-";
                        })()}
                      </div>

                      {/* Buyers (skip for partnerships) */}
                      {!isPartnership && (() => {
                        // Extract buyers separately
                        const buyers: Array<{
                          id?: number;
                          name: string;
                          href: string | null;
                        }> = [];
                        const dealTypeLower = String(newEvent.deal_type ?? legacyEvent.deal_type ?? "").toLowerCase();
                        const isInvestmentDeal = dealTypeLower.includes("investment");
                        
                            // Prefer new other_counterparties with counterparty_status
                            if (
                              Array.isArray(newEvent.other_counterparties) &&
                              newEvent.other_counterparties.length > 0
                            ) {
                          newEvent.other_counterparties.forEach((cp) => {
                                  if (cp.counterparty_status) {
                              const status = cp.counterparty_status.toLowerCase();
                              // Only buyers/acquirers, not investors
                              if (status.includes("acquirer") || status.includes("buyer")) {
                                if ("id" in cp && "name" in cp && cp.id && cp.name) {
                                  const pageType = cp.page_type === "investor" ? "investors" : "company";
                                  buyers.push({
                                    id: cp.id,
                                    name: cp.name,
                                    href: `/${pageType}/${cp.id}`,
                                  });
                                } else if ("_new_company" in cp && cp._new_company?.name && !cp._new_company?._is_that_investor) {
                                  const href = cp._new_company.id
                                    ? `/company/${cp._new_company.id}`
                                    : null;
                                  buyers.push({
                                    id: cp._new_company.id,
                                    name: cp._new_company.name,
                                    href,
                                  });
                                }
                              }
                            }
                          });
                        }

                        // Fallback to buyers array
                        if (buyers.length === 0 && Array.isArray(newEvent.buyers) && newEvent.buyers.length > 0) {
                          newEvent.buyers.forEach((c) => {
                            if (c && typeof c.id === "number" && c.name) {
                              const href = c.page_type === "investor"
                                ? `/investors/${c.id}`
                                : `/company/${c.id}`;
                              buyers.push({
                                id: c.id,
                                name: c.name,
                                href,
                              });
                            }
                          });
                        }

                        // Fallback to buyers_investors (non-investors only)
                        // IMPORTANT: for Investment deals, `buyers_investors` are investors, not buyers.
                        if (
                          !isInvestmentDeal &&
                          buyers.length === 0 &&
                          Array.isArray(newEvent.buyers_investors) &&
                          newEvent.buyers_investors.length > 0
                        ) {
                          newEvent.buyers_investors.forEach((c) => {
                            if (c && typeof c.id === "number" && c.name && c.page_type !== "investor") {
                              buyers.push({
                                id: c.id,
                                name: c.name,
                                href: `/company/${c.id}`,
                              });
                            }
                          });
                        }

                        // Fallback to legacy format (non-investors)
                        if (buyers.length === 0) {
                          const legacyList = (legacyEvent["0"] || []).filter(
                            (c) => c._new_company?.name && !c._new_company?._is_that_investor
                          );
                          legacyList.forEach((it) => {
                            const id = it._new_company?.id;
                            buyers.push({
                              id,
                              name: it._new_company!.name,
                              href: id ? `/company/${id}` : null,
                            });
                          });
                        }

                        if (buyers.length === 0) return null;

                                    return (
                          <div style={{ marginBottom: "4px" }}>
                            <strong>Buyer(s):</strong>{" "}
                            {buyers.map((b, idx) => (
                              <span key={`buyer-${b.id ?? idx}-${idx}`}>
                                <CorporateEventPartyLink
                                  name={b.name}
                                  href={b.href}


                                  linkStyle={{
                                    color: pal.link,
                                    textDecoration: "underline",
                                  }}
                                />
                                {idx < buyers.length - 1 && ", "}
                              </span>
                            ))}
                          </div>
                        );
                      })()}

                      {/* Investors (skip for partnerships) */}
                      {!isPartnership && (() => {
                        // Extract investors separately
                        const investors: Array<{
                          id?: number;
                          name: string;
                          href: string | null;
                        }> = [];
                        const dealTypeLower = String(newEvent.deal_type ?? legacyEvent.deal_type ?? "").toLowerCase();
                        const isInvestmentDeal = dealTypeLower.includes("investment");
                        
                        // Prefer new other_counterparties with counterparty_status
                        if (
                          Array.isArray(newEvent.other_counterparties) &&
                          newEvent.other_counterparties.length > 0
                        ) {
                          newEvent.other_counterparties.forEach((cp) => {
                            if (cp.counterparty_status) {
                              const status = cp.counterparty_status.toLowerCase();
                              // Only investors
                              if (status.includes("investor")) {
                                if ("id" in cp && "name" in cp && cp.id && cp.name) {
                                  investors.push({
                                    id: cp.id,
                                    name: cp.name,
                                    href: `/investors/${cp.id}`,
                                  });
                                } else if ("_new_company" in cp && cp._new_company?.name && cp._new_company?._is_that_investor) {
                                  const href = cp._new_company.id
                                    ? `/investors/${cp._new_company.id}`
                                    : null;
                                  investors.push({
                                    id: cp._new_company.id,
                                    name: cp._new_company.name,
                                    href,
                                  });
                                }
                              }
                            }
                          });
                        }

                        // Fallback to investors array
                        if (investors.length === 0 && Array.isArray(newEvent.investors) && newEvent.investors.length > 0) {
                          newEvent.investors.forEach((c) => {
                            if (c && typeof c.id === "number" && c.name) {
                              investors.push({
                                id: c.id,
                                name: c.name,
                                href: `/investors/${c.id}`,
                              });
                            }
                          });
                        }

                        // Fallback to buyers_investors (investors only)
                        if (investors.length === 0 && Array.isArray(newEvent.buyers_investors) && newEvent.buyers_investors.length > 0) {
                          newEvent.buyers_investors.forEach((c) => {
                            // For Investment deals, the backend often places investors in buyers_investors without page_type.
                            if (
                              c &&
                              typeof c.id === "number" &&
                              c.name &&
                              (isInvestmentDeal || c.page_type === "investor")
                            ) {
                              investors.push({
                                id: c.id,
                                name: c.name,
                                href: `/investors/${c.id}`,
                              });
                            }
                          });
                        }

                        // Fallback to legacy format (investors only)
                        if (investors.length === 0) {
                            const legacyList = (legacyEvent["0"] || []).filter(
                            (c) => c._new_company?.name && c._new_company?._is_that_investor
                            );
                          legacyList.forEach((it) => {
                                const id = it._new_company?.id;
                            investors.push({
                              id,
                              name: it._new_company!.name,
                              href: id ? `/investors/${id}` : null,
                            });
                          });
                        }

                        if (investors.length === 0) return null;

                                return (
                          <div style={{ marginBottom: "4px" }}>
                            <strong>Investor(s):</strong>{" "}
                            {investors.map((inv, idx) => (
                              <span key={`investor-${inv.id ?? idx}-${idx}`}>
                                <CorporateEventPartyLink
                                  name={inv.name}
                                  href={inv.href}


                                  linkStyle={{
                                    color: pal.link,
                                    textDecoration: "underline",
                                  }}
                                />
                                {idx < investors.length - 1 && ", "}
                              </span>
                            ))}
                          </div>
                                );
                          })()}

                      {/* Sellers (skip for partnerships) */}
                      {!isPartnership && (() => {
                        const sellers: Array<{
                          id?: number;
                          name: string;
                          href: string | null;
                        }> = [];

                        const sellerSources = [
                          ...(Array.isArray(newEvent.sellers) ? newEvent.sellers : []),
                          ...(Array.isArray(newEvent.sales) ? newEvent.sales : []),
                        ];

                        if (sellerSources.length > 0) {
                          sellerSources.forEach((seller) => {
                            if (seller && typeof seller.id === "number" && seller.name) {
                              const href = seller.page_type === "investor"
                                    ? `/investors/${seller.id}`
                                    : `/company/${seller.id}`;
                              sellers.push({
                                id: seller.id,
                                name: seller.name,
                                href,
                              });
                            }
                              });
                            }

                            // Also check other_counterparties for divestors
                        if (sellers.length === 0 &&
                              Array.isArray(newEvent.other_counterparties) &&
                              newEvent.other_counterparties.length > 0
                            ) {
                          newEvent.other_counterparties.forEach((cp) => {
                                  if (cp.counterparty_status) {
                              const status = cp.counterparty_status.toLowerCase();
                              if (status.includes("divestor") || status.includes("seller")) {
                                if ("id" in cp && "name" in cp && cp.id && cp.name) {
                                  const pageType = cp.page_type === "investor" ? "investors" : "company";
                                  sellers.push({
                                    id: cp.id,
                                    name: cp.name,
                                    href: `/${pageType}/${cp.id}`,
                                  });
                                } else if ("_new_company" in cp && cp._new_company?.name) {
                                  const id = cp._new_company.id;
                                  const href = id
                                    ? (cp._new_company._is_that_investor
                                        ? `/investors/${id}`
                                        : `/company/${id}`)
                                    : null;
                                  sellers.push({
                                    id,
                                    name: cp._new_company.name,
                                    href,
                                  });
                                }
                              }
                            }
                          });
                        }

                        if (sellers.length === 0) return null;

                                  return (
                          <div style={{ marginBottom: "4px" }}>
                            <strong>Seller(s):</strong>{" "}
                            {sellers.map((s, idx) => (
                              <span key={`seller-${s.id ?? idx}-${idx}`}>
                                <CorporateEventPartyLink
                                  name={s.name}
                                  href={s.href}


                                  linkStyle={{
                                    color: pal.link,
                                    textDecoration: "underline",
                                  }}
                                />
                                {idx < sellers.length - 1 && ", "}
                                    </span>
                            ))}
                          </div>
                                  );
                          })()}
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
                      <div className="muted-row">
                        <strong>Advisor(s):</strong>{" "}
                        {advisorList.length > 0
                          ? advisorList.map((advisor, idx) => (
                              <span key={advisor.id ?? `${advisor.name}-${idx}`}>
                                <span
                                  style={{
                                    color: pal.link,
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
                          : "-"}
                      </div>
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
                        {primarySectors.length > 0 && (
                          <div style={{ marginBottom: "4px" }}>
                            <strong>Primary:</strong>{" "}
                            {primarySectors
                              .filter((s) => s?.sector_name)
                              .map((s, idx) => {
                                const id = s?.sector_id;
                                const name = s?.sector_name || "";
                                const separator = idx < primarySectors.filter((s) => s?.sector_name).length - 1 ? ", " : "";
                                if (typeof id === "number") {
                                  return (
                                    <span key={`${name}-${id}-${idx}`}>
                                      <a
                                        href={`/sector/${id}`}
                                        style={{
                                          color: pal.link,
                                          textDecoration: "underline",
                                        }}
                                      >
                                        {name}
                                      </a>
                                      {separator}
                                    </span>
                                  );
                                }
                                return (
                                  <span key={`${name}-na-${idx}`}>
                                    {name}{separator}
                                  </span>
                                );
                              })}
                          </div>
                        )}
                        {secondarySectors.length > 0 && (
                          <div style={{ marginBottom: "4px" }}>
                            <strong>Secondary:</strong>{" "}
                            {secondarySectors
                              .filter((s) => s?.sector_name)
                              .map((s, idx) => {
                                const id = s?.sector_id;
                                const name = s?.sector_name || "";
                                const separator = idx < secondarySectors.filter((s) => s?.sector_name).length - 1 ? ", " : "";
                                if (typeof id === "number") {
                                  return (
                                    <span key={`${name}-${id}-${idx}`}>
                                      <a
                                        href={`/sub-sector/${id}`}
                                        style={{
                                          color: pal.link,
                                          textDecoration: "underline",
                                        }}
                                      >
                                        {name}
                                      </a>
                                      {separator}
                                    </span>
                                  );
                                }
                                return (
                                  <span key={`${name}-na-${idx}`}>
                                    {name}{separator}
                                  </span>
                                );
                              })}
                          </div>
                        )}
                        {primarySectors.length === 0 && secondarySectors.length === 0 && (
                        <div className="muted-row">
                          <span>-</span>
                        </div>
                        )}
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
                    color: pal.muted,
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
              color: pal.expandBtn,
              textDecoration: "underline",
              cursor: "pointer",
              fontSize: variant === "v3" ? "12.5px" : "14px",
              fontWeight: variant === "v3" ? 500 : 400,
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

