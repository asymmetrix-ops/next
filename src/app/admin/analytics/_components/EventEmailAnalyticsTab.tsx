"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import type { PeriodKey } from "@/types/email-analytics";
import type {
  BroadcastCampaignRow,
  BroadcastDailyResponse,
  BroadcastOverviewResponse,
  BroadcastPeriodSummary,
  BroadcastRecipientRow,
  BroadcastSuppressionRow,
  BroadcastTopCampaign,
} from "@/types/broadcast-analytics";

const BROADCAST_BASE_URL = "/api/admin/email-analytics/broadcast";
const BROADCAST_DAILY_URL = `${BROADCAST_BASE_URL}/daily`;
const BROADCAST_CAMPAIGNS_URL = `${BROADCAST_BASE_URL}/campaigns`;
const BROADCAST_RECIPIENTS_URL = `${BROADCAST_BASE_URL}/recipients`;
const BROADCAST_CAMPAIGN_KEYS_URL = `${BROADCAST_BASE_URL}/campaign-keys`;
const BROADCAST_SUPPRESSIONS_URL = `${BROADCAST_BASE_URL}/suppressions`;

const DEFAULT_TIMEZONE = "Europe/London";
const LIST_PER_PAGE = 25;

type SortDirection = "asc" | "desc";
type DataView = "campaigns" | "recipients" | "suppressions";

const PERIOD_LABELS: Record<PeriodKey, string> = {
  today: "Today",
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
};

const PERIOD_KEYS: PeriodKey[] = ["today", "7d", "30d", "90d"];

const PERIOD_THEME: Record<
  PeriodKey,
  { groupHeader: string; metricHeader: string; groupStart: string }
> = {
  today: {
    groupHeader: "bg-slate-700 text-white border-slate-600",
    metricHeader: "bg-slate-100 text-slate-700 border-slate-200",
    groupStart: "border-l-2 border-slate-300",
  },
  "7d": {
    groupHeader: "bg-indigo-700 text-white border-indigo-600",
    metricHeader: "bg-indigo-50 text-indigo-800 border-indigo-200",
    groupStart: "border-l-2 border-indigo-300",
  },
  "30d": {
    groupHeader: "bg-violet-700 text-white border-violet-600",
    metricHeader: "bg-violet-50 text-violet-800 border-violet-200",
    groupStart: "border-l-2 border-violet-300",
  },
  "90d": {
    groupHeader: "bg-teal-700 text-white border-teal-600",
    metricHeader: "bg-teal-50 text-teal-800 border-teal-200",
    groupStart: "border-l-2 border-teal-300",
  },
};

type RecipientColumn = {
  key: keyof BroadcastRecipientRow;
  label: string;
  period?: PeriodKey;
  format?: "number" | "rate";
};

const RECIPIENT_TABLE_COLUMNS: RecipientColumn[] = [
  { key: "email", label: "Email" },
  { key: "sent_today", label: "Sent", period: "today", format: "number" },
  {
    key: "open_rate_today",
    label: "Open %",
    period: "today",
    format: "rate",
  },
  { key: "clicks_today", label: "Clicks", period: "today", format: "number" },
  { key: "sent_7d", label: "Sent", period: "7d", format: "number" },
  { key: "open_rate_7d", label: "Open %", period: "7d", format: "rate" },
  { key: "clicks_7d", label: "Clicks", period: "7d", format: "number" },
  { key: "sent_30d", label: "Sent", period: "30d", format: "number" },
  {
    key: "open_rate_30d",
    label: "Open %",
    period: "30d",
    format: "rate",
  },
  { key: "clicks_30d", label: "Clicks", period: "30d", format: "number" },
  { key: "sent_90d", label: "Sent", period: "90d", format: "number" },
  { key: "open_rate_90d", label: "Open %", period: "90d", format: "rate" },
  { key: "clicks_90d", label: "Clicks", period: "90d", format: "number" },
];

const DEFAULT_RECIPIENT_SORT_COLUMNS = RECIPIENT_TABLE_COLUMNS.map(
  (col) => col.key
).filter((key) => key !== "email");

type RecipientSortColumn = Exclude<keyof BroadcastRecipientRow, "email">;

function isRecipientSortColumn(key: string): key is RecipientSortColumn {
  return (DEFAULT_RECIPIENT_SORT_COLUMNS as readonly string[]).includes(key);
}

const CAMPAIGN_SORT_COLUMNS = [
  "campaign_key",
  "sent_today",
  "open_rate_today",
  "sent_7d",
  "open_rate_7d",
  "sent_30d",
  "open_rate_30d",
  "sent_90d",
  "open_rate_90d",
] as const;

type CampaignSortColumn = (typeof CAMPAIGN_SORT_COLUMNS)[number];

function isCampaignSortColumn(key: string): key is CampaignSortColumn {
  return (CAMPAIGN_SORT_COLUMNS as readonly string[]).includes(key);
}

type EventEmailAnalyticsTabProps = {
  auditDate: string;
  emailSearch: string;
};

function beNum(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function beFormatRate(value: number): string {
  if (!Number.isFinite(value)) return "0%";
  return `${value % 1 === 0 ? Math.round(value) : value.toFixed(1)}%`;
}

function authHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("asymmetrix_auth_token")
      : "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function broadcastQueryParams(
  date: string,
  campaignKey: string,
  sortBy?: string,
  sortOrder?: SortDirection
): URLSearchParams {
  const params = new URLSearchParams({
    date,
    timezone: DEFAULT_TIMEZONE,
  });
  if (campaignKey) params.set("campaign_key", campaignKey);
  if (sortBy) params.set("sort_by", sortBy);
  if (sortOrder) params.set("sort_order", sortOrder);
  return params;
}

function emptyBroadcastPeriod(period: PeriodKey): BroadcastPeriodSummary {
  return {
    period,
    from_date: "",
    to_date: "",
    sent: 0,
    opened: 0,
    open_rate: 0,
    clicked: 0,
    click_rate: 0,
    failed: 0,
    failed_rate: 0,
  };
}

function normalizeBroadcastPeriod(
  raw: unknown,
  period: PeriodKey
): BroadcastPeriodSummary {
  const row =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  if (!row) return emptyBroadcastPeriod(period);

  const sent = beNum(row.sent ?? row.delivered);
  const opened = beNum(row.opened);
  const clicked = beNum(row.clicked ?? row.clicks ?? row.total_clicks);
  const failed = beNum(row.failed ?? row.bounced);

  return {
    period: (row.period as PeriodKey) ?? period,
    from_date: String(row.from_date ?? ""),
    to_date: String(row.to_date ?? ""),
    sent,
    opened,
    open_rate: beNum(row.open_rate ?? row.open_rate_pct),
    clicked,
    click_rate: beNum(row.click_rate ?? row.click_rate_pct),
    failed,
    failed_rate: beNum(row.failed_rate ?? row.failed_rate_pct),
  };
}

function normalizeBroadcastDaily(raw: unknown): BroadcastDailyResponse | null {
  const row =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  if (!row) return null;

  const periodsRaw =
    row.periods && typeof row.periods === "object"
      ? (row.periods as Record<string, unknown>)
      : null;

  const periods = periodsRaw
    ? {
        today: normalizeBroadcastPeriod(periodsRaw.today, "today"),
        "7d": normalizeBroadcastPeriod(periodsRaw["7d"], "7d"),
        "30d": normalizeBroadcastPeriod(periodsRaw["30d"], "30d"),
        "90d": normalizeBroadcastPeriod(periodsRaw["90d"], "90d"),
      }
    : {
        today: normalizeBroadcastPeriod(row, "today"),
        "7d": emptyBroadcastPeriod("7d"),
        "30d": emptyBroadcastPeriod("30d"),
        "90d": emptyBroadcastPeriod("90d"),
      };

  return {
    date: String(row.date ?? ""),
    timezone: String(row.timezone ?? DEFAULT_TIMEZONE),
    campaign_key: row.campaign_key != null ? String(row.campaign_key) : null,
    periods,
  };
}

function normalizeTopCampaign(raw: unknown): BroadcastTopCampaign | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const campaignId = String(row.campaign_id ?? row.id ?? "").trim();
  const campaignKey = String(row.campaign_key ?? row.key ?? "").trim();
  if (!campaignId && !campaignKey) return null;

  const label = String(
    row.label ?? row.name ?? row.title ?? campaignKey ?? campaignId
  );

  return {
    campaign_id: campaignId || campaignKey,
    campaign_key: campaignKey || campaignId,
    label,
    sent_7d: beNum(row.sent_7d ?? row.sent),
    opened_7d: beNum(row.opened_7d ?? row.opened),
    open_rate_7d: beNum(row.open_rate_7d ?? row.open_rate),
    clicked_7d: beNum(row.clicked_7d ?? row.clicked ?? row.clicks),
  };
}

function normalizeOverview(raw: unknown): BroadcastOverviewResponse | null {
  const row =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  if (!row) return null;

  const periodsRaw =
    row.periods && typeof row.periods === "object"
      ? (row.periods as Record<string, unknown>)
      : null;

  const periods: Partial<Record<PeriodKey, BroadcastPeriodSummary>> = {};
  if (periodsRaw) {
    for (const key of PERIOD_KEYS) {
      if (periodsRaw[key]) {
        periods[key] = normalizeBroadcastPeriod(periodsRaw[key], key);
      }
    }
  }

  const topRaw =
    row.top_campaigns ??
    row.top_campaigns_7d ??
    row.campaigns_top ??
    row.campaigns ??
    [];

  const top_campaigns = (Array.isArray(topRaw) ? topRaw : [])
    .map(normalizeTopCampaign)
    .filter((item): item is BroadcastTopCampaign => item !== null);

  return {
    date: String(row.date ?? ""),
    timezone: String(row.timezone ?? DEFAULT_TIMEZONE),
    campaign_key: row.campaign_key != null ? String(row.campaign_key) : null,
    periods,
    top_campaigns,
  };
}

function normalizeCampaignRow(raw: unknown): BroadcastCampaignRow | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const campaignId = String(row.campaign_id ?? row.id ?? "").trim();
  const campaignKey = String(row.campaign_key ?? row.key ?? "").trim();
  if (!campaignId && !campaignKey) return null;

  const label = String(
    row.label ?? row.name ?? row.title ?? campaignKey ?? campaignId
  );

  return {
    campaign_id: campaignId || campaignKey,
    campaign_key: campaignKey || campaignId,
    label,
    sent_today: beNum(row.sent_today),
    opened_today: beNum(row.opened_today),
    open_rate_today: beNum(row.open_rate_today),
    clicked_today: beNum(row.clicked_today ?? row.clicks_today),
    sent_7d: beNum(row.sent_7d),
    opened_7d: beNum(row.opened_7d),
    open_rate_7d: beNum(row.open_rate_7d),
    clicked_7d: beNum(row.clicked_7d ?? row.clicks_7d),
    sent_30d: beNum(row.sent_30d),
    opened_30d: beNum(row.opened_30d),
    open_rate_30d: beNum(row.open_rate_30d),
    clicked_30d: beNum(row.clicked_30d ?? row.clicks_30d),
    sent_90d: beNum(row.sent_90d),
    opened_90d: beNum(row.opened_90d),
    open_rate_90d: beNum(row.open_rate_90d),
    clicked_90d: beNum(row.clicked_90d ?? row.clicks_90d),
  };
}

function normalizeRecipientRow(raw: unknown): BroadcastRecipientRow | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const email = String(row.email ?? "").trim();
  if (!email) return null;

  return {
    email,
    sent_today: beNum(row.sent_today),
    opened_today: beNum(row.opened_today),
    open_rate_today: beNum(row.open_rate_today),
    clicks_today: beNum(row.clicks_today),
    sent_7d: beNum(row.sent_7d),
    opened_7d: beNum(row.opened_7d),
    open_rate_7d: beNum(row.open_rate_7d),
    clicks_7d: beNum(row.clicks_7d),
    sent_30d: beNum(row.sent_30d),
    opened_30d: beNum(row.opened_30d),
    open_rate_30d: beNum(row.open_rate_30d),
    clicks_30d: beNum(row.clicks_30d),
    sent_90d: beNum(row.sent_90d),
    opened_90d: beNum(row.opened_90d),
    open_rate_90d: beNum(row.open_rate_90d),
    clicks_90d: beNum(row.clicks_90d),
  };
}

function normalizeSuppressionRow(raw: unknown): BroadcastSuppressionRow | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const email = String(row.email ?? "").trim();
  if (!email) return null;

  return {
    email,
    reason: String(row.reason ?? row.type ?? "—"),
    source: String(row.source ?? row.suppression_type ?? "—"),
    suppressed_at: String(
      row.suppressed_at ?? row.created_at ?? row.timestamp ?? ""
    ),
    campaign_key:
      row.campaign_key != null ? String(row.campaign_key) : undefined,
  };
}

function parseCampaignKeys(raw: unknown): string[] {
  if (!raw || typeof raw !== "object") return [];
  const row = raw as Record<string, unknown>;
  const list =
    row.campaign_keys ?? row.keys ?? row.items ?? row.data ?? raw;
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        const entry = item as Record<string, unknown>;
        return String(entry.campaign_key ?? entry.key ?? entry.value ?? "").trim();
      }
      return "";
    })
    .filter(Boolean);
}

function PeriodStatCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "green" | "blue" | "red";
}) {
  const toneClass =
    tone === "green"
      ? "text-green-700"
      : tone === "blue"
        ? "text-blue-700"
        : tone === "red"
          ? "text-red-700"
          : "text-gray-900";

  return (
    <div className="rounded border px-4 py-3">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-2xl font-medium ${toneClass}`}>{value}</div>
      {sub ? <div className="text-xs text-gray-400 mt-1">{sub}</div> : null}
    </div>
  );
}

function CampaignDetailPanel({
  campaignId,
  auditDate,
  campaignKey,
}: {
  campaignId: string;
  auditDate: string;
  campaignKey: string;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let aborted = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = broadcastQueryParams(auditDate, campaignKey);
        const res = await fetch(
          `${BROADCAST_CAMPAIGNS_URL}/${encodeURIComponent(campaignId)}?${params.toString()}`,
          { headers: authHeaders() }
        );
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`${res.status} ${text}`);
        }
        const json = await res.json();
        if (!aborted) {
          setDetail(
            json && typeof json === "object"
              ? (json as Record<string, unknown>)
              : null
          );
        }
      } catch (err) {
        if (!aborted) {
          setDetail(null);
          setError(
            err instanceof Error ? err.message : "Failed to load campaign"
          );
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    }
    load();
    return () => {
      aborted = true;
    };
  }, [campaignId, auditDate, campaignKey]);

  if (loading) {
    return (
      <div className="px-4 py-3 text-xs text-gray-500 bg-gray-50 border-t">
        Loading campaign detail…
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-3 text-xs text-red-700 bg-red-50 border-t">
        {error}
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="px-4 py-3 text-xs text-gray-500 bg-gray-50 border-t">
        No detail available.
      </div>
    );
  }

  const recentSends = detail.recent_sends ?? detail.sends ?? detail.recipients;
  const campaign =
    detail.campaign && typeof detail.campaign === "object"
      ? (detail.campaign as Record<string, unknown>)
      : detail;

  return (
    <div className="px-4 py-3 bg-gray-50 border-t text-xs space-y-2">
      <div className="font-medium text-gray-700">
        {String(campaign.label ?? campaign.name ?? campaign.campaign_key ?? "")}
      </div>
      {Array.isArray(recentSends) && recentSends.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-1 pr-3">Email</th>
                <th className="py-1 pr-3">Status</th>
                <th className="py-1">Sent</th>
              </tr>
            </thead>
            <tbody>
              {recentSends.slice(0, 10).map((send, index) => {
                const row =
                  send && typeof send === "object"
                    ? (send as Record<string, unknown>)
                    : {};
                return (
                  <tr key={index} className="border-t border-gray-200">
                    <td className="py-1 pr-3">{String(row.email ?? "—")}</td>
                    <td className="py-1 pr-3">{String(row.status ?? "—")}</td>
                    <td className="py-1">
                      {String(row.sent_at ?? row.delivered_at ?? "—")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <pre className="text-[11px] text-gray-600 overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(detail, null, 2)}
        </pre>
      )}
    </div>
  );
}

export function EventEmailAnalyticsTab({
  auditDate,
  emailSearch,
}: EventEmailAnalyticsTabProps) {
  const [campaignKey, setCampaignKey] = useState("");
  const [campaignKeys, setCampaignKeys] = useState<string[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [dashboardPeriod, setDashboardPeriod] = useState<PeriodKey>("7d");
  const [dataView, setDataView] = useState<DataView>("campaigns");
  const [page, setPage] = useState(1);
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(
    null
  );

  const [overview, setOverview] = useState<BroadcastOverviewResponse | null>(
    null
  );
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [dailyStats, setDailyStats] = useState<BroadcastDailyResponse | null>(
    null
  );
  const [dailyLoading, setDailyLoading] = useState(true);
  const [dailyError, setDailyError] = useState<string | null>(null);

  const [campaigns, setCampaigns] = useState<BroadcastCampaignRow[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);
  const [campaignSortBy, setCampaignSortBy] =
    useState<CampaignSortColumn>("sent_7d");
  const [campaignSortOrder, setCampaignSortOrder] =
    useState<SortDirection>("desc");

  const [recipients, setRecipients] = useState<BroadcastRecipientRow[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(true);
  const [recipientsError, setRecipientsError] = useState<string | null>(null);
  const [recipientSortBy, setRecipientSortBy] = useState("sent_7d");
  const [recipientSortOrder, setRecipientSortOrder] =
    useState<SortDirection>("desc");

  const [suppressions, setSuppressions] = useState<BroadcastSuppressionRow[]>(
    []
  );
  const [suppressionsLoading, setSuppressionsLoading] = useState(true);
  const [suppressionsError, setSuppressionsError] = useState<string | null>(
    null
  );

  useEffect(() => {
    let aborted = false;
    async function loadKeys() {
      setKeysLoading(true);
      try {
        const params = new URLSearchParams({
          date: auditDate,
          timezone: DEFAULT_TIMEZONE,
        });
        const res = await fetch(
          `${BROADCAST_CAMPAIGN_KEYS_URL}?${params.toString()}`,
          { headers: authHeaders() }
        );
        if (!res.ok) {
          throw new Error(`${res.status}`);
        }
        const json = await res.json();
        if (!aborted) setCampaignKeys(parseCampaignKeys(json));
      } catch {
        if (!aborted) setCampaignKeys([]);
      } finally {
        if (!aborted) setKeysLoading(false);
      }
    }
    loadKeys();
    return () => {
      aborted = true;
    };
  }, [auditDate]);

  const fetchOverviewAndDaily = useCallback(async () => {
    setOverviewLoading(true);
    setDailyLoading(true);
    setOverviewError(null);
    setDailyError(null);
    const params = broadcastQueryParams(auditDate, campaignKey);

    try {
      const [overviewRes, dailyRes] = await Promise.all([
        fetch(`${BROADCAST_BASE_URL}?${params.toString()}`, {
          headers: authHeaders(),
        }),
        fetch(`${BROADCAST_DAILY_URL}?${params.toString()}`, {
          headers: authHeaders(),
        }),
      ]);

      if (!overviewRes.ok) {
        const text = await overviewRes.text().catch(() => "");
        throw new Error(`Overview: ${overviewRes.status} ${text}`);
      }
      if (!dailyRes.ok) {
        const text = await dailyRes.text().catch(() => "");
        throw new Error(`Daily: ${dailyRes.status} ${text}`);
      }

      const overviewJson = await overviewRes.json();
      const dailyJson = await dailyRes.json();
      setOverview(normalizeOverview(overviewJson));
      setDailyStats(normalizeBroadcastDaily(dailyJson));
    } catch (err) {
      setOverview(null);
      setDailyStats(null);
      const message =
        err instanceof Error ? err.message : "Failed to load broadcast stats";
      setOverviewError(message);
      setDailyError(message);
    } finally {
      setOverviewLoading(false);
      setDailyLoading(false);
    }
  }, [auditDate, campaignKey]);

  const fetchCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    setCampaignsError(null);
    try {
      const params = broadcastQueryParams(
        auditDate,
        campaignKey,
        campaignSortBy,
        campaignSortOrder
      );
      const res = await fetch(
        `${BROADCAST_CAMPAIGNS_URL}?${params.toString()}`,
        { headers: authHeaders() }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`${res.status} ${text}`);
      }
      const json = await res.json();
      const root =
        json && typeof json === "object"
          ? (json as Record<string, unknown>)
          : null;
      const list = root?.campaigns ?? root?.items ?? json;
      const rows = (Array.isArray(list) ? list : [])
        .map(normalizeCampaignRow)
        .filter((row): row is BroadcastCampaignRow => row !== null);
      setCampaigns(rows);
      setExpandedCampaignId(null);
    } catch (err) {
      setCampaigns([]);
      setCampaignsError(
        err instanceof Error ? err.message : "Failed to load campaigns"
      );
    } finally {
      setCampaignsLoading(false);
    }
  }, [auditDate, campaignKey, campaignSortBy, campaignSortOrder]);

  const fetchRecipients = useCallback(async () => {
    setRecipientsLoading(true);
    setRecipientsError(null);
    try {
      const params = broadcastQueryParams(
        auditDate,
        campaignKey,
        recipientSortBy,
        recipientSortOrder
      );
      const res = await fetch(
        `${BROADCAST_RECIPIENTS_URL}?${params.toString()}`,
        { headers: authHeaders() }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`${res.status} ${text}`);
      }
      const json = await res.json();
      const root =
        json && typeof json === "object"
          ? (json as Record<string, unknown>)
          : null;
      const list = root?.recipients ?? root?.users ?? root?.items ?? json;
      const rows = (Array.isArray(list) ? list : [])
        .map(normalizeRecipientRow)
        .filter((row): row is BroadcastRecipientRow => row !== null);
      setRecipients(rows);
    } catch (err) {
      setRecipients([]);
      setRecipientsError(
        err instanceof Error ? err.message : "Failed to load recipients"
      );
    } finally {
      setRecipientsLoading(false);
    }
  }, [auditDate, campaignKey, recipientSortBy, recipientSortOrder]);

  const fetchSuppressions = useCallback(async () => {
    setSuppressionsLoading(true);
    setSuppressionsError(null);
    try {
      const params = broadcastQueryParams(auditDate, campaignKey);
      const res = await fetch(
        `${BROADCAST_SUPPRESSIONS_URL}?${params.toString()}`,
        { headers: authHeaders() }
      );
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`${res.status} ${text}`);
      }
      const json = await res.json();
      const root =
        json && typeof json === "object"
          ? (json as Record<string, unknown>)
          : null;
      const list = root?.suppressions ?? root?.items ?? json;
      const rows = (Array.isArray(list) ? list : [])
        .map(normalizeSuppressionRow)
        .filter((row): row is BroadcastSuppressionRow => row !== null);
      setSuppressions(rows);
    } catch (err) {
      setSuppressions([]);
      setSuppressionsError(
        err instanceof Error ? err.message : "Failed to load suppressions"
      );
    } finally {
      setSuppressionsLoading(false);
    }
  }, [auditDate, campaignKey]);

  const refreshAll = useCallback(() => {
    fetchOverviewAndDaily();
    fetchCampaigns();
    fetchRecipients();
    fetchSuppressions();
  }, [
    fetchOverviewAndDaily,
    fetchCampaigns,
    fetchRecipients,
    fetchSuppressions,
  ]);

  useEffect(() => {
    fetchOverviewAndDaily();
  }, [fetchOverviewAndDaily]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  useEffect(() => {
    fetchRecipients();
  }, [fetchRecipients]);

  useEffect(() => {
    fetchSuppressions();
  }, [fetchSuppressions]);

  useEffect(() => {
    setPage(1);
    setExpandedCampaignId(null);
  }, [auditDate, campaignKey, dataView, emailSearch]);

  const selectedPeriod =
    dailyStats?.periods[dashboardPeriod] ??
    overview?.periods[dashboardPeriod] ??
    null;

  const filteredRecipients = useMemo(() => {
    if (!emailSearch) return recipients;
    return recipients.filter((row) =>
      row.email.toLowerCase().includes(emailSearch)
    );
  }, [recipients, emailSearch]);

  const listRows =
    dataView === "campaigns"
      ? campaigns
      : dataView === "recipients"
        ? filteredRecipients
        : suppressions;

  const listLoading =
    dataView === "campaigns"
      ? campaignsLoading
      : dataView === "recipients"
        ? recipientsLoading
        : suppressionsLoading;

  const listError =
    dataView === "campaigns"
      ? campaignsError
      : dataView === "recipients"
        ? recipientsError
        : suppressionsError;

  const totalPages = Math.max(1, Math.ceil(listRows.length / LIST_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pagedCampaigns = campaigns.slice(
    (currentPage - 1) * LIST_PER_PAGE,
    currentPage * LIST_PER_PAGE
  );
  const pagedRecipients = filteredRecipients.slice(
    (currentPage - 1) * LIST_PER_PAGE,
    currentPage * LIST_PER_PAGE
  );
  const pagedSuppressions = suppressions.slice(
    (currentPage - 1) * LIST_PER_PAGE,
    currentPage * LIST_PER_PAGE
  );

  function handleCampaignSort(key: string) {
    if (!isCampaignSortColumn(key)) return;
    if (campaignSortBy !== key) {
      setCampaignSortBy(key);
      setCampaignSortOrder(key === "campaign_key" ? "asc" : "desc");
    } else {
      setCampaignSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    }
    setPage(1);
  }

  function handleRecipientSort(key: string) {
    if (!isRecipientSortColumn(key)) return;
    if (recipientSortBy !== key) {
      setRecipientSortBy(key);
      setRecipientSortOrder("desc");
    } else {
      setRecipientSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    }
    setPage(1);
  }

  return (
    <div className="space-y-4 px-4 pb-4">
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <select
          value={campaignKey}
          onChange={(event) => setCampaignKey(event.target.value)}
          disabled={keysLoading}
          className="text-sm border rounded px-2 py-1.5 min-w-[220px]"
          aria-label="Filter by event campaign"
        >
          <option value="">All event campaigns</option>
          {campaignKeys.map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={refreshAll}
          disabled={overviewLoading || dailyLoading}
          className="text-sm border rounded px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
        >
          {overviewLoading || dailyLoading ? "Loading…" : "↻ Refresh"}
        </button>
        <span className="text-xs text-gray-500 ml-auto">
          Broadcast sends · {DEFAULT_TIMEZONE}
        </span>
      </div>

      {overviewError || dailyError ? (
        <div className="bg-red-50 text-red-700 rounded border border-red-200 px-3 py-2 text-sm">
          {overviewError || dailyError}
        </div>
      ) : null}

      <div className="rounded border bg-white">
        <div className="px-4 py-3 border-b">
          <h3 className="text-sm font-medium">Overview</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Period roll-ups and top campaigns by 7-day sends
          </p>
        </div>
        {overviewLoading && !overview ? (
          <div className="text-center py-6 text-sm text-gray-500">Loading…</div>
        ) : (
          <div className="p-4 space-y-4">
            {overview?.top_campaigns && overview.top_campaigns.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b">
                      <th className="py-2 pr-3">Campaign</th>
                      <th className="py-2 pr-3">Key</th>
                      <th className="py-2 pr-3 text-right">Sent (7d)</th>
                      <th className="py-2 pr-3 text-right">Open %</th>
                      <th className="py-2 text-right">Clicks (7d)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.top_campaigns.slice(0, 8).map((campaign) => (
                      <tr
                        key={`${campaign.campaign_id}-${campaign.campaign_key}`}
                        className="border-b border-gray-100"
                      >
                        <td className="py-2 pr-3 font-medium">
                          {campaign.label}
                        </td>
                        <td className="py-2 pr-3 text-gray-600 font-mono text-xs">
                          {campaign.campaign_key}
                        </td>
                        <td className="py-2 pr-3 text-right">
                          {campaign.sent_7d.toLocaleString()}
                        </td>
                        <td className="py-2 pr-3 text-right">
                          {beFormatRate(campaign.open_rate_7d)}
                        </td>
                        <td className="py-2 text-right">
                          {campaign.clicked_7d.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No top campaigns for this window.</p>
            )}
          </div>
        )}
      </div>

      <div className="rounded border bg-white">
        <div className="px-4 py-3 border-b">
          <h3 className="text-sm font-medium">Daily analytics</h3>
        </div>
        {dailyLoading && !dailyStats ? (
          <div className="text-center py-6 text-sm text-gray-500">Loading…</div>
        ) : !dailyStats ? (
          <div className="text-center py-6 text-sm text-gray-500">No data.</div>
        ) : (
          <div className="p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {PERIOD_KEYS.map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setDashboardPeriod(period)}
                  className={`text-sm px-3 py-1.5 rounded border ${
                    dashboardPeriod === period
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {PERIOD_LABELS[period]}
                </button>
              ))}
            </div>
            {selectedPeriod?.from_date && selectedPeriod?.to_date ? (
              <p className="text-xs text-gray-500">
                {selectedPeriod.from_date} → {selectedPeriod.to_date}
              </p>
            ) : null}
            {selectedPeriod ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <PeriodStatCard
                  label="Sent"
                  value={selectedPeriod.sent.toLocaleString()}
                  tone="green"
                />
                <PeriodStatCard
                  label="Opened"
                  value={selectedPeriod.opened.toLocaleString()}
                  sub={`${beFormatRate(selectedPeriod.open_rate)} open rate`}
                  tone="green"
                />
                <PeriodStatCard
                  label="Clicked"
                  value={selectedPeriod.clicked.toLocaleString()}
                  sub={
                    selectedPeriod.click_rate
                      ? `${beFormatRate(selectedPeriod.click_rate)} click rate`
                      : undefined
                  }
                  tone="blue"
                />
                <PeriodStatCard
                  label="Failed"
                  value={selectedPeriod.failed.toLocaleString()}
                  sub={
                    selectedPeriod.failed_rate
                      ? `${beFormatRate(selectedPeriod.failed_rate)} fail rate`
                      : undefined
                  }
                  tone="red"
                />
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex border-b border-gray-200">
        {(
          [
            ["campaigns", "Campaigns"],
            ["recipients", "Recipients"],
            ["suppressions", "Suppressions"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setDataView(value)}
            className={`text-sm py-2 px-3 border-b-2 mr-1 ${
              dataView === value
                ? "border-gray-900 text-gray-900 font-medium"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
            <span className="ml-1.5 text-xs text-gray-400">
              (
              {value === "campaigns"
                ? campaigns.length.toLocaleString()
                : value === "recipients"
                  ? filteredRecipients.length.toLocaleString()
                  : suppressions.length.toLocaleString()}
              )
            </span>
          </button>
        ))}
      </div>

      {listError ? (
        <div className="bg-red-50 text-red-700 rounded border border-red-200 px-3 py-2 text-sm">
          {listError}
        </div>
      ) : null}

      {dataView === "campaigns" ? (
        <div className="overflow-x-auto border rounded bg-white">
          {listLoading ? (
            <div className="text-center py-8 text-sm text-gray-500">Loading…</div>
          ) : (
            <table className="w-full text-sm border-collapse min-w-[900px]">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b bg-gray-50">
                  <th className="px-3 py-2 w-8" />
                  <th
                    className="px-3 py-2 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleCampaignSort("campaign_key")}
                  >
                    Campaign
                  </th>
                  {(["today", "7d"] as PeriodKey[]).flatMap((period) => {
                    const sentKey =
                      period === "today" ? "sent_today" : "sent_7d";
                    const rateKey =
                      period === "today" ? "open_rate_today" : "open_rate_7d";
                    return [
                      <th
                        key={`${period}-sent`}
                        className={`px-3 py-2 text-right cursor-pointer hover:bg-gray-100 ${PERIOD_THEME[period].metricHeader}`}
                        onClick={() =>
                          handleCampaignSort(sentKey)
                        }
                      >
                        Sent ({PERIOD_LABELS[period]})
                      </th>,
                      <th
                        key={`${period}-open`}
                        className={`px-3 py-2 text-right cursor-pointer hover:bg-gray-100 ${PERIOD_THEME[period].metricHeader}`}
                        onClick={() =>
                          handleCampaignSort(rateKey)
                        }
                      >
                        Open % ({PERIOD_LABELS[period]})
                      </th>,
                    ];
                  })}
                </tr>
              </thead>
              <tbody>
                {pagedCampaigns.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-8 text-sm text-gray-500"
                    >
                      No campaigns match this filter.
                    </td>
                  </tr>
                ) : (
                  pagedCampaigns.map((campaign) => {
                    const expanded =
                      expandedCampaignId === campaign.campaign_id;
                    return (
                      <Fragment key={campaign.campaign_id}>
                        <tr className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              className="text-gray-500 hover:text-gray-800"
                              onClick={() =>
                                setExpandedCampaignId(
                                  expanded ? null : campaign.campaign_id
                                )
                              }
                              aria-expanded={expanded}
                            >
                              {expanded ? "▼" : "▶"}
                            </button>
                          </td>
                          <td className="px-3 py-2">
                            <div className="font-medium">{campaign.label}</div>
                            <div className="text-xs text-gray-400 font-mono">
                              {campaign.campaign_key}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right">
                            {campaign.sent_today.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {beFormatRate(campaign.open_rate_today)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {campaign.sent_7d.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {beFormatRate(campaign.open_rate_7d)}
                          </td>
                        </tr>
                        {expanded ? (
                          <tr>
                            <td colSpan={6} className="p-0">
                              <CampaignDetailPanel
                                campaignId={campaign.campaign_id}
                                auditDate={auditDate}
                                campaignKey={campaignKey}
                              />
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      ) : null}

      {dataView === "recipients" ? (
        <div className="overflow-x-auto border rounded bg-white">
          {listLoading ? (
            <div className="text-center py-8 text-sm text-gray-500">Loading…</div>
          ) : (
            <table className="w-full text-sm border-collapse min-w-[1200px]">
              <thead>
                <tr>
                  <th
                    rowSpan={2}
                    className="text-left font-normal text-xs text-gray-500 px-3 py-2 border-r bg-gray-50 sticky left-0"
                  >
                    Email
                  </th>
                  {PERIOD_KEYS.map((period) => {
                    const cols = RECIPIENT_TABLE_COLUMNS.filter(
                      (col) => col.period === period
                    );
                    if (cols.length === 0) return null;
                    const theme = PERIOD_THEME[period];
                    return (
                      <th
                        key={period}
                        colSpan={cols.length}
                        className={`text-center text-sm font-semibold px-3 py-3 border-r ${theme.groupHeader}`}
                      >
                        {PERIOD_LABELS[period]}
                      </th>
                    );
                  })}
                </tr>
                <tr>
                  {RECIPIENT_TABLE_COLUMNS.filter((col) => col.period).map(
                    (col) => {
                      const theme = col.period ? PERIOD_THEME[col.period] : null;
                      const isFirst =
                        col.period &&
                        RECIPIENT_TABLE_COLUMNS.filter(
                          (c) => c.period === col.period
                        )[0]?.key === col.key;
                      return (
                        <th
                          key={col.key}
                          onClick={() => handleRecipientSort(col.key)}
                          className={`text-left font-normal text-xs text-gray-500 px-3 py-2 cursor-pointer hover:bg-gray-100 border-r ${
                            theme?.metricHeader ?? ""
                          } ${isFirst ? theme?.groupStart : ""}`}
                        >
                          {col.label}
                          {recipientSortBy === col.key ? (
                            <span className="text-gray-400 ml-1">
                              {recipientSortOrder === "desc" ? "▼" : "▲"}
                            </span>
                          ) : null}
                        </th>
                      );
                    }
                  )}
                </tr>
              </thead>
              <tbody>
                {pagedRecipients.length === 0 ? (
                  <tr>
                    <td
                      colSpan={RECIPIENT_TABLE_COLUMNS.length}
                      className="text-center py-8 text-sm text-gray-500"
                    >
                      No recipients match this filter.
                    </td>
                  </tr>
                ) : (
                  pagedRecipients.map((row) => (
                    <tr
                      key={row.email}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      {RECIPIENT_TABLE_COLUMNS.map((col) => {
                        const isFirst =
                          col.period &&
                          RECIPIENT_TABLE_COLUMNS.filter(
                            (c) => c.period === col.period
                          )[0]?.key === col.key;
                        const value = row[col.key];
                        const display =
                          col.format === "rate"
                            ? beFormatRate(beNum(value))
                            : typeof value === "number"
                              ? String(value)
                              : String(value ?? "—");
                        return (
                          <td
                            key={col.key}
                            className={`px-3 py-2 whitespace-nowrap ${
                              col.key === "email"
                                ? "font-medium bg-white sticky left-0 border-r"
                                : "text-gray-700"
                            } ${isFirst ? PERIOD_THEME[col.period!].groupStart : ""}`}
                          >
                            {display}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      ) : null}

      {dataView === "suppressions" ? (
        <div className="overflow-x-auto border rounded bg-white">
          {listLoading ? (
            <div className="text-center py-8 text-sm text-gray-500">Loading…</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b bg-gray-50">
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Reason</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Campaign key</th>
                  <th className="px-3 py-2">Suppressed at</th>
                </tr>
              </thead>
              <tbody>
                {pagedSuppressions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-8 text-sm text-gray-500"
                    >
                      No suppressions in this window.
                    </td>
                  </tr>
                ) : (
                  pagedSuppressions.map((row) => (
                    <tr
                      key={`${row.email}-${row.suppressed_at}`}
                      className="border-b border-gray-100"
                    >
                      <td className="px-3 py-2 font-medium">{row.email}</td>
                      <td className="px-3 py-2">{row.reason}</td>
                      <td className="px-3 py-2">{row.source}</td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {row.campaign_key ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {row.suppressed_at || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      ) : null}

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
          <span>
            Page {currentPage} of {totalPages} ({listRows.length.toLocaleString()}{" "}
            total)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={listLoading || currentPage <= 1}
              className="border rounded px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() =>
                setPage((value) => Math.min(totalPages, value + 1))
              }
              disabled={listLoading || currentPage >= totalPages}
              className="border rounded px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
