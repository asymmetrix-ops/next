export type BroadcastDashboardPeriod = "today" | "7d" | "30d" | "90d";

export type BroadcastDashboardTab = "sent" | "opened" | "clicked";

export type BroadcastAudience = "clients" | "open";

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
  audience?: BroadcastAudience;
  campaign_key?: string;
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
  audience?: BroadcastAudience;
  campaign_key?: string;
  items: BroadcastDashboardSendRow[];
};

export const SUMMIT_LONDON_2026_BROADCAST_CAMPAIGNS = {
  clients: {
    campaignKey: "summit-london-2026-reg-clients",
    label: "Clients",
    description: "168 emails · tag summit-london-2026-reg-clients",
    audience: "clients" as const,
  },
  open: {
    campaignKey: "summit-london-2026-reg-open",
    label: "Open registration",
    description: "Non-clients · tag summit-london-2026-reg-open",
    audience: "open" as const,
  },
} as const;

export type SummitLondon2026BroadcastAudience =
  keyof typeof SUMMIT_LONDON_2026_BROADCAST_CAMPAIGNS;
