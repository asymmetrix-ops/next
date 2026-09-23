"use client";

import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const MCP_AUDIT_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:v3Rb5urZ/mcp_audit";

const COMPANIES_PER_PAGE = 25;
const SESSIONS_PER_PAGE = 20;

const TOOL_LABELS: Record<string, string> = {
  get_corporate_events: "Corporate events",
  search_content: "Research & articles",
  search_companies: "Company search",
  get_company_details: "Company profile",
  get_company_events: "Company activity",
  get_company_individuals: "People at company",
  get_content: "Article details",
  list_sectors: "Sector lookup",
  search_companies_advanced: "Company search (advanced)",
};

const PARAM_LABELS: Record<string, string> = {
  Page: "Page",
  Per_page: "Results per page",
  per_page: "Results per page",
  Offset: "Page",
  Date_start: "From date",
  Date_end: "To date",
  query: "Search term",
  search_query: "Search term",
  company_id: "Company",
  content_id: "Article",
  Continental_Region: "Region",
  business_focus_ids: "Business focus",
  primary_sectors_ids: "Sectors",
};

type McpAuditCompany = {
  company_id: number;
  company_name: string;
  total_queries: number;
  unique_sessions: number;
  unique_users: number;
  distinct_tools: number;
  first_query_at: number;
  last_query_at: number;
};

type McpAuditMessage = {
  id: number;
  tool_name: string;
  user_query: string;
  response: string;
  query_params: Record<string, unknown> | string;
  created_at: number;
  user_id: number;
  user_name: string;
};

type McpAuditSession = {
  session_id: string;
  started_at: number;
  last_active_at: number;
  message_count: number;
  unique_users: number;
  user_id: number;
  user_name: string;
  tools_used: string[];
  messages: McpAuditMessage[];
};

function mcpNum(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeTimestampMs(ts: number | null | undefined): number {
  if (!ts || !Number.isFinite(ts)) return 0;
  if (ts < 1_000_000_000_000) return ts * 1000;
  return ts;
}

function formatDateTime(ts: number | null | undefined): string {
  const ms = normalizeTimestampMs(ts);
  if (!ms) return "—";
  try {
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function formatShortDateTime(ts: number | null | undefined): string {
  const ms = normalizeTimestampMs(ts);
  if (!ms) return "—";
  try {
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function formatRelativeTime(ts: number | null | undefined): string {
  const ms = normalizeTimestampMs(ts);
  if (!ms) return "";
  const diffMs = Date.now() - ms;
  const diffMins = Math.round(diffMs / 60_000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  const diffMonths = Math.round(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} mo ago`;
  const diffYears = Math.round(diffDays / 365);
  return `${diffYears} yr ago`;
}

function toolLabel(tool: string): string {
  if (!tool) return "Unknown action";
  return TOOL_LABELS[tool] ?? tool.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function truncateText(text: string, maxLength: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength).trim()}…`;
}

function sessionSummary(session: McpAuditSession): string {
  const firstQuery = session.messages.find((m) => m.user_query.trim())?.user_query;
  if (firstQuery) return truncateText(firstQuery, 80);
  return `Activity on ${formatShortDateTime(session.started_at)}`;
}

function parseQueryParams(value: unknown): Record<string, unknown> | string {
  if (value == null) return {};
  if (typeof value === "string") {
    if (!value.trim()) return {};
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return value;
    } catch {
      return value;
    }
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return String(value);
}

function humanizeParamValue(key: string, value: unknown): string {
  if (value == null || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  const str = String(value);
  if (key.toLowerCase().includes("date") && /^\d{4}-\d{2}-\d{2}/.test(str)) {
    try {
      return new Date(str).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return str;
    }
  }
  return str;
}

function readableParams(
  params: Record<string, unknown> | string
): Array<{ label: string; value: string }> {
  if (typeof params === "string") return [];
  const hidden = new Set(["session_id", "user_query", "Session_id"]);
  const rows: Array<{ label: string; value: string }> = [];

  for (const [key, value] of Object.entries(params)) {
    if (hidden.has(key)) continue;
    if (value == null || value === "") continue;
    rows.push({
      label: PARAM_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      value: humanizeParamValue(key, value),
    });
  }
  return rows;
}

function normalizeMessage(row: unknown): McpAuditMessage {
  const r = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
  return {
    id: mcpNum(r.id),
    tool_name: String(r.tool_name ?? ""),
    user_query: String(r.user_query ?? ""),
    response: String(r.response ?? ""),
    query_params: parseQueryParams(r.query_params),
    created_at: mcpNum(r.created_at),
    user_id: mcpNum(r.user_id),
    user_name: String(r.user_name ?? ""),
  };
}

function normalizeSession(row: unknown): McpAuditSession {
  const r = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
  const messages = Array.isArray(r.messages) ? r.messages.map(normalizeMessage) : [];
  const toolsUsed = Array.isArray(r.tools_used)
    ? r.tools_used.map((t) => String(t))
    : [];

  return {
    session_id: String(r.session_id ?? ""),
    started_at: mcpNum(r.started_at),
    last_active_at: mcpNum(r.last_active_at),
    message_count: mcpNum(r.message_count) || messages.length,
    unique_users: mcpNum(r.unique_users),
    user_id: mcpNum(r.user_id),
    user_name: String(r.user_name ?? ""),
    tools_used: toolsUsed,
    messages,
  };
}

function normalizeCompany(row: unknown): McpAuditCompany {
  const r = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
  return {
    company_id: mcpNum(r.company_id),
    company_name: String(r.company_name ?? ""),
    total_queries: mcpNum(r.total_queries),
    unique_sessions: mcpNum(r.unique_sessions),
    unique_users: mcpNum(r.unique_users),
    distinct_tools: mcpNum(r.distinct_tools),
    first_query_at: mcpNum(r.first_query_at),
    last_query_at: mcpNum(r.last_query_at),
  };
}

function auditQueryParams(
  page: number,
  perPage: number,
  dateFrom: string,
  dateTo: string,
  companyId?: number
): string {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    date_from: dateFrom,
    date_to: dateTo,
  });
  if (companyId != null && companyId > 0) {
    params.set("company_id", String(companyId));
  }
  return params.toString();
}

async function authFetch(url: string): Promise<Response> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("asymmetrix_auth_token")
      : "";
  return fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

function isTableSeparatorLine(line: string): boolean {
  return /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line.trim());
}

function parsePipeTableRow(line: string): string[] | null {
  const trimmed = line.trim().replace(/^\|+/, "|").replace(/\|+$/, "|");
  if (!trimmed.includes("|")) return null;
  if (isTableSeparatorLine(trimmed)) return null;

  let row = trimmed;
  if (row.startsWith("|")) row = row.slice(1);
  if (row.endsWith("|")) row = row.slice(0, -1);

  const cells = row.split("|").map((cell) => cell.trim());
  return cells.length >= 2 ? cells : null;
}

function isPipeTableLine(line: string): boolean {
  return parsePipeTableRow(line) !== null || isTableSeparatorLine(line);
}

type ResponseSegment =
  | { type: "text"; content: string }
  | { type: "table"; rows: string[][]; hasHeader: boolean };

function splitResponseSegments(text: string): ResponseSegment[] {
  const lines = text.split("\n");
  const segments: ResponseSegment[] = [];
  let textBuffer: string[] = [];
  let tableBuffer: string[] = [];

  function flushText() {
    const content = textBuffer.join("\n").trim();
    if (content) segments.push({ type: "text", content: textBuffer.join("\n") });
    textBuffer = [];
  }

  function flushTable() {
    if (tableBuffer.length === 0) return;

    const rows: string[][] = [];
    let hasHeader = false;
    let index = 0;

    if (tableBuffer.length >= 2 && isTableSeparatorLine(tableBuffer[1])) {
      const header = parsePipeTableRow(tableBuffer[0]);
      if (header) {
        rows.push(header);
        hasHeader = true;
      }
      index = 2;
    }

    for (; index < tableBuffer.length; index++) {
      const line = tableBuffer[index];
      if (isTableSeparatorLine(line)) continue;
      const row = parsePipeTableRow(line);
      if (row) rows.push(row);
    }

    if (rows.length > 0) {
      segments.push({ type: "table", rows, hasHeader });
    } else {
      textBuffer.push(...tableBuffer);
    }
    tableBuffer = [];
  }

  for (const line of lines) {
    if (isPipeTableLine(line)) {
      if (tableBuffer.length === 0) flushText();
      tableBuffer.push(line);
      continue;
    }
    flushTable();
    textBuffer.push(line);
  }

  flushTable();
  flushText();
  return segments;
}

function markdownComponents() {
  return {
    table: ({ children }: { children?: ReactNode }) => (
      <div className="my-3 overflow-x-auto rounded border border-gray-200">
        <table className="min-w-full text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }: { children?: ReactNode }) => (
      <thead className="bg-gray-50 text-gray-700">{children}</thead>
    ),
    tbody: ({ children }: { children?: ReactNode }) => (
      <tbody className="divide-y divide-gray-100">{children}</tbody>
    ),
    tr: ({ children }: { children?: ReactNode }) => <tr>{children}</tr>,
    th: ({ children }: { children?: ReactNode }) => (
      <th className="px-3 py-2 text-left font-medium whitespace-nowrap">{children}</th>
    ),
    td: ({ children }: { children?: ReactNode }) => (
      <td className="px-3 py-2 align-top text-gray-800">{children}</td>
    ),
    p: ({ children }: { children?: ReactNode }) => (
      <p className="mb-2 last:mb-0 whitespace-pre-wrap">{children}</p>
    ),
    strong: ({ children }: { children?: ReactNode }) => (
      <strong className="font-semibold text-gray-900">{children}</strong>
    ),
    ul: ({ children }: { children?: ReactNode }) => (
      <ul className="mb-2 list-disc space-y-1 pl-5">{children}</ul>
    ),
    ol: ({ children }: { children?: ReactNode }) => (
      <ol className="mb-2 list-decimal space-y-1 pl-5">{children}</ol>
    ),
    li: ({ children }: { children?: ReactNode }) => (
      <li className="text-gray-800">{children}</li>
    ),
  };
}

function ResponseTable({
  rows,
  hasHeader,
}: {
  rows: string[][];
  hasHeader: boolean;
}) {
  const bodyRows = hasHeader ? rows.slice(1) : rows;
  const headerRow = hasHeader ? rows[0] : null;

  return (
    <div className="my-3 overflow-x-auto rounded border border-gray-200">
      <table className="min-w-full text-sm">
        {headerRow ? (
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              {headerRow.map((cell, index) => (
                <th
                  key={`${cell}-${index}`}
                  className="px-3 py-2 text-left font-medium whitespace-nowrap"
                >
                  {cell || " "}
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody className="divide-y divide-gray-100">
          {bodyRows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td
                  key={`${rowIndex}-${cellIndex}`}
                  className="px-3 py-2 align-top text-gray-800"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResponseContent({
  text,
  emptyLabel = "No result returned",
  maxLength = 600,
}: {
  text: string;
  emptyLabel?: string;
  maxLength?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const trimmed = text.trim();

  if (!trimmed) {
    return <span className="text-gray-400 italic">{emptyLabel}</span>;
  }

  const segments = splitResponseSegments(trimmed);
  const isLong = trimmed.length > maxLength;

  return (
    <div>
      <div
        className={`relative text-sm text-gray-800 ${
          !expanded && isLong ? "max-h-72 overflow-hidden" : ""
        }`}
      >
        {segments.map((segment, index) => {
          if (segment.type === "table") {
            return (
              <ResponseTable
                key={`table-${index}`}
                rows={segment.rows}
                hasHeader={segment.hasHeader}
              />
            );
          }

          return (
            <div key={`text-${index}`} className="response-markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents()}>
                {segment.content}
              </ReactMarkdown>
            </div>
          );
        })}
        {!expanded && isLong ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
        ) : null}
      </div>
      {isLong ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 text-sm text-blue-600 hover:underline"
        >
          {expanded ? "Show less" : "Read full answer"}
        </button>
      ) : null}
    </div>
  );
}

function ActionBadges({ tools }: { tools: string[] }) {
  if (tools.length === 0) return <span className="text-gray-400">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {tools.map((tool) => (
        <span
          key={tool}
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-800"
        >
          {toolLabel(tool)}
        </span>
      ))}
    </div>
  );
}

function FilterDetails({
  params,
}: {
  params: Record<string, unknown> | string;
}) {
  const [open, setOpen] = useState(false);
  const rows = readableParams(params);
  if (rows.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-gray-500 hover:text-gray-700 hover:underline"
      >
        {open ? "Hide search filters" : "Show search filters"}
      </button>
      {open && (
        <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex gap-2">
              <dt className="text-gray-500 shrink-0">{label}:</dt>
              <dd className="text-gray-700 break-words">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function PaginationBar({
  page,
  totalPages,
  totalLabel,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalLabel: string;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 border-t text-sm text-gray-600">
      <span>{totalLabel}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-50"
        >
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="px-3 py-1 rounded border disabled:opacity-40 hover:bg-gray-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function McpAuditTab() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");

  const [companies, setCompanies] = useState<McpAuditCompany[]>([]);
  const [filterCompanies, setFilterCompanies] = useState<McpAuditCompany[]>([]);
  const [companiesPage, setCompaniesPage] = useState(1);
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companiesError, setCompaniesError] = useState<string | null>(null);

  const [sessions, setSessions] = useState<McpAuditSession[]>([]);
  const [sessionsPage, setSessionsPage] = useState(1);
  const [totalSessions, setTotalSessions] = useState(0);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(
    new Set()
  );

  const companyFilterOptions = useMemo(() => {
    return filterCompanies
      .slice()
      .sort((a, b) => a.company_name.localeCompare(b.company_name));
  }, [filterCompanies]);

  const selectedCompany = useMemo(() => {
    const id = Number(selectedCompanyId);
    if (!Number.isFinite(id) || id <= 0) return null;
    return companyFilterOptions.find((c) => c.company_id === id) ?? null;
  }, [selectedCompanyId, companyFilterOptions]);

  const companiesTotalPages = Math.max(
    1,
    Math.ceil(totalCompanies / COMPANIES_PER_PAGE)
  );
  const sessionsTotalPages = Math.max(
    1,
    Math.ceil(totalSessions / SESSIONS_PER_PAGE)
  );

  const fetchFilterCompanies = useCallback(async () => {
    try {
      const res = await authFetch(
        `${MCP_AUDIT_BASE}/companies?${auditQueryParams(
          1,
          100,
          dateFrom,
          dateTo
        )}`
      );
      if (!res.ok) return;
      const json = (await res.json()) as Record<string, unknown>;
      const rows = Array.isArray(json.companies) ? json.companies : [];
      setFilterCompanies(rows.map(normalizeCompany));
    } catch {
      setFilterCompanies([]);
    }
  }, [dateFrom, dateTo]);

  const fetchCompanies = useCallback(async () => {
    setCompaniesLoading(true);
    setCompaniesError(null);
    try {
      const res = await authFetch(
        `${MCP_AUDIT_BASE}/companies?${auditQueryParams(
          companiesPage,
          COMPANIES_PER_PAGE,
          dateFrom,
          dateTo
        )}`
      );
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`${res.status} ${text}`);
      }
      const json = (await res.json()) as Record<string, unknown>;
      const rows = Array.isArray(json.companies) ? json.companies : [];
      setCompanies(rows.map(normalizeCompany));
      setTotalCompanies(mcpNum(json.total_companies) || rows.length);
      if (json.page) setCompaniesPage(Math.max(1, mcpNum(json.page)));
    } catch (e) {
      setCompanies([]);
      setTotalCompanies(0);
      setCompaniesError(
        e instanceof Error ? e.message : "Could not load company usage data"
      );
    } finally {
      setCompaniesLoading(false);
    }
  }, [companiesPage, dateFrom, dateTo]);

  const fetchSessions = useCallback(async () => {
    const companyId = Number(selectedCompanyId);
    if (!Number.isFinite(companyId) || companyId <= 0) {
      setSessions([]);
      setTotalSessions(0);
      setSessionsError(null);
      return;
    }

    setSessionsLoading(true);
    setSessionsError(null);
    try {
      const res = await authFetch(
        `${MCP_AUDIT_BASE}/company/${companyId}/sessions?${auditQueryParams(
          sessionsPage,
          SESSIONS_PER_PAGE,
          dateFrom,
          dateTo,
          companyId
        )}`
      );
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`${res.status} ${text}`);
      }
      const json = (await res.json()) as Record<string, unknown>;
      const rows = Array.isArray(json.sessions) ? json.sessions : [];
      setSessions(rows.map(normalizeSession));
      setTotalSessions(mcpNum(json.total_sessions) || rows.length);
      if (json.page) setSessionsPage(Math.max(1, mcpNum(json.page)));
      setExpandedSessions(new Set());
    } catch (e) {
      setSessions([]);
      setTotalSessions(0);
      setSessionsError(
        e instanceof Error ? e.message : "Could not load activity history"
      );
    } finally {
      setSessionsLoading(false);
    }
  }, [selectedCompanyId, sessionsPage, dateFrom, dateTo]);

  useEffect(() => {
    setCompaniesPage(1);
    setSessionsPage(1);
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchFilterCompanies();
  }, [fetchFilterCompanies]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  function toggleSession(sessionId: string) {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  }

  function applyFilters() {
    setCompaniesPage(1);
    setSessionsPage(1);
  }

  const overviewTotals = useMemo(() => {
    return companies.reduce(
      (acc, c) => ({
        total_queries: acc.total_queries + c.total_queries,
        unique_sessions: acc.unique_sessions + c.unique_sessions,
        unique_users: acc.unique_users + c.unique_users,
      }),
      { total_queries: 0, unique_sessions: 0, unique_users: 0 }
    );
  }, [companies]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        See how client teams are using the Asymmetrix data assistant — what they
        asked for, when, and what data was retrieved.
      </p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            From
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 w-full rounded border"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            To
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 w-full rounded border"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Client company
          </label>
          <select
            value={selectedCompanyId}
            onChange={(e) => {
              setSelectedCompanyId(e.target.value);
              setSessionsPage(1);
            }}
            className="px-3 py-2 w-full rounded border"
          >
            <option value="">All companies</option>
            {companyFilterOptions.map((c) => (
              <option key={c.company_id} value={String(c.company_id)}>
                {c.company_name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={applyFilters}
            className="px-4 py-2 w-full rounded border bg-gray-900 text-white hover:bg-gray-800"
          >
            Update
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="bg-white rounded border px-4 py-3">
          <div className="text-xs text-gray-500">Data requests</div>
          <div className="text-2xl font-semibold">{overviewTotals.total_queries}</div>
        </div>
        <div className="bg-white rounded border px-4 py-3">
          <div className="text-xs text-gray-500">Conversations</div>
          <div className="text-2xl font-semibold">{overviewTotals.unique_sessions}</div>
        </div>
        <div className="bg-white rounded border px-4 py-3">
          <div className="text-xs text-gray-500">Client companies</div>
          <div className="text-2xl font-semibold">{totalCompanies}</div>
        </div>
      </div>

      <div className="bg-white rounded border">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-medium">Usage by company</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            How often each client has used the data assistant
          </p>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-2 text-left whitespace-nowrap">Company</th>
                <th className="px-4 py-2 text-left whitespace-nowrap">Requests</th>
                <th className="px-4 py-2 text-left whitespace-nowrap">Conversations</th>
                <th className="px-4 py-2 text-left whitespace-nowrap">First used</th>
                <th className="px-4 py-2 text-left whitespace-nowrap">Last used</th>
                <th className="px-4 py-2 text-left whitespace-nowrap" />
              </tr>
            </thead>
            <tbody>
              {companiesLoading && (
                <tr>
                  <td className="px-4 py-4 text-center text-gray-500" colSpan={6}>
                    Loading…
                  </td>
                </tr>
              )}
              {companiesError && !companiesLoading && (
                <tr>
                  <td className="px-4 py-4 text-red-700 bg-red-50" colSpan={6}>
                    {companiesError}
                  </td>
                </tr>
              )}
              {!companiesLoading && !companiesError && companies.length === 0 && (
                <tr>
                  <td className="px-4 py-4 text-center text-gray-500" colSpan={6}>
                    No activity found for this period
                  </td>
                </tr>
              )}
              {!companiesLoading &&
                !companiesError &&
                companies.map((row) => (
                  <tr key={row.company_id} className="border-t">
                    <td className="px-4 py-3 whitespace-nowrap font-medium">
                      {row.company_name}
                    </td>
                    <td className="px-4 py-3">{row.total_queries}</td>
                    <td className="px-4 py-3">{row.unique_sessions}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>{formatShortDateTime(row.first_query_at)}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>{formatShortDateTime(row.last_query_at)}</div>
                      <div className="text-xs text-gray-400">
                        {formatRelativeTime(row.last_query_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCompanyId(String(row.company_id));
                          setSessionsPage(1);
                        }}
                        className="text-blue-600 hover:underline"
                      >
                        View activity
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <PaginationBar
          page={companiesPage}
          totalPages={companiesTotalPages}
          totalLabel={`${totalCompanies} companies`}
          onPageChange={setCompaniesPage}
        />
      </div>

      {selectedCompany && (
        <div className="bg-white rounded border">
          <div className="px-4 py-3 border-b">
            <h2 className="text-sm font-medium">
              Activity — {selectedCompany.company_name}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {selectedCompany.total_queries} requests across{" "}
              {selectedCompany.unique_sessions} conversations
            </p>
          </div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left w-8" />
                  <th className="px-4 py-2 text-left">Conversation</th>
                  <th className="px-4 py-2 text-left whitespace-nowrap">Steps</th>
                  <th className="px-4 py-2 text-left whitespace-nowrap">Data accessed</th>
                  <th className="px-4 py-2 text-left whitespace-nowrap">Started</th>
                  <th className="px-4 py-2 text-left whitespace-nowrap">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {sessionsLoading && (
                  <tr>
                    <td className="px-4 py-4 text-center text-gray-500" colSpan={6}>
                      Loading activity…
                    </td>
                  </tr>
                )}
                {sessionsError && !sessionsLoading && (
                  <tr>
                    <td className="px-4 py-4 text-red-700 bg-red-50" colSpan={6}>
                      {sessionsError}
                    </td>
                  </tr>
                )}
                {!sessionsLoading && !sessionsError && sessions.length === 0 && (
                  <tr>
                    <td className="px-4 py-4 text-center text-gray-500" colSpan={6}>
                      No conversations found for this period
                    </td>
                  </tr>
                )}
                {!sessionsLoading &&
                  !sessionsError &&
                  sessions.map((session) => {
                    const expanded = expandedSessions.has(session.session_id);
                    return (
                      <Fragment key={session.session_id}>
                        <tr
                          className="border-t hover:bg-gray-50 cursor-pointer"
                          onClick={() => toggleSession(session.session_id)}
                        >
                          <td className="px-4 py-3 text-gray-400">
                            {expanded ? "▼" : "▶"}
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <div className="font-medium text-gray-900 line-clamp-2">
                              {sessionSummary(session)}
                            </div>
                          </td>
                          <td className="px-4 py-3">{session.message_count}</td>
                          <td className="px-4 py-3">
                            <ActionBadges tools={session.tools_used} />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div>{formatDateTime(session.started_at)}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div>{formatDateTime(session.last_active_at)}</div>
                            <div className="text-xs text-gray-400">
                              {formatRelativeTime(session.last_active_at)}
                            </div>
                          </td>
                        </tr>
                        {expanded && (
                          <tr className="bg-gray-50">
                            <td colSpan={6} className="px-4 py-4">
                              <div className="space-y-4">
                                {session.messages.map((msg, index) => (
                                  <div
                                    key={msg.id || index}
                                    className="bg-white rounded-lg border p-4"
                                  >
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-800">
                                        {toolLabel(msg.tool_name)}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {formatDateTime(msg.created_at)}
                                        {formatRelativeTime(msg.created_at)
                                          ? ` · ${formatRelativeTime(msg.created_at)}`
                                          : ""}
                                      </span>
                                    </div>

                                    {msg.user_query.trim() ? (
                                      <div className="mb-3">
                                        <div className="text-xs font-medium text-gray-500 mb-1">
                                          Question
                                        </div>
                                        <p className="text-gray-900">{msg.user_query}</p>
                                      </div>
                                    ) : null}

                                    <div>
                                      <div className="text-xs font-medium text-gray-500 mb-1">
                                        Answer
                                      </div>
                                      <ResponseContent
                                        text={msg.response}
                                        emptyLabel="Data was retrieved but no summary was recorded"
                                      />
                                    </div>

                                    <FilterDetails params={msg.query_params} />
                                  </div>
                                ))}
                                {session.messages.length === 0 && (
                                  <p className="text-sm text-gray-500">
                                    No steps recorded for this conversation
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <PaginationBar
            page={sessionsPage}
            totalPages={sessionsTotalPages}
            totalLabel={`${totalSessions} conversations`}
            onPageChange={setSessionsPage}
          />
        </div>
      )}
    </div>
  );
}
