"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Types for API integration
interface SectorDetail {
  id: number;
  sector_name: string;
  Number_of_Companies: number;
  Number_of_PE: number;
  Number_of_VC: number;
  Number_of_Public: number;
  Number_of_Private: number;
  description?: string;
}

const SectorDetailPage = () => {
  const params = useParams();
  const sectorId = params.id;

  const [sector, setSector] = useState<SectorDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch sector detail data
  const fetchSectorDetail = async () => {
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

      const data = await response.json();
      // Find the specific sector by ID
      const foundSector = data.sectors?.find(
        (s: SectorDetail) => s.id === Number(sectorId)
      );

      if (foundSector) {
        setSector(foundSector);
      } else {
        setError("Sector not found");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch sector details"
      );
      console.error("Error fetching sector details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sectorId) {
      fetchSectorDetail();
    }
  }, [sectorId]);

  const formatNumber = (num: number | undefined) => {
    if (num === undefined || num === null) return "0";
    return num.toLocaleString();
  };

  const style = `
    .sector-detail-section {
      padding: 32px 24px;
      border-radius: 8px;
    }
    .sector-detail-card {
      background: #fff;
      padding: 32px 24px;
      box-shadow: 0px 1px 3px 0px rgba(227, 228, 230, 1);
      border-radius: 16px;
      margin-bottom: 24px;
    }
    .sector-title {
      font-size: 28px;
      font-weight: 700;
      color: #1a202c;
      margin: 0 0 24px 0;
    }
    .sector-stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }
    .stat-item {
      background: #f9fafb;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
    }
    .stat-label {
      font-size: 14px;
      color: #4a5568;
      font-weight: 500;
      margin-bottom: 8px;
    }
    .stat-value {
      font-size: 24px;
      color: #000;
      font-weight: 700;
    }
    .sector-description {
      font-size: 16px;
      color: #4a5568;
      line-height: 1.6;
      margin-top: 24px;
    }
    .back-button {
      background: #0075df;
      color: white;
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      margin-bottom: 24px;
    }
    .back-button:hover {
      background: #005bb5;
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
      .sector-stats-grid {
        grid-template-columns: 1fr;
      }
      .sector-title {
        font-size: 24px;
      }
    }
  `;

  if (loading) {
    return React.createElement(
      "div",
      { className: "sector-detail-section" },
      React.createElement(
        "div",
        { className: "loading" },
        "Loading sector details..."
      ),
      React.createElement("style", {
        dangerouslySetInnerHTML: { __html: style },
      })
    );
  }

  if (error) {
    return React.createElement(
      "div",
      { className: "sector-detail-section" },
      React.createElement("div", { className: "error" }, error),
      React.createElement("style", {
        dangerouslySetInnerHTML: { __html: style },
      })
    );
  }

  if (!sector) {
    return React.createElement(
      "div",
      { className: "sector-detail-section" },
      React.createElement("div", { className: "error" }, "Sector not found"),
      React.createElement("style", {
        dangerouslySetInnerHTML: { __html: style },
      })
    );
  }

  return React.createElement(
    "div",
    { className: "sector-detail-section" },
    React.createElement(
      "button",
      {
        className: "back-button",
        onClick: () => window.history.back(),
      },
      "← Back to Sectors"
    ),
    React.createElement(
      "div",
      { className: "sector-detail-card" },
      React.createElement(
        "h1",
        { className: "sector-title" },
        sector.sector_name
      ),
      React.createElement(
        "div",
        { className: "sector-stats-grid" },
        React.createElement(
          "div",
          { className: "stat-item" },
          React.createElement(
            "div",
            { className: "stat-label" },
            "Total Companies"
          ),
          React.createElement(
            "div",
            { className: "stat-value" },
            formatNumber(sector.Number_of_Companies)
          )
        ),
        React.createElement(
          "div",
          { className: "stat-item" },
          React.createElement(
            "div",
            { className: "stat-label" },
            "Public Companies"
          ),
          React.createElement(
            "div",
            { className: "stat-value" },
            formatNumber(sector.Number_of_Public)
          )
        ),
        React.createElement(
          "div",
          { className: "stat-item" },
          React.createElement(
            "div",
            { className: "stat-label" },
            "PE Companies"
          ),
          React.createElement(
            "div",
            { className: "stat-value" },
            formatNumber(sector.Number_of_PE)
          )
        ),
        React.createElement(
          "div",
          { className: "stat-item" },
          React.createElement(
            "div",
            { className: "stat-label" },
            "VC Companies"
          ),
          React.createElement(
            "div",
            { className: "stat-value" },
            formatNumber(sector.Number_of_VC)
          )
        ),
        React.createElement(
          "div",
          { className: "stat-item" },
          React.createElement(
            "div",
            { className: "stat-label" },
            "Private Companies"
          ),
          React.createElement(
            "div",
            { className: "stat-value" },
            formatNumber(sector.Number_of_Private)
          )
        )
      ),
      sector.description &&
        React.createElement(
          "div",
          { className: "sector-description" },
          sector.description
        )
    ),
    React.createElement("style", {
      dangerouslySetInnerHTML: { __html: style },
    })
  );
};

const SectorPage = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <SectorDetailPage />
      <Footer />
    </div>
  );
};

export default SectorPage;
