import { authService } from "./auth";
import {
  AdvisorActiveMandate,
  AdvisorResponse,
  CorporateEventsResponse,
} from "../types/advisor";

const BASE_URL = "https://xdil-abvj-o7rq.e2.xano.io/api:Cd_uVQYn:develop";

function normalizeMandateKeyPeople(
  raw: unknown
): AdvisorActiveMandate["key_people"] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (typeof entry === "string") {
        const name = entry.trim();
        return name ? { name } : null;
      }
      if (entry && typeof entry === "object") {
        const obj = entry as Record<string, unknown>;
        const name =
          obj.name ??
          obj.banker_name ??
          obj.individual_name ??
          obj.full_name;
        const id = obj.id ?? obj.individuals_id ?? obj.individual_id;
        const nameStr = name != null ? String(name).trim() : "";
        if (!nameStr) return null;
        return {
          id: typeof id === "number" ? id : null,
          name: nameStr,
        };
      }
      return null;
    })
    .filter((x): x is { id: number | null; name: string } => x !== null);
}

function normalizeActiveMandate(raw: Record<string, unknown>): AdvisorActiveMandate {
  return {
    radar_id: typeof raw.radar_id === "number" ? raw.radar_id : undefined,
    company_id: Number(raw.company_id),
    company_name: String(raw.company_name ?? ""),
    company_logo: raw.company_logo != null ? String(raw.company_logo) : null,
    transaction_status_id: Number(raw.transaction_status_id),
    transaction_status:
      raw.transaction_status != null ? String(raw.transaction_status) : null,
    process_stage: raw.process_stage != null ? String(raw.process_stage) : null,
    key_people: normalizeMandateKeyPeople(raw.key_people ?? raw.bankers),
    set_at: raw.set_at != null ? String(raw.set_at) : null,
  };
}

function normalizeAdvisorResponse(data: unknown): AdvisorResponse {
  const payload = data as Record<string, unknown>;
  const mandatesRaw = payload.Active_Mandates ?? payload.Active_mandates;
  const Active_Mandates = Array.isArray(mandatesRaw)
    ? mandatesRaw.map((row) =>
        normalizeActiveMandate(row as Record<string, unknown>)
      )
    : [];

  const base = payload as unknown as AdvisorResponse;

  return {
    ...base,
    Active_Mandates,
  };
}

class AdvisorService {
  private getAuthHeaders() {
    const token = authService.getToken();
    if (!token) {
      throw new Error("Authentication token not found");
    }
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * API Call 1: Get Advisor Profile
   * Endpoint: https://xdil-abvj-o7rq.e2.xano.io/api:Cd_uVQYn/get_the_advisor_new_company
   * Method: GET
   * Auth: Required
   * Query Parameters: { "new_comp_id": number }
   */
  async getAdvisorProfile(advisorId: number): Promise<AdvisorResponse> {
    const url = `${BASE_URL}/get_the_advisor_new_company?new_comp_id=${advisorId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...this.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        authService.logout();
        window.location.href = "/login";
        throw new Error("Authentication required");
      }
      throw new Error(
        `Failed to fetch advisor profile: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return normalizeAdvisorResponse(data);
  }

  /**
   * API Call 2: Get Corporate Events
   * Endpoint: https://xdil-abvj-o7rq.e2.xano.io/api:Cd_uVQYn/advisors_ce
   * Method: GET
   * Auth: Required
   * Query Parameters: backend may vary; try common keys.
   */
  async getCorporateEvents(
    advisorId: number
  ): Promise<CorporateEventsResponse> {
    const endpoint = `${BASE_URL}/advisors_ce`;
    const headers = { ...this.getAuthHeaders() };

    // Some deployments expect different query keys. We try a few and prefer a non-empty array.
    const candidates: Array<{ key: string; value: number }> = [
      { key: "advisor_company_id", value: advisorId },
      { key: "new_comp_id", value: advisorId },
      { key: "advisor_id", value: advisorId },
    ];

    let lastOk: unknown = null;

    for (const c of candidates) {
      const url = `${endpoint}?${encodeURIComponent(c.key)}=${encodeURIComponent(
        String(c.value)
      )}`;
      const res = await fetch(url, { method: "GET", headers });

      if (!res.ok) {
        if (res.status === 401) {
          authService.logout();
          window.location.href = "/login";
          throw new Error("Authentication required");
        }
        // try next candidate
        continue;
      }

      const payload = (await res.json()) as unknown;
      lastOk = payload;

      // If this candidate returns a non-empty array, use it immediately.
      if (Array.isArray(payload) && payload.length > 0) {
        return { events: payload };
      }
    }

    // If we never got a successful response, throw.
    if (lastOk === null) {
      throw new Error("Failed to fetch corporate events");
    }

    // Successful response but empty / unexpected shape -> treat as empty array.
    return { events: Array.isArray(lastOk) ? lastOk : [] };
  }

  /**
   * Combined API call to fetch both advisor profile and corporate events
   * This method calls both APIs in parallel for better performance
   */
  async getAdvisorCompleteProfile(advisorId: number): Promise<{
    advisor: AdvisorResponse;
    events: CorporateEventsResponse;
  }> {
    try {
      const [advisorResponse, eventsResponse] = await Promise.all([
        this.getAdvisorProfile(advisorId),
        this.getCorporateEvents(advisorId),
      ]);

      return {
        advisor: advisorResponse,
        events: eventsResponse,
      };
    } catch (error) {
      console.error("Error fetching advisor complete profile:", error);
      throw error;
    }
  }
}

export const advisorService = new AdvisorService();
export default AdvisorService;
