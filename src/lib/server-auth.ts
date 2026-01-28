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

  async getPrimarySectorsWithCompanyCounts() {
    return this.request("/Primary_sectors_with_companies_counts");
  }

  async getSectorDetails(sectorId: number) {
    return this.request(`/Get_Sector?Sector_id=${sectorId}`);
  }

  // Sector page specific endpoints
  async getSector(sectorId: string) {
    return this.request(`/sectors/${sectorId}`, {
      next: { revalidate: 300 },
    });
  }

  async getSectorMarketMap(sectorId: string) {
    const qs = new URLSearchParams();
    qs.append('Sector_id', parseInt(sectorId, 10).toString());
    return this.request(`/sectors_market_map?${qs.toString()}`, {
      next: { revalidate: 300 },
    });
  }

  async getSectorStrategicAcquirers(sectorId: string) {
    const qs = new URLSearchParams();
    qs.append('Sector_id', parseInt(sectorId, 10).toString());
    return this.request(`/sectors_strategic_acquirers?${qs.toString()}`, {
      next: { revalidate: 300 },
    });
  }

  async getSectorPEInvestors(sectorId: string) {
    const qs = new URLSearchParams();
    qs.append('Sector_id', parseInt(sectorId, 10).toString());
    return this.request(`/sectors_pe_investors?${qs.toString()}`, {
      next: { revalidate: 300 },
    });
  }

  async getSectorRecentTransactions(sectorId: string) {
    const qs = new URLSearchParams();
    qs.append('Sector_id', parseInt(sectorId, 10).toString());
    qs.append('top_15', 'true');
    return this.request(`/sectors_resent_trasnactions?${qs.toString()}`, {
      next: { revalidate: 300 },
    });
  }

  // Overview data - contains strategic_acquirers and pe_investors (slowest endpoint ~3-6s)
  async getSectorOverviewData(sectorId: string) {
    const qs = new URLSearchParams();
    qs.append('Sector_id', parseInt(sectorId, 10).toString());
    return this.request<{ strategic_acquirers?: unknown; pe_investors?: unknown }>(`/overview_data?${qs.toString()}`, {
      next: { revalidate: 300 },
    });
  }
}

export const serverDashboardApiService = new ServerDashboardApiService();
