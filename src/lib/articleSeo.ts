import type { Metadata } from "next";

const XANO_BASE = "https://xdil-abvj-o7rq.e2.xano.io";
const CONTENT_API = `${XANO_BASE}/api:Z3F6JUiu/content`;

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.asymmetrixintelligence.com";

export const DEFAULT_OG_IMAGE = `${SITE_URL}/images/asymmetrix-video-thumbnail.png`;

export type ArticleSeoData = {
  id: string;
  headline?: string;
  strapline?: string;
  summary?: unknown;
  body?: string;
  publicationDate?: string;
  contentType?: string;
  imageUrl?: string;
};

function unwrapArticlePayload(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) {
    const first = data[0];
    return first && typeof first === "object"
      ? (first as Record<string, unknown>)
      : null;
  }
  if (data && typeof data === "object") {
    return data as Record<string, unknown>;
  }
  return null;
}

function stripHtmlToText(input: string): string {
  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateDescription(text: string, maxLength = 160): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  const truncated = normalized.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return `${(lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated).trim()}…`;
}

function extractSummaryText(summary: unknown): string | undefined {
  if (summary == null) return undefined;

  if (Array.isArray(summary)) {
    const first = summary.find(
      (item) => typeof item === "string" && item.trim().length > 0
    );
    return typeof first === "string" ? stripHtmlToText(first) : undefined;
  }

  if (typeof summary === "string") {
    const trimmed = summary.trim();
    if (!trimmed) return undefined;
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) return extractSummaryText(parsed);
    } catch {
      /* not JSON */
    }
    return stripHtmlToText(trimmed);
  }

  return undefined;
}

export function buildArticleDescription(article: ArticleSeoData): string {
  const strapline = article.strapline?.trim();
  if (strapline) return truncateDescription(stripHtmlToText(strapline));

  const summary = extractSummaryText(article.summary);
  if (summary) return truncateDescription(summary);

  const bodyText = article.body ? stripHtmlToText(article.body) : "";
  if (bodyText) return truncateDescription(bodyText);

  return "Insights & Analysis from Asymmetrix.";
}

export function buildArticleImageUrl(article?: ArticleSeoData | null): string {
  const explicit = article?.imageUrl?.trim();
  if (explicit) {
    if (/^https?:\/\//i.test(explicit)) return explicit;
    if (explicit.startsWith("/")) return `${SITE_URL}${explicit}`;
    return explicit;
  }

  return DEFAULT_OG_IMAGE;
}

export function buildArticleTitle(headline?: string): string {
  const cleaned = headline?.trim();
  return cleaned
    ? `Asymmetrix – ${stripHtmlToText(cleaned)}`
    : "Insights & Analysis | Asymmetrix";
}

export async function fetchArticleForSeo(
  id: string,
  token?: string
): Promise<ArticleSeoData | null> {
  try {
    const res = await fetch(`${CONTENT_API}/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;

    const raw = unwrapArticlePayload(await res.json());
    if (!raw) return null;

    return {
      id,
      headline: (raw.Headline as string | undefined) ?? undefined,
      strapline: (raw.Strapline as string | undefined) ?? undefined,
      summary: raw.summary,
      body: (raw.Body as string | undefined) ?? undefined,
      publicationDate: (raw.Publication_Date as string | undefined) ?? undefined,
      contentType: (raw.Content_Type as string | undefined) ?? undefined,
      imageUrl: (raw.image_url as string | undefined) ?? undefined,
    };
  } catch {
    return null;
  }
}

export function buildArticleMetadata(
  article: ArticleSeoData | null,
  id: string
): Metadata {
  const title = buildArticleTitle(article?.headline);
  const description = article
    ? buildArticleDescription(article)
    : "Insights & Analysis from Asymmetrix.";
  const imageUrl = article ? buildArticleImageUrl(article) : DEFAULT_OG_IMAGE;
  const url = new URL(`/article/${id}`, SITE_URL).toString();

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Asymmetrix",
      locale: "en_US",
      type: "article",
      ...(article?.publicationDate
        ? { publishedTime: article.publicationDate }
        : {}),
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export function buildArticleJsonLd(
  article: ArticleSeoData,
  id: string
): Record<string, unknown> {
  const headline = stripHtmlToText(article.headline || "Insights & Analysis");
  const description = buildArticleDescription(article);
  const imageUrl = buildArticleImageUrl(article);

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    image: [imageUrl],
    datePublished: article.publicationDate,
    author: {
      "@type": "Organization",
      name: "Asymmetrix",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "Asymmetrix",
      url: SITE_URL,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": new URL(`/article/${id}`, SITE_URL).toString(),
    },
    ...(article.contentType ? { articleSection: article.contentType } : {}),
  };
}
