import { serverAuthService } from "./server-auth";
import type { FinancialMetricsRow } from "./dashboardApi";

const BASE_URL = "https://xdil-abvj-o7rq.e2.xano.io/api:5YnK3rYr:develop";

export class ServerDashboardApiService {
  async getFinancialMetrics(filters?: {
    Countries?: string[];
    Primary_sectors_ids?: number[];
    Secondary_sectors_ids?: number[];
  }): Promise<FinancialMetricsRow[]> {
    const headers = {
      "Content-Type": "application/json",
      ...serverAuthService.getAuthHeaders(),
    };

    // Build query parameters for GET request
    const params = new URLSearchParams();

    if (filters) {
      if (filters.Countries && filters.Countries.length > 0) {
        filters.Countries.forEach((country) => {
          params.append("Countries[]", country);
        });
      }
      if (filters.Primary_sectors_ids && filters.Primary_sectors_ids.length > 0) {
        filters.Primary_sectors_ids.forEach((id) => {
          params.append("Primary_sectors_ids[]", id.toString());
        });
      }
      if (filters.Secondary_sectors_ids && filters.Secondary_sectors_ids.length > 0) {
        filters.Secondary_sectors_ids.forEach((id) => {
          params.append("Secondary_sectors_ids[]", id.toString());
        });
      }
    }

    // Always use GET method with query parameters
    const queryString = params.toString();
    const url = queryString
      ? `${BASE_URL}/mean?${queryString}`
      : `${BASE_URL}/mean`;

    const response = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store", // Always fetch fresh data
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Authentication required");
      }
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.statusText} - ${errorText}`);
    }

    // The /mean endpoint returns a raw array, not wrapped in ApiResponse
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }
}

export const serverDashboardApiService = new ServerDashboardApiService();

