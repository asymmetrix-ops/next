"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Types for API integration
interface Company {
  id: number;
  name: string;
  description: string;
  primary_sectors: string[];
  secondary_sectors: string[];
  ownership_type_id: number;
  ownership: string;
  country: string;
  linkedin_logo: string;
  linkedin_members_latest: number;
  linkedin_members_old: number;
  linkedin_members: number;
}

interface CompaniesResponse {
  result1: {
    items: Company[];
    itemsReceived: number;
    curPage: number;
    nextPage: number | null;
    prevPage: number | null;
    offset: number;
    perPage: number;
    pageTotal: number;
    ownershipCounts: {
      publicCompanies: number;
      peOwnedCompanies: number;
      vcOwnedCompanies: number;
      privateCompanies: number;
      subsidiaryCompanies: number;
    };
  };
}

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

// Utility functions
const formatNumber = (num: number | undefined): string => {
  if (num === undefined || num === null) return "0";
  return num.toLocaleString();
};

const truncateDescription = (
  description: string,
  maxLength: number = 150
): { text: string; isLong: boolean } => {
  const isLong = description.length > maxLength;
  const truncated = isLong
    ? description.substring(0, maxLength) + "..."
    : description;
  return { text: truncated, isLong };
};

// API service
const useCompaniesAPI = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    itemsReceived: 0,
    curPage: 1,
    nextPage: null as number | null,
    prevPage: null as number | null,
    offset: 0,
    perPage: 25,
    pageTotal: 0,
  });
  const [ownershipCounts, setOwnershipCounts] = useState({
    publicCompanies: 0,
    peOwnedCompanies: 0,
    vcOwnedCompanies: 0,
    privateCompanies: 0,
    subsidiaryCompanies: 0,
  });

  const fetchCompanies = useCallback(async (page: number = 1) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("asymmetrix_auth_token");
      const offset = page === 1 ? 1 : (page - 1) * 25;

      const params = new URLSearchParams();
      params.append("Offset", offset.toString());
      params.append("Per_page", "25");

      const url = `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/Get_new_companies?${params.toString()}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `API request failed: ${response.statusText} - ${errorText}`
        );
      }

      const data: CompaniesResponse = JSON.parse(await response.text());

      setCompanies(data.result1?.items || []);
      setPagination({
        itemsReceived: data.result1?.itemsReceived || 0,
        curPage: data.result1?.curPage || 1,
        nextPage: data.result1?.nextPage || null,
        prevPage: data.result1?.prevPage || null,
        offset: data.result1?.offset || 0,
        perPage: data.result1?.perPage || 25,
        pageTotal: data.result1?.pageTotal || 0,
      });

      const ownershipData = data.result1?.ownershipCounts || {};
      setOwnershipCounts({
        publicCompanies: ownershipData.publicCompanies || 0,
        peOwnedCompanies: ownershipData.peOwnedCompanies || 0,
        vcOwnedCompanies: ownershipData.vcOwnedCompanies || 0,
        privateCompanies: ownershipData.privateCompanies || 0,
        subsidiaryCompanies: ownershipData.subsidiaryCompanies || 0,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch companies"
      );
      console.error("Error fetching companies:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    companies,
    loading,
    error,
    pagination,
    ownershipCounts,
    fetchCompanies,
  };
};

// Company Logo Component
const CompanyLogo = ({ logo, name }: { logo: string; name: string }) => {
  if (logo) {
    return (
      <Image
        src={`data:image/jpeg;base64,${logo}`}
        alt={`${name} logo`}
        width={60}
        height={40}
        className="company-logo"
        style={{ objectFit: "contain" }}
      />
    );
  }

  return (
    <div
      style={{
        width: "60px",
        height: "40px",
        backgroundColor: "#f7fafc",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "10px",
        color: "#718096",
      }}
    >
      No Logo
    </div>
  );
};

// Company Description Component
const CompanyDescription = ({
  description,
  index,
}: {
  description: string;
  index: number;
}) => {
  const { text: truncatedText, isLong } = truncateDescription(description);

  const toggleDescription = () => {
    const truncatedEl = document.getElementById(`description-${index}`);
    const fullEl = document.getElementById(`description-full-${index}`);
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
  };

  return (
    <div className="company-description">
      <div
        className="company-description-truncated"
        id={`description-${index}`}
        style={{ display: isLong ? "block" : "none" }}
      >
        {truncatedText}
      </div>
      <div
        className="company-description-full"
        id={`description-full-${index}`}
        style={{ display: isLong ? "none" : "block" }}
      >
        {description}
      </div>
      {isLong && (
        <span
          className="expand-description"
          onClick={toggleDescription}
          id={`expand-${index}`}
        >
          Expand description
        </span>
      )}
    </div>
  );
};

// Filters Component
const CompanyDashboard = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = () => {
    // TODO: Implement search functionality
    console.log("Searching for:", searchTerm);
  };

  return (
    <div style={styles.container}>
      <div style={styles.maxWidth}>
        <div style={styles.card}>
          <h2 style={styles.heading}>Filters</h2>

          {showFilters && (
            <div style={styles.grid}>
              <div style={styles.gridItem}>
                <h3 style={styles.subHeading}>Location</h3>
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
                <h3 style={styles.subHeading}>Sectors</h3>
                <span style={styles.label}>By Primary Sectors</span>
                <select style={styles.select}>
                  <option value="">By Primary Sectors</option>
                </select>
                <span style={styles.label}>By Secondary Sectors</span>
                <select style={styles.select}>
                  <option value="">By Secondary Sectors</option>
                </select>
              </div>
              <div style={styles.gridItem}>
                <h3 style={styles.subHeading}>Company Details</h3>
                <span style={styles.label}>By Ownership Type</span>
                <select style={styles.select}>
                  <option value="">By Ownership Type</option>
                </select>
                <span style={styles.label}>LinkedIn Members Range</span>
                <div style={{ display: "flex", gap: "14px" }}>
                  <input
                    type="number"
                    style={styles.rangeInput}
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    style={styles.rangeInput}
                    placeholder="Max"
                  />
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: showFilters ? "20px" : "0" }}>
            <h3 style={styles.subHeading}>Search for Company</h3>
            <div style={styles.searchDiv}>
              <input
                type="text"
                placeholder="Enter company name here"
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
                Search
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
      </div>
    </div>
  );
};

// Main Companies Component
const CompanySection = () => {
  const router = useRouter();
  const {
    companies,
    loading,
    error,
    pagination,
    ownershipCounts,
    fetchCompanies,
  } = useCompaniesAPI();

  const handleCompanyClick = useCallback(
    (companyId: number) => {
      router.push(`/company/${companyId}`);
    },
    [router]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      fetchCompanies(page);
    },
    [fetchCompanies]
  );

  useEffect(() => {
    fetchCompanies(1);
  }, [fetchCompanies]);

  const tableRows = useMemo(
    () =>
      companies.map((company, index) => (
        <tr key={company.id || index}>
          <td>
            <CompanyLogo logo={company.linkedin_logo} name={company.name} />
          </td>
          <td>
            <span
              className="company-name"
              style={{
                textDecoration: "none",
                cursor: "pointer",
                color: "#3b82f6",
              }}
              onClick={() => handleCompanyClick(company.id)}
            >
              {company.name || "N/A"}
            </span>
          </td>
          <td>
            <CompanyDescription
              description={company.description || "N/A"}
              index={index}
            />
          </td>
          <td className="sectors-list">
            {company.primary_sectors?.length > 0
              ? company.primary_sectors.join(", ")
              : "N/A"}
          </td>
          <td className="sectors-list">
            {company.secondary_sectors?.length > 0
              ? company.secondary_sectors.join(", ")
              : "N/A"}
          </td>
          <td>{company.ownership || "N/A"}</td>
          <td>{formatNumber(company.linkedin_members)}</td>
          <td>{company.country || "N/A"}</td>
        </tr>
      )),
    [companies, handleCompanyClick]
  );

  const generatePaginationButtons = () => {
    const buttons = [];
    const maxVisible = 7;

    if (pagination.pageTotal <= maxVisible) {
      for (let i = 1; i <= pagination.pageTotal; i++) {
        buttons.push(
          <button
            key={i}
            className={`pagination-button ${
              i === pagination.curPage ? "active" : ""
            }`}
            onClick={() => handlePageChange(i)}
          >
            {i}
          </button>
        );
      }
    } else {
      // Always show first page
      buttons.push(
        <button
          key={1}
          className={`pagination-button ${
            1 === pagination.curPage ? "active" : ""
          }`}
          onClick={() => handlePageChange(1)}
        >
          1
        </button>
      );

      if (pagination.curPage > 3) {
        buttons.push(
          <span key="ellipsis1" className="pagination-ellipsis">
            ...
          </span>
        );
      }

      // Show pages around current
      const start = Math.max(2, pagination.curPage - 1);
      const end = Math.min(pagination.pageTotal - 1, pagination.curPage + 1);

      for (let i = start; i <= end; i++) {
        if (i > 1 && i < pagination.pageTotal) {
          buttons.push(
            <button
              key={i}
              className={`pagination-button ${
                i === pagination.curPage ? "active" : ""
              }`}
              onClick={() => handlePageChange(i)}
            >
              {i}
            </button>
          );
        }
      }

      if (pagination.curPage < pagination.pageTotal - 2) {
        buttons.push(
          <span key="ellipsis2" className="pagination-ellipsis">
            ...
          </span>
        );
      }

      // Always show last page
      if (pagination.pageTotal > 1) {
        buttons.push(
          <button
            key={pagination.pageTotal}
            className={`pagination-button ${
              pagination.pageTotal === pagination.curPage ? "active" : ""
            }`}
            onClick={() => handlePageChange(pagination.pageTotal)}
          >
            {pagination.pageTotal}
          </button>
        );
      }
    }

    return buttons;
  };

  const style = `
    .company-section {
      padding: 32px 24px;
      border-radius: 8px;
    }
    .company-stats {
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
    .company-table {
      width: 100%;
      background: #fff;
      padding: 32px 24px;
      box-shadow: 0px 1px 3px 0px rgba(227, 228, 230, 1);
      border-radius: 16px;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .company-table th,
    .company-table td {
      padding: 16px;
      text-align: left;
      vertical-align: top;
      border-bottom: 1px solid #e2e8f0;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .company-table th {
      font-weight: 600;
      color: #1a202c;
      font-size: 14px;
      background: #f9fafb;
      border-bottom: 2px solid #e2e8f0;
    }
    .company-table td {
      font-size: 14px;
      color: #000;
      line-height: 1.5;
    }
    .company-logo {
      width: 60px;
      height: 40px;
      object-fit: contain;
      vertical-align: middle;
      border-radius: 8px;
    }
    .company-name {
      color: #0075df;
      text-decoration: underline;
      cursor: pointer;
      font-weight: 500;
    }
    .company-description {
      max-width: 300px;
      line-height: 1.4;
    }
    .company-description-truncated {
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
      .company-table {
        font-size: 12px;
      }
      .company-table th,
      .company-table td {
        padding: 8px;
        font-size: 12px;
      }
      .company-logo {
        width: 40px;
        height: 30px;
      }
      .company-description {
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
      { className: "company-section" },
      React.createElement(
        "div",
        { className: "loading" },
        "Loading companies..."
      ),
      React.createElement("style", {
        dangerouslySetInnerHTML: { __html: style },
      })
    );
  }

  if (error) {
    return React.createElement(
      "div",
      { className: "company-section" },
      React.createElement("div", { className: "error" }, error),
      React.createElement("style", {
        dangerouslySetInnerHTML: { __html: style },
      })
    );
  }

  return React.createElement(
    "div",
    { className: "company-section" },
    React.createElement(
      "div",
      { className: "company-stats" },
      React.createElement("h2", { className: "stats-title" }, "Companies"),
      React.createElement(
        "div",
        { className: "stats-column" },
        React.createElement(
          "div",
          { className: "stats-item" },
          React.createElement(
            "span",
            { className: "stats-label" },
            "Companies: "
          ),
          React.createElement(
            "span",
            { className: "stats-value" },
            pagination.itemsReceived.toLocaleString()
          )
        ),
        React.createElement(
          "div",
          { className: "stats-item" },
          React.createElement(
            "span",
            { className: "stats-label" },
            "Public companies: "
          ),
          React.createElement(
            "span",
            { className: "stats-value" },
            ownershipCounts.publicCompanies.toLocaleString()
          )
        ),
        React.createElement(
          "div",
          { className: "stats-item" },
          React.createElement(
            "span",
            { className: "stats-label" },
            "PE-owned companies: "
          ),
          React.createElement(
            "span",
            { className: "stats-value" },
            ownershipCounts.peOwnedCompanies.toLocaleString()
          )
        ),
        React.createElement(
          "div",
          { className: "stats-item" },
          React.createElement(
            "span",
            { className: "stats-label" },
            "VC-owned companies: "
          ),
          React.createElement(
            "span",
            { className: "stats-value" },
            ownershipCounts.vcOwnedCompanies.toLocaleString()
          )
        ),
        React.createElement(
          "div",
          { className: "stats-item" },
          React.createElement(
            "span",
            { className: "stats-label" },
            "Private companies: "
          ),
          React.createElement(
            "span",
            { className: "stats-value" },
            ownershipCounts.privateCompanies.toLocaleString()
          )
        )
      )
    ),
    React.createElement(
      "table",
      { className: "company-table" },
      React.createElement(
        "thead",
        null,
        React.createElement(
          "tr",
          null,
          React.createElement("th", null, "Logo"),
          React.createElement("th", null, "Name"),
          React.createElement("th", null, "Description"),
          React.createElement("th", null, "Primary Sector(s)"),
          React.createElement("th", null, "Sectors"),
          React.createElement("th", null, "Ownership"),
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

// Main Page Component
const CompaniesPage = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <CompanyDashboard />
      <CompanySection />
      <Footer />
    </div>
  );
};

export default CompaniesPage;
