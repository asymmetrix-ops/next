import { authService } from "./auth";
import { AdvisorResponse, CorporateEventsResponse } from "../types/advisor";
import { dispatchUnauthorized } from "./authEvents";
import { applyFlatCorporateEventCurrencyConversion } from "./normalizeCounterpartyCorporateEvents";
import {
  appendPreferredCurrencyIdToSearchParams,
  readPlatformCurrencyIdClient,
  resolvePreferredCurrencyId,
} from "./platformCurrency";

const BASE_URL = "https://xdil-abvj-o7rq.e2.xano.io/api:Cd_uVQYn";

function extractAdvisorCorporateEvents(payload: unknown) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const record = payload as Record<string, unknown>;
  const candidates = [
    record.items,
    record.events,
    record.New_Events_Wits_Advisors,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

function readResponsePreferredCurrencyId(payload: unknown): number | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const id = Number((payload as Record<string, unknown>).preferred_currency_id ?? 0);
  return id > 0 ? id : null;
}

function applyAdvisorCorporateEventCurrencyConversion(
  events: unknown[],
  preferredCurrencyId: number
): unknown[] {
  const effectiveId = resolvePreferredCurrencyId(preferredCurrencyId);
  return events.map((event) => {
    const raw = (
      event && typeof event === "object" ? event : {}
    ) as Record<string, unknown>;
    return applyFlatCorporateEventCurrencyConversion(raw, effectiveId);
  });
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
        dispatchUnauthorized();
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
   * Endpoint: advisors_ce (returns full enriched data including sectors, individuals, EV)
   * Method: GET
   * Auth: Required
   * Query Parameters: { "new_comp_id": number } (same id as dynamic /advisor/[param])
   */
  async getCorporateEvents(
    advisorId: number,
    preferredCurrencyId?: number
  ): Promise<CorporateEventsResponse> {
    const resolvedCurrencyId = resolvePreferredCurrencyId(
      preferredCurrencyId ?? readPlatformCurrencyIdClient()
    );
    const params = new URLSearchParams();
    params.set("new_comp_id", String(advisorId));
    appendPreferredCurrencyIdToSearchParams(params, resolvedCurrencyId);
    const url = `${BASE_URL}/advisors_ce?${params.toString()}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { ...this.getAuthHeaders() },
    });

    if (!response.ok) {
      if (response.status === 401) {
        authService.logout();
        dispatchUnauthorized();
        throw new Error("Authentication required");
      }
      throw new Error(
        `Failed to fetch corporate events: ${response.status} ${response.statusText}`
      );
    }

    const payload = (await response.json()) as unknown;
    const rawEvents = extractAdvisorCorporateEvents(payload);
    const responsePreferredCurrencyId = readResponsePreferredCurrencyId(payload);
    const effectivePreferredCurrencyId =
      responsePreferredCurrencyId ?? resolvedCurrencyId;
    return {
      events: applyAdvisorCorporateEventCurrencyConversion(
        rawEvents,
        effectivePreferredCurrencyId
      ) as CorporateEventsResponse["events"],
      ...(responsePreferredCurrencyId
        ? { preferred_currency_id: responsePreferredCurrencyId }
        : { preferred_currency_id: resolvedCurrencyId }),
    };
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
