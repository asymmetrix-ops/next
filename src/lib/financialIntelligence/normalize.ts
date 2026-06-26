import type { FiCompanyRow, FiPeersResponse } from "./types";

export function safeFiniteNumber(value: unknown): number | null {
  if (value == null || value === "" || value === "$NaN" || value === "NaN") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function safeInt(value: unknown, fallback = 0): number {
  const n = safeFiniteNumber(value);
  return n != null ? Math.trunc(n) : fallback;
}

function normalizeFinancialYear(value: unknown): number {
  return safeInt(value, 0);
}

function normalizeLogo(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeCompanyRow(
  raw: Record<string, unknown>,
  fallbackCompanyId?: number
): FiCompanyRow {
  const company_id = safeInt(
    raw.company_id ?? raw.id ?? raw.new_company_id ?? raw.target_company_id,
    fallbackCompanyId ?? 0
  );

  return {
    company_id,
    company_name: String(raw.company_name ?? raw.name ?? ""),
    company_logo: normalizeLogo(raw.company_logo ?? raw.linkedin_logo),
    sectors_id: String(raw.sectors_id ?? ""),
    location_country: String(raw.location_country ?? ""),
    location_region: String(raw.location_region ?? ""),
    financial_year: normalizeFinancialYear(raw.financial_year),
    fy_ye_month: safeInt(raw.fy_ye_month, 0),
    revenue_m_usd: safeFiniteNumber(raw.revenue_m_usd),
    rev_growth_pc: safeFiniteNumber(raw.rev_growth_pc),
    ebitda_margin: safeFiniteNumber(raw.ebitda_margin),
    ebitda_m_usd: safeFiniteNumber(raw.ebitda_m_usd),
    ebit_m_usd: safeFiniteNumber(raw.ebit_m_usd),
    rule_of_40: safeFiniteNumber(raw.rule_of_40),
    ev_usd: safeFiniteNumber(raw.ev_usd),
    revenue_multiple: safeFiniteNumber(raw.revenue_multiple),
    ev_revenue_x: safeFiniteNumber(raw.ev_revenue_x),
    ev_ebitda_x: safeFiniteNumber(raw.ev_ebitda_x),
    url: normalizeLogo(raw.url),
    is_manually_added: Boolean(
      raw.is_manually_added ?? raw.manually_added ?? raw.is_added
    ),
  };
}

/** Mark peers the user added via company_ids_include (or API flag). */
export function annotateManuallyAddedPeers(
  peers: FiCompanyRow[],
  manuallyAddedIds: number[]
): FiCompanyRow[] {
  const addedIds = new Set(
    manuallyAddedIds.filter((id) => Number.isFinite(id) && id > 0)
  );
  if (addedIds.size === 0) return peers;

  return peers.map((peer) => ({
    ...peer,
    is_manually_added: Boolean(peer.is_manually_added) || addedIds.has(peer.company_id),
  }));
}

export function unwrapApiPayload(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object") return {};
  const obj = payload as Record<string, unknown>;
  if (obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)) {
    return obj.data as Record<string, unknown>;
  }
  return obj;
}

/** Resolve target row from varying Xano response shapes. */
export function extractTargetRow(
  payload: unknown,
  requestedCompanyId: number
): Record<string, unknown> {
  if (Array.isArray(payload) && payload.length > 0) {
    return payload[0] as Record<string, unknown>;
  }

  const obj = unwrapApiPayload(payload);

  for (const key of ["target", "company", "result", "item", "record"] as const) {
    const nested = obj[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      return nested as Record<string, unknown>;
    }
  }

  // Some target endpoints return the same envelope as peers
  if (Array.isArray(obj.peers) && obj.peers.length > 0) {
    const peers = obj.peers as Record<string, unknown>[];
    const match = peers.find(
      (peer) =>
        safeInt(peer.company_id ?? peer.id ?? peer.new_company_id, 0) === requestedCompanyId
    );
    return match ?? peers[0];
  }

  if (
    obj.company_id != null ||
    obj.id != null ||
    obj.company_name ||
    obj.name ||
    obj.revenue_m_usd != null
  ) {
    return obj;
  }

  return { company_id: requestedCompanyId };
}

export function normalizePeersResponse(payload: unknown): FiPeersResponse {
  if (Array.isArray(payload)) {
    const peers = payload.map((row) =>
      normalizeCompanyRow(row as Record<string, unknown>)
    );
    return {
      peers,
      total_peers: peers.length,
      is_default_mode: true,
    };
  }

  const obj = unwrapApiPayload(payload);
  const peerRows = Array.isArray(obj.peers)
    ? obj.peers
    : Array.isArray(obj.items)
      ? obj.items
      : [];

  const peers = peerRows.map((row) =>
    normalizeCompanyRow(row as Record<string, unknown>)
  );

  return {
    peers,
    total_peers: Number(obj.total_peers ?? peers.length),
    is_default_mode: Boolean(obj.is_default_mode ?? false),
  };
}

export async function readApiError(response: Response): Promise<string> {
  const text = await response.text().catch(() => "");
  return text ? `${response.status} ${response.statusText} — ${text}` : `${response.status} ${response.statusText}`;
}
