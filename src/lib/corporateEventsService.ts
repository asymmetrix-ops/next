import { authService } from "./auth";
import {
  CorporateEventsResponse,
  CorporateEventsFilters,
  CorporateEventDetailResponse,
} from "../types/corporateEvents";
import {
  getCorporateEventDetailApiError,
  hasCorporateEventDetailPayload,
  normalizeCorporateEventDetailResponse,
} from "@/lib/corporateEventDetail";

const BASE_URL = "https://xdil-abvj-o7rq.e2.xano.io/api:617tZc8l";

class CorporateEventsService {
  private getAuthHeaders() {
    authService.ensureAuthCookie();
    const token = authService.getToken() ?? authService.getTokenFromCookie();
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
      for (const dealType of filters.deal_types) {
        queryParams.append("deal_types[]", dealType);
      }
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
    queryParams.append("portfolio_only", String(Boolean(filters.portfolio_only)));

    // Add date filters
    if (filters.Date_start) {
      queryParams.append("Date_start", filters.Date_start);
    }
    if (filters.Date_end) {
      queryParams.append("Date_end", filters.Date_end);
    }
    queryParams.append("EV_min", filters.EV_min ?? "0");
    queryParams.append("EV_max", filters.EV_max ?? "0");

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
    // Production api:617tZc8l does not support preferred_currency_id on this
    // endpoint yet (develop api:617tZc8l:develop does). Sending it triggers a
    // Xano runtime error in result1. Amounts use native deal currency until prod
    // backend currency conversion is deployed.
    const url = `${BASE_URL}/corporate_event_v2?corporate_event_id=${encodeURIComponent(corporateEventId)}`;

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
    const apiError = getCorporateEventDetailApiError(data);
    if (apiError) {
      throw new Error(
        "Corporate event data is temporarily unavailable. Deal amounts are shown in native currency until currency conversion is enabled on production."
      );
    }
    const normalized = normalizeCorporateEventDetailResponse(data);
    if (!hasCorporateEventDetailPayload(normalized)) {
      throw new Error("Corporate event not found");
    }
    return normalized;
  }
}

export const corporateEventsService = new CorporateEventsService();
