"use server";

import { IndividualsResponse } from "@/types/individuals";
import { cookies } from "next/headers";

export interface IndividualsFilters {
  Countries?: string[];
  Provinces?: string[];
  Cities?: string[];
  Continental_Region?: string[];
  geographical_sub_region?: string[];
  Primary_Sectors?: number[];
  Secondary_Sectors?: number[];
  Job_Titles?: number[];
  Statuses?: string[];
  Search_Query?: string;
  page?: number;
  per_page?: number;
}

export async function fetchIndividualsServer(
  filters: IndividualsFilters = {}
): Promise<IndividualsResponse | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("asymmetrix_auth_token")?.value;

    if (!token) {
      return null;
    }

    // Build URL parameters
    const params = new URLSearchParams();

    // Add page and per_page
    params.append("Offset", (filters.page || 1).toString());
    params.append("Per_page", (filters.per_page || 50).toString());

    // Add search query
    if (filters.Search_Query) {
      params.append("search_query", filters.Search_Query);
    }

    // Add location filters
    if (filters.Countries && filters.Countries.length > 0) {
      params.append("Countries", filters.Countries.join(","));
    }

    if (filters.Provinces && filters.Provinces.length > 0) {
      params.append("Provinces", filters.Provinces.join(","));
    }

    if (filters.Cities && filters.Cities.length > 0) {
      params.append("Cities", filters.Cities.join(","));
    }

    // Add region filters
    if (filters.Continental_Region && filters.Continental_Region.length > 0) {
      params.append("Continental_Region", filters.Continental_Region.join(","));
    }

    if (
      filters.geographical_sub_region &&
      filters.geographical_sub_region.length > 0
    ) {
      params.append(
        "geographical_sub_region",
        filters.geographical_sub_region.join(",")
      );
    }

    // Add sector filters
    if (filters.Primary_Sectors && filters.Primary_Sectors.length > 0) {
      params.append("primary_sectors_ids", filters.Primary_Sectors.join(","));
    }

    if (filters.Secondary_Sectors && filters.Secondary_Sectors.length > 0) {
      params.append(
        "Secondary_sectors_ids",
        filters.Secondary_Sectors.join(",")
      );
    }

    // Add job titles
    if (filters.Job_Titles && filters.Job_Titles.length > 0) {
      params.append("job_titles_ids", filters.Job_Titles.join(","));
    }

    // Add statuses
    if (filters.Statuses && filters.Statuses.length > 0) {
      params.append("statuses", filters.Statuses.join(","));
    }

    const url = `https://xdil-abvj-o7rq.e2.xano.io/api:Xpykjv0R/get_all_individuals?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      return null;
    }

    const data: IndividualsResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching individuals:", error);
    return null;
  }
}
