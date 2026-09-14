import { formatYearsAndMonths } from "@/lib/timeSinceLastInvestment";
import type {
  CapitalRadarApiResponse,
  CapitalRadarApiRow,
  CapitalRadarCard,
  CapitalRadarConfidence,
  CapitalRadarResponse,
  CapitalRadarRow,
} from "@/types/capital-radar";

// Proxied through our own Next.js API route (src/app/api/company/[id]/capital-radar)
// to avoid calling the Xano API directly from the browser, which is blocked by CORS.
const CAPITAL_RADAR_PROXY_BASE = "/api/company";

function getAuthToken(): string | null {
  return typeof window !== "undefined"
    ? localStorage.getItem("asymmetrix_auth_token")
    : null;
}

function isCapitalRadarApiResponse(
  value: unknown
): value is CapitalRadarApiResponse {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return Array.isArray(record.investors) && Array.isArray(record.strategic_buyers);
}

function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}

function toConfidence(value: unknown): CapitalRadarConfidence {
  return value === "high" ? "high" : "limited_data";
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  investor: "Investor",
  strategic_buyer: "Strategic Buyer",
};

function resolveEntityTypeLabel(entityType: string): string {
  return (
    ENTITY_TYPE_LABELS[entityType] ??
    entityType
      .split("_")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

function resolveHqCountry(
  city: string | null | undefined,
  country: string | null | undefined
): string | null {
  const c = (city ?? "").trim();
  const co = (country ?? "").trim();
  if (c && co) return `${c}, ${co}`;
  return co || c || null;
}

function resolveSectorFit(sectorOverlapCount: number): string {
  if (!Number.isFinite(sectorOverlapCount) || sectorOverlapCount <= 0) {
    return "No sector overlap";
  }
  return `${sectorOverlapCount} sector match${sectorOverlapCount === 1 ? "" : "es"}`;
}

const MS_PER_DAY = 86_400_000;

function resolveTimeSinceLastInvestment(
  lastInvestmentDate: string | null | undefined
): string | null {
  if (!lastInvestmentDate) return null;
  const date = new Date(lastInvestmentDate);
  if (Number.isNaN(date.getTime())) return null;

  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / MS_PER_DAY));
  if (days < 30) return "This month";
  return formatYearsAndMonths(Math.floor(days / 30));
}

function mapCapitalRadarApiRow(row: CapitalRadarApiRow): CapitalRadarRow {
  return {
    id: row.id,
    entity_id: row.related_id,
    name: row.name,
    logo_url: row.logo_url ?? null,
    type: resolveEntityTypeLabel(row.entity_type),
    match_score: Math.max(0, Math.min(100, Math.round(toNumber(row.final_score)))),
    peer_overlap_count: toNumber(row.peer_overlap_count),
    sector_fit: resolveSectorFit(toNumber(row.sector_overlap_count)),
    hq_country: resolveHqCountry(row.city, row.country),
    time_since_last_investment: resolveTimeSinceLastInvestment(
      row.last_investment_date
    ),
    confidence: toConfidence(row.confidence_flag),
    why_selected: row.why_selected ?? "",
    reordered: Boolean(row.reordered),
    reorder_reason: row.reorder_reason?.trim() ? row.reorder_reason : null,
  };
}

function mapCapitalRadarApiCard(
  cardType: CapitalRadarCard["card_type"],
  rows: CapitalRadarApiRow[],
  computedAtMs: number
): CapitalRadarCard {
  const sorted = [...rows].sort(
    (a, b) => (a.rank_position ?? 0) - (b.rank_position ?? 0)
  );
  return {
    card_type: cardType,
    computed_at: Number.isFinite(computedAtMs)
      ? new Date(computedAtMs).toISOString()
      : "",
    rows: sorted.map(mapCapitalRadarApiRow),
  };
}

export function mapCapitalRadarApiResponse(
  raw: CapitalRadarApiResponse
): CapitalRadarResponse {
  return {
    company_id: raw.company_id,
    potential_investors: mapCapitalRadarApiCard(
      "potential_investors",
      raw.investors,
      raw.computed_at
    ),
    strategic_buyers: mapCapitalRadarApiCard(
      "strategic_buyers",
      raw.strategic_buyers,
      raw.computed_at
    ),
  };
}

/**
 * Fetch the Capital Radar contract for a company:
 * GET /company/{company_id}/capital_radar
 */
export async function fetchCompanyCapitalRadar(
  companyId: string | number
): Promise<CapitalRadarResponse | null> {
  const token = getAuthToken();
  if (!token) return null;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };

  const res = await fetch(
    `${CAPITAL_RADAR_PROXY_BASE}/${encodeURIComponent(
      String(companyId)
    )}/capital-radar`,
    {
      method: "GET",
      headers,
      credentials: "include",
    }
  );

  if (!res.ok) {
    throw new Error(`capital_radar failed: ${res.status}`);
  }

  const data: unknown = await res.json();
  if (!isCapitalRadarApiResponse(data)) return null;

  return mapCapitalRadarApiResponse(data);
}
