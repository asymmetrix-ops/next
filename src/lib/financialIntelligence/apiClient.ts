import { authService } from "@/lib/auth";
import { readEntityLogo } from "@/lib/companyLogo";
import {
  COMPANIES_API_BASE,
  companySearchPayloadToSearchParams,
  normalizeCompanySearchPayload,
} from "@/lib/companiesFilterPayload";
import { peersRequestToSearchParams } from "./filterPayload";
import {
  extractTargetRow,
  normalizeCompanyRow,
  normalizePeersResponse,
  readApiError,
} from "./normalize";
import type {
  FiCompanyRow,
  FiFetchResult,
  FiPeersRequest,
  FiPeersResponse,
} from "./types";

const FI_API_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:26OHS3YC:develop";

export interface FiCompanySearchHit {
  id: number;
  name: string;
  logo?: string | null;
}

function getAuthHeaders(): Record<string, string> | null {
  const token = authService.getToken();
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
}

export async function fetchFiTarget(
  companyId: number
): Promise<FiFetchResult<FiCompanyRow>> {
  try {
    const headers = getAuthHeaders();
    if (!headers) {
      return { ok: false, error: "Authentication required — please log in again." };
    }

    const response = await fetch(
      `${FI_API_BASE}/financial-intelligence/target/${companyId}`,
      { method: "GET", headers, cache: "no-store" }
    );

    if (!response.ok) {
      return { ok: false, error: `Target API failed (${await readApiError(response)})` };
    }

    const payload = await response.json();
    const row = normalizeCompanyRow(extractTargetRow(payload, companyId), companyId);

    if (!row.company_id) {
      const keys = Object.keys(unwrapPayloadKeys(payload)).join(", ") || "none";
      return {
        ok: false,
        error: `Target API returned no company data (response keys: ${keys}).`,
      };
    }

    return { ok: true, data: row };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to fetch target company",
    };
  }
}

export async function fetchFiPeers(
  request: FiPeersRequest
): Promise<FiFetchResult<FiPeersResponse>> {
  try {
    const headers = getAuthHeaders();
    if (!headers) {
      return { ok: false, error: "Authentication required — please log in again." };
    }

    const params = peersRequestToSearchParams(request);
    const response = await fetch(
      `${FI_API_BASE}/financial-intelligence/peers?${params.toString()}`,
      { method: "GET", headers, cache: "no-store" }
    );

    if (!response.ok) {
      return { ok: false, error: `Peers API failed (${await readApiError(response)})` };
    }

    const payload = await response.json();
    return { ok: true, data: normalizePeersResponse(payload) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to fetch peers",
    };
  }
}

/** Fetch logos from Get_new_company for benchmark rows missing company_logo. */
export async function fetchFiCompanyLogosByIds(
  companyIds: number[]
): Promise<Map<number, string>> {
  const headers = getAuthHeaders();
  if (!headers || companyIds.length === 0) return new Map();

  const uniqueIds = Array.from(new Set(companyIds.filter((id) => id > 0)));
  const logoMap = new Map<number, string>();

  await Promise.all(
    uniqueIds.map(async (companyId) => {
      try {
        const response = await fetch(
          `${COMPANIES_API_BASE}/Get_new_company/${companyId}`,
          { method: "GET", headers, cache: "no-store" }
        );
        if (!response.ok) return;

        const data = await response.json();
        const record =
          data && typeof data === "object" && "Company" in (data as object)
            ? (data as Record<string, unknown>).Company
            : data;
        const logo = readEntityLogo(record);
        if (logo) logoMap.set(companyId, logo);
      } catch {
        // ignore individual fetch failures
      }
    })
  );

  return logoMap;
}

export function applyFiCompanyLogos(
  rows: FiCompanyRow[],
  logoMap: Map<number, string>
): FiCompanyRow[] {
  if (logoMap.size === 0) return rows;
  return rows.map((row) => {
    if (row.company_logo) return row;
    const logo = logoMap.get(row.company_id);
    return logo ? { ...row, company_logo: logo } : row;
  });
}

export async function searchFiCompanies(
  query: string
): Promise<FiCompanySearchHit[]> {
  try {
    const headers = getAuthHeaders();
    if (!headers || query.trim().length < 2) return [];

    const params = companySearchPayloadToSearchParams(
      normalizeCompanySearchPayload({
        query: query.trim(),
        Offset: 1,
        Per_page: 10,
      }),
      { page: 1, perPage: 10 }
    );

    const response = await fetch(
      `${COMPANIES_API_BASE}/Get_new_companies?${params.toString()}`,
      { method: "GET", headers, cache: "no-store" }
    );

    if (!response.ok) return [];

    const payload = await response.json();
    const items =
      payload?.result1?.items ??
      payload?.companies?.items ??
      payload?.items ??
      (Array.isArray(payload) ? payload : []);

    return (items as Array<Record<string, unknown>>)
      .map((item) => ({
        id: Number(item.id ?? 0),
        name: String(item.name ?? ""),
        logo: readEntityLogo(item),
      }))
      .filter((item) => item.id > 0 && item.name);
  } catch {
    return [];
  }
}

function unwrapPayloadKeys(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object") return {};
  const obj = payload as Record<string, unknown>;
  if (obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)) {
    return obj.data as Record<string, unknown>;
  }
  return obj;
}
