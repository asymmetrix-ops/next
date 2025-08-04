"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCorporateEvents } from "../../hooks/useCorporateEvents";
import {
  formatSectors,
  formatCurrency,
  formatDate,
} from "../../utils/corporateEventsHelpers";
import {
  CorporateEvent,
  CorporateEventsResponse,
} from "../../types/corporateEvents";

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
  searchDiv: {
    display: "flex" as const,
    flexDirection: "column" as const,
  },
  input: {
    width: "100%",
    maxWidth: "300px",
    padding: "15px 14px",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    fontSize: "14px",
    color: "#4a5568",
    outline: "none",
    marginBottom: "12px",
  },
  button: {
    width: "100%",
    maxWidth: "300px",
    backgroundColor: "#0075df",
    color: "white",
    fontWeight: "600",
    padding: "15px 14px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
  },
  linkButton: {
    backgroundColor: "transparent",
    border: "none",
    color: "#0075df",
    textDecoration: "underline",
    cursor: "pointer",
    fontSize: "14px",
    marginTop: "12px",
  },
};

// Filters Component
const CorporateEventsDashboard = ({
  searchQuery,
  onSearch,
}: {
  searchQuery: string;
  onSearch: (query: string) => void;
}) => {
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [showFilters, setShowFilters] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(localQuery);
  };

  return (
    <div style={styles.container}>
      <div style={styles.maxWidth}>
        <div style={styles.card}>
          <h2 style={styles.heading}>Filters</h2>

          <div style={{ marginTop: "0" }}>
            <h3 style={styles.subHeading}>Search for Corporate Event</h3>
            <form onSubmit={handleSubmit} style={styles.searchDiv}>
              <input
                type="text"
                placeholder="Enter name here"
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
                style={styles.input}
              />
              <button
                type="submit"
                style={styles.button}
                onMouseOver={(e) =>
                  ((e.target as HTMLButtonElement).style.backgroundColor =
                    "#005bb5")
                }
                onMouseOut={(e) =>
                  ((e.target as HTMLButtonElement).style.backgroundColor =
                    "#0075df")
                }
              >
                Search
              </button>
            </form>
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            style={styles.linkButton}
          >
            {showFilters ? "Hide & Reset Filters" : "Show Filters"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Pagination Component
const Pagination = ({
  currentPage,
  totalItems,
  perPage,
  onPageChange,
  onPerPageChange,
}: {
  currentPage: number;
  totalItems: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
}) => {
  const totalPages = Math.ceil(totalItems / perPage);
  const startItem = (currentPage - 1) * perPage + 1;
  const endItem = Math.min(currentPage * perPage, totalItems);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: "24px",
        padding: "16px 0",
      }}
    >
      {/* Items per page */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "14px", color: "#6b7280" }}>Show:</span>
        <select
          value={perPage}
          onChange={(e) => onPerPageChange(parseInt(e.target.value))}
          style={{
            padding: "8px 12px",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            fontSize: "14px",
            outline: "none",
          }}
        >
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <span style={{ fontSize: "14px", color: "#6b7280" }}>per page</span>
      </div>

      {/* Page info */}
      <div style={{ fontSize: "14px", color: "#6b7280" }}>
        Showing {startItem.toLocaleString()} to {endItem.toLocaleString()} of{" "}
        {totalItems.toLocaleString()} corporate events
      </div>

      {/* Page navigation */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        {/* Previous arrow */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          style={{
            padding: "8px 12px",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            fontSize: "14px",
            backgroundColor: "white",
            cursor: currentPage <= 1 ? "not-allowed" : "pointer",
            opacity: currentPage <= 1 ? 0.5 : 1,
          }}
        >
          ←
        </button>

        {/* First page */}
        <button
          onClick={() => onPageChange(1)}
          style={{
            padding: "8px 12px",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            fontSize: "14px",
            backgroundColor: currentPage === 1 ? "#0075df" : "white",
            color: currentPage === 1 ? "white" : "#000",
            cursor: "pointer",
          }}
        >
          1
        </button>

        {/* Second page */}
        <button
          onClick={() => onPageChange(2)}
          style={{
            padding: "8px 12px",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            fontSize: "14px",
            backgroundColor: currentPage === 2 ? "#0075df" : "white",
            color: currentPage === 2 ? "white" : "#000",
            cursor: "pointer",
          }}
        >
          2
        </button>

        {/* Ellipsis */}
        {totalPages > 3 && (
          <span
            style={{ padding: "8px 12px", fontSize: "14px", color: "#6b7280" }}
          >
            ...
          </span>
        )}

        {/* Last page */}
        {totalPages > 2 && (
          <button
            onClick={() => onPageChange(totalPages)}
            style={{
              padding: "8px 12px",
              border: "1px solid #e2e8f0",
              borderRadius: "4px",
              fontSize: "14px",
              backgroundColor: currentPage === totalPages ? "#0075df" : "white",
              color: currentPage === totalPages ? "white" : "#000",
              cursor: "pointer",
            }}
          >
            {totalPages}
          </button>
        )}

        {/* Next arrow */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          style={{
            padding: "8px 12px",
            border: "1px solid #e2e8f0",
            borderRadius: "4px",
            fontSize: "14px",
            backgroundColor: "white",
            cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
            opacity: currentPage >= totalPages ? 0.5 : 1,
          }}
        >
          →
        </button>
      </div>
    </div>
  );
};

// Main Corporate Events Component
const CorporateEventsSection = ({
  data,
  loading,
  error,
}: {
  data: CorporateEventsResponse | null;
  loading: boolean;
  error: string | null;
}) => {
  const router = useRouter();

  // Fix data mapping to match actual API response structure
  const events = data?.items || [];
  const acquisitions = data?.acquisitions || 0;
  const investments = data?.investments || 0;
  const ipos = data?.ipos || 0;

  const handleEventClick = (eventId: number) => {
    router.push(`/corporate-event/${eventId}`);
  };

  const handleCompanyClick = (companyId: number) => {
    router.push(`/company/${companyId}`);
  };

  const handleInvestorClick = (investorId: number) => {
    router.push(`/investors/${investorId}`);
  };

  const tableRows = useMemo(
    () =>
      events.map((event: CorporateEvent, index: number) => {
        const target = event.target_counterparty?.new_company;
        const targetCounterpartyId =
          event.target_counterparty?.new_company_counterparty;
        return (
          <tr key={event.id || index}>
            <td
              style={{
                color: "#2563eb",
                textDecoration: "underline",
                cursor: "pointer",
              }}
              onClick={() => handleEventClick(event.id)}
            >
              {event.description || "Not Available"}
            </td>
            <td>{formatDate(event.announcement_date)}</td>
            <td
              style={{
                color: "#2563eb",
                textDecoration: "underline",
                cursor: "pointer",
              }}
              onClick={() => {
                if (targetCounterpartyId) {
                  handleCompanyClick(targetCounterpartyId);
                }
              }}
            >
              {target?.name || "Not Available"}
            </td>
            <td>{target?.country || "Not Available"}</td>
            <td>{formatSectors(target?._sectors_primary)}</td>
            <td>{formatSectors(target?._sectors_secondary)}</td>
            <td>{event.deal_type || "Not Available"}</td>
            <td>
              {formatCurrency(
                event.investment_data?.investment_amount_m,
                event.investment_data?.currency?.Currency
              )}
            </td>
            <td>
              {formatCurrency(
                event.ev_data?.enterprise_value_m,
                event.ev_data?.currency?.Currency
              )}
            </td>
            <td>
              {event.other_counterparties?.map((counterparty, subIndex) => {
                return (
                  <span key={subIndex}>
                    {counterparty._new_company._is_that_investor ? (
                      <span
                        style={{
                          color: "#0075df",
                          textDecoration: "underline",
                          cursor: "pointer",
                        }}
                        onClick={() => {
                          handleInvestorClick(
                            counterparty.new_company_counterparty
                          );
                        }}
                      >
                        {counterparty._new_company.name}
                      </span>
                    ) : (
                      <span style={{ color: "#000" }}>
                        {counterparty._new_company.name}
                      </span>
                    )}
                    {subIndex < event.other_counterparties.length - 1 && ", "}
                  </span>
                );
              }) || "Not Available"}
            </td>
            <td>
              {event.advisors?.map((advisor, subIndex) => (
                <span key={subIndex}>
                  <span
                    style={{
                      color: "#0075df",
                      textDecoration: "underline",
                      cursor: "pointer",
                    }}
                    onClick={() => handleCompanyClick(advisor._new_company.id)}
                  >
                    {advisor._new_company.name}
                  </span>
                  {subIndex < event.advisors.length - 1 && ", "}
                </span>
              )) || "Not Available"}
            </td>
          </tr>
        );
      }),
    [events, router]
  );

  const style = `
    .corporate-events-section {
      padding: 32px 24px;
      border-radius: 8px;
    }
    .corporate-events-stats {
      background: #fff;
      padding: 32px 24px;
      box-shadow: 0px 1px 3px 0px rgba(227, 228, 230, 1);
      border-radius: 16px;
      margin-bottom: 24px;
    }
    .stats-title {
      font-size: 24px;
      font-weight: 700;
      color: #1a202c;
      margin: 0 0 24px 0;
    }
    .stats-column {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .stats-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .stats-item:last-child {
      border-bottom: none;
    }
    .stats-label {
      font-size: 14px;
      color: #4a5568;
      font-weight: 500;
    }
    .stats-value {
      font-size: 16px;
      color: #000;
      font-weight: 600;
    }
    .corporate-events-table {
      width: 100%;
      background: #fff;
      padding: 32px 24px;
      box-shadow: 0px 1px 3px 0px rgba(227, 228, 230, 1);
      border-radius: 16px;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .corporate-events-table th,
    .corporate-events-table td {
      padding: 16px;
      text-align: left;
      vertical-align: top;
      border-bottom: 1px solid #e2e8f0;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .corporate-events-table th {
      font-weight: 600;
      color: #1a202c;
      font-size: 14px;
      background: #f9fafb;
      border-bottom: 2px solid #e2e8f0;
    }
    .corporate-events-table td {
      font-size: 14px;
      color: #000;
      line-height: 1.5;
    }
  `;

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.maxWidth}>
          <div style={styles.card}>
            <div style={{ textAlign: "center", padding: "40px" }}>
              <div style={{ fontSize: "18px", color: "#4a5568" }}>
                Loading corporate events...
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.maxWidth}>
          <div style={styles.card}>
            <div style={{ textAlign: "center", padding: "40px" }}>
              <div style={{ fontSize: "18px", color: "#e53e3e" }}>
                Error: {error}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return React.createElement(
    "div",
    { style: styles.container },
    React.createElement(
      "div",
      { style: styles.maxWidth },
      React.createElement(
        "div",
        { className: "corporate-events-stats" },
        React.createElement(
          "h2",
          { className: "stats-title" },
          "Corporate Events"
        ),
        React.createElement(
          "div",
          { className: "stats-column" },
          React.createElement(
            "div",
            { className: "stats-item" },
            React.createElement(
              "span",
              { className: "stats-label" },
              "Acquisitions: "
            ),
            React.createElement(
              "span",
              { className: "stats-value" },
              acquisitions.toLocaleString()
            )
          ),
          React.createElement(
            "div",
            { className: "stats-item" },
            React.createElement(
              "span",
              { className: "stats-label" },
              "Investments: "
            ),
            React.createElement(
              "span",
              { className: "stats-value" },
              investments.toLocaleString()
            )
          ),
          React.createElement(
            "div",
            { className: "stats-item" },
            React.createElement("span", { className: "stats-label" }, "IPOs: "),
            React.createElement(
              "span",
              { className: "stats-value" },
              ipos.toLocaleString()
            )
          )
        )
      ),
      React.createElement(
        "table",
        { className: "corporate-events-table" },
        React.createElement(
          "thead",
          null,
          React.createElement(
            "tr",
            null,
            React.createElement("th", null, "Description"),
            React.createElement("th", null, "Date Announced"),
            React.createElement("th", null, "Target Name"),
            React.createElement("th", null, "Target Country"),
            React.createElement("th", null, "Primary Sector"),
            React.createElement("th", null, "Secondary Sectors"),
            React.createElement("th", null, "Type"),
            React.createElement("th", null, "Investment"),
            React.createElement("th", null, "Enterprise Value"),
            React.createElement("th", null, "Other Counterparties"),
            React.createElement("th", null, "Advisors")
          )
        ),
        React.createElement("tbody", null, tableRows)
      ),
      React.createElement("style", {
        dangerouslySetInnerHTML: { __html: style },
      })
    )
  );
};

// Main Page Component
const CorporateEventsPage = () => {
  const {
    data,
    loading,
    error,
    currentPage,
    perPage,
    searchQuery,
    handlePageChange,
    handlePerPageChange,
    handleSearchChange,
  } = useCorporateEvents({
    initialPerPage: 50,
  });

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

  return (
    <div className="min-h-screen">
      <Header />
      <div style={{ padding: "32px 24px" }}>
        {/* Search Section */}
        <CorporateEventsDashboard
          searchQuery={searchQuery}
          onSearch={handleSearchChange}
        />

        {/* Stats and Table Section */}
        {data && (
          <>
            <CorporateEventsSection
              data={data}
              loading={loading}
              error={error}
            />

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalItems={data.itemTotal || 0}
              perPage={perPage}
              onPageChange={handlePageChange}
              onPerPageChange={handlePerPageChange}
            />
          </>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default CorporateEventsPage;
