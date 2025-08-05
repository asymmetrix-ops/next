"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Types for the article detail page
interface ArticleDetail {
  id: number;
  created_at: number;
  Publication_Date: string;
  Headline: string;
  Strapline: string;
  Body: string;
  sectors: Array<{
    id: number;
    sector_name: string;
    Sector_importance: string;
  }>;
  companies_mentioned: Array<{
    id: number;
    name: string;
  }>;
  Visibility: string;
  Related_Documents: Array<{
    access: string;
    path: string;
    name: string;
    type: string;
    size: number;
    mime: string;
    meta: {
      validated: boolean;
    };
    url: string;
  }>;
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
    fontSize: "28px",
    fontWeight: "700",
    color: "#1a202c",
    marginBottom: "12px",
    marginTop: "0px",
    lineHeight: "1.3",
  },
  date: {
    fontSize: "16px",
    color: "#6b7280",
    marginBottom: "24px",
    fontWeight: "500",
  },
  strapline: {
    fontSize: "18px",
    color: "#374151",
    lineHeight: "1.6",
    marginBottom: "32px",
    fontStyle: "italic",
  },
  body: {
    fontSize: "16px",
    color: "#374151",
    lineHeight: "1.7",
    marginBottom: "32px",
  },
  section: {
    marginBottom: "24px",
  },
  sectionTitle: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#1a202c",
    marginBottom: "16px",
  },
  tagContainer: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "8px",
    marginBottom: "16px",
  },
  tag: {
    backgroundColor: "#e3f2fd",
    color: "#1976d2",
    padding: "8px 12px",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  },
  companyTag: {
    backgroundColor: "#e8f5e8",
    color: "#2e7d32",
    padding: "8px 12px",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
  },
  sectorTag: {
    backgroundColor: "#f3e5f5",
    color: "#7b1fa2",
    padding: "8px 12px",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
  },
  visibility: {
    backgroundColor: "#fff3e0",
    color: "#f57c00",
    padding: "8px 12px",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    display: "inline-block",
  },
  loading: {
    textAlign: "center" as const,
    padding: "40px",
    color: "#666",
    fontSize: "16px",
  },
  error: {
    textAlign: "center" as const,
    padding: "40px",
    color: "#dc2626",
    fontSize: "16px",
  },
  backButton: {
    backgroundColor: "#0075df",
    color: "white",
    fontWeight: "600",
    padding: "12px 24px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
    marginBottom: "24px",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  },
};

const ArticleDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const articleId = params.id as string;

  const fetchArticle = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("asymmetrix_auth_token");
      if (!token) {
        setError("Authentication required");
        return;
      }

      const response = await fetch(
        `https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu/content/${articleId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ArticleDetail = await response.json();
      setArticle(data);
    } catch (error) {
      console.error("Error fetching article:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch article"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (articleId) {
      fetchArticle();
    }
  }, [articleId]);

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

  const handleCompanyClick = (companyId: number) => {
    router.push(`/company/${companyId}`);
  };

  const handleBackClick = () => {
    router.push("/insights-analysis");
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <Header />
        <div style={styles.maxWidth}>
          <div style={styles.loading}>Loading article...</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <Header />
        <div style={styles.maxWidth}>
          <div style={styles.error}>Error: {error}</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!article) {
    return (
      <div style={styles.container}>
        <Header />
        <div style={styles.maxWidth}>
          <div style={styles.error}>Article not found</div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Header />
      <div style={styles.maxWidth}>
        <button onClick={handleBackClick} style={styles.backButton}>
          ← Back to Insights & Analysis
        </button>

        <div style={styles.card}>
          {/* Article Header */}
          <h1 style={styles.heading}>{article.Headline}</h1>
          <p style={styles.date}>{formatDate(article.Publication_Date)}</p>
          <p style={styles.strapline}>{article.Strapline}</p>

          {/* Article Body */}
          <div
            style={styles.body}
            dangerouslySetInnerHTML={{ __html: article.Body }}
          />

          {/* Companies Section */}
          {article.companies_mentioned &&
            article.companies_mentioned.length > 0 && (
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Companies</h2>
                <div style={styles.tagContainer}>
                  {article.companies_mentioned.map((company) => (
                    <span
                      key={company.id}
                      style={styles.companyTag}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#c8e6c9";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#e8f5e8";
                      }}
                      onClick={() => handleCompanyClick(company.id)}
                    >
                      {company.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

          {/* Sectors Section */}
          {article.sectors && article.sectors.length > 0 && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Sectors</h2>
              <div style={styles.tagContainer}>
                {article.sectors.map((sector) => (
                  <span key={sector.id} style={styles.sectorTag}>
                    {sector.sector_name}
                    {sector.Sector_importance === "Primary" && " (Primary)"}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Visibility */}
          {article.Visibility && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Visibility</h2>
              <span style={styles.visibility}>{article.Visibility}</span>
            </div>
          )}

          {/* Related Documents */}
          {article.Related_Documents &&
            article.Related_Documents.length > 0 && (
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Related Documents</h2>
                <div style={styles.tagContainer}>
                  {article.Related_Documents.map((doc, index) => (
                    <a
                      key={index}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        ...styles.tag,
                        textDecoration: "none",
                      }}
                    >
                      {doc.name}
                    </a>
                  ))}
                </div>
              </div>
            )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ArticleDetailPage;
