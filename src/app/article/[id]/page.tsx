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

  // Robust sector id extraction in case backend changes keys
  const getSectorId = (sector: unknown): number | undefined => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = sector as any;
    const candidate = s?.id ?? s?.sector_id ?? s?.Sector_id;
    if (typeof candidate === "number") return candidate;
    if (typeof candidate === "string") {
      const parsed = parseInt(candidate, 10);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  };

  const handleSectorClick = (sector: { id: number } | unknown) => {
    const sectorId = getSectorId(sector);
    if (sectorId) router.push(`/sector/${sectorId}`);
  };

  const handleBackClick = () => {
    router.push("/insights-analysis");
  };

  // Utilities to embed image attachments within the body content
  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const buildFigureHtml = (url: string, name: string) =>
    `<figure class="article-inline-image"><img src="${escapeHtml(
      url
    )}" alt="${escapeHtml(name)}" /><figcaption>${escapeHtml(
      name
    )}</figcaption></figure>`;

  // Replace placeholders like <image_1>, <image_2> with corresponding image attachments
  const replaceImagePlaceholders = (
    bodyHtml: string,
    imageDocs: Array<{ url: string; name: string }>
  ): { html: string; usedIndices: Set<number> } => {
    const used = new Set<number>();
    if (!bodyHtml) return { html: "", usedIndices: used };
    if (!imageDocs || imageDocs.length === 0)
      return { html: bodyHtml, usedIndices: used };

    const placeholderRegex = /<image_(\d+)>/gi; // 1-based index
    const replaced = bodyHtml.replace(placeholderRegex, (_match, p1) => {
      const idx = parseInt(p1, 10) - 1;
      if (Number.isNaN(idx) || idx < 0 || idx >= imageDocs.length) {
        // Leave placeholder unchanged if out of range
        return _match;
      }
      used.add(idx);
      const doc = imageDocs[idx];
      return buildFigureHtml(doc.url, doc.name || "");
    });

    return { html: replaced, usedIndices: used };
  };

  const injectImagesIntoBody = (
    bodyHtml: string,
    attachments: Array<{
      url: string;
      name: string;
      mime?: string;
      type?: string;
    }>
  ): { html: string; injected: boolean } => {
    if (!bodyHtml) return { html: "", injected: false };
    const imageDocs = (attachments || []).filter(isImageDoc);
    if (imageDocs.length === 0) return { html: bodyHtml, injected: false };

    // Split by paragraph closing tags to place images between paragraphs
    const parts = bodyHtml.split(/<\/p>/i);
    const paragraphCount = Math.max(parts.length - 1, 0);

    if (paragraphCount <= 0) {
      // No clear paragraphs; append all images at the end of the body
      const figures = imageDocs
        .map((doc) => buildFigureHtml(doc.url, doc.name || ""))
        .join("");
      return { html: `${bodyHtml}${figures}`, injected: true };
    }

    // Distribute images as evenly as possible across paragraphs
    const insertionMap = new Map<number, number>(); // paragraphIndex -> imageIndex
    let lastPos = -1;
    for (let i = 0; i < imageDocs.length; i++) {
      let pos =
        Math.floor(((i + 1) * paragraphCount) / (imageDocs.length + 1)) - 1;
      pos = Math.max(0, Math.min(paragraphCount - 1, pos));
      if (pos <= lastPos) pos = Math.min(paragraphCount - 1, lastPos + 1);
      insertionMap.set(pos, i);
      lastPos = pos;
      if (lastPos >= paragraphCount - 1 && i < imageDocs.length - 1) break;
    }

    let result = "";
    for (let p = 0; p < parts.length; p++) {
      const segment = parts[p];
      if (p < paragraphCount) {
        result += `${segment}</p>`;
        if (insertionMap.has(p)) {
          const imgIdx = insertionMap.get(p)!;
          const doc = imageDocs[imgIdx];
          result += buildFigureHtml(doc.url, doc.name || "");
        }
      } else {
        // Remainder (after the last </p>)
        result += segment;
      }
    }

    return { html: result, injected: true };
  };

  const isImageDoc = (doc: {
    mime?: string;
    type?: string;
    url: string;
    name: string;
  }) => {
    if (!doc) return false;
    if (doc.mime && doc.mime.startsWith("image/")) return true;
    if (doc.type && doc.type.startsWith("image/")) return true;
    const nameOrUrl = `${doc.name || ""} ${doc.url || ""}`;
    return /(\.(png|jpe?g|gif|webp|svg))($|\?)/i.test(nameOrUrl);
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

        <div className="article-layout">
          {/* Left: Main body (2/3) */}
          <div style={styles.card} className="article-main">
            {/* Article Header */}
            <h1 style={styles.heading}>{article.Headline}</h1>
            <p style={styles.strapline}>{article.Strapline}</p>

            {/* Article Body with embedded images from attachments */}
            {(() => {
              const allImageDocs = (article.Related_Documents || []).filter(
                isImageDoc
              );
              const { html: withPlaceholders, usedIndices } =
                replaceImagePlaceholders(article.Body, allImageDocs);
              const remainingImages = allImageDocs.filter(
                (_, idx) => !usedIndices.has(idx)
              );
              const { html } = injectImagesIntoBody(
                withPlaceholders,
                remainingImages
              );
              return (
                <div
                  style={styles.body}
                  className="article-body"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              );
            })()}

            {/* Inline image grid (if additional images remain useful outside body) */}
            {article.Related_Documents &&
              article.Related_Documents.some(isImageDoc) && (
                <div style={styles.section}>
                  <h2 style={styles.sectionTitle}>Images</h2>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(220px, 1fr))",
                      gap: 16,
                    }}
                  >
                    {article.Related_Documents.filter(isImageDoc).map(
                      (doc, idx) => (
                        <figure key={`${doc.url}-${idx}`} style={{ margin: 0 }}>
                          <img src={doc.url} alt={doc.name} />
                          <figcaption>{doc.name}</figcaption>
                        </figure>
                      )
                    )}
                  </div>
                </div>
              )}

            {/* Related Documents (attachments) */}
            {article.Related_Documents &&
              article.Related_Documents.filter((d) => !isImageDoc(d)).length >
                0 && (
                <div style={styles.section}>
                  <h2 style={styles.sectionTitle}>Related Documents</h2>
                  <div style={styles.tagContainer}>
                    {article.Related_Documents.filter(
                      (d) => !isImageDoc(d)
                    ).map((doc, index) => (
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

          {/* Right: Metadata (1/3) */}
          <div style={styles.card} className="article-meta">
            {/* Publication Date */}
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Published</h2>
              <p style={styles.date}>{formatDate(article.Publication_Date)}</p>
            </div>

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
                    <span
                      key={sector.id}
                      style={{ ...styles.sectorTag, cursor: "pointer" }}
                      onClick={() => handleSectorClick(sector)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#e1bee7";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#f3e5f5";
                      }}
                      title="Open sector page"
                    >
                      {sector.sector_name}
                      {sector.Sector_importance === "Primary" && " (Primary)"}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .article-layout { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; }
          @media (max-width: 1024px) { .article-layout { grid-template-columns: 1fr; } }
          /* Preserve HTML formatting inside article body */
          .article-body p { margin: 0 0 1rem 0; }
          .article-body ul { list-style: disc; margin: 0 0 1rem 1.25rem; padding-left: 1.25rem; }
          .article-body ol { list-style: decimal; margin: 0 0 1rem 1.25rem; padding-left: 1.25rem; }
          .article-body li { margin-bottom: 0.5rem; }
          .article-body h1, .article-body h2, .article-body h3, .article-body h4, .article-body h5, .article-body h6 { margin: 1.25rem 0 0.75rem; font-weight: 700; }
          .article-body a { color: #2563eb; text-decoration: underline; }
          .article-body blockquote { margin: 1rem 0; padding-left: 1rem; border-left: 3px solid #e5e7eb; color: #374151; }
          .article-body table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
          .article-body th, .article-body td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
          /* Images inside article body */
          .article-body img { max-width: 100%; height: auto; display: block; margin: 1rem auto; border-radius: 8px; }
          .article-body figure { margin: 1rem 0; }
          .article-body figcaption { text-align: center; font-size: 0.875rem; color: #6b7280; margin-top: 0.5rem; }
          .article-inline-image { margin: 1.25rem 0; }
        `,
        }}
      />
    </div>
  );
};

export default ArticleDetailPage;
