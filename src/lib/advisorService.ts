import { authService } from "./auth";
import { AdvisorResponse, CorporateEventsResponse } from "../types/advisor";

const BASE_URL = "https://xdil-abvj-o7rq.e2.xano.io/api:Cd_uVQYn";

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
    return data;
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
