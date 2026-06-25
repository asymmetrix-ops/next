import { IndividualsResponse, IndividualsFilters } from "../types/individuals";
import { individualsFiltersToRequestBody } from "./individualsFilterPayload";
import type { IndividualsSearchFilters } from "./individualsFilterPayload";

const BASE_URL = "https://xdil-abvj-o7rq.e2.xano.io/api:Xpykjv0R";

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
   * Method: POST
   * Auth: Required
   */
  async getAllIndividuals(
    filters: IndividualsFilters
  ): Promise<IndividualsResponse> {
    const payload: IndividualsSearchFilters = {
      Search_Query: filters.search_query ?? "",
      page: filters.Offset ?? 1,
      per_page: filters.Per_page ?? 50,
      Countries: filters.Countries ?? [],
      Provinces: filters.Provinces ?? [],
      Cities: filters.Cities ?? [],
      Continental_Region: [],
      geographical_sub_region: [],
      Primary_Sectors: filters.primary_sectors_ids ?? [],
      Secondary_Sectors: filters.Secondary_sectors_ids ?? [],
      Job_Titles: filters.job_titles_ids ?? [],
      Statuses: filters.statuses ?? [],
      portfolio_only: false,
    };

    const response = await fetch(`${BASE_URL}/get_all_individuals`, {
      method: "POST",
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(individualsFiltersToRequestBody(payload)),
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
