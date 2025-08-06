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
    return <div className="loading">Loading articles...</div>;
  }

  if (!articles || articles.length === 0) {
    return <div className="loading">No articles found.</div>;
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
    <div className="insights-analysis-cards">
      {articles.map((article: ContentArticle, index: number) => (
        <div
          key={article.id || index}
          className="article-card"
          onClick={() => handleArticleClick(article.id)}
        >
          {/* Article Title */}
          <h3 className="article-title">
            {article.Headline || "Not Available"}
          </h3>

          {/* Publication Date */}
          <p className="article-date">{formatDate(article.Publication_Date)}</p>

          {/* Strapline/Summary */}
          <p className="article-summary">
            {article.Strapline || "No summary available"}
          </p>

          {/* Companies Section */}
          <div className="article-meta">
            <span className="article-meta-label">Companies:</span>
            <span className="article-meta-value">
              {formatCompanies(article.companies_mentioned)}
            </span>
          </div>

          {/* Sectors Section */}
          <div className="article-meta">
            <span className="article-meta-label">Sectors:</span>
            <span className="article-meta-value">
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
    // Initial fetch of all articles
    fetchInsightsAnalysis(filters);
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

  const style = `
    .insights-analysis-section {
      padding: 32px 24px;
      border-radius: 8px;
    }
    .insights-analysis-stats {
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
    .insights-analysis-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 24px;
      padding: 0;
      margin-bottom: 24px;
    }
    .article-card {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      padding: 16px;
      border: 1px solid #e2e8f0;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .article-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }
    .article-title {
      font-size: 18px;
      font-weight: 700;
      color: #1a202c;
      margin: 0 0 8px 0;
      line-height: 1.3;
    }
    .article-date {
      font-size: 14px;
      color: #6b7280;
      margin: 0 0 16px 0;
      font-weight: 500;
    }
    .article-summary {
      font-size: 14px;
      color: #374151;
      line-height: 1.6;
      margin: 0 0 16px 0;
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .article-meta {
      margin-bottom: 12px;
    }
    .article-meta:last-child {
      margin-bottom: 0;
    }
    .article-meta-label {
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      margin-right: 8px;
    }
    .article-meta-value {
      font-size: 13px;
      color: #6b7280;
      line-height: 1.4;
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
      .insights-analysis-cards {
        grid-template-columns: 1fr !important;
        gap: 12px !important;
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
      .insights-analysis-section {
        padding: 20px 8px !important;
      }
      .insights-analysis-stats {
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
  `;

  return (
    <div className="min-h-screen">
      <Header />

      {/* Filters Section */}
      <div style={styles.container}>
        <div style={styles.maxWidth}>
          <div style={styles.card} className="filters-card">
            <h2 style={styles.heading} className="filters-heading">
              Insights & Analysis
            </h2>
            <p style={{ color: "#666", marginBottom: "24px" }}>
              Search and filter insights and analysis articles by location,
              sectors, and more.
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
                  Search
                </h3>
                <span style={styles.label}>Search for Articles</span>
                <input
                  type="text"
                  placeholder="Enter search term here"
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
            {loading && <div className="loading">Loading articles...</div>}
          </div>
        </div>
      </div>

      {/* Insights Analysis Section */}
      <div className="insights-analysis-section">
        {/* Statistics Block */}
        {pagination.itemsReceived > 0 && (
          <div className="insights-analysis-stats">
            <h2 className="stats-title">Insights & Analysis</h2>
            <div className="stats-grid">
              <div className="stats-item">
                <span className="stats-label">Total Articles:</span>
                <span className="stats-value">
                  {pagination.itemsReceived?.toLocaleString() || "0"}
                </span>
              </div>
              <div className="stats-item">
                <span className="stats-label">Current Page:</span>
                <span className="stats-value">
                  {pagination.curPage?.toLocaleString() || "0"}
                </span>
              </div>
              <div className="stats-item">
                <span className="stats-label">Total Pages:</span>
                <span className="stats-value">
                  {pagination.pageTotal?.toLocaleString() || "0"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Results Cards */}
        {articles.length > 0 && (
          <InsightsAnalysisCards articles={articles} loading={loading} />
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

export default InsightsAnalysisPage;
