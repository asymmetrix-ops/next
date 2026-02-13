import { serverAuthService } from "./server-auth";

const BASE_URL = "https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob:develop";

export interface Country {
  locations_Country: string;
}

export interface PrimarySector {
  id: number;
  sector_name: string;
}

export interface SecondarySector {
  id: number;
  sector_name: string;
}

export class ServerLocationsService {
  async getCountries(): Promise<Country[]> {
    const url = `${BASE_URL}/locations_get_countries`;
    const headers = {
      "Content-Type": "application/json",
      ...serverAuthService.getAuthHeaders(),
    };

    const response = await fetch(url, {
      method: "GET",
      headers,
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch countries: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  async getPrimarySectors(): Promise<PrimarySector[]> {
    const url = `${BASE_URL}/Get_Primary_Sectors`;
    const headers = {
      "Content-Type": "application/json",
      ...serverAuthService.getAuthHeaders(),
    };

    const response = await fetch(url, {
      method: "GET",
      headers,
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch primary sectors: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  async getSecondarySectors(
    primarySectorIds: number[]
  ): Promise<SecondarySector[]> {
    if (primarySectorIds.length === 0) {
      return [];
    }

    const queryParams = new URLSearchParams();
    primarySectorIds.forEach((id) => {
      queryParams.append("related_primary_sectors_id[]", id.toString());
    });

    const url = `${BASE_URL}/Get_Secondary_Sectors?${queryParams.toString()}`;
    const headers = {
      "Content-Type": "application/json",
      ...serverAuthService.getAuthHeaders(),
    };

    const response = await fetch(url, {
      method: "GET",
      headers,
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch secondary sectors: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }
}

export const serverLocationsService = new ServerLocationsService();

