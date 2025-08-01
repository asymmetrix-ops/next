"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Types for API integration
interface Investor {
  company_name?: string;
  investor_type?: string[];
  description?: string;
  number_of_active_investments?: number;
  da_primary_sector_names?: string[];
  linkedin_members?: number;
  country?: string;
  linkedin_logo?: string;
}

interface InvestorsResponse {
  investors: {
    itemsReceived: number;
    curPage: number;
    nextPage: number | null;
    prevPage: number | null;
    offset: number;
    itemsTotal: number;
    pageTotal: number;
    items: Investor[];
    summary_by_company_focus?: {
      privateEquityCount?: number;
      ventureCapitalCount?: number;
      familyOfficeCount?: number;
      assetManagementCount?: number;
      hedgeFundCount?: number;
      numberOfPEInvestments?: number;
      numberOfVCInvestments?: number;
      numberOfFamilyOfficeInvestments?: number;
      numberOfAssetManagerInvestments?: number;
      numberOfHedgeFundInvestments?: number;
      sumOfInvestorsActiveDAInvestments?: number;
    };
  };
}

interface InvestorsFilters {
  Investor_Types: string[];
  Primary_Sectors: string[];
  Secondary_Sectors: string[];
  Horizontals: string[];
  Portfolio_Companies_Min: number;
  Portfolio_Companies_Max: number;
  Search_Query: string;
  page: number;
  per_page: number;
  Countries: string[];
  Provinces: string[];
  Cities: string[];
}

const InvestorDashboard = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<InvestorsFilters>({
    Investor_Types: [],
    Primary_Sectors: [],
    Secondary_Sectors: [],
    Horizontals: [],
    Portfolio_Companies_Min: 0,
    Portfolio_Companies_Max: 0,
    Search_Query: "",
    page: 1,
    per_page: 50,
    Countries: [],
    Provinces: [],
    Cities: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch investors data from API
  const fetchInvestors = async (filters: InvestorsFilters) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("asymmetrix_auth_token");

      // Convert filters to URL parameters for GET request
      const params = new URLSearchParams();
      if (filters.Investor_Types.length > 0)
        params.append("Investor_Types", JSON.stringify(filters.Investor_Types));
      if (filters.Primary_Sectors.length > 0)
        params.append(
          "Primary_Sectors",
          JSON.stringify(filters.Primary_Sectors)
        );
      if (filters.Secondary_Sectors.length > 0)
        params.append(
          "Secondary_Sectors",
          JSON.stringify(filters.Secondary_Sectors)
        );
      if (filters.Horizontals.length > 0)
        params.append("Horizontals", JSON.stringify(filters.Horizontals));
      if (filters.Portfolio_Companies_Min > 0)
        params.append(
          "Portfolio_Companies_Min",
          filters.Portfolio_Companies_Min.toString()
        );
      if (filters.Portfolio_Companies_Max > 0)
        params.append(
          "Portfolio_Companies_Max",
          filters.Portfolio_Companies_Max.toString()
        );
      if (filters.Search_Query)
        params.append("Search_Query", filters.Search_Query);
      if (filters.page > 0) params.append("page", filters.page.toString());
      if (filters.per_page > 0)
        params.append("per_page", filters.per_page.toString());
      if (filters.Countries.length > 0)
        params.append("Countries", JSON.stringify(filters.Countries));
      if (filters.Provinces.length > 0)
        params.append("Provinces", JSON.stringify(filters.Provinces));
      if (filters.Cities.length > 0)
        params.append("Cities", JSON.stringify(filters.Cities));

      const url = `https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm/investors_with_d_a_list?${params.toString()}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      // Data is fetched but not used in the static layout
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch investors"
      );
      console.error("Error fetching investors:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = () => {
    const updatedFilters = {
      ...filters,
      Search_Query: searchTerm,
      page: 1, // Reset to first page when searching
    };
    setFilters(updatedFilters);
    fetchInvestors(updatedFilters);
  };

  // Initial data fetch
  useEffect(() => {
    fetchInvestors(filters);
  }, []);

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
      marginTop: "8px",
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
    rangeInput: {
      width: "100%",
      padding: "13px 14px",
      border: "1px solid #e2e8f0",
      borderRadius: "6px",
      fontSize: "16px",
      color: "#4a5568",
      outline: "none",
      marginBottom: "12px",
    },
    loading: {
      textAlign: "center" as const,
      padding: "20px",
      color: "#666",
    },
    error: {
      textAlign: "center" as const,
      padding: "20px",
      color: "#e53e3e",
      backgroundColor: "#fed7d7",
      borderRadius: "6px",
      marginBottom: "16px",
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.maxWidth}>
        {/* Filters Section */}
        <div style={styles.card}>
          <h2 style={styles.heading}>Filters</h2>

          {showFilters && (
            <div style={styles.grid}>
              <div style={styles.gridItem}>
                <h3 style={styles.subHeading}>HQ of Portfolio companies</h3>
                <span style={styles.label}>By Country</span>
                <select style={styles.select}>
                  <option value="">By Country</option>
                </select>
                <span style={styles.label}>By State/County/Province</span>
                <select style={styles.select}>
                  <option value="">By State/County/Province</option>
                </select>
                <span style={styles.label}>By City</span>
                <select style={styles.select}>
                  <option value="">By City</option>
                </select>
              </div>
              <div style={styles.gridItem}>
                <h3 style={styles.subHeading}>Sector Invested In</h3>
                <span style={styles.label}>By Primary Sectors</span>
                <select style={styles.select}>
                  <option value="">By Primary Sectors</option>
                </select>
                <span style={styles.label}>By Secondary Sector</span>
                <select style={styles.select}>
                  <option value="">By Secondary Sector</option>
                </select>
              </div>
              <div style={styles.gridItem}>
                <h3 style={styles.subHeading}>Investor Type</h3>
                <span style={styles.label}>By Type</span>
                <select style={styles.select}>
                  <option value="">By Type</option>
                </select>
                <span style={styles.label}>Portfolio Companies</span>
                <div style={{ display: "flex", gap: "14px" }}>
                  <input
                    type="number"
                    style={styles.rangeInput}
                    placeholder="0"
                  />
                  <input
                    type="number"
                    style={styles.rangeInput}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: showFilters ? "20px" : "0" }}>
            <h3 style={styles.subHeading}>Search for Investor</h3>
            <div style={styles.searchDiv}>
              <input
                type="text"
                placeholder="Enter name here"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.input}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
              <button
                style={styles.button}
                onClick={handleSearch}
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
        </div>

        {/* Error Display */}
        {error && <div style={styles.error}>{error}</div>}

        {/* Loading Display */}
        {loading && <div style={styles.loading}>Loading investors...</div>}
      </div>
    </div>
  );
};

const InvestorSection = () => {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    itemsReceived: 0,
    curPage: 1,
    nextPage: null as number | null,
    prevPage: null as number | null,
    offset: 0,
    itemsTotal: 0,
    pageTotal: 0,
  });
  const [summaryData, setSummaryData] = useState({
    privateEquityCount: 0,
    ventureCapitalCount: 0,
    familyOfficeCount: 0,
    assetManagementCount: 0,
    hedgeFundCount: 0,
    numberOfPEInvestments: 0,
    numberOfVCInvestments: 0,
    numberOfFamilyOfficeInvestments: 0,
    numberOfAssetManagerInvestments: 0,
    numberOfHedgeFundInvestments: 0,
    sumOfInvestorsActiveDAInvestments: 0,
  });

  // Fetch investors data
  const fetchInvestors = async (page: number = 1) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("asymmetrix_auth_token");

      // Use parameters for GET request
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("per_page", "50");

      const url = `https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm/investors_with_d_a_list?${params.toString()}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data: InvestorsResponse = await response.json();
      setInvestors(data.investors.items);
      setPagination({
        itemsReceived: data.investors.itemsReceived,
        curPage: data.investors.curPage,
        nextPage: data.investors.nextPage,
        prevPage: data.investors.prevPage,
        offset: data.investors.offset,
        itemsTotal: data.investors.itemsTotal,
        pageTotal: data.investors.pageTotal,
      });
      setSummaryData({
        privateEquityCount:
          data.investors.summary_by_company_focus?.privateEquityCount || 0,
        ventureCapitalCount:
          data.investors.summary_by_company_focus?.ventureCapitalCount || 0,
        familyOfficeCount:
          data.investors.summary_by_company_focus?.familyOfficeCount || 0,
        assetManagementCount:
          data.investors.summary_by_company_focus?.assetManagementCount || 0,
        hedgeFundCount:
          data.investors.summary_by_company_focus?.hedgeFundCount || 0,
        numberOfPEInvestments:
          data.investors.summary_by_company_focus?.numberOfPEInvestments || 0,
        numberOfVCInvestments:
          data.investors.summary_by_company_focus?.numberOfVCInvestments || 0,
        numberOfFamilyOfficeInvestments:
          data.investors.summary_by_company_focus
            ?.numberOfFamilyOfficeInvestments || 0,
        numberOfAssetManagerInvestments:
          data.investors.summary_by_company_focus
            ?.numberOfAssetManagerInvestments || 0,
        numberOfHedgeFundInvestments:
          data.investors.summary_by_company_focus
            ?.numberOfHedgeFundInvestments || 0,
        sumOfInvestorsActiveDAInvestments:
          data.investors.summary_by_company_focus
            ?.sumOfInvestorsActiveDAInvestments || 0,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch investors"
      );
      console.error("Error fetching investors:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    fetchInvestors(page);
  };

  useEffect(() => {
    fetchInvestors(1);
  }, []);

  const tableRows = investors.map((investor, index) => {
    // Truncate description for display
    const description = investor.description || "N/A";
    const isDescriptionLong = description.length > 150;
    const truncatedDescription = isDescriptionLong
      ? description.substring(0, 150) + "..."
      : description;

    // Format numbers with commas
    const formatNumber = (num: number | undefined) => {
      if (num === undefined || num === null) return "0";
      return num.toLocaleString();
    };

    return React.createElement(
      "tr",
      { key: index },
      React.createElement(
        "td",
        null,
        investor.linkedin_logo
          ? React.createElement("img", {
              src: `data:image/jpeg;base64,${investor.linkedin_logo}`,
              alt: `${investor.company_name} logo`,
              className: "investor-logo",
              loading: "lazy",
            })
          : React.createElement(
              "div",
              {
                style: {
                  width: "60px",
                  height: "40px",
                  backgroundColor: "#f7fafc",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  color: "#718096",
                },
              },
              "No Logo"
            )
      ),
      React.createElement(
        "td",
        null,
        React.createElement(
          "span",
          { className: "investor-name" },
          investor.company_name || "N/A"
        )
      ),
      React.createElement(
        "td",
        null,
        investor.investor_type && investor.investor_type.length > 0
          ? investor.investor_type.join(", ")
          : "N/A"
      ),
      React.createElement(
        "td",
        { className: "investor-description" },
        React.createElement(
          "div",
          {
            className: "investor-description-truncated",
            id: `description-${index}`,
            style: { display: isDescriptionLong ? "block" : "none" },
          },
          truncatedDescription
        ),
        React.createElement(
          "div",
          {
            className: "investor-description-full",
            id: `description-full-${index}`,
            style: { display: isDescriptionLong ? "none" : "block" },
          },
          description
        ),
        isDescriptionLong &&
          React.createElement(
            "span",
            {
              className: "expand-description",
              onClick: () => {
                const truncatedEl = document.getElementById(
                  `description-${index}`
                );
                const fullEl = document.getElementById(
                  `description-full-${index}`
                );
                const expandEl = document.getElementById(`expand-${index}`);
                if (truncatedEl && fullEl && expandEl) {
                  if (truncatedEl.style.display === "block") {
                    truncatedEl.style.display = "none";
                    fullEl.style.display = "block";
                    expandEl.textContent = "Collapse description";
                  } else {
                    truncatedEl.style.display = "block";
                    fullEl.style.display = "none";
                    expandEl.textContent = "Expand description";
                  }
                }
              },
              id: `expand-${index}`,
            },
            "Expand description"
          )
      ),
      React.createElement(
        "td",
        null,
        formatNumber(investor.number_of_active_investments)
      ),
      React.createElement(
        "td",
        { className: "sectors-list" },
        investor.da_primary_sector_names &&
          investor.da_primary_sector_names.length > 0
          ? investor.da_primary_sector_names.join(", ")
          : "N/A"
      ),
      React.createElement("td", null, formatNumber(investor.linkedin_members)),
      React.createElement("td", null, investor.country || "N/A")
    );
  });

  const style = `
    .investor-section {
      padding: 32px 24px;
      border-radius: 8px;
    }
    .investor-stats {
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
    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
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
    .investor-table {
      width: 100%;
      background: #fff;
      padding: 32px 24px;
      box-shadow: 0px 1px 3px 0px rgba(227, 228, 230, 1);
      border-radius: 16px;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .investor-table th,
    .investor-table td {
      padding: 16px;
      text-align: left;
      vertical-align: top;
      border-bottom: 1px solid #e2e8f0;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .investor-table th {
      font-weight: 600;
      color: #1a202c;
      font-size: 14px;
      background: #f9fafb;
      border-bottom: 2px solid #e2e8f0;
    }
    .investor-table td {
      font-size: 14px;
      color: #000;
      line-height: 1.5;
    }
    .investor-logo {
      width: 60px;
      height: 40px;
      object-fit: contain;
      vertical-align: middle;
      border-radius: 4px;
    }
    .investor-name {
      color: #0075df;
      text-decoration: underline;
      cursor: pointer;
      font-weight: 500;
    }
    .investor-description {
      max-width: 300px;
      line-height: 1.4;
    }
    .investor-description-truncated {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .expand-description {
      color: #0075df;
      text-decoration: underline;
      cursor: pointer;
      font-size: 12px;
      margin-top: 4px;
      display: block;
    }
    .sectors-list {
      max-width: 250px;
      line-height: 1.3;
    }
    .loading {
      text-align: center;
      padding: 40px;
      color: #666;
    }
    .error {
      text-align: center;
      padding: 20px;
      color: #e53e3e;
      background-color: #fed7d7;
      border-radius: 6px;
      margin-bottom: 16px;
    }
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 16px;
      margin-top: 24px;
      padding: 16px;
    }
    .pagination-button {
      padding: 8px 12px;
      border: none;
      background: none;
      color: #000;
      cursor: pointer;
      font-size: 14px;
      font-weight: 400;
      transition: color 0.2s;
      text-decoration: none;
    }
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
    @media (max-width: 768px) {
      .investor-table {
        font-size: 12px;
      }
      .investor-table th,
      .investor-table td {
        padding: 8px;
        font-size: 12px;
      }
      .investor-logo {
        width: 40px;
        height: 30px;
      }
      .investor-description {
        max-width: 200px;
      }
      .sectors-list {
        max-width: 150px;
      }
    }
  `;

  if (loading) {
    return React.createElement(
      "div",
      { className: "investor-section" },
      React.createElement(
        "div",
        { className: "loading" },
        "Loading investors..."
      ),
      React.createElement("style", {
        dangerouslySetInnerHTML: { __html: style },
      })
    );
  }

  if (error) {
    return React.createElement(
      "div",
      { className: "investor-section" },
      React.createElement("div", { className: "error" }, error),
      React.createElement("style", {
        dangerouslySetInnerHTML: { __html: style },
      })
    );
  }

  // Generate pagination buttons
  const generatePaginationButtons = () => {
    const buttons = [];
    const currentPage = pagination.curPage;
    const totalPages = pagination.pageTotal;

    // Previous button
    buttons.push(
      React.createElement(
        "button",
        {
          key: "prev",
          className: "pagination-button",
          onClick: () => handlePageChange(currentPage - 1),
          disabled: !pagination.prevPage,
        },
        "<"
      )
    );

    // Page numbers
    if (totalPages <= 7) {
      // Show all pages if total is 7 or less
      for (let i = 1; i <= totalPages; i++) {
        buttons.push(
          React.createElement(
            "button",
            {
              key: i,
              className: `pagination-button ${
                i === currentPage ? "active" : ""
              }`,
              onClick: () => handlePageChange(i),
            },
            i.toString()
          )
        );
      }
    } else {
      // Show first page
      buttons.push(
        React.createElement(
          "button",
          {
            key: 1,
            className: `pagination-button ${currentPage === 1 ? "active" : ""}`,
            onClick: () => handlePageChange(1),
          },
          "1"
        )
      );

      // Show second page if not first
      if (currentPage > 2) {
        buttons.push(
          React.createElement(
            "button",
            {
              key: 2,
              className: "pagination-button",
              onClick: () => handlePageChange(2),
            },
            "2"
          )
        );
      }

      // Show ellipsis if needed
      if (currentPage > 3) {
        buttons.push(
          React.createElement(
            "span",
            { key: "ellipsis1", className: "pagination-ellipsis" },
            "..."
          )
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
            React.createElement(
              "button",
              {
                key: i,
                className: `pagination-button ${
                  i === currentPage ? "active" : ""
                }`,
                onClick: () => handlePageChange(i),
              },
              i.toString()
            )
          );
        }
      }

      // Show ellipsis if needed
      if (currentPage < totalPages - 2) {
        buttons.push(
          React.createElement(
            "span",
            { key: "ellipsis2", className: "pagination-ellipsis" },
            "..."
          )
        );
      }

      // Show second to last page if not last
      if (currentPage < totalPages - 1) {
        buttons.push(
          React.createElement(
            "button",
            {
              key: totalPages - 1,
              className: "pagination-button",
              onClick: () => handlePageChange(totalPages - 1),
            },
            (totalPages - 1).toString()
          )
        );
      }

      // Show last page
      buttons.push(
        React.createElement(
          "button",
          {
            key: totalPages,
            className: `pagination-button ${
              currentPage === totalPages ? "active" : ""
            }`,
            onClick: () => handlePageChange(totalPages),
          },
          totalPages.toString()
        )
      );
    }

    // Next button
    buttons.push(
      React.createElement(
        "button",
        {
          key: "next",
          className: "pagination-button",
          onClick: () => handlePageChange(currentPage + 1),
          disabled: !pagination.nextPage,
        },
        ">"
      )
    );

    return buttons;
  };

  return React.createElement(
    "div",
    { className: "investor-section" },
    // Statistics Block
    React.createElement(
      "div",
      { className: "investor-stats" },
      React.createElement("h2", { className: "stats-title" }, "Investors"),
      React.createElement(
        "div",
        { className: "stats-grid" },
        React.createElement(
          "div",
          { className: "stats-column" },
          React.createElement(
            "div",
            { className: "stats-item" },
            React.createElement(
              "span",
              { className: "stats-label" },
              "Private Equity: "
            ),
            React.createElement(
              "span",
              { className: "stats-value" },
              summaryData.privateEquityCount.toLocaleString()
            )
          ),
          React.createElement(
            "div",
            { className: "stats-item" },
            React.createElement(
              "span",
              { className: "stats-label" },
              "Venture Capital: "
            ),
            React.createElement(
              "span",
              { className: "stats-value" },
              summaryData.ventureCapitalCount.toLocaleString()
            )
          ),
          React.createElement(
            "div",
            { className: "stats-item" },
            React.createElement(
              "span",
              { className: "stats-label" },
              "Asset Managers: "
            ),
            React.createElement(
              "span",
              { className: "stats-value" },
              summaryData.assetManagementCount.toLocaleString()
            )
          ),
          React.createElement(
            "div",
            { className: "stats-item" },
            React.createElement(
              "span",
              { className: "stats-label" },
              "Hedge Fund: "
            ),
            React.createElement(
              "span",
              { className: "stats-value" },
              summaryData.hedgeFundCount.toLocaleString()
            )
          ),
          React.createElement(
            "div",
            { className: "stats-item" },
            React.createElement(
              "span",
              { className: "stats-label" },
              "Family Office: "
            ),
            React.createElement(
              "span",
              { className: "stats-value" },
              summaryData.familyOfficeCount.toLocaleString()
            )
          )
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
              "Number of PE investments: "
            ),
            React.createElement(
              "span",
              { className: "stats-value" },
              summaryData.numberOfPEInvestments.toLocaleString()
            )
          ),
          React.createElement(
            "div",
            { className: "stats-item" },
            React.createElement(
              "span",
              { className: "stats-label" },
              "Number of VC investments: "
            ),
            React.createElement(
              "span",
              { className: "stats-value" },
              summaryData.numberOfVCInvestments.toLocaleString()
            )
          ),
          React.createElement(
            "div",
            { className: "stats-item" },
            React.createElement(
              "span",
              { className: "stats-label" },
              "Number of Asset Management investments: "
            ),
            React.createElement(
              "span",
              { className: "stats-value" },
              summaryData.numberOfAssetManagerInvestments.toLocaleString()
            )
          ),
          React.createElement(
            "div",
            { className: "stats-item" },
            React.createElement(
              "span",
              { className: "stats-label" },
              "Number Hedge Fund investments: "
            ),
            React.createElement(
              "span",
              { className: "stats-value" },
              summaryData.numberOfHedgeFundInvestments.toLocaleString()
            )
          ),
          React.createElement(
            "div",
            { className: "stats-item" },
            React.createElement(
              "span",
              { className: "stats-label" },
              "Number of Family Office investments: "
            ),
            React.createElement(
              "span",
              { className: "stats-value" },
              summaryData.numberOfFamilyOfficeInvestments.toLocaleString()
            )
          )
        )
      )
    ),
    React.createElement(
      "table",
      { className: "investor-table" },
      React.createElement(
        "thead",
        null,
        React.createElement(
          "tr",
          null,
          React.createElement("th", null, "Logo"),
          React.createElement("th", null, "Name"),
          React.createElement("th", null, "Type"),
          React.createElement("th", null, "Description"),
          React.createElement("th", null, "Current D&A Portfolio Companies"),
          React.createElement("th", null, "D&A Primary Sectors"),
          React.createElement("th", null, "LinkedIn Members"),
          React.createElement("th", null, "Country")
        )
      ),
      React.createElement("tbody", null, tableRows)
    ),
    React.createElement(
      "div",
      { className: "pagination" },
      generatePaginationButtons()
    ),
    React.createElement("style", {
      dangerouslySetInnerHTML: { __html: style },
    })
  );
};

const InvestorsPage = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <InvestorDashboard />
      <InvestorSection />
      <Footer />
    </div>
  );
};

export default InvestorsPage;
