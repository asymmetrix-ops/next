import { fetchCompaniesCountsServer } from "@/app/companies/actions";
import { getServiceAuthToken } from "@/lib/landingCountsAuth";
import { readPlatformCurrencyIdServer } from "@/lib/platformCurrencyServer";
import {
  DEFAULT_COMPANIES_COUNTS_FILTERS,
  fetchCompanyUniverseCountsFromApi,
  mapCompaniesCountsResponse,
  type CompanyUniverseCounts,
} from "@/lib/landingCompanyUniverseCounts";

export async function fetchLandingCompanyUniverseCounts(): Promise<CompanyUniverseCounts | null> {
  const preferredCurrencyId = await readPlatformCurrencyIdServer();

  const counts = await fetchCompaniesCountsServer(DEFAULT_COMPANIES_COUNTS_FILTERS);
  if (counts) return mapCompaniesCountsResponse(counts);

  const serviceToken = await getServiceAuthToken();
  if (!serviceToken) return null;

  return fetchCompanyUniverseCountsFromApi(serviceToken, preferredCurrencyId);
}

export type { CompanyUniverseCounts };
