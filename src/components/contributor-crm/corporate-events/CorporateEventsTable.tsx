"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CorporateEventDealMetrics } from "./CorporateEventDealMetrics";

export interface Sector {
  sector_id?: number;
  sector_name?: string;
  Sector_importance?: string;
}

interface LegacyCorporateEvent {
  id?: number;
  description: string;
  announcement_date: string;
  deal_type: string;
  ev_data?: {
    enterprise_value_m?: number | string;
    ev_band?: string;
    currency?: { Currency?: string | null } | null;
    _currency?: { Currency?: string | null };
  };
  investment_data?: {
    investment_amount_m?: number | string;
    investment_amount?: number | string;
    currency?: string | { Currency?: string | null } | null;
    _currency?: { Currency?: string | null };
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
    counterparty_status?: string;
    _new_company?: {
      id?: number;
      name?: string;
      _is_that_investor?: boolean;
    };
  }>;
  advisors?: Array<{
    advisor_company?: {
      id?: number;
      name?: string;
    };
  }>;
  sectors?: {
    Primary?: string[];
    Secondary?: string[];
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

interface NewTargetEntity {
  id: number;
  name: string;
  page_type?: string;
  route?: string;
  path?: string;
}

interface NewCounterpartyMinimal {
  id: number;
  name: string;
  page_type?: string;
  route?: string;
  path?: string;
  entity_type?: string;
}

interface NewOtherCounterparty {
  id?: number;
  name?: string;
  page_type?: string;
  route?: string;
  path?: string;
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
  target_hq_country?: string | null;
  target_hq?: string | null;
  target_company?: {
    id?: number;
    name?: string;
    page_type?: string;
    route?: string;
    path?: string;
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
  buyers?: NewCounterpartyMinimal[];
  sellers?: NewCounterpartyMinimal[];
  investors?: NewCounterpartyMinimal[];
  buyers_investors?: NewCounterpartyMinimal[];
  other_counterparties?: NewOtherCounterparty[];
  advisors?: NewAdvisorMinimal[];
  advisors_names?: string[] | string;
  investment_data?: {
    investment_amount_m?: number | string;
    investment_amount?: number | string;
    currency?: string | { Currency?: string | null } | null;
    _currency?: { Currency?: string | null };
    Funding_stage?: string;
    funding_stage?: string;
  };
  investment_display?: string | null;
  ev_display?: string | null;
  ev_data?: {
    enterprise_value_m?: number | string;
    ev_band?: string;
    currency?: { Currency?: string | null } | null;
    _currency?: { Currency?: string | null };
  };
  sectors?: {
    Primary?: string[];
    Secondary?: string[];
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
  primarySectors?: Sector[];
  secondarySectors?: Sector[];
  maxInitialEvents?: number;
  truncateDescriptionLength?: number;
}

type LinkedEntity = {
  id?: number;
  name: string;
  href: string | null;
};

const headerCellStyle: React.CSSProperties = {
  padding: "12px",
  textAlign: "left",
  verticalAlign: "top",
  borderBottom: "2px solid #e2e8f0",
  backgroundColor: "#f9fafb",
  fontWeight: 600,
  color: "#1a202c",
  fontSize: "14px",
};

const bodyCellStyle: React.CSSProperties = {
  padding: "12px",
  verticalAlign: "top",
  borderBottom: "1px solid #e2e8f0",
  fontSize: "14px",
  color: "#1f2937",
  wordWrap: "break-word",
  overflowWrap: "break-word",
};

const linkStyle: React.CSSProperties = {
  color: "#0075df",
  textDecoration: "underline",
  cursor: "pointer",
  fontWeight: 500,
};

const mutedTextStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#4a5568",
};

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
  maxLength = 150
): string => {
  if (!description) return "Not available";
  return description.length > maxLength
    ? `${description.substring(0, maxLength)}...`
    : description;
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

const normalizeEntityHref = (args: {
  id?: number;
  route?: string;
  page_type?: string;
  path?: string;
  isInvestorHint?: boolean;
}): string | null => {
  const { id, route, page_type, path, isInvestorHint } = args;
  if (typeof path === "string" && path.trim().startsWith("/")) return path.trim();
  if (typeof id !== "number") return null;

  const routeValue = String(route ?? "").trim().toLowerCase();
  if (routeValue === "investor" || routeValue === "investors") {
    return `/investors/${id}`;
  }
  if (routeValue === "company") return `/company/${id}`;

  const pageTypeValue = String(page_type ?? "").trim().toLowerCase();
  if (pageTypeValue === "investor" || pageTypeValue === "investors") {
    return `/investors/${id}`;
  }
  if (pageTypeValue === "company") return `/company/${id}`;

  return isInvestorHint ? `/investors/${id}` : `/company/${id}`;
};

const renderLinkedNames = (items: LinkedEntity[]) =>
  items.map((item, idx) => (
    <span key={`${item.id ?? item.name}-${idx}`}>
      {item.href ? (
        <a href={item.href} style={linkStyle}>
          {item.name}
        </a>
      ) : (
        <span>{item.name}</span>
      )}
      {idx < items.length - 1 && ", "}
    </span>
  ));

const renderSectorLine = (
  label: string,
  sectors: string[],
  color: string,
  sectorIdsByName: Map<string, number>,
  hrefPrefix: string
) => {
  if (sectors.length === 0) return null;
  return (
    <div style={{ fontSize: "12px", lineHeight: 1.5 }}>
      <span style={{ fontWeight: 700, color: "#475569" }}>{label}: </span>
      {sectors.map((sector, idx) => {
        const sectorId = sectorIdsByName.get(sector.trim().toLowerCase());
        return (
          <React.Fragment key={`${label}-${sector}-${idx}`}>
            {sectorId ? (
              <a href={`${hrefPrefix}/${sectorId}`} style={{ ...linkStyle, color }}>
                {sector}
              </a>
            ) : (
              <span style={{ color, fontWeight: 500, textDecoration: "underline" }}>
                {sector}
              </span>
            )}
            {idx < sectors.length - 1 && ", "}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export function CorporateEventsTable({
  events,
  loading = false,
  onEventClick,
  onAdvisorClick,
  showSectors = false,
  primarySectors: primarySectorOptions = [],
  secondarySectors: secondarySectorOptions = [],
  maxInitialEvents = 3,
  truncateDescriptionLength = 180,
}: CorporateEventsTableProps) {
  const router = useRouter();
  const [showAllEvents, setShowAllEvents] = useState(false);

  const displayedEvents = showAllEvents
    ? events
    : events.slice(0, maxInitialEvents);

  const primarySectorIdsByName = new Map(
    primarySectorOptions
      .filter(
        (sector): sector is Sector & { sector_id: number; sector_name: string } =>
          typeof sector.sector_id === "number" &&
          typeof sector.sector_name === "string" &&
          sector.sector_name.trim().length > 0
      )
      .map((sector) => [sector.sector_name.trim().toLowerCase(), sector.sector_id])
  );

  const secondarySectorIdsByName = new Map(
    secondarySectorOptions
      .filter(
        (sector): sector is Sector & { sector_id: number; sector_name: string } =>
          typeof sector.sector_id === "number" &&
          typeof sector.sector_name === "string" &&
          sector.sector_name.trim().length > 0
      )
      .map((sector) => [sector.sector_name.trim().toLowerCase(), sector.sector_id])
  );

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

  if (!events.length) {
    return (
      <div style={{ color: "#6b7280", fontSize: "14px" }}>
        No corporate events available
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          overflowX: "auto",
          background: "#fff",
          borderRadius: "16px",
          boxShadow: "0px 1px 3px 0px rgba(227, 228, 230, 1)",
        }}
      >
        <table
          style={{
            width: "100%",
            minWidth: showSectors ? "1280px" : "980px",
            background: "#fff",
            borderCollapse: "collapse",
            fontSize: "14px",
            tableLayout: "fixed",
          }}
        >
          <thead>
            <tr>
              <th style={{ ...headerCellStyle, width: showSectors ? "31%" : "36%" }}>
                Event Details
              </th>
              <th style={{ ...headerCellStyle, width: showSectors ? "33%" : "40%" }}>
                Parties
              </th>
              <th style={{ ...headerCellStyle, width: showSectors ? "16%" : "24%" }}>
                Deal Details
              </th>
              <th style={{ ...headerCellStyle, width: showSectors ? "10%" : "16%" }}>
                Advisor(s)
              </th>
              {showSectors && (
                <th style={{ ...headerCellStyle, width: "10%" }}>
                  Sectors
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {displayedEvents.map((event, index) => {
              const newEvent = event as NewCorporateEvent;
              const legacyEvent = event as LegacyCorporateEvent;
              const isPartnership = /partnership/i.test(
                newEvent.deal_type || legacyEvent.deal_type || ""
              );

              const targets = newEvent.targets;
              const legacyTarget =
                newEvent.target_counterparty?.new_company ||
                newEvent.target_counterparty?._new_company;
              const legacyTargetId =
                newEvent.target_counterparty?.new_company_counterparty;
              const targetCountry =
                (typeof newEvent.target_hq_country === "string" &&
                  newEvent.target_hq_country.trim()) ||
                (typeof newEvent.target_hq === "string" &&
                  newEvent.target_hq.trim()) ||
                legacyTarget?._location?.Country ||
                "Not Available";

              const newAdvisors = newEvent.advisors || [];
              const legacyAdvisors = legacyEvent["1"] || [];
              const advisorsNames = Array.isArray(newEvent.advisors_names)
                ? newEvent.advisors_names
                : typeof newEvent.advisors_names === "string"
                  ? [newEvent.advisors_names]
                  : [];
              const advisorList = [
                ...newAdvisors.map((advisor) => ({
                  id: advisor.advisor_company?.id || advisor._new_company?.id,
                  name:
                    advisor.advisor_company?.name ||
                    advisor._new_company?.name ||
                    "",
                })),
                ...legacyAdvisors.map((advisor) => ({
                  id: advisor._new_company?.id,
                  name: advisor._new_company?.name || "",
                })),
                ...advisorsNames.map((name) => ({
                  id: undefined,
                  name: typeof name === "string" ? name : "",
                })),
              ].filter((advisor) => Boolean(advisor.name));

              const anyEvent = event as {
                investment_data?: {
                  investment_amount_m?: number | string;
                  investment_amount?: number | string;
                  currency?: string | { Currency?: string | null } | null;
                  _currency?: { Currency?: string | null };
                  Funding_stage?: string;
                  funding_stage?: string;
                };
                ev_data?: {
                  enterprise_value_m?: number | string;
                  ev_band?: string;
                  currency?: { Currency?: string | null } | null;
                  _currency?: { Currency?: string | null };
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
                typeof anyEvent.investment_data?.currency === "string"
                  ? anyEvent.investment_data.currency
                  : anyEvent.investment_data?.currency?.Currency ??
                    anyEvent.investment_data?._currency?.Currency ??
                    undefined;

              const evDataRaw = legacyEvent.ev_data || newEvent.ev_data;
              const evMillions = sanitizeAmountValue(
                evDataRaw?.enterprise_value_m ?? null
              );
              const evCurrency: string | undefined =
                evDataRaw?._currency?.Currency ??
                evDataRaw?.currency?.Currency ??
                undefined;
              const hasEvNumeric =
                evMillions !== null &&
                typeof evCurrency === "string" &&
                evCurrency.trim().length > 0;
              const evDisplay = hasEvNumeric
                ? null
                : newEvent.ev_display || legacyEvent.ev_display || null;
              const evBandFallback = hasEvNumeric ? null : evDataRaw?.ev_band || null;

              const fundingStage = (
                anyEvent.investment_data?.Funding_stage ||
                anyEvent.investment_data?.funding_stage ||
                ""
              ).trim();

              const description =
                newEvent.description || legacyEvent.description || "";
              const truncatedDescription = truncateDescription(
                description,
                truncateDescriptionLength
              );

              const eventSectors = event.sectors;
              const primarySectors = (eventSectors?.Primary ?? []).filter(Boolean);
              const secondarySectors = (eventSectors?.Secondary ?? []).filter(Boolean);

              const buyers: LinkedEntity[] = [];
              const investors: LinkedEntity[] = [];
              const sellers: LinkedEntity[] = [];
              const dealTypeLower = String(dealType ?? "").toLowerCase();
              const isInvestmentDeal = dealTypeLower.includes("investment");

              if (Array.isArray(newEvent.other_counterparties)) {
                newEvent.other_counterparties.forEach((cp) => {
                  const status = String(cp.counterparty_status ?? "")
                    .toLowerCase()
                    .trim();
                  if (!status) return;

                  if (status.includes("acquirer") || status.includes("buyer")) {
                    if (cp.id && cp.name) {
                      buyers.push({
                        id: cp.id,
                        name: cp.name,
                        href: normalizeEntityHref({
                          id: cp.id,
                          route: cp.route,
                          page_type: cp.page_type,
                          path: cp.path,
                        }),
                      });
                    } else if (cp._new_company?.name && !cp._new_company._is_that_investor) {
                      buyers.push({
                        id: cp._new_company.id,
                        name: cp._new_company.name,
                        href: cp._new_company.id
                          ? `/company/${cp._new_company.id}`
                          : null,
                      });
                    }
                  }

                  if (status.includes("investor")) {
                    if (cp.id && cp.name) {
                      investors.push({
                        id: cp.id,
                        name: cp.name,
                        href: normalizeEntityHref({
                          id: cp.id,
                          route: cp.route,
                          page_type: cp.page_type,
                          path: cp.path,
                          isInvestorHint: true,
                        }),
                      });
                    } else if (cp._new_company?.name && cp._new_company._is_that_investor) {
                      investors.push({
                        id: cp._new_company.id,
                        name: cp._new_company.name,
                        href: cp._new_company.id
                          ? `/investors/${cp._new_company.id}`
                          : null,
                      });
                    }
                  }

                  if (status.includes("divestor") || status.includes("seller")) {
                    if (cp.id && cp.name) {
                      sellers.push({
                        id: cp.id,
                        name: cp.name,
                        href: normalizeEntityHref({
                          id: cp.id,
                          route: cp.route,
                          page_type: cp.page_type,
                          path: cp.path,
                        }),
                      });
                    } else if (cp._new_company?.name) {
                      sellers.push({
                        id: cp._new_company.id,
                        name: cp._new_company.name,
                        href: cp._new_company.id
                          ? cp._new_company._is_that_investor
                            ? `/investors/${cp._new_company.id}`
                            : `/company/${cp._new_company.id}`
                          : null,
                      });
                    }
                  }
                });
              }

              if (buyers.length === 0 && Array.isArray(newEvent.buyers)) {
                newEvent.buyers.forEach((buyer) => {
                  if (typeof buyer.id === "number" && buyer.name) {
                    buyers.push({
                      id: buyer.id,
                      name: buyer.name,
                      href: normalizeEntityHref({
                        id: buyer.id,
                        route: buyer.route,
                        page_type: buyer.page_type,
                        path: buyer.path,
                      }),
                    });
                  }
                });
              }

              if (
                buyers.length === 0 &&
                !isInvestmentDeal &&
                Array.isArray(newEvent.buyers_investors)
              ) {
                newEvent.buyers_investors.forEach((buyer) => {
                  if (
                    typeof buyer.id === "number" &&
                    buyer.name &&
                    buyer.page_type !== "investor"
                  ) {
                    buyers.push({
                      id: buyer.id,
                      name: buyer.name,
                      href: normalizeEntityHref({
                        id: buyer.id,
                        route: buyer.route,
                        page_type: buyer.page_type,
                        path: buyer.path,
                      }),
                    });
                  }
                });
              }

              if (buyers.length === 0) {
                (legacyEvent["0"] || [])
                  .filter(
                    (item) =>
                      item._new_company?.name && !item._new_company?._is_that_investor
                  )
                  .forEach((item) => {
                    buyers.push({
                      id: item._new_company?.id,
                      name: item._new_company?.name || "",
                      href: item._new_company?.id
                        ? `/company/${item._new_company.id}`
                        : null,
                    });
                  });
              }

              if (investors.length === 0 && Array.isArray(newEvent.investors)) {
                newEvent.investors.forEach((investor) => {
                  if (typeof investor.id === "number" && investor.name) {
                    investors.push({
                      id: investor.id,
                      name: investor.name,
                      href: normalizeEntityHref({
                        id: investor.id,
                        route: investor.route,
                        page_type: investor.page_type,
                        path: investor.path,
                        isInvestorHint: true,
                      }),
                    });
                  }
                });
              }

              if (investors.length === 0 && Array.isArray(newEvent.buyers_investors)) {
                newEvent.buyers_investors.forEach((investor) => {
                  if (
                    typeof investor.id === "number" &&
                    investor.name &&
                    (isInvestmentDeal || investor.page_type === "investor")
                  ) {
                    investors.push({
                      id: investor.id,
                      name: investor.name,
                      href: normalizeEntityHref({
                        id: investor.id,
                        route: investor.route,
                        page_type: investor.page_type,
                        path: investor.path,
                        isInvestorHint: true,
                      }),
                    });
                  }
                });
              }

              if (investors.length === 0) {
                (legacyEvent["0"] || [])
                  .filter(
                    (item) =>
                      item._new_company?.name && item._new_company?._is_that_investor
                  )
                  .forEach((item) => {
                    investors.push({
                      id: item._new_company?.id,
                      name: item._new_company?.name || "",
                      href: item._new_company?.id
                        ? `/investors/${item._new_company.id}`
                        : null,
                    });
                  });
              }

              if (sellers.length === 0 && Array.isArray(newEvent.sellers)) {
                newEvent.sellers.forEach((seller) => {
                  if (typeof seller.id === "number" && seller.name) {
                    sellers.push({
                      id: seller.id,
                      name: seller.name,
                      href: normalizeEntityHref({
                        id: seller.id,
                        route: seller.route,
                        page_type: seller.page_type,
                        path: seller.path,
                      }),
                    });
                  }
                });
              }

              return (
                <tr key={event.id || index}>
                  <td style={bodyCellStyle}>
                    <div style={{ fontSize: "13px", lineHeight: 1.45 }}>
                      <a
                        href={event.id ? `/corporate-event/${event.id}` : "#"}
                        style={{
                          ...linkStyle,
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
                    <div style={{ ...mutedTextStyle, marginTop: "6px" }}>
                      Date: {formatDate(newEvent.announcement_date || legacyEvent.announcement_date)}
                    </div>
                    <div style={mutedTextStyle}>Target HQ: {targetCountry}</div>
                  </td>

                  <td style={bodyCellStyle}>
                    <div style={{ marginBottom: "4px", fontSize: "13px", lineHeight: 1.45 }}>
                      <strong>
                        {newEvent.target_label || (isPartnership ? "Target(s)" : "Target")}:
                      </strong>{" "}
                      {Array.isArray(targets) && targets.length > 0 ? (
                        renderLinkedNames(
                          (isPartnership ? targets : targets.slice(0, 1)).map((target) => ({
                            id: target.id,
                            name: target.name,
                            href:
                              normalizeEntityHref({
                                id: target.id,
                                route: target.route,
                                page_type: target.page_type,
                                path: target.path,
                              }) ?? "#",
                          }))
                        )
                      ) : legacyTarget?.name && legacyTargetId ? (
                        <a href={`/company/${legacyTargetId}`} style={{ ...linkStyle, fontSize: "13px" }}>
                          {legacyTarget.name}
                        </a>
                      ) : newEvent.target_company?.name ? (
                        (() => {
                          const href = normalizeEntityHref({
                            id: newEvent.target_company?.id,
                            route: newEvent.target_company?.route,
                            page_type: newEvent.target_company?.page_type,
                            path: newEvent.target_company?.path,
                          });
                          return href ? (
                            <a href={href} style={{ ...linkStyle, fontSize: "13px" }}>
                              {newEvent.target_company?.name}
                            </a>
                          ) : (
                            <span>{newEvent.target_company?.name}</span>
                          );
                        })()
                      ) : (
                        "Not Available"
                      )}
                    </div>

                    {!isPartnership && buyers.length > 0 && (
                      <div style={{ marginBottom: "4px", fontSize: "13px", lineHeight: 1.45 }}>
                        <strong>Buyer(s):</strong> {renderLinkedNames(buyers)}
                      </div>
                    )}

                    {!isPartnership && investors.length > 0 && (
                      <div style={{ marginBottom: "4px", fontSize: "13px", lineHeight: 1.45 }}>
                        <strong>Investor(s):</strong> {renderLinkedNames(investors)}
                      </div>
                    )}

                    {!isPartnership && sellers.length > 0 && (
                      <div style={{ marginBottom: "4px", fontSize: "13px", lineHeight: 1.45 }}>
                        <strong>Seller(s):</strong> {renderLinkedNames(sellers)}
                      </div>
                    )}
                  </td>

                  <td style={{ ...bodyCellStyle, fontSize: "12px" }}>
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

                  <td style={{ ...bodyCellStyle, fontSize: "12px" }}>
                    <div style={{ ...mutedTextStyle, margin: 0 }}>
                      <strong>Advisor(s):</strong>{" "}
                      {advisorList.length > 0
                        ? advisorList.map((advisor, idx) => (
                            <span key={advisor.id ?? `${advisor.name}-${idx}`}>
                              <span
                                style={{ ...linkStyle, color: "#0075df" }}
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
                    </div>
                  </td>

                  {showSectors && (
                    <td style={{ ...bodyCellStyle, fontSize: "12px" }}>
                      {primarySectors.length === 0 && secondarySectors.length === 0 ? (
                        <div style={mutedTextStyle}>Not available</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          {renderSectorLine(
                            "Primary",
                            primarySectors,
                            "#1d4ed8",
                            primarySectorIdsByName,
                            "/sector"
                          )}
                          {renderSectorLine(
                            "Secondary",
                            secondarySectors,
                            "#0369a1",
                            secondarySectorIdsByName,
                            "/sub-sector"
                          )}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {events.length > maxInitialEvents && (
        <div style={{ textAlign: "center", marginTop: "16px" }}>
          <button
            type="button"
            onClick={() => setShowAllEvents((prev) => !prev)}
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
}
