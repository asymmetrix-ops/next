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

// Generate pagination buttons (similar to advisors page)
const generatePaginationButtons = (
  pagination: {
    curPage: number;
    pageTotal: number;
    prevPage: number | null;
    nextPage: number | null;
  },
  handlePageChange: (page: number) => void
) => {
  const buttons = [];
  const currentPage = pagination.curPage;
  const totalPages = pagination.pageTotal;

  // Previous button
  buttons.push(
    <button
      key="prev"
      className="pagination-button"
      onClick={() => handlePageChange(currentPage - 1)}
      disabled={!pagination.prevPage}
    >
      &lt;
    </button>
  );

  // Page numbers
  if (totalPages <= 7) {
    // Show all pages if total is 7 or less
    for (let i = 1; i <= totalPages; i++) {
      buttons.push(
        <button
          key={i}
          className={`pagination-button ${i === currentPage ? "active" : ""}`}
          onClick={() => handlePageChange(i)}
        >
          {i.toString()}
        </button>
      );
    }
  } else {
    // Show first page
    buttons.push(
      <button
        key={1}
        className={`pagination-button ${currentPage === 1 ? "active" : ""}`}
        onClick={() => handlePageChange(1)}
      >
        1
      </button>
    );

    // Show second page if not first
    if (currentPage > 2) {
      buttons.push(
        <button
          key={2}
          className="pagination-button"
          onClick={() => handlePageChange(2)}
        >
          2
        </button>
      );
    }

    // Show ellipsis if needed
    if (currentPage > 3) {
      buttons.push(
        <span key="ellipsis1" className="pagination-ellipsis">
          ...
        </span>
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
          <button
            key={i}
            className={`pagination-button ${i === currentPage ? "active" : ""}`}
            onClick={() => handlePageChange(i)}
          >
            {i.toString()}
          </button>
        );
      }
    }

    // Show ellipsis if needed
    if (currentPage < totalPages - 2) {
      buttons.push(
        <span key="ellipsis2" className="pagination-ellipsis">
          ...
        </span>
      );
    }

    // Show second to last page if not last
    if (currentPage < totalPages - 1) {
      buttons.push(
        <button
          key={totalPages - 1}
          className="pagination-button"
          onClick={() => handlePageChange(totalPages - 1)}
        >
          {(totalPages - 1).toString()}
        </button>
      );
    }

    // Show last page
    buttons.push(
      <button
        key={totalPages}
        className={`pagination-button ${
          currentPage === totalPages ? "active" : ""
        }`}
        onClick={() => handlePageChange(totalPages)}
      >
        {totalPages.toString()}
      </button>
    );
  }

  // Next button
  buttons.push(
    <button
      key="next"
      className="pagination-button"
      onClick={() => handlePageChange(currentPage + 1)}
      disabled={!pagination.nextPage}
    >
      &gt;
    </button>
  );

  return buttons;
};

// Individual Card Component for mobile
const IndividualCard = (individual: Individual, index: number) => {
  const router = useRouter();

  const handleIndividualClick = (individualId: number) => {
    router.push(`/individual/${individualId}`);
  };

  return (
    <div
      key={index}
      className="individual-card"
      style={{
        backgroundColor: "white",
        borderRadius: "8px",
        padding: "12px",
        marginBottom: "8px",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        border: "1px solid #e2e8f0",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: "12px",
          gap: "12px",
        }}
      >
        <div
          style={{
            flex: "1",
          }}
        >
          <div
            style={{
              fontSize: "16px",
              fontWeight: "600",
              color: "#0075df",
              textDecoration: "underline",
              cursor: "pointer",
              marginBottom: "4px",
            }}
            onClick={() => handleIndividualClick(individual.id)}
          >
            {individual.advisor_individuals || "N/A"}
          </div>
          <div
            style={{
              fontSize: "14px",
              color: "#4a5568",
            }}
          >
            {individual._locations_individual
              ? `${individual._locations_individual.City || ""}, ${
                  individual._locations_individual.State__Province__County || ""
                }, ${individual._locations_individual.Country || ""}`
                  .replace(/^,\s*/, "")
                  .replace(/,\s*$/, "")
              : "Not available"}
          </div>
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          fontSize: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "4px 0",
          }}
        >
          <span style={{ color: "#4a5568" }}>Company:</span>
          <span
            style={{
              fontWeight: "600",
              maxWidth: "60%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {individual.current_company || "N/A"}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "4px 0",
            gridColumn: "1 / -1",
          }}
        >
          <span style={{ color: "#4a5568" }}>Roles:</span>
          <span
            style={{
              fontWeight: "600",
              textAlign: "right",
              maxWidth: "60%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {individual.current_roles
              ?.map((role) => role.job_title)
              .join(", ") || "N/A"}
          </span>
        </div>
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
    return <div className="loading">Loading individuals...</div>;
  }

  if (!individuals || individuals.length === 0) {
    return <div className="loading">No individuals found.</div>;
  }

  const tableRows = individuals.map((individual, index) => (
    <tr key={index}>
      <td>
        <span
          className="individual-name"
          style={{
            textDecoration: "underline",
            color: "#0075df",
            cursor: "pointer",
            fontWeight: "500",
          }}
          onClick={() => handleIndividualClick(individual.id)}
        >
          {individual.advisor_individuals || "N/A"}
        </span>
      </td>
      <td>
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
      <td>
        {individual.current_roles?.map((role) => role.job_title).join(", ") ||
          "Not available"}
      </td>
      <td>
        {individual._locations_individual
          ? `${individual._locations_individual.City || ""}, ${
              individual._locations_individual.State__Province__County || ""
            }, ${individual._locations_individual.Country || ""}`
              .replace(/^,\s*/, "")
              .replace(/,\s*$/, "")
          : "Not available"}
      </td>
    </tr>
  ));

  return (
    <div>
      {/* Mobile Cards */}
      <div className="individual-cards">
        {individuals.map((individual, index) =>
          IndividualCard(individual, index)
        )}
      </div>

      {/* Desktop Table */}
      <table className="individual-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Current Companies</th>
            <th>Current Roles</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>{tableRows}</tbody>
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
        perPage: filters.per_page,
        pageTotal: Math.ceil(data.totalIndividuals / filters.per_page),
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch provinces when countries change
  useEffect(() => {
    fetchProvinces();
  }, [selectedCountries]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch cities when provinces change
  useEffect(() => {
    fetchCities();
  }, [selectedProvinces]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch secondary sectors when primary sectors are selected
  useEffect(() => {
    fetchSecondarySectors();
  }, [selectedPrimarySectors]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const style = `
    .individual-section {
      padding: 32px 24px;
      border-radius: 8px;
    }
    .individual-stats {
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
    .individual-table {
      width: 100%;
      background: #fff;
      padding: 32px 24px;
      box-shadow: 0px 1px 3px 0px rgba(227, 228, 230, 1);
      border-radius: 16px;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .individual-table th,
    .individual-table td {
      padding: 16px;
      text-align: left;
      vertical-align: top;
      border-bottom: 1px solid #e2e8f0;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .individual-table th {
      font-weight: 600;
      color: #1a202c;
      font-size: 14px;
      background: #f9fafb;
      border-bottom: 2px solid #e2e8f0;
    }
    .individual-table td {
      font-size: 14px;
      color: #000;
      line-height: 1.5;
    }
    .individual-name {
      color: #0075df;
      text-decoration: underline;
      cursor: pointer;
      font-weight: 500;
      transition: color 0.2s;
    }
    .individual-name:hover {
      color: #005bb5;
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
    .individual-cards {
      display: none;
    }
    @media (max-width: 768px) {
      .individual-table {
        display: none !important;
      }
      .individual-cards {
        display: block !important;
        padding: 8px !important;
      }
      .pagination {
        flex-wrap: wrap !important;
        gap: 8px !important;
        padding: 16px 8px !important;
      }
      .pagination-button {
        padding: 8px 10px !important;
        font-size: 13px !important;
        min-width: 32px !important;
        text-align: center !important;
      }
      .pagination-ellipsis {
        padding: 8px 6px !important;
        font-size: 13px !important;
      }
      .individual-section {
        padding: 20px 8px !important;
      }
      .individual-stats {
        padding: 20px 16px !important;
      }
      .stats-title {
        font-size: 20px !important;
        margin-bottom: 16px !important;
      }
      .stats-grid {
        grid-template-columns: 1fr !important;
        gap: 16px !important;
      }
      .stats-item {
        padding: 8px 0 !important;
      }
      .stats-label {
        font-size: 12px !important;
      }
      .stats-value {
        font-size: 14px !important;
      }
      .filters-grid {
        display: grid !important;
        grid-template-columns: 1fr !important;
        gap: 16px !important;
      }
      .filters-card {
        padding: 20px 16px !important;
      }
      .filters-heading {
        font-size: 20px !important;
        margin-bottom: 16px !important;
      }
      .filters-sub-heading {
        font-size: 16px !important;
        margin-bottom: 8px !important;
      }
      .filters-input {
        max-width: 100% !important;
      }
      .filters-button {
        max-width: 100% !important;
      }
    }
    @media (min-width: 769px) {
      .individual-cards {
        display: none !important;
      }
      .individual-table {
        display: table !important;
      }
    }
  `;

  return (
    <div className="min-h-screen">
      <Header />

      {/* Filters Section */}
      <div style={styles.container}>
        <div style={styles.maxWidth}>
          <div style={styles.card} className="filters-card">
            <h2 style={styles.heading} className="filters-heading">
              Individuals
            </h2>
            <p style={{ color: "#666", marginBottom: "24px" }}>
              Search and filter individuals by location, sectors, job titles,
              and more.
            </p>

            <div style={styles.grid} className="filters-grid">
              <div style={styles.gridItem}>
                <h3 style={styles.subHeading} className="filters-sub-heading">
                  Location
                </h3>
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
                <h3 style={styles.subHeading} className="filters-sub-heading">
                  Sector
                </h3>
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
                <h3 style={styles.subHeading} className="filters-sub-heading">
                  Job Information
                </h3>
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
                      const jobTitle = jobTitles.find(
                        (j) => j.id === jobTitleId
                      );
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
                                selectedJobTitles.filter(
                                  (j) => j !== jobTitleId
                                )
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
                <h3 style={styles.subHeading} className="filters-sub-heading">
                  Search
                </h3>
                <span style={styles.label}>Search for Individuals</span>
                <input
                  type="text"
                  placeholder="Enter name here"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={styles.input}
                  className="filters-input"
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                />
                <button
                  onClick={handleSearch}
                  style={styles.button}
                  className="filters-button"
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

            {/* Error Display */}
            {error && <div className="error">{error}</div>}

            {/* Loading Display */}
            {loading && <div className="loading">Loading individuals...</div>}
          </div>
        </div>
      </div>

      {/* Individuals Table Section */}
      <div className="individual-section">
        {/* Statistics Block */}
        {summaryData.totalIndividuals > 0 && (
          <div className="individual-stats">
            <h2 className="stats-title">Individuals</h2>
            <div className="stats-grid">
              <div className="stats-item">
                <span className="stats-label">Individuals:</span>
                <span className="stats-value">
                  {summaryData.totalIndividuals?.toLocaleString() || "0"}
                </span>
              </div>
              <div className="stats-item">
                <span className="stats-label">CEOs:</span>
                <span className="stats-value">
                  {summaryData.ceos?.toLocaleString() || "0"}
                </span>
              </div>
              <div className="stats-item">
                <span className="stats-label">Current roles:</span>
                <span className="stats-value">
                  {summaryData.currentRoles?.toLocaleString() || "0"}
                </span>
              </div>
              <div className="stats-item">
                <span className="stats-label">Chair:</span>
                <span className="stats-value">
                  {summaryData.chairs?.toLocaleString() || "0"}
                </span>
              </div>
              <div className="stats-item">
                <span className="stats-label">Past roles:</span>
                <span className="stats-value">
                  {summaryData.pastRoles?.toLocaleString() || "0"}
                </span>
              </div>
              <div className="stats-item">
                <span className="stats-label">Founder:</span>
                <span className="stats-value">
                  {summaryData.founders?.toLocaleString() || "0"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Results Table */}
        {individuals.length > 0 && (
          <IndividualsTable individuals={individuals} loading={loading} />
        )}

        {/* Pagination */}
        {pagination.pageTotal > 1 && (
          <div className="pagination">
            {generatePaginationButtons(pagination, handlePageChange)}
          </div>
        )}
      </div>

      <Footer />
      <style dangerouslySetInnerHTML={{ __html: style }} />
    </div>
  );
};

export default IndividualsPage;
