import { authService } from "./auth";

interface ApiResponse<T> {
  data: T;
  error?: string;
  total?: number;
}

class DashboardApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = "https://xdil-abvj-o7rq.e2.xano.io/api:5YnK3rYr";
    console.log("Dashboard API Service Base URL:", this.baseUrl);
  }

  // Make authenticated API request
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers = {
      "Content-Type": "application/json",
      ...authService.getAuthHeaders(),
      ...options.headers,
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        authService.logout();
        window.location.href = "/login";
        throw new Error("Authentication required");
      }
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Dashboard specific endpoints
  async getAllContentArticlesHome(): Promise<
    ApiResponse<Record<string, unknown>[]>
  > {
    return this.request<Record<string, unknown>[]>(
      "/All_Content_Articles_home"
    );
  }

  async getCorporateEvents(): Promise<ApiResponse<Record<string, unknown>[]>> {
    return this.request<Record<string, unknown>[]>("/corporate_events");
  }

  async getRecentlyAddedCompanies(): Promise<
    ApiResponse<Record<string, unknown>[]>
  > {
    return this.request<Record<string, unknown>[]>("/recently_added_companies");
  }

  async getHeroScreenStatisticCompanies(): Promise<
    ApiResponse<Record<string, unknown>>
  > {
    return this.request<Record<string, unknown>>(
      "/hero_screen_statistic_Companies"
    );
  }

  async getHeroScreenStatisticEventsCount(): Promise<
    ApiResponse<Record<string, unknown>>
  > {
    return this.request<Record<string, unknown>>(
      "/hero_screen_statistic_Events_count"
    );
  }

  async getHeroScreenStatisticSectors(): Promise<
    ApiResponse<Record<string, unknown>>
  > {
    return this.request<Record<string, unknown>>(
      "/hero_screen_statistic_Sectors"
    );
  }

  async getHeroScreenStatisticAdvisorsCount(): Promise<
    ApiResponse<Record<string, unknown>>
  > {
    return this.request<Record<string, unknown>>(
      "/hero_screen_statistic_Advisors_counr"
    );
  }

  async getHeroScreenStatisticInvestors(): Promise<
    ApiResponse<Record<string, unknown>>
  > {
    return this.request<Record<string, unknown>>(
      "/hero_screen_statistic_investors"
    );
  }

  async getAllIndividualsCount(): Promise<
    ApiResponse<Record<string, unknown>>
  > {
    return this.request<Record<string, unknown>>("/all_Individuals_count");
  }

  // Generic method for any dashboard endpoint
  async customRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    // Ensure endpoint starts with a slash
    const formattedEndpoint = endpoint.startsWith("/")
      ? endpoint
      : `/${endpoint}`;
    return this.request<T>(formattedEndpoint, options);
  }
}

export const dashboardApiService = new DashboardApiService();
export type { ApiResponse };
