import { authService } from "@/lib/auth";
import { readEntityLogo } from "@/lib/companyLogo";
import {
  companySearchPayloadToSearchParams,
  normalizeCompanySearchPayload,
} from "@/lib/companiesFilterPayload";
import {
  appendPreferredCurrencyIdToSearchParams,
  readPlatformCurrencyIdClient,
  resolvePreferredCurrencyId,
} from "@/lib/platformCurrency";
import { peersRequestToSearchParams, appendExcludedSourceLabels } from "./filterPayload";
import {
  companyFinancialMetricsToRawFi,
  extractTargetRow,
  mergeFiCompanyRows,
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
  "https://xdil-abvj-o7rq.e2.xano.io/api:UMz0Ao3v:develop";

const COMPANIES_API_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au:develop";

const COMPANY_FINANCIAL_METRICS_API_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au:develop/company_financial_metrics";

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

function unwrapFinancialMetricsRow(payload: unknown): Record<string, unknown> | null {
  if (Array.isArray(payload)) {
    return (payload[0] as Record<string, unknown> | undefined) ?? null;
  }
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.items)) {
      return (obj.items[0] as Record<string, unknown> | undefined) ?? null;
    }
    if (Array.isArray(obj.financial_metrics)) {
      return (obj.financial_metrics[0] as Record<string, unknown> | undefined) ?? null;
    }
    return obj;
  }
  return null;
}

async function fetchCompanyFinancialMetricsRow(
  companyId: number,
  headers: Record<string, string>,
  preferredCurrencyId: number
): Promise<Record<string, unknown> | null> {
  try {
    const params = new URLSearchParams({ new_company_id: String(companyId) });
    appendPreferredCurrencyIdToSearchParams(params, preferredCurrencyId);

    let response = await fetch(
      `${COMPANY_FINANCIAL_METRICS_API_BASE}?${params.toString()}`,
      { method: "GET", headers, cache: "no-store" }
    );

    if (!response.ok) {
      const candidateBodies = [
        { new_company_id: companyId, preferred_currency_id: preferredCurrencyId },
        { company_id: companyId, preferred_currency_id: preferredCurrencyId },
        { id: companyId, preferred_currency_id: preferredCurrencyId },
      ];
      for (const body of candidateBodies) {
        const attempt = await fetch(COMPANY_FINANCIAL_METRICS_API_BASE, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify(body),
        });
        if (attempt.ok) {
          response = attempt;
          break;
        }
      }
    }

    if (!response.ok) return null;

    const payload = await response.json();
    return unwrapFinancialMetricsRow(payload);
  } catch {
    return null;
  }
}

async function enrichTargetFromCompanyProfile(
  row: FiCompanyRow,
  headers: Record<string, string>,
  preferredCurrencyId: number
): Promise<FiCompanyRow> {
  const profileRaw = await fetchCompanyFinancialMetricsRow(
    row.company_id,
    headers,
    preferredCurrencyId
  );
  if (!profileRaw) return row;

  const profileRow = normalizeCompanyRow(
    companyFinancialMetricsToRawFi(profileRaw),
    row.company_id
  );
  return mergeFiCompanyRows(row, profileRow);
}

export async function fetchFiTarget(
  companyId: number,
  preferredCurrencyId?: number,
  excludedSourceLabels: string[] = []
): Promise<FiFetchResult<FiCompanyRow>> {
  try {
    const headers = getAuthHeaders();
    if (!headers) {
      return { ok: false, error: "Authentication required — please log in again." };
    }

    const currencyId = resolvePreferredCurrencyId(
      preferredCurrencyId ?? readPlatformCurrencyIdClient()
    );
    const params = new URLSearchParams();
    appendPreferredCurrencyIdToSearchParams(params, currencyId);
    appendExcludedSourceLabels(params, excludedSourceLabels);

    const response = await fetch(
      `${FI_API_BASE}/financial-intelligence/target/${companyId}?${params.toString()}`,
      { method: "GET", headers, cache: "no-store" }
    );

    if (!response.ok) {
      return { ok: false, error: `Target API failed (${await readApiError(response)})` };
    }

    const payload = await response.json();
    let row = normalizeCompanyRow(extractTargetRow(payload, companyId), companyId);

    if (!row.company_id) {
      const keys = Object.keys(unwrapPayloadKeys(payload)).join(", ") || "none";
      return {
        ok: false,
        error: `Target API returned no company data (response keys: ${keys}).`,
      };
    }

    row = await enrichTargetFromCompanyProfile(row, headers, currencyId);

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
  query: string,
  preferredCurrencyId?: number
): Promise<FiCompanySearchHit[]> {
  try {
    const headers = getAuthHeaders();
    if (!headers || query.trim().length < 2) return [];

    const params = companySearchPayloadToSearchParams(
      normalizeCompanySearchPayload({
        query: query.trim(),
        Offset: 1,
        Per_page: 10,
        preferred_currency_id: resolvePreferredCurrencyId(
          preferredCurrencyId ?? readPlatformCurrencyIdClient()
        ),
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
  for (const key of ["data", "payload"] as const) {
    const nested = obj[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      return nested as Record<string, unknown>;
    }
  }
  return obj;
}
