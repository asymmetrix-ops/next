import { getArticleByline } from "@/lib/contentArticleDisplay";
import { getInsightHqCountryIso2 } from "@/lib/insightCountry";

export const TOP_VIEWED_LANDING_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu/content/top-viewed/landing";

type RawTopViewedArticle = {
  id?: number;
  Content_Type?: string;
  Headline?: string;
  Strapline?: string;
  byline?: unknown;
  Publication_Date?: string;
  companies_of_focus?: unknown;
  sectors?: unknown;
  time_ago?: string;
};

export type TopViewedLandingArticle = {
  id?: number;
  tag: string;
  headline: string;
  strapline?: string;
  countryIso2?: string | null;
  sectorName?: string;
  byline?: string;
  meta: string;
};

/** Xano returns these as JSON-encoded strings rather than parsed arrays. */
function parseJsonArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value as Record<string, unknown>[];
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as Record<string, unknown>[]) : [];
  } catch {
    return [];
  }
}

function pickPrimarySectorName(rawSectors: unknown): string | undefined {
  const sectors = parseJsonArray(rawSectors);
  const primary = sectors.find((s) => s.Sector_importance === "Primary");
  const chosen = primary ?? sectors[0];
  const name = chosen?.sector_name;
  return typeof name === "string" && name.trim() ? name.trim() : undefined;
}

export async function fetchTopViewedLandingArticles(): Promise<
  TopViewedLandingArticle[]
> {
  try {
    const res = await fetch(TOP_VIEWED_LANDING_URL, {
      method: "GET",
      headers: { Accept: "application/json" },
      next: { revalidate: 1800 },
    });
    if (!res.ok) return [];

    const data = (await res.json()) as { top_articles?: unknown };
    if (!Array.isArray(data.top_articles)) return [];

    return (data.top_articles as RawTopViewedArticle[]).slice(0, 4).map((item) => {
      const contentType = item.Content_Type?.trim() || "Analysis";
      const headline = item.Headline?.trim() || "Untitled article";
      const strapline = item.Strapline?.trim() || undefined;
      const timeAgo = item.time_ago?.trim() || "";

      const companiesOfFocus = parseJsonArray(item.companies_of_focus);
      const countryIso2 = getInsightHqCountryIso2({
        ...item,
        companies_of_focus: companiesOfFocus,
      });

      const sectorName = pickPrimarySectorName(item.sectors);
      const byline = getArticleByline(item) || undefined;

      return {
        id: item.id,
        tag: contentType,
        headline,
        strapline,
        countryIso2,
        sectorName,
        byline,
        meta: timeAgo,
      };
    });
  } catch {
    return [];
  }
}
