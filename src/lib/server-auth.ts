import { cookies } from "next/headers";

export interface ServerAuthService {
  getAuthHeaders(): Record<string, string>;
  isAuthenticated(): boolean;
}

class ServerAuthServiceImpl implements ServerAuthService {
  private tokenKey = "asymmetrix_auth_token";

  getAuthHeaders(): Record<string, string> {
    const cookieStore = cookies();
    const token = cookieStore.get(this.tokenKey)?.value;

    if (!token) {
      return {};
    }

    return {
      Authorization: `Bearer ${token}`,
      // Add any other auth headers your API needs
    };
  }

  isAuthenticated(): boolean {
    const cookieStore = cookies();
    const token = cookieStore.get(this.tokenKey)?.value;
    return !!token;
  }

  getToken(): string | null {
    const cookieStore = cookies();
    return cookieStore.get(this.tokenKey)?.value || null;
  }
}

export const serverAuthService = new ServerAuthServiceImpl();

// API service for server-side use
export class ServerDashboardApiService {
  private baseUrl = "https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV";

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = {
      "Content-Type": "application/json",
      ...serverAuthService.getAuthHeaders(),
      ...options.headers,
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
      // Add caching for better performance
      next: { revalidate: 300 }, // 5 minutes
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  async getSectorsOverview() {
    return this.request("/sectors_overview");
  }

  async getPrimarySectorsWithCompanyCounts() {
    return this.request("/Primary_sectors_with_companies_counts");
  }

  async getSectorDetails(sectorId: number) {
    return this.request(`/Get_Sector?Sector_id=${sectorId}`);
  }
}

export const serverDashboardApiService = new ServerDashboardApiService();
