import { authService } from "./auth";
import { AdvisorResponse, CorporateEventsResponse } from "../types/advisor";
import { readPlatformCurrencyIdClient } from "./platformCurrency";

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
   * Query Parameters: `{ new_comp_id: number, preferred_currency_id: number }`
   * Response shape: `{ items: AdvisorCorporateEvent[], preferred_currency_id: number }`
   * — NOT a flat array. `target_companies` / `primary_sectors` / `other_advisors` /
   * `advisor_individuals` are JSON-encoded strings on each item, not arrays; callers
   * must JSON.parse them (see `coerceUnknownToArray` on the advisor page).
   */
  async getCorporateEvents(
    advisorId: number,
    preferredCurrencyId?: number
  ): Promise<CorporateEventsResponse> {
    const currencyId = preferredCurrencyId ?? readPlatformCurrencyIdClient();
    const params = new URLSearchParams({
      new_comp_id: String(advisorId),
      preferred_currency_id: String(currencyId),
    });
    const url = `${BASE_URL}/advisors_ce?${params.toString()}`;
    const headers = { ...this.getAuthHeaders() };

    const res = await fetch(url, { method: "GET", headers });

    if (!res.ok) {
      if (res.status === 401) {
        authService.logout();
        window.location.href = "/login";
        throw new Error("Authentication required");
      }
      throw new Error(
        `Failed to fetch corporate events: ${res.status} ${res.statusText}`
      );
    }

    const payload = (await res.json()) as unknown;

    // Current shape: { items: [...] }. Fall back to a flat array for
    // backward compatibility in case an older deployment is still live.
    if (Array.isArray(payload)) {
      return { events: payload };
    }
    const items = (payload as { items?: unknown })?.items;
    return { events: Array.isArray(items) ? items : [] };
  }

  /**
   * Combined API call to fetch both advisor profile and corporate events
   * This method calls both APIs in parallel for better performance
   */
  async getAdvisorCompleteProfile(
    advisorId: number,
    preferredCurrencyId?: number
  ): Promise<{
    advisor: AdvisorResponse;
    events: CorporateEventsResponse;
  }> {
    try {
      const [advisorResponse, eventsResponse] = await Promise.all([
        this.getAdvisorProfile(advisorId),
        this.getCorporateEvents(advisorId, preferredCurrencyId),
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
