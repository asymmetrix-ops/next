import { authService } from "./auth";

interface ApiResponse<T> {
  data: T;
  error?: string;
  total?: number;
}

interface CollectionParams {
  limit?: number;
  offset?: number;
  filter?: Record<string, unknown>;
  sort?: Record<string, unknown>;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl =
      process.env.NEXT_PUBLIC_XANO_API_URL ||
      "https://xdil-abvj-o7rq.e2.xano.io/5YnK3rYr";
    console.log("API Service Base URL:", this.baseUrl); // Debug log
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

  // Fetch collection data
  async fetchCollection<T>(
    collectionName: string,
    params: CollectionParams = {}
  ): Promise<ApiResponse<T[]>> {
    const queryParams = new URLSearchParams();

    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.offset) queryParams.append("offset", params.offset.toString());
    if (params.filter)
      queryParams.append("filter", JSON.stringify(params.filter));
    if (params.sort) queryParams.append("sort", JSON.stringify(params.sort));

    const endpoint = `/collection/${collectionName}${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;

    return this.request<T[]>(endpoint);
  }

  // Get single item from collection
  async getItem<T>(
    collectionName: string,
    id: string
  ): Promise<ApiResponse<T>> {
    return this.request<T>(`/collection/${collectionName}/${id}`);
  }

  // Create new item in collection
  async createItem<T>(
    collectionName: string,
    data: Record<string, unknown>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(`/collection/${collectionName}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Update item in collection
  async updateItem<T>(
    collectionName: string,
    id: string,
    data: Record<string, unknown>
  ): Promise<ApiResponse<T>> {
    return this.request<T>(`/collection/${collectionName}/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // Delete item from collection
  async deleteItem(
    collectionName: string,
    id: string
  ): Promise<ApiResponse<void>> {
    return this.request<void>(`/collection/${collectionName}/${id}`, {
      method: "DELETE",
    });
  }

  // Custom API call
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

export const apiService = new ApiService();
export type { ApiResponse, CollectionParams };
