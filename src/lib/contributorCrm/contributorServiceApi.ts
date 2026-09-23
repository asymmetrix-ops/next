import {
  contributorFetch,
  contributorFetchJson,
} from "@/lib/contributorCrm/contributorFetch";
import type {
  ContributorCompanyMetricsItem,
  ContributorYearItem,
  SectorOption,
} from "@/lib/contributorCrm/api";

const CONTRIBUTOR_METRICS_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:bSPJOS6A";
const LOOKUP_BASE = "https://xdil-abvj-o7rq.e2.xano.io/api:8KyIulob";
const NEW_COMPANY_API_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au";

/** Contributor-page loaders that always use server-side cron auth. */
export async function fetchContributorPrimarySectors(): Promise<SectorOption[]> {
  return contributorFetchJson(`${LOOKUP_BASE}/all__primary_sector`, {
    headers: { Accept: "application/json" },
  });
}

export async function fetchContributorSecondarySectors(): Promise<SectorOption[]> {
  return contributorFetchJson(`${LOOKUP_BASE}/fetch_all_secondary_sectors`, {
    headers: { Accept: "application/json" },
  });
}

export async function fetchContributorOwnershipTypes(): Promise<
  { id: number; ownership: string }[]
> {
  return contributorFetchJson(`${LOOKUP_BASE}/Get_Ownership_Types`, {
    headers: { Accept: "application/json" },
  });
}

export async function fetchContributorYears(): Promise<ContributorYearItem[]> {
  const data = await contributorFetchJson<ContributorYearItem[]>(
    `${CONTRIBUTOR_METRICS_BASE}/years`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  );
  return Array.isArray(data) ? data : [];
}

export async function fetchContributorMetricsByCompany(
  newCompanyId: number,
  yearsId: number,
  newRecord: boolean = false
): Promise<ContributorCompanyMetricsItem | null> {
  const params = new URLSearchParams({
    new_company_id: String(newCompanyId),
    years_id: String(yearsId),
    new_record: String(newRecord),
  });

  const data = await contributorFetchJson<unknown>(
    `${CONTRIBUTOR_METRICS_BASE}/metrics/by_company?${params.toString()}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  );

  if (Array.isArray(data)) {
    return (data[0] as ContributorCompanyMetricsItem | undefined) ?? null;
  }
  return data && typeof data === "object"
    ? (data as ContributorCompanyMetricsItem)
    : null;
}

export async function fetchContributorTransactionStatusLabel(
  newCompanyId: number
): Promise<string> {
  const res = await contributorFetch(
    `${NEW_COMPANY_API_BASE}/get_company_transaction_status`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ new_company_id: newCompanyId }),
    }
  );
  if (!res.ok) return "";
  const data = (await res.json()) as {
    transaction_status_badge?: { label?: string } | null;
  };
  const label = data?.transaction_status_badge?.label;
  return typeof label === "string" ? label.trim() : "";
}
