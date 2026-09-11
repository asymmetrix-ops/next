import type { PeriodKey } from "@/types/email-analytics";

export type BroadcastPeriodSummary = {
  period: PeriodKey;
  from_date: string;
  to_date: string;
  sent: number;
  opened: number;
  open_rate: number;
  clicked: number;
  click_rate: number;
  failed: number;
  failed_rate: number;
};

export type BroadcastDailyResponse = {
  date: string;
  timezone: string;
  campaign_key?: string | null;
  periods: Record<PeriodKey, BroadcastPeriodSummary>;
};

export type BroadcastTopCampaign = {
  campaign_id: string;
  campaign_key: string;
  label: string;
  sent_7d: number;
  opened_7d: number;
  open_rate_7d: number;
  clicked_7d: number;
};

export type BroadcastOverviewResponse = {
  date: string;
  timezone: string;
  campaign_key?: string | null;
  periods: Partial<Record<PeriodKey, BroadcastPeriodSummary>>;
  top_campaigns: BroadcastTopCampaign[];
};

export type BroadcastCampaignRow = {
  campaign_id: string;
  campaign_key: string;
  label: string;
  sent_today: number;
  opened_today: number;
  open_rate_today: number;
  clicked_today: number;
  sent_7d: number;
  opened_7d: number;
  open_rate_7d: number;
  clicked_7d: number;
  sent_30d: number;
  opened_30d: number;
  open_rate_30d: number;
  clicked_30d: number;
  sent_90d: number;
  opened_90d: number;
  open_rate_90d: number;
  clicked_90d: number;
};

export type BroadcastRecipientRow = {
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

export type BroadcastSuppressionRow = {
  email: string;
  reason: string;
  source: string;
  suppressed_at: string;
  campaign_key?: string | null;
};
