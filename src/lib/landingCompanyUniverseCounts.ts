import type { CompaniesCountsResponse } from "@/app/companies/actions";
import {
  companyCountsPayloadToSearchParams,
  normalizeCompanySearchPayload,
} from "@/lib/companiesFilterPayload";
import { DEFAULT_PLATFORM_CURRENCY_ID } from "@/lib/platformCurrency";

export type CompanyUniverseCounts = {
  all: number;
  public: number;
  peOwned: number;
  vcBacked: number;
  private: number;
  subsidiary: number;
  acquired: number;
  other: number;
};

export const DEFAULT_COMPANY_UNIVERSE_COUNTS: CompanyUniverseCounts = {
  all: 6550,
  public: 225,
  peOwned: 671,
  vcBacked: 1881,
  private: 1671,
  subsidiary: 385,
  acquired: 1313,
  other: 404,
};

const COMPANIES_COUNTS_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au:develop/companies_counts";

export const DEFAULT_COMPANIES_COUNTS_FILTERS = {
  filters_sql: null,
  has_financial_filters: false,
  has_year_filter: false,
  query: null,
  columns: [] as string[],
};

export function mapCompaniesCountsResponse(
  data: CompaniesCountsResponse
): CompanyUniverseCounts {
  return {
    all: data.totalCount || 0,
    public: data.publicCompanies || 0,
    peOwned: data.peOwnedCompanies || 0,
    vcBacked: data.vcOwnedCompanies || 0,
    private: data.privateCompanies || 0,
    subsidiary: data.subsidiaryCompanies || 0,
    acquired: data.acquiredCompanies || 0,
    other: data.otherCompanies || 0,
  };
}

function buildCompaniesCountsUrl(
  preferredCurrencyId: number = DEFAULT_PLATFORM_CURRENCY_ID
): string {
  const payload = normalizeCompanySearchPayload({
    ...DEFAULT_COMPANIES_COUNTS_FILTERS,
    preferred_currency_id: preferredCurrencyId,
  });
  const params = companyCountsPayloadToSearchParams(payload);
  return `${COMPANIES_COUNTS_URL}?${params.toString()}`;
}

export async function fetchCompanyUniverseCountsFromApi(
  token: string,
  preferredCurrencyId: number = DEFAULT_PLATFORM_CURRENCY_ID
): Promise<CompanyUniverseCounts | null> {
  try {
    const url = buildCompaniesCountsUrl(preferredCurrencyId);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(
        `HTTP error fetching landing company universe counts: ${response.status}`,
        await response.text().catch(() => "")
      );
      return null;
    }

    const data = (await response.json()) as CompaniesCountsResponse;
    return mapCompaniesCountsResponse(data);
  } catch (error) {
    console.error("Error fetching landing company universe counts:", error);
    return null;
  }
}

export function isDefaultCompanyUniverseCounts(
  counts: CompanyUniverseCounts
): boolean {
  return (
    counts.all === DEFAULT_COMPANY_UNIVERSE_COUNTS.all &&
    counts.public === DEFAULT_COMPANY_UNIVERSE_COUNTS.public &&
    counts.peOwned === DEFAULT_COMPANY_UNIVERSE_COUNTS.peOwned &&
    counts.vcBacked === DEFAULT_COMPANY_UNIVERSE_COUNTS.vcBacked
  );
}
