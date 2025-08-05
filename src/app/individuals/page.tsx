"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { IndividualsResponse, Individual } from "../../types/individuals";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { locationsService } from "@/lib/locationsService";

// Types for API integration
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

interface JobTitle {
  id: number;
  job_title: string;
}

interface IndividualsFilters {
  Countries: string[];
  Provinces: string[];
  Cities: string[];
  Primary_Sectors: number[];
  Secondary_Sectors: number[];
  Job_Titles: number[];
  Statuses: string[];
  Search_Query: string;
  page: number;
  per_page: number;
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
    padding: "0",
    margin: "0",
  },
  label: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#4a5568",
    marginBottom: "8px",
  },
  select: {
    width: "100%",
    maxWidth: "300px",
    marginBottom: "12px",
  },
  grid: {
    display: "grid" as const,
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" as const,
    gap: "24px",
  },
  gridItem: {
    display: "flex" as const,
    flexDirection: "column" as const,
  },
  tagsContainer: {
    display: "flex" as const,
    flexWrap: "wrap" as const,
    gap: "8px",
    marginTop: "8px",
  },
  tag: {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "4px",
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: "500",
    cursor: "pointer",
  },
  countryTag: {
    backgroundColor: "#e6f3ff",
    color: "#0066cc",
  },
  provinceTag: {
    backgroundColor: "#fff2e6",
    color: "#cc6600",
  },
  cityTag: {
    backgroundColor: "#f0f8ff",
    color: "#0066cc",
  },
  sectorTag: {
    backgroundColor: "#f0fff0",
    color: "#006600",
  },
  jobTitleTag: {
    backgroundColor: "#fff0f0",
    color: "#cc0000",
  },
  statusTag: {
    backgroundColor: "#f8f0ff",
    color: "#6600cc",
  },
  closeButton: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "bold",
    padding: "0",
    margin: "0",
    lineHeight: "1",
  },
};

// Individuals Stats Component
const IndividualsStats = ({ data }: { data: IndividualsResponse }) => {
  return (
    <div
      style={{
        background: "#fff",
        padding: "32px 24px",
        boxShadow: "0px 1px 3px 0px rgba(227, 228, 230, 1)",
        borderRadius: "16px",
        marginBottom: "24px",
      }}
    >
      <h2
        style={{
          fontSize: "24px",
          fontWeight: "700",
          color: "#1a202c",
          margin: "0 0 24px 0",
        }}
      >
        Individuals
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px 24px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span
            style={{
              fontSize: "14px",
              color: "#4a5568",
              fontWeight: "500",
              lineHeight: "1.4",
            }}
          >
            Individuals:
          </span>
          <span
            style={{
              fontSize: "20px",
              color: "#000",
              fontWeight: "700",
            }}
          >
            {data.totalIndividuals?.toLocaleString() || "0"}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span
            style={{
              fontSize: "14px",
              color: "#4a5568",
              fontWeight: "500",
              lineHeight: "1.4",
            }}
          >
            CEOs:
          </span>
          <span
            style={{
              fontSize: "20px",
              color: "#000",
              fontWeight: "700",
            }}
          >
            {data.ceos?.toLocaleString() || "0"}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span
            style={{
              fontSize: "14px",
              color: "#4a5568",
              fontWeight: "500",
              lineHeight: "1.4",
            }}
          >
            Current roles:
          </span>
          <span
            style={{
              fontSize: "20px",
              color: "#000",
              fontWeight: "700",
            }}
          >
            {data.currentRoles?.toLocaleString() || "0"}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span
            style={{
              fontSize: "14px",
              color: "#4a5568",
              fontWeight: "500",
              lineHeight: "1.4",
            }}
          >
            Chair:
          </span>
          <span
            style={{
              fontSize: "20px",
              color: "#000",
              fontWeight: "700",
            }}
          >
            {data.chairs?.toLocaleString() || "0"}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span
            style={{
              fontSize: "14px",
              color: "#4a5568",
              fontWeight: "500",
              lineHeight: "1.4",
            }}
          >
            Past roles:
          </span>
          <span
            style={{
              fontSize: "20px",
              color: "#000",
              fontWeight: "700",
            }}
          >
            {data.pastRoles?.toLocaleString() || "0"}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span
            style={{
              fontSize: "14px",
              color: "#4a5568",
              fontWeight: "500",
              lineHeight: "1.4",
            }}
          >
            Founder:
          </span>
          <span
            style={{
              fontSize: "20px",
              color: "#000",
              fontWeight: "700",
            }}
          >
            {data.founders?.toLocaleString() || "0"}
          </span>
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
        {totalItems.toLocaleString()} individuals
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

// Individuals Table Component
const IndividualsTable = ({
  individuals,
  loading,
}: {
  individuals: Individual[];
  loading: boolean;
}) => {
  const router = useRouter();

  const handleIndividualClick = (individualId: number) => {
    router.push(`/individual/${individualId}`);
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
        Loading individuals...
      </div>
    );
  }

  if (!individuals || individuals.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
        No individuals found.
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#fff",
        padding: "32px 24px",
        boxShadow: "0px 1px 3px 0px rgba(227, 228, 230, 1)",
        borderRadius: "16px",
        overflowX: "auto",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
        }}
      >
        <thead>
          <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
            <th
              style={{
                padding: "16px",
                textAlign: "left",
                verticalAlign: "top",
                fontWeight: "600",
                color: "#1a202c",
                fontSize: "14px",
                background: "#f9fafb",
              }}
            >
              Name
            </th>
            <th
              style={{
                padding: "16px",
                textAlign: "left",
                verticalAlign: "top",
                fontWeight: "600",
                color: "#1a202c",
                fontSize: "14px",
                background: "#f9fafb",
              }}
            >
              Current Companies
            </th>
            <th
              style={{
                padding: "16px",
                textAlign: "left",
                verticalAlign: "top",
                fontWeight: "600",
                color: "#1a202c",
                fontSize: "14px",
                background: "#f9fafb",
              }}
            >
              Current Roles
            </th>
            <th
              style={{
                padding: "16px",
                textAlign: "left",
                verticalAlign: "top",
                fontWeight: "600",
                color: "#1a202c",
                fontSize: "14px",
                background: "#f9fafb",
              }}
            >
              Location
            </th>
          </tr>
        </thead>
        <tbody>
          {individuals.map((individual: Individual) => (
            <tr
              key={individual.id}
              style={{
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <td
                style={{
                  padding: "16px",
                  textAlign: "left",
                  verticalAlign: "top",
                  fontSize: "14px",
                  color: "#000",
                  lineHeight: "1.5",
                }}
              >
                <span
                  style={{
                    color: "#0075df",
                    textDecoration: "underline",
                    cursor: "pointer",
                    fontWeight: "500",
                  }}
                  onClick={() => handleIndividualClick(individual.id)}
                >
                  {individual.advisor_individuals || "N/A"}
                </span>
              </td>
              <td
                style={{
                  padding: "16px",
                  textAlign: "left",
                  verticalAlign: "top",
                  fontSize: "14px",
                  color: "#000",
                  lineHeight: "1.5",
                }}
              >
                {individual.current_company ? (
                  <span
                    style={{
                      color: "#0075df",
                      textDecoration: "underline",
                      cursor: "pointer",
                    }}
                  >
                    {individual.current_company}
                  </span>
                ) : (
                  <span style={{ color: "#6b7280" }}>Not available</span>
                )}
              </td>
              <td
                style={{
                  padding: "16px",
                  textAlign: "left",
                  verticalAlign: "top",
                  fontSize: "14px",
                  color: "#000",
                  lineHeight: "1.5",
                }}
              >
                {individual.current_roles
                  ?.map((role) => role.job_title)
                  .join(", ") || "Not available"}
              </td>
              <td
                style={{
                  padding: "16px",
                  textAlign: "left",
                  verticalAlign: "top",
                  fontSize: "14px",
                  color: "#000",
                  lineHeight: "1.5",
                }}
              >
                {individual._locations_individual
                  ? `${individual._locations_individual.City || ""}, ${
                      individual._locations_individual
                        .State__Province__County || ""
                    }, ${individual._locations_individual.Country || ""}`
                      .replace(/^,\s*/, "")
                      .replace(/,\s*$/, "")
                  : "Not available"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Main Individuals Page Component
const IndividualsPage = () => {
  // State for filters
  const [filters, setFilters] = useState<IndividualsFilters>({
    Countries: [],
    Provinces: [],
    Cities: [],
    Primary_Sectors: [],
    Secondary_Sectors: [],
    Job_Titles: [],
    Statuses: [],
    Search_Query: "",
    page: 1,
    per_page: 50,
  });

  // State for each filter (arrays for multi-select)
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedPrimarySectors, setSelectedPrimarySectors] = useState<
    number[]
  >([]);
  const [selectedSecondarySectors, setSelectedSecondarySectors] = useState<
    number[]
  >([]);
  const [selectedJobTitles, setSelectedJobTitles] = useState<number[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // State for API data
  const [countries, setCountries] = useState<Country[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [primarySectors, setPrimarySectors] = useState<PrimarySector[]>([]);
  const [secondarySectors, setSecondarySectors] = useState<SecondarySector[]>(
    []
  );
  const [jobTitles, setJobTitles] = useState<JobTitle[]>([]);

  // Loading states
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingPrimarySectors, setLoadingPrimarySectors] = useState(false);
  const [loadingSecondarySectors, setLoadingSecondarySectors] = useState(false);
  const [loadingJobTitles, setLoadingJobTitles] = useState(false);

  // State for individuals data
  const [individuals, setIndividuals] = useState<Individual[]>([]);
  const [pagination, setPagination] = useState({
    itemsReceived: 0,
    curPage: 1,
    nextPage: null as number | null,
    prevPage: null as number | null,
    offset: 0,
    perPage: 50,
    pageTotal: 0,
  });
  const [summaryData, setSummaryData] = useState({
    totalIndividuals: 0,
    currentRoles: 0,
    pastRoles: 0,
    ceos: 0,
    chairs: 0,
    founders: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Convert API data to dropdown options format
  const countryOptions = countries.map((country) => ({
    value: country.locations_Country,
    label: country.locations_Country,
  }));

  const provinceOptions = provinces.map((province) => ({
    value: province.State__Province__County,
    label: province.State__Province__County,
  }));

  const cityOptions = cities.map((city) => ({
    value: city.City,
    label: city.City,
  }));

  const primarySectorOptions = primarySectors.map((sector) => ({
    value: sector.id,
    label: sector.sector_name,
  }));

  const secondarySectorOptions = secondarySectors.map((sector) => ({
    value: sector.id,
    label: sector.sector_name,
  }));

  const jobTitleOptions = jobTitles.map((jobTitle) => ({
    value: jobTitle.id,
    label: jobTitle.job_title,
  }));

  const statusOptions = [
    { value: "Current", label: "Current" },
    { value: "Past", label: "Past" },
  ];

  // Fetch functions
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

  const fetchJobTitles = async () => {
    try {
      setLoadingJobTitles(true);
      const response = await fetch(
        "https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob/get_all_job_titles",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem(
              "asymmetrix_auth_token"
            )}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setJobTitles(data);
      }
    } catch (error) {
      console.error("Error fetching job titles:", error);
    } finally {
      setLoadingJobTitles(false);
    }
  };

  const fetchProvinces = async () => {
    if (selectedCountries.length === 0) {
      setProvinces([]);
      return;
    }
    try {
      setLoadingProvinces(true);
      const provincesData = await locationsService.getProvinces(
        selectedCountries
      );
      setProvinces(provincesData);
    } catch (error) {
      console.error("Error fetching provinces:", error);
    } finally {
      setLoadingProvinces(false);
    }
  };

  const fetchCities = async () => {
    if (selectedCountries.length === 0 || selectedProvinces.length === 0) {
      setCities([]);
      return;
    }
    try {
      setLoadingCities(true);
      const citiesData = await locationsService.getCities(
        selectedCountries,
        selectedProvinces
      );
      setCities(citiesData);
    } catch (error) {
      console.error("Error fetching cities:", error);
    } finally {
      setLoadingCities(false);
    }
  };

  const fetchSecondarySectors = async () => {
    if (selectedPrimarySectors.length === 0) {
      setSecondarySectors([]);
      return;
    }
    try {
      setLoadingSecondarySectors(true);
      const sectorsData = await locationsService.getSecondarySectors(
        selectedPrimarySectors
      );
      setSecondarySectors(sectorsData);
    } catch (error) {
      console.error("Error fetching secondary sectors:", error);
    } finally {
      setLoadingSecondarySectors(false);
    }
  };

  const fetchIndividuals = async (filters: IndividualsFilters) => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("asymmetrix_auth_token");
      if (!token) {
        setError("Authentication required");
        return;
      }

      // Convert filters to URL parameters for GET request
      const params = new URLSearchParams();

      // Add page and per_page
      params.append("Offset", filters.page.toString());
      params.append("Per_page", filters.per_page.toString());

      // Add search query
      if (filters.Search_Query)
        params.append("search_query", filters.Search_Query);

      // Add location filters as comma-separated values
      if (filters.Countries.length > 0) {
        params.append("Countries", filters.Countries.join(","));
      }

      if (filters.Provinces.length > 0) {
        params.append("Provinces", filters.Provinces.join(","));
      }

      if (filters.Cities.length > 0) {
        params.append("Cities", filters.Cities.join(","));
      }

      // Add sector filters as comma-separated values
      if (filters.Primary_Sectors.length > 0) {
        params.append("primary_sectors_ids", filters.Primary_Sectors.join(","));
      }

      if (filters.Secondary_Sectors.length > 0) {
        params.append(
          "Secondary_sectors_ids",
          filters.Secondary_Sectors.join(",")
        );
      }

      // Add job titles as comma-separated values
      if (filters.Job_Titles.length > 0) {
        params.append("job_titles_ids", filters.Job_Titles.join(","));
      }

      // Add statuses as comma-separated values
      if (filters.Statuses.length > 0) {
        params.append("statuses", filters.Statuses.join(","));
      }

      const url = `https://xdil-abvj-o7rq.e2.xano.io/api:Xpykjv0R/get_all_individuals?${params.toString()}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: IndividualsResponse = await response.json();

      setIndividuals(data.Individuals_list.items);
      setPagination({
        itemsReceived: data.Individuals_list.itemsReceived,
        curPage: data.Individuals_list.curPage,
        nextPage: data.Individuals_list.nextPage,
        prevPage: data.Individuals_list.prevPage,
        offset: data.Individuals_list.offset,
        perPage: data.Individuals_list.pageTotal,
        pageTotal: data.Individuals_list.pageTotal,
      });
      setSummaryData({
        totalIndividuals: data.totalIndividuals,
        currentRoles: data.currentRoles,
        pastRoles: data.pastRoles,
        ceos: data.ceos,
        chairs: data.chairs,
        founders: data.founders,
      });
    } catch (error) {
      console.error("Error fetching individuals:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch individuals"
      );
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchCountries();
    fetchPrimarySectors();
    fetchJobTitles();
    // Initial fetch of all individuals
    fetchIndividuals(filters);
  }, []);

  // Fetch provinces when countries change
  useEffect(() => {
    fetchProvinces();
  }, [selectedCountries]);

  // Fetch cities when provinces change
  useEffect(() => {
    fetchCities();
  }, [selectedProvinces]);

  // Fetch secondary sectors when primary sectors are selected
  useEffect(() => {
    fetchSecondarySectors();
  }, [selectedPrimarySectors]);

  // Handle search
  const handleSearch = () => {
    const updatedFilters = {
      ...filters,
      Search_Query: searchTerm,
      Countries: selectedCountries,
      Provinces: selectedProvinces,
      Cities: selectedCities,
      Primary_Sectors: selectedPrimarySectors,
      Secondary_Sectors: selectedSecondarySectors,
      Job_Titles: selectedJobTitles,
      Statuses: selectedStatuses,
      page: 1, // Reset to first page when searching
    };
    setFilters(updatedFilters);
    fetchIndividuals(updatedFilters);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    const updatedFilters = { ...filters, page };
    setFilters(updatedFilters);
    fetchIndividuals(updatedFilters);
  };

  return (
    <div style={styles.container}>
      <Header />
      <div style={styles.maxWidth}>
        <div style={styles.card}>
          <h1 style={styles.heading}>Individuals</h1>
          <p style={{ color: "#666", marginBottom: "24px" }}>
            Search and filter individuals by location, sectors, job titles, and
            more.
          </p>

          <div style={styles.grid}>
            <div style={styles.gridItem}>
              <h3 style={styles.subHeading}>Location</h3>
              <span style={styles.label}>By Country</span>
              <SearchableSelect
                options={countryOptions}
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
                        onClick={() => {
                          setSelectedCountries(
                            selectedCountries.filter((c) => c !== country)
                          );
                        }}
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
                options={provinceOptions}
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
                        onClick={() => {
                          setSelectedProvinces(
                            selectedProvinces.filter((p) => p !== province)
                          );
                        }}
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
                options={cityOptions}
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
                        onClick={() => {
                          setSelectedCities(
                            selectedCities.filter((c) => c !== city)
                          );
                        }}
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
              <h3 style={styles.subHeading}>Sector</h3>
              <span style={styles.label}>By Primary Sectors</span>
              <SearchableSelect
                options={primarySectorOptions}
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
                          onClick={() => {
                            setSelectedPrimarySectors(
                              selectedPrimarySectors.filter(
                                (s) => s !== sectorId
                              )
                            );
                          }}
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
                options={secondarySectorOptions}
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
                  loadingSecondarySectors || selectedPrimarySectors.length === 0
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
                          onClick={() => {
                            setSelectedSecondarySectors(
                              selectedSecondarySectors.filter(
                                (s) => s !== sectorId
                              )
                            );
                          }}
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
            </div>

            <div style={styles.gridItem}>
              <h3 style={styles.subHeading}>Job Information</h3>
              <span style={styles.label}>By Job Titles</span>
              <SearchableSelect
                options={jobTitleOptions}
                value=""
                onChange={(value) => {
                  if (
                    typeof value === "number" &&
                    value &&
                    !selectedJobTitles.includes(value)
                  ) {
                    setSelectedJobTitles([...selectedJobTitles, value]);
                  }
                }}
                placeholder={
                  loadingJobTitles
                    ? "Loading job titles..."
                    : "Select Job Title"
                }
                disabled={loadingJobTitles}
                style={styles.select}
              />

              {/* Selected Job Titles Tags */}
              {selectedJobTitles.length > 0 && (
                <div
                  style={{
                    marginTop: "8px",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "4px",
                  }}
                >
                  {selectedJobTitles.map((jobTitleId) => {
                    const jobTitle = jobTitles.find((j) => j.id === jobTitleId);
                    return (
                      <span
                        key={jobTitleId}
                        style={{
                          backgroundColor: "#ffebee",
                          color: "#c62828",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        {jobTitle?.job_title || `Job ${jobTitleId}`}
                        <button
                          onClick={() => {
                            setSelectedJobTitles(
                              selectedJobTitles.filter((j) => j !== jobTitleId)
                            );
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#c62828",
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

              <span style={styles.label}>By Status</span>
              <SearchableSelect
                options={statusOptions}
                value=""
                onChange={(value) => {
                  if (
                    typeof value === "string" &&
                    value &&
                    !selectedStatuses.includes(value)
                  ) {
                    setSelectedStatuses([...selectedStatuses, value]);
                  }
                }}
                placeholder="Select Status"
                style={styles.select}
              />

              {/* Selected Statuses Tags */}
              {selectedStatuses.length > 0 && (
                <div
                  style={{
                    marginTop: "8px",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "4px",
                  }}
                >
                  {selectedStatuses.map((status) => (
                    <span
                      key={status}
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
                      {status}
                      <button
                        onClick={() => {
                          setSelectedStatuses(
                            selectedStatuses.filter((s) => s !== status)
                          );
                        }}
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
                  ))}
                </div>
              )}
            </div>

            <div style={styles.gridItem}>
              <h3 style={styles.subHeading}>Search</h3>
              <span style={styles.label}>Search for Individuals</span>
              <input
                type="text"
                placeholder="Enter name here"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.input}
              />
              <button onClick={handleSearch} style={styles.button}>
                Search
              </button>
            </div>
          </div>

          {/* Summary Stats */}
          {summaryData.totalIndividuals > 0 && (
            <IndividualsStats data={summaryData as IndividualsResponse} />
          )}

          {/* Results Table */}
          {individuals.length > 0 && (
            <IndividualsTable individuals={individuals} loading={loading} />
          )}

          {/* Pagination */}
          {pagination.pageTotal > 1 && (
            <Pagination
              currentPage={pagination.curPage}
              totalItems={pagination.itemsReceived}
              perPage={pagination.perPage}
              onPageChange={handlePageChange}
              onPerPageChange={() => {}} // Not implemented yet
            />
          )}

          {error && (
            <div style={{ color: "red", marginTop: "16px" }}>
              Error: {error}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default IndividualsPage;
