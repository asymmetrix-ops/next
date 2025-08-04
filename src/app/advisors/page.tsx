"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Types for API integration
interface Advisor {
  id: number;
  name: string;
  description?: string;
  events_advised?: number;
  sectors?: string;
  linkedin_members?: number;
  country?: string;
  linkedin_logo?: string;
}

interface AdvisorsResponse {
  itemsReceived: number;
  curPage: number;
  nextPage: number | null;
  prevPage: number | null;
  offset: number;
  itemsTotal: number;
  pageTotal: number;
  items: Advisor[];
}

interface AdvisorsCountsResponse {
  lambda: {
    companiesByRole: {
      financialAdvisors: number;
      commercialDueDiligence: number;
      vendorDueDiligence: number;
      managementTeamAdvisory: number;
      nomad: number;
    };
  };
}

interface AdvisorsFilters {
  Countries: string[];
  Provinces: string[];
  Cities: string[];
  primary_sectors_ids: string[];
  Secondary_sectors_ids: string[];
  search_query: string;
  page: number;
  per_page: number;
}

const AdvisorDashboard = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<AdvisorsFilters>({
    Countries: [],
    Provinces: [],
    Cities: [],
    primary_sectors_ids: [],
    Secondary_sectors_ids: [],
    search_query: "",
    page: 1,
    per_page: 50,
  });
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  // Handle search
  const handleSearch = () => {
    const updatedFilters = {
      ...filters,
      search_query: searchTerm,
      page: 1, // Reset to first page when searching
    };
    setFilters(updatedFilters);
    // API call will be implemented later
  };

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
      gridTemplateColumns: "repeat(2, 1fr)",
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
                <h3 style={styles.subHeading}>Location</h3>
                <span style={styles.label}>By Country</span>
                <input
                  type="text"
                  placeholder="Type Country"
                  style={styles.select}
                />
                <span style={styles.label}>By State/County/Province</span>
                <input
                  type="text"
                  placeholder="Type State/County/Province"
                  style={styles.select}
                />
                <span style={styles.label}>By City</span>
                <input
                  type="text"
                  placeholder="Type City"
                  style={styles.select}
                />
              </div>
              <div style={styles.gridItem}>
                <h3 style={styles.subHeading}>Sector</h3>
                <span style={styles.label}>By Primary Sectors</span>
                <select style={styles.select}>
                  <option value="">Select Primary Sectors</option>
                </select>
                <span style={styles.label}>By Secondary Sector</span>
                <select style={styles.select}>
                  <option value="">Select Secondary Sectors</option>
                </select>
              </div>
            </div>
          )}

          <div style={{ marginTop: showFilters ? "20px" : "0" }}>
            <h3 style={styles.subHeading}>Search for Advisors</h3>
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
            {showFilters ? "Hide and Reset Filters" : "Show Filters"}
          </button>
        </div>

        {/* Error Display */}
        {error && <div style={styles.error}>{error}</div>}

        {/* Loading Display */}
        {loading && <div style={styles.loading}>Loading advisors...</div>}
      </div>
    </div>
  );
};

const AdvisorSection = () => {
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState({
    financialAdvisors: 133,
    commercialDueDiligence: 15,
    vendorDueDiligence: 5,
    managementTeamAdvisory: 4,
    nomad: 1,
  });

  // Fetch advisors data and counts
  const fetchAdvisors = async (page: number = 1) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("asymmetrix_auth_token");

      // Fetch advisors list
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("per_page", "50");
      params.append("Countries", JSON.stringify([]));
      params.append("Provinces", JSON.stringify([]));
      params.append("Cities", JSON.stringify([]));
      params.append("search_query", "");
      params.append("primary_sectors_ids", JSON.stringify([]));
      params.append("Secondary_sectors_ids", JSON.stringify([]));

      const advisorsUrl = `https://xdil-abvj-o7rq.e2.xano.io/api:Cd_uVQYn/get_all_advisors_list?${params.toString()}`;

      // Fetch advisors counts
      const countsParams = new URLSearchParams();
      countsParams.append("Countries", JSON.stringify([]));
      countsParams.append("Provinces", JSON.stringify([]));
      countsParams.append("Cities", JSON.stringify([]));
      countsParams.append("search_query", "");
      countsParams.append("primary_sectors_ids", JSON.stringify([]));
      countsParams.append("Secondary_sectors_ids", JSON.stringify([]));

      const countsUrl = `https://xdil-abvj-o7rq.e2.xano.io/api:Cd_uVQYn/get_all_advisors_counts?${countsParams.toString()}`;

      // Make both API calls in parallel
      const [advisorsResponse, countsResponse] = await Promise.all([
        fetch(advisorsUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }),
        fetch(countsUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }),
      ]);

      if (!advisorsResponse.ok) {
        throw new Error(
          `Advisors API request failed: ${advisorsResponse.statusText}`
        );
      }

      if (!countsResponse.ok) {
        throw new Error(
          `Counts API request failed: ${countsResponse.statusText}`
        );
      }

      const advisorsData: AdvisorsResponse = await advisorsResponse.json();
      const countsData: AdvisorsCountsResponse = await countsResponse.json();

      // Debug: Log the response structure
      console.log("Advisors API Response:", advisorsData);
      console.log("Counts API Response:", countsData);

      // Safely access advisors data with null checks
      setAdvisors(advisorsData?.items || []);

      // Safely access counts data with null checks
      setSummaryData({
        financialAdvisors:
          countsData?.lambda?.companiesByRole?.financialAdvisors || 133,
        commercialDueDiligence:
          countsData?.lambda?.companiesByRole?.commercialDueDiligence || 15,
        vendorDueDiligence:
          countsData?.lambda?.companiesByRole?.vendorDueDiligence || 5,
        managementTeamAdvisory:
          countsData?.lambda?.companiesByRole?.managementTeamAdvisory || 4,
        nomad: countsData?.lambda?.companiesByRole?.nomad || 1,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch advisors");
      console.error("Error fetching advisors:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvisors(1);
  }, []);

  const tableRows = advisors.map((advisor, index) => {
    // Truncate description for display
    const description = advisor.description || "N/A";
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
        advisor.linkedin_logo
          ? React.createElement("img", {
              src: `data:image/jpeg;base64,${advisor.linkedin_logo}`,
              alt: `${advisor.name} logo`,
              className: "advisor-logo",
              loading: "lazy",
            })
          : React.createElement(
              "div",
              {
                style: {
                  width: "50px",
                  height: "50px",
                  backgroundColor: "#f7fafc",
                  borderRadius: "50%",
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
          { className: "advisor-name" },
          advisor.name || "N/A"
        )
      ),
      React.createElement(
        "td",
        { className: "advisor-description" },
        React.createElement(
          "div",
          {
            className: "advisor-description-truncated",
            id: `description-${index}`,
            style: { display: isDescriptionLong ? "block" : "none" },
          },
          truncatedDescription
        ),
        React.createElement(
          "div",
          {
            className: "advisor-description-full",
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
      React.createElement("td", null, formatNumber(advisor.events_advised)),
      React.createElement(
        "td",
        { className: "sectors-list" },
        advisor.sectors || "N/A"
      ),
      React.createElement("td", null, formatNumber(advisor.linkedin_members)),
      React.createElement("td", null, advisor.country || "N/A")
    );
  });

  const style = `
    .advisor-section {
      padding: 32px 24px;
      border-radius: 8px;
    }
    .advisor-stats {
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
    .stats-content {
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
    .advisor-table {
      width: 100%;
      background: #fff;
      padding: 32px 24px;
      box-shadow: 0px 1px 3px 0px rgba(227, 228, 230, 1);
      border-radius: 16px;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .advisor-table th,
    .advisor-table td {
      padding: 16px;
      text-align: left;
      vertical-align: top;
      border-bottom: 1px solid #e2e8f0;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .advisor-table th {
      font-weight: 600;
      color: #1a202c;
      font-size: 14px;
      background: #f9fafb;
      border-bottom: 2px solid #e2e8f0;
    }
    .advisor-table td {
      font-size: 14px;
      color: #000;
      line-height: 1.5;
    }
    .advisor-logo {
      width: 50px;
      height: 50px;
      object-fit: cover;
      vertical-align: middle;
      border-radius: 50%;
    }
    .advisor-name {
      color: #0075df;
      text-decoration: underline;
      cursor: pointer;
      font-weight: 500;
    }
    .advisor-description {
      max-width: 300px;
      line-height: 1.4;
    }
    .advisor-description-truncated {
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
    @media (max-width: 768px) {
      .stats-content {
        grid-template-columns: repeat(2, 1fr);
        gap: 12px 16px;
      }
      .stats-title {
        font-size: 20px;
        margin-bottom: 16px;
      }
      .advisor-table {
        font-size: 12px;
      }
      .advisor-table th,
      .advisor-table td {
        padding: 8px;
        font-size: 12px;
      }
      .advisor-logo {
        width: 40px;
        height: 40px;
      }
      .advisor-description {
        max-width: 200px;
      }
      .sectors-list {
        max-width: 150px;
      }
    }
    @media (max-width: 480px) {
      .stats-content {
        grid-template-columns: 1fr;
        gap: 12px;
      }
    }
  `;

  if (loading) {
    return React.createElement(
      "div",
      { className: "advisor-section" },
      React.createElement(
        "div",
        { className: "loading" },
        "Loading advisors..."
      ),
      React.createElement("style", {
        dangerouslySetInnerHTML: { __html: style },
      })
    );
  }

  if (error) {
    return React.createElement(
      "div",
      { className: "advisor-section" },
      React.createElement("div", { className: "error" }, error),
      React.createElement("style", {
        dangerouslySetInnerHTML: { __html: style },
      })
    );
  }

  return React.createElement(
    "div",
    { className: "advisor-section" },
    // Statistics Block
    React.createElement(
      "div",
      { className: "advisor-stats" },
      React.createElement("h2", { className: "stats-title" }, "Advisors"),
      React.createElement(
        "div",
        { className: "stats-content" },
        React.createElement(
          "div",
          { className: "stats-item" },
          React.createElement(
            "span",
            { className: "stats-label" },
            "Financial Advisors"
          ),
          React.createElement(
            "span",
            { className: "stats-value" },
            summaryData.financialAdvisors.toLocaleString()
          )
        ),
        React.createElement(
          "div",
          { className: "stats-item" },
          React.createElement(
            "span",
            { className: "stats-label" },
            "Commercial Due Diligence"
          ),
          React.createElement(
            "span",
            { className: "stats-value" },
            summaryData.commercialDueDiligence.toLocaleString()
          )
        ),
        React.createElement(
          "div",
          { className: "stats-item" },
          React.createElement(
            "span",
            { className: "stats-label" },
            "Vendor Due Diligence"
          ),
          React.createElement(
            "span",
            { className: "stats-value" },
            summaryData.vendorDueDiligence.toLocaleString()
          )
        ),
        React.createElement(
          "div",
          { className: "stats-item" },
          React.createElement(
            "span",
            { className: "stats-label" },
            "Management Team Advisory"
          ),
          React.createElement(
            "span",
            { className: "stats-value" },
            summaryData.managementTeamAdvisory.toLocaleString()
          )
        ),
        React.createElement(
          "div",
          { className: "stats-item" },
          React.createElement("span", { className: "stats-label" }, "NOMAD"),
          React.createElement(
            "span",
            { className: "stats-value" },
            summaryData.nomad.toLocaleString()
          )
        )
      )
    ),
    React.createElement(
      "table",
      { className: "advisor-table" },
      React.createElement(
        "thead",
        null,
        React.createElement(
          "tr",
          null,
          React.createElement("th", null, "Logo"),
          React.createElement("th", null, "Advisor"),
          React.createElement("th", null, "Description"),
          React.createElement("th", null, "# Corporate Events Advised"),
          React.createElement("th", null, "Advised D&A Sectors"),
          React.createElement("th", null, "LinkedIn Members"),
          React.createElement("th", null, "Country")
        )
      ),
      React.createElement("tbody", null, tableRows)
    ),
    React.createElement("style", {
      dangerouslySetInnerHTML: { __html: style },
    })
  );
};

const AdvisorsPage = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <AdvisorDashboard />
      <AdvisorSection />
      <Footer />
    </div>
  );
};

export default AdvisorsPage;
