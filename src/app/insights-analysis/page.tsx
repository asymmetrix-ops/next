"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { locationsService } from "@/lib/locationsService";
import {
  ContentArticle,
  InsightsAnalysisResponse,
  InsightsAnalysisFilters,
  Country,
  Province,
  City,
  PrimarySector,
  SecondarySector,
} from "../../types/insightsAnalysis";

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
    fontSize: "14px",
  },
  linkButton: {
    backgroundColor: "transparent",
    border: "none",
    color: "#0075df",
    textDecoration: "underline",
    cursor: "pointer",
    fontSize: "14px",
    marginTop: "12px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "24px",
    marginBottom: "24px",
  },
  gridItem: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#374151",
    marginBottom: "4px",
  },
  select: {
    width: "100%",
    maxWidth: "300px",
  },
};

// Insights Analysis Stats Component
const InsightsAnalysisStats = ({
  data,
}: {
  data: InsightsAnalysisResponse;
}) => {
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
        Insights & Analysis
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
            Total Articles:
          </span>
          <span
            style={{
              fontSize: "20px",
              color: "#000",
              fontWeight: "700",
            }}
          >
            {data.itemsReceived?.toLocaleString() || "0"}
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
            Current Page:
          </span>
          <span
            style={{
              fontSize: "20px",
              color: "#000",
              fontWeight: "700",
            }}
          >
            {data.curPage?.toLocaleString() || "0"}
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
            Total Pages:
          </span>
          <span
            style={{
              fontSize: "20px",
              color: "#000",
              fontWeight: "700",
            }}
          >
            {data.pageTotal?.toLocaleString() || "0"}
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
        {totalItems.toLocaleString()} articles
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

// Insights Analysis Cards Component
const InsightsAnalysisCards = ({
  articles,
  loading,
}: {
  articles: ContentArticle[];
  loading: boolean;
}) => {
  const router = useRouter();

  const handleArticleClick = (articleId: number) => {
    // Navigate to article detail page
    router.push(`/article/${articleId}`);
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
        Loading articles...
      </div>
    );
  }

  if (!articles || articles.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
        No articles found.
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not available";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return "Invalid date";
    }
  };

  const formatSectors = (
    sectors: Array<Array<{ sector_name: string }>> | undefined
  ) => {
    if (!sectors || sectors.length === 0) return "Not available";
    const allSectors = sectors.flat().map((s) => s.sector_name);
    return allSectors.join(", ");
  };

  const formatCompanies = (
    companies: ContentArticle["companies_mentioned"] | undefined
  ) => {
    if (!companies || companies.length === 0) return "Not available";
    return companies.map((c) => c.name).join(", ");
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
        gap: "24px",
        padding: "0",
      }}
    >
      {articles.map((article: ContentArticle, index: number) => (
        <div
          key={article.id || index}
          style={{
            backgroundColor: "white",
            borderRadius: "12px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            padding: "24px",
            border: "1px solid #e2e8f0",
            cursor: "pointer",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 8px 25px rgba(0, 0, 0, 0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
          }}
          onClick={() => handleArticleClick(article.id)}
        >
          {/* Article Title */}
          <h3
            style={{
              fontSize: "18px",
              fontWeight: "700",
              color: "#1a202c",
              margin: "0 0 8px 0",
              lineHeight: "1.3",
            }}
          >
            {article.Headline || "Not Available"}
          </h3>

          {/* Publication Date */}
          <p
            style={{
              fontSize: "14px",
              color: "#6b7280",
              margin: "0 0 16px 0",
              fontWeight: "500",
            }}
          >
            {formatDate(article.Publication_Date)}
          </p>

          {/* Strapline/Summary */}
          <p
            style={{
              fontSize: "14px",
              color: "#374151",
              lineHeight: "1.6",
              margin: "0 0 16px 0",
              display: "-webkit-box",
              WebkitLineClamp: 4,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {article.Strapline || "No summary available"}
          </p>

          {/* Companies Section */}
          <div style={{ marginBottom: "12px" }}>
            <span
              style={{
                fontSize: "13px",
                fontWeight: "600",
                color: "#374151",
                marginRight: "8px",
              }}
            >
              Companies:
            </span>
            <span
              style={{
                fontSize: "13px",
                color: "#6b7280",
                lineHeight: "1.4",
              }}
            >
              {formatCompanies(article.companies_mentioned)}
            </span>
          </div>

          {/* Sectors Section */}
          <div>
            <span
              style={{
                fontSize: "13px",
                fontWeight: "600",
                color: "#374151",
                marginRight: "8px",
              }}
            >
              Sectors:
            </span>
            <span
              style={{
                fontSize: "13px",
                color: "#6b7280",
                lineHeight: "1.4",
              }}
            >
              {formatSectors(article.sectors)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

// Main Insights Analysis Page Component
const InsightsAnalysisPage = () => {
  // State for filters
  const [filters, setFilters] = useState<InsightsAnalysisFilters>({
    search_query: "",
    primary_sectors_ids: [],
    Secondary_sectors_ids: [],
    Countries: [],
    Provinces: [],
    Cities: [],
    Offset: 1,
    Per_page: 50,
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
  const [searchTerm, setSearchTerm] = useState("");

  // State for API data
  const [countries, setCountries] = useState<Country[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [primarySectors, setPrimarySectors] = useState<PrimarySector[]>([]);
  const [secondarySectors, setSecondarySectors] = useState<SecondarySector[]>(
    []
  );

  // Loading states
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingPrimarySectors, setLoadingPrimarySectors] = useState(false);
  const [loadingSecondarySectors, setLoadingSecondarySectors] = useState(false);

  // State for insights analysis data
  const [articles, setArticles] = useState<ContentArticle[]>([]);
  const [pagination, setPagination] = useState({
    itemsReceived: 0,
    curPage: 1,
    nextPage: null as number | null,
    prevPage: null as number | null,
    offset: 0,
    perPage: 50,
    pageTotal: 0,
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

  const fetchInsightsAnalysis = async (filters: InsightsAnalysisFilters) => {
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

      // Add offset and per_page
      params.append("Offset", filters.Offset.toString());
      params.append("Per_page", filters.Per_page.toString());

      // Add search query
      if (filters.search_query)
        params.append("search_query", filters.search_query);

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
      if (filters.primary_sectors_ids.length > 0) {
        params.append(
          "primary_sectors_ids",
          filters.primary_sectors_ids.join(",")
        );
      }

      if (filters.Secondary_sectors_ids.length > 0) {
        params.append(
          "Secondary_sectors_ids",
          filters.Secondary_sectors_ids.join(",")
        );
      }

      const url = `https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu/Get_All_Content_Articles?${params.toString()}`;

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

      const data: InsightsAnalysisResponse = await response.json();

      setArticles(data.items);
      setPagination({
        itemsReceived: data.itemsReceived,
        curPage: data.curPage,
        nextPage: data.nextPage,
        prevPage: data.prevPage,
        offset: data.offset,
        perPage: filters.Per_page,
        pageTotal: data.pageTotal,
      });
    } catch (error) {
      console.error("Error fetching insights analysis:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch insights analysis"
      );
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchCountries();
    fetchPrimarySectors();
  }, []);

  // Initial fetch of all articles
  useEffect(() => {
    fetchInsightsAnalysis(filters);
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
      search_query: searchTerm,
      Countries: selectedCountries,
      Provinces: selectedProvinces,
      Cities: selectedCities,
      primary_sectors_ids: selectedPrimarySectors,
      Secondary_sectors_ids: selectedSecondarySectors,
      Offset: 1, // Reset to first page when searching
    };
    setFilters(updatedFilters);
    fetchInsightsAnalysis(updatedFilters);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    const updatedFilters = { ...filters, Offset: page };
    setFilters(updatedFilters);
    fetchInsightsAnalysis(updatedFilters);
  };

  // Handle per page change
  const handlePerPageChange = (perPage: number) => {
    const updatedFilters = { ...filters, Per_page: perPage, Offset: 1 };
    setFilters(updatedFilters);
    fetchInsightsAnalysis(updatedFilters);
  };

  return (
    <div style={styles.container}>
      <Header />
      <div style={styles.maxWidth}>
        <div style={styles.card}>
          <h1 style={styles.heading}>Insights & Analysis</h1>
          <p style={{ color: "#666", marginBottom: "24px" }}>
            Search and filter insights and analysis articles by location,
            sectors, and more.
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
              <h3 style={styles.subHeading}>Search</h3>
              <span style={styles.label}>Search for Articles</span>
              <input
                type="text"
                placeholder="Enter search term here"
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
          {pagination.itemsReceived > 0 && (
            <InsightsAnalysisStats
              data={{
                itemsReceived: pagination.itemsReceived,
                curPage: pagination.curPage,
                nextPage: pagination.nextPage,
                prevPage: pagination.prevPage,
                offset: pagination.offset,
                pageTotal: pagination.pageTotal,
                items: articles,
              }}
            />
          )}

          {/* Results Cards */}
          {articles.length > 0 && (
            <InsightsAnalysisCards articles={articles} loading={loading} />
          )}

          {/* Pagination */}
          {pagination.pageTotal > 1 && (
            <Pagination
              currentPage={pagination.curPage}
              totalItems={pagination.itemsReceived}
              perPage={pagination.perPage}
              onPageChange={handlePageChange}
              onPerPageChange={handlePerPageChange}
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

export default InsightsAnalysisPage;
