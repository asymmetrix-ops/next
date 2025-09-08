import {
  IndividualResponse,
  IndividualEventsResponse,
  IndividualNameResponse,
  CorporateEvent,
} from "../types/individual";

const BASE_URL = "https://xdil-abvj-o7rq.e2.xano.io/api:Xpykjv0R";

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
    const url = `${BASE_URL}/get_individuals_events?individual_id=${individualId}`;

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
      // New shape detection
      const container = raw?.conterparty_table_content?.[0];
      const relatedEventsStr = container?.related_events;

      if (
        typeof relatedEventsStr === "string" &&
        relatedEventsStr.trim().length > 0
      ) {
        // Parse the embedded JSON string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parsed: any = JSON.parse(relatedEventsStr);

        // Map Events_Table -> events
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const eventsTable: any[] = Array.isArray(parsed?.Events_Table)
          ? parsed.Events_Table
          : [];

        // Build lookup maps of individual_id -> name/logo from Events_Table[]."Other Individuals"
        const otherIndividualIdToName = new Map<number, string>();
        const otherIndividualIdToLogo = new Map<number, string>();
        for (const evt of eventsTable) {
          const arr = Array.isArray(evt?.["Other Individuals"])
            ? evt?.["Other Individuals"]
            : [];
          for (const oi of arr) {
            const id = Number(oi?.individuals_id ?? 0);
            const name = (oi?.name || "").toString().trim();
            const logo = (oi?.company_logo || "").toString().trim();
            if (id > 0) {
              if (name) otherIndividualIdToName.set(id, name);
              if (logo) otherIndividualIdToLogo.set(id, logo);
            }
          }
        }

        // Minimal currency id to code mapping (extend as needed)
        const currencyIdToCode: Record<number, string> = {
          7: "USD",
        };

        const cleanName = (name: unknown): string => {
          const rawName = (name || "").toString();
          // Remove anything inside parentheses including parentheses, typically notion URLs or status labels
          // e.g., "With Intelligence (https://...)" -> "With Intelligence"
          return rawName.replace(/\s*\([^)]*\)\s*/g, "").trim();
        };

        const events = eventsTable.map((evt) => {
          // Safely pick fields with fallbacks
          const description: string =
            evt?.Description ?? evt?.description ?? "";
          const announced: string =
            evt?.["Date Announced"] ?? evt?.announcement_date ?? "";
          const type: string = evt?.Type ?? evt?.deal_type ?? "";

          // Enterprise Value mapping
          const evObj = evt?.["Enterprise Value"] ?? evt?.ev_data ?? {};
          const enterpriseValue = String(evObj?.enterprise_value_m ?? "");
          const currencyId = Number(evObj?.currency_id ?? 0);
          const currencyCode = currencyIdToCode[currencyId];

          // Related counterparty mapping -> map into prior shape used by UI
          const relatedCounterparty = evt?.["Related Counterparty"] ?? {};
          const relatedCounterpartyStatus: string =
            relatedCounterparty?.counterparty_status ?? "";
          const relatedCounterpartyId = Number(
            relatedCounterparty?.counterparty_id ?? 0
          );
          const relatedCounterpartyName = cleanName(
            relatedCounterparty?.counterparty_name ?? ""
          );

          // Other counterparties mapping -> prior shape expects array with name
          const otherCpsArr = Array.isArray(evt?.["Other Counterparties"])
            ? evt?.["Other Counterparties"]
            : [];

          const otherCounterparties = otherCpsArr.map(
            (cp: { counterparty_id?: number; counterparty_name?: string }) => ({
              new_company_counterparty: Number(cp?.counterparty_id ?? 0),
              id: Number(cp?.counterparty_id ?? 0),
              name: cleanName(cp?.counterparty_name ?? ""),
              _is_that_investor: false,
              _is_that_data_analytic_company: false,
            })
          );

          // Other individuals -> prior UI expects array with id + name; we only have ids here
          const otherIndividualsArr = Array.isArray(evt?.["Other Individuals"])
            ? evt?.["Other Individuals"]
            : [];
          const relatedIndividuals = otherIndividualsArr.map(
            (oi: { individuals_id?: number; name?: string }) => {
              const id = Number(oi?.individuals_id ?? 0);
              const name = (oi?.name || "").toString().trim();
              return {
                id,
                advisor_individuals: name || (id ? `Individual ${id}` : ""),
              };
            }
          );

          // Advisors -> map to prior shape expecting _new_company.name
          const advisorsArr = Array.isArray(evt?.Advisors) ? evt?.Advisors : [];
          const relatedAdvisors = advisorsArr.map(
            (a: { company_id?: number; company_name?: string }) => ({
              new_company_advised: Number(a?.company_id ?? 0),
              _new_company: {
                id: Number(a?.company_id ?? 0),
                name: cleanName(a?.company_name ?? ""),
                primary_business_focus_id: [],
                _is_that_investor: false,
                _is_that_data_analytic_company: false,
              },
            })
          );

          return {
            id: Number(evt?.id ?? 0),
            description,
            announcement_date: announced,
            deal_type: type,
            ev_data: {
              ev_source: "",
              enterprise_value_m: enterpriseValue,
              currency_id: currencyId,
              ...(currencyCode
                ? {
                    _currency: {
                      id: currencyId,
                      created_at: 0,
                      Currency: currencyCode,
                    },
                  }
                : {}),
            },
            _other_advisors_of_corporate_event: [],
            _target_counterparty_of_corporate_events:
              relatedCounterpartyId > 0
                ? {
                    new_company_counterparty: relatedCounterpartyId,
                    id: relatedCounterpartyId,
                    name: relatedCounterpartyName,
                  }
                : undefined,
            _other_counterparties_of_corporate_events: otherCounterparties,
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

        // Map Other_individuals -> all_related_individuals (best-effort)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const otherIndividuals: any[] = Array.isArray(parsed?.Other_individuals)
          ? parsed.Other_individuals
          : [];

        const all_related_individuals = otherIndividuals.flatMap((ind) => {
          const indId = Number(ind?.individuals_id ?? 0);
          const roles: Array<{
            role_id?: number;
            company_id?: number;
            company_name?: string;
            status?: string;
            job_titles?: string[];
          }> = Array.isArray(ind?.roles) ? ind.roles : [];

          return roles.map((r) => ({
            id: Number(r?.role_id ?? indId),
            individuals_id: indId,
            employee_new_company_id: Number(r?.company_id ?? 0),
            Status: (r?.status as "Current" | "Past") || "Current",
            job_titles_id: (Array.isArray(r?.job_titles)
              ? r?.job_titles
              : []
            ).map((jt) => ({ job_title: String(jt) })),
            _individuals: {
              id: indId,
              advisor_individuals:
                otherIndividualIdToName.get(indId) || `Individual ${indId}`,
            },
            _new_company: {
              id: Number(r?.company_id ?? 0),
              name: r?.company_name ?? "",
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

        const normalized: IndividualEventsResponse = {
          events,
          all_related_individuals,
        };

        return normalized;
      }
    } catch (e) {
      console.warn(
        "[IndividualService] Failed to parse new events shape, falling back to raw.",
        e
      );
    }

    // Fallback: assume it's already in the old, expected shape
    return raw as IndividualEventsResponse;
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
