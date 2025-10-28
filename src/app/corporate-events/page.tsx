"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { locationsService } from "@/lib/locationsService";
import {
  CorporateEvent,
  CorporateEventsResponse,
  CorporateEventsFilters,
} from "@/types/corporateEvents";
import { CSVExporter } from "@/utils/csvExport";
import { ExportLimitModal } from "@/components/ExportLimitModal";
import { checkExportLimit, EXPORT_LIMIT } from "@/utils/exportLimitCheck";
// import { useRightClick } from "@/hooks/useRightClick";

// Types for API integration
interface Country {
  locations_Country: string;
}

interface Province {
  State__Province__County: string;
}

interface City {
  City: string;
}

interface PrimarySector {
  id: number;
  sector_name: string;
}

interface SecondarySector {
  id: number;
  sector_name: string;
}

// Removed unused interfaces since we're using hardcoded options

// Shared styles object
const styles = {
  container: {
    backgroundColor: "#f9fafb",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  maxWidth: {
    padding: "16px",
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: "12px",
  },
  card: {
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    padding: "16px",
    marginBottom: "0",
  },
  heading: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#1a202c",
    marginBottom: "4px",
    marginTop: "0px",
  },
  subHeading: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#1a202c",
    marginBottom: "8px",
  },
  searchDiv: {
    display: "flex" as const,
    flexDirection: "column" as const,
  },
  input: {
    width: "100%",
    maxWidth: "300px",
    padding: "8px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    fontSize: "14px",
    color: "#4a5568",
    outline: "none",
    marginBottom: "8px",
  },
  button: {
    width: "100%",
    maxWidth: "300px",
    backgroundColor: "#0075df",
    color: "white",
    fontWeight: "600",
    padding: "8px 12px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    marginTop: "4px",
  },
  linkButton: {
    color: "#000",
    fontWeight: "400",
    textDecoration: "underline",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
    marginTop: "16px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "16px 40px",
    marginBottom: "20px",
    alignItems: "start" as const,
  },
  gridItem: {
    display: "flex" as const,
    flexDirection: "column" as const,
  },
  label: {
    color: "#00050B",
    fontWeight: "600",
    fontSize: "16px",
    marginBottom: "8px",
    marginTop: "14px",
  },
  select: {
    width: "100%",
    padding: "13px 14px",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    fontSize: "16px",
    color: "#718096",
    outline: "none",
    marginBottom: "0px",
    appearance: "none" as const,
    background:
      "white url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%234a5568' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E\") no-repeat right 12px center",
    cursor: "pointer",
  },
};

// Generate pagination buttons (similar to advisors page)
const generatePaginationButtons = (
  pagination: {
    curPage: number;
    pageTotal: number;
    prevPage: number | null;
    nextPage: number | null;
  },
  handlePageChange: (page: number) => void
) => {
  const buttons = [];
  const currentPage = pagination.curPage;
  const totalPages = pagination.pageTotal;

  // Previous button
  buttons.push(
    <button
      key="prev"
      className="pagination-button"
      onClick={() => handlePageChange(currentPage - 1)}
      disabled={!pagination.prevPage}
    >
      &lt;
    </button>
  );

  // Page numbers
  if (totalPages <= 7) {
    // Show all pages if total is 7 or less
    for (let i = 1; i <= totalPages; i++) {
      buttons.push(
        <button
          key={i}
          className={`pagination-button ${i === currentPage ? "active" : ""}`}
          onClick={() => handlePageChange(i)}
        >
          {i.toString()}
        </button>
      );
    }
  } else {
    // Show first page
    buttons.push(
      <button
        key={1}
        className={`pagination-button ${currentPage === 1 ? "active" : ""}`}
        onClick={() => handlePageChange(1)}
      >
        1
      </button>
    );

    // Show second page if not first
    if (currentPage > 2) {
      buttons.push(
        <button
          key={2}
          className="pagination-button"
          onClick={() => handlePageChange(2)}
        >
          2
        </button>
      );
    }

    // Show ellipsis if needed
    if (currentPage > 3) {
      buttons.push(
        <span key="ellipsis1" className="pagination-ellipsis">
          ...
        </span>
      );
    }

    // Show current page and neighbors
    for (
      let i = Math.max(3, currentPage - 1);
      i <= Math.min(totalPages - 2, currentPage + 1);
      i++
    ) {
      if (i > 2 && i < totalPages - 1) {
        buttons.push(
          <button
            key={i}
            className={`pagination-button ${i === currentPage ? "active" : ""}`}
            onClick={() => handlePageChange(i)}
          >
            {i.toString()}
          </button>
        );
      }
    }

    // Show ellipsis if needed
    if (currentPage < totalPages - 2) {
      buttons.push(
        <span key="ellipsis2" className="pagination-ellipsis">
          ...
        </span>
      );
    }

    // Show second to last page if not last
    if (currentPage < totalPages - 1) {
      buttons.push(
        <button
          key={totalPages - 1}
          className="pagination-button"
          onClick={() => handlePageChange(totalPages - 1)}
        >
          {(totalPages - 1).toString()}
        </button>
      );
    }

    // Show last page
    buttons.push(
      <button
        key={totalPages}
        className={`pagination-button ${
          currentPage === totalPages ? "active" : ""
        }`}
        onClick={() => handlePageChange(totalPages)}
      >
        {totalPages.toString()}
      </button>
    );
  }

  // Next button
  buttons.push(
    <button
      key="next"
      className="pagination-button"
      onClick={() => handlePageChange(currentPage + 1)}
      disabled={!pagination.nextPage}
    >
      &gt;
    </button>
  );

  return buttons;
};

// Corporate Events Table Component
const CorporateEventsTable = ({
  events,
  loading,
}: {
  events: CorporateEvent[];
  loading: boolean;
}) => {
  // Right-click handled via native anchors now

  // Corporate Event Card Component for mobile
  const CorporateEventCard = ({ event }: { event: CorporateEvent }) => {
    // Right-click handled via native anchors now
    const target =
      (
        event.target_counterparty as unknown as {
          new_company?: unknown;
          _new_company?: unknown;
        }
      )?.new_company ||
      (
        event.target_counterparty as unknown as {
          new_company?: unknown;
          _new_company?: unknown;
        }
      )?._new_company;
    const targetCounterpartyId = (
      event.target_counterparty as unknown as {
        new_company_counterparty?: number;
      }
    )?.new_company_counterparty;

    const formatDate = (dateString: string) => {
      if (!dateString) return "Not available";
      try {
        return new Date(dateString).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      } catch {
        return "Invalid date";
      }
    };

    const formatCurrency = (
      amount: string | undefined,
      currency: string | undefined
    ) => {
      if (!amount || !currency) return "Not available";
      const n = Number(amount);
      if (Number.isNaN(n)) return "Not available";
      return `${currency}${n.toLocaleString(undefined, {
        maximumFractionDigits: 3,
      })}m`;
    };

    return (
      <div className="corporate-event-card">
        <div className="corporate-event-card-header">
          <div style={{ flex: "1" }}>
            <a
              href={`/corporate-event/${event.id}`}
              className="corporate-event-card-title"
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
                window.location.href = `/corporate-event/${event.id}`;
              }}
            >
              {event.description || "N/A"}
            </a>
            <div className="corporate-event-card-date">
              {formatDate(event.announcement_date || "")}
            </div>
            <div className="corporate-event-card-date">
              Target HQ:{" "}
              {(target as unknown as { country?: string })?.country ||
                (target as unknown as { _location?: { Country?: string } })
                  ?._location?.Country ||
                "Not available"}
            </div>
          </div>
        </div>
        <div className="corporate-event-card-info">
          <div className="corporate-event-card-info-item">
            <span className="corporate-event-card-info-label">Target:</span>
            {target && targetCounterpartyId ? (
              <a
                href={`/company/${targetCounterpartyId}`}
                className="corporate-event-card-info-value-link"
              >
                {(target as unknown as { name?: string })?.name || "N/A"}
              </a>
            ) : (
              <span className="corporate-event-card-info-value">
                Not available
              </span>
            )}
          </div>
          <div className="corporate-event-card-info-item">
            <span className="corporate-event-card-info-label">Type:</span>
            {event.deal_type ? (
              <span className="pill pill-blue">{event.deal_type}</span>
            ) : (
              <span className="corporate-event-card-info-value">N/A</span>
            )}
          </div>
          <div className="corporate-event-card-info-item corporate-event-card-info-full-width">
            <span className="corporate-event-card-info-label">Investment:</span>
            <span
              className="corporate-event-card-info-value"
              style={{ textAlign: "right" }}
            >
              {formatCurrency(
                event.investment_data?.investment_amount_m,
                event.investment_data?.currency?.Currency
              )}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Build a mapping once from API for secondary->primary names
  const [secondaryToPrimaryMap, setSecondaryToPrimaryMap] = useState<
    Record<string, string>
  >({});
  const [primaryNameToId, setPrimaryNameToId] = useState<
    Record<string, number>
  >({});
  const [secondaryNameToId, setSecondaryNameToId] = useState<
    Record<string, number>
  >({});
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const allSecondary =
          await locationsService.getAllSecondarySectorsWithPrimary();
        if (!cancelled && Array.isArray(allSecondary)) {
          const map: Record<string, string> = {};
          const secIdMap: Record<string, number> = {};
          const primIdMap: Record<string, number> = {};
          for (const sec of allSecondary) {
            const secName = (sec as { sector_name?: string }).sector_name;
            const secId = (sec as { id?: number }).id;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const primary = (sec as any)?.related_primary_sector as
              | { sector_name?: string }
              | undefined;
            const primaryName = primary?.sector_name;
            const primaryId = (primary as { id?: number } | undefined)?.id;
            if (secName && primaryName)
              map[normalizeSectorName(secName)] = primaryName;
            if (secName && typeof secId === "number")
              secIdMap[normalizeSectorName(secName)] = secId;
            if (primaryName && typeof primaryId === "number")
              primIdMap[normalizeSectorName(primaryName)] = primaryId;
          }
          setSecondaryToPrimaryMap(map);
          setSecondaryNameToId(secIdMap);
          setPrimaryNameToId((prev) => ({ ...prev, ...primIdMap }));
        }
      } catch (e) {
        console.warn("[Corporate Events] Failed to load sectors mapping", e);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load full list of primary sectors for robust name->id linking
  useEffect(() => {
    let cancelled = false;
    const loadPrimary = async () => {
      try {
        const primaries = await locationsService.getPrimarySectors();
        if (!cancelled && Array.isArray(primaries)) {
          const map: Record<string, number> = {};
          for (const p of primaries) {
            const name = (p as { sector_name?: string }).sector_name;
            const id = (p as { id?: number }).id;
            if (name && typeof id === "number") {
              map[normalizeSectorName(name)] = id;
            }
          }
          setPrimaryNameToId((prev) => ({ ...map, ...prev }));
        }
      } catch {
        // ignore, linking will gracefully degrade
      }
    };
    loadPrimary();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="loading">Loading corporate events...</div>;
  }

  if (!events || events.length === 0) {
    return <div className="loading">No corporate events found.</div>;
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not available";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  const formatCurrency = (
    amount: string | undefined,
    currency: string | undefined
  ) => {
    if (!amount || !currency) return "Not available";
    const n = Number(amount);
    if (Number.isNaN(n)) return "Not available";
    return `${currency}${n.toLocaleString(undefined, {
      maximumFractionDigits: 3,
    })}m`;
  };

  // legacy helper retained for clarity; currently superseded by deriveSecondaryFromCompany

  // Sector name normalization and fallback map for reliability (e.g., Crypto -> Web 3)
  const normalizeSectorName = (name: string | undefined | null): string =>
    (name || "").trim().toLowerCase();
  const FALLBACK_SECONDARY_TO_PRIMARY: Record<string, string> = {
    [normalizeSectorName("Crypto")]: "Web 3",
    [normalizeSectorName("Blockchain")]: "Web 3",
    [normalizeSectorName("DeFi")]: "Web 3",
    [normalizeSectorName("NFT")]: "Web 3",
    [normalizeSectorName("Web3")]: "Web 3",
    [normalizeSectorName("PropTech")]: "Real Estate",
  };

  const computeRelatedPrimary = (
    secondarySectors: Array<string | { sector_name: string }> | undefined
  ): string => {
    if (!secondarySectors || secondarySectors.length === 0)
      return "Not available";
    const names = secondarySectors
      .map((s) => (typeof s === "string" ? s : s.sector_name))
      .filter(Boolean) as string[];
    const related = names
      .map(
        (name) =>
          secondaryToPrimaryMap[normalizeSectorName(name)] ||
          FALLBACK_SECONDARY_TO_PRIMARY[normalizeSectorName(name)] ||
          name
      )
      .filter((v, i, a) => a.indexOf(v) === i);
    return related.length > 0 ? related.join(", ") : "Not available";
  };

  // Derive Primary sectors: prefer new `primary_sectors` (string[] or {sector_name}[]),
  // fallback to legacy `_sectors_primary`, else compute from `secondary_sectors` / `_sectors_secondary`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const derivePrimaryFromCompany = (company: any | undefined): string => {
    const primaryNew = company?.primary_sectors as
      | Array<string | { sector_name: string }>
      | undefined;
    if (Array.isArray(primaryNew) && primaryNew.length > 0) {
      const names = primaryNew
        .map((s) => (typeof s === "string" ? s : s.sector_name))
        .filter(Boolean) as string[];
      if (names.length > 0) return names.join(", ");
    }

    const primaryLegacy = company?._sectors_primary as
      | { sector_name: string }[]
      | undefined;
    if (Array.isArray(primaryLegacy) && primaryLegacy.length > 0) {
      return primaryLegacy.map((s) => s.sector_name).join(", ");
    }

    // Fallback: compute from secondary mapping (e.g., Crypto -> Web 3)
    const secondaryNew = company?.secondary_sectors as
      | Array<string | { sector_name: string }>
      | undefined;
    if (Array.isArray(secondaryNew) && secondaryNew.length > 0) {
      return computeRelatedPrimary(secondaryNew);
    }
    return computeRelatedPrimary(company?._sectors_secondary);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deriveSecondaryFromCompany = (company: any | undefined): string => {
    const secondaryNew = company?.secondary_sectors as
      | Array<string | { sector_name: string }>
      | undefined;
    if (Array.isArray(secondaryNew) && secondaryNew.length > 0) {
      const names = secondaryNew
        .map((s) => (typeof s === "string" ? s : s.sector_name))
        .filter(Boolean) as string[];
      if (names.length > 0) return names.join(", ");
    }

    const secondaryLegacy = company?._sectors_secondary as
      | { sector_name: string }[]
      | undefined;
    if (Array.isArray(secondaryLegacy) && secondaryLegacy.length > 0) {
      return secondaryLegacy.map((s) => s.sector_name).join(", ");
    }
    return "Not available";
  };

  return (
    <div>
      {/* Mobile Cards */}
      <div className="corporate-event-cards">
        {events.map((event, index) => (
          <CorporateEventCard key={event.id || index} event={event} />
        ))}
      </div>

      {/* Desktop Table - mirror Home dashboard layout, with dedicated Advisors column */}
      <table className="corporate-event-table">
        <thead>
          <tr>
            <th>Event Details</th>
            <th>Parties</th>
            <th>Deal Details</th>
            <th>Advisors</th>
            <th>Sectors</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event: CorporateEvent, index: number) => {
            const target =
              (
                event.target_counterparty as unknown as {
                  new_company?: unknown;
                  _new_company?: unknown;
                }
              )?.new_company ||
              (
                event.target_counterparty as unknown as {
                  new_company?: unknown;
                  _new_company?: unknown;
                }
              )?._new_company;
            const targetCounterpartyId = (
              event.target_counterparty as unknown as {
                new_company_counterparty?: number;
              }
            )?.new_company_counterparty;
            const targetName =
              (target as unknown as { name?: string })?.name || "Not Available";
            const targetHref = targetCounterpartyId
              ? `/company/${targetCounterpartyId}`
              : "";
            const targetCountry =
              (target as unknown as { country?: string })?.country ||
              (target as unknown as { _location?: { Country?: string } })
                ?._location?.Country ||
              "Not Available";
            const primaryText = derivePrimaryFromCompany(target);
            const secondaryText = deriveSecondaryFromCompany(target);
            return (
              <tr key={event.id || index}>
                {/* Event Details */}
                <td>
                  <div style={{ marginBottom: "6px" }}>
                    <a
                      href={`/corporate-event/${event.id}`}
                      className="corporate-event-name"
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
                        window.location.href = `/corporate-event/${event.id}`;
                      }}
                    >
                      {event.description || "Not Available"}
                    </a>
                  </div>
                  <div className="muted-row">
                    Date: {formatDate(event.announcement_date)}
                  </div>
                  <div className="muted-row">Target HQ: {targetCountry}</div>
                </td>
                {/* Parties */}
                <td>
                  <div className="muted-row">
                    <strong>Target:</strong>{" "}
                    {targetHref ? (
                      <a href={targetHref} className="link-blue">
                        {targetName}
                      </a>
                    ) : (
                      <span>{targetName}</span>
                    )}
                  </div>
                  <div className="muted-row">
                    <strong>Buyer(s) / Investor(s):</strong>{" "}
                    {Array.isArray(event.other_counterparties) &&
                    event.other_counterparties.length > 0
                      ? (() => {
                          const buyers = event.other_counterparties.filter(
                            (cp) => {
                              const status =
                                cp._counterparty_type?.counterparty_status ||
                                "";
                              return /investor|acquirer/i.test(status);
                            }
                          );
                          if (buyers.length === 0)
                            return <span>Not Available</span>;
                          return buyers.map((counterparty, subIndex) => {
                            const nc = counterparty._new_company as
                              | {
                                  id?: number;
                                  name: string;
                                  _is_that_investor?: boolean;
                                  _is_that_data_analytic_company?: boolean;
                                  _url?: string;
                                  _investor_profile_id?: number;
                                }
                              | undefined;
                            if (!nc) {
                              return (
                                <span key={subIndex}>
                                  Not Available
                                  {subIndex < buyers.length - 1 && ", "}
                                </span>
                              );
                            }
                            const name = nc.name;
                            let url = "";
                            const investorProfileId = nc._investor_profile_id;
                            const cpId =
                              (
                                counterparty as {
                                  new_company_counterparty?: number;
                                }
                              ).new_company_counterparty || nc.id;
                            if (nc._is_that_investor) {
                              url =
                                typeof investorProfileId === "number" &&
                                investorProfileId > 0
                                  ? `/investors/${investorProfileId}`
                                  : typeof cpId === "number"
                                  ? `/investors/${cpId}`
                                  : "";
                            } else if (nc._is_that_data_analytic_company) {
                              url =
                                typeof cpId === "number"
                                  ? `/company/${cpId}`
                                  : "";
                            } else if (typeof nc._url === "string" && nc._url) {
                              url = nc._url.replace(
                                /\/(?:investor)\//,
                                "/investors/"
                              );
                            }
                            return (
                              <span key={subIndex}>
                                {url ? (
                                  <a href={url} className="link-blue">
                                    {name}
                                  </a>
                                ) : (
                                  <span style={{ color: "#000" }}>{name}</span>
                                )}
                                {subIndex < buyers.length - 1 && ", "}
                              </span>
                            );
                          });
                        })()
                      : "Not Available"}
                  </div>
                  <div className="muted-row">
                    <strong>Seller(s):</strong>{" "}
                    {Array.isArray(event.other_counterparties) &&
                    event.other_counterparties.length > 0
                      ? (() => {
                          const sellers = event.other_counterparties.filter(
                            (cp) => {
                              const status =
                                cp._counterparty_type?.counterparty_status ||
                                "";
                              return /divestor|seller|vendor/i.test(status);
                            }
                          );
                          if (sellers.length === 0)
                            return <span>Not Available</span>;
                          return sellers.map((counterparty, subIndex) => {
                            const nc = counterparty._new_company as
                              | {
                                  id?: number;
                                  name: string;
                                  _is_that_investor?: boolean;
                                  _is_that_data_analytic_company?: boolean;
                                  _url?: string;
                                  _investor_profile_id?: number;
                                }
                              | undefined;
                            if (!nc) {
                              return (
                                <span key={subIndex}>
                                  Not Available
                                  {subIndex < sellers.length - 1 && ", "}
                                </span>
                              );
                            }
                            const name = nc.name;
                            let url = "";
                            const investorProfileId = nc._investor_profile_id;
                            const cpId =
                              (
                                counterparty as {
                                  new_company_counterparty?: number;
                                }
                              ).new_company_counterparty || nc.id;
                            if (nc._is_that_investor) {
                              url =
                                typeof investorProfileId === "number" &&
                                investorProfileId > 0
                                  ? `/investors/${investorProfileId}`
                                  : typeof cpId === "number"
                                  ? `/investors/${cpId}`
                                  : "";
                            } else if (nc._is_that_data_analytic_company) {
                              url =
                                typeof cpId === "number"
                                  ? `/company/${cpId}`
                                  : "";
                            } else if (typeof nc._url === "string" && nc._url) {
                              url = nc._url.replace(
                                /\/(?:investor)\//,
                                "/investors/"
                              );
                            }
                            return (
                              <span key={subIndex}>
                                {url ? (
                                  <a href={url} className="link-blue">
                                    {name}
                                  </a>
                                ) : (
                                  <span style={{ color: "#000" }}>{name}</span>
                                )}
                                {subIndex < sellers.length - 1 && ", "}
                              </span>
                            );
                          });
                        })()
                      : "Not Available"}
                  </div>
                </td>
                {/* Deal Details */}
                <td>
                  <div className="muted-row">
                    <strong>Investment Type:</strong>{" "}
                    {event.deal_type ? (
                      <span className="pill pill-blue">{event.deal_type}</span>
                    ) : (
                      <span>Not Available</span>
                    )}
                  </div>
                  <div className="muted-row">
                    <strong>Amount (m):</strong>{" "}
                    {formatCurrency(
                      event.investment_data?.investment_amount_m,
                      event.investment_data?.currency?.Currency
                    )}
                  </div>
                  <div className="muted-row">
                    <strong>EV (m):</strong>{" "}
                    {formatCurrency(
                      event.ev_data?.enterprise_value_m,
                      event.ev_data?.currency?.Currency
                    )}
                  </div>
                </td>
                {/* Advisors */}
                <td>
                  <div className="muted-row">
                    <strong>Advisors:</strong>{" "}
                    {Array.isArray(event.advisors) && event.advisors.length > 0
                      ? event.advisors.map((advisor, subIndex) => {
                          const nc = advisor._new_company as
                            | { id?: number; name?: string }
                            | undefined;
                          const name = (nc?.name || "Unknown").trim();
                          const id =
                            typeof nc?.id === "number" ? nc!.id : undefined;
                          return (
                            <span key={subIndex}>
                              {id ? (
                                <a
                                  href={`/advisor/${id}`}
                                  className="link-blue"
                                >
                                  {name}
                                </a>
                              ) : (
                                <span style={{ color: "#000" }}>{name}</span>
                              )}
                              {subIndex < event.advisors!.length - 1 && ", "}
                            </span>
                          );
                        })
                      : "Not Available"}
                  </div>
                </td>
                {/* Sectors */}
                <td>
                  <div className="muted-row">
                    <strong>Primary:</strong>{" "}
                    {(() => {
                      if (!primaryText || /not available/i.test(primaryText)) {
                        return primaryText || "Not available";
                      }
                      const names = primaryText
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);
                      if (names.length === 0) return primaryText;
                      const nodes: React.ReactNode[] = [];
                      names.forEach((name, idx) => {
                        const id = primaryNameToId[normalizeSectorName(name)];
                        if (typeof id === "number") {
                          nodes.push(
                            <a
                              key={`${name}-${id}`}
                              href={`/sector/${id}`}
                              className="link-blue"
                            >
                              {name}
                            </a>
                          );
                        } else {
                          nodes.push(<span key={`${name}-na`}>{name}</span>);
                        }
                        if (idx < names.length - 1)
                          nodes.push(<span key={`sep-${idx}`}>, </span>);
                      });
                      return nodes;
                    })()}
                  </div>
                  <div className="muted-row">
                    <strong>Secondary:</strong>{" "}
                    {(() => {
                      if (
                        !secondaryText ||
                        /not available/i.test(secondaryText)
                      ) {
                        return secondaryText || "Not available";
                      }
                      const names = secondaryText
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);
                      if (names.length === 0) return secondaryText;
                      const nodes: React.ReactNode[] = [];
                      names.forEach((name, idx) => {
                        const id = secondaryNameToId[normalizeSectorName(name)];
                        if (typeof id === "number") {
                          nodes.push(
                            <a
                              key={`${name}-${id}`}
                              href={`/sector/${id}`}
                              className="link-blue"
                            >
                              {name}
                            </a>
                          );
                        } else {
                          nodes.push(<span key={`${name}-na`}>{name}</span>);
                        }
                        if (idx < names.length - 1)
                          nodes.push(<span key={`sep2-${idx}`}>, </span>);
                      });
                      return nodes;
                    })()}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// Main Corporate Events Page Component
const CorporateEventsPage = () => {
  // State for filter visibility
  const [showFilters, setShowFilters] = useState(false);

  // State for filters
  const [filters, setFilters] = useState<CorporateEventsFilters>({
    Countries: [],
    Provinces: [],
    Cities: [],
    primary_sectors_ids: [],
    Secondary_sectors_ids: [],
    deal_types: [],
    Deal_Status: [],
    Date_start: null,
    Date_end: null,
    search_query: "",
    Page: 1,
    Per_page: 50,
  });

  // State for each filter (arrays for multi-select)
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedContinentalRegions, setSelectedContinentalRegions] = useState<
    string[]
  >([]);
  const [selectedSubRegions, setSelectedSubRegions] = useState<string[]>([]);
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedPrimarySectors, setSelectedPrimarySectors] = useState<
    number[]
  >([]);
  const [selectedSecondarySectors, setSelectedSecondarySectors] = useState<
    number[]
  >([]);
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [selectedDealStatuses, setSelectedDealStatuses] = useState<string[]>(
    []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  // State for API data
  const [countries, setCountries] = useState<Country[]>([]);
  const [continentalRegions, setContinentalRegions] = useState<string[]>([]);
  const [subRegions, setSubRegions] = useState<string[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [primarySectors, setPrimarySectors] = useState<PrimarySector[]>([]);
  const [secondarySectors, setSecondarySectors] = useState<SecondarySector[]>(
    []
  );
  // Removed eventTypes and dealStatuses state since we're using hardcoded options

  // Loading states
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingPrimarySectors, setLoadingPrimarySectors] = useState(false);
  const [loadingSecondarySectors, setLoadingSecondarySectors] = useState(false);
  // Removed loading states for event types and deal statuses since we're using hardcoded options

  // State for corporate events data
  const [corporateEvents, setCorporateEvents] = useState<CorporateEvent[]>([]);
  const [pagination, setPagination] = useState({
    itemsReceived: 0,
    curPage: 1,
    nextPage: null as number | null,
    prevPage: null as number | null,
    offset: 0,
    perPage: 50,
    pageTotal: 0,
  });
  const [summaryData, setSummaryData] = useState({
    acquisitions: 0,
    investments: 0,
    ipos: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExportLimitModal, setShowExportLimitModal] = useState(false);
  const [exportsLeft, setExportsLeft] = useState(0);

  // Convert API data to dropdown options format
  const countryOptions = countries.map((country) => ({
    value: country.locations_Country,
    label: country.locations_Country,
  }));

  const provinceOptions = provinces.map((province) => ({
    value: province.State__Province__County,
    label: province.State__Province__County,
  }));

  const cityOptions = cities.map((city) => ({
    value: city.City,
    label: city.City,
  }));

  const primarySectorOptions = primarySectors.map((sector) => ({
    value: sector.id,
    label: sector.sector_name,
  }));

  const secondarySectorOptions = secondarySectors.map((sector) => ({
    value: sector.id,
    label: sector.sector_name,
  }));

  // Hardcoded options for Deal Types (By Type)
  const eventTypeOptions = [
    { value: "Acquisition", label: "Acquisition" },
    { value: "Sale", label: "Sale" },
    { value: "IPO", label: "IPO" },
    { value: "MBO", label: "MBO" },
    { value: "Investment", label: "Investment" },
    { value: "Strategic Review", label: "Strategic Review" },
    { value: "Divestment", label: "Divestment" },
    { value: "Restructuring", label: "Restructuring" },
    { value: "Dual track", label: "Dual track" },
    { value: "Closing", label: "Closing" },
    { value: "Grant", label: "Grant" },
    { value: "Debt financing", label: "Debt financing" },
    { value: "Partnership", label: "Partnership" },
  ];

  // Hardcoded options for Deal Status
  const dealStatusOptions = [
    { value: "Completed", label: "Completed" },
    { value: "In Market", label: "In Market" },
    { value: "Not yet launched", label: "Not yet launched" },
    { value: "Strategic Review", label: "Strategic Review" },
    { value: "Deal Prep", label: "Deal Prep" },
    { value: "In Exclusivity", label: "In Exclusivity" },
  ];

  // Fetch functions
  const fetchCountries = async () => {
    try {
      setLoadingCountries(true);
      const countriesData = await locationsService.getCountries();
      setCountries(countriesData);
    } catch (error) {
      console.error("Error fetching countries:", error);
    } finally {
      setLoadingCountries(false);
    }
  };

  const fetchContinentalRegions = async () => {
    try {
      const list = await locationsService.getContinentalRegions();
      if (Array.isArray(list)) setContinentalRegions(list);
    } catch {
      // silent fail
    }
  };

  const fetchSubRegions = async () => {
    try {
      const list = await locationsService.getSubRegions();
      if (Array.isArray(list)) setSubRegions(list);
    } catch {
      // silent fail
    }
  };

  const fetchPrimarySectors = async () => {
    try {
      setLoadingPrimarySectors(true);
      const sectorsData = await locationsService.getPrimarySectors();
      setPrimarySectors(sectorsData);
    } catch (error) {
      console.error("Error fetching primary sectors:", error);
    } finally {
      setLoadingPrimarySectors(false);
    }
  };

  // Removed fetchEventTypes and fetchDealStatuses functions since we're using hardcoded options

  const fetchProvinces = async () => {
    if (selectedCountries.length === 0) {
      setProvinces([]);
      return;
    }
    try {
      setLoadingProvinces(true);
      const provincesData = await locationsService.getProvinces(
        selectedCountries
      );
      setProvinces(provincesData);
    } catch (error) {
      console.error("Error fetching provinces:", error);
    } finally {
      setLoadingProvinces(false);
    }
  };

  const fetchCities = async () => {
    if (selectedCountries.length === 0 || selectedProvinces.length === 0) {
      setCities([]);
      return;
    }
    try {
      setLoadingCities(true);
      const citiesData = await locationsService.getCities(
        selectedCountries,
        selectedProvinces
      );
      setCities(citiesData);
    } catch (error) {
      console.error("Error fetching cities:", error);
    } finally {
      setLoadingCities(false);
    }
  };

  const fetchSecondarySectors = async () => {
    if (selectedPrimarySectors.length === 0) {
      setSecondarySectors([]);
      return;
    }
    try {
      setLoadingSecondarySectors(true);
      const sectorsData = await locationsService.getSecondarySectors(
        selectedPrimarySectors
      );
      setSecondarySectors(sectorsData);
    } catch (error) {
      console.error("Error fetching secondary sectors:", error);
    } finally {
      setLoadingSecondarySectors(false);
    }
  };

  const fetchCorporateEvents = async (filters: CorporateEventsFilters) => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("asymmetrix_auth_token");
      if (!token) {
        setError("Authentication required");
        return;
      }

      // Convert filters to URL parameters for GET request
      const params = new URLSearchParams();

      // Add page and per_page
      params.append("Page", filters.Page.toString());
      params.append("Per_page", filters.Per_page.toString());

      // Add search query
      if (filters.search_query)
        params.append("search_query", filters.search_query);

      // Add location filters as comma-separated values
      if (filters.Countries.length > 0) {
        params.append("Countries", filters.Countries.join(","));
      }

      if (filters.Provinces.length > 0) {
        params.append("Provinces", filters.Provinces.join(","));
      }

      if (filters.Cities.length > 0) {
        params.append("Cities", filters.Cities.join(","));
      }

      // Add region grouping filters (optional)
      if (
        (filters as Partial<CorporateEventsFilters>).continentalRegions &&
        (filters as Partial<CorporateEventsFilters>).continentalRegions!
          .length > 0
      ) {
        params.append(
          "Continental_Region",
          (filters as Partial<CorporateEventsFilters>).continentalRegions!.join(
            ","
          )
        );
      }
      if (
        (filters as Partial<CorporateEventsFilters>).subRegions &&
        (filters as Partial<CorporateEventsFilters>).subRegions!.length > 0
      ) {
        params.append(
          "geographical_sub_region",
          (filters as Partial<CorporateEventsFilters>).subRegions!.join(",")
        );
      }

      // Add sector filters as array params (API expects bracketed keys)
      if (filters.primary_sectors_ids.length > 0) {
        filters.primary_sectors_ids.forEach((id) => {
          params.append("primary_sectors_ids[]", id.toString());
        });
      }

      if (filters.Secondary_sectors_ids.length > 0) {
        filters.Secondary_sectors_ids.forEach((id) => {
          params.append("Secondary_sectors_ids[]", id.toString());
        });
      }

      // Add event types as comma-separated values
      if (filters.deal_types.length > 0) {
        params.append("deal_types", filters.deal_types.join(","));
      }

      // Add deal statuses as comma-separated values
      if (filters.Deal_Status.length > 0) {
        params.append("Deal_Status", filters.Deal_Status.join(","));
      }

      // Add date filters
      if (filters.Date_start) {
        params.append("Date_start", filters.Date_start);
      }

      if (filters.Date_end) {
        params.append("Date_end", filters.Date_end);
      }

      const url = `https://xdil-abvj-o7rq.e2.xano.io/api:617tZc8l/get_all_corporate_events?${params.toString()}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: CorporateEventsResponse = await response.json();

      setCorporateEvents(data.items);
      setPagination({
        itemsReceived: data.itemsReceived,
        curPage: data.curPage,
        nextPage: data.nextPage,
        prevPage: data.prevPage,
        offset: data.offset,
        perPage: filters.Per_page,
        pageTotal: data.pageTotal,
      });
      setSummaryData({
        acquisitions: data.acquisitions,
        investments: data.investments,
        ipos: data.ipos,
      });
    } catch (error) {
      console.error("Error fetching corporate events:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch corporate events"
      );
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchCountries();
    fetchContinentalRegions();
    fetchSubRegions();
    fetchPrimarySectors();
    // Initial fetch of all corporate events
    fetchCorporateEvents(filters);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch provinces when countries change
  useEffect(() => {
    fetchProvinces();
  }, [selectedCountries]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch cities when provinces change
  useEffect(() => {
    fetchCities();
  }, [selectedProvinces]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch secondary sectors when primary sectors are selected
  useEffect(() => {
    fetchSecondarySectors();
  }, [selectedPrimarySectors]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle search
  const handleSearch = () => {
    const updatedFilters = {
      ...filters,
      search_query: searchTerm,
      Countries: selectedCountries,
      continentalRegions: selectedContinentalRegions,
      subRegions: selectedSubRegions,
      Provinces: selectedProvinces,
      Cities: selectedCities,
      primary_sectors_ids: selectedPrimarySectors,
      Secondary_sectors_ids: selectedSecondarySectors,
      deal_types: selectedEventTypes,
      Deal_Status: selectedDealStatuses,
      Date_start: dateStart || null,
      Date_end: dateEnd || null,
      Page: 1, // Reset to first page when searching
    };
    setFilters(updatedFilters);
    fetchCorporateEvents(updatedFilters);
  };

  // Check if any filters are applied
  const hasActiveFilters = () => {
    return (
      selectedCountries.length > 0 ||
      selectedContinentalRegions.length > 0 ||
      selectedSubRegions.length > 0 ||
      selectedProvinces.length > 0 ||
      selectedCities.length > 0 ||
      selectedPrimarySectors.length > 0 ||
      selectedSecondarySectors.length > 0 ||
      selectedEventTypes.length > 0 ||
      selectedDealStatuses.length > 0 ||
      searchTerm.trim() !== "" ||
      dateStart !== "" ||
      dateEnd !== ""
    );
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    const updatedFilters = { ...filters, Page: page };
    setFilters(updatedFilters);
    fetchCorporateEvents(updatedFilters);
  };

  // Removed hasActiveFilters; export button now shows when results exist

  // Handle CSV export
  const handleExportCSV = async () => {
    if (corporateEvents.length > 0) {
      // Check export limit first
      const limitCheck = await checkExportLimit();
      if (!limitCheck.canExport) {
        setExportsLeft(limitCheck.exportsLeft);
        setShowExportLimitModal(true);
        return;
      }

      CSVExporter.exportCorporateEvents(
        corporateEvents,
        "corporate_events_filtered"
      );
    }
  };

  const style = `
    .corporate-event-section { padding: 16px 24px; border-radius: 8px; }
    .corporate-event-stats { background: #fff; padding: 12px 16px; box-shadow: 0px 1px 3px 0px rgba(227, 228, 230, 1); border-radius: 16px; margin-bottom: 16px; }
    .stats-title { font-size: 22px; font-weight: 700; color: #1a202c; margin: 0 0 16px 0; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px 24px;
    }
    .stats-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .stats-label {
      font-size: 14px;
      color: #4a5568;
      font-weight: 500;
      line-height: 1.4;
    }
    .stats-value {
      font-size: 20px;
      color: #000;
      font-weight: 700;
    }
    .corporate-event-table { width: 100%; background: #fff; padding: 20px 24px; box-shadow: 0px 1px 3px 0px rgba(227, 228, 230, 1); border-radius: 16px; border-collapse: collapse; table-layout: fixed; }
    .corporate-event-table th, .corporate-event-table td { padding: 12px; text-align: left; vertical-align: top; border-bottom: 1px solid #e2e8f0; word-wrap: break-word; overflow-wrap: break-word; }
    .corporate-event-table th:nth-child(1) { width: 24%; }
    .corporate-event-table th:nth-child(2) { width: 22%; }
    .corporate-event-table th:nth-child(3) { width: 18%; }
    .corporate-event-table th:nth-child(4) { width: 18%; }
    .corporate-event-table th:nth-child(5) { width: 18%; }
    .corporate-event-table th {
      font-weight: 600;
      color: #1a202c;
      font-size: 14px;
      background: #f9fafb;
      border-bottom: 2px solid #e2e8f0;
    }
    .corporate-event-table td {
      font-size: 14px;
      color: #000;
      line-height: 1.5;
    }
    .corporate-event-name { color: #0075df; text-decoration: underline; cursor: pointer; font-weight: 500; transition: color 0.2s; }
    .link-blue { color: #0075df; text-decoration: underline; cursor: pointer; font-weight: 500; }
    .link-blue:hover { color: #005bb5; }
    .corporate-event-name:hover {
      color: #005bb5;
    }
    .muted-row { font-size: 12px; color: #4a5568; margin: 4px 0; }
    .pill { display: inline-block; padding: 2px 8px; font-size: 12px; border-radius: 999px; font-weight: 600; }
    .pill-blue { background-color: #e6f0ff; color: #1d4ed8; }
    .loading { text-align: center; padding: 40px; color: #666; }
    .error { text-align: center; padding: 20px; color: #e53e3e; background-color: #fed7d7; border-radius: 6px; margin-bottom: 16px; }
    .pagination { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 24px; padding: 16px; }
    .pagination-button { padding: 8px 12px; border: none; background: none; color: #000; cursor: pointer; font-size: 14px; font-weight: 400; transition: color 0.2s; text-decoration: none; }
    .pagination-button:hover {
      color: #0075df;
    }
    .pagination-button.active {
      color: #0075df;
      text-decoration: underline;
      font-weight: 500;
    }
    .pagination-button:disabled {
      opacity: 0.3;
      cursor: not-allowed;
      color: #666;
    }
    .pagination-ellipsis {
      padding: 8px 12px;
      color: #000;
      font-size: 14px;
    }
    .corporate-event-cards { display: none; }
    .corporate-event-card { background-color: white; border-radius: 8px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; }
    .corporate-event-card-header { display: flex; align-items: center; margin-bottom: 12px; gap: 12px; }
    .corporate-event-card-title { font-size: 16px; font-weight: 600; color: #0075df; text-decoration: underline; cursor: pointer; margin-bottom: 4px; line-height: 1.4; }
    .corporate-event-card-date { font-size: 14px; color: #4a5568; }
    .corporate-event-card-info { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; }
    .corporate-event-card-info-item { display: flex; justify-content: space-between; padding: 4px 0; }
    .corporate-event-card-info-label { color: #4a5568; }
    .corporate-event-card-info-value { font-weight: 600; max-width: 60%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .corporate-event-card-info-value-link { font-weight: 600; color: #0075df; text-decoration: underline; cursor: pointer; max-width: 60%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .corporate-event-card-info-full-width { grid-column: 1 / -1; }
    .search-row { display: flex; align-items: center; gap: 12px; }
    .search-row .filters-input { margin: 0; max-width: 340px; }
    .search-row .filters-button { margin: 0; max-width: 140px; }
    .export-button { 
      background-color: #22c55e; 
      color: white; 
      font-weight: 600; 
      padding: 12px 24px; 
      border-radius: 8px; 
      border: none; 
      cursor: pointer; 
      margin: 16px 0; 
      font-size: 14px;
      transition: background-color 0.2s;
    }
    .export-button:hover { 
      background-color: #16a34a; 
    }
    .export-button:disabled {
      background-color: #9ca3af;
      cursor: not-allowed;
    }
    @media (max-width: 768px) {
      .corporate-event-table {
        display: none !important;
      }
      .corporate-event-cards {
        display: block !important;
        padding: 8px !important;
      }
      .corporate-event-card {
        padding: 12px !important;
        margin-bottom: 8px !important;
      }
      .corporate-event-card-title {
        font-size: 15px !important;
        line-height: 1.3 !important;
      }
      .corporate-event-card-date {
        font-size: 13px !important;
      }
      .corporate-event-card-info {
        gap: 6px !important;
        font-size: 11px !important;
      }
      .corporate-event-card-info-item {
        padding: 3px 0 !important;
      }
      .corporate-event-card-info-value,
      .corporate-event-card-info-value-link {
        max-width: 55% !important;
        font-size: 11px !important;
      }
      .pagination {
        flex-wrap: wrap !important;
        gap: 8px !important;
        padding: 16px 8px !important;
      }
      .pagination-button {
        padding: 8px 10px !important;
        font-size: 13px !important;
        min-width: 32px !important;
        text-align: center !important;
      }
      .pagination-ellipsis {
        padding: 8px 6px !important;
        font-size: 13px !important;
      }
      .corporate-event-section { padding: 12px 8px !important; }
      .corporate-event-stats { padding: 12px 12px !important; }
      .stats-title {
        font-size: 18px !important;
        margin-bottom: 12px !important;
      }
      .stats-grid {
        grid-template-columns: 1fr !important;
        gap: 12px !important;
      }
      .stats-item { padding: 6px 0 !important; }
      .stats-label {
        font-size: 12px !important;
      }
      .stats-value {
        font-size: 14px !important;
      }
      .filters-grid {
        display: grid !important;
        grid-template-columns: 1fr !important;
        gap: 16px !important;
      }
      .filters-card { padding: 16px 16px !important; }
      .filters-heading {
        font-size: 20px !important;
        margin-bottom: 16px !important;
      }
      .filters-sub-heading {
        font-size: 16px !important;
        margin-bottom: 8px !important;
      }
      .filters-input {
        max-width: 100% !important;
      }
      .filters-button {
        max-width: 100% !important;
      }
    }
    @media (min-width: 769px) {
      .corporate-event-cards {
        display: none !important;
      }
      .corporate-event-table {
        display: table !important;
      }
    }
  `;

  return (
    <div className="min-h-screen">
      <Header />

      {/* Filters Section */}
      <div style={styles.container}>
        <div style={styles.maxWidth}>
          <div
            style={{
              ...styles.card,
              ...(showFilters ? {} : { padding: "12px 16px" }),
            }}
            className="filters-card"
          >
            {showFilters && (
              <h2 style={styles.heading} className="filters-heading">
                Filters
              </h2>
            )}

            {showFilters && (
              <div style={styles.grid} className="filters-grid">
                <div style={styles.gridItem}>
                  <h3 style={styles.subHeading} className="filters-sub-heading">
                    Corporate Event Type
                  </h3>
                  <span style={styles.label}>By Type</span>
                  <SearchableSelect
                    options={eventTypeOptions}
                    value=""
                    onChange={(value) => {
                      if (
                        typeof value === "string" &&
                        value &&
                        !selectedEventTypes.includes(value)
                      ) {
                        setSelectedEventTypes([...selectedEventTypes, value]);
                      }
                    }}
                    placeholder="Select Type"
                    disabled={false}
                    style={styles.select}
                  />

                  {/* Selected Event Types Tags */}
                  {selectedEventTypes.length > 0 && (
                    <div
                      style={{
                        marginTop: "8px",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "4px",
                      }}
                    >
                      {selectedEventTypes.map((eventType) => (
                        <span
                          key={eventType}
                          style={{
                            backgroundColor: "#e3f2fd",
                            color: "#1976d2",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {eventType}
                          <button
                            onClick={() => {
                              setSelectedEventTypes(
                                selectedEventTypes.filter(
                                  (t) => t !== eventType
                                )
                              );
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#1976d2",
                              cursor: "pointer",
                              fontWeight: "bold",
                              fontSize: "14px",
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Deal Status moved up under Type */}
                  <span style={styles.label}>By Deal Status</span>
                  <SearchableSelect
                    options={dealStatusOptions}
                    value=""
                    onChange={(value) => {
                      if (
                        typeof value === "string" &&
                        value &&
                        !selectedDealStatuses.includes(value)
                      ) {
                        setSelectedDealStatuses([
                          ...selectedDealStatuses,
                          value,
                        ]);
                      }
                    }}
                    placeholder="Select Deal Status"
                    disabled={false}
                    style={styles.select}
                  />

                  {selectedDealStatuses.length > 0 && (
                    <div
                      style={{
                        marginTop: "8px",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "4px",
                      }}
                    >
                      {selectedDealStatuses.map((dealStatus) => (
                        <span
                          key={dealStatus}
                          style={{
                            backgroundColor: "#ffebee",
                            color: "#c62828",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {dealStatus}
                          <button
                            onClick={() => {
                              setSelectedDealStatuses(
                                selectedDealStatuses.filter(
                                  (s) => s !== dealStatus
                                )
                              );
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#c62828",
                              cursor: "pointer",
                              fontWeight: "bold",
                              fontSize: "14px",
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={styles.gridItem}>
                  <h3 style={styles.subHeading} className="filters-sub-heading">
                    Location
                  </h3>
                  <span style={styles.label}>By Continental Region</span>
                  <SearchableSelect
                    options={continentalRegions.map((r) => ({
                      value: r,
                      label: r,
                    }))}
                    value=""
                    onChange={(value) => {
                      if (
                        typeof value === "string" &&
                        value &&
                        !selectedContinentalRegions.includes(value)
                      ) {
                        setSelectedContinentalRegions([
                          ...selectedContinentalRegions,
                          value,
                        ]);
                      }
                    }}
                    placeholder={"Select Continental Region"}
                    disabled={false}
                    style={styles.select}
                  />
                  {selectedContinentalRegions.length > 0 && (
                    <div
                      style={{
                        marginTop: "8px",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "4px",
                      }}
                    >
                      {selectedContinentalRegions.map((r) => (
                        <span
                          key={r}
                          style={{
                            backgroundColor: "#e3f2fd",
                            color: "#1976d2",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {r}
                          <button
                            onClick={() => {
                              setSelectedContinentalRegions(
                                selectedContinentalRegions.filter(
                                  (x) => x !== r
                                )
                              );
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#1976d2",
                              cursor: "pointer",
                              fontWeight: "bold",
                              fontSize: "14px",
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <span style={styles.label}>By Sub-Region</span>
                  <SearchableSelect
                    options={subRegions.map((r) => ({ value: r, label: r }))}
                    value=""
                    onChange={(value) => {
                      if (
                        typeof value === "string" &&
                        value &&
                        !selectedSubRegions.includes(value)
                      ) {
                        setSelectedSubRegions([...selectedSubRegions, value]);
                      }
                    }}
                    placeholder={"Select Sub-Region"}
                    disabled={false}
                    style={styles.select}
                  />
                  {selectedSubRegions.length > 0 && (
                    <div
                      style={{
                        marginTop: "8px",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "4px",
                      }}
                    >
                      {selectedSubRegions.map((r) => (
                        <span
                          key={r}
                          style={{
                            backgroundColor: "#fff3e0",
                            color: "#f57c00",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {r}
                          <button
                            onClick={() => {
                              setSelectedSubRegions(
                                selectedSubRegions.filter((x) => x !== r)
                              );
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#f57c00",
                              cursor: "pointer",
                              fontWeight: "bold",
                              fontSize: "14px",
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <span style={styles.label}>By Country</span>
                  <SearchableSelect
                    options={countryOptions}
                    value=""
                    onChange={(value) => {
                      if (
                        typeof value === "string" &&
                        value &&
                        !selectedCountries.includes(value)
                      ) {
                        setSelectedCountries([...selectedCountries, value]);
                      }
                    }}
                    placeholder={
                      loadingCountries
                        ? "Loading countries..."
                        : "Select Country"
                    }
                    disabled={loadingCountries}
                    style={styles.select}
                  />

                  {/* Selected Countries Tags */}
                  {selectedCountries.length > 0 && (
                    <div
                      style={{
                        marginTop: "8px",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "4px",
                      }}
                    >
                      {selectedCountries.map((country) => (
                        <span
                          key={country}
                          style={{
                            backgroundColor: "#e3f2fd",
                            color: "#1976d2",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {country}
                          <button
                            onClick={() => {
                              setSelectedCountries(
                                selectedCountries.filter((c) => c !== country)
                              );
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#1976d2",
                              cursor: "pointer",
                              fontWeight: "bold",
                              fontSize: "14px",
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <span style={styles.label}>By State/County/Province</span>
                  <SearchableSelect
                    options={provinceOptions}
                    value=""
                    onChange={(value) => {
                      if (
                        typeof value === "string" &&
                        value &&
                        !selectedProvinces.includes(value)
                      ) {
                        setSelectedProvinces([...selectedProvinces, value]);
                      }
                    }}
                    placeholder={
                      loadingProvinces
                        ? "Loading provinces..."
                        : selectedCountries.length === 0
                        ? "Select country first"
                        : "Select Province"
                    }
                    disabled={
                      loadingProvinces || selectedCountries.length === 0
                    }
                    style={styles.select}
                  />

                  {/* Selected Provinces Tags */}
                  {selectedProvinces.length > 0 && (
                    <div
                      style={{
                        marginTop: "8px",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "4px",
                      }}
                    >
                      {selectedProvinces.map((province) => (
                        <span
                          key={province}
                          style={{
                            backgroundColor: "#e8f5e8",
                            color: "#2e7d32",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {province}
                          <button
                            onClick={() => {
                              setSelectedProvinces(
                                selectedProvinces.filter((p) => p !== province)
                              );
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#2e7d32",
                              cursor: "pointer",
                              fontWeight: "bold",
                              fontSize: "14px",
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <span style={styles.label}>By City</span>
                  <SearchableSelect
                    options={cityOptions}
                    value=""
                    onChange={(value) => {
                      if (
                        typeof value === "string" &&
                        value &&
                        !selectedCities.includes(value)
                      ) {
                        setSelectedCities([...selectedCities, value]);
                      }
                    }}
                    placeholder={
                      loadingCities
                        ? "Loading cities..."
                        : selectedCountries.length === 0
                        ? "Select country first"
                        : "Select City"
                    }
                    disabled={loadingCities || selectedCountries.length === 0}
                    style={styles.select}
                  />

                  {/* Selected Cities Tags */}
                  {selectedCities.length > 0 && (
                    <div
                      style={{
                        marginTop: "8px",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "4px",
                      }}
                    >
                      {selectedCities.map((city) => (
                        <span
                          key={city}
                          style={{
                            backgroundColor: "#fff3e0",
                            color: "#f57c00",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {city}
                          <button
                            onClick={() => {
                              setSelectedCities(
                                selectedCities.filter((c) => c !== city)
                              );
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#f57c00",
                              cursor: "pointer",
                              fontWeight: "bold",
                              fontSize: "14px",
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={styles.gridItem}>
                  <h3 style={styles.subHeading} className="filters-sub-heading">
                    Sector
                  </h3>
                  <span style={styles.label}>By Primary Sectors</span>
                  <SearchableSelect
                    options={primarySectorOptions}
                    value=""
                    onChange={(value) => {
                      if (
                        typeof value === "number" &&
                        value &&
                        !selectedPrimarySectors.includes(value)
                      ) {
                        setSelectedPrimarySectors([
                          ...selectedPrimarySectors,
                          value,
                        ]);
                      }
                    }}
                    placeholder={
                      loadingPrimarySectors
                        ? "Loading sectors..."
                        : "Select Primary Sector"
                    }
                    disabled={loadingPrimarySectors}
                    style={styles.select}
                  />

                  {/* Selected Primary Sectors Tags */}
                  {selectedPrimarySectors.length > 0 && (
                    <div
                      style={{
                        marginTop: "8px",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "4px",
                      }}
                    >
                      {selectedPrimarySectors.map((sectorId) => {
                        const sector = primarySectors.find(
                          (s) => s.id === sectorId
                        );
                        return (
                          <span
                            key={sectorId}
                            style={{
                              backgroundColor: "#f3e5f5",
                              color: "#7b1fa2",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "12px",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            {sector?.sector_name || `Sector ${sectorId}`}
                            <button
                              onClick={() => {
                                setSelectedPrimarySectors(
                                  selectedPrimarySectors.filter(
                                    (s) => s !== sectorId
                                  )
                                );
                              }}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#7b1fa2",
                                cursor: "pointer",
                                fontWeight: "bold",
                                fontSize: "14px",
                              }}
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <span style={styles.label}>By Secondary Sectors</span>
                  <SearchableSelect
                    options={secondarySectorOptions}
                    value=""
                    onChange={(value) => {
                      if (
                        typeof value === "number" &&
                        value &&
                        !selectedSecondarySectors.includes(value)
                      ) {
                        setSelectedSecondarySectors([
                          ...selectedSecondarySectors,
                          value,
                        ]);
                      }
                    }}
                    placeholder={
                      loadingSecondarySectors
                        ? "Loading sectors..."
                        : selectedPrimarySectors.length === 0
                        ? "Select primary sectors first"
                        : "Select Secondary Sector"
                    }
                    disabled={
                      loadingSecondarySectors ||
                      selectedPrimarySectors.length === 0
                    }
                    style={styles.select}
                  />

                  {/* Selected Secondary Sectors Tags */}
                  {selectedSecondarySectors.length > 0 && (
                    <div
                      style={{
                        marginTop: "8px",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "4px",
                      }}
                    >
                      {selectedSecondarySectors.map((sectorId) => {
                        const sector = secondarySectors.find(
                          (s) => s.id === sectorId
                        );
                        return (
                          <span
                            key={sectorId}
                            style={{
                              backgroundColor: "#e8f5e8",
                              color: "#2e7d32",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "12px",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            {sector?.sector_name || `Sector ${sectorId}`}
                            <button
                              onClick={() => {
                                setSelectedSecondarySectors(
                                  selectedSecondarySectors.filter(
                                    (s) => s !== sectorId
                                  )
                                );
                              }}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#2e7d32",
                                cursor: "pointer",
                                fontWeight: "bold",
                                fontSize: "14px",
                              }}
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div style={{ ...styles.gridItem, gridColumn: "span 2" }}>
                  <h3 style={styles.subHeading} className="filters-sub-heading">
                    Announcement Date
                  </h3>
                  <span style={styles.label}>Start</span>
                  <input
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    style={styles.input}
                    className="filters-input"
                    placeholder="dd/mm/yyyy"
                  />

                  <span style={styles.label}>End</span>
                  <input
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    style={styles.input}
                    className="filters-input"
                    placeholder="dd/mm/yyyy"
                  />
                </div>

                {/* Removed inline grid Search section to reduce space; use compact search row below */}
              </div>
            )}

            {/* Compact Search Row */}
            <div style={{ marginTop: showFilters ? "20px" : "0" }}>
              {showFilters && (
                <h3 style={styles.subHeading}>Search Corporate Events</h3>
              )}
              <div className="search-row">
                <input
                  type="text"
                  placeholder="Enter search terms here"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ ...styles.input, marginBottom: 0, maxWidth: 340 }}
                  className="filters-input"
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                />
                <button
                  onClick={handleSearch}
                  style={{ ...styles.button, marginTop: 0, maxWidth: 140 }}
                  className="filters-button"
                  onMouseOver={(e) =>
                    ((e.target as HTMLButtonElement).style.backgroundColor =
                      "#005bb5")
                  }
                  onMouseOut={(e) =>
                    ((e.target as HTMLButtonElement).style.backgroundColor =
                      "#0075df")
                  }
                >
                  {loading ? "Searching..." : "Search"}
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              style={styles.linkButton}
            >
              {showFilters ? "Hide & Reset Filters" : "Show Filters"}
            </button>

            {/* Error Display */}
            {error && <div className="error">{error}</div>}

            {/* Loading Display */}
            {loading && (
              <div className="loading">Loading corporate events...</div>
            )}
          </div>
        </div>
      </div>

      {/* Corporate Events Table Section */}
      <div className="corporate-event-section">
        {/* Statistics Block */}
        {summaryData.acquisitions > 0 && (
          <div className="corporate-event-stats">
            <h2 className="stats-title">Corporate Events</h2>
            <div className="stats-grid">
              <div className="stats-item">
                <span className="stats-label">Acquisitions:</span>
                <span className="stats-value">
                  {summaryData.acquisitions?.toLocaleString() || "0"}
                </span>
              </div>
              <div className="stats-item">
                <span className="stats-label">Investments:</span>
                <span className="stats-value">
                  {summaryData.investments?.toLocaleString() || "0"}
                </span>
              </div>
              <div className="stats-item">
                <span className="stats-label">IPOs:</span>
                <span className="stats-value">
                  {summaryData.ipos?.toLocaleString() || "0"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Export Button - Show only when filters are applied */}
        {hasActiveFilters() && corporateEvents.length > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: "16px",
            }}
          >
            <button
              onClick={handleExportCSV}
              className="export-button"
              disabled={loading}
            >
              {loading ? "Exporting..." : "Export CSV"}
            </button>
          </div>
        )}

        {/* Results Table */}
        {corporateEvents.length > 0 && (
          <CorporateEventsTable events={corporateEvents} loading={loading} />
        )}

        {/* Pagination */}
        {pagination.pageTotal > 1 && (
          <div className="pagination">
            {generatePaginationButtons(pagination, handlePageChange)}
          </div>
        )}
      </div>

      <ExportLimitModal
        isOpen={showExportLimitModal}
        onClose={() => setShowExportLimitModal(false)}
        exportsLeft={exportsLeft}
        totalExports={EXPORT_LIMIT}
      />

      <Footer />
      <style dangerouslySetInnerHTML={{ __html: style }} />
    </div>
  );
};

export default CorporateEventsPage;
