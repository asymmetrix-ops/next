import {
  IndividualResponse,
  IndividualEventsResponse,
  IndividualNameResponse,
  RelatedIndividual,
} from "../types/individual";
import {
  extractIndividualCorporateEvents,
  normalizeIndividualCorporateEvent,
} from "./normalizeIndividualCorporateEvent";
import {
  parseCounterpartyRelatedEvents,
  buildIndividualCorporateEventsFromCounterpartyPayload,
  applyFlatCorporateEventCurrencyConversion,
} from "./normalizeCounterpartyCorporateEvents";
import { readPlatformCurrencyIdClient } from "./platformCurrency";

const BASE_URL = "https://xdil-abvj-o7rq.e2.xano.io/api:Xpykjv0R";

function buildIndividualEventsFromCounterpartyPayload(
  parsed: Record<string, unknown>,
  preferredCurrencyId: number | null
): IndividualEventsResponse {
  const events = buildIndividualCorporateEventsFromCounterpartyPayload(
    parsed,
    preferredCurrencyId
  );

  const otherIndividuals = Array.isArray(parsed.Other_individuals)
    ? (parsed.Other_individuals as Array<Record<string, unknown>>)
    : [];

  const all_related_individuals = otherIndividuals.flatMap((ind) => {
    const indId = Number(ind?.individuals_id ?? 0);
    const roles = Array.isArray(ind?.roles)
      ? (ind.roles as Array<{
          role_id?: number;
          company_id?: number;
          company_name?: string;
          status?: string;
          job_titles?: string[];
        }>)
      : [];

    return roles.map((r) => ({
      id: Number(r?.role_id ?? indId),
      individuals_id: indId,
      employee_new_company_id: Number(r?.company_id ?? 0),
      Status: (r?.status as "Current" | "Past") || "Current",
      job_titles_id: (Array.isArray(r?.job_titles) ? r.job_titles : []).map(
        (jt) => ({ job_title: String(jt) })
      ),
      _individuals: {
        id: indId,
        advisor_individuals: `Individual ${indId}`,
      },
      _new_company: {
        id: Number(r?.company_id ?? 0),
        name: String(r?.company_name ?? ""),
        linkedin_data: {
          linkedin_logo: "",
        },
        _is_that_investor: false,
        _linkedin_data_of_new_company: {
          linkedin_logo: "",
        },
      },
    }));
  });

  return { events, all_related_individuals };
}

class IndividualService {
  private getAuthHeaders() {
    const token = localStorage.getItem("asymmetrix_auth_token");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * API Call 1: Get Individual Profile and Roles
   * Endpoint: https://xdil-abvj-o7rq.e2.xano.io/api:Xpykjv0R/get_individual
   * Method: GET
   * Auth: Required
   * Request Body: { "individual_id": number }
   */
  async getIndividual(individualId: number): Promise<IndividualResponse> {
    const url = `${BASE_URL}/get_individual?individual_id=${individualId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...this.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch individual: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * API Call 2: Get Individual Events
   * Endpoint: https://xdil-abvj-o7rq.e2.xano.io/api:Xpykjv0R/get_individuals_events
   * Method: GET
   * Auth: Required
   * Request Body: { "individual_id": number }
   */
  async getIndividualEvents(
    individualId: number
  ): Promise<IndividualEventsResponse> {
    const preferredCurrencyId = readPlatformCurrencyIdClient();
    const url = `${BASE_URL}/get_individuals_events?individual_id=${individualId}&preferred_currency_id=${preferredCurrencyId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...this.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch individual events: ${response.status} ${response.statusText}`
      );
    }

    // The API may return either the old shape or the new stringified JSON under
    // conterparty_table_content[0].related_events. Normalize to IndividualEventsResponse.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any = await response.json();

    try {
      const container = raw?.conterparty_table_content?.[0];
      const parsed = parseCounterpartyRelatedEvents(container?.related_events);

      if (parsed && Array.isArray(parsed.Events_Table)) {
        const responsePreferredCurrencyId = Number(raw?.preferred_currency_id ?? 0);
        return buildIndividualEventsFromCounterpartyPayload(
          parsed,
          responsePreferredCurrencyId > 0
            ? responsePreferredCurrencyId
            : preferredCurrencyId
        );
      }

      const extracted = extractIndividualCorporateEvents(raw);
      if (extracted.length > 0) {
        const responsePreferredCurrencyId = Number(raw?.preferred_currency_id ?? 0);
        const effectivePreferredCurrencyId =
          responsePreferredCurrencyId > 0
            ? responsePreferredCurrencyId
            : preferredCurrencyId;
        const events = extracted.map((item) => {
          const rawEvent = (
            item && typeof item === "object" ? item : {}
          ) as Record<string, unknown>;
          const withCurrency = applyFlatCorporateEventCurrencyConversion(
            rawEvent,
            effectivePreferredCurrencyId
          );
          return normalizeIndividualCorporateEvent(withCurrency);
        });
        const relatedRaw = raw?.all_related_individuals ?? raw?.related_individuals;
        return {
          events,
          all_related_individuals: Array.isArray(relatedRaw)
            ? (relatedRaw as RelatedIndividual[])
            : [],
        };
      }
    } catch (e) {
      console.warn(
        "[IndividualService] Failed to parse new events shape, falling back to raw.",
        e
      );
    }

    // Fallback: assume it's already in the old, expected shape
    const legacyEvents = extractIndividualCorporateEvents(raw);
    if (legacyEvents.length > 0) {
      const responsePreferredCurrencyId = Number(raw?.preferred_currency_id ?? 0);
      const effectivePreferredCurrencyId =
        responsePreferredCurrencyId > 0
          ? responsePreferredCurrencyId
          : preferredCurrencyId;
      return {
        events: legacyEvents.map((item) => {
          const rawEvent = (
            item && typeof item === "object" ? item : {}
          ) as Record<string, unknown>;
          const withCurrency = applyFlatCorporateEventCurrencyConversion(
            rawEvent,
            effectivePreferredCurrencyId
          );
          return normalizeIndividualCorporateEvent(withCurrency);
        }),
        all_related_individuals: Array.isArray(raw?.all_related_individuals)
          ? raw.all_related_individuals
          : [],
      };
    }

    return {
      events: Array.isArray(raw?.events) ? raw.events : [],
      all_related_individuals: Array.isArray(raw?.all_related_individuals)
        ? raw.all_related_individuals
        : [],
    };
  }

  /**
   * API Call 3: Get Individual Name
   * Endpoint: https://xdil-abvj-o7rq.e2.xano.io/api:Xpykjv0R/get_individuals_name
   * Method: GET
   * Auth: Required
   * Request Body: { "individuals_id": number }
   */
  async getIndividualName(
    individualId: number
  ): Promise<IndividualNameResponse> {
    const url = `${BASE_URL}/get_individuals_name?individuals_id=${individualId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...this.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch individual name: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Combined method to fetch all individual data
   */
  async getIndividualCompleteProfile(individualId: number): Promise<{
    profile: IndividualResponse;
    events: IndividualEventsResponse;
    name: IndividualNameResponse;
  }> {
    try {
      const [profileResponse, eventsResponse, nameResponse] = await Promise.all(
        [
          this.getIndividual(individualId),
          this.getIndividualEvents(individualId),
          this.getIndividualName(individualId),
        ]
      );

      return {
        profile: profileResponse,
        events: eventsResponse,
        name: nameResponse,
      };
    } catch (error) {
      console.error("Error fetching individual complete profile:", error);
      throw error;
    }
  }
}

export const individualService = new IndividualService();
export default IndividualService;
