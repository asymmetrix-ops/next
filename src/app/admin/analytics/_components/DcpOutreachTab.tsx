"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";

const DCP_OUTREACH_BY_COMPANY_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:qi3EFOZR/email_delivery_log/dcp_outreach_by_company";

const DCP_PER_PAGE = 25;

type DcpEngagementFilter = "all" | "outreach_sent";

type DcpEmailLog = {
  log_id: number;
  recipient_email: string;
  status: string;
  sent_at: number;
  delivered_at: number | null;
  opened_at: number;
  clicked_at: number | null;
  clicks: number;
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
  emails: DcpEmailLog[];
};

type DcpTotals = {
  total_companies_emailed: number;
  total_opened: number;
  total_contributed: number;
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

function dcpParseEmails(value: unknown): DcpEmailLog[] {
  let raw: unknown = value;
  if (typeof raw === "string" && raw.trim()) {
    try {
      raw = JSON.parse(raw) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
    .map((r) => ({
      log_id: dcpNum(r.log_id ?? r.id),
      recipient_email: String(r.recipient_email ?? ""),
      status: String(r.status ?? ""),
      sent_at: dcpNum(r.sent_at),
      delivered_at: dcpOptionalTs(r.delivered_at),
      opened_at: dcpNum(r.opened_at),
      clicked_at: dcpOptionalTs(r.clicked_at),
      clicks: dcpNum(r.clicks),
    }))
    .sort(
      (a, b) =>
        (b.sent_at || b.delivered_at || b.opened_at || b.clicked_at || 0) -
        (a.sent_at || a.delivered_at || a.opened_at || a.clicked_at || 0)
    );
}

function dcpEffectiveSentAt(email: DcpEmailLog): number {
  return email.sent_at || email.delivered_at || email.opened_at || email.clicked_at || 0;
}

function dcpEffectiveLastSentAt(
  lastSentAt: number,
  emails: DcpEmailLog[]
): number {
  if (lastSentAt > 0) return lastSentAt;
  return emails.reduce(
    (max, email) => Math.max(max, dcpEffectiveSentAt(email)),
    0
  );
}

function normalizeDcpCompanyRow(row: unknown): DcpCompanyRow {
  const r = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
  const emails = dcpParseEmails(r.emails);
  const lastSentAt = dcpNum(r.last_sent_at);

  return {
    company_id: dcpNum(r.company_id),
    company_name: String(r.company_name ?? ""),
    company_url: String(r.company_url ?? ""),
    emails_sent_count: dcpNum(r.emails_sent_count) || emails.length,
    last_sent_at: dcpEffectiveLastSentAt(lastSentAt, emails),
    was_opened: Boolean(r.was_opened),
    was_clicked: Boolean(r.was_clicked),
    contributed: Boolean(r.contributed),
    emails,
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

export function DcpOutreachTab({ onCompanyCountChange }: DcpOutreachTabProps) {
  const [companies, setCompanies] = useState<DcpCompanyRow[]>([]);
  const [totals, setTotals] = useState<DcpTotals>({
    total_companies_emailed: 0,
    total_opened: 0,
    total_contributed: 0,
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
                  "Emails sent",
                  "Last sent",
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
                    colSpan={8}
                    className="text-center py-8 text-sm text-gray-500"
                  >
                    No DCP outreach records match this filter.
                  </td>
                </tr>
              ) : (
                companies.map((company) => {
                  const expanded = expandedIds.has(company.company_id);
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
                          <td colSpan={8} className="px-3 py-3">
                            <div className="text-xs font-medium text-gray-500 mb-2">
                              Email history
                            </div>
                            <table className="w-full text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-gray-200">
                                  {[
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
                                {company.emails.length === 0 ? (
                                  <tr>
                                    <td
                                      colSpan={7}
                                      className="px-2 py-2 text-gray-500"
                                    >
                                      No email records for this company.
                                    </td>
                                  </tr>
                                ) : (
                                  company.emails.map((email) => {
                                    const statusBadge = dcpStatusBadge(email.status);
                                    return (
                                      <tr
                                        key={email.log_id}
                                        className="border-b border-gray-100 last:border-0"
                                      >
                                        <td className="px-2 py-1 text-gray-900">
                                          {email.recipient_email || "—"}
                                        </td>
                                        <td className="px-2 py-1 whitespace-nowrap">
                                          {formatTimestamp(
                                            dcpEffectiveSentAt(email) || null
                                          )}
                                        </td>
                                        <td className="px-2 py-1 whitespace-nowrap">
                                          {formatTimestamp(email.delivered_at)}
                                        </td>
                                        <td className="px-2 py-1 whitespace-nowrap">
                                          {formatTimestamp(
                                            email.opened_at || null
                                          )}
                                        </td>
                                        <td className="px-2 py-1 whitespace-nowrap">
                                          {formatTimestamp(email.clicked_at)}
                                        </td>
                                        <td className="px-2 py-1">{email.clicks}</td>
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
