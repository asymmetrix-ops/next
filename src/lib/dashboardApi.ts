import { authService } from "./auth";

interface ApiResponse<T> {
  data: T;
  error?: string;
  total?: number;
}

class DashboardApiService {
  private baseUrl: string;
  private sectorsCache: {
    data: Record<string, unknown>;
    timestamp: number;
  } | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.baseUrl = "https://xdil-abvj-o7rq.e2.xano.io/api:5YnK3rYr";
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
        // Token expired or invalid - let the AuthProvider handle this
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

  // New home page corporate events endpoint (returns a raw array, not { data: ... })
  async getCorporateEventsForHomePage(): Promise<Record<string, unknown>[]> {
    return this.request<Record<string, unknown>[]>("/corporate_event_for_home_page") as unknown as Record<
      string,
      unknown
    >[];
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

  async getPrimarySectorsWithCompanyCounts(
    sort?: string
  ): Promise<ApiResponse<Record<string, unknown>>> {
    // Check cache first
    if (
      this.sectorsCache &&
      Date.now() - this.sectorsCache.timestamp < this.CACHE_DURATION
    ) {
      return {
        data: this.sectorsCache.data,
        error: undefined,
        total: undefined,
      };
    }

    // Use the same authentication method as dashboard API calls
    const sectorsBaseUrl = "https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV";
    const endpoint = "/Primary_sectors_with_companies_counts";

    const authHeaders = authService.getAuthHeaders();

    // Debug: Log the auth headers to see what's being sent
    console.log("Sectors API - Auth headers:", authHeaders);
    console.log("Sectors API - Token:", authService.getToken());

    const headers = {
      "Content-Type": "application/json",
      ...authHeaders,
    };

    const options: RequestInit = {
      method: sort ? "POST" : "GET",
      headers,
      ...(sort && { body: JSON.stringify({ sort }) }),
    };

    console.log(
      "Sectors API - Making request to:",
      `${sectorsBaseUrl}${endpoint}`
    );

    const response = await fetch(`${sectorsBaseUrl}${endpoint}`, options);

    console.log("Sectors API - Response status:", response.status);
    console.log(
      "Sectors API - Response headers:",
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Sectors API - Error response:", errorText);
      if (response.status === 401) {
        throw new Error("Authentication required");
      }
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const responseData = await response.json();

    // Cache the response
    this.sectorsCache = {
      data: responseData,
      timestamp: Date.now(),
    };

    // Wrap the response in the expected ApiResponse format
    return {
      data: responseData,
      error: undefined,
      total: undefined,
    };
  }

  async getSectorsOverview(): Promise<ApiResponse<Record<string, unknown>>> {
    // Use the same authentication method as dashboard API calls
    const sectorsBaseUrl = "https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV";
    const endpoint = "/sectors_overview";

    const authHeaders = authService.getAuthHeaders();

    // Debug: Log the auth headers to see what's being sent
    console.log("Sectors Overview API - Auth headers:", authHeaders);
    console.log("Sectors Overview API - Token:", authService.getToken());

    const headers = {
      "Content-Type": "application/json",
      ...authHeaders,
    };

    const options: RequestInit = {
      method: "GET",
      headers,
    };

    console.log(
      "Sectors Overview API - Making request to:",
      `${sectorsBaseUrl}${endpoint}`
    );

    const response = await fetch(`${sectorsBaseUrl}${endpoint}`, options);

    console.log("Sectors Overview API - Response status:", response.status);
    console.log(
      "Sectors Overview API - Response headers:",
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Sectors Overview API - Error response:", errorText);
      if (response.status === 401) {
        throw new Error("Authentication required");
      }
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const responseData = await response.json();

    // Wrap the response in the expected ApiResponse format
    return {
      data: responseData,
      error: undefined,
      total: undefined,
    };
  }

  async getSectorDetails(
    sectorId: number
  ): Promise<ApiResponse<Record<string, unknown>>> {
    // Use the same authentication method as dashboard API calls
    const sectorsBaseUrl = "https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV";
    const endpoint = `/Get_Sector?Sector_id=${sectorId}`;

    const authHeaders = authService.getAuthHeaders();

    console.log("getSectorDetails - Auth headers:", authHeaders);
    console.log("getSectorDetails - Token:", authService.getToken());
    console.log(
      "getSectorDetails - Making GET request to:",
      `${sectorsBaseUrl}${endpoint}`
    );

    const headers = {
      "Content-Type": "application/json",
      ...authHeaders,
    };

    const options: RequestInit = {
      method: "GET",
      headers,
    };

    const response = await fetch(`${sectorsBaseUrl}${endpoint}`, options);

    console.log("getSectorDetails - Response status:", response.status);
    console.log(
      "getSectorDetails - Response headers:",
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("getSectorDetails - Error response:", errorText);
      if (response.status === 401) {
        throw new Error("Authentication required");
      }
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const responseData = await response.json();

    console.log("getSectorDetails - Success response:", responseData);

    // Wrap the response in the expected ApiResponse format
    return {
      data: responseData,
      error: undefined,
      total: undefined,
    };
  }

  // Clear cache method for manual cache invalidation
  clearSectorsCache(): void {
    this.sectorsCache = null;
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
