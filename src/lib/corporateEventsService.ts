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

    // Add arrays as comma-separated values
    if (filters.primary_sectors_ids && filters.primary_sectors_ids.length > 0) {
      queryParams.append(
        "primary_sectors_ids",
        filters.primary_sectors_ids.join(",")
      );
    }
    if (
      filters.Secondary_sectors_ids &&
      filters.Secondary_sectors_ids.length > 0
    ) {
      queryParams.append(
        "Secondary_sectors_ids",
        filters.Secondary_sectors_ids.join(",")
      );
    }
    if (filters.deal_types && filters.deal_types.length > 0) {
      queryParams.append("deal_types", filters.deal_types.join(","));
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
    const url = `${BASE_URL}/corporate_event?corporate_event_id=${corporateEventId}`;

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
    return data;
  }
}

export const corporateEventsService = new CorporateEventsService();
