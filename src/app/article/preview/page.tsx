"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InlineAudioPlayer from "@/components/article/InlineAudioPlayer";
import EmbeddedPdfViewer from "@/components/article/EmbeddedPdfViewer";

type PreviewVisibility = "Admin" | "Client" | "Public";

type PreviewAttachment = {
  access?: string;
  path?: string;
  name?: string;
  type?: string;
  size?: number;
  mime?: string;
  meta?: unknown;
  url?: string;
};

type PreviewSector = { id: number; sector_name: string; Sector_importance?: string };
type PreviewCompany = { id: number; name: string };

type ArticlePreviewPayload = {
  id?: number;
  created_at?: number;
  Publication_Date?: string;
  Headline?: string;
  Strapline?: string;
  Content_Type?: string;
  Summary?: string | unknown[];
  summary?: string | unknown[];
  Body?: string;
  sectors?: PreviewSector[];
  companies_mentioned?: PreviewCompany[];
  Visibility?: PreviewVisibility | string;
  Related_Documents?: PreviewAttachment[];
  Related_Corporate_Event?: Array<{ id?: number; description?: string; deal_type?: string }>;
};

const CONTENT_PREVIEW_STORAGE_KEY = "asymmetrix_content_preview_v1";

// Shared styles (mirrors `/article/[id]` layout closely)
const styles = {
  container: {
    backgroundColor: "#f9fafb",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    width: "100%",
    maxWidth: "100%",
    overflowX: "hidden" as const,
    boxSizing: "border-box" as const,
  },
  maxWidth: {
    padding: "16px",
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: "24px",
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box" as const,
  },
  card: {
    backgroundColor: "white",
    borderRadius: "12px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    padding: "24px 16px",
    marginBottom: "0",
    boxSizing: "border-box" as const,
    width: "100%",
    maxWidth: "100%",
    overflow: "hidden",
  },
  heading: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#1a202c",
    marginBottom: "12px",
    marginTop: "0px",
    lineHeight: "1.3",
  },
  strapline: {
    fontSize: "18px",
    color: "#374151",
    lineHeight: "1.6",
    marginBottom: "20px",
    fontStyle: "italic",
  },
  body: {
    fontSize: "16px",
    color: "#374151",
    lineHeight: "1.7",
    marginBottom: "16px",
  },
  section: { marginBottom: "16px" },
  sectionTitle: { fontSize: "20px", fontWeight: "600", color: "#1a202c", marginBottom: "12px" },
  tagContainer: { display: "flex", flexWrap: "wrap" as const, gap: "8px", marginBottom: "16px" },
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
  contentTypeBadge: {
    display: "inline-block",
    fontSize: "12px",
    lineHeight: 1,
    color: "#1e40af",
    backgroundColor: "#eff6ff",
    padding: "6px 10px",
    borderRadius: "9999px",
    border: "1px solid #bfdbfe",
    fontWeight: 600,
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
    marginBottom: "0",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    minHeight: "44px",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    textDecoration: "none",
  },
  loading: { textAlign: "center" as const, padding: "40px", color: "#666", fontSize: "16px" },
  error: { textAlign: "center" as const, padding: "40px", color: "#dc2626", fontSize: "16px" },
};

const escapeHtml = (str: string) =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const stripHtmlToText = (html: string): string => {
  const input = String(html || "").trim();
  if (!input) return "";
  try {
    const doc = new DOMParser().parseFromString(input, "text/html");
    return (doc.body?.textContent || "").replace(/\s+/g, " ").trim();
  } catch {
    return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
};

const normalizeSummaryHtml = (raw: string | unknown[]): string => {
  if (Array.isArray(raw)) {
    const items = raw
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .map((line) => `<li>${escapeHtml(line)}</li>`)
      .join("");
    return items ? `<ul>${items}</ul>` : "";
  }

  const input = String(raw || "").trim();
  if (!input) return "";

  try {
    const parsed = JSON.parse(input);
    if (Array.isArray(parsed)) {
      const items = parsed
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .map((line) => `<li>${escapeHtml(line)}</li>`)
        .join("");
      return items ? `<ul>${items}</ul>` : "";
    }
  } catch {
    // ignore
  }

  if (/<\s*(ul|ol|li)\b/i.test(input)) return input;

  const text = stripHtmlToText(input);
  if (!text) return "";
  const linesFromNewlines = text
    .split(/\r?\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const lines =
    linesFromNewlines.length > 1
      ? linesFromNewlines
      : text.includes("•")
        ? text
            .split("•")
            .map((s) => s.trim())
            .filter(Boolean)
        : [text];
  const items = lines
    .map((line) => line.replace(/^[-*•]\s+/, "").trim())
    .filter(Boolean)
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join("");
  return `<ul>${items}</ul>`;
};

const getFirstSummaryBullet = (summaryHtml: string): string => {
  const input = String(summaryHtml || "").trim();
  if (!input) return "";
  try {
    const doc = new DOMParser().parseFromString(input, "text/html");
    const li = doc.querySelector("li");
    const liText = (li?.textContent || "").trim();
    if (liText) return liText;
    const text = (doc.body?.textContent || "").trim();
    if (!text) return "";
    const parts = text.split(/\r?\n+/).map((s) => s.trim()).filter(Boolean);
    return (parts[0] || "").trim();
  } catch {
    return stripHtmlToText(input);
  }
};

const resolveDocumentUrl = (doc: PreviewAttachment): string => {
  const candidate = String(doc?.url || doc?.path || "").trim();
  if (!candidate) return "";
  if (/^https?:\/\//i.test(candidate)) return candidate;
  if (candidate.startsWith("/")) {
    return `https://xdil-abvj-o7rq.e2.xano.io${candidate}`;
  }
  return candidate;
};

const isImageDoc = (doc: PreviewAttachment) => {
  if (!doc) return false;
  if (doc.mime && String(doc.mime).startsWith("image/")) return true;
  if (doc.type && String(doc.type).startsWith("image/")) return true;
  const nameOrUrl = `${doc.name || ""} ${doc.url || ""} ${doc.path || ""}`;
  return /(\.(png|jpe?g|gif|webp|svg))($|\?)/i.test(nameOrUrl);
};

const isAudioDoc = (doc: PreviewAttachment) => {
  if (!doc) return false;
  if (doc.mime && String(doc.mime).startsWith("audio/")) return true;
  if (doc.type && /^audio$/i.test(String(doc.type))) return true;
  const nameOrUrl = `${doc.name || ""} ${doc.url || ""} ${doc.path || ""}`;
  return /(\.(mp3|m4a|aac|wav|ogg|oga|opus|flac))($|\?)/i.test(nameOrUrl);
};

const isPdfDoc = (doc: PreviewAttachment) => {
  if (!doc) return false;
  if (doc.mime && /^application\/pdf$/i.test(String(doc.mime))) return true;
  if (doc.type && /^application\/pdf$/i.test(String(doc.type))) return true;
  const nameOrUrl = `${doc.name || ""} ${doc.url || ""} ${doc.path || ""}`;
  return /(\.pdf)($|\?)/i.test(nameOrUrl);
};

// Basic spacing normalizer to avoid huge blank areas from empty paragraphs
const normalizeBodyHtmlSpacing = (rawHtml: string): string => {
  const input = String(rawHtml || "");
  if (!input.trim()) return "";
  try {
    const doc = new DOMParser().parseFromString(input, "text/html");
    const hasNonTrivialContent = (el: Element): boolean => {
      if (el.querySelector("img,figure,table,iframe,embed,object,video,audio,svg,pre,code,a")) {
        return true;
      }
      const text = String(el.textContent || "").replace(/\u00a0/g, " ").trim();
      if (text) return true;
      const html = String(el.innerHTML || "")
        .replace(/&nbsp;/gi, " ")
        .replace(/<br\s*\/?>/gi, "")
        .replace(/\s+/g, "")
        .trim();
      return Boolean(html);
    };
    for (const p of Array.from(doc.body.querySelectorAll("p"))) {
      if (!hasNonTrivialContent(p)) p.remove();
    }
    return doc.body.innerHTML;
  } catch {
    return input;
  }
};

const buildFigureHtml = (url: string, name: string) =>
  `<figure class="article-inline-image"><img src="${escapeHtml(url)}" alt="${escapeHtml(
    name
  )}" /><figcaption>${escapeHtml(name)}</figcaption></figure>`;

const replaceImagePlaceholders = (
  bodyHtml: string,
  imageDocs: Array<{ url: string; name: string }>
): { html: string; usedIndices: Set<number> } => {
  const used = new Set<number>();
  if (!bodyHtml) return { html: "", usedIndices: used };
  if (!imageDocs || imageDocs.length === 0) return { html: bodyHtml, usedIndices: used };

  const placeholderRegex = /<image_(\d+)>/gi;
  const replaced = bodyHtml.replace(placeholderRegex, (_match, p1) => {
    const idx = parseInt(p1, 10) - 1;
    if (Number.isNaN(idx) || idx < 0 || idx >= imageDocs.length) return _match;
    used.add(idx);
    const doc = imageDocs[idx];
    return doc?.url ? buildFigureHtml(doc.url, doc.name || "") : _match;
  });
  return { html: replaced, usedIndices: used };
};

const injectImagesIntoBody = (
  bodyHtml: string,
  attachments: Array<{ url: string; name: string; mime?: string; type?: string }>
): { html: string; injected: boolean } => {
  if (!bodyHtml) return { html: "", injected: false };
  const imageDocs = (attachments || []).filter(Boolean);
  if (imageDocs.length === 0) return { html: bodyHtml, injected: false };

  const parts = bodyHtml.split(/<\/p>/i);
  const paragraphCount = Math.max(parts.length - 1, 0);
  if (paragraphCount <= 0) {
    const figures = imageDocs
      .map((doc) => (doc.url ? buildFigureHtml(doc.url, doc.name || "") : ""))
      .filter(Boolean)
      .join("");
    return { html: `${bodyHtml}${figures}`, injected: true };
  }

  const insertionMap = new Map<number, number>();
  let lastPos = -1;
  for (let i = 0; i < imageDocs.length; i++) {
    let pos = Math.floor(((i + 1) * paragraphCount) / (imageDocs.length + 1)) - 1;
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
        if (doc?.url) result += buildFigureHtml(doc.url, doc.name || "");
      }
    } else {
      result += segment;
    }
  }

  return { html: result, injected: true };
};

export default function ArticlePreviewPage() {
  const [draft, setDraft] = useState<ArticlePreviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CONTENT_PREVIEW_STORAGE_KEY);
      if (!raw) {
        setDraft(null);
        setError("No preview data found. Click Preview in Admin → Content first.");
        return;
      }
      const parsed = JSON.parse(raw) as ArticlePreviewPayload;
      setDraft(parsed && typeof parsed === "object" ? parsed : null);
      setError(null);
    } catch {
      setDraft(null);
      setError("Failed to load preview data.");
    }
  }, []);

  const headline = String(draft?.Headline || "").trim();
  const strapline = String(draft?.Strapline || "").trim();
  const bodyRaw = String(draft?.Body || "").trim();
  const contentType = String(draft?.Content_Type || "").trim();
  const visibility = String(draft?.Visibility || "").trim();

  const summaryRaw = (draft?.Summary ?? draft?.summary ?? "") as string | unknown[];
  const summaryHtml = normalizeSummaryHtml(summaryRaw);
  const summaryPreview = getFirstSummaryBullet(summaryHtml);
  const hasSummary = Boolean(summaryHtml && summaryPreview);

  const attachments = useMemo(() => {
    return Array.isArray(draft?.Related_Documents) ? (draft!.Related_Documents as PreviewAttachment[]) : [];
  }, [draft]);

  const detectedPdfs = useMemo(() => {
    const pdfs: Array<{ url: string; name: string }> = [];
    for (const doc of attachments.filter(isPdfDoc)) {
      const url = resolveDocumentUrl(doc);
      if (url) pdfs.push({ url, name: String(doc.name || "Document") });
    }
    // Detect embedded PDF iframes inside body
    const iframePdfMatch = bodyRaw.match(
      /<iframe[^>]*\bsrc=["']([^"']+\.pdf(?:\?[^"']*)?)["'][^>]*>/i
    );
    const embedPdfMatch = bodyRaw.match(
      /<(?:embed|object)[^>]*(?:\bsrc|\bdata)=["']([^"']+\.pdf(?:\?[^"']*)?)["'][^>]*>/i
    );
    const bodyPdfUrlRaw = (iframePdfMatch?.[1] || embedPdfMatch?.[1] || "").trim();
    if (bodyPdfUrlRaw && !pdfs.some((p) => p.url === bodyPdfUrlRaw)) {
      pdfs.push({ url: bodyPdfUrlRaw, name: "Embedded Document" });
    }
    return pdfs;
  }, [attachments, bodyRaw]);

  const renderedBodyHtml = useMemo(() => {
    const bodyWithoutPdfEmbeds = bodyRaw
      .replace(
        /<iframe[^>]*\bsrc=["'][^"']+\.pdf(?:\?[^"']*)?["'][^>]*>[\s\S]*?<\/iframe>/gi,
        ""
      )
      .replace(
        /<(?:embed|object)[^>]*(?:\bsrc|\bdata)=["'][^"']+\.pdf(?:\?[^"']*)?["'][^>]*>[\s\S]*?<\/(?:embed|object)>/gi,
        ""
      );
    const normalizedBody = normalizeBodyHtmlSpacing(bodyWithoutPdfEmbeds);
    const allImageDocs = attachments
      .filter(isImageDoc)
      .map((d) => ({
        url: resolveDocumentUrl(d),
        name: String(d.name || ""),
        mime: d.mime,
        type: d.type,
      }))
      .filter((d) => Boolean(d.url));
    const { html: withPlaceholders, usedIndices } = replaceImagePlaceholders(normalizedBody, allImageDocs);
    const remainingImages = allImageDocs.filter((_, idx) => !usedIndices.has(idx));
    const { html } = injectImagesIntoBody(withPlaceholders, remainingImages);
    return html;
  }, [attachments, bodyRaw]);

  const audioDoc = useMemo(() => {
    const first = attachments.filter(isAudioDoc)[0];
    if (!first) return null;
    const url = resolveDocumentUrl(first);
    if (!url) return null;
    const title = String(first.name || "Listen to this article now");
    return { url, title };
  }, [attachments]);

  if (error) {
    return (
      <div style={styles.container}>
        <Header />
        <div style={styles.maxWidth}>
          <Link href="/admin" style={styles.backButton}>
            ← Back to Admin
          </Link>
          <div style={styles.error}>{error}</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!draft) {
    return (
      <div style={styles.container}>
        <Header />
        <div style={styles.maxWidth}>
          <Link href="/admin" style={styles.backButton}>
            ← Back to Admin
          </Link>
          <div style={styles.loading}>Loading preview...</div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div style={{ ...styles.container, maxWidth: "100vw", overflowX: "hidden" }}>
      <Header />
      <div style={{ ...styles.maxWidth, maxWidth: "100%", width: "100%", overflowX: "hidden" }}>
        <Link href="/admin" style={styles.backButton}>
          ← Back to Admin
        </Link>

        <div className="article-layout" style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
          <div style={styles.card} className="article-main">
            <h1 style={styles.heading}>{headline || "Untitled"}</h1>
            {strapline ? <p style={styles.strapline}>{strapline}</p> : null}
            {contentType ? (
              <div style={{ marginTop: "-8px", marginBottom: "16px" }}>
                <span style={styles.contentTypeBadge}>{contentType}</span>
              </div>
            ) : null}

            {hasSummary && (
              <div className="article-summary" style={{ marginBottom: 16 }}>
                <button
                  type="button"
                  className="article-summary-header"
                  aria-expanded={summaryExpanded}
                  onClick={() => setSummaryExpanded((v) => !v)}
                >
                  <span className="article-summary-title">Summary</span>
                  <span
                    className={`article-summary-chevron ${summaryExpanded ? "expanded" : ""}`}
                    aria-hidden="true"
                  >
                    ▼
                  </span>
                </button>

                {!summaryExpanded ? (
                  <div className="article-summary-preview">
                    <ul>
                      <li>{summaryPreview}</li>
                    </ul>
                  </div>
                ) : (
                  <div className="article-summary-body" dangerouslySetInnerHTML={{ __html: summaryHtml }} />
                )}
              </div>
            )}

            {audioDoc ? (
              <div style={{ marginBottom: 16 }}>
                <InlineAudioPlayer src={audioDoc.url} title={audioDoc.title} />
              </div>
            ) : null}

            <div style={styles.body} className="article-body" dangerouslySetInnerHTML={{ __html: renderedBodyHtml }} />

            {detectedPdfs.length > 0 && (
              <div style={{ width: "100%", marginTop: 16 }}>
                {detectedPdfs.map((pdf, idx) => (
                  <EmbeddedPdfViewer
                    key={`${pdf.url}-${idx}`}
                    pdfUrl={pdf.url}
                    isLoading={false}
                    onClose={() => {}}
                    articleTitle={pdf.name}
                    variant="inline"
                  />
                ))}
              </div>
            )}
          </div>

          <div style={styles.card} className="article-meta">
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>Preview Meta</h2>
              <div style={{ color: "#374151", fontSize: 14, lineHeight: 1.6 }}>
                <div>
                  <strong>Visibility:</strong> {visibility || "Admin"}
                </div>
                <div>
                  <strong>Attachments:</strong> {attachments.length}
                </div>
              </div>
            </div>

            {Array.isArray(draft.companies_mentioned) && draft.companies_mentioned.length > 0 && (
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Companies</h2>
                <div style={styles.tagContainer}>
                  {draft.companies_mentioned.map((c) => (
                    <Link
                      key={c.id}
                      href={`/company/${c.id}`}
                      style={{ ...styles.companyTag, textDecoration: "none", display: "inline-block" }}
                      prefetch={false}
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(draft.sectors) && draft.sectors.length > 0 && (
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Sectors</h2>
                <div style={styles.tagContainer}>
                  {draft.sectors.map((s) => (
                    <span key={s.id} style={{ ...styles.sectorTag, display: "inline-block" }}>
                      {s.sector_name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {attachments.filter((d) => !isImageDoc(d) && !isAudioDoc(d)).length > 0 && (
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Related Documents</h2>
                <div style={styles.tagContainer}>
                  {attachments
                    .filter((d) => !isImageDoc(d) && !isAudioDoc(d))
                    .map((doc, idx) => {
                      const url = resolveDocumentUrl(doc);
                      if (!url) return null;
                      return (
                        <a
                          key={`${url}-${idx}`}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ ...styles.tag, textDecoration: "none" }}
                        >
                          {String(doc.name || "Document")}
                        </a>
                      );
                    })}
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
          * { box-sizing: border-box; }
          .article-layout { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; max-width: 100%; width: 100%; overflow-x: hidden; }
          @media (max-width: 1024px) { .article-layout { grid-template-columns: 1fr; gap: 16px; } }
          /* Preserve HTML formatting inside article body */
          .article-body p { margin: 0 0 0.8rem 0 !important; }
          .article-body ul { list-style: disc; margin: 0 0 1rem 1.25rem; padding-left: 1.25rem; }
          .article-body ol { list-style: decimal; margin: 0 0 1rem 1.25rem; padding-left: 1.25rem; }
          .article-body li { margin-bottom: 0.5rem; }
          .article-body h1, .article-body h2, .article-body h3, .article-body h4, .article-body h5, .article-body h6 { margin: 1.25rem 0 0.75rem; font-weight: 700; }
          .article-body a { color: #2563eb; text-decoration: underline; }
          .article-body blockquote { margin: 1rem 0; padding-left: 1rem; border-left: 3px solid #e5e7eb; color: #374151; }
          .article-body table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
          .article-body th, .article-body td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
          .article-body img { max-width: 100%; height: auto; display: block; margin: 1rem auto; border-radius: 8px; }
          .article-body figure { margin: 1rem 0; }
          .article-body figcaption { text-align: center; font-size: 0.875rem; color: #6b7280; margin-top: 0.5rem; }
          .article-inline-image { margin: 1.25rem 0; }

          /* Summary module */
          .article-summary{
            border:1px solid #e5e7eb;
            background:#f9fafb;
            border-radius:12px;
            overflow:hidden;
          }
          .article-summary-header{
            width:100%;
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:12px;
            padding:12px 14px;
            background:transparent;
            border:0;
            cursor:pointer;
            text-align:left;
          }
          .article-summary-title{
            font-size:16px;
            font-weight:700;
            color:#111827;
          }
          .article-summary-chevron{
            width:28px;
            height:28px;
            display:inline-flex;
            align-items:center;
            justify-content:center;
            border-radius:9999px;
            border:1px solid #e5e7eb;
            background:#fff;
            color:#111827;
            font-size:12px;
            transition: transform 150ms ease;
            flex-shrink:0;
          }
          .article-summary-chevron.expanded{ transform: rotate(180deg); }
          .article-summary-preview,
          .article-summary-body{
            padding:0 14px 12px;
            color:#374151;
            font-size:15px;
            line-height:1.6;
            text-align:left;
          }
          .article-summary-preview ul,
          .article-summary-body ul{
            list-style: disc;
            margin: 0.25rem 0 0 1.25rem;
            padding-left: 1.25rem;
          }
          .article-summary-body ol{
            list-style: decimal;
            margin: 0.25rem 0 0 1.25rem;
            padding-left: 1.25rem;
          }
          .article-summary-preview li,
          .article-summary-body li{ margin-bottom: 0.5rem; }
          .article-summary-body p{ margin: 0 0 0.75rem 0; }
        `,
        }}
      />
    </div>
  );
}

