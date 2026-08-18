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
  return "https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au";
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

/** Latest LinkedIn headcount snapshot for a calendar/fiscal year. */
export function resolveLinkedInEmployeeCountForYear(
  year: number,
  employeeHistory: EmployeeTimeSeriesPoint[]
): number | null {
  if (!Number.isFinite(year) || employeeHistory.length === 0) return null;

  const pointsInYear = employeeHistory.filter((point) => {
    const pointYear = new Date(point.date).getFullYear();
    return pointYear === year;
  });
  if (pointsInYear.length === 0) return null;

  pointsInYear.sort((a, b) => a.date.localeCompare(b.date));
  const count = pointsInYear[pointsInYear.length - 1]?.employees_count;
  return typeof count === "number" && count > 0 ? count : null;
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
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(
    `/api/company-linkedin/${encodeURIComponent(String(newCompanyId))}`,
    {
      method: "GET",
      headers,
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
