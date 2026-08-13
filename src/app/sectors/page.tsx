"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
// import { useRightClick } from "@/hooks/useRightClick";

// Types for API integration
interface Sector {
  id: number;
  sector_name: string;
  sector_type?: "Primary" | "Secondary" | string;
  parent_sector_names?: string | null;
  parent_sector_ids?: string | null;
  Number_of_Companies: number;
  Number_of_Sub_Sectors?: number;
  Number_of_PE: number;
  Number_of_VC: number;
  Number_of_Public: number;
  Number_of_Private: number;
  Number_of_Other: number;
}

type SortField =
  | "sector_name"
  | "Number_of_Companies"
  | "Number_of_Sub_Sectors"
  | "Number_of_Public"
  | "Number_of_PE"
  | "Number_of_VC"
  | "Number_of_Private"
  | "Number_of_Other";
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

interface ParentSectorRef {
  id: number | null;
  name: string;
}

function isPrimarySector(sector: Sector): boolean {
  if (sector.sector_type === "Primary") return true;
  if (sector.sector_type === "Secondary") return false;
  return (sector.Number_of_Sub_Sectors ?? 0) > 0;
}

function getSectorPageHref(sector: Sector): string {
  return isPrimarySector(sector)
    ? `/sector/${sector.id}`
    : `/sub-sector/${sector.id}`;
}

function parseParentSectors(sector: Sector): ParentSectorRef[] {
  const names =
    sector.parent_sector_names
      ?.split(",")
      .map((name) => name.trim())
      .filter(Boolean) ?? [];
  const ids =
    sector.parent_sector_ids
      ?.replace(/[{}]/g, "")
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id && id.toUpperCase() !== "NULL") ?? [];

  return names.map((name, index) => {
    const parsedId = ids[index] ? Number.parseInt(ids[index], 10) : Number.NaN;
    return {
      name,
      id: Number.isFinite(parsedId) ? parsedId : null,
    };
  });
}

function sortSectorsList(
  sectors: Sector[],
  sortField: SortField,
  sortDirection: SortDirection
): Sector[] {
  return [...sectors].sort((a, b) => {
    let aValue: string | number = a[sortField] ?? 0;
    let bValue: string | number = b[sortField] ?? 0;

    if (typeof aValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = (bValue as string).toLowerCase();
    }

    if (sortDirection === "asc") {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    }

    return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
  });
}

const SectorSearchResults = ({
  results,
  searchQuery,
}: {
  results: Sector[];
  searchQuery: string;
}) => {
  if (results.length === 0) {
    return (
      <div className="search-no-results">
        No sectors found matching &ldquo;{searchQuery}&rdquo;.
      </div>
    );
  }

  return (
    <div className="search-results">
      <p className="search-results-summary">
        {results.length.toLocaleString()} result
        {results.length === 1 ? "" : "s"} for &ldquo;{searchQuery}&rdquo;
      </p>
      <div className="search-results-table">
        <div className="search-results-header">
          <span>Sector</span>
          <span>Type</span>
          <span>Primary Sector(s)</span>
          <span>Companies</span>
        </div>
        {results.map((sector) => {
          const isPrimary = isPrimarySector(sector);
          const parents = parseParentSectors(sector);
          const href = getSectorPageHref(sector);

          return (
            <div key={sector.id} className="search-result-row">
              <a href={href} className="search-result-name">
                {sector.sector_name || "N/A"}
              </a>
              <span
                className={`search-result-type ${
                  isPrimary ? "primary" : "secondary"
                }`}
              >
                {isPrimary ? "Primary" : "Secondary"}
              </span>
              <span className="search-result-parents">
                {!isPrimary && parents.length > 0 ? (
                  parents.map((parent, index) => (
                    <React.Fragment key={`${parent.id ?? parent.name}-${index}`}>
                      {index > 0 ? ", " : null}
                      {parent.id ? (
                        <a href={`/sector/${parent.id}`}>{parent.name}</a>
                      ) : (
                        parent.name
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  "—"
                )}
              </span>
              <span className="search-result-companies">
                {(sector.Number_of_Companies ?? 0).toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

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
            flexWrap: "wrap" as const,
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
              padding: "6px 10px",
              borderRadius: "6px",
              display: "inline-block",
              border: "1px solid #bae6fd",
              whiteSpace: "nowrap" as const,
              maxWidth: "100%",
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
              padding: "6px 10px",
              borderRadius: "6px",
              display: "inline-block",
              border: "1px solid #bae6fd",
              whiteSpace: "nowrap" as const,
              maxWidth: "100%",
            },
          },
          `${formatNumber(sector.Number_of_Sub_Sectors || 0)} secondary sectors`
        )
      )
    ),
    React.createElement(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column" as const,
          gap: "10px",
          fontSize: "12px",
          width: "100%",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "row" as const,
            alignItems: "center" as const,
            justifyContent: "space-between" as const,
            padding: "8px",
            backgroundColor: "#f9fafb",
            borderRadius: "6px",
            width: "100%",
          },
        },
        React.createElement(
          "span",
          { style: { fontWeight: "700", fontSize: "14px", color: "#1a202c" } },
          formatNumber(sector.Number_of_Public)
        ),
        React.createElement(
          "span",
          { style: { color: "#6b7280", fontSize: "12px" } },
          "Public"
        )
      ),
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "row" as const,
            alignItems: "center" as const,
            justifyContent: "space-between" as const,
            padding: "8px",
            backgroundColor: "#f9fafb",
            borderRadius: "6px",
            width: "100%",
          },
        },
        React.createElement(
          "span",
          { style: { fontWeight: "700", fontSize: "14px", color: "#1a202c" } },
          formatNumber(sector.Number_of_PE)
        ),
        React.createElement(
          "span",
          { style: { color: "#6b7280", fontSize: "12px" } },
          "PE-owned"
        )
      ),
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "row" as const,
            alignItems: "center" as const,
            justifyContent: "space-between" as const,
            padding: "8px",
            backgroundColor: "#f9fafb",
            borderRadius: "6px",
            width: "100%",
          },
        },
        React.createElement(
          "span",
          { style: { fontWeight: "700", fontSize: "14px", color: "#1a202c" } },
          formatNumber(sector.Number_of_VC)
        ),
        React.createElement(
          "span",
          { style: { color: "#6b7280", fontSize: "12px" } },
          "VC-backed"
        )
      ),
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "row" as const,
            alignItems: "center" as const,
            justifyContent: "space-between" as const,
            padding: "8px",
            backgroundColor: "#f9fafb",
            borderRadius: "6px",
            width: "100%",
          },
        },
        React.createElement(
          "span",
          { style: { fontWeight: "700", fontSize: "14px", color: "#1a202c" } },
          formatNumber(sector.Number_of_Private)
        ),
        React.createElement(
          "span",
          { style: { color: "#6b7280", fontSize: "12px" } },
          "Private"
        )
      ),
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "row" as const,
            alignItems: "center" as const,
            justifyContent: "space-between" as const,
            padding: "8px",
            backgroundColor: "#f9fafb",
            borderRadius: "6px",
            width: "100%",
          },
        },
        React.createElement(
          "span",
          { style: { fontWeight: "700", fontSize: "14px", color: "#1a202c" } },
          formatNumber(sector.Number_of_Other)
        ),
        React.createElement(
          "span",
          { style: { color: "#6b7280", fontSize: "12px" } },
          "Other"
        )
      )
    )
  );
};

const SectorsSection = () => {
  const router = useRouter();
  const [allSectors, setAllSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("sector_name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  // Keep input separate from the applied query so we only search on button click.
  const [searchInput, setSearchInput] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const trimmedSearchQuery = searchQuery.trim();
  const isSearching = trimmedSearchQuery.length > 0;

  const primarySectors = useMemo(
    () => allSectors.filter(isPrimarySector),
    [allSectors]
  );

  const sortedPrimarySectors = useMemo(
    () => sortSectorsList(primarySectors, sortField, sortDirection),
    [primarySectors, sortField, sortDirection]
  );

  const searchResults = useMemo(() => {
    if (!isSearching) return [];

    const query = trimmedSearchQuery.toLowerCase();
    const matches = allSectors.filter((sector) =>
      sector.sector_name.toLowerCase().includes(query)
    );

    return sortSectorsList(matches, sortField, sortDirection);
  }, [allSectors, isSearching, trimmedSearchQuery, sortField, sortDirection]);

  // Fetch sector list from cache only (populated by external cache engine).
  const fetchSectors = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/sectors/list", { method: "GET" });

      if (response.status === 503) {
        setError("Sector list is not available yet. Please try again later.");
        setAllSectors([]);
        return;
      }

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data: SectorsResponse = await response.json();
      const list = data.sectors || [];
      setAllSectors(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch sectors");
      console.error("Error fetching sectors:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setSearchQuery(searchInput.trim());
  };

  useEffect(() => {
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
    .search-results {
      width: 100%;
    }
    .search-results-summary {
      margin: 0 0 12px;
      font-size: 14px;
      color: #4a5568;
    }
    .search-results-table {
      width: 100%;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      background: white;
    }
    .search-results-header,
    .search-result-row {
      display: grid;
      grid-template-columns: minmax(180px, 2fr) 120px minmax(180px, 2fr) 100px;
      gap: 16px;
      align-items: center;
      padding: 12px 16px;
    }
    .search-results-header {
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      font-size: 12px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .search-result-row {
      border-bottom: 1px solid #f1f5f9;
      font-size: 14px;
    }
    .search-result-row:last-child {
      border-bottom: none;
    }
    .search-result-row:hover {
      background: #f8fafc;
    }
    .search-result-name,
    .search-result-parents a {
      color: #0075df;
      font-weight: 600;
      text-decoration: none;
    }
    .search-result-name:hover,
    .search-result-parents a:hover {
      text-decoration: underline;
    }
    .search-result-type {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      width: fit-content;
    }
    .search-result-type.primary {
      background: #eff6ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
    }
    .search-result-type.secondary {
      background: #f5f3ff;
      color: #6d28d9;
      border: 1px solid #ddd6fe;
    }
    .search-result-parents {
      color: #334155;
    }
    .search-result-companies {
      color: #1a202c;
      font-weight: 600;
    }
    .search-no-results {
      padding: 32px 16px;
      text-align: center;
      color: #64748b;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }

    @media (max-width: 768px) {
      .sectors-section {
        padding: 16px;
      }
      .sectors-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }
      .search-results-header,
      .search-result-row {
        grid-template-columns: 1fr;
        gap: 8px;
      }
      .search-results-header {
        display: none;
      }
      .search-result-row {
        padding: 16px;
      }
      .search-result-type {
        justify-self: start;
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
          value: searchInput,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
            setSearchInput(e.target.value),
          onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") {
              handleSearch();
            }
          },
          placeholder: "Search sectors or secondary sectors",
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
            onClick: () => handleSearch(),
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
          "Number of Secondary Sectors"
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
      ),
      React.createElement(
        "option",
        { value: "Number_of_Other" },
        "Other Companies"
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
    isSearching
      ? React.createElement(SectorSearchResults, {
          results: searchResults,
          searchQuery: trimmedSearchQuery,
        })
      : React.createElement(
          "div",
          { className: "sectors-grid" },
          sortedPrimarySectors.map((sector) =>
            React.createElement(SectorCard, {
              key: sector.id,
              sector,
              href: `/sector/${sector.id}`,
              onClick: () => router.push(`/sector/${sector.id}`),
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
