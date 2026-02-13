import { IndividualsResponse, IndividualsFilters } from "../types/individuals";

const BASE_URL = "https://xdil-abvj-o7rq.e2.xano.io/api:Xpykjv0R:develop";

class IndividualsService {
  private getAuthHeaders() {
    const token = localStorage.getItem("asymmetrix_auth_token");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * API Call: Get All Individuals
   * Endpoint: https://xdil-abvj-o7rq.e2.xano.io/api:Xpykjv0R/get_all_individuals
   * Method: GET
   * Auth: Required
   */
  async getAllIndividuals(
    filters: IndividualsFilters
  ): Promise<IndividualsResponse> {
    const queryParams = new URLSearchParams();

    // Add filter parameters to query string
    if (filters.search_query)
      queryParams.append("search_query", filters.search_query);
    if (filters.Offset) queryParams.append("Offset", filters.Offset.toString());
    if (filters.Per_page)
      queryParams.append("Per_page", filters.Per_page.toString());

    // Add arrays as comma-separated values
    if (filters.primary_sectors_ids.length > 0) {
      queryParams.append(
        "primary_sectors_ids",
        filters.primary_sectors_ids.join(",")
      );
    }
    if (filters.Secondary_sectors_ids.length > 0) {
      queryParams.append(
        "Secondary_sectors_ids",
        filters.Secondary_sectors_ids.join(",")
      );
    }
    if (filters.Countries.length > 0) {
      queryParams.append("Countries", filters.Countries.join(","));
    }
    if (filters.Provinces.length > 0) {
      queryParams.append("Provinces", filters.Provinces.join(","));
    }
    if (filters.Cities.length > 0) {
      queryParams.append("Cities", filters.Cities.join(","));
    }
    if (filters.job_titles_ids.length > 0) {
      queryParams.append("job_titles_ids", filters.job_titles_ids.join(","));
    }
    if (filters.statuses.length > 0) {
      queryParams.append("statuses", filters.statuses.join(","));
    }

    const url = `${BASE_URL}/get_all_individuals?${queryParams.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...this.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch individuals: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return data;
  }

  /**
   * Helper method to get default filters
   */
  getDefaultFilters(
    page: number = 1,
    perPage: number = 50
  ): IndividualsFilters {
    return {
      primary_sectors_ids: [],
      Secondary_sectors_ids: [],
      Countries: [],
      Provinces: [],
      Cities: [],
      job_titles_ids: [],
      statuses: [],
      search_query: "",
      Offset: page,
      Per_page: perPage,
    };
  }

  /**
   * Search individuals with query
   */
  async searchIndividuals(
    query: string,
    page: number = 1,
    perPage: number = 50
  ): Promise<IndividualsResponse> {
    const filters = this.getDefaultFilters(page, perPage);
    filters.search_query = query;

    return this.getAllIndividuals(filters);
  }

  /**
   * Filter individuals with specific criteria
   */
  async filterIndividuals(
    filters: Partial<IndividualsFilters>,
    page: number = 1,
    perPage: number = 50
  ): Promise<IndividualsResponse> {
    const defaultFilters = this.getDefaultFilters(page, perPage);
    const combinedFilters = { ...defaultFilters, ...filters };

    return this.getAllIndividuals(combinedFilters);
  }
}

export const individualsService = new IndividualsService();
export default IndividualsService;
