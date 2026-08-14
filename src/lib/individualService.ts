import {
  IndividualResponse,
  IndividualEventsResponse,
  IndividualNameResponse,
  CorporateEvent,
  RelatedIndividual,
} from "../types/individual";
import {
  extractIndividualCorporateEvents,
  normalizeIndividualCorporateEvent,
} from "./normalizeIndividualCorporateEvent";
import { readPlatformCurrencyIdClient } from "./platformCurrency";

const BASE_URL = "https://xdil-abvj-o7rq.e2.xano.io/api:Xpykjv0R";

const CURRENCY_ID_TO_CODE: Record<number, string> = {
  7: "GBP",
  15: "USD",
};

function cleanIndividualEventName(name: unknown): string {
  return String(name ?? "")
    .replace(/\s*\([^)]*\)\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCounterpartyRelatedEvents(relatedEvents: unknown): Record<string, unknown> | null {
  if (relatedEvents == null) return null;
  if (typeof relatedEvents === "string") {
    const trimmed = relatedEvents.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  if (typeof relatedEvents === "object") {
    return relatedEvents as Record<string, unknown>;
  }
  return null;
}

function buildIndividualEventsFromCounterpartyPayload(
  parsed: Record<string, unknown>
): IndividualEventsResponse {
  const eventsTable = Array.isArray(parsed.Events_Table)
    ? (parsed.Events_Table as Record<string, unknown>[])
    : [];

  const corporateEventsById = new Map<number, Record<string, unknown>>();
  if (Array.isArray(parsed.Corporate_Events)) {
    for (const item of parsed.Corporate_Events) {
      if (!item || typeof item !== "object") continue;
      const id = Number((item as Record<string, unknown>).id ?? 0);
      if (id > 0) corporateEventsById.set(id, item as Record<string, unknown>);
    }
  }

  const otherIndividualIdToName = new Map<number, string>();
  const otherIndividualIdToLogo = new Map<number, string>();
  for (const evt of eventsTable) {
    const arr = Array.isArray(evt?.["Other Individuals"])
      ? (evt["Other Individuals"] as Array<Record<string, unknown>>)
      : [];
    for (const oi of arr) {
      const id = Number(oi?.individuals_id ?? 0);
      const name = String(oi?.name ?? "").trim();
      const logo = String(oi?.company_logo ?? "").trim();
      if (id > 0) {
        if (name) otherIndividualIdToName.set(id, name);
        if (logo) otherIndividualIdToLogo.set(id, logo);
      }
    }
  }

  const events = eventsTable.map((evt) => {
    const eventId = Number(evt?.id ?? 0);
    const corpEvent = eventId > 0 ? corporateEventsById.get(eventId) : undefined;
    const investmentData = corpEvent?.investment_data as
      | {
          currency_id?: number;
          Funding_stage?: string;
          investment_amount_m?: string | number | null;
        }
      | undefined;

    const description = String(evt?.Description ?? evt?.description ?? "");
    const announced = String(
      evt?.["Date Announced"] ?? evt?.announcement_date ?? ""
    );
    const type = String(evt?.Type ?? evt?.deal_type ?? "");

    const evObj = (evt?.["Enterprise Value"] ?? evt?.ev_data ?? {}) as {
      enterprise_value_m?: string | number | null;
      currency_id?: number;
    };
    const enterpriseValue = String(evObj?.enterprise_value_m ?? "");
    const evCurrencyId = Number(evObj?.currency_id ?? 0);
    const evCurrencyCode = CURRENCY_ID_TO_CODE[evCurrencyId];

    const investmentAmount = investmentData?.investment_amount_m;
    const investmentCurrencyId = Number(investmentData?.currency_id ?? 0);
    const investmentCurrencyCode = CURRENCY_ID_TO_CODE[investmentCurrencyId];
    const fundingStage = String(investmentData?.Funding_stage ?? "").trim();

    const relatedCounterparty = (evt?.["Related Counterparty"] ?? {}) as {
      counterparty_status?: string;
      counterparty_id?: number;
      counterparty_name?: string;
    };
    const relatedCounterpartyStatus = String(
      relatedCounterparty?.counterparty_status ?? ""
    );
    const relatedCounterpartyId = Number(relatedCounterparty?.counterparty_id ?? 0);
    const relatedCounterpartyName = cleanIndividualEventName(
      relatedCounterparty?.counterparty_name
    );

    const otherCpsArr = Array.isArray(evt?.["Other Counterparties"])
      ? (evt["Other Counterparties"] as Array<{
          counterparty_id?: number;
          counterparty_name?: string;
        }>)
      : [];

    const otherCounterparties = otherCpsArr.map((cp) => ({
      new_company_counterparty: Number(cp?.counterparty_id ?? 0),
      id: Number(cp?.counterparty_id ?? 0),
      name: cleanIndividualEventName(cp?.counterparty_name),
      _is_that_investor: false,
      _is_that_data_analytic_company: false,
    }));

    const primaryTarget = otherCounterparties[0];
    const targetCounterparty =
      primaryTarget && primaryTarget.id > 0 && primaryTarget.name
        ? {
            new_company_counterparty: primaryTarget.id,
            id: primaryTarget.id,
            name: primaryTarget.name,
          }
        : relatedCounterpartyId > 0 && relatedCounterpartyName
          ? {
              new_company_counterparty: relatedCounterpartyId,
              id: relatedCounterpartyId,
              name: relatedCounterpartyName,
            }
          : undefined;

    const otherCounterpartiesForDisplay = primaryTarget
      ? [
          ...otherCounterparties.slice(1),
          ...(relatedCounterpartyId > 0 &&
          relatedCounterpartyName &&
          relatedCounterpartyId !== primaryTarget.id
            ? [
                {
                  new_company_counterparty: relatedCounterpartyId,
                  id: relatedCounterpartyId,
                  name: relatedCounterpartyName,
                  _is_that_investor: false,
                  _is_that_data_analytic_company: false,
                },
              ]
            : []),
        ]
      : otherCounterparties;

    const otherIndividualsArr = Array.isArray(evt?.["Other Individuals"])
      ? (evt["Other Individuals"] as Array<{ individuals_id?: number; name?: string }>)
      : [];
    const relatedIndividuals = otherIndividualsArr.map((oi) => {
      const id = Number(oi?.individuals_id ?? 0);
      const name = String(oi?.name ?? "").trim();
      return {
        id,
        advisor_individuals: name || (id ? `Individual ${id}` : ""),
      };
    });

    const advisorsArr = Array.isArray(evt?.Advisors)
      ? (evt.Advisors as Array<{ company_id?: number; company_name?: string }>)
      : [];
    const relatedAdvisors = advisorsArr.map((a) => ({
      new_company_advised: Number(a?.company_id ?? 0),
      _new_company: {
        id: Number(a?.company_id ?? 0),
        name: cleanIndividualEventName(a?.company_name),
        primary_business_focus_id: [] as number[],
        _is_that_investor: false,
        _is_that_data_analytic_company: false,
      },
    }));

    const hasInvestmentAmount =
      investmentAmount != null && String(investmentAmount).trim() !== "";

    return {
      id: eventId,
      description,
      announcement_date: announced,
      deal_type: type,
      ...(hasInvestmentAmount
        ? {
            investment_data: {
              investment_amount_m: String(investmentAmount),
              currency_id: investmentCurrencyId,
              ...(fundingStage ? { Funding_stage: fundingStage } : {}),
              ...(investmentCurrencyCode
                ? {
                    _currency: {
                      id: investmentCurrencyId,
                      created_at: 0,
                      Currency: investmentCurrencyCode,
                    },
                  }
                : {}),
            },
          }
        : {}),
      ev_data: {
        ev_source: "",
        enterprise_value_m: enterpriseValue,
        currency_id: evCurrencyId,
        ...(evCurrencyCode
          ? {
              _currency: {
                id: evCurrencyId,
                created_at: 0,
                Currency: evCurrencyCode,
              },
            }
          : {}),
      },
      _other_advisors_of_corporate_event: [],
      _target_counterparty_of_corporate_events: targetCounterparty,
      _other_counterparties_of_corporate_events: otherCounterpartiesForDisplay,
      _relater_to_corporate_event_cpawa_advisors_individuals: [],
      _counterparty_advised_of_corporate_events: [
        {
          counterparty_type: 0,
          _counterpartys_type: {
            counterparty_status: relatedCounterpartyStatus || "",
          },
        },
      ],
      _related_to_corporate_event_individuals: relatedIndividuals,
      _related_advisor_to_corporate_events: relatedAdvisors,
    } as CorporateEvent;
  });

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
        advisor_individuals:
          otherIndividualIdToName.get(indId) || `Individual ${indId}`,
      },
      _new_company: {
        id: Number(r?.company_id ?? 0),
        name: String(r?.company_name ?? ""),
        linkedin_data: {
          linkedin_logo: otherIndividualIdToLogo.get(indId) || "",
        },
        _is_that_investor: false,
        _linkedin_data_of_new_company: {
          linkedin_logo: otherIndividualIdToLogo.get(indId) || "",
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
        return buildIndividualEventsFromCounterpartyPayload(parsed);
      }

      const extracted = extractIndividualCorporateEvents(raw);
      if (extracted.length > 0) {
        const events = extracted.map((item) =>
          normalizeIndividualCorporateEvent(item)
        );
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
      return {
        events: legacyEvents.map((item) => normalizeIndividualCorporateEvent(item)),
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
