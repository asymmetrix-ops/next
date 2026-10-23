export type PeriodKey = "today" | "7d" | "30d" | "90d";

export type PeriodSummary = {
  period: PeriodKey;
  from_date: string;
  to_date: string;
  scheduled: number;
  sent: number;
  send_rate: number;
  remaining: number;
  opened: number;
  open_rate: number;
  total_clicks: number;
  failed: number;
  skipped: number;
};

export type DailyAnalyticsResponse = {
  date: string;
  timezone: string;
  is_weekend?: boolean;
  periods: Record<PeriodKey, PeriodSummary>;
};

export type UserRow = {
  user_id: number | null;
  email: string;
  sent_today: number;
  opened_today: number;
  open_rate_today: number;
  clicks_today: number;
  sent_7d: number;
  opened_7d: number;
  open_rate_7d: number;
  clicks_7d: number;
  sent_30d: number;
  opened_30d: number;
  open_rate_30d: number;
  clicks_30d: number;
  sent_90d: number;
  opened_90d: number;
  open_rate_90d: number;
  clicks_90d: number;
};

export type UserAnalyticsResponse = {
  date: string;
  timezone: string;
  sort_by: string;
  sort_order: "asc" | "desc";
  sortable_columns: string[];
  period_ranges: Record<PeriodKey, { from_date: string; to_date: string }>;
  users: UserRow[];
};

export type AnalyticsCompany = {
  company_id: number;
  email_count: number;
  last_sent_at: number | null;
};

export type AnalyticsCompaniesResponse = {
  companies: AnalyticsCompany[];
};
