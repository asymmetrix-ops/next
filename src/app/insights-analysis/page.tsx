"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  ContentArticle,
  InsightsAnalysisResponse,
  InsightsAnalysisFilters,
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
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
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

  const badgeClassFor = (contentType?: string): string => {
    const t = (contentType || "").toLowerCase();
    if (t === "company analysis") return "badge badge-company-analysis";
    if (t === "deal analysis") return "badge badge-deal-analysis";
    if (t === "sector analysis") return "badge badge-sector-analysis";
    if (t === "hot take") return "badge badge-hot-take";
    if (t === "executive interview") return "badge badge-executive-interview";
    return "badge";
  };

  return (
    <div className="insights-analysis-cards">
      {articles.map((article: ContentArticle, index: number) => (
        <a
          key={article.id || index}
          href={`/article/${article.id}`}
          className="article-card"
          onClick={(e) => {
            if (
              e.defaultPrevented ||
              e.button !== 0 ||
              e.metaKey ||
              e.ctrlKey ||
              e.shiftKey ||
              e.altKey
            )
              return;
            e.preventDefault();
            handleArticleClick(article.id);
          }}
        >
          {/* Article Title */}
          <h3 className="article-title">
            {article.Headline || "Not Available"}
          </h3>

          {/* Date + Content Type inline */}
          <p className="article-date">
            <span>{formatDate(article.Publication_Date)}</span>
            {article.Content_Type && (
              <span className={badgeClassFor(article.Content_Type)}>
                {article.Content_Type}
              </span>
            )}
          </p>

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
        </a>
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

  const [searchTerm, setSearchTerm] = useState("");
  const [contentTypes, setContentTypes] = useState<string[]>([]);

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

  const fetchInsightsAnalysis = async (filters: InsightsAnalysisFilters) => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("asymmetrix_auth_token");
      if (!token) {
        setError("Authentication required");
        return;
      }

      // Build GET query params per API spec
      const params = new URLSearchParams();
      params.append("Offset", String(filters.Offset));
      params.append("Per_page", String(filters.Per_page));
      if (filters.search_query)
        params.append("search_query", filters.search_query);
      if (filters.Countries?.length)
        params.append("Countries", filters.Countries.join(","));
      if (filters.Provinces?.length)
        params.append("Provinces", filters.Provinces.join(","));
      if (filters.Cities?.length)
        params.append("Cities", filters.Cities.join(","));
      if (filters.primary_sectors_ids?.length)
        params.append(
          "primary_sectors_ids",
          filters.primary_sectors_ids.join(",")
        );
      if (filters.Secondary_sectors_ids?.length)
        params.append(
          "Secondary_sectors_ids",
          filters.Secondary_sectors_ids.join(",")
        );
      const ct = (filters.Content_Type || filters.content_type || "").trim();
      if (ct) params.append("content_type", ct);

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
    // Initial fetch of all articles
    fetchInsightsAnalysis(filters);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch content type options
  useEffect(() => {
    const run = async () => {
      try {
        const token = localStorage.getItem("asymmetrix_auth_token");
        if (!token) return;
        const resp = await fetch(
          "https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob/content_types_for_articles",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (!resp.ok) return;
        const data = (await resp.json()) as Array<{
          Content_Content_Type1: string;
        }>;
        const values = Array.from(
          new Set(
            (Array.isArray(data) ? data : [])
              .map((d) => (d?.Content_Content_Type1 || "").trim())
              .filter(Boolean)
          )
        );
        setContentTypes(values);
      } catch {
        // ignore
      }
    };
    run();
  }, []);

  // Handle search
  const handleSearch = () => {
    const updatedFilters = {
      ...filters,
      search_query: searchTerm,
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
    .article-content-type {
      display: inline-block;
      font-size: 12px;
      line-height: 1;
      color: #374151;
      background-color: #f3f4f6;
      padding: 4px 8px;
      border-radius: 9999px;
      margin: 0 0 8px 0;
      font-weight: 600;
    }
    .article-date {
      font-size: 14px;
      color: #6b7280;
      margin: 0 0 16px 0;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .badge {
      display: inline-block;
      font-size: 12px;
      line-height: 1;
      padding: 6px 10px;
      border-radius: 9999px;
      border: 1px solid transparent;
      font-weight: 600;
    }
    .badge-company-analysis {
      background: #ecfdf5;
      color: #065f46;
      border-color: #a7f3d0;
    }
    .badge-deal-analysis {
      background: #eff6ff;
      color: #1e40af;
      border-color: #bfdbfe;
    }
    .badge-sector-analysis {
      background: #f5f3ff;
      color: #5b21b6;
      border-color: #ddd6fe;
    }
    .badge-hot-take {
      background: #fff7ed;
      color: #9a3412;
      border-color: #fed7aa;
    }
    .badge-executive-interview {
      background: #f0fdf4;
      color: #166534;
      border-color: #bbf7d0;
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
            <div style={styles.searchDiv}>
              <input
                type="text"
                placeholder="Enter search term here"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.input}
                className="filters-input"
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
              <select
                value={filters.Content_Type || ""}
                onChange={(e) => {
                  const updated = {
                    ...filters,
                    Content_Type: e.target.value || undefined,
                    content_type: e.target.value || undefined,
                    Offset: 1,
                  };
                  setFilters(updated);
                  fetchInsightsAnalysis(updated);
                }}
                style={{
                  ...styles.input,
                  maxWidth: 280,
                  paddingRight: 8,
                }}
              >
                <option value="">All Content Types</option>
                {contentTypes.map((ct) => (
                  <option key={ct} value={ct}>
                    {ct}
                  </option>
                ))}
              </select>
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
