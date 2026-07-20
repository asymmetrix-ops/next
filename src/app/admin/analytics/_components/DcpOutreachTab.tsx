"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

const EMAIL_ANALYTICS_DCP_LIST_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:qi3EFOZR/email_delivery_log/dcp_list";

const DCP_FETCH_PER_PAGE = 100;
const DCP_COMPANY_PAGE_SIZE = 25;

type DcpEngagementFilter = "all" | "outreach_sent";

type EADcpListItem = {
  id: number;
  recipient_email: string;
  company_id: number;
  company_name: string;
  status: string;
  sent_at: number;
  delivered_at: number | null;
  opened_at: number;
  clicked_at: number | null;
  clicks: number;
  failed_reason: string;
  was_delivered: boolean;
  was_opened: boolean;
  was_clicked: boolean;
  was_responded: boolean;
  responded_at: number | null;
  has_contributed_data: boolean;
  contributed_at: number | null;
};

type EADcpListMeta = {
  page: number;
  per_page: number;
  total_count: number;
};

type EADcpSummary = {
  total_companies_sent: number;
  total_opened: number;
  total_contributed: number;
  outreach_sent_count: number;
};

type DcpCompanyGroup = {
  key: string;
  company_id: number;
  company_name: string;
  recipient_email: string;
  emails: EADcpListItem[];
  email_count: number;
  last_sent_at: number;
  was_opened: boolean;
  was_clicked: boolean;
  was_responded: boolean;
  has_contributed_data: boolean;
  total_clicks: number;
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

function dcpEffectiveSentAt(item: EADcpListItem): number {
  return item.sent_at || item.delivered_at || item.opened_at || 0;
}

function normalizeDcpListItem(row: unknown): EADcpListItem {
  const r = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
  const contributed = Boolean(
    r.has_contributed_data ??
      r.has_contributed ??
      r.contributed_data ??
      r.data_contributed
  );
  const responded = Boolean(
    r.was_responded ??
      r.has_responded ??
      (dcpOptionalTs(r.responded_at) != null)
  );

  return {
    id: dcpNum(r.id),
    recipient_email: String(r.recipient_email ?? ""),
    company_id: dcpNum(r.company_id ?? r.companies_id),
    company_name: String(r.company_name ?? r.company ?? ""),
    status: String(r.status ?? ""),
    sent_at: dcpNum(r.sent_at),
    delivered_at: dcpOptionalTs(r.delivered_at),
    opened_at: dcpNum(r.opened_at),
    clicked_at: dcpOptionalTs(r.clicked_at),
    clicks: dcpNum(r.clicks),
    failed_reason: String(r.failed_reason ?? ""),
    was_delivered: Boolean(r.was_delivered),
    was_opened: Boolean(r.was_opened),
    was_clicked: Boolean(r.was_clicked),
    was_responded: responded,
    responded_at: dcpOptionalTs(r.responded_at),
    has_contributed_data: contributed,
    contributed_at: dcpOptionalTs(r.contributed_at ?? r.data_contributed_at),
  };
}

function normalizeDcpList(json: unknown): {
  items: EADcpListItem[];
  meta: EADcpListMeta;
  summary: EADcpSummary | null;
} {
  const root =
    json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  const response =
    root.response && typeof root.response === "object"
      ? (root.response as Record<string, unknown>)
      : root;

  const results = Array.isArray(response.results) ? response.results : [];
  const items = results.map(normalizeDcpListItem);

  const summaryRaw =
    (response.summary && typeof response.summary === "object"
      ? response.summary
      : response.stats && typeof response.stats === "object"
      ? response.stats
      : null) as Record<string, unknown> | null;

  const summary = summaryRaw
    ? {
        total_companies_sent: dcpNum(
          summaryRaw.total_companies_sent ??
            summaryRaw.companies_sent ??
            summaryRaw.total_sent
        ),
        total_opened: dcpNum(
          summaryRaw.total_opened ?? summaryRaw.companies_opened
        ),
        total_contributed: dcpNum(
          summaryRaw.total_contributed ??
            summaryRaw.companies_contributed ??
            summaryRaw.contributed_count
        ),
        outreach_sent_count: dcpNum(
          summaryRaw.outreach_sent_count ?? summaryRaw.outreach_sent
        ),
      }
    : null;

  return {
    items,
    meta: {
      page: dcpNum(response.page) || 1,
      per_page: dcpNum(response.per_page) || DCP_FETCH_PER_PAGE,
      total_count: dcpNum(response.total_count),
    },
    summary,
  };
}

function emailAnalyticsDcpQueryParams(
  dateFrom: string,
  dateTo: string,
  recipientEmail: string,
  page: number,
  perPage: number
): string {
  const params = new URLSearchParams({
    date_from: dateFrom,
    date_to: dateTo,
    recipient_email: recipientEmail,
    page: String(page),
    per_page: String(perPage),
  });
  return params.toString();
}

function dcpGroupKey(item: EADcpListItem): string {
  if (item.company_id > 0) return `company:${item.company_id}`;
  const email = item.recipient_email.trim().toLowerCase();
  if (email) return `email:${email}`;
  return `record:${item.id}`;
}

function dcpGroupLabel(item: EADcpListItem): {
  company_name: string;
  recipient_email: string;
} {
  const company_name =
    item.company_name.trim() ||
    (item.recipient_email.includes("@")
      ? item.recipient_email.split("@")[1] ?? item.recipient_email
      : "Unknown company");
  return {
    company_name,
    recipient_email: item.recipient_email.trim(),
  };
}

function buildDcpCompanyGroups(items: EADcpListItem[]): DcpCompanyGroup[] {
  const map = new Map<string, DcpCompanyGroup>();

  for (const item of items) {
    const key = dcpGroupKey(item);
    const label = dcpGroupLabel(item);
    const sentAt = dcpEffectiveSentAt(item);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        key,
        company_id: item.company_id,
        company_name: label.company_name,
        recipient_email: label.recipient_email,
        emails: [item],
        email_count: 1,
        last_sent_at: sentAt,
        was_opened: item.was_opened,
        was_clicked: item.was_clicked,
        was_responded: item.was_responded,
        has_contributed_data: item.has_contributed_data,
        total_clicks: item.clicks,
      });
      continue;
    }

    existing.emails.push(item);
    existing.email_count += 1;
    existing.last_sent_at = Math.max(existing.last_sent_at, sentAt);
    existing.was_opened = existing.was_opened || item.was_opened;
    existing.was_clicked = existing.was_clicked || item.was_clicked;
    existing.was_responded = existing.was_responded || item.was_responded;
    existing.has_contributed_data =
      existing.has_contributed_data || item.has_contributed_data;
    existing.total_clicks += item.clicks;
    if (item.company_name.trim()) {
      existing.company_name = item.company_name.trim();
    }
    if (item.recipient_email.trim()) {
      existing.recipient_email = item.recipient_email.trim();
    }
    if (item.company_id > 0) {
      existing.company_id = item.company_id;
    }
  }

  return Array.from(map.values())
    .map((group) => ({
      ...group,
      emails: group.emails.sort(
        (a, b) => dcpEffectiveSentAt(b) - dcpEffectiveSentAt(a)
      ),
    }))
    .sort((a, b) => b.last_sent_at - a.last_sent_at);
}

function computeDcpSummary(groups: DcpCompanyGroup[]): EADcpSummary {
  return {
    total_companies_sent: groups.length,
    total_opened: groups.filter((g) => g.was_opened).length,
    total_contributed: groups.filter((g) => g.has_contributed_data).length,
    outreach_sent_count: groups.filter(
      (g) => g.email_count > 0 && !g.has_contributed_data
    ).length,
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

export function DcpOutreachTab({ onCompanyCountChange }: DcpOutreachTabProps) {
  const [items, setItems] = useState<EADcpListItem[]>([]);
  const [meta, setMeta] = useState<EADcpListMeta>({
    page: 1,
    per_page: DCP_FETCH_PER_PAGE,
    total_count: 0,
  });
  const [apiSummary, setApiSummary] = useState<EADcpSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientInput, setRecipientInput] = useState("");
  const [engagementFilter, setEngagementFilter] =
    useState<DcpEngagementFilter>("all");
  const [companyPage, setCompanyPage] = useState(1);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const fetchAllDcpItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("asymmetrix_auth_token")
          : "";

      const collected: EADcpListItem[] = [];
      let page = 1;
      let totalCount = 0;
      let summary: EADcpSummary | null = null;

      while (true) {
        const res = await fetch(
          `${EMAIL_ANALYTICS_DCP_LIST_URL}?${emailAnalyticsDcpQueryParams(
            dateFrom,
            dateTo,
            recipientEmail,
            page,
            DCP_FETCH_PER_PAGE
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
        const json = await res.json();
        const parsed = normalizeDcpList(json);
        collected.push(...parsed.items);
        totalCount = parsed.meta.total_count;
        if (page === 1) {
          summary = parsed.summary;
          setMeta(parsed.meta);
        }
        if (
          collected.length >= totalCount ||
          parsed.items.length === 0 ||
          page >= 50
        ) {
          break;
        }
        page += 1;
      }

      setItems(collected);
      setApiSummary(summary);
      setMeta((prev) => ({ ...prev, total_count: totalCount || collected.length }));
      setCompanyPage(1);
      setExpandedKeys(new Set());
    } catch (e) {
      setItems([]);
      setApiSummary(null);
      setMeta({ page: 1, per_page: DCP_FETCH_PER_PAGE, total_count: 0 });
      setError(
        e instanceof Error ? e.message : "Failed to load DCP outreach history"
      );
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, recipientEmail]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRecipientEmail(recipientInput.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [recipientInput]);

  useEffect(() => {
    fetchAllDcpItems();
  }, [fetchAllDcpItems]);

  const allGroups = useMemo(() => buildDcpCompanyGroups(items), [items]);

  const filteredGroups = useMemo(() => {
    if (engagementFilter !== "outreach_sent") return allGroups;
    return allGroups.filter(
      (group) => group.email_count > 0 && !group.has_contributed_data
    );
  }, [allGroups, engagementFilter]);

  const summary = useMemo(() => {
    if (apiSummary && apiSummary.total_companies_sent > 0) {
      return apiSummary;
    }
    return computeDcpSummary(allGroups);
  }, [allGroups, apiSummary]);

  useEffect(() => {
    onCompanyCountChange?.(summary.total_companies_sent);
  }, [onCompanyCountChange, summary.total_companies_sent]);

  const companyTotalPages = Math.max(
    1,
    Math.ceil(filteredGroups.length / DCP_COMPANY_PAGE_SIZE)
  );
  const pagedGroups = filteredGroups.slice(
    (companyPage - 1) * DCP_COMPANY_PAGE_SIZE,
    companyPage * DCP_COMPANY_PAGE_SIZE
  );

  const openRatePct =
    summary.total_companies_sent > 0
      ? (
          (summary.total_opened / summary.total_companies_sent) *
          100
        ).toFixed(1)
      : "0.0";
  const contributionRatePct =
    summary.total_companies_sent > 0
      ? (
          (summary.total_contributed / summary.total_companies_sent) *
          100
        ).toFixed(1)
      : "0.0";

  function toggleExpanded(key: string) {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
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
            {summary.total_companies_sent.toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {meta.total_count.toLocaleString()} delivery records
          </div>
        </div>
        <div className="rounded border px-4 py-3">
          <div className="text-xs text-gray-500 mb-1">Opened email</div>
          <div className="text-2xl font-medium text-green-700">
            {summary.total_opened.toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 mt-1">{openRatePct}% open rate</div>
        </div>
        <div className="rounded border px-4 py-3">
          <div className="text-xs text-gray-500 mb-1">Contributed data</div>
          <div className="text-2xl font-medium text-blue-700">
            {summary.total_contributed.toLocaleString()}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {contributionRatePct}% contribution rate
          </div>
        </div>
        <div className="rounded border px-4 py-3">
          <div className="text-xs text-gray-500 mb-1">Outreach sent (no data)</div>
          <div className="text-2xl font-medium text-amber-700">
            {summary.outreach_sent_count.toLocaleString()}
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
              setCompanyPage(1);
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
                ? summary.total_companies_sent
                : summary.outreach_sent_count}
              )
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100">
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="text-sm border rounded px-2 py-1.5"
          aria-label="Date from"
        />
        <span className="text-xs text-gray-400">to</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="text-sm border rounded px-2 py-1.5"
          aria-label="Date to"
        />
        <input
          type="search"
          value={recipientInput}
          onChange={(e) => setRecipientInput(e.target.value)}
          placeholder="Filter by recipient email…"
          className="text-sm border rounded px-2 py-1.5 min-w-[220px]"
        />
        {(dateFrom || dateTo || recipientInput) && (
          <button
            type="button"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
              setRecipientInput("");
              setRecipientEmail("");
            }}
            className="text-xs text-gray-500 hover:text-gray-800 underline"
          >
            Clear filters
          </button>
        )}
        <button
          type="button"
          onClick={fetchAllDcpItems}
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
                  "Contact email",
                  "Emails sent",
                  "Last sent",
                  "Opened",
                  "Clicked",
                  "Responded",
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
              {pagedGroups.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="text-center py-8 text-sm text-gray-500"
                  >
                    No DCP outreach records match this filter.
                  </td>
                </tr>
              ) : (
                pagedGroups.map((group) => {
                  const expanded = expandedKeys.has(group.key);
                  return (
                    <Fragment key={group.key}>
                      <tr className="border-b border-gray-100">
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => toggleExpanded(group.key)}
                            className="text-gray-500 hover:text-gray-900"
                            aria-label={expanded ? "Collapse" : "Expand"}
                          >
                            {expanded ? "▼" : "▶"}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-gray-900">
                          {group.company_id > 0 ? (
                            <Link
                              href={`/company/${group.company_id}`}
                              className="text-blue-600 hover:underline"
                            >
                              {group.company_name}
                            </Link>
                          ) : (
                            group.company_name
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-700">
                          {group.recipient_email || "—"}
                        </td>
                        <td className="px-3 py-2 text-gray-700">
                          {group.email_count}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                          {formatTimestamp(group.last_sent_at || null)}
                        </td>
                        <td className="px-3 py-2">
                          <DcpStatusBadge value={group.was_opened} />
                        </td>
                        <td className="px-3 py-2">
                          <DcpStatusBadge value={group.was_clicked} />
                        </td>
                        <td className="px-3 py-2">
                          <DcpStatusBadge value={group.was_responded} />
                        </td>
                        <td className="px-3 py-2">
                          <DcpStatusBadge
                            value={group.has_contributed_data}
                            positiveLabel="Contributed"
                            negativeLabel="None"
                          />
                        </td>
                      </tr>
                      {expanded ? (
                        <tr className="bg-gray-50">
                          <td colSpan={9} className="px-3 py-3">
                            <div className="text-xs font-medium text-gray-500 mb-2">
                              Email history
                            </div>
                            <table className="w-full text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-gray-200">
                                  {[
                                    "Sent",
                                    "Delivered",
                                    "Opened",
                                    "Clicked",
                                    "Clicks",
                                    "Responded",
                                    "Contributed",
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
                                {group.emails.map((email) => (
                                  <tr
                                    key={email.id}
                                    className="border-b border-gray-100 last:border-0"
                                  >
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
                                      <DcpStatusBadge
                                        value={email.was_responded}
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <DcpStatusBadge
                                        value={email.has_contributed_data}
                                        positiveLabel="Yes"
                                        negativeLabel="No"
                                      />
                                    </td>
                                    <td className="px-2 py-1">
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                                        {email.status || "—"}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
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

      {filteredGroups.length > 0 && companyTotalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
          <span>
            Showing page {companyPage} of {companyTotalPages} (
            {filteredGroups.length.toLocaleString()} companies)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCompanyPage((p) => Math.max(1, p - 1))}
              disabled={loading || companyPage <= 1}
              className="border rounded px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() =>
                setCompanyPage((p) => Math.min(companyTotalPages, p + 1))
              }
              disabled={loading || companyPage >= companyTotalPages}
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
