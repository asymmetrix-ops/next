/** Entity filter arrays by type; each key is an array of entity IDs. */
export interface EmailAlertFilters {
  companies?: number[];
  sectors?: number[];
  individuals?: number[];
  investors?: number[];
  advisors?: number[];
  /** CE email alert: selected deal types; absent or empty = no filter. */
  deal_types?: string[];
  /** CE email alert: selected funding stages; absent or empty = no filter. */
  funding_stages?: string[];
}

/** Filters shape sent to / received from the Xano user_email_alerts API. */
export interface EmailAlertFiltersWire {
  companies: number[];
  sectors: number[];
  individuals: number[];
  investors: number[];
  advisors: number[];
  /** Empty array = no filter (all included). */
  deal_types: string[];
  /** Empty array = no filter (all included). */
  funding_stages: string[];
}

export type EmailAlertContentType = "preview" | "full_body" | "digest";

export interface EmailAlert {
  id: number;
  created_at: number;
  user_id: number;
  item_type: "corporate_events" | "insights_analysis" | "digest" | "deal_radar";
  email_frequency: "as_added" | "daily" | "weekly";
  day_of_week: string | null;
  timezone: string;
  content_type: EmailAlertContentType;
  is_active: boolean;
  send_time_local: string | null;
  next_run_at_utc?: string | number | null;
  last_sent_at_utc?: string | number | null;
  status?: string;
  /** Filter alert to these followed entities; empty or absent = all. */
  filters?: EmailAlertFilters;
}

export interface EnumOption {
  value: string;
  label: string;
}

export interface EmailAlertsMeta {
  enums: {
    item_type: EnumOption[];
    email_frequency: EnumOption[];
    day_of_week: EnumOption[];
    content_type: EnumOption[];
  };
  defaults: {
    timezone: string;
    daily_send_time_local: string;
  };
}

export interface EmailAlertsResponse {
  alerts: EmailAlert[];
  meta: EmailAlertsMeta;
}

