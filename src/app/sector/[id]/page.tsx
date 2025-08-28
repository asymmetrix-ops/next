"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { locationsService } from "@/lib/locationsService";

// Types for API integration
interface SectorData {
  id: number;
  created_at: number;
  sector_name: string;
  Sector_importance: string;
  Related_to_primary_sectors: string[];
  company_ids: string;
  Sector_thesis: string;
}

interface SectorStatistics {
  Total_number_of_companies: number;
  Number_Of_Public_Companies: number;
  Number_Of_PE_Companies: number;
  "Number_of_VC-owned_companies": number;
  Number_of_private_companies: number;
  Number_of_subsidiaries: number;
  Sector: SectorData;
}

interface SectorCompany {
  id: number;
  name: string;
  locations_id: number;
  url: string;
  sectors: string[];
  primary_sectors: string[];
  description: string;
  linkedin_employee: number;
  linkedin_employee_latest: number;
  linkedin_employee_old: number;
  linkedin_logo: string;
  country: string;
  ownership_type_id: number;
  ownership: string;
  is_that_investor: boolean;
  companies_investors: Array<{
    company_name: string;
    original_new_company_id: number;
  }>;
}

// Response shape for the new companies endpoint used on sector page
interface NewCompanyItem {
  id: number;
  name: string;
  url?: string;
  secondary_sectors?: string[];
  primary_sectors?: string[];
  description?: string;
  linkedin_members?: number;
  linkedin_members_old?: number;
  linkedin_logo?: string;
  country?: string;
  ownership_type_id?: number;
  ownership?: string;
}

interface NewCompaniesAPIResult {
  result1?: {
    items?: Array<NewCompanyItem>;
    itemsReceived?: number;
    curPage?: number;
    nextPage?: number | null;
    prevPage?: number | null;
    offset?: number;
    perPage?: number;
    pageTotal?: number;
  };
}

// Utility functions
const formatNumber = (num: number | undefined): string => {
  if (num === undefined || num === null) return "0";
  return num.toLocaleString();
};
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

const mapSecondaryToPrimary = (
  secondaryName: string,
  apiMap: Record<string, string>
): string | undefined => {
  const key = normalizeSectorName(secondaryName);
  return apiMap[key] || FALLBACK_SECONDARY_TO_PRIMARY[key];
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
        style={{ objectFit: "contain", borderRadius: "8px" }}
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

// Company Card Component for mobile
const CompanyCard = ({
  company,
  onClick,
}: {
  company: SectorCompany;
  onClick: () => void;
}) => {
  const { text: truncatedDescription, isLong } = truncateDescription(
    company.description
  );
  const [showFullDescription, setShowFullDescription] = useState(false);

  return React.createElement(
    "div",
    {
      className: "company-card",
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
          alignItems: "flex-start",
          gap: "12px",
          marginBottom: "12px",
        },
      },
      React.createElement(CompanyLogo, {
        logo: company.linkedin_logo,
        name: company.name,
      }),
      React.createElement(
        "div",
        {
          style: {
            flex: "1",
            minWidth: "0",
          },
        },
        React.createElement(
          "h3",
          {
            style: {
              fontSize: "16px",
              fontWeight: "600",
              color: "#0075df",
              margin: "0 0 4px 0",
              textDecoration: "underline",
            },
          },
          company.name
        ),
        React.createElement(
          "div",
          {
            style: {
              fontSize: "12px",
              color: "#4a5568",
              marginBottom: "8px",
            },
          },
          company.country || "N/A"
        ),
        React.createElement(
          "div",
          {
            style: {
              fontSize: "12px",
              color: "#4a5568",
              marginBottom: "8px",
            },
          },
          `Employees: ${formatNumber(
            company.linkedin_employee_latest || company.linkedin_employee
          )}`
        ),
        React.createElement(
          "div",
          {
            style: {
              fontSize: "12px",
              color: "#4a5568",
            },
          },
          `Ownership: ${company.ownership || "N/A"}`
        )
      )
    ),
    React.createElement(
      "div",
      {
        style: {
          fontSize: "13px",
          color: "#4a5568",
          lineHeight: "1.4",
        },
      },
      showFullDescription ? company.description : truncatedDescription,
      isLong &&
        React.createElement(
          "button",
          {
            onClick: (e: React.MouseEvent) => {
              e.stopPropagation();
              setShowFullDescription(!showFullDescription);
            },
            style: {
              color: "#0075df",
              background: "none",
              border: "none",
              padding: "0",
              marginLeft: "4px",
              cursor: "pointer",
              textDecoration: "underline",
              fontSize: "12px",
            },
          },
          showFullDescription ? "Show less" : "Show more"
        )
    )
  );
};

// Main Sector Detail Component
const SectorDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const sectorId = params.id as string;

  const [sectorData, setSectorData] = useState<SectorStatistics | null>(null);
  const [companies, setCompanies] = useState<SectorCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    itemsReceived: 0,
    curPage: 1,
    nextPage: null as number | null,
    prevPage: null as number | null,
    offset: 0,
    perPage: 50,
    pageTotal: 0,
  });
  const [selectedPerPage, setSelectedPerPage] = useState(50);
  const [secondaryToPrimaryMap, setSecondaryToPrimaryMap] = useState<
    Record<string, string>
  >({});

  // Load secondary->primary mapping once
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const allSecondary =
          await locationsService.getAllSecondarySectorsWithPrimary();
        if (!cancelled && Array.isArray(allSecondary)) {
          const map: Record<string, string> = {};
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
          setSecondaryToPrimaryMap(map);
        }
      } catch (e) {
        console.warn("[Sector] Failed to load secondary->primary map", e);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch sector data
  const fetchSectorData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("asymmetrix_auth_token");

      if (!token) {
        setError("Authentication required");
        return;
      }

      const params = new URLSearchParams();
      params.append("Sector_id", sectorId);

      const response = await fetch(
        `https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV/Get_Sector?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Authentication required");
        }
        if (response.status === 404) {
          throw new Error("Sector not found");
        }
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data: SectorStatistics = await response.json();
      setSectorData(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch sector data"
      );
      console.error("Error fetching sector data:", err);
    } finally {
      setLoading(false);
    }
  }, [sectorId]);

  // Fetch companies data (include companies whose secondary sectors map to this primary sector)
  const fetchCompanies = useCallback(
    async (page: number = 1, perPageOverride?: number) => {
      setCompaniesLoading(true);
      const perPageToUse = perPageOverride || selectedPerPage;

      try {
        const token = localStorage.getItem("asymmetrix_auth_token");
        if (!token) {
          setError("Authentication required");
          setCompaniesLoading(false);
          return;
        }

        // Derive secondary sectors linked to this primary sector id
        const sectorIdNum = Number(sectorId);
        let derivedSecondaryIds: number[] = [];
        if (!Number.isNaN(sectorIdNum)) {
          try {
            const secondaries = await locationsService.getSecondarySectors([
              sectorIdNum,
            ]);
            derivedSecondaryIds = Array.isArray(secondaries)
              ? secondaries
                  .map((s) => s.id)
                  .filter((id): id is number => typeof id === "number")
              : [];
          } catch (e) {
            console.warn("[Sector] Failed to fetch secondary sectors", e);
          }
        }

        // Companies endpoint (same as Companies page) with both filters
        const params = new URLSearchParams();
        params.append("Offset", String(page)); // this API treats Offset as page number
        params.append("Per_page", String(perPageToUse));
        if (!Number.isNaN(sectorIdNum)) {
          params.append("Primary_sectors_ids[]", String(sectorIdNum));
        }
        derivedSecondaryIds.forEach((id) =>
          params.append("Secondary_sectors_ids[]", String(id))
        );
        params.append("Horizontals_ids", "");
        params.append("Min_linkedin_members", "0");
        params.append("Max_linkedin_members", "0");

        const url = `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/Get_new_companies?${params.toString()}`;
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Authentication required");
          }
          throw new Error(`API request failed: ${response.statusText}`);
        }

        // Adapt response items to SectorCompany shape used by this page
        const raw = (await response.json()) as NewCompaniesAPIResult;

        const items: NewCompanyItem[] = Array.isArray(raw.result1?.items)
          ? (raw.result1!.items as NewCompanyItem[])
          : [];
        const adapted: SectorCompany[] = items.map((c) => ({
          id: c.id,
          name: c.name,
          locations_id: 0,
          url: c.url || "",
          sectors: Array.isArray(c.secondary_sectors)
            ? c.secondary_sectors
            : [],
          primary_sectors: Array.isArray(c.primary_sectors)
            ? c.primary_sectors
            : [],
          description: c.description || "",
          linkedin_employee: c.linkedin_members || 0,
          linkedin_employee_latest: c.linkedin_members || 0,
          linkedin_employee_old: c.linkedin_members_old || 0,
          linkedin_logo: c.linkedin_logo || "",
          country: c.country || "",
          ownership_type_id: c.ownership_type_id || 0,
          ownership: c.ownership || "",
          is_that_investor: false,
          companies_investors: [],
        }));

        setCompanies(adapted);
        setPagination({
          itemsReceived: raw.result1?.itemsReceived || adapted.length,
          curPage: raw.result1?.curPage || page,
          nextPage: raw.result1?.nextPage ?? null,
          prevPage: raw.result1?.prevPage ?? null,
          offset: raw.result1?.offset || 0,
          perPage: raw.result1?.perPage || perPageToUse,
          pageTotal: raw.result1?.pageTotal || 0,
        });
      } catch (err) {
        console.error("Error fetching companies:", err);
      } finally {
        setCompaniesLoading(false);
      }
    },
    [sectorId, selectedPerPage]
  );

  useEffect(() => {
    if (sectorId) {
      fetchSectorData();
    }
  }, [fetchSectorData, sectorId]);

  useEffect(() => {
    if (sectorData) {
      fetchCompanies(1);
    }
  }, [sectorData, fetchCompanies]);

  const handlePageChange = useCallback(
    (page: number) => {
      fetchCompanies(page);
    },
    [fetchCompanies]
  );

  const handleCompanyClick = (companyId: number) => {
    console.log("Company clicked:", companyId);
    try {
      router.push(`/company/${companyId}`);
    } catch (error) {
      console.error("Navigation error:", error);
    }
  };

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

  const styles = {
    container: {
      backgroundColor: "#f9fafb",
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column" as const,
    },
    maxWidth: {
      width: "100%",
      padding: "32px",
      flex: "1",
      display: "flex",
      flexDirection: "column" as const,
    },
    header: {
      backgroundColor: "white",
      borderRadius: "12px",
      padding: "32px 24px",
      marginBottom: "24px",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    },
    breadcrumb: {
      fontSize: "14px",
      color: "#4a5568",
      marginBottom: "16px",
    },
    breadcrumbLink: {
      color: "#0075df",
      textDecoration: "underline",
      cursor: "pointer",
    },
    sectorTitle: {
      fontSize: "28px",
      fontWeight: "700",
      color: "#1a202c",
      margin: "0 0 8px 0",
    },
    sectorImportance: {
      fontSize: "16px",
      color: "#4a5568",
      margin: "0",
    },
    mainContent: {
      display: "flex",
      flexDirection: "column" as const,
      gap: "24px",
      flex: "1",
    },
    topRow: {
      display: "grid",
      gridTemplateColumns: "1fr 1.5fr",
      gap: "24px",
      alignItems: "start",
      width: "100%",
    },
    companiesSection: {
      backgroundColor: "white",
      borderRadius: "12px",
      padding: "32px 24px",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
      width: "100%",
    },
    sidebar: {
      height: "fit-content",
      flex: "0 0 20%",
      display: "flex",
      flexDirection: "column" as const,
      gap: "12px",
    },
    sidebarTitle: {
      fontSize: "14px",
      fontWeight: "600",
      color: "#1a202c",
      marginBottom: "10px",
      marginTop: "0",
    },
    companiesTitle: {
      fontSize: "20px",
      fontWeight: "600",
      color: "#1a202c",
      marginBottom: "24px",
      marginTop: "0",
    },
    statItem: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "6px 0",
      borderBottom: "1px solid #e2e8f0",
    },
    statItemLast: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "6px 0",
      borderBottom: "none",
    },
    statLabel: {
      fontSize: "12px",
      color: "#4a5568",
      fontWeight: "500",
    },
    statValue: {
      fontSize: "13px",
      color: "#1a202c",
      fontWeight: "600",
    },
    sectorBox: {
      backgroundColor: "white",
      borderRadius: "12px",
      padding: "14px",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    },
    thesis: {
      fontSize: "14px",
      color: "#4a5568",
      lineHeight: "1.6",
      marginTop: "16px",
    },
    thesisContent: {
      fontSize: "14px",
      color: "#4a5568",
      lineHeight: "1.6",
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div style={{ padding: "40px", textAlign: "center" }}>
          <div style={{ fontSize: "18px", color: "#666" }}>
            Loading sector data...
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <Header />
        <div style={{ padding: "40px", textAlign: "center" }}>
          <div style={{ fontSize: "18px", color: "#e53e3e" }}>
            {error === "Authentication required" ? (
              <div>
                <h1 style={{ fontSize: "24px", marginBottom: "16px" }}>
                  Authentication Required
                </h1>
                <p style={{ marginBottom: "24px" }}>
                  Please log in to view sector details.
                </p>
                <a
                  href="/login"
                  style={{
                    color: "#0075df",
                    textDecoration: "underline",
                    fontSize: "16px",
                  }}
                >
                  Go to Login
                </a>
              </div>
            ) : error === "Sector not found" ? (
              <div>
                <h1 style={{ fontSize: "24px", marginBottom: "16px" }}>
                  Sector Not Found
                </h1>
                <p style={{ marginBottom: "24px" }}>
                  The sector you&apos;re looking for doesn&apos;t exist or has
                  been removed.
                </p>
                <a
                  href="/sectors"
                  style={{
                    color: "#0075df",
                    textDecoration: "underline",
                    fontSize: "16px",
                  }}
                >
                  ← Back to Sectors
                </a>
              </div>
            ) : (
              <div>
                <h1 style={{ fontSize: "24px", marginBottom: "16px" }}>
                  Error Loading Sector
                </h1>
                <p style={{ marginBottom: "24px" }}>{error}</p>
                <a
                  href="/sectors"
                  style={{
                    color: "#0075df",
                    textDecoration: "underline",
                    fontSize: "16px",
                  }}
                >
                  ← Back to Sectors
                </a>
              </div>
            )}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!sectorData) {
    return null;
  }

  // Update page title when sector data is loaded
  if (typeof document !== "undefined" && sectorData?.Sector?.sector_name) {
    document.title = `Asymmetrix – ${sectorData.Sector.sector_name}`;
  }

  const tableRows = companies.map((company, index) => {
    const existingPrimary = Array.isArray(company.primary_sectors)
      ? company.primary_sectors
      : [];
    const derivedFromSectors = Array.isArray(company.sectors)
      ? company.sectors
          .map((s) => mapSecondaryToPrimary(s, secondaryToPrimaryMap))
          .filter((v): v is string => Boolean(v))
      : [];
    const primaryDisplay = Array.from(
      new Set([...existingPrimary, ...derivedFromSectors])
    );

    return (
      <tr key={company.id || index}>
        <td>
          <CompanyLogo logo={company.linkedin_logo} name={company.name} />
        </td>
        <td>
          <a
            href={`/company/${company.id}`}
            className="company-name"
            style={{ textDecoration: "none" }}
          >
            {company.name || "N/A"}
          </a>
        </td>
        <td>
          <CompanyDescription
            description={company.description || "N/A"}
            index={index}
          />
        </td>
        <td className="sectors-list">
          {company.sectors?.length > 0 ? company.sectors.join(", ") : "N/A"}
        </td>
        <td className="sectors-list">
          {primaryDisplay.length > 0 ? primaryDisplay.join(", ") : "N/A"}
        </td>
        <td>{company.ownership || "N/A"}</td>
        <td>
          {company.companies_investors?.length > 0
            ? company.companies_investors
                .map((investor) => investor.company_name)
                .join(", ")
            : "N/A"}
        </td>
        <td>{formatNumber(company.linkedin_employee_latest)}</td>
        <td>{company.country || "N/A"}</td>
      </tr>
    );
  });

  const style = `
    .company-table {
      width: 100%;
      background: #fff;
      border-collapse: collapse;
      table-layout: fixed;
    }
    /* Rebalanced column widths */
    .company-table th:nth-child(1), .company-table td:nth-child(1) { width: 6%; }   /* Logo */
    .company-table th:nth-child(2), .company-table td:nth-child(2) { width: 8%; }   /* Name (Companies) */
    .company-table th:nth-child(3), .company-table td:nth-child(3) { width: 25%; }  /* Description */
    .company-table th:nth-child(4), .company-table td:nth-child(4) { width: 14%; }  /* Sectors */
    .company-table th:nth-child(5), .company-table td:nth-child(5) { width: 14%; }  /* Primary Sectors */
    .company-table th:nth-child(6), .company-table td:nth-child(6) { width: 7%; }   /* Ownership */
    .company-table th:nth-child(7), .company-table td:nth-child(7) { width: 9%; }   /* Investors */
    /* LinkedIn Members */
    .company-table th:nth-child(8) { width: 6%; white-space: normal; }
    .company-table td:nth-child(8) { width: 6%; white-space: nowrap; text-align: right; }
    .company-table th:nth-child(9), .company-table td:nth-child(9) { width: 11%; white-space: nowrap; }   /* Country */
    .company-table th,
    .company-table td {
      padding: 12px 14px;
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
      max-width: 100%;
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
      .main-content {
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important;
      }
      .top-row { display: grid !important; grid-template-columns: 1fr !important; gap: 12px !important; }
      .companies-section { flex: none !important; width: 100% !important; order: 2 !important; }
      .companies-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
      .companies-controls { flex-direction: column !important; align-items: flex-start !important; gap: 8px !important; }
      .company-table { display: none; }
      .company-cards { display: block; }
      .company-logo { width: 40px; height: 30px; }
      .company-description { max-width: 100%; }
      .sectors-list { max-width: 150px; }
    }
    @media (min-width: 769px) { .company-cards { display: none; } .company-table { display: table; } }
  `;

  return (
    <div className="min-h-screen" style={styles.container}>
      <Header />
      <div className="max-width" style={styles.maxWidth}>
        {/* Header Section */}
        <div className="header" style={styles.header}>
          <div style={styles.breadcrumb}>
            <a href="/sectors" style={styles.breadcrumbLink}>
              Sectors
            </a>{" "}
            &gt; {sectorData.Sector.sector_name}
          </div>
          <h1 className="sector-title" style={styles.sectorTitle}>
            {sectorData.Sector.sector_name}
          </h1>
          <p style={styles.sectorImportance}>
            {sectorData.Sector.Sector_importance} Sector
          </p>
        </div>

        {/* Main Content */}
        <div className="main-content" style={styles.mainContent}>
          {/* Top Row: Statistics + Thesis (full width row, two columns inside) */}
          <div className="top-row" style={styles.topRow}>
            {/* Sector Statistics Box */}
            <div className="statistics-box" style={styles.sectorBox}>
              <h2 className="sidebar-title" style={styles.sidebarTitle}>
                Sector Statistics
              </h2>
              <div style={styles.statItem}>
                <span style={styles.statLabel}>Total companies:</span>
                <span style={styles.statValue}>
                  {formatNumber(sectorData.Total_number_of_companies)}
                </span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statLabel}>Public companies:</span>
                <span style={styles.statValue}>
                  {formatNumber(sectorData.Number_Of_Public_Companies)}
                </span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statLabel}>PE companies:</span>
                <span style={styles.statValue}>
                  {formatNumber(sectorData.Number_Of_PE_Companies)}
                </span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statLabel}>VC-owned companies:</span>
                <span style={styles.statValue}>
                  {formatNumber(sectorData["Number_of_VC-owned_companies"])}
                </span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statLabel}>Private companies:</span>
                <span style={styles.statValue}>
                  {formatNumber(sectorData.Number_of_private_companies)}
                </span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statLabel}>Subsidiaries:</span>
                <span style={styles.statValue}>
                  {formatNumber(sectorData.Number_of_subsidiaries)}
                </span>
              </div>
            </div>

            {/* Sector Thesis Box */}
            <div className="thesis-box" style={styles.sectorBox}>
              <h2 className="sidebar-title" style={styles.sidebarTitle}>
                Sector Thesis
              </h2>
              {sectorData.Sector.Sector_thesis ? (
                <div
                  style={styles.thesisContent}
                  className="sector-thesis"
                  dangerouslySetInnerHTML={{
                    __html: sectorData.Sector.Sector_thesis,
                  }}
                />
              ) : (
                <div
                  style={{
                    ...styles.thesisContent,
                    fontStyle: "italic",
                    color: "#9ca3af",
                  }}
                >
                  Not available
                </div>
              )}
            </div>
          </div>

          {/* Companies Section (full width row) */}
          <div className="companies-section" style={styles.companiesSection}>
            <div
              className="companies-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "24px",
              }}
            >
              <h2 className="companies-title" style={styles.companiesTitle}>
                Companies in {sectorData.Sector.sector_name} Sector
              </h2>
              {pagination.pageTotal > 0 && (
                <div
                  className="companies-controls"
                  style={{ display: "flex", alignItems: "center", gap: "16px" }}
                >
                  <div style={{ fontSize: "14px", color: "#666" }}>
                    Showing {pagination.offset + 1} -{" "}
                    {Math.min(
                      pagination.offset + pagination.perPage,
                      sectorData.Total_number_of_companies
                    )}{" "}
                    of {formatNumber(sectorData.Total_number_of_companies)}{" "}
                    companies
                    {pagination.pageTotal > 1 && (
                      <span style={{ marginLeft: "8px" }}>
                        (Page {pagination.curPage} of {pagination.pageTotal})
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span style={{ fontSize: "14px", color: "#666" }}>
                      Show:
                    </span>
                    <select
                      value={selectedPerPage}
                      onChange={(e) => {
                        const newPerPage = parseInt(e.target.value);
                        setSelectedPerPage(newPerPage);
                        fetchCompanies(1, newPerPage);
                      }}
                      style={{
                        padding: "4px 8px",
                        border: "1px solid #d1d5db",
                        borderRadius: "4px",
                        fontSize: "14px",
                      }}
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={200}>200</option>
                      <option value={500}>500</option>
                    </select>
                    <span style={{ fontSize: "14px", color: "#666" }}>
                      per page
                    </span>
                  </div>
                </div>
              )}
            </div>

            {companiesLoading ? (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <div style={{ fontSize: "18px", color: "#666" }}>
                  Loading companies...
                </div>
              </div>
            ) : companies.length > 0 ? (
              <>
                {/* Desktop Table */}
                <table className="company-table">
                  <thead>
                    <tr>
                      <th>Logo</th>
                      <th>Name</th>
                      <th>Description</th>
                      <th>Sectors</th>
                      <th>Primary Sectors</th>
                      <th>Ownership</th>
                      <th>Investors</th>
                      <th>LinkedIn Members</th>
                      <th>Country</th>
                    </tr>
                  </thead>
                  <tbody>{tableRows}</tbody>
                </table>

                {/* Mobile Cards */}
                <div className="company-cards">
                  {companies.map((company) => (
                    <CompanyCard
                      key={company.id}
                      company={company}
                      onClick={() => handleCompanyClick(company.id)}
                    />
                  ))}
                </div>

                {pagination.pageTotal > 1 && (
                  <div className="pagination">
                    {pagination.prevPage && (
                      <button
                        className="pagination-button"
                        onClick={() => handlePageChange(pagination.prevPage!)}
                        style={{
                          padding: "8px 16px",
                          marginRight: "8px",
                          border: "1px solid #0075df",
                          background: "white",
                          color: "#0075df",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        ← Previous
                      </button>
                    )}
                    {generatePaginationButtons()}
                    {pagination.nextPage && (
                      <button
                        className="pagination-button"
                        onClick={() => handlePageChange(pagination.nextPage!)}
                        style={{
                          padding: "8px 16px",
                          marginLeft: "8px",
                          border: "1px solid #0075df",
                          background: "white",
                          color: "#0075df",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        Next →
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <div style={{ fontSize: "18px", color: "#666" }}>
                  No companies found in this sector.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
      <style
        dangerouslySetInnerHTML={{
          __html:
            style +
            `\n.sector-thesis ul{list-style:disc;margin:0 0 1rem 1.25rem;padding-left:1.25rem;}\n.sector-thesis ol{list-style:decimal;margin:0 0 1rem 1.25rem;padding-left:1.25rem;}\n.sector-thesis li{margin-bottom:.5rem;}\n.sector-thesis h1,.sector-thesis h2,.sector-thesis h3{margin:1rem 0 .5rem;font-weight:700;}\n.sector-thesis a{color:#2563eb;text-decoration:underline;}`,
        }}
      />
    </div>
  );
};

const SectorPage = () => {
  return <SectorDetailPage />;
};

export default SectorPage;
