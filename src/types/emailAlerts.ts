export interface EmailAlert {
  id: number;
  created_at: number;
  user_id: number;
  item_type: "corporate_events" | "insights_analysis";
  email_frequency: "as_added" | "daily" | "weekly";
  day_of_week: string;
  timezone: string;
  content_type: string;
  is_active: boolean;
  send_time_local: string | null;
  next_run_at_utc?: string | number | null;
  last_sent_at_utc?: string | number | null;
  status?: string;
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

