import { authService } from "./auth";

const BASE_URL = "https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob/";

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

interface JobTitle {
  id: number;
  job_title: string;
}

interface InvestorType {
  id: number;
  sector_name?: string;
  name?: string;
  investor_type?: string;
}

class LocationsService {
  private contentTypesForArticlesCache: string[] | null = null;
  private contentTypesForArticlesInFlight: Promise<string[]> | null = null;

  private async fetchFirstOk<T>(
    paths: string[],
    errorPrefix: string
  ): Promise<T> {
    let lastError: unknown = null;
    for (const path of paths) {
      const url = `${BASE_URL}/${path}`;
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: { ...this.getAuthHeaders() },
        });

        if (!response.ok) {
          if (response.status === 401) {
            authService.logout();
            throw new Error("Authentication required");
          }
          // Allow trying alternate endpoints if this one doesn't exist.
          if (response.status === 404) {
            lastError = new Error(`${errorPrefix}: ${response.status} ${response.statusText}`);
            continue;
          }
          const text = await response.text().catch(() => "");
          throw new Error(
            `${errorPrefix}: ${response.status} ${response.statusText}${text ? ` — ${text}` : ""}`
          );
        }

        return (await response.json()) as T;
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error(`${errorPrefix}: failed`);
  }

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

  async getPrimarySectorsBySecondarySector(
    secondarySectorId: number
  ): Promise<PrimarySector[]> {
    const url = `${BASE_URL}/Get_Primary_Sectors`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify({
        sectors_id: secondarySectorId,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        authService.logout();
        throw new Error("Authentication required");
      }
      throw new Error(
        `Failed to fetch primary sectors by secondary sector: ${response.status} ${response.statusText}`
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

  // Get all secondary sectors (no primary filtering)
  async getAllSecondarySectors(): Promise<SecondarySector[]> {
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
        `Failed to fetch secondary sectors: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  // Back-compat alias used by corporate-events page
  async getPrimarySectorsForSecondarySectorId(
    secondarySectorId: number
  ): Promise<PrimarySector[]> {
    return this.getPrimarySectorsBySecondarySector(secondarySectorId);
  }

  // Funding stage labels (e.g. "Seed", "Series A") used by Corporate Events filters.
  async getFundingStages(): Promise<string[]> {
    const data = await this.fetchFirstOk<unknown>(
      [
        "funding_stage_options",
        "Funding_stage_options",
        "get_funding_stage_options",
        "Get_Funding_Stages",
      ],
      "Failed to fetch funding stages"
    );

    const items = Array.isArray(data) ? data : [];
    const values = items
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;
          const v =
            obj.funding_stage ??
            obj.Funding_stage ??
            obj.Funding_Stage ??
            obj.stage ??
            obj.label ??
            null;
          return String(v ?? "").trim();
        }
        return "";
      })
      .filter((v) => v.length > 0);

    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
  }

  // Investor type options used by Investors page filters.
  async getInvestorTypes(): Promise<InvestorType[]> {
    return this.fetchFirstOk<InvestorType[]>(
      ["Get_investor_types_for_filter", "Get_Investor_Types", "get_investor_types", "investor_type_options"],
      "Failed to fetch investor types"
    );
  }

  // Job title options used by Individuals page filters.
  async getJobTitles(): Promise<JobTitle[]> {
    return this.fetchFirstOk<JobTitle[]>(
      ["Get_Job_Titles", "get_job_titles", "job_titles_options", "job_titles_filter"],
      "Failed to fetch job titles"
    );
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

  /**
   * Returns distinct content type strings used by Insights & Analysis / analytics views.
   * This endpoint isn't part of the main locations API group, so we fetch it separately.
   */
  async getContentTypesForArticles(): Promise<string[]> {
    if (this.contentTypesForArticlesCache) return this.contentTypesForArticlesCache;
    if (this.contentTypesForArticlesInFlight) return this.contentTypesForArticlesInFlight;

    const run = async () => {
      // We derive the list from the analytics "content_insights" view that aggregates by content type.
      const url = new URL(
        "https://xdil-abvj-o7rq.e2.xano.io/api:T3Zh6ok0/content_insights"
      );
      url.searchParams.set("view", "Content Type");

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: { ...this.getAuthHeaders() },
      });

      if (!response.ok) {
        if (response.status === 401) {
          authService.logout();
          throw new Error("Authentication required");
        }
        throw new Error(
          `Failed to fetch content types: ${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as unknown;
      const rows = Array.isArray(data) ? (data as Array<Record<string, unknown>>) : [];

      const values = rows
        .map((row) => {
          const v =
            row.content_type ??
            row.Content_Type ??
            row.contentType ??
            row.ContentType ??
            null;
          return String(v ?? "").trim();
        })
        .filter((v) => v.length > 0);

      const uniqSorted = Array.from(new Set(values)).sort((a, b) =>
        a.localeCompare(b)
      );
      this.contentTypesForArticlesCache = uniqSorted;
      return uniqSorted;
    };

    this.contentTypesForArticlesInFlight = run().finally(() => {
      this.contentTypesForArticlesInFlight = null;
    });
    return this.contentTypesForArticlesInFlight;
  }
}

export const locationsService = new LocationsService();
