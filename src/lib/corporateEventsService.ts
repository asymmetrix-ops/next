import { authService } from "./auth";
import {
  CorporateEventsResponse,
  CorporateEventsFilters,
  CorporateEventDetailResponse,
} from "../types/corporateEvents";

const BASE_URL = "https://xdil-abvj-o7rq.e2.xano.io/api:617tZc8l";

class CorporateEventsService {
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

  async getCorporateEvents(
    page: number = 1,
    perPage: number = 50,
    filters: Partial<CorporateEventsFilters> = {}
  ): Promise<CorporateEventsResponse> {
    const queryParams = new URLSearchParams();

    // Add pagination parameters
    queryParams.append("Page", (page - 1).toString()); // API expects 0-based indexing
    queryParams.append("Per_page", perPage.toString());

    // Add filter parameters
    if (filters.search_query) {
      queryParams.append("search_query", filters.search_query);
    }

    // Add arrays as bracketed array params per API expectations
    if (filters.primary_sectors_ids && filters.primary_sectors_ids.length > 0) {
      for (const id of filters.primary_sectors_ids) {
        queryParams.append("primary_sectors_ids[]", id.toString());
      }
    }
    if (
      filters.Secondary_sectors_ids &&
      filters.Secondary_sectors_ids.length > 0
    ) {
      for (const id of filters.Secondary_sectors_ids) {
        queryParams.append("Secondary_sectors_ids[]", id.toString());
      }
    }
    if (filters.deal_types && filters.deal_types.length > 0) {
      queryParams.append("deal_types", filters.deal_types.join(","));
    }
    if (
      filters.Buyer_Investor_Types &&
      filters.Buyer_Investor_Types.length > 0
    ) {
      queryParams.append(
        "Buyer_Investor_Types",
        filters.Buyer_Investor_Types.join(",")
      );
    }
    if (filters.Countries && filters.Countries.length > 0) {
      queryParams.append("Countries", filters.Countries.join(","));
    }
    if (filters.Provinces && filters.Provinces.length > 0) {
      queryParams.append("Provinces", filters.Provinces.join(","));
    }
    if (filters.Cities && filters.Cities.length > 0) {
      queryParams.append("Cities", filters.Cities.join(","));
    }
    if (filters.Deal_Status && filters.Deal_Status.length > 0) {
      queryParams.append("Deal_Status", filters.Deal_Status.join(","));
    }

    // Funding stage filter - comma-separated list of stage labels
    if (filters.Funding_stage && filters.Funding_stage.length > 0) {
      queryParams.append("Funding_stage", filters.Funding_stage.join(","));
    }

    // Add date filters
    if (filters.Date_start) {
      queryParams.append("Date_start", filters.Date_start);
    }
    if (filters.Date_end) {
      queryParams.append("Date_end", filters.Date_end);
    }

    const url = `${BASE_URL}/get_all_corporate_events?${queryParams.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...this.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        authService.logout();
        throw new Error("Authentication required");
      }
      throw new Error(
        `Failed to fetch corporate events: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return data;
  }

  async getCorporateEventTitle(id: number): Promise<string> {
    const url = `${BASE_URL}/get_corporate_event_title?id=${id}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...this.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        authService.logout();
        throw new Error("Authentication required");
      }
      throw new Error(
        `Failed to fetch corporate event title: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return data;
  }

  async getCorporateEvent(
    corporateEventId: string
  ): Promise<CorporateEventDetailResponse> {
    const url = `${BASE_URL}/corporate_event_v2?corporate_event_id=${corporateEventId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...this.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        authService.logout();
        throw new Error("Authentication required");
      }
      throw new Error(
        `Failed to fetch corporate event: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    // Normalize v2 response that wraps JSON strings inside result1[0]
    // and gracefully fallback to already-normalized shapes
    const safeParse = <T>(value: unknown, fallback: T): T => {
      if (typeof value !== "string") return (value as T) ?? fallback;
      try {
        const parsed = JSON.parse(value as string);
        return (parsed as T) ?? fallback;
      } catch {
        return fallback;
      }
    };

    if (
      data &&
      (Array.isArray(data.result1) || typeof data.result1 === "object")
    ) {
      const r1 = data.result1 as unknown;
      const first = (Array.isArray(r1) ? r1[0] : r1) as Record<string, unknown>;
      const normalized: CorporateEventDetailResponse = {
        Event: safeParse(first.Event, []),
        Event_counterparties: safeParse(first.Event_counterparties, []),
        Event_advisors: safeParse(first.Event_advisors, []),
        Primary_sectors: safeParse(first.Primary_sectors, []),
        // Note: key contains a hyphen
        ["Sub-sectors"]: safeParse(first["Sub-sectors"], []),
      } as CorporateEventDetailResponse;
      return normalized;
    }

    return data as CorporateEventDetailResponse;
  }
}

export const corporateEventsService = new CorporateEventsService();
