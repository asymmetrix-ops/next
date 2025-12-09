"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { locationsService } from "@/lib/locationsService";
// import { useRightClick } from "@/hooks/useRightClick";

// Types for API integration
interface Sector {
  id: number;
  sector_name: string;
  Number_of_Companies: number;
  Number_of_Sub_Sectors?: number;
  Number_of_PE: number;
  Number_of_VC: number;
  Number_of_Public: number;
  Number_of_Private: number;
}

type SortField =
  | "sector_name"
  | "Number_of_Companies"
  | "Number_of_Sub_Sectors"
  | "Number_of_Public"
  | "Number_of_PE"
  | "Number_of_VC"
  | "Number_of_Private";
type SortDirection = "asc" | "desc";

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

// Sector Card Component - larger boxes for primary sectors
const SectorCard = ({
  sector,
  onClick,
  href,
}: {
  sector: Sector;
  onClick: () => void;
  href: string;
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
        padding: "20px 16px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
        cursor: "pointer",
        border: "1px solid #e2e8f0",
        transition: "all 0.2s ease",
        height: "100%",
        display: "flex",
        flexDirection: "column" as const,
        minWidth: 0,
        maxWidth: "100%",
        boxSizing: "border-box" as const,
        overflow: "hidden",
      },
    },
    React.createElement(
      "div",
      {
        style: {
          marginBottom: "12px",
        },
      },
      React.createElement(
        "a",
        {
          href,
          style: {
            fontSize: "16px",
            fontWeight: "700",
            margin: "0",
            display: "block",
            color: "#0075df",
            textDecoration: "none",
            marginBottom: "8px",
          },
        },
        sector.sector_name || "N/A"
      ),
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            gap: "8px",
            flexWrap: "nowrap" as const,
            alignItems: "center",
            minWidth: 0,
            width: "100%",
          },
        },
        React.createElement(
          "div",
          {
            style: {
              fontSize: "12px",
              fontWeight: "600",
              color: "#1a202c",
              backgroundColor: "#f0f9ff",
              padding: "6px 12px",
              borderRadius: "6px",
              display: "inline-block",
              border: "1px solid #bae6fd",
              whiteSpace: "nowrap" as const,
              flexShrink: 0,
            },
          },
          `${formatNumber(sector.Number_of_Companies)} companies`
        ),
        React.createElement(
          "div",
          {
            style: {
              fontSize: "12px",
              fontWeight: "600",
              color: "#1a202c",
              backgroundColor: "#f0f9ff",
              padding: "6px 12px",
              borderRadius: "6px",
              display: "inline-block",
              border: "1px solid #bae6fd",
              whiteSpace: "nowrap" as const,
              flexShrink: 0,
            },
          },
          `${formatNumber(sector.Number_of_Sub_Sectors || 0)} sub-sectors`
        )
      )
    ),
    React.createElement(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
          fontSize: "12px",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column" as const,
            padding: "8px",
            backgroundColor: "#f9fafb",
            borderRadius: "6px",
          },
        },
        React.createElement(
          "span",
          { style: { color: "#6b7280", marginBottom: "2px", fontSize: "10px" } },
          "Public"
        ),
        React.createElement(
          "span",
          { style: { fontWeight: "700", fontSize: "14px", color: "#1a202c" } },
          formatNumber(sector.Number_of_Public)
        )
      ),
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column" as const,
            padding: "8px",
            backgroundColor: "#f9fafb",
            borderRadius: "6px",
          },
        },
        React.createElement(
          "span",
          { style: { color: "#6b7280", marginBottom: "2px", fontSize: "10px" } },
          "PE-owned"
        ),
        React.createElement(
          "span",
          { style: { fontWeight: "700", fontSize: "14px", color: "#1a202c" } },
          formatNumber(sector.Number_of_PE)
        )
      ),
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column" as const,
            padding: "8px",
            backgroundColor: "#f9fafb",
            borderRadius: "6px",
          },
        },
        React.createElement(
          "span",
          { style: { color: "#6b7280", marginBottom: "2px", fontSize: "10px" } },
          "VC-backed"
        ),
        React.createElement(
          "span",
          { style: { fontWeight: "700", fontSize: "14px", color: "#1a202c" } },
          formatNumber(sector.Number_of_VC)
        )
      ),
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column" as const,
            padding: "8px",
            backgroundColor: "#f9fafb",
            borderRadius: "6px",
          },
        },
        React.createElement(
          "span",
          { style: { color: "#6b7280", marginBottom: "2px", fontSize: "10px" } },
          "Private"
        ),
        React.createElement(
          "span",
          { style: { fontWeight: "700", fontSize: "14px", color: "#1a202c" } },
          formatNumber(sector.Number_of_Private)
        )
      )
    )
  );
};

// Helpers
const normalizeSectorName = (name: string | undefined | null): string =>
  (name || "").trim().toLowerCase();

const SectorsSection = () => {
  const router = useRouter();
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("sector_name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [searchTerm, setSearchTerm] = useState<string>("");
  // Preload mapping for potential downstream use; currently not used directly on this page
  const [, setSecondaryToPrimaryMap] = useState<Record<string, string>>({});

  const handleSectorClick = (sectorId: number) => {
    const basePath = `/sector/${sectorId}`;
    const href =
      searchTerm.trim().length > 0 ? `${basePath}?tab=subsectors` : basePath;
    router.push(href);
  };

  // Sort sectors
  const sortedSectors = [...sectors].sort((a, b) => {
    let aValue: string | number = a[sortField] ?? 0;
    let bValue: string | number = b[sortField] ?? 0;

    if (typeof aValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = (bValue as string).toLowerCase();
    }

    if (sortDirection === "asc") {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  // Fetch sectors data
  const fetchSectors = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("asymmetrix_auth_token");

      const baseUrl = `https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV/Primary_sectors_with_companies_counts`;

      const url =
        searchTerm.trim().length > 0
          ? `${baseUrl}?search=${encodeURIComponent(searchTerm.trim())}&sort=`
          : baseUrl;

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch sectors");
      console.error("Error fetching sectors:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load mapping in background (used for counts enrichment if needed later)
    (async () => {
      try {
        const allSecondary =
          await locationsService.getAllSecondarySectorsWithPrimary();
        const map: Record<string, string> = {};
        if (Array.isArray(allSecondary)) {
          for (const sec of allSecondary) {
            const secName = (sec as { sector_name?: string }).sector_name;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const primary = (sec as any)?.related_primary_sector as
              | { sector_name?: string }
              | undefined;
            const primaryName = primary?.sector_name;
            if (secName && primaryName) {
              map[normalizeSectorName(secName)] = primaryName;
            }
          }
        }
        setSecondaryToPrimaryMap(map);
      } catch {
        // best-effort; ignore mapping load errors here
      }
    })();
    fetchSectors();
  }, []);


  const style = `
    * {
      box-sizing: border-box;
    }
    .sectors-section {
      padding: 32px 24px;
      border-radius: 8px;
      max-width: 1600px;
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
      overflow-x: hidden;
    }
    .sectors-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
      width: 100%;
      box-sizing: border-box;
    }
    .sector-card {
      min-width: 0;
      max-width: 100%;
      box-sizing: border-box;
    }
    .sector-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
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
      .sectors-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }
    }
    @media (min-width: 769px) and (max-width: 1024px) {
      .sectors-grid {
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
      }
    }
    @media (min-width: 1025px) and (max-width: 1399px) {
      .sectors-grid {
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;
      }
    }
    @media (min-width: 1400px) {
      .sectors-grid {
        grid-template-columns: repeat(5, 1fr);
        gap: 16px;
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
    // Search + Sort Controls
    React.createElement(
      "div",
      {
        className: "sort-controls",
        style: {
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap" as const,
          width: "100%",
          maxWidth: "100%",
        },
      },
      // Search input
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexGrow: 1,
            minWidth: "240px",
          },
        },
        React.createElement("input", {
          type: "text",
          value: searchTerm,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
            setSearchTerm(e.target.value),
          onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") {
              fetchSectors();
            }
          },
          placeholder: "Search sectors or sub-sectors",
          style: {
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            backgroundColor: "white",
            fontSize: "14px",
            flexGrow: 1,
            minWidth: "0",
          },
        }),
        React.createElement(
          "button",
          {
            onClick: () => fetchSectors(),
            style: {
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              backgroundColor: "#0075df",
              color: "white",
              fontSize: "14px",
              cursor: "pointer",
              fontWeight: "500",
              whiteSpace: "nowrap",
            },
          },
          "Search"
        )
      ),
      // Sort controls
      React.createElement(
        "span",
        {
          style: {
            fontSize: "14px",
            fontWeight: "600",
            color: "#4a5568",
          },
        },
        "Sort by:"
      ),
      React.createElement(
        "select",
        {
          value: sortField,
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
            const newField = e.target.value as SortField;
            if (sortField === newField) {
              setSortDirection(sortDirection === "asc" ? "desc" : "asc");
            } else {
              setSortField(newField);
              setSortDirection("desc");
            }
          },
          style: {
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            backgroundColor: "white",
            fontSize: "14px",
            cursor: "pointer",
            outline: "none",
          },
        },
        React.createElement("option", { value: "sector_name" }, "Sector Name"),
        React.createElement(
          "option",
          { value: "Number_of_Companies" },
          "Number of Companies"
        ),
        React.createElement(
          "option",
          { value: "Number_of_Sub_Sectors" },
          "Number of Sub-Sectors"
        ),
        React.createElement(
          "option",
          { value: "Number_of_Public" },
          "Public Companies"
        ),
        React.createElement(
          "option",
          { value: "Number_of_PE" },
          "PE-owned Companies"
        ),
        React.createElement(
          "option",
          { value: "Number_of_VC" },
          "VC-backed Companies"
        ),
        React.createElement(
          "option",
          { value: "Number_of_Private" },
          "Private Companies"
        )
      ),
      React.createElement(
        "button",
        {
          onClick: () =>
            setSortDirection(sortDirection === "asc" ? "desc" : "asc"),
          style: {
            padding: "8px 16px",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            backgroundColor: "white",
            fontSize: "14px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            fontWeight: "500",
          },
        },
        sortDirection === "asc" ? "↑ Ascending" : "↓ Descending"
      )
    ),
    // Sectors Grid (replaces table, shows on all screen sizes)
    React.createElement(
      "div",
      { className: "sectors-grid" },
      sortedSectors.map((sector) =>
        React.createElement(SectorCard, {
          key: sector.id,
          sector,
          href:
            searchTerm.trim().length > 0
              ? `/sector/${sector.id}?tab=subsectors`
              : `/sector/${sector.id}`,
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
