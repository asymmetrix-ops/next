export interface CompanyLinkedInProfile {
  logo?: string;
  snapshot_id?: number;
  linkedin_url?: string;
  employee_count?: number;
  employee_count_date?: string;
}

export interface CompanyLinkedInHistoryPoint {
  month: string;
  employee_count: number;
}

export interface CompanyLinkedInResponse {
  profile?: CompanyLinkedInProfile;
  employee_history?: CompanyLinkedInHistoryPoint[];
  growth_1y_pct?: number | null;
}

export interface EmployeeTimeSeriesPoint {
  date: string;
  employees_count: number;
}

export function getCompanyLinkedInApiBase(): string {
  return process.env.NEXT_PUBLIC_ENVIRONMENT === "develop"
    ? "https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au:develop"
    : "https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au";
}

export function mapLinkedInHistoryToTimeSeries(
  history: CompanyLinkedInHistoryPoint[] | undefined
): EmployeeTimeSeriesPoint[] {
  if (!Array.isArray(history) || history.length === 0) return [];
  return [...history]
    .map((item) => ({
      date: item.month || "",
      employees_count: item.employee_count ?? 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Headline count: prefer LinkedIn profile snapshot over last history point. */
export function resolveLinkedInDisplayEmployeeCount(
  linkedIn: CompanyLinkedInResponse | null | undefined,
  fallbackFromSeries = 0
): number {
  const fromProfile = linkedIn?.profile?.employee_count;
  if (typeof fromProfile === "number" && fromProfile > 0) return fromProfile;
  return fallbackFromSeries;
}

export function formatLinkedInEmployeeCountDate(
  dateStr: string | undefined
): string | undefined {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export async function fetchCompanyLinkedIn(
  newCompanyId: string | number,
  token?: string | null
): Promise<CompanyLinkedInResponse> {
  const response = await fetch(
    `${getCompanyLinkedInApiBase()}/get_company_linkedin/${newCompanyId}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error(
      `get_company_linkedin failed: ${response.status} ${response.statusText}`
    );
  }

  return (await response.json()) as CompanyLinkedInResponse;
}
