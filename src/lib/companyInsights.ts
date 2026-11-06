import type { ContentArticle } from "@/types/insightsAnalysis";
import { isNewsArticle, normalizeContentArticles } from "@/lib/contentArticleDisplay";
import { CONTENT_ARTICLES_API } from "@/lib/sectorInsightsArticles";

const COMPANIES_ARTICLES_API =
  "https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au:develop/companies_articles";

/** Cards shown per section before "Show more". */
export const COMPANY_INSIGHTS_PAGE = 6;

export type CompanyInsightsSection = "company" | "related" | "sector";

export type CompanyInsights = {
  company: ContentArticle[];
  related: ContentArticle[];
  sector: ContentArticle[];
};

export const EMPTY_COMPANY_INSIGHTS: CompanyInsights = { company: [], related: [], sector: [] };

export function companyInsightsTotal(i: CompanyInsights): number {
  return i.company.length + i.related.length + i.sector.length;
}

/** Company, then Related, then Sector: the order of the tab and of the Summary card. */
export function companyInsightsOrdered(i: CompanyInsights): ContentArticle[] {
  return [...i.company, ...i.related, ...i.sector];
}

function authHeader(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("asymmetrix_auth_token") : null;
  return token ? { Authorization: `Bearer ${token}`, "X-Data-Source": "live" } : {};
}

const byNewest = (a: ContentArticle, b: ContentArticle) =>
  String(b.Publication_Date).localeCompare(String(a.Publication_Date)) || b.id - a.id;

function idList(v: unknown): number[] {
  return Array.isArray(v)
    ? v.map((x) => (typeof x === "object" && x ? Number((x as { id?: unknown }).id) : Number(x))).filter(Number.isFinite)
    : [];
}

/** Primary sector ids of a company profile payload (new_sectors_data first, then sectors_id). */
export function extractPrimarySectorIds(company: unknown): number[] {
  const c = company as {
    new_sectors_data?: Array<{ sectors_payload?: unknown }>;
    sectors_id?: Array<{ sector_id?: number; Sector_importance?: string }>;
  } | null;
  if (!c) return [];
  try {
    const raw = Array.isArray(c.new_sectors_data) ? c.new_sectors_data.find((e) => e?.sectors_payload != null)?.sectors_payload : null;
    let payload: unknown = raw;
    for (let i = 0; i < 2 && typeof payload === "string"; i += 1) {
      payload = JSON.parse(payload.trim().replace(/\\u0022/g, '"'));
    }
    const ids = idList((payload as { primary_sectors?: unknown } | null)?.primary_sectors);
    if (ids.length > 0) return ids;
  } catch {
    // fall through to sectors_id
  }
  return (c.sectors_id ?? [])
    .filter((s) => s?.Sector_importance === "Primary" && typeof s.sector_id === "number")
    .map((s) => s.sector_id as number);
}

async function fetchCompanyArticlesAll(companyId: number, signal?: AbortSignal): Promise<ContentArticle[]> {
  const res = await fetch(`${COMPANIES_ARTICLES_API}?new_company_id=${companyId}&page=1&per_page=500`, { signal });
  if (!res.ok) return [];
  const json = await res.json();
  const rows = Array.isArray(json) ? json : Array.isArray(json?.items) ? json.items : [];
  return normalizeContentArticles(rows);
}

/** Newest I&A tagged to the company's primary sectors (up to 3 pages of 50). */
async function fetchSectorArticles(sectorIds: number[], signal?: AbortSignal): Promise<ContentArticle[]> {
  if (sectorIds.length === 0) return [];
  const out: ContentArticle[] = [];
  for (let page = 1; page <= 3; page += 1) {
    const params = new URLSearchParams({
      Offset: String(page),
      Per_page: "50",
      portfolio_only: "false",
      primary_sectors_ids: sectorIds.join(","),
    });
    const res = await fetch(`${CONTENT_ARTICLES_API}?${params}`, {
      headers: { "Content-Type": "application/json", ...authHeader() },
      signal,
    });
    if (!res.ok) break;
    const json = await res.json();
    const rows = normalizeContentArticles(Array.isArray(json?.items) ? json.items : []);
    out.push(...rows);
    if (rows.length < 50) break;
  }
  return out;
}

/**
 * The three sections of the company I&A tab. A piece appears once, in the
 * highest section it qualifies for: Company (Company of Focus), Related
 * (mentioned), Sector (primary sector). News is excluded.
 */
export async function fetchCompanyInsights(
  companyId: number,
  primarySectorIds: number[],
  signal?: AbortSignal
): Promise<CompanyInsights> {
  const [direct, sectorRows] = await Promise.all([
    fetchCompanyArticlesAll(companyId, signal),
    fetchSectorArticles(primarySectorIds, signal).catch(() => [] as ContentArticle[]),
  ]);
  const seen = new Set<number>();
  const company: ContentArticle[] = [];
  const related: ContentArticle[] = [];
  for (const a of direct) {
    if (isNewsArticle(a) || seen.has(a.id)) continue;
    seen.add(a.id);
    const focus = idList((a as unknown as { Company_of_Focus?: unknown }).Company_of_Focus);
    (focus.includes(companyId) ? company : related).push(a);
  }
  const sector: ContentArticle[] = [];
  for (const a of sectorRows) {
    if (isNewsArticle(a) || seen.has(a.id)) continue;
    seen.add(a.id);
    sector.push(a);
  }
  return {
    company: company.sort(byNewest),
    related: related.sort(byNewest),
    sector: sector.sort(byNewest),
  };
}
