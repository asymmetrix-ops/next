"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

const DCP_ANALYTICS_URL = "/api/admin/email-analytics/dcp";
const DEFAULT_TIMEZONE = "Europe/London";
const DCP_PER_PAGE = 25;
const DCP_ROUND_KEYS = ["1", "2", "3"] as const;
const DCP_TOTAL_ROUND_KEYS = ["round_1", "round_2", "round_3"] as const;

type DcpFilter =
  | "all"
  | "outreach_sent"
  | "not_opened_7d"
  | "bounced"
  | "inactive";

type DcpRoundLog = {
  sent_at: number;
  opened_at: number;
  was_opened: boolean;
  clicks: number;
  delivered_at: number | null;
  clicked_at: number | null;
  was_clicked: boolean;
  status: string;
  recipient_email: string;
};

type DcpCompanyRow = {
  outreach_sequence_id: number;
  company_id: number;
  company_name: string;
  company_url: string;
  emails_sent_count: number;
  last_sent_at: number;
  was_opened: boolean;
  was_clicked: boolean;
  contributed: boolean;
  rounds: Record<string, DcpRoundLog>;
  engagement_pattern: string;
  rounds_opened: number[];
};

type DcpRoundOpenRate = {
  sent: number;
  opened: number;
  open_rate_pct: number;
};

type DcpSummary = {
  companies_total: number;
  companies_emailed: number;
  opened_email: number;
  open_rate: number;
  contributed_data: number;
  contribution_rate: number;
  outreach_sent_no_data: number;
  engagement_patterns: Record<string, number>;
  round_open_rates: Record<string, DcpRoundOpenRate>;
  filter_counts: Record<DcpFilter, number>;
};

type DcpOutreachTabProps = {
  onCompanyCountChange?: (count: number) => void;
};

function dcpNum(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function dcpOptionalTs(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function formatTimestamp(ts: number | null): string {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return String(ts);
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0") +
      " " +
      String(d.getHours()).padStart(2, "0") +
      ":" +
      String(d.getMinutes()).padStart(2, "0")
    );
  } catch {
    return String(ts);
  }
}

function dcpPatternLabel(pattern: string): string {
  if (!pattern) return "—";
  return pattern.replace(/_/g, " ");
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

function dcpQueryParams(
  dateFrom: string,
  dateTo: string,
  companyName: string,
  filter: DcpFilter,
  includeRounds: boolean
): URLSearchParams {
  const params = new URLSearchParams({
    timezone: DEFAULT_TIMEZONE,
    filter,
    include_rounds: includeRounds ? "true" : "false",
  });
  if (dateFrom) params.set("from_date", dateFrom);
  if (dateTo) params.set("to_date", dateTo);
  if (companyName) params.set("company_name", companyName);
  return params;
}

function dcpParseRoundLog(row: Record<string, unknown>): DcpRoundLog {
  const sentAt = dcpOptionalTs(row.sent_at) ?? dcpNum(row.sent_at);
  const openedAt = dcpOptionalTs(row.opened_at) ?? dcpNum(row.opened_at);
  const clickedAt = dcpOptionalTs(row.clicked_at);
  const deliveredAt = dcpOptionalTs(row.delivered_at);

  return {
    sent_at: sentAt,
    opened_at: openedAt,
    was_opened: Boolean(row.was_opened ?? row.opened ?? openedAt > 0),
    clicks: dcpNum(row.clicks ?? row.click_count),
    delivered_at: deliveredAt,
    clicked_at: clickedAt,
    was_clicked: Boolean(row.was_clicked ?? row.clicked ?? clickedAt),
    status: String(row.status ?? ""),
    recipient_email: String(row.recipient_email ?? row.recipient ?? ""),
  };
}

function dcpParseRounds(value: unknown): Record<string, DcpRoundLog> {
  let raw: unknown = value;
  if (typeof raw === "string" && raw.trim()) {
    try {
      raw = JSON.parse(raw) as unknown;
    } catch {
      return {};
    }
  }

  if (Array.isArray(raw)) {
    const rounds: Record<string, DcpRoundLog> = {};
    for (const entry of raw) {
      if (!entry || typeof entry !== "object") continue;
      const row = entry as Record<string, unknown>;
      const roundNum = dcpNum(row.round ?? row.round_number ?? row.round_key);
      const key = roundNum > 0 ? String(roundNum) : "";
      if (!key) continue;
      rounds[key] = dcpParseRoundLog(row);
    }
    return rounds;
  }

  if (!raw || typeof raw !== "object") return {};

  const rounds: Record<string, DcpRoundLog> = {};
  for (const [key, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!entry || typeof entry !== "object") continue;
    const normalizedKey = key.replace(/^round_/, "");
    rounds[normalizedKey] = dcpParseRoundLog(entry as Record<string, unknown>);
  }
  return rounds;
}

function dcpRoundEffectiveSentAt(round: DcpRoundLog): number {
  return (
    round.sent_at ||
    round.delivered_at ||
    round.opened_at ||
    round.clicked_at ||
    0
  );
}

function dcpRoundsSentCount(rounds: Record<string, DcpRoundLog>): number {
  return DCP_ROUND_KEYS.filter((key) => {
    const round = rounds[key];
    return !!round && dcpRoundEffectiveSentAt(round) > 0;
  }).length;
}

function dcpEffectiveLastSentAt(
  lastSentAt: number,
  rounds: Record<string, DcpRoundLog>
): number {
  if (lastSentAt > 0) return lastSentAt;
  return DCP_ROUND_KEYS.reduce((max, key) => {
    const round = rounds[key];
    return round ? Math.max(max, dcpRoundEffectiveSentAt(round)) : max;
  }, 0);
}

function dcpParseRoundsOpened(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => dcpNum(item))
    .filter((n) => n >= 1 && n <= 3);
}

function dcpParseRoundOpenRates(
  value: unknown
): Record<string, DcpRoundOpenRate> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const rates: Record<string, DcpRoundOpenRate> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    rates[key] = {
      sent: dcpNum(row.sent),
      opened: dcpNum(row.opened),
      open_rate_pct: dcpNum(row.open_rate ?? row.open_rate_pct),
    };
  }
  return rates;
}

function dcpParseFilterCounts(value: unknown): Record<DcpFilter, number> {
  const empty: Record<DcpFilter, number> = {
    all: 0,
    outreach_sent: 0,
    not_opened_7d: 0,
    bounced: 0,
    inactive: 0,
  };
  if (!value || typeof value !== "object" || Array.isArray(value)) return empty;

  const raw = value as Record<string, unknown>;
  return {
    all: dcpNum(raw.all),
    outreach_sent: dcpNum(raw.outreach_sent),
    not_opened_7d: dcpNum(raw.not_opened_7d),
    bounced: dcpNum(raw.bounced),
    inactive: dcpNum(raw.inactive),
  };
}

function normalizeDcpCompanyRow(row: unknown): DcpCompanyRow | null {
  const r = row && typeof row === "object" ? (row as Record<string, unknown>) : null;
  if (!r) return null;

  const companyId = dcpNum(r.company_id);
  const outreachSequenceId = dcpNum(
    r.outreach_sequence_id ?? r.outreachSequenceId ?? r.id ?? r.contact_id
  );
  if (companyId <= 0 && outreachSequenceId <= 0) return null;

  const rounds = dcpParseRounds(
    r.rounds ?? r.round_history ?? r.roundHistory ?? r.round_details
  );
  const lastSentRaw =
    r.last_sent_at ?? r.last_sent ?? r.lastSentAt ?? r.lastSent;

  return {
    outreach_sequence_id: outreachSequenceId,
    company_id: companyId,
    company_name: String(r.company_name ?? r.name ?? ""),
    company_url: String(r.company_url ?? r.website ?? ""),
    emails_sent_count:
      dcpNum(r.emails_sent_count ?? r.rounds_sent ?? r.roundsSent) ||
      dcpRoundsSentCount(rounds),
    last_sent_at: dcpEffectiveLastSentAt(
      dcpOptionalTs(lastSentRaw) ?? dcpNum(lastSentRaw),
      rounds
    ),
    was_opened: Boolean(r.was_opened ?? r.opened),
    was_clicked: Boolean(r.was_clicked ?? r.clicked),
    contributed: Boolean(r.contributed),
    rounds,
    engagement_pattern: String(
      r.engagement_pattern ?? r.pattern ?? r.engagementPattern ?? ""
    ),
    rounds_opened: dcpParseRoundsOpened(
      r.rounds_opened ?? r.roundsOpened ?? r.opened_rounds
    ),
  };
}

function normalizeDcpSummary(raw: unknown): DcpSummary {
  const row =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const companiesEmailed = dcpNum(row.companies_emailed ?? row.companies_total);

  return {
    companies_total: dcpNum(row.companies_total ?? row.companies_emailed),
    companies_emailed: companiesEmailed,
    opened_email: dcpNum(row.opened_email ?? row.total_opened),
    open_rate: dcpNum(row.open_rate),
    contributed_data: dcpNum(row.contributed_data ?? row.total_contributed),
    contribution_rate: dcpNum(row.contribution_rate),
    outreach_sent_no_data: dcpNum(
      row.outreach_sent_no_data ??
        Math.max(0, companiesEmailed - dcpNum(row.contributed_data))
    ),
    engagement_patterns:
      row.engagement_patterns && typeof row.engagement_patterns === "object"
        ? Object.fromEntries(
            Object.entries(row.engagement_patterns as Record<string, unknown>).map(
              ([key, value]) => [key, dcpNum(value)]
            )
          )
        : {},
    round_open_rates: dcpParseRoundOpenRates(
      row.open_rate_by_round ?? row.round_open_rates
    ),
    filter_counts: dcpParseFilterCounts(row.filter_counts),
  };
}

function normalizeDcpListResponse(json: unknown): {
  summary: DcpSummary;
  companies: DcpCompanyRow[];
} {
  const root =
    json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  const summaryRaw = root.summary ?? root.totals ?? root;
  const companiesRaw =
    root.companies ?? root.results ?? root.items ?? root.data ?? [];

  const companies = (Array.isArray(companiesRaw) ? companiesRaw : [])
    .map(normalizeDcpCompanyRow)
    .filter((company): company is DcpCompanyRow => company !== null);

  return {
    summary: normalizeDcpSummary(summaryRaw),
    companies,
  };
}

function dcpBoolBadge(value: boolean): { label: string; cls: string } {
  return value
    ? { label: "Yes", cls: "bg-green-100 text-green-800" }
    : { label: "No", cls: "bg-gray-100 text-gray-600" };
}

function DcpStatusBadge({
  value,
  positiveLabel = "Yes",
  negativeLabel = "No",
}: {
  value: boolean;
  positiveLabel?: string;
  negativeLabel?: string;
}) {
  const badge = dcpBoolBadge(value);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badge.cls}`}
    >
      {value ? positiveLabel : negativeLabel}
    </span>
  );
}

function dcpStatusBadge(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "sent" || normalized === "delivered") {
    return { label: status || "Sent", cls: "bg-green-50 text-green-700" };
  }
  if (normalized === "failed") {
    return { label: "Failed", cls: "bg-red-50 text-red-700" };
  }
  return {
    label: status || "—",
    cls: "bg-gray-100 text-gray-700",
  };
}

function DcpRoundOpenedBadges({ roundsOpened }: { roundsOpened: number[] }) {
  if (roundsOpened.length === 0) {
    return <span className="text-xs text-gray-400">None</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {roundsOpened.map((round) => (
        <span
          key={round}
          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"
        >
          R{round}
        </span>
      ))}
    </div>
  );
}

function DcpRoundOpenRateBars({
  roundOpenRates,
}: {
  roundOpenRates: Record<string, DcpRoundOpenRate>;
}) {
  const rows = DCP_TOTAL_ROUND_KEYS.map((key) => ({
    key,
    label: `Round ${key.replace("round_", "")}`,
    rate: roundOpenRates[key],
  })).filter((row) => row.rate && row.rate.sent > 0);

  if (rows.length === 0) return null;

  return (
    <div className="px-4 py-4 border-b border-gray-100">
      <h3 className="text-sm font-medium text-gray-900 mb-3">Open rate by round</h3>
      <div className="grid gap-3 md:grid-cols-3">
        {rows.map(({ key, label, rate }) => {
          const pct = Math.min(100, Math.max(0, rate?.open_rate_pct ?? 0));
          return (
            <div key={key} className="rounded border px-4 py-3">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span>{label}</span>
                <span>
                  {rate?.opened.toLocaleString()} / {rate?.sent.toLocaleString()}
                </span>
              </div>
              <div className="text-lg font-medium text-green-700 mb-2">
                {pct.toFixed(1)}%
              </div>
              <div className="h-2 rounded bg-gray-100 overflow-hidden">
                <div
                  className="h-2 rounded bg-green-600"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DcpEngagementPatternBreakdown({
  patterns,
}: {
  patterns: Record<string, number>;
}) {
  const rows = Object.entries(patterns)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  if (rows.length === 0) return null;

  return (
    <div className="px-4 py-4 border-b border-gray-100">
      <h3 className="text-sm font-medium text-gray-900 mb-3">Engagement patterns</h3>
      <div className="flex flex-wrap gap-2">
        {rows.map(([pattern, count]) => (
          <span
            key={pattern}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700"
          >
            <span>{dcpPatternLabel(pattern)}</span>
            <span className="font-medium text-gray-900">{count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function DcpRoundHistoryTable({
  rounds,
}: {
  rounds: Record<string, DcpRoundLog>;
}) {
  const roundRows = DCP_ROUND_KEYS.map((roundKey) => ({
    roundKey,
    round: rounds[roundKey],
  })).filter(({ round }) => !!round);

  return (
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="border-b border-gray-200">
          {[
            "Round",
            "Recipient",
            "Sent",
            "Delivered",
            "Opened",
            "Clicked",
            "Clicks",
            "Status",
          ].map((h) => (
            <th key={h} className="text-left font-normal text-gray-500 px-2 py-1">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {roundRows.length === 0 ? (
          <tr>
            <td colSpan={8} className="px-2 py-2 text-gray-500">
              No round records for this company.
            </td>
          </tr>
        ) : (
          roundRows.map(({ roundKey, round }) => {
            if (!round) return null;
            const statusBadge = dcpStatusBadge(round.status);
            return (
              <tr key={roundKey} className="border-b border-gray-100 last:border-0">
                <td className="px-2 py-1 font-medium text-gray-900">R{roundKey}</td>
                <td className="px-2 py-1 text-gray-900">
                  {round.recipient_email || "—"}
                </td>
                <td className="px-2 py-1 whitespace-nowrap">
                  {formatTimestamp(dcpRoundEffectiveSentAt(round) || null)}
                </td>
                <td className="px-2 py-1 whitespace-nowrap">
                  {formatTimestamp(round.delivered_at)}
                </td>
                <td className="px-2 py-1 whitespace-nowrap">
                  {formatTimestamp(round.opened_at || null)}
                </td>
                <td className="px-2 py-1 whitespace-nowrap">
                  {formatTimestamp(round.clicked_at)}
                </td>
                <td className="px-2 py-1">{round.clicks}</td>
                <td className="px-2 py-1">
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded ${statusBadge.cls}`}
                  >
                    {statusBadge.label}
                  </span>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}

function DcpCompanyRowExpand({
  company,
  dateFrom,
  dateTo,
}: {
  company: DcpCompanyRow;
  dateFrom: string;
  dateTo: string;
}) {
  const [detailRounds, setDetailRounds] = useState<Record<string, DcpRoundLog>>(
    company.rounds
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (company.outreach_sequence_id <= 0) return;

    let cancelled = false;
    async function loadDetail() {
      setLoading(true);
      setError(null);
      try {
        const params = dcpQueryParams(dateFrom, dateTo, "", "all", true);
        const res = await fetch(
          `${DCP_ANALYTICS_URL}/${encodeURIComponent(
            String(company.outreach_sequence_id)
          )}?${params.toString()}`,
          { method: "GET", headers: authHeaders() }
        );
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`${res.status} ${text}`);
        }
        const json = await res.json();
        const detail =
          json && typeof json === "object"
            ? normalizeDcpCompanyRow(json)
            : null;
        if (!cancelled && detail) {
          setDetailRounds(
            Object.keys(detail.rounds).length > 0 ? detail.rounds : company.rounds
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load company detail"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDetail();
    return () => {
      cancelled = true;
    };
  }, [company, dateFrom, dateTo]);

  return (
    <tr className="bg-gray-50">
      <td colSpan={10} className="px-3 py-3">
        <div className="text-xs font-medium text-gray-500 mb-2">Round history</div>
        {loading ? (
          <div className="text-xs text-gray-500 py-2">Loading round history…</div>
        ) : null}
        {error ? (
          <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded px-2 py-1 mb-2">
            {error}
          </div>
        ) : null}
        <DcpRoundHistoryTable rounds={detailRounds} />
      </td>
    </tr>
  );
}

const DCP_FILTER_OPTIONS: Array<{ value: DcpFilter; label: string }> = [
  { value: "all", label: "All outreach" },
  { value: "outreach_sent", label: "Outreach sent" },
  { value: "not_opened_7d", label: "Not opened 7d+" },
  { value: "bounced", label: "Bounced" },
  { value: "inactive", label: "Inactive" },
];

export function DcpOutreachTab({ onCompanyCountChange }: DcpOutreachTabProps) {
  const [companies, setCompanies] = useState<DcpCompanyRow[]>([]);
  const [summary, setSummary] = useState<DcpSummary>({
    companies_total: 0,
    companies_emailed: 0,
    opened_email: 0,
    open_rate: 0,
    contributed_data: 0,
    contribution_rate: 0,
    outreach_sent_no_data: 0,
    engagement_patterns: {},
    round_open_rates: {},
    filter_counts: {
      all: 0,
      outreach_sent: 0,
      not_opened_7d: 0,
      bounced: 0,
      inactive: 0,
    },
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyNameInput, setCompanyNameInput] = useState("");
  const [filter, setFilter] = useState<DcpFilter>("all");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const fetchOutreach = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = dcpQueryParams(
        dateFrom,
        dateTo,
        companyName,
        filter,
        true
      );
      const res = await fetch(`${DCP_ANALYTICS_URL}?${params.toString()}`, {
        method: "GET",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`${res.status} ${text}`);
      }
      const json = await res.json();
      const parsed = normalizeDcpListResponse(json);
      setCompanies(parsed.companies);
      setSummary(parsed.summary);
      setExpandedIds(new Set());
    } catch (err) {
      setCompanies([]);
      setSummary({
        companies_total: 0,
        companies_emailed: 0,
        opened_email: 0,
        open_rate: 0,
        contributed_data: 0,
        contribution_rate: 0,
        outreach_sent_no_data: 0,
        engagement_patterns: {},
        round_open_rates: {},
        filter_counts: {
          all: 0,
          outreach_sent: 0,
          not_opened_7d: 0,
          bounced: 0,
          inactive: 0,
        },
      });
      setError(
        err instanceof Error ? err.message : "Failed to load DCP outreach history"
      );
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, companyName, filter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCompanyName(companyNameInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [companyNameInput]);

  useEffect(() => {
    fetchOutreach();
  }, [fetchOutreach]);

  useEffect(() => {
    onCompanyCountChange?.(summary.companies_emailed || summary.companies_total);
  }, [onCompanyCountChange, summary.companies_emailed, summary.companies_total]);

  const totalPages = Math.max(1, Math.ceil(companies.length / DCP_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pagedCompanies = useMemo(
    () =>
      companies.slice(
        (currentPage - 1) * DCP_PER_PAGE,
        currentPage * DCP_PER_PAGE
      ),
    [companies, currentPage]
  );

  const openRatePct =
    summary.open_rate > 0
      ? summary.open_rate.toFixed(1)
      : summary.companies_emailed > 0
      ? ((summary.opened_email / summary.companies_emailed) * 100).toFixed(1)
      : "0.0";

  const contributionRatePct =
    summary.contribution_rate > 0
      ? summary.contribution_rate.toFixed(1)
      : summary.companies_emailed > 0
      ? ((summary.contributed_data / summary.companies_emailed) * 100).toFixed(1)
      : "0.0";

  function toggleExpanded(companyKey: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(companyKey)) next.delete(companyKey);
      else next.add(companyKey);
      return next;
    });
  }

  function filterCount(value: DcpFilter): number {
    return summary.filter_counts[value] || 0;
  }

  return (
    <div className="space-y-0">
      {error ? (
        <div className="mx-4 mt-4 bg-red-50 text-red-700 rounded border border-red-200 px-3 py-2 text-sm">
          Failed to load DCP outreach history: {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 py-4 border-b border-gray-100">
        <div className="rounded border px-4 py-3">
          <div className="text-xs text-gray-500 mb-1">Companies emailed</div>
          <div className="text-2xl font-medium text-gray-900">
            {summary.companies_emailed.toLocaleString()}
          </div>
        </div>
        <div className="rounded border px-4 py-3">
          <div className="text-xs text-gray-500 mb-1">Opened email</div>
          <div className="text-2xl font-medium text-green-700">
            {summary.opened_email.toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 mt-1">{openRatePct}% open rate</div>
        </div>
        <div className="rounded border px-4 py-3">
          <div className="text-xs text-gray-500 mb-1">Contributed data</div>
          <div className="text-2xl font-medium text-blue-700">
            {summary.contributed_data.toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {contributionRatePct}% contribution rate
          </div>
        </div>
        <div className="rounded border px-4 py-3">
          <div className="text-xs text-gray-500 mb-1">Outreach sent (no data)</div>
          <div className="text-2xl font-medium text-amber-700">
            {summary.outreach_sent_no_data.toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 mt-1">emailed, awaiting contribution</div>
        </div>
      </div>

      <DcpRoundOpenRateBars roundOpenRates={summary.round_open_rates} />
      <DcpEngagementPatternBreakdown patterns={summary.engagement_patterns} />

      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100">
        <span className="text-xs font-medium text-gray-500 mr-1">Show:</span>
        {DCP_FILTER_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setFilter(value);
              setPage(1);
            }}
            className={`text-xs rounded-full px-3 py-1 border ${
              filter === value
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}
          >
            {label}
            <span className="ml-1 opacity-70">({filterCount(value)})</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100">
        <input
          type="date"
          value={dateFrom}
          onChange={(event) => {
            setDateFrom(event.target.value);
            setPage(1);
          }}
          className="text-sm border rounded px-2 py-1.5"
          aria-label="Date from"
        />
        <span className="text-xs text-gray-400">to</span>
        <input
          type="date"
          value={dateTo}
          onChange={(event) => {
            setDateTo(event.target.value);
            setPage(1);
          }}
          className="text-sm border rounded px-2 py-1.5"
          aria-label="Date to"
        />
        <input
          type="search"
          value={companyNameInput}
          onChange={(event) => setCompanyNameInput(event.target.value)}
          placeholder="Filter by company name…"
          className="text-sm border rounded px-2 py-1.5 min-w-[220px]"
        />
        {(dateFrom || dateTo || companyNameInput) && (
          <button
            type="button"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
              setCompanyNameInput("");
              setCompanyName("");
              setPage(1);
            }}
            className="text-xs text-gray-500 hover:text-gray-800 underline"
          >
            Clear filters
          </button>
        )}
        <button
          type="button"
          onClick={fetchOutreach}
          disabled={loading}
          className="ml-auto text-sm border rounded px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? "Loading…" : "↻ Refresh"}
        </button>
      </div>

      <div className="overflow-x-auto">
        {loading ? (
          <div className="text-center py-8 text-sm text-gray-500">Loading…</div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                {[
                  "",
                  "Company",
                  "Website",
                  "Rounds sent",
                  "Last sent",
                  "Pattern",
                  "Rounds opened",
                  "Opened",
                  "Clicked",
                  "Contributed",
                ].map((h) => (
                  <th
                    key={h || "expand"}
                    className="text-left font-normal text-xs text-gray-500 px-3 py-2 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedCompanies.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-sm text-gray-500">
                    No DCP outreach records match this filter.
                  </td>
                </tr>
              ) : (
                pagedCompanies.map((company) => {
                  const rowKey =
                    company.outreach_sequence_id || company.company_id;
                  const expanded = expandedIds.has(rowKey);

                  return (
                    <Fragment key={rowKey}>
                      <tr className="border-b border-gray-100">
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => toggleExpanded(rowKey)}
                            className="text-gray-500 hover:text-gray-900"
                            aria-label={expanded ? "Collapse" : "Expand"}
                          >
                            {expanded ? "▼" : "▶"}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-gray-900">
                          {company.company_id > 0 ? (
                            <Link
                              href={`/company/${company.company_id}`}
                              className="text-blue-600 hover:underline"
                            >
                              {company.company_name || `Company #${company.company_id}`}
                            </Link>
                          ) : (
                            company.company_name || "—"
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-700 max-w-[180px] truncate">
                          {company.company_url ? (
                            <a
                              href={
                                company.company_url.startsWith("http")
                                  ? company.company_url
                                  : `https://${company.company_url}`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {company.company_url.replace(/^https?:\/\//, "")}
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-700">
                          {company.emails_sent_count}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                          {formatTimestamp(company.last_sent_at || null)}
                        </td>
                        <td className="px-3 py-2 text-gray-700">
                          {dcpPatternLabel(company.engagement_pattern)}
                        </td>
                        <td className="px-3 py-2">
                          <DcpRoundOpenedBadges roundsOpened={company.rounds_opened} />
                        </td>
                        <td className="px-3 py-2">
                          <DcpStatusBadge value={company.was_opened} />
                        </td>
                        <td className="px-3 py-2">
                          <DcpStatusBadge value={company.was_clicked} />
                        </td>
                        <td className="px-3 py-2">
                          <DcpStatusBadge
                            value={company.contributed}
                            positiveLabel="Contributed"
                            negativeLabel="None"
                          />
                        </td>
                      </tr>
                      {expanded ? (
                        <DcpCompanyRowExpand
                          company={company}
                          dateFrom={dateFrom}
                          dateTo={dateTo}
                        />
                      ) : null}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {companies.length > 0 && totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
          <span>
            Showing page {currentPage} of {totalPages} (
            {companies.length.toLocaleString()} companies)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={loading || currentPage <= 1}
              className="border rounded px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() =>
                setPage((value) => Math.min(totalPages, value + 1))
              }
              disabled={loading || currentPage >= totalPages}
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
