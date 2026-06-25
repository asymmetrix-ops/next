import { authService } from "@/lib/auth";
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

export async function searchFiCompanies(
  query: string
): Promise<Array<{ id: number; name: string }>> {
  try {
    const headers = getAuthHeaders();
    if (!headers || !query.trim()) return [];

    const params = new URLSearchParams({
      search_query: query.trim(),
      page: "1",
      per_page: "10",
    });

    const response = await fetch(
      `https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm:develop/get_all_companies?${params.toString()}`,
      { method: "GET", headers, cache: "no-store" }
    );

    if (!response.ok) return [];

    const payload = await response.json();
    const items =
      payload?.companies?.items ??
      payload?.items ??
      (Array.isArray(payload) ? payload : []);

    return (items as Array<Record<string, unknown>>)
      .map((item) => ({
        id: Number(item.id ?? 0),
        name: String(item.name ?? ""),
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
