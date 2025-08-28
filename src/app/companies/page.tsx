"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { locationsService } from "@/lib/locationsService";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { CompaniesCSVExporter } from "@/utils/companiesCSVExport";

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

interface HybridBusinessFocus {
  id: number;
  business_focus: string;
}

interface OwnershipType {
  id: number;
  ownership: string;
}

interface Filters {
  countries: string[];
  provinces: string[];
  cities: string[];
  primarySectors: number[]; // Changed from string[] to number[]
  secondarySectors: number[]; // Changed from string[] to number[]
  hybridBusinessFocuses: number[];
  ownershipTypes: number[]; // Changed from string[] to number[]
  linkedinMembersMin: number | null;
  linkedinMembersMax: number | null;
  searchQuery: string;
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
  maxLength: number = 250
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
  const lastRequestIdRef = useRef(0);
  const [currentFilters, setCurrentFilters] = useState<Filters | undefined>(
    undefined
  ); // Track current filters
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

  const fetchCompanies = useCallback(
    async (page: number = 1, filters?: Filters) => {
      setLoading(true);
      setError(null);

      // Update current filters if new filters are provided
      if (filters !== undefined) {
        setCurrentFilters(filters);
      }

      // Use current filters if no filters provided (for pagination)
      const filtersToUse = filters !== undefined ? filters : currentFilters;

      try {
        const token = localStorage.getItem("asymmetrix_auth_token");

        // Companies endpoint: Per_page is static; Offset is literally the page number clicked
        const perPage = 25;
        const offset = page; // 1-based page number

        const params = new URLSearchParams();
        params.append("Offset", offset.toString());
        params.append("Per_page", perPage.toString());

        // Add filters to the request using API's expected param names
        if (filtersToUse) {
          // If primary sectors are selected, include their linked secondary sectors automatically
          let derivedSecondaryIds: number[] = [];
          if (filtersToUse.primarySectors.length > 0) {
            try {
              const secondaryFromPrimary =
                await locationsService.getSecondarySectors(
                  filtersToUse.primarySectors
                );
              derivedSecondaryIds = Array.isArray(secondaryFromPrimary)
                ? secondaryFromPrimary
                    .map((s) => s.id)
                    .filter((id): id is number => typeof id === "number")
                : [];
            } catch (e) {
              console.warn(
                "[Companies] Failed to derive secondary sectors from primaries",
                e
              );
            }
          }
          if (filtersToUse.countries.length > 0) {
            filtersToUse.countries.forEach((country) => {
              params.append("Countries[]", country);
            });
          }
          if (filtersToUse.provinces.length > 0) {
            filtersToUse.provinces.forEach((province) => {
              params.append("Provinces[]", province);
            });
          }
          if (filtersToUse.cities.length > 0) {
            filtersToUse.cities.forEach((city) => {
              params.append("Cities[]", city);
            });
          }
          if (filtersToUse.primarySectors.length > 0) {
            filtersToUse.primarySectors.forEach((sectorId) => {
              params.append("Primary_sectors_ids[]", sectorId.toString());
            });
          }
          {
            const combinedSecondary = Array.from(
              new Set([
                ...derivedSecondaryIds,
                ...(filtersToUse.secondarySectors || []),
              ])
            );
            if (combinedSecondary.length > 0) {
              combinedSecondary.forEach((sectorId) => {
                params.append("Secondary_sectors_ids[]", sectorId.toString());
              });
            }
          }
          if (filtersToUse.ownershipTypes.length > 0) {
            filtersToUse.ownershipTypes.forEach((ownershipTypeId) => {
              params.append(
                "Ownership_types_ids[]",
                ownershipTypeId.toString()
              );
            });
          }
          if (filtersToUse.hybridBusinessFocuses.length > 0) {
            filtersToUse.hybridBusinessFocuses.forEach((focusId) => {
              params.append("Hybrid_Data_ids[]", focusId.toString());
            });
          }
          // Optional: Horizontals_ids
          params.append("Horizontals_ids", "");

          // Always send min/max as numbers (default 0)
          params.append(
            "Min_linkedin_members",
            (filtersToUse.linkedinMembersMin ?? 0).toString()
          );
          params.append(
            "Max_linkedin_members",
            (filtersToUse.linkedinMembersMax ?? 0).toString()
          );
          if (filtersToUse.searchQuery) {
            params.append("query", filtersToUse.searchQuery);
          }
        } else {
          // Defaults when no filters present
          params.append("Min_linkedin_members", "0");
          params.append("Max_linkedin_members", "0");
          params.append("Horizontals_ids", "");
        }

        const url = `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/Get_new_companies?${params.toString()}`;
        console.log("[Companies] Fetch URL:", url);

        const requestId = ++lastRequestIdRef.current;

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
        console.log("[Companies] Response keys:", Object.keys(data || {}));
        const dataAny = data as unknown as {
          result1?: Record<string, unknown>;
        };
        if (dataAny?.result1) {
          console.log(
            "[Companies] result1 keys:",
            Object.keys(dataAny.result1 || {})
          );
        }

        // Ignore stale responses
        if (requestId === lastRequestIdRef.current) {
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
        } else {
          console.log(
            "[Companies] Ignoring stale response for request",
            requestId
          );
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch companies"
        );
        console.error("Error fetching companies:", err);
      } finally {
        setLoading(false);
      }
    },
    [currentFilters]
  );

  return {
    companies,
    loading,
    error,
    pagination,
    ownershipCounts,
    fetchCompanies,
    currentFilters,
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

// Helpers for sector mapping fallbacks and normalization
const normalizeSectorName = (name: string | undefined | null): string => {
  return (name || "").trim().toLowerCase();
};

const FALLBACK_SECONDARY_TO_PRIMARY: Record<string, string> = {
  [normalizeSectorName("Crypto")]: "Web 3",
  [normalizeSectorName("Blockchain")]: "Web 3",
  [normalizeSectorName("DeFi")]: "Web 3",
  [normalizeSectorName("NFT")]: "Web 3",
  [normalizeSectorName("Web3")]: "Web 3",
  [normalizeSectorName("Business Intelligence")]: "Data Analytics",
  [normalizeSectorName("Data Science")]: "Data Analytics",
  [normalizeSectorName("Machine Learning")]: "Data Analytics",
  [normalizeSectorName("AI")]: "Data Analytics",
  [normalizeSectorName("Analytics")]: "Data Analytics",
  [normalizeSectorName("Big Data")]: "Data Analytics",
  [normalizeSectorName("Cloud Computing")]: "Infrastructure",
  [normalizeSectorName("SaaS")]: "Software",
  [normalizeSectorName("Cybersecurity")]: "Security",
  [normalizeSectorName("FinTech")]: "Financial Services",
  [normalizeSectorName("InsurTech")]: "Financial Services",
  [normalizeSectorName("PropTech")]: "Real Estate",
  [normalizeSectorName("HealthTech")]: "Healthcare",
  [normalizeSectorName("EdTech")]: "Education",
  [normalizeSectorName("LegalTech")]: "Legal",
  [normalizeSectorName("HRTech")]: "Human Resources",
  [normalizeSectorName("MarTech")]: "Marketing",
  [normalizeSectorName("AdTech")]: "Advertising",
  [normalizeSectorName("Gaming")]: "Entertainment",
  [normalizeSectorName("E-commerce")]: "Retail",
  [normalizeSectorName("Logistics")]: "Supply Chain",
  [normalizeSectorName("IoT")]: "Internet of Things",
  [normalizeSectorName("Robotics")]: "Automation",
};

const mapSecondaryToPrimary = (
  secondaryName: string,
  apiMap: Record<string, string>
): string | undefined => {
  const key = normalizeSectorName(secondaryName);
  // Prefer API-driven map first (with normalized lookup)
  const apiValue = apiMap[key] || apiMap[secondaryName];
  if (apiValue) return apiValue;
  // Fallback static map
  return FALLBACK_SECONDARY_TO_PRIMARY[key];
};

// Company Card Component for Mobile
const CompanyCard = ({
  company,
  index,
  secondaryToPrimaryMap,
}: {
  company: Company;
  index: number;
  secondaryToPrimaryMap: Record<string, string>;
}) => {
  const router = useRouter();

  const handleCompanyClick = () => {
    router.push(`/company/${company.id}`);
  };

  const toggleDescription = () => {
    const truncatedEl = document.getElementById(`card-description-${index}`);
    const fullEl = document.getElementById(`card-description-full-${index}`);
    const expandEl = document.getElementById(`card-expand-${index}`);

    if (truncatedEl && fullEl && expandEl) {
      if (truncatedEl.style.display === "block") {
        truncatedEl.style.display = "none";
        fullEl.style.display = "block";
        expandEl.textContent = "Show less";
      } else {
        truncatedEl.style.display = "block";
        fullEl.style.display = "none";
        expandEl.textContent = "Show more";
      }
    }
  };

  const { text: truncatedText, isLong } = truncateDescription(
    company.description || "N/A"
  );

  // Compute primary sectors by combining existing primaries with primaries derived from secondaries
  const computedPrimarySectors = React.useMemo(() => {
    const existing = Array.isArray(company.primary_sectors)
      ? company.primary_sectors
      : [];
    const derived = Array.isArray(company.secondary_sectors)
      ? company.secondary_sectors
          .map((name) => mapSecondaryToPrimary(name, secondaryToPrimaryMap))
          .filter((v): v is string => Boolean(v))
      : [];
    return Array.from(new Set([...existing, ...derived]));
  }, [
    company.primary_sectors,
    company.secondary_sectors,
    secondaryToPrimaryMap,
  ]);

  return React.createElement(
    "div",
    { className: "company-card" },
    React.createElement(
      "div",
      { className: "company-card-header" },
      company.linkedin_logo
        ? React.createElement("img", {
            src: `data:image/jpeg;base64,${company.linkedin_logo}`,
            alt: `${company.name} logo`,
            className: "company-card-logo",
            onError: (e: React.SyntheticEvent<HTMLImageElement>) => {
              (e.target as HTMLImageElement).style.display = "none";
            },
          })
        : React.createElement(
            "div",
            { className: "company-card-logo-placeholder" },
            "No Logo"
          ),
      React.createElement(
        "span",
        {
          className: "company-card-name",
          onClick: handleCompanyClick,
        },
        company.name || "N/A"
      )
    ),
    React.createElement(
      "div",
      { className: "company-card-content" },
      React.createElement(
        "div",
        { className: "company-card-row" },
        React.createElement(
          "span",
          { className: "company-card-label" },
          "Primary Sectors:"
        ),
        React.createElement(
          "span",
          { className: "company-card-value" },
          computedPrimarySectors.length > 0
            ? computedPrimarySectors.join(", ")
            : "N/A"
        )
      ),
      React.createElement(
        "div",
        { className: "company-card-row" },
        React.createElement(
          "span",
          { className: "company-card-label" },
          "Secondary Sectors:"
        ),
        React.createElement(
          "span",
          { className: "company-card-value" },
          company.secondary_sectors?.length > 0
            ? company.secondary_sectors.join(", ")
            : "N/A"
        )
      ),
      React.createElement(
        "div",
        { className: "company-card-row" },
        React.createElement(
          "span",
          { className: "company-card-label" },
          "Ownership:"
        ),
        React.createElement(
          "span",
          { className: "company-card-value" },
          company.ownership || "N/A"
        )
      ),
      React.createElement(
        "div",
        { className: "company-card-row" },
        React.createElement(
          "span",
          { className: "company-card-label" },
          "LinkedIn Members:"
        ),
        React.createElement(
          "span",
          { className: "company-card-value" },
          formatNumber(company.linkedin_members)
        )
      ),
      React.createElement(
        "div",
        { className: "company-card-row" },
        React.createElement(
          "span",
          { className: "company-card-label" },
          "Country:"
        ),
        React.createElement(
          "span",
          { className: "company-card-value" },
          company.country || "N/A"
        )
      ),
      React.createElement(
        "div",
        { className: "company-card-description" },
        React.createElement(
          "div",
          {
            className: "company-card-description-truncated",
            id: `card-description-${index}`,
            style: { display: isLong ? "block" : "none" },
          },
          truncatedText
        ),
        React.createElement(
          "div",
          {
            id: `card-description-full-${index}`,
            style: { display: isLong ? "none" : "block" },
          },
          company.description || "N/A"
        ),
        isLong &&
          React.createElement(
            "span",
            {
              className: "company-card-expand",
              onClick: toggleDescription,
              id: `card-expand-${index}`,
            },
            "Show more"
          )
      )
    )
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
const CompanyDashboard = ({
  onSearch,
  initialSearch,
}: {
  onSearch?: (filters: Filters) => void;
  initialSearch?: string;
}) => {
  const [searchTerm, setSearchTerm] = useState(initialSearch || "");
  const [showFilters, setShowFilters] = useState(false);

  // Filter data state
  const [countries, setCountries] = useState<Country[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [primarySectors, setPrimarySectors] = useState<PrimarySector[]>([]);
  const [secondarySectors, setSecondarySectors] = useState<SecondarySector[]>(
    []
  );
  const [hybridBusinessFocuses, setHybridBusinessFocuses] = useState<
    HybridBusinessFocus[]
  >([]);
  const [ownershipTypes, setOwnershipTypes] = useState<OwnershipType[]>([]);

  // Selected filters state
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedPrimarySectors, setSelectedPrimarySectors] = useState<
    number[]
  >([]);
  const [selectedSecondarySectors, setSelectedSecondarySectors] = useState<
    number[]
  >([]);
  const [selectedHybridBusinessFocuses, setSelectedHybridBusinessFocuses] =
    useState<number[]>([]);
  const [selectedOwnershipTypes, setSelectedOwnershipTypes] = useState<
    number[]
  >([]);
  const [linkedinMembersMin, setLinkedinMembersMin] = useState<number | null>(
    null
  );
  const [linkedinMembersMax, setLinkedinMembersMax] = useState<number | null>(
    null
  );

  // Loading states
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingPrimarySectors, setLoadingPrimarySectors] = useState(false);
  const [loadingSecondarySectors, setLoadingSecondarySectors] = useState(false);
  const [loadingHybridBusinessFocuses, setLoadingHybridBusinessFocuses] =
    useState(false);
  const [loadingOwnershipTypes, setLoadingOwnershipTypes] = useState(false);

  // Fetch countries and primary sectors on component mount
  useEffect(() => {
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

    const fetchHybridBusinessFocuses = async () => {
      try {
        setLoadingHybridBusinessFocuses(true);
        const hybridData = await locationsService.getHybridBusinessFocuses();
        setHybridBusinessFocuses(hybridData);
      } catch (error) {
        console.error("Error fetching hybrid business focuses:", error);
      } finally {
        setLoadingHybridBusinessFocuses(false);
      }
    };

    const fetchOwnershipTypes = async () => {
      try {
        setLoadingOwnershipTypes(true);
        const ownershipData = await locationsService.getOwnershipTypes();
        setOwnershipTypes(ownershipData);
      } catch (error) {
        console.error("Error fetching ownership types:", error);
      } finally {
        setLoadingOwnershipTypes(false);
      }
    };

    fetchCountries();
    fetchPrimarySectors();
    fetchHybridBusinessFocuses();
    fetchOwnershipTypes();
  }, []);

  // Fetch provinces when countries are selected
  useEffect(() => {
    const fetchProvinces = async () => {
      if (selectedCountries.length === 0) {
        setProvinces([]);
        setSelectedProvinces([]);
        return;
      }

      try {
        setLoadingProvinces(true);
        const provincesData = await locationsService.getProvinces(
          selectedCountries
        );
        setProvinces(provincesData);
        // Reset selected provinces when countries change
        setSelectedProvinces([]);
      } catch (error) {
        console.error("Error fetching provinces:", error);
      } finally {
        setLoadingProvinces(false);
      }
    };

    fetchProvinces();
  }, [selectedCountries]);

  // Fetch cities when countries or provinces are selected
  useEffect(() => {
    const fetchCities = async () => {
      if (selectedCountries.length === 0) {
        setCities([]);
        setSelectedCities([]);
        return;
      }

      try {
        setLoadingCities(true);
        const citiesData = await locationsService.getCities(
          selectedCountries,
          selectedProvinces
        );
        setCities(citiesData);
        // Reset selected cities when countries or provinces change
        setSelectedCities([]);
      } catch (error) {
        console.error("Error fetching cities:", error);
      } finally {
        setLoadingCities(false);
      }
    };

    fetchCities();
  }, [selectedCountries, selectedProvinces]);

  const removeCountry = (country: string) => {
    setSelectedCountries(selectedCountries.filter((c) => c !== country));
  };

  const removeProvince = (province: string) => {
    setSelectedProvinces(selectedProvinces.filter((p) => p !== province));
  };

  const removeCity = (city: string) => {
    setSelectedCities(selectedCities.filter((c) => c !== city));
  };

  const removePrimarySector = (sectorId: number) => {
    setSelectedPrimarySectors(
      selectedPrimarySectors.filter((s) => s !== sectorId)
    );
  };

  // Fetch secondary sectors when primary sectors are selected
  useEffect(() => {
    const fetchSecondarySectors = async () => {
      if (selectedPrimarySectors.length === 0) {
        setSecondarySectors([]);
        setSelectedSecondarySectors([]);
        return;
      }

      try {
        setLoadingSecondarySectors(true);

        // Get the IDs of selected primary sectors
        const selectedPrimarySectorIds = primarySectors
          .filter((sector) => selectedPrimarySectors.includes(sector.id))
          .map((sector) => sector.id);

        const secondarySectorsData = await locationsService.getSecondarySectors(
          selectedPrimarySectorIds
        );
        setSecondarySectors(secondarySectorsData);
        // Reset selected secondary sectors when primary sectors change
        setSelectedSecondarySectors([]);
      } catch (error) {
        console.error("Error fetching secondary sectors:", error);
      } finally {
        setLoadingSecondarySectors(false);
      }
    };

    fetchSecondarySectors();
  }, [selectedPrimarySectors, primarySectors]);

  const removeSecondarySector = (sectorId: number) => {
    setSelectedSecondarySectors(
      selectedSecondarySectors.filter((s) => s !== sectorId)
    );
  };

  const removeHybridBusinessFocus = (focusId: number) => {
    setSelectedHybridBusinessFocuses(
      selectedHybridBusinessFocuses.filter((f) => f !== focusId)
    );
  };

  const removeOwnershipType = (ownershipTypeId: number) => {
    setSelectedOwnershipTypes(
      selectedOwnershipTypes.filter((o) => o !== ownershipTypeId)
    );
  };

  const handleSearch = () => {
    const filters: Filters = {
      countries: selectedCountries,
      provinces: selectedProvinces,
      cities: selectedCities,
      primarySectors: selectedPrimarySectors,
      secondarySectors: selectedSecondarySectors,
      hybridBusinessFocuses: selectedHybridBusinessFocuses,
      ownershipTypes: selectedOwnershipTypes,
      linkedinMembersMin,
      linkedinMembersMax,
      searchQuery: searchTerm,
    };
    console.log("Searching with filters:", filters);

    // Call the search function from parent component
    if (onSearch) {
      onSearch(filters);
    }
  };

  // Auto-run search if initialSearch prop is provided
  useEffect(() => {
    if (initialSearch) {
      setSearchTerm(initialSearch);
      handleSearch(); // Trigger search with initial term
    }
  }, [initialSearch, handleSearch]);

  return (
    <div style={styles.container}>
      <div style={styles.maxWidth}>
        <div style={styles.card} className="filters-card">
          <h2 style={styles.heading} className="filters-heading">
            Filters
          </h2>

          {showFilters && (
            <div style={styles.grid} className="filters-grid">
              <div style={styles.gridItem}>
                <h3 style={styles.subHeading} className="filters-sub-heading">
                  Location
                </h3>
                <span style={styles.label}>By Country</span>
                <SearchableSelect
                  options={countries.map((country) => ({
                    value: country.locations_Country,
                    label: country.locations_Country,
                  }))}
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
                    loadingCountries ? "Loading countries..." : "Select Country"
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
                          onClick={() => removeCountry(country)}
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
                  options={provinces.map((province) => ({
                    value: province.State__Province__County,
                    label: province.State__Province__County,
                  }))}
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
                  disabled={loadingProvinces || selectedCountries.length === 0}
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
                          onClick={() => removeProvince(province)}
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
                  options={cities.map((city) => ({
                    value: city.City,
                    label: city.City,
                  }))}
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
                          onClick={() => removeCity(city)}
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
                  Sectors
                </h3>
                <span style={styles.label}>By Primary Sectors</span>
                <SearchableSelect
                  options={primarySectors.map((sector) => ({
                    value: sector.id,
                    label: sector.sector_name,
                  }))}
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
                            onClick={() => removePrimarySector(sectorId)}
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
                  options={secondarySectors.map((sector) => ({
                    value: sector.id,
                    label: sector.sector_name,
                  }))}
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
                            onClick={() => removeSecondarySector(sectorId)}
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

                <span style={styles.label}>
                  Show Data & Analytics Companies with non-D&A Products/Services
                </span>
                <SearchableSelect
                  options={hybridBusinessFocuses.map((focus) => ({
                    value: focus.id,
                    label: focus.business_focus,
                  }))}
                  value=""
                  onChange={(value) => {
                    if (
                      typeof value === "number" &&
                      value &&
                      !selectedHybridBusinessFocuses.includes(value)
                    ) {
                      setSelectedHybridBusinessFocuses([
                        ...selectedHybridBusinessFocuses,
                        value,
                      ]);
                    }
                  }}
                  placeholder={
                    loadingHybridBusinessFocuses
                      ? "Loading business focuses..."
                      : "Select Business Focus"
                  }
                  disabled={loadingHybridBusinessFocuses}
                  style={styles.select}
                />

                {/* Selected Hybrid Business Focuses Tags */}
                {selectedHybridBusinessFocuses.length > 0 && (
                  <div
                    style={{
                      marginTop: "8px",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "4px",
                    }}
                  >
                    {selectedHybridBusinessFocuses.map((focusId) => {
                      const focus = hybridBusinessFocuses.find(
                        (f) => f.id === focusId
                      );
                      return (
                        <span
                          key={focusId}
                          style={{
                            backgroundColor: "#fff8e1",
                            color: "#f57f17",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {focus?.business_focus || `Focus ${focusId}`}
                          <button
                            onClick={() => removeHybridBusinessFocus(focusId)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#f57f17",
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
              <div style={styles.gridItem}>
                <h3 style={styles.subHeading} className="filters-sub-heading">
                  Company Details
                </h3>
                <span style={styles.label}>By Ownership Type</span>
                <SearchableSelect
                  options={ownershipTypes.map((ownershipType) => ({
                    value: ownershipType.id,
                    label: ownershipType.ownership,
                  }))}
                  value=""
                  onChange={(value) => {
                    if (
                      typeof value === "number" &&
                      value &&
                      !selectedOwnershipTypes.includes(value)
                    ) {
                      setSelectedOwnershipTypes([
                        ...selectedOwnershipTypes,
                        value,
                      ]);
                    }
                  }}
                  placeholder={
                    loadingOwnershipTypes
                      ? "Loading ownership types..."
                      : "Select Ownership Type"
                  }
                  disabled={loadingOwnershipTypes}
                  style={styles.select}
                />

                {/* Selected Ownership Types Tags */}
                {selectedOwnershipTypes.length > 0 && (
                  <div
                    style={{
                      marginTop: "8px",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "4px",
                    }}
                  >
                    {selectedOwnershipTypes.map((ownershipTypeId) => {
                      const ownershipType = ownershipTypes.find(
                        (o) => o.id === ownershipTypeId
                      );
                      return (
                        <span
                          key={ownershipTypeId}
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
                          {ownershipType?.ownership ||
                            `Ownership ${ownershipTypeId}`}
                          <button
                            onClick={() => removeOwnershipType(ownershipTypeId)}
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
                <span style={styles.label}>LinkedIn Members Range</span>
                <div style={{ display: "flex", gap: "14px" }}>
                  <input
                    type="number"
                    style={styles.rangeInput}
                    placeholder="Min"
                    value={linkedinMembersMin || ""}
                    onChange={(e) =>
                      setLinkedinMembersMin(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                  />
                  <input
                    type="number"
                    style={styles.rangeInput}
                    placeholder="Max"
                    value={linkedinMembersMax || ""}
                    onChange={(e) =>
                      setLinkedinMembersMax(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                  />
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: showFilters ? "12px" : "0" }}>
            <h3 style={styles.subHeading} className="filters-sub-heading">
              Search for Company
            </h3>
            <div style={styles.searchDiv}>
              <input
                type="text"
                placeholder="Enter company name here"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.input}
                className="filters-input"
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
              <button
                style={styles.button}
                className="filters-button"
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
const CompanySection = ({
  companies,
  loading,
  error,
  pagination,
  ownershipCounts,
  fetchCompanies,
  currentFilters,
}: {
  companies: Company[];
  loading: boolean;
  error: string | null;
  pagination: {
    itemsReceived: number;
    curPage: number;
    nextPage: number | null;
    prevPage: number | null;
    offset: number;
    perPage: number;
    pageTotal: number;
  };
  ownershipCounts: {
    publicCompanies: number;
    peOwnedCompanies: number;
    vcOwnedCompanies: number;
    privateCompanies: number;
    subsidiaryCompanies: number;
  };
  fetchCompanies: (page?: number, filters?: Filters) => Promise<void>;
  currentFilters: Filters | undefined;
}) => {
  const router = useRouter();
  const [secondaryToPrimaryMap, setSecondaryToPrimaryMap] = useState<
    Record<string, string>
  >({});

  // Build a mapping of Secondary sector name -> Primary sector name from API
  useEffect(() => {
    let cancelled = false;
    const loadMap = async () => {
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
        console.warn("[Companies] Failed to load secondary->primary map", e);
      }
    };
    loadMap();
    return () => {
      cancelled = true;
    };
  }, []);

  // Check if any filters are applied
  const hasActiveFilters = () => {
    if (!currentFilters) return false;
    return (
      currentFilters.countries.length > 0 ||
      currentFilters.provinces.length > 0 ||
      currentFilters.cities.length > 0 ||
      currentFilters.primarySectors.length > 0 ||
      currentFilters.secondarySectors.length > 0 ||
      currentFilters.hybridBusinessFocuses.length > 0 ||
      currentFilters.ownershipTypes.length > 0 ||
      currentFilters.linkedinMembersMin !== null ||
      currentFilters.linkedinMembersMax !== null ||
      currentFilters.searchQuery.trim() !== ""
    );
  };

  // Handle CSV export
  const handleExportCSV = () => {
    if (companies.length > 0) {
      CompaniesCSVExporter.exportCompanies(companies, "companies_filtered");
    }
  };

  const handleCompanyClick = useCallback(
    (companyId: number) => {
      router.push(`/company/${companyId}`);
    },
    [router]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      fetchCompanies(page, currentFilters);
    },
    [fetchCompanies, currentFilters]
  );

  useEffect(() => {
    fetchCompanies(1);
  }, [fetchCompanies]);

  const tableRows = useMemo(
    () =>
      companies.map((company, index) => {
        const primarySet = new Set(
          Array.isArray(company.primary_sectors) ? company.primary_sectors : []
        );
        const derivedFromSecondary = Array.isArray(company.secondary_sectors)
          ? company.secondary_sectors
              .map((s) => mapSecondaryToPrimary(s, secondaryToPrimaryMap))
              .filter((v): v is string => Boolean(v))
          : [];
        derivedFromSecondary.forEach((p) => primarySet.add(p));
        const primaryDisplay = Array.from(primarySet);

        return (
          <tr key={company.id || index}>
            <td>
              <CompanyLogo logo={company.linkedin_logo} name={company.name} />
            </td>
            <td>
              <a
                href={`/company/${company.id}`}
                className="company-name"
                style={{
                  textDecoration: "none",
                  color: "#3b82f6",
                }}
                onClick={(e) => {
                  if (
                    e.defaultPrevented ||
                    e.button !== 0 ||
                    e.metaKey ||
                    e.ctrlKey ||
                    e.shiftKey ||
                    e.altKey
                  ) {
                    return;
                  }
                  e.preventDefault();
                  handleCompanyClick(company.id);
                }}
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
              {primaryDisplay.length > 0 ? primaryDisplay.join(", ") : "N/A"}
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
        );
      }),
    [companies, handleCompanyClick, secondaryToPrimaryMap]
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
      padding: 16px 12px;
      border-radius: 8px;
    }
    .company-stats {
      background: #fff;
      padding: 16px;
      box-shadow: 0px 1px 3px 0px rgba(227, 228, 230, 1);
      border-radius: 8px;
      margin-bottom: 12px;
    }
    .stats-title {
      font-size: 18px;
      font-weight: 700;
      color: #1a202c;
      margin: 0 0 12px 0;
    }
    .stats-column {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 16px;
    }
    .stats-item {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
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
      padding: 16px;
      box-shadow: 0px 1px 3px 0px rgba(227, 228, 230, 1);
      border-radius: 8px;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .company-table th:nth-child(1), 
    .company-table td:nth-child(1) { 
      width: 8%; 
    } /* Logo */
    .company-table th:nth-child(2), 
    .company-table td:nth-child(2) { 
      width: 12%; 
    } /* Name */
    .company-table th:nth-child(3), 
    .company-table td:nth-child(3) { 
      width: 35%; 
    } /* Description - Much wider */
    .company-table th:nth-child(4), 
    .company-table td:nth-child(4) { 
      width: 15%; 
    } /* Primary Sectors */
    .company-table th:nth-child(5), 
    .company-table td:nth-child(5) { 
      width: 12%; 
    } /* Sectors */
    .company-table th:nth-child(6), 
    .company-table td:nth-child(6) { 
      width: 8%; 
    } /* Ownership */
    .company-table th:nth-child(7), 
    .company-table td:nth-child(7) { 
      width: 7%; 
    } /* LinkedIn Members */
    .company-table th:nth-child(8), 
    .company-table td:nth-child(8) { 
      width: 7%; 
    } /* Country */
    .company-table th,
    .company-table td {
      padding: 8px 12px;
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
      line-height: 1.4;
    }
    .company-description-truncated {
      display: -webkit-box;
      -webkit-line-clamp: 3;
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
      max-width: 300px;
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
      gap: 8px;
      margin-top: 12px;
      padding: 8px;
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
    
    /* Mobile Card Layout */
    .company-cards {
      display: none;
      flex-direction: column;
      gap: 12px;
      padding: 12px;
    }
    .company-card {
      background: #fff;
      border-radius: 8px;
      padding: 12px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      border: 1px solid #e2e8f0;
    }
    .company-card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .company-card-logo {
      width: 50px;
      height: 35px;
      object-fit: contain;
      border-radius: 6px;
      flex-shrink: 0;
    }
    .company-card-logo-placeholder {
      width: 50px;
      height: 35px;
      background-color: #f7fafc;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8px;
      color: #718096;
      flex-shrink: 0;
    }
    .company-card-name {
      color: #0075df;
      text-decoration: underline;
      cursor: pointer;
      font-weight: 600;
      font-size: 16px;
      line-height: 1.3;
      flex: 1;
    }
    .company-card-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .company-card-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      font-size: 14px;
      line-height: 1.4;
    }
    .company-card-label {
      color: #4a5568;
      font-weight: 500;
      min-width: 80px;
      flex-shrink: 0;
    }
    .company-card-value {
      color: #000;
      text-align: right;
      flex: 1;
      word-break: break-word;
    }
    .company-card-description {
      color: #000;
      line-height: 1.4;
      margin-top: 8px;
      font-size: 14px;
    }
    .company-card-description-truncated {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .company-card-expand {
      color: #0075df;
      text-decoration: underline;
      cursor: pointer;
      font-size: 12px;
      margin-top: 4px;
      display: block;
    }
    
    @media (max-width: 768px) {
      .company-table {
        display: none;
      }
      .company-cards {
        display: flex;
      }
      .stats-column {
        grid-template-columns: 1fr !important;
        gap: 6px !important;
      }
      .filters-grid {
        display: grid !important;
        grid-template-columns: 1fr !important;
        gap: 16px !important;
      }
      .filters-card {
        padding: 12px !important;
      }
      .filters-heading {
        font-size: 18px !important;
        margin-bottom: 8px !important;
      }
      .filters-sub-heading {
        font-size: 14px !important;
        margin-bottom: 6px !important;
      }
      .filters-input {
        max-width: 100% !important;
      }
      .filters-button {
        max-width: 100% !important;
      }
    }
    
    @media (min-width: 769px) {
      .company-cards {
        display: none;
      }
      .company-table {
        display: table;
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
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 0",
              borderBottom: "1px solid #e2e8f0",
            },
          },
          React.createElement(
            "span",
            {
              style: {
                fontSize: "14px",
                color: "#4a5568",
                fontWeight: "500",
              },
            },
            "Companies: "
          ),
          React.createElement(
            "span",
            {
              style: {
                fontSize: "16px",
                color: "#000",
                fontWeight: "600",
              },
            },
            pagination.itemsReceived.toLocaleString()
          )
        ),
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 0",
              borderBottom: "1px solid #e2e8f0",
            },
          },
          React.createElement(
            "span",
            {
              style: {
                fontSize: "14px",
                color: "#4a5568",
                fontWeight: "500",
              },
            },
            "Public companies: "
          ),
          React.createElement(
            "span",
            {
              style: {
                fontSize: "16px",
                color: "#000",
                fontWeight: "600",
              },
            },
            ownershipCounts.publicCompanies.toLocaleString()
          )
        ),
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 0",
              borderBottom: "1px solid #e2e8f0",
            },
          },
          React.createElement(
            "span",
            {
              style: {
                fontSize: "14px",
                color: "#4a5568",
                fontWeight: "500",
              },
            },
            "PE-owned companies: "
          ),
          React.createElement(
            "span",
            {
              style: {
                fontSize: "16px",
                color: "#000",
                fontWeight: "600",
              },
            },
            ownershipCounts.peOwnedCompanies.toLocaleString()
          )
        ),
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 0",
              borderBottom: "1px solid #e2e8f0",
            },
          },
          React.createElement(
            "span",
            {
              style: {
                fontSize: "14px",
                color: "#4a5568",
                fontWeight: "500",
              },
            },
            "VC-owned companies: "
          ),
          React.createElement(
            "span",
            {
              style: {
                fontSize: "16px",
                color: "#000",
                fontWeight: "600",
              },
            },
            ownershipCounts.vcOwnedCompanies.toLocaleString()
          )
        ),
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 0",
              borderBottom: "none",
            },
          },
          React.createElement(
            "span",
            {
              style: {
                fontSize: "14px",
                color: "#4a5568",
                fontWeight: "500",
              },
            },
            "Private companies: "
          ),
          React.createElement(
            "span",
            {
              style: {
                fontSize: "16px",
                color: "#000",
                fontWeight: "600",
              },
            },
            ownershipCounts.privateCompanies.toLocaleString()
          )
        )
      )
    ),
    // Export Button - Show only when filters are applied
    hasActiveFilters() &&
      companies.length > 0 &&
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "16px",
          },
        },
        React.createElement(
          "button",
          {
            onClick: handleExportCSV,
            className: "export-button",
            disabled: loading,
          },
          loading ? "Exporting..." : "Export CSV"
        )
      ),
    React.createElement(
      "div",
      { className: "company-cards" },
      companies.map((company, index) =>
        React.createElement(CompanyCard, {
          key: company.id || index,
          company: company,
          index: index,
          secondaryToPrimaryMap: secondaryToPrimaryMap,
        })
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
  const {
    companies,
    loading,
    error,
    pagination,
    ownershipCounts,
    fetchCompanies,
    currentFilters,
  } = useCompaniesAPI();

  const handleSearch = useCallback(
    (filters: Filters) => {
      console.log("Searching with filters:", filters);
      fetchCompanies(1, filters);
    },
    [fetchCompanies]
  );

  const [initialSearch, setInitialSearch] = useState<string | undefined>(
    undefined
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const s = params.get("search") || undefined;
      setInitialSearch(s);
    }
  }, []);

  return (
    <div className="min-h-screen">
      <Header />
      <CompanyDashboard onSearch={handleSearch} initialSearch={initialSearch} />
      <CompanySection
        companies={companies}
        loading={loading}
        error={error}
        pagination={pagination}
        ownershipCounts={ownershipCounts}
        fetchCompanies={fetchCompanies}
        currentFilters={currentFilters}
      />
      <Footer />
    </div>
  );
};

export default CompaniesPage;
