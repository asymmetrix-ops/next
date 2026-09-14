// Normalized shape consumed by the Capital Radar UI components.
// The real API (GET /company/{company_id}/capital_radar) returns a flatter,
// entity-oriented shape (see CapitalRadarApiResponse below) which is mapped
// into this contract by `mapCapitalRadarApiResponse` in `lib/capitalRadar.ts`.

export type CapitalRadarConfidence = "high" | "limited_data";

export interface CapitalRadarRow {
  id: number; // capital_radar_results.id
  entity_id: number; // investor id (x2_62) or company id (x2_45)
  name: string;
  logo_url: string | null;
  type: string; // e.g. "Investor", "Strategic Buyer"
  match_score: number; // normalized 0-100
  peer_overlap_count: number;
  sector_fit: string; // short label, e.g. "3 sector matches"
  hq_country: string | null;
  time_since_last_investment: string | null; // financial card only, e.g. "8 months"
  confidence: CapitalRadarConfidence;
  why_selected: string;
  reordered: boolean;
  reorder_reason: string | null;
}

export type CapitalRadarCardType = "potential_investors" | "strategic_buyers";

export interface CapitalRadarCard {
  card_type: CapitalRadarCardType;
  computed_at: string; // ISO timestamp, last weekly batch run
  rows: CapitalRadarRow[];
}

export interface CapitalRadarResponse {
  company_id: number;
  potential_investors: CapitalRadarCard;
  strategic_buyers: CapitalRadarCard;
}

// ── Raw API shape (as actually returned by Xano) ────────────────────────────

export type CapitalRadarApiEntityType = "investor" | "strategic_buyer" | string;

export interface CapitalRadarApiRow {
  id: number;
  entity_type: CapitalRadarApiEntityType;
  related_id: number;
  final_score: string | number;
  rank_position: number;
  confidence_flag: CapitalRadarConfidence | string;
  why_selected: string;
  reordered: boolean;
  reorder_reason: string | null;
  sector_overlap_count: number;
  peer_overlap_count: number;
  timing_score: string | number;
  geography_fit_score: string | number;
  computed_at: number; // epoch ms
  name: string;
  logo_url: string | null; // raw base64 payload (no data: prefix) or URL
  country: string | null;
  city: string | null;
  sectors: string | null; // Postgres text[] literal, e.g. "{Sales,Marketing}"
  last_investment_date: string | null;
}

export interface CapitalRadarApiResponse {
  company_id: number;
  investors: CapitalRadarApiRow[];
  strategic_buyers: CapitalRadarApiRow[];
  computed_at: number; // epoch ms
  has_data: boolean;
}
