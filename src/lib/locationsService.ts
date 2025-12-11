import { authService } from "./auth";

const BASE_URL = "https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob";

// Local interfaces for commonly reused lookup types
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
  // Cache is kept per-auth-token so that switching accounts won't
  // accidentally reuse data fetched under a different user.
  private lastToken: string | null = null;

  // Simple in-memory caches for lookup lists that are reused across pages
  private countriesCache: Country[] | null = null;
  private primarySectorsCache: PrimarySector[] | null = null;
  private hybridBusinessFocusesCache: HybridBusinessFocus[] | null = null;
  private ownershipTypesCache: OwnershipType[] | null = null;
  private continentalRegionsCache: string[] | null = null;
  private subRegionsCache: string[] | null = null;
  private allSecondarySectorsWithPrimaryCache:
    | Array<SecondarySector & { related_primary_sector?: PrimarySector }>
    | null = null;
  private fundingStagesCache: string[] | null = null;
  private jobTitlesCache: JobTitle[] | null = null;
  private investorTypesCache: InvestorType[] | null = null;
  private contentTypesForArticlesCache: string[] | null = null;

  private resetCachesForTokenChange() {
    this.countriesCache = null;
    this.primarySectorsCache = null;
    this.hybridBusinessFocusesCache = null;
    this.ownershipTypesCache = null;
    this.continentalRegionsCache = null;
    this.subRegionsCache = null;
    this.allSecondarySectorsWithPrimaryCache = null;
    this.fundingStagesCache = null;
    this.jobTitlesCache = null;
    this.investorTypesCache = null;
    this.contentTypesForArticlesCache = null;
  }

  private getAuthHeaders() {
    const token = authService.getToken();
    if (!token) {
      throw new Error("Authentication token not found");
    }

    // If the token changed (e.g. user logged out/in), clear caches
    if (this.lastToken && this.lastToken !== token) {
      this.resetCachesForTokenChange();
    }
    this.lastToken = token;

    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  async getCountries(): Promise<Country[]> {
    if (this.countriesCache) {
      return this.countriesCache;
    }

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

    const data = (await response.json()) as Country[];
    this.countriesCache = data;
    return data;
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
    if (this.primarySectorsCache) {
      return this.primarySectorsCache;
    }

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

    const data = (await response.json()) as PrimarySector[];
    this.primarySectorsCache = data;
    return data;
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
    if (this.allSecondarySectorsWithPrimaryCache) {
      return this.allSecondarySectorsWithPrimaryCache;
    }

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

    const data = (await response.json()) as Array<
      SecondarySector & { related_primary_sector?: PrimarySector }
    >;
    this.allSecondarySectorsWithPrimaryCache = data;
    return data;
  }

  async getHybridBusinessFocuses(): Promise<HybridBusinessFocus[]> {
    if (this.hybridBusinessFocusesCache) {
      return this.hybridBusinessFocusesCache;
    }

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

    const data = (await response.json()) as HybridBusinessFocus[];
    this.hybridBusinessFocusesCache = data;
    return data;
  }

  async getOwnershipTypes(): Promise<OwnershipType[]> {
    if (this.ownershipTypesCache) {
      return this.ownershipTypesCache;
    }

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

    const data = (await response.json()) as OwnershipType[];
    this.ownershipTypesCache = data;
    return data;
  }

  // New: Fetch continental regions list (strings)
  async getContinentalRegions(): Promise<string[]> {
    if (this.continentalRegionsCache) {
      return this.continentalRegionsCache;
    }

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
    this.continentalRegionsCache = Array.from(new Set(list));
    return this.continentalRegionsCache;
  }

  // New: Fetch geographical sub-regions list (strings)
  async getSubRegions(): Promise<string[]> {
    if (this.subRegionsCache) {
      return this.subRegionsCache;
    }

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
    this.subRegionsCache = Array.from(new Set(list));
    return this.subRegionsCache;
  }

  // New: Fetch funding stages (used as filter across multiple pages)
  async getFundingStages(): Promise<string[]> {
    if (this.fundingStagesCache) {
      return this.fundingStagesCache;
    }

    const url = `${BASE_URL}/funding_stage_options`;

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
        `Failed to fetch funding stages: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as unknown;
    const list = Array.isArray(data)
      ? (data
          .map((v) => (typeof v === "string" ? v.trim() : ""))
          .filter((v) => v && v.length > 0) as string[])
      : [];

    this.fundingStagesCache = Array.from(new Set(list));
    return this.fundingStagesCache;
  }

  // New: Fetch all job titles (for individuals filters)
  async getJobTitles(): Promise<JobTitle[]> {
    if (this.jobTitlesCache) {
      return this.jobTitlesCache;
    }

    const url = `${BASE_URL}/get_all_job_titles`;

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
        `Failed to fetch job titles: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as JobTitle[];
    this.jobTitlesCache = data;
    return data;
  }

  // New: Fetch investor types used on investors filters page
  async getInvestorTypes(): Promise<InvestorType[]> {
    if (this.investorTypesCache) {
      return this.investorTypesCache;
    }

    const url = `${BASE_URL}/Get_investor_types_for_filter`;

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
        `Failed to fetch investor types: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as InvestorType[];
    this.investorTypesCache = data;
    return data;
  }

  // New: Fetch content types for articles (used in insights analysis filters)
  async getContentTypesForArticles(): Promise<string[]> {
    if (this.contentTypesForArticlesCache) {
      return this.contentTypesForArticlesCache;
    }

    const url = `${BASE_URL}/content_types_for_articles`;

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
        `Failed to fetch content types for articles: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as Array<{
      Content_Content_Type1?: string;
    }>;
    const values = Array.from(
      new Set(
        (Array.isArray(data) ? data : [])
          .map((d) => (d?.Content_Content_Type1 || "").trim())
          .filter((v) => v && v.length > 0)
      )
    );

    this.contentTypesForArticlesCache = values;
    return this.contentTypesForArticlesCache;
  }
}

export const locationsService = new LocationsService();
