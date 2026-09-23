import type {
  AnalyticsCompaniesResponse,
  DailyAnalyticsResponse,
  UserAnalyticsResponse,
} from "@/types/email-analytics";

function companyIdParam(companyId?: number): string {
  return companyId != null && companyId > 0 ? String(companyId) : "";
}

const BASE =
  process.env.EMAIL_SERVICE_BASE_URL?.trim() ||
  process.env.EMAIL_SERVICE_URL?.trim() ||
  "https://asymmetrix-email-service.fly.dev";

const API_KEY =
  process.env.ALERTS_API_KEY?.trim() ||
  process.env.EMAIL_SERVICE_API_KEY?.trim() ||
  "";

async function emailServiceGet<T>(
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(path, BASE.endsWith("/") ? BASE : `${BASE}/`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v) url.searchParams.set(k, v);
    });
  }

  if (!API_KEY) {
    throw new Error("ALERTS_API_KEY is not configured");
  }

  const res = await fetch(url.toString(), {
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": API_KEY,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Email service ${res.status}: ${await res.text()}`);
  }

  return res.json() as Promise<T>;
}

export function getAnalyticsCompanies() {
  return emailServiceGet<AnalyticsCompaniesResponse>("/analytics/companies");
}

export function getDailyAnalytics(opts?: {
  date?: string;
  timezone?: string;
  period?: string;
  item_type?: string;
  company_id?: number;
}) {
  return emailServiceGet<DailyAnalyticsResponse>("/analytics/daily", {
    date: opts?.date ?? "",
    timezone: opts?.timezone ?? "Europe/London",
    period: opts?.period ?? "",
    item_type: opts?.item_type ?? "",
    company_id: companyIdParam(opts?.company_id),
  });
}

export function getUserAnalytics(opts: {
  date?: string;
  timezone?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  item_type?: string;
  user_id?: string;
  company_id?: number;
}) {
  return emailServiceGet<UserAnalyticsResponse>("/analytics/users", {
    date: opts?.date ?? "",
    timezone: opts?.timezone ?? "Europe/London",
    sort_by: opts?.sort_by ?? "sent_7d",
    sort_order: opts?.sort_order ?? "desc",
    item_type: opts?.item_type ?? "",
    user_id: opts?.user_id ?? "",
    company_id: companyIdParam(opts?.company_id),
  });
}
