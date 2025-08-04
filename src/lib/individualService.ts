import { IndividualResponse, IndividualEventsResponse, IndividualNameResponse } from "../types/individual";

const BASE_URL = "https://xdil-abvj-o7rq.e2.xano.io/api:Xpykjv0R";

class IndividualService {
  private getAuthHeaders() {
    const token = localStorage.getItem("asymmetrix_auth_token");
    return {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * API Call 1: Get Individual Profile and Roles
   * Endpoint: https://xdil-abvj-o7rq.e2.xano.io/api:Xpykjv0R/get_individual
   * Method: GET
   * Auth: Required
   * Request Body: { "individual_id": number }
   */
  async getIndividual(individualId: number): Promise<IndividualResponse> {
    const url = `${BASE_URL}/get_individual?individual_id=${individualId}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...this.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch individual: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * API Call 2: Get Individual Events
   * Endpoint: https://xdil-abvj-o7rq.e2.xano.io/api:Xpykjv0R/get_individuals_events
   * Method: GET
   * Auth: Required
   * Request Body: { "individual_id": number }
   */
  async getIndividualEvents(individualId: number): Promise<IndividualEventsResponse> {
    const url = `${BASE_URL}/get_individuals_events?individual_id=${individualId}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...this.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch individual events: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * API Call 3: Get Individual Name
   * Endpoint: https://xdil-abvj-o7rq.e2.xano.io/api:Xpykjv0R/get_individuals_name
   * Method: GET
   * Auth: Required
   * Request Body: { "individuals_id": number }
   */
  async getIndividualName(individualId: number): Promise<IndividualNameResponse> {
    const url = `${BASE_URL}/get_individuals_name?individuals_id=${individualId}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...this.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch individual name: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Combined method to fetch all individual data
   */
  async getIndividualCompleteProfile(individualId: number): Promise<{
    profile: IndividualResponse;
    events: IndividualEventsResponse;
    name: IndividualNameResponse;
  }> {
    try {
      const [profileResponse, eventsResponse, nameResponse] = await Promise.all([
        this.getIndividual(individualId),
        this.getIndividualEvents(individualId),
        this.getIndividualName(individualId),
      ]);

      return {
        profile: profileResponse,
        events: eventsResponse,
        name: nameResponse,
      };
    } catch (error) {
      console.error('Error fetching individual complete profile:', error);
      throw error;
    }
  }
}

export const individualService = new IndividualService();
export default IndividualService; 