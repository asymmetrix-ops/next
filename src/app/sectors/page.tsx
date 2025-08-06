"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Types for API integration
interface Sector {
  id: number;
  sector_name: string;
  Number_of_Companies: number;
  Number_of_PE: number;
  Number_of_VC: number;
  Number_of_Public: number;
  Number_of_Private: number;
}

interface SectorsResponse {
  sectors: Sector[];
  summary?: {
    total_sectors?: number;
    total_companies?: number;
    total_pe_companies?: number;
    total_vc_companies?: number;
    total_public_companies?: number;
    total_private_companies?: number;
  };
}

// Sector Card Component for mobile
const SectorCard = ({
  sector,
  onClick,
}: {
  sector: Sector;
  onClick: () => void;
}) => {
  const formatNumber = (num: number | undefined) => {
    if (num === undefined || num === null) return "0";
    return num.toLocaleString();
  };

  return React.createElement(
    "div",
    {
      className: "sector-card",
      onClick,
      style: {
        backgroundColor: "white",
        borderRadius: "12px",
        padding: "16px",
        marginBottom: "12px",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
        cursor: "pointer",
        border: "1px solid #e2e8f0",
      },
    },
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        },
      },
      React.createElement(
        "h3",
        {
          style: {
            fontSize: "16px",
            fontWeight: "600",
            color: "#0075df",
            margin: "0",
            textDecoration: "underline",
          },
        },
        sector.sector_name || "N/A"
      ),
      React.createElement(
        "span",
        {
          style: {
            fontSize: "14px",
            fontWeight: "600",
            color: "#1a202c",
            backgroundColor: "#f7fafc",
            padding: "4px 8px",
            borderRadius: "6px",
          },
        },
        `${formatNumber(sector.Number_of_Companies)} companies`
      )
    ),
    React.createElement(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          fontSize: "12px",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            padding: "4px 0",
          },
        },
        React.createElement("span", { style: { color: "#4a5568" } }, "Public:"),
        React.createElement(
          "span",
          { style: { fontWeight: "500" } },
          formatNumber(sector.Number_of_Public)
        )
      ),
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            padding: "4px 0",
          },
        },
        React.createElement("span", { style: { color: "#4a5568" } }, "PE:"),
        React.createElement(
          "span",
          { style: { fontWeight: "500" } },
          formatNumber(sector.Number_of_PE)
        )
      ),
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            padding: "4px 0",
          },
        },
        React.createElement("span", { style: { color: "#4a5568" } }, "VC:"),
        React.createElement(
          "span",
          { style: { fontWeight: "500" } },
          formatNumber(sector.Number_of_VC)
        )
      ),
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "space-between",
            padding: "4px 0",
          },
        },
        React.createElement(
          "span",
          { style: { color: "#4a5568" } },
          "Private:"
        ),
        React.createElement(
          "span",
          { style: { fontWeight: "500" } },
          formatNumber(sector.Number_of_Private)
        )
      )
    )
  );
};

const SectorsSection = () => {
  const router = useRouter();
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSectorClick = (sectorId: number) => {
    router.push(`/sector/${sectorId}`);
  };

  const [summaryData, setSummaryData] = useState({
    primary_sectors_count: 0,
    sub_sectors_count: 0,
    top_5_primary_sectors: [] as string[],
  });

  // Fetch sectors data
  const fetchSectors = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("asymmetrix_auth_token");

      const url = `https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV/Primary_sectors_with_companies_counts`;

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

      const data: SectorsResponse = await response.json();
      setSectors(data.sectors || []);
      setSummaryData({
        primary_sectors_count: data.summary?.total_sectors || 37,
        sub_sectors_count: data.summary?.total_companies || 762,
        top_5_primary_sectors: [
          "Financial",
          "Energy & Commodities",
          "ESG",
          "Real Estate",
          "Company Data",
        ],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch sectors");
      console.error("Error fetching sectors:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSectors();
  }, []);

  const tableRows = sectors.map((sector, index) => {
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
        React.createElement(
          "span",
          {
            className: "sector-name",
            onClick: () => handleSectorClick(sector.id),
            style: {
              cursor: "pointer",
              color: "#3b82f6",
              textDecoration: "underline",
            },
          },
          sector.sector_name || "N/A"
        )
      ),
      React.createElement("td", null, formatNumber(sector.Number_of_Companies)),
      React.createElement("td", null, formatNumber(sector.Number_of_Public)),
      React.createElement("td", null, formatNumber(sector.Number_of_PE)),
      React.createElement("td", null, formatNumber(sector.Number_of_VC)),
      React.createElement("td", null, formatNumber(sector.Number_of_Private))
    );
  });

  const style = `
    .sectors-section {
      padding: 32px 24px;
      border-radius: 8px;
    }
    .sectors-stats {
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
    .top-sectors {
      margin-top: 16px;
    }
    .top-sectors-label {
      font-size: 14px;
      color: #4a5568;
      font-weight: 500;
      margin-bottom: 8px;
    }
    .top-sectors-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .top-sector-item {
      background: #f7fafc;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 12px;
      color: #4a5568;
      font-weight: 500;
    }
    .sectors-table {
      width: 100%;
      background: #fff;
      padding: 32px 24px;
      box-shadow: 0px 1px 3px 0px rgba(227, 228, 230, 1);
      border-radius: 16px;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .sectors-table th,
    .sectors-table td {
      padding: 16px;
      text-align: left;
      vertical-align: top;
      border-bottom: 1px solid #e2e8f0;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .sectors-table th {
      font-weight: 600;
      color: #1a202c;
      font-size: 14px;
      background: #f9fafb;
      border-bottom: 2px solid #e2e8f0;
    }
    .sectors-table td {
      font-size: 14px;
      color: #000;
      line-height: 1.5;
    }
    .sector-name {
      color: #0075df;
      text-decoration: underline;
      cursor: pointer;
      font-weight: 500;
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
      .sectors-section {
        padding: 16px;
      }
      .sectors-stats {
        padding: 20px 16px;
        margin-bottom: 16px;
      }
      .stats-title {
        font-size: 20px;
        margin-bottom: 16px;
      }
      .stats-item {
        padding: 8px 0;
      }
      .stats-label {
        font-size: 13px;
      }
      .stats-value {
        font-size: 14px;
      }
      .top-sectors-list {
        flex-direction: column;
      }
      .top-sector-item {
        font-size: 11px;
        padding: 3px 10px;
      }
      .sectors-table {
        display: none;
      }
      .sectors-cards {
        display: block;
      }
    }
    @media (min-width: 769px) {
      .sectors-cards {
        display: none;
      }
      .sectors-table {
        display: table;
      }
    }
  `;

  if (loading) {
    return React.createElement(
      "div",
      { className: "sectors-section" },
      React.createElement(
        "div",
        { className: "loading" },
        "Loading sectors..."
      ),
      React.createElement("style", {
        dangerouslySetInnerHTML: { __html: style },
      })
    );
  }

  if (error) {
    return React.createElement(
      "div",
      { className: "sectors-section" },
      React.createElement("div", { className: "error" }, error),
      React.createElement("style", {
        dangerouslySetInnerHTML: { __html: style },
      })
    );
  }

  return React.createElement(
    "div",
    { className: "sectors-section" },
    // Statistics Block
    React.createElement(
      "div",
      { className: "sectors-stats" },
      React.createElement("h2", { className: "stats-title" }, "Sectors"),
      React.createElement(
        "div",
        { className: "stats-content" },
        React.createElement(
          "div",
          { className: "stats-item" },
          React.createElement(
            "span",
            { className: "stats-label" },
            "Primary Sectors: "
          ),
          React.createElement(
            "span",
            { className: "stats-value" },
            summaryData.primary_sectors_count.toLocaleString()
          )
        ),
        React.createElement(
          "div",
          { className: "stats-item" },
          React.createElement(
            "span",
            { className: "stats-label" },
            "Sub-sectors: "
          ),
          React.createElement(
            "span",
            { className: "stats-value" },
            summaryData.sub_sectors_count.toLocaleString()
          )
        ),
        React.createElement(
          "div",
          { className: "top-sectors" },
          React.createElement(
            "div",
            { className: "top-sectors-label" },
            "Top 5 Primary Sectors:"
          ),
          React.createElement(
            "div",
            { className: "top-sectors-list" },
            summaryData.top_5_primary_sectors.map((sector, index) =>
              React.createElement(
                "span",
                { key: index, className: "top-sector-item" },
                sector
              )
            )
          )
        )
      )
    ),
    // Desktop Table
    React.createElement(
      "table",
      { className: "sectors-table" },
      React.createElement(
        "thead",
        null,
        React.createElement(
          "tr",
          null,
          React.createElement("th", null, "Sector Name"),
          React.createElement("th", null, "Number of Companies"),
          React.createElement("th", null, "Number of Public Companies"),
          React.createElement("th", null, "Number of PE-owned Companies"),
          React.createElement("th", null, "Number of VC-owned Companies"),
          React.createElement("th", null, "Number of Private Companies")
        )
      ),
      React.createElement("tbody", null, tableRows)
    ),
    // Mobile Cards
    React.createElement(
      "div",
      { className: "sectors-cards" },
      sectors.map((sector) =>
        React.createElement(SectorCard, {
          key: sector.id,
          sector,
          onClick: () => handleSectorClick(sector.id),
        })
      )
    ),
    React.createElement("style", {
      dangerouslySetInnerHTML: { __html: style },
    })
  );
};

const SectorsPage = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <SectorsSection />
      <Footer />
    </div>
  );
};

export default SectorsPage;
