import { authService } from "./auth";

interface ApiResponse<T> {
  data: T;
  error?: string;
  total?: number;
}

export type FinancialMetricsRow = {
  revenue_range: string;
  num_companies: number;
  range_order?: number;

  // Financial Metrics - Mean
  mean_revenue_m?: string | number | null;
  mean_ebitda_m?: string | number | null;
  mean_enterprise_value_m?: string | number | null;
  mean_ev_rev_multiple?: string | number | null;
  mean_revenue_growth?: string | number | null;
  mean_ebitda_margin?: string | number | null;
  mean_rule_of_40?: string | number | null;
  mean_ebit?: string | number | null;
  mean_num_clients?: string | number | null;
  mean_revenue_per_client?: string | number | null;
  mean_num_employees?: string | number | null;
  mean_revenue_per_employee?: string | number | null;

  // Subscription Metrics - Mean
  mean_arr_percent?: string | number | null;
  mean_arr_m?: string | number | null;
  mean_churn_pc?: string | number | null;
  mean_grr?: string | number | null;
  mean_upsell_pc?: string | number | null;
  mean_cross_sell_pc?: string | number | null;
  mean_price_increase_pc?: string | number | null;
  mean_rev_expansion_pc?: string | number | null;
  mean_nrr?: string | number | null;
  mean_new_client_growth_pc?: string | number | null;

  // Financial Metrics - Median
  median_revenue_m?: string | number | null;
  median_ebitda_m?: string | number | null;
  median_enterprise_value_m?: string | number | null;
  median_ev_rev_multiple?: string | number | null;
  median_revenue_growth?: string | number | null;
  median_ebitda_margin?: string | number | null;
  median_rule_of_40?: string | number | null;
  median_ebit?: string | number | null;
  median_num_clients?: string | number | null;
  median_revenue_per_client?: string | number | null;
  median_num_employees?: string | number | null;
  median_revenue_per_employee?: string | number | null;

  // Subscription Metrics - Median
  median_arr_percent?: string | number | null;
  median_arr_m?: string | number | null;
  median_churn_pc?: string | number | null;
  median_grr?: string | number | null;
  median_upsell_pc?: string | number | null;
  median_cross_sell_pc?: string | number | null;
  median_price_increase_pc?: string | number | null;
  median_rev_expansion_pc?: string | number | null;
  median_nrr?: string | number | null;
  median_new_client_growth_pc?: string | number | null;
};

class DashboardApiService {
  private baseUrl: string;
  private sectorsCache: {
    data: Record<string, unknown>;
    timestamp: number;
  } | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.baseUrl = "https://xdil-abvj-o7rq.e2.xano.io/api:5YnK3rYr:develop";
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

  // Financial metrics by revenue band (mean + median). Returns a raw array from Xano.
  async getFinancialMetrics(filters?: {
    Countries?: string[];
    Provinces?: string[];
    Cities?: string[];
    Primary_sectors_ids?: number[];
    Secondary_sectors_ids?: number[];
  }): Promise<FinancialMetricsRow[]> {
    const headers = {
      "Content-Type": "application/json",
      ...authService.getAuthHeaders(),
    };

    // Build query parameters for GET request
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.Countries && filters.Countries.length > 0) {
        filters.Countries.forEach((country) => {
          params.append("Countries[]", country);
        });
      }
      if (filters.Provinces && filters.Provinces.length > 0) {
        filters.Provinces.forEach((province) => {
          params.append("Provinces[]", province);
        });
      }
      if (filters.Cities && filters.Cities.length > 0) {
        filters.Cities.forEach((city) => {
          params.append("Cities[]", city);
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
      ? `${this.baseUrl}/mean?${queryString}`
      : `${this.baseUrl}/mean`;

    const response = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
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
    const sectorsBaseUrl = "https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV:develop";
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
    const sectorsBaseUrl = "https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV:develop";
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
    const sectorsBaseUrl = "https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV:develop";
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
