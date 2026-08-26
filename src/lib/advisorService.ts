import { authService } from "./auth";
import {
  AdvisorResponse,
  AdvisorTransactionEngagementsResponse,
  CorporateEventsResponse,
} from "../types/advisor";
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
   * Paginated advisor transaction engagements (deals advised with individuals).
   * Endpoint: get_advisor_transaction_engagements
   */
  async getAdvisorTransactionEngagements(
    advisorId: number,
    page = 1,
    pageSize = 25
  ): Promise<AdvisorTransactionEngagementsResponse> {
    const params = new URLSearchParams();
    params.set("new_comp_id", String(advisorId));
    params.set("page", String(page));
    params.set("page_size", String(pageSize));
    const url = `${BASE_URL}/get_advisor_transaction_engagements?${params.toString()}`;

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
        `Failed to fetch advisor transaction engagements: ${response.status} ${response.statusText}`
      );
    }

    const payload = (await response.json()) as AdvisorTransactionEngagementsResponse;
    return {
      page: Number(payload.page) || page,
      page_size: Number(payload.page_size) || pageSize,
      total: Number(payload.total) || 0,
      total_pages: Number(payload.total_pages) || 0,
      results: Array.isArray(payload.results) ? payload.results : [],
    };
  }

  /**
   * Combined API call to fetch advisor profile and first page of engagements.
   */
  async getAdvisorCompleteProfile(
    advisorId: number,
    preferredCurrencyId?: number,
    engagementsPage = 1,
    engagementsPageSize = 25
  ): Promise<{
    advisor: AdvisorResponse;
    engagements: AdvisorTransactionEngagementsResponse;
  }> {
    try {
      const [advisorResponse, engagementsResponse] = await Promise.all([
        this.getAdvisorProfile(advisorId),
        this.getAdvisorTransactionEngagements(
          advisorId,
          engagementsPage,
          engagementsPageSize
        ),
      ]);

      return {
        advisor: advisorResponse,
        engagements: engagementsResponse,
      };
    } catch (error) {
      console.error("Error fetching advisor complete profile:", error);
      throw error;
    }
  }
}

export const advisorService = new AdvisorService();
export default AdvisorService;
