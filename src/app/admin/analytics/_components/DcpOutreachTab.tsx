"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";

const DCP_OUTREACH_BY_COMPANY_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:qi3EFOZR/email_delivery_log/dcp_outreach_by_company";

const DCP_PER_PAGE = 25;
const DCP_ROUND_KEYS = ["1", "2", "3"] as const;
const DCP_TOTAL_ROUND_KEYS = ["round_1", "round_2", "round_3"] as const;

type DcpEngagementFilter = "all" | "outreach_sent";

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
  opened_round_1: boolean;
  opened_round_2: boolean;
  opened_round_3: boolean;
};

type DcpRoundOpenRate = {
  sent: number;
  opened: number;
  open_rate_pct: number;
};

type DcpTotals = {
  total_companies_emailed: number;
  total_opened: number;
  total_contributed: number;
  engagement_patterns: Record<string, number>;
  round_open_rates: Record<string, DcpRoundOpenRate>;
};

type DcpOutreachTabProps = {
  onCompanyCountChange?: (count: number) => void;
};

const DCP_PATTERN_LABELS: Record<string, string> = {
  never_opened: "Never opened",
  opened_r1_only: "Opened R1 only",
  opened_r2_only: "Opened R2 only",
  opened_r3_only: "Opened R3 only",
  opened_r1_r2: "Opened R1 & R2",
  opened_r1_r3: "Opened R1 & R3",
  opened_r2_r3: "Opened R2 & R3",
  opened_all: "Opened all rounds",
};

function dcpNum(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function dcpOptionalTs(value: unknown): number | null {
  if (value == null || value === "") return null;
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
  return DCP_PATTERN_LABELS[pattern] ?? pattern.replace(/_/g, " ");
}

function dcpParseRoundLog(row: Record<string, unknown>): DcpRoundLog {
  return {
    sent_at: dcpNum(row.sent_at),
    opened_at: dcpNum(row.opened_at),
    was_opened: Boolean(row.was_opened),
    clicks: dcpNum(row.clicks),
    delivered_at: dcpOptionalTs(row.delivered_at),
    clicked_at: dcpOptionalTs(row.clicked_at),
    was_clicked: Boolean(row.was_clicked),
    status: String(row.status ?? ""),
    recipient_email: String(row.recipient_email ?? ""),
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
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  const rounds: Record<string, DcpRoundLog> = {};
  for (const [key, entry] of Object.entries(raw as Record<string, unknown>)) {
    if (!entry || typeof entry !== "object") continue;
    rounds[key] = dcpParseRoundLog(entry as Record<string, unknown>);
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

function dcpParseEngagementPatterns(
  value: unknown
): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const patterns: Record<string, number> = {};
  for (const [key, count] of Object.entries(value as Record<string, unknown>)) {
    patterns[key] = dcpNum(count);
  }
  return patterns;
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
      open_rate_pct: dcpNum(row.open_rate_pct),
    };
  }
  return rates;
}

function normalizeDcpCompanyRow(row: unknown): DcpCompanyRow {
  const r = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
  const rounds = dcpParseRounds(r.rounds);
  const lastSentAt = dcpNum(r.last_sent_at);
  const roundsSentCount = dcpRoundsSentCount(rounds);

  return {
    company_id: dcpNum(r.company_id),
    company_name: String(r.company_name ?? ""),
    company_url: String(r.company_url ?? ""),
    emails_sent_count: dcpNum(r.emails_sent_count) || roundsSentCount,
    last_sent_at: dcpEffectiveLastSentAt(lastSentAt, rounds),
    was_opened: Boolean(r.was_opened),
    was_clicked: Boolean(r.was_clicked),
    contributed: Boolean(r.contributed),
    rounds,
    engagement_pattern: String(r.engagement_pattern ?? ""),
    rounds_opened: dcpParseRoundsOpened(r.rounds_opened),
    opened_round_1: Boolean(r.opened_round_1),
    opened_round_2: Boolean(r.opened_round_2),
    opened_round_3: Boolean(r.opened_round_3),
  };
}

function normalizeDcpOutreachResponse(json: unknown): {
  companies: DcpCompanyRow[];
  page: number;
  perPage: number;
  totals: DcpTotals;
} {
  const root =
    json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  const response =
    root.response && typeof root.response === "object"
      ? (root.response as Record<string, unknown>)
      : root;

  const results = Array.isArray(response.results) ? response.results : [];
  const totalsRaw =
    response.totals && typeof response.totals === "object"
      ? (response.totals as Record<string, unknown>)
      : {};

  return {
    companies: results.map(normalizeDcpCompanyRow),
    page: Math.max(1, dcpNum(response.page) || 1),
    perPage: Math.max(1, dcpNum(response.per_page) || DCP_PER_PAGE),
    totals: {
      total_companies_emailed: dcpNum(totalsRaw.total_companies_emailed),
      total_opened: dcpNum(totalsRaw.total_opened),
      total_contributed: dcpNum(totalsRaw.total_contributed),
      engagement_patterns: dcpParseEngagementPatterns(
        totalsRaw.engagement_patterns
      ),
      round_open_rates: dcpParseRoundOpenRates(totalsRaw.round_open_rates),
    },
  };
}

function dcpOutreachQueryParams(
  dateFrom: string,
  dateTo: string,
  companyName: string,
  outreachSentOnly: boolean,
  page: number,
  perPage: number
): string {
  const params = new URLSearchParams({
    date_from: dateFrom,
    date_to: dateTo,
    company_name: companyName,
    outreach_sent_only: outreachSentOnly ? "true" : "false",
    page: String(page),
    per_page: String(perPage),
  });
  return params.toString();
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
  if (normalized === "sent") {
    return { label: "Sent", cls: "bg-green-50 text-green-700" };
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
      <h3 className="text-sm font-medium text-gray-900 mb-3">
        Open rate by round
      </h3>
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
      <h3 className="text-sm font-medium text-gray-900 mb-3">
        Engagement patterns
      </h3>
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

export function DcpOutreachTab({ onCompanyCountChange }: DcpOutreachTabProps) {
  const [companies, setCompanies] = useState<DcpCompanyRow[]>([]);
  const [totals, setTotals] = useState<DcpTotals>({
    total_companies_emailed: 0,
    total_opened: 0,
    total_contributed: 0,
    engagement_patterns: {},
    round_open_rates: {},
  });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DCP_PER_PAGE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyNameInput, setCompanyNameInput] = useState("");
  const [engagementFilter, setEngagementFilter] =
    useState<DcpEngagementFilter>("all");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const outreachSentOnly = engagementFilter === "outreach_sent";
  const outreachSentCount = Math.max(
    0,
    totals.total_companies_emailed - totals.total_contributed
  );
  const listTotal = outreachSentOnly
    ? outreachSentCount
    : totals.total_companies_emailed;
  const totalPages = Math.max(1, Math.ceil(listTotal / perPage));

  const fetchOutreach = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("asymmetrix_auth_token")
          : "";

      const load = async (outreachOnly: boolean) => {
        const res = await fetch(
          `${DCP_OUTREACH_BY_COMPANY_URL}?${dcpOutreachQueryParams(
            dateFrom,
            dateTo,
            companyName,
            outreachOnly,
            page,
            DCP_PER_PAGE
          )}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`${res.status} ${text}`);
        }
        return res.json();
      };

      let json: unknown;
      try {
        json = await load(outreachSentOnly);
      } catch (firstError) {
        if (!outreachSentOnly) throw firstError;
        json = await load(false);
      }

      const parsed = normalizeDcpOutreachResponse(json);
      const companies =
        outreachSentOnly && parsed.companies.some((c) => c.contributed)
          ? parsed.companies.filter((c) => !c.contributed)
          : parsed.companies;

      setCompanies(companies);
      setTotals(parsed.totals);
      setPage(parsed.page);
      setPerPage(parsed.perPage);
      setExpandedIds(new Set());
    } catch (e) {
      setCompanies([]);
      setTotals({
        total_companies_emailed: 0,
        total_opened: 0,
        total_contributed: 0,
        engagement_patterns: {},
        round_open_rates: {},
      });
      setError(
        e instanceof Error ? e.message : "Failed to load DCP outreach history"
      );
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, companyName, outreachSentOnly, page]);

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
    onCompanyCountChange?.(totals.total_companies_emailed);
  }, [onCompanyCountChange, totals.total_companies_emailed]);

  const openRatePct =
    totals.total_companies_emailed > 0
      ? (
          (totals.total_opened / totals.total_companies_emailed) *
          100
        ).toFixed(1)
      : "0.0";
  const contributionRatePct =
    totals.total_companies_emailed > 0
      ? (
          (totals.total_contributed / totals.total_companies_emailed) *
          100
        ).toFixed(1)
      : "0.0";

  function toggleExpanded(companyId: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(companyId)) next.delete(companyId);
      else next.add(companyId);
      return next;
    });
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
            {totals.total_companies_emailed.toLocaleString()}
          </div>
        </div>
        <div className="rounded border px-4 py-3">
          <div className="text-xs text-gray-500 mb-1">Opened email</div>
          <div className="text-2xl font-medium text-green-700">
            {totals.total_opened.toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 mt-1">{openRatePct}% open rate</div>
        </div>
        <div className="rounded border px-4 py-3">
          <div className="text-xs text-gray-500 mb-1">Contributed data</div>
          <div className="text-2xl font-medium text-blue-700">
            {totals.total_contributed.toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {contributionRatePct}% contribution rate
          </div>
        </div>
        <div className="rounded border px-4 py-3">
          <div className="text-xs text-gray-500 mb-1">Outreach sent (no data)</div>
          <div className="text-2xl font-medium text-amber-700">
            {outreachSentCount.toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            emailed, awaiting contribution
          </div>
        </div>
      </div>

      <DcpRoundOpenRateBars roundOpenRates={totals.round_open_rates} />
      <DcpEngagementPatternBreakdown patterns={totals.engagement_patterns} />

      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100">
        <span className="text-xs font-medium text-gray-500 mr-1">Show:</span>
        {(
          [
            ["all", "All outreach"],
            ["outreach_sent", "Outreach sent"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setEngagementFilter(value);
              setPage(1);
            }}
            className={`text-xs rounded-full px-3 py-1 border ${
              engagementFilter === value
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}
          >
            {label}
            <span className="ml-1 opacity-70">
              (
              {value === "all"
                ? totals.total_companies_emailed
                : outreachSentCount}
              )
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100">
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
          className="text-sm border rounded px-2 py-1.5"
          aria-label="Date from"
        />
        <span className="text-xs text-gray-400">to</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
          className="text-sm border rounded px-2 py-1.5"
          aria-label="Date to"
        />
        <input
          type="search"
          value={companyNameInput}
          onChange={(e) => setCompanyNameInput(e.target.value)}
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
              {companies.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="text-center py-8 text-sm text-gray-500"
                  >
                    No DCP outreach records match this filter.
                  </td>
                </tr>
              ) : (
                companies.map((company) => {
                  const expanded = expandedIds.has(company.company_id);
                  const roundRows = DCP_ROUND_KEYS.map((roundKey) => ({
                    roundKey,
                    round: company.rounds[roundKey],
                  })).filter(({ round }) => !!round);

                  return (
                    <Fragment key={company.company_id}>
                      <tr className="border-b border-gray-100">
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => toggleExpanded(company.company_id)}
                            className="text-gray-500 hover:text-gray-900"
                            aria-label={expanded ? "Collapse" : "Expand"}
                          >
                            {expanded ? "▼" : "▶"}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-gray-900">
                          <Link
                            href={`/company/${company.company_id}`}
                            className="text-blue-600 hover:underline"
                          >
                            {company.company_name || `Company #${company.company_id}`}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-gray-700 max-w-[180px] truncate">
                          {company.company_url ? (
                            <a
                              href={company.company_url}
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
                          <DcpRoundOpenedBadges
                            roundsOpened={company.rounds_opened}
                          />
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
                        <tr className="bg-gray-50">
                          <td colSpan={10} className="px-3 py-3">
                            <div className="text-xs font-medium text-gray-500 mb-2">
                              Round history
                            </div>
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
                                    <th
                                      key={h}
                                      className="text-left font-normal text-gray-500 px-2 py-1"
                                    >
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {roundRows.length === 0 ? (
                                  <tr>
                                    <td
                                      colSpan={8}
                                      className="px-2 py-2 text-gray-500"
                                    >
                                      No round records for this company.
                                    </td>
                                  </tr>
                                ) : (
                                  roundRows.map(({ roundKey, round }) => {
                                    if (!round) return null;
                                    const statusBadge = dcpStatusBadge(round.status);
                                    return (
                                      <tr
                                        key={roundKey}
                                        className="border-b border-gray-100 last:border-0"
                                      >
                                        <td className="px-2 py-1 font-medium text-gray-900">
                                          R{roundKey}
                                        </td>
                                        <td className="px-2 py-1 text-gray-900">
                                          {round.recipient_email || "—"}
                                        </td>
                                        <td className="px-2 py-1 whitespace-nowrap">
                                          {formatTimestamp(
                                            dcpRoundEffectiveSentAt(round) || null
                                          )}
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

      {listTotal > 0 && totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
          <span>
            Showing page {page} of {totalPages} (
            {listTotal.toLocaleString()} companies)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={loading || page <= 1}
              className="border rounded px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={loading || page >= totalPages}
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
