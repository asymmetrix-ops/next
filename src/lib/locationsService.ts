import { authService } from "./auth";

const BASE_URL = "https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob";

interface Country {
  locations_Country: string;
}

interface Province {
  State__Province__County: string;
}

interface City {
  City: string;
}

interface PrimarySector {
  id: number;
  sector_name: string;
}

interface SecondarySector {
  id: number;
  sector_name: string;
}

interface HybridBusinessFocus {
  id: number;
  business_focus: string;
}

interface OwnershipType {
  id: number;
  ownership: string;
}

class LocationsService {
  private getAuthHeaders() {
    const token = authService.getToken();
    if (!token) {
      throw new Error("Authentication token not found");
    }
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  async getCountries(): Promise<Country[]> {
    const url = `${BASE_URL}/locations_get_countries`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...this.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        authService.logout();
        throw new Error("Authentication required");
      }
      throw new Error(
        `Failed to fetch countries: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  async getProvinces(countries: string[]): Promise<Province[]> {
    const queryParams = new URLSearchParams();
    countries.forEach((country) => {
      queryParams.append("countries[]", country);
    });

    const url = `${BASE_URL}/locations_get_province?${queryParams.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...this.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        authService.logout();
        throw new Error("Authentication required");
      }
      throw new Error(
        `Failed to fetch provinces: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  async getCities(countries: string[], provinces: string[]): Promise<City[]> {
    const queryParams = new URLSearchParams();
    countries.forEach((country) => {
      queryParams.append("countries[]", country);
    });
    provinces.forEach((province) => {
      queryParams.append("provinces[]", province);
    });

    const url = `${BASE_URL}/locations_get_city?${queryParams.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...this.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        authService.logout();
        throw new Error("Authentication required");
      }
      throw new Error(
        `Failed to fetch cities: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  async getPrimarySectors(): Promise<PrimarySector[]> {
    const url = `${BASE_URL}/Get_Primary_Sectors`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...this.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        authService.logout();
        throw new Error("Authentication required");
      }
      throw new Error(
        `Failed to fetch primary sectors: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  async getSecondarySectors(
    primarySectorIds: number[]
  ): Promise<SecondarySector[]> {
    const queryParams = new URLSearchParams();
    primarySectorIds.forEach((id) => {
      queryParams.append("related_primary_sectors_id[]", id.toString());
    });

    const url = `${BASE_URL}/Get_Secondary_Sectors?${queryParams.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...this.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        authService.logout();
        throw new Error("Authentication required");
      }
      throw new Error(
        `Failed to fetch secondary sectors: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  // Get all secondary sectors with their related primary sector information
  async getAllSecondarySectorsWithPrimary(): Promise<
    Array<SecondarySector & { related_primary_sector?: PrimarySector }>
  > {
    const url = `${BASE_URL}/Get_Secondary_Sectors`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...this.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        authService.logout();
        throw new Error("Authentication required");
      }
      throw new Error(
        `Failed to fetch all secondary sectors: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  async getHybridBusinessFocuses(): Promise<HybridBusinessFocus[]> {
    const url = `${BASE_URL}/get_hybrid_data_and_analytics_bussines_focuses`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...this.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        authService.logout();
        throw new Error("Authentication required");
      }
      throw new Error(
        `Failed to fetch hybrid business focuses: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  async getOwnershipTypes(): Promise<OwnershipType[]> {
    const url = `${BASE_URL}/Get_Ownership_Types`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...this.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        authService.logout();
        throw new Error("Authentication required");
      }
      throw new Error(
        `Failed to fetch ownership types: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  // New: Fetch continental regions list (strings)
  async getContinentalRegions(): Promise<string[]> {
    const url = `${BASE_URL}/continental_region_filter`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...this.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        authService.logout();
        throw new Error("Authentication required");
      }
      throw new Error(
        `Failed to fetch continental regions: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as Array<{
      Locations_Continental_Region1?: string;
    }>;
    const list = Array.isArray(data)
      ? data
          .map((item) => (item?.Locations_Continental_Region1 || "").trim())
          .filter((v) => v && v.length > 0)
      : [];
    // Deduplicate
    return Array.from(new Set(list));
  }

  // New: Fetch geographical sub-regions list (strings)
  async getSubRegions(): Promise<string[]> {
    const url = `${BASE_URL}/geographical_sub_region`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...this.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        authService.logout();
        throw new Error("Authentication required");
      }
      throw new Error(
        `Failed to fetch sub-regions: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as Array<{
      Locations_geographical_sub_region1?: string;
    }>;
    const list = Array.isArray(data)
      ? data
          .map((item) =>
            (item?.Locations_geographical_sub_region1 || "").trim()
          )
          .filter((v) => v && v.length > 0)
      : [];
    // Deduplicate
    return Array.from(new Set(list));
  }
}

export const locationsService = new LocationsService();
