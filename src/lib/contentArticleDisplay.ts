import type { ContentArticle, ContentCorrection } from "@/types/insightsAnalysis";

export function decodeHtmlEntities(input: string): string {
  if (!input) return "";

  if (typeof window !== "undefined") {
    const div = document.createElement("div");
    div.innerHTML = input;
    return (div.textContent || div.innerText || "").trim();
  }

  return input
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

type ContentTypeCarrier = {
  Content_Type?: string;
  content_type?: string;
  ContentType?: string;
  contentType?: string;
};

export function getEffectiveContentType(article: ContentTypeCarrier): string {
  return (
    article.Content_Type ||
    article.content_type ||
    article.ContentType ||
    article.contentType ||
    ""
  ).trim();
}

export function isNewsArticle(article: ContentTypeCarrier): boolean {
  return getEffectiveContentType(article).toLowerCase() === "news";
}

export function parseCorrections(raw: unknown): ContentCorrection[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const note = String(record.note ?? "").trim();
      const updated_at = String(record.updated_at ?? "").trim();
      if (!note && !updated_at) return null;
      return { note, updated_at };
    })
    .filter((item): item is ContentCorrection => item != null);
}

export function getArticleCorrections(article: ContentArticle): ContentCorrection[] {
  return parseCorrections(article.corrections);
}

export function getLatestCorrection(
  article: ContentArticle
): ContentCorrection | null {
  const corrections = getArticleCorrections(article);
  if (!corrections.length) return null;

  return corrections.reduce<ContentCorrection>((latest, current) => {
    const currentTs = Date.parse(current.updated_at);
    const latestTs = Date.parse(latest.updated_at);
    if (!Number.isNaN(currentTs) && (Number.isNaN(latestTs) || currentTs >= latestTs)) {
      return current;
    }
    return latest;
  }, corrections[0]!);
}

export function hasArticleCorrection(article: ContentArticle): boolean {
  return getArticleCorrections(article).length > 0;
}

function flattenBylineValues(raw: unknown): string[] {
  if (raw == null) return [];

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        return flattenBylineValues(JSON.parse(trimmed));
      } catch {
        // fall through to plain string
      }
    }
    return [trimmed];
  }

  if (Array.isArray(raw)) {
    return raw.flatMap(flattenBylineValues);
  }

  if (typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    const indexedKeys = Object.keys(record).filter((key) => /^\d+$/.test(key));
    if (indexedKeys.length > 0) {
      return indexedKeys
        .sort((a, b) => Number(a) - Number(b))
        .flatMap((key) => flattenBylineValues(record[key]));
    }

    for (const key of ["text", "name", "value", "author", "byline", "label"]) {
      const nested = record[key];
      if (nested != null) {
        const values = flattenBylineValues(nested);
        if (values.length > 0) return values;
      }
    }
    return [];
  }

  const value = String(raw).trim();
  return value && value !== "[object Object]" ? [value] : [];
}

export function getArticleBylineRaw(article: unknown): unknown {
  if (!article || typeof article !== "object") return null;
  const record = article as Record<string, unknown>;

  for (const key of ["byline", "Byline", "BYLINE", "author_byline", "Author_Byline"]) {
    const value = record[key];
    if (value == null) continue;
    const parsed = tryParseBylineValue(value);
    if (parsed == null) continue;
    if (Array.isArray(parsed) && isEmptyNestedByline(parsed)) continue;
    if (typeof parsed === "string" && !parsed.trim()) continue;
    return parsed;
  }

  return null;
}

function isEmptyNestedByline(value: unknown[]): boolean {
  if (value.length === 0) return true;
  return value.every((entry) => {
    if (entry == null) return true;
    if (typeof entry === "string") return !entry.trim();
    if (Array.isArray(entry)) return isEmptyNestedByline(entry);
    if (typeof entry === "object") return flattenBylineValues(entry).length === 0;
    return false;
  });
}

export function formatArticleByline(byline: unknown): string {
  const parts = flattenBylineValues(byline);
  if (!parts.length) return "";

  const raw = parts.join(", ");
  const decoded = decodeHtmlEntities(raw);
  return /^by\b/i.test(decoded) ? decoded : `by ${decoded}`;
}

export function getArticleByline(article: unknown): string {
  return formatArticleByline(getArticleBylineRaw(article));
}

function tryParseBylineValue(val: unknown): unknown {
  if (val == null) return null;
  if (Array.isArray(val)) return val;
  if (typeof val === "object") return val;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return trimmed;
      }
    }
    return trimmed;
  }
  return val;
}

/** Normalize list/detail API payloads so nested JSON strings decode consistently. */
export function normalizeContentArticle<T extends ContentArticle>(article: T): T {
  const record = article as T & Record<string, unknown>;
  const parsedByline = tryParseBylineValue(
    record.byline ?? record.Byline ?? record.author_byline
  );

  if (parsedByline == null) return article;

  return {
    ...article,
    byline: parsedByline as T["byline"],
  };
}

export function normalizeContentArticles<T extends ContentArticle>(
  articles: T[]
): T[] {
  return articles.map(normalizeContentArticle);
}

export function formatArticleDate(dateString?: string | null): string {
  if (!dateString) return "-";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "Invalid date";
  }
}

export function formatCorrectionTimestamp(value?: string | null): string {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}
