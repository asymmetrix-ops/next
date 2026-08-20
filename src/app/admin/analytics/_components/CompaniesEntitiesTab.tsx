"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import SearchableMultiSelect from "@/components/ui/SearchableMultiSelect";

const ANALYTICS_BASE_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:v3Rb5urZ/admin/analytics";

const SECTORS_URL = `${ANALYTICS_BASE_URL}/sectors`;
const SUMMARY_URL = `${ANALYTICS_BASE_URL}/companies/summary`;
const TABLE_URL = `${ANALYTICS_BASE_URL}/companies/table`;

const TABLE_PER_PAGE = 25;
const DEBOUNCE_MS = 300;

type PeriodType =
  | "this_month"
  | "specific_month"
  | "multiple_months"
  | "ytd"
  | "last_year";

type EntityTypeFilter = "all" | "companies" | "investors" | "advisors";
type TableSortBy = "date" | "entity_type" | "sector";
type SortDirection = "asc" | "desc";

type SectorOption = { sector_id: number; sector_name: string };

type EntityBreakdown = {
  entity_type: string;
  count: number;
  pct: number;
};

type SectorBreakdown = {
  sector_id: number;
  sector_name: string;
  count: number;
  pct: number;
};

type AdditionOverTime = {
  month: string;
  entity_type: string;
  count: number;
};

type SummaryResponse = {
  total_entities: number;
  new_entities_count: number;
  breakdown_by_entity_type: EntityBreakdown[];
  breakdown_by_primary_sector: SectorBreakdown[];
  breakdown_by_sub_sector: SectorBreakdown[];
  additions_over_time: AdditionOverTime[];
};

type TableRow = {
  id: number;
  name: string;
  entity_type: string;
  primary_sectors: string;
  sub_sectors: string;
  date_added_ms: number;
};

type TableResponse = {
  items: TableRow[];
  page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
};

type CompaniesFilters = {
  periodType: PeriodType;
  periodYear: number;
  periodMonth: number;
  periodMonths: number[];
  entityType: EntityTypeFilter;
  primarySectorIds: number[];
  subSectorIds: number[];
};

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const ENTITY_CHART_COLORS: Record<string, string> = {
  Company: "#2563eb",
  Investor: "#16a34a",
  Advisor: "#9333ea",
  Companies: "#2563eb",
  Investors: "#16a34a",
  Advisors: "#9333ea",
};

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

function appendIntArray(params: URLSearchParams, key: string, values: number[]) {
  values.forEach((id) => params.append(`${key}[]`, String(id)));
}

function buildFilterParams(filters: CompaniesFilters): URLSearchParams {
  const params = new URLSearchParams();
  params.set("period_type", filters.periodType);
  params.set("entity_type", filters.entityType);

  if (
    filters.periodType === "specific_month" ||
    filters.periodType === "multiple_months" ||
    filters.periodType === "last_year"
  ) {
    params.set("period_year", String(filters.periodYear));
  }

  if (filters.periodType === "specific_month") {
    params.set("period_month", String(filters.periodMonth));
  }

  if (filters.periodType === "multiple_months") {
    appendIntArray(params, "period_months", filters.periodMonths);
  }

  if (filters.primarySectorIds.length > 0) {
    appendIntArray(params, "primary_sector_ids", filters.primarySectorIds);
  }

  if (filters.subSectorIds.length > 0) {
    appendIntArray(params, "sub_sector_ids", filters.subSectorIds);
  }

  return params;
}

function formatMetric(v: unknown): string {
  return typeof v === "number" && Number.isFinite(v) ? String(v) : "—";
}

function formatPct(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return `${n % 1 === 0 ? Math.round(n) : n.toFixed(1)}%`;
}

function formatTimestampMs(ts: number | null | undefined): string {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return String(ts);
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  } catch {
    return String(ts);
  }
}

function entityProfileHref(row: TableRow): string | null {
  const type = row.entity_type.toLowerCase();
  if (type.includes("investor")) return `/investors/${row.id}`;
  if (type.includes("advisor")) return `/advisor/${row.id}`;
  if (type.includes("company")) return `/company/${row.id}`;
  return null;
}

function defaultFilters(): CompaniesFilters {
  const now = new Date();
  return {
    periodType: "this_month",
    periodYear: now.getFullYear(),
    periodMonth: now.getMonth() + 1,
    periodMonths: [now.getMonth() + 1],
    entityType: "all",
    primarySectorIds: [],
    subSectorIds: [],
  };
}

function HorizontalBreakdownBars(props: {
  items: Array<{ label: string; count: number; pct: number }>;
  barColor?: string;
}) {
  const { items, barColor = "#2563eb" } = props;
  const max = Math.max(...items.map((i) => i.count), 1);

  if (items.length === 0) {
    return <p className="text-sm text-gray-500">No data</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex justify-between gap-2 text-sm">
            <span className="truncate">{item.label}</span>
            <span className="shrink-0 text-gray-600">
              {formatMetric(item.count)} ({formatPct(item.pct)})
            </span>
          </div>
          <div className="h-2 rounded bg-gray-100">
            <div
              className="h-2 rounded"
              style={{
                width: `${(item.count / max) * 100}%`,
                backgroundColor: barColor,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function BreakdownSection(props: {
  title: string;
  items: Array<{ label: string; count: number; pct: number; key: string | number }>;
  barColor?: string;
}) {
  const { title, items, barColor } = props;

  return (
    <div className="rounded border bg-white p-4">
      <h3 className="mb-4 text-sm font-semibold text-gray-900">{title}</h3>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <HorizontalBreakdownBars
          items={items.map(({ label, count, pct }) => ({ label, count, pct }))}
          barColor={barColor}
        />
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-right">Count</th>
                <th className="px-3 py-2 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-center text-gray-500" colSpan={3}>
                    No data
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.key} className="border-t">
                    <td className="px-3 py-2">{item.label}</td>
                    <td className="px-3 py-2 text-right">{formatMetric(item.count)}</td>
                    <td className="px-3 py-2 text-right">{formatPct(item.pct)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function CompaniesEntitiesTab() {
  const [filters, setFilters] = useState<CompaniesFilters>(() => defaultFilters());
  const [debouncedFilters, setDebouncedFilters] = useState<CompaniesFilters>(() =>
    defaultFilters()
  );

  const [primarySectorOptions, setPrimarySectorOptions] = useState<SectorOption[]>([]);
  const [subSectorOptions, setSubSectorOptions] = useState<SectorOption[]>([]);
  const [sectorsLoading, setSectorsLoading] = useState(false);
  const [sectorsError, setSectorsError] = useState<string | null>(null);

  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [tableData, setTableData] = useState<TableResponse | null>(null);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);
  const [tablePage, setTablePage] = useState(1);
  const [tableSortBy, setTableSortBy] = useState<TableSortBy>("date");
  const [tableSortDir, setTableSortDir] = useState<SortDirection>("desc");

  const primaryLoadedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateFilters = useCallback((patch: Partial<CompaniesFilters>) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch };
      if ("primarySectorIds" in patch && patch.primarySectorIds !== prev.primarySectorIds) {
        next.subSectorIds = [];
      }
      return next;
    });
    setTablePage(1);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedFilters(filters);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filters]);

  useEffect(() => {
    let aborted = false;

    async function loadPrimarySectors() {
      setSectorsLoading(true);
      setSectorsError(null);
      try {
        const resp = await fetch(SECTORS_URL, {
          method: "GET",
          headers: authHeaders(),
        });
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          throw new Error(`${resp.status} ${resp.statusText} ${text}`);
        }
        const json = (await resp.json()) as {
          primary_sectors?: SectorOption[];
          sub_sectors?: SectorOption[];
        };
        if (!aborted) {
          setPrimarySectorOptions(Array.isArray(json.primary_sectors) ? json.primary_sectors : []);
          setSubSectorOptions([]);
          primaryLoadedRef.current = true;
        }
      } catch (e) {
        if (!aborted) {
          setSectorsError(e instanceof Error ? e.message : "Failed to load sectors");
        }
      } finally {
        if (!aborted) setSectorsLoading(false);
      }
    }

    loadPrimarySectors();
    return () => {
      aborted = true;
    };
  }, []);

  useEffect(() => {
    if (!primaryLoadedRef.current) return;

    if (debouncedFilters.primarySectorIds.length === 0) {
      setSubSectorOptions([]);
      return;
    }

    let aborted = false;

    async function loadSubSectors() {
      setSectorsLoading(true);
      setSectorsError(null);
      try {
        const params = new URLSearchParams();
        appendIntArray(
          params,
          "primary_sector_ids",
          debouncedFilters.primarySectorIds
        );

        const resp = await fetch(`${SECTORS_URL}?${params.toString()}`, {
          method: "GET",
          headers: authHeaders(),
        });
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          throw new Error(`${resp.status} ${resp.statusText} ${text}`);
        }
        const json = (await resp.json()) as {
          primary_sectors?: SectorOption[];
          sub_sectors?: SectorOption[];
        };
        if (!aborted) {
          setSubSectorOptions(Array.isArray(json.sub_sectors) ? json.sub_sectors : []);
        }
      } catch (e) {
        if (!aborted) {
          setSectorsError(e instanceof Error ? e.message : "Failed to load sub-sectors");
        }
      } finally {
        if (!aborted) setSectorsLoading(false);
      }
    }

    loadSubSectors();
    return () => {
      aborted = true;
    };
  }, [debouncedFilters.primarySectorIds]);

  useEffect(() => {
    let aborted = false;

    async function loadSummary() {
      setSummaryLoading(true);
      setSummaryError(null);
      try {
        const params = buildFilterParams(debouncedFilters);
        const resp = await fetch(`${SUMMARY_URL}?${params.toString()}`, {
          method: "GET",
          headers: authHeaders(),
        });
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          throw new Error(`${resp.status} ${resp.statusText} ${text}`);
        }
        const json = (await resp.json()) as SummaryResponse;
        if (!aborted) {
          setSummary({
            total_entities: Number(json.total_entities) || 0,
            new_entities_count: Number(json.new_entities_count) || 0,
            breakdown_by_entity_type: Array.isArray(json.breakdown_by_entity_type)
              ? json.breakdown_by_entity_type
              : [],
            breakdown_by_primary_sector: Array.isArray(json.breakdown_by_primary_sector)
              ? json.breakdown_by_primary_sector
              : [],
            breakdown_by_sub_sector: Array.isArray(json.breakdown_by_sub_sector)
              ? json.breakdown_by_sub_sector
              : [],
            additions_over_time: Array.isArray(json.additions_over_time)
              ? json.additions_over_time
              : [],
          });
        }
      } catch (e) {
        if (!aborted) {
          setSummary(null);
          setSummaryError(e instanceof Error ? e.message : "Failed to load summary");
        }
      } finally {
        if (!aborted) setSummaryLoading(false);
      }
    }

    loadSummary();
    return () => {
      aborted = true;
    };
  }, [debouncedFilters]);

  useEffect(() => {
    let aborted = false;

    async function loadTable() {
      setTableLoading(true);
      setTableError(null);
      try {
        const params = buildFilterParams(debouncedFilters);
        params.set("page", String(tablePage));
        params.set("per_page", String(TABLE_PER_PAGE));
        params.set("sort_by", tableSortBy);
        params.set("sort_dir", tableSortDir);

        const resp = await fetch(`${TABLE_URL}?${params.toString()}`, {
          method: "GET",
          headers: authHeaders(),
        });
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          throw new Error(`${resp.status} ${resp.statusText} ${text}`);
        }
        const json = (await resp.json()) as TableResponse;
        if (!aborted) {
          setTableData({
            items: Array.isArray(json.items) ? json.items : [],
            page: Number(json.page) || tablePage,
            per_page: Number(json.per_page) || TABLE_PER_PAGE,
            total_items: Number(json.total_items) || 0,
            total_pages: Number(json.total_pages) || 0,
          });
        }
      } catch (e) {
        if (!aborted) {
          setTableData(null);
          setTableError(e instanceof Error ? e.message : "Failed to load table");
        }
      } finally {
        if (!aborted) setTableLoading(false);
      }
    }

    loadTable();
    return () => {
      aborted = true;
    };
  }, [debouncedFilters, tablePage, tableSortBy, tableSortDir]);

  const primarySelectOptions = useMemo(
    () =>
      primarySectorOptions.map((s) => ({
        value: s.sector_id,
        label: s.sector_name,
      })),
    [primarySectorOptions]
  );

  const subSelectOptions = useMemo(
    () =>
      subSectorOptions.map((s) => ({
        value: s.sector_id,
        label: s.sector_name,
      })),
    [subSectorOptions]
  );

  const showSubSectorControl =
    debouncedFilters.primarySectorIds.length > 0 && subSectorOptions.length > 0;

  const entityBreakdownItems = useMemo(
    () =>
      (summary?.breakdown_by_entity_type ?? []).map((row) => ({
        key: row.entity_type,
        label: row.entity_type,
        count: row.count,
        pct: row.pct,
      })),
    [summary?.breakdown_by_entity_type]
  );

  const primaryBreakdownItems = useMemo(
    () =>
      (summary?.breakdown_by_primary_sector ?? []).map((row) => ({
        key: row.sector_id,
        label: row.sector_name,
        count: row.count,
        pct: row.pct,
      })),
    [summary?.breakdown_by_primary_sector]
  );

  const subBreakdownItems = useMemo(
    () =>
      (summary?.breakdown_by_sub_sector ?? []).map((row) => ({
        key: row.sector_id,
        label: row.sector_name,
        count: row.count,
        pct: row.pct,
      })),
    [summary?.breakdown_by_sub_sector]
  );

  const additionsChartData = useMemo(() => {
    const rows = summary?.additions_over_time ?? [];
    const byMonth = new Map<string, Record<string, number | string>>();
    const entityTypes = new Set<string>();

    rows.forEach((row) => {
      entityTypes.add(row.entity_type);
      const existing = byMonth.get(row.month) ?? { month: row.month };
      existing[row.entity_type] =
        (Number(existing[row.entity_type]) || 0) + (Number(row.count) || 0);
      byMonth.set(row.month, existing);
    });

    return {
      data: Array.from(byMonth.values()).sort((a, b) =>
        String(a.month).localeCompare(String(b.month))
      ),
      entityTypes: Array.from(entityTypes),
    };
  }, [summary?.additions_over_time]);

  function togglePeriodMonth(month: number) {
    const current = filters.periodMonths;
    const next = current.includes(month)
      ? current.filter((m) => m !== month)
      : [...current, month].sort((a, b) => a - b);
    updateFilters({ periodMonths: next.length > 0 ? next : [month] });
  }

  function onTableSort(col: TableSortBy) {
    if (tableSortBy === col) {
      setTableSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setTableSortBy(col);
      setTableSortDir(col === "date" ? "desc" : "asc");
    }
    setTablePage(1);
  }

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 8 }, (_, i) => current - i);
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded border bg-white p-4">
        <h2 className="mb-4 text-lg font-semibold">Filters</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Time period</span>
            <select
              value={filters.periodType}
              onChange={(e) =>
                updateFilters({ periodType: e.target.value as PeriodType })
              }
              className="rounded border px-3 py-2 text-sm"
            >
              <option value="this_month">This month</option>
              <option value="specific_month">Specific month</option>
              <option value="multiple_months">Multiple months</option>
              <option value="ytd">Year to date</option>
              <option value="last_year">Last year</option>
            </select>
          </label>

          {(filters.periodType === "specific_month" ||
            filters.periodType === "multiple_months" ||
            filters.periodType === "last_year") && (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Year</span>
              <select
                value={filters.periodYear}
                onChange={(e) =>
                  updateFilters({ periodYear: Number(e.target.value) })
                }
                className="rounded border px-3 py-2 text-sm"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
          )}

          {filters.periodType === "specific_month" && (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Month</span>
              <select
                value={filters.periodMonth}
                onChange={(e) =>
                  updateFilters({ periodMonth: Number(e.target.value) })
                }
                className="rounded border px-3 py-2 text-sm"
              >
                {MONTH_LABELS.map((label, idx) => (
                  <option key={label} value={idx + 1}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Entity type</span>
            <select
              value={filters.entityType}
              onChange={(e) =>
                updateFilters({ entityType: e.target.value as EntityTypeFilter })
              }
              className="rounded border px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="companies">Companies</option>
              <option value="investors">Investors</option>
              <option value="advisors">Advisors</option>
            </select>
          </label>

          <div className="md:col-span-2 xl:col-span-1">
            <span className="mb-1 block text-sm font-medium text-gray-700">
              Primary sector
            </span>
            <SearchableMultiSelect
              options={primarySelectOptions}
              selectedValues={filters.primarySectorIds}
              onSelectionChange={(values) =>
                updateFilters({ primarySectorIds: values as number[] })
              }
              placeholder={
                sectorsLoading && primarySectorOptions.length === 0
                  ? "Loading sectors..."
                  : "Select primary sectors"
              }
              disabled={sectorsLoading && primarySectorOptions.length === 0}
            />
          </div>

          {showSubSectorControl && (
            <div className="md:col-span-2 xl:col-span-1">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                Sub-sector
              </span>
              <SearchableMultiSelect
                options={subSelectOptions}
                selectedValues={filters.subSectorIds}
                onSelectionChange={(values) =>
                  updateFilters({ subSectorIds: values as number[] })
                }
                placeholder="Select sub-sectors"
                disabled={sectorsLoading}
              />
            </div>
          )}
        </div>

        {filters.periodType === "multiple_months" && (
          <div className="mt-4">
            <span className="mb-2 block text-sm font-medium text-gray-700">
              Months ({filters.periodYear})
            </span>
            <div className="flex flex-wrap gap-2">
              {MONTH_LABELS.map((label, idx) => {
                const month = idx + 1;
                const selected = filters.periodMonths.includes(month);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => togglePeriodMonth(month)}
                    className={`rounded border px-3 py-1.5 text-sm ${
                      selected
                        ? "border-black bg-black text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {sectorsError && (
          <p className="mt-3 text-sm text-red-700">{sectorsError}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded border bg-white p-4">
          <p className="text-sm text-gray-600">Total entities</p>
          <p className="mt-1 text-3xl font-semibold">
            {summaryLoading ? "…" : formatMetric(summary?.total_entities)}
          </p>
          <p className="mt-1 text-xs text-gray-500">All time — not affected by filters</p>
        </div>
        <div className="rounded border bg-white p-4">
          <p className="text-sm text-gray-600">New entities (selected period)</p>
          <p className="mt-1 text-3xl font-semibold">
            {summaryLoading ? "…" : formatMetric(summary?.new_entities_count)}
          </p>
        </div>
      </div>

      {summaryError && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {summaryError}
        </div>
      )}

      <div className="space-y-4">
        <BreakdownSection
          title="Breakdown by entity type"
          items={entityBreakdownItems}
          barColor="#2563eb"
        />

        <BreakdownSection
          title="Breakdown by primary sector"
          items={primaryBreakdownItems}
          barColor="#0891b2"
        />

        {debouncedFilters.primarySectorIds.length > 0 && (
          <BreakdownSection
            title="Breakdown by sub-sector"
            items={subBreakdownItems}
            barColor="#7c3aed"
          />
        )}

        <div className="rounded border bg-white p-4">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">
            Additions over time
          </h3>
          {summaryLoading ? (
            <p className="text-sm text-gray-500">Loading chart…</p>
          ) : additionsChartData.data.length === 0 ? (
            <p className="text-sm text-gray-500">No data</p>
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={additionsChartData.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  {additionsChartData.entityTypes.map((entityType) => (
                    <Bar
                      key={entityType}
                      dataKey={entityType}
                      stackId="additions"
                      fill={ENTITY_CHART_COLORS[entityType] ?? "#64748b"}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="rounded border bg-white">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Entities added</h3>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">
                  <button
                    onClick={() => onTableSort("entity_type")}
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    Entity type
                    {tableSortBy === "entity_type" && (
                      <span className="text-xs text-gray-500">
                        {tableSortDir === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </button>
                </th>
                <th className="px-3 py-2 text-left">
                  <button
                    onClick={() => onTableSort("sector")}
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    Primary sectors
                    {tableSortBy === "sector" && (
                      <span className="text-xs text-gray-500">
                        {tableSortDir === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </button>
                </th>
                <th className="px-3 py-2 text-left">Sub-sectors</th>
                <th className="px-3 py-2 text-left">
                  <button
                    onClick={() => onTableSort("date")}
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    Date added
                    {tableSortBy === "date" && (
                      <span className="text-xs text-gray-500">
                        {tableSortDir === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {tableLoading && (
                <tr>
                  <td className="px-3 py-3 text-center" colSpan={5}>
                    Loading…
                  </td>
                </tr>
              )}
              {tableError && !tableLoading && (
                <tr>
                  <td className="px-3 py-3 text-red-700 bg-red-50" colSpan={5}>
                    {tableError}
                  </td>
                </tr>
              )}
              {!tableLoading && !tableError && (tableData?.items.length ?? 0) === 0 && (
                <tr>
                  <td className="px-3 py-3 text-center text-gray-500" colSpan={5}>
                    No results
                  </td>
                </tr>
              )}
              {!tableLoading &&
                !tableError &&
                (tableData?.items ?? []).map((row) => {
                  const href = entityProfileHref(row);
                  return (
                    <tr key={row.id} className="border-t">
                      <td className="px-3 py-2">
                        {href ? (
                          <Link href={href} className="text-blue-600 hover:underline">
                            {row.name || "—"}
                          </Link>
                        ) : (
                          row.name || "—"
                        )}
                      </td>
                      <td className="px-3 py-2">{row.entity_type || "—"}</td>
                      <td className="px-3 py-2">{row.primary_sectors || "—"}</td>
                      <td className="px-3 py-2">{row.sub_sectors || "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatTimestampMs(row.date_added_ms)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {(tableData?.total_pages ?? 0) > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            <span className="text-gray-600">
              Page {tableData?.page ?? tablePage} of {tableData?.total_pages ?? 0}
              {" · "}
              {formatMetric(tableData?.total_items)} total
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={tablePage <= 1 || tableLoading}
                onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                className="rounded border px-3 py-1.5 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={
                  tableLoading ||
                  tablePage >= (tableData?.total_pages ?? 0)
                }
                onClick={() => setTablePage((p) => p + 1)}
                className="rounded border px-3 py-1.5 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
