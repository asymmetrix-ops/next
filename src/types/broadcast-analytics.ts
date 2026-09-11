export type BroadcastDashboardPeriod = "today" | "7d" | "30d" | "90d";

export type BroadcastDashboardTab = "sent" | "opened" | "clicked";

export type BroadcastDashboardSummary = {
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  open_rate: number;
  click_rate: number;
  from_date: string;
  to_date: string;
  period: BroadcastDashboardPeriod;
  search: string;
};

export type BroadcastDashboardSendRow = {
  id: number;
  email: string;
  campaign_key: string;
  subject: string;
  status: string;
  sent_at: string;
  postmark_message_id: string;
};

export type BroadcastDashboardListResponse = {
  tab: BroadcastDashboardTab;
  total: number;
  limit: number;
  offset: number;
  search: string;
  items: BroadcastDashboardSendRow[];
};
