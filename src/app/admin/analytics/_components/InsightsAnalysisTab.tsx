"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import SearchableMultiSelect from "@/components/ui/SearchableMultiSelect";
import { AnalyticsPeriodFilter } from "./AnalyticsPeriodFilter";
import {
  appendPeriodToParams,
  defaultPeriodFilter,
  type PeriodFilterState,
} from "./periodFilterUtils";
import {
  appendTimeGranularity,
  BreakdownDonutChart,
  buildTimeSeriesData,
  StackedTimeSeriesChart,
  TopNHorizontalBarChart,
} from "./analyticsCharts";

const ANALYTICS_BASE_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:v3Rb5urZ/admin/analytics";

const FILTERS_URL = `${ANALYTICS_BASE_URL}/content/filters`;
const SUMMARY_URL = `${ANALYTICS_BASE_URL}/content/summary`;
const TABLE_URL = `${ANALYTICS_BASE_URL}/content/table`;

const TABLE_PER_PAGE = 25;
const DEBOUNCE_MS = 300;

type TableSortBy = "date" | "content_type" | "sector";
type SortDirection = "asc" | "desc";

type SectorOption = { sector_id: number; sector_name: string };
type ContentTypeOption = { content_type: string };

type ContentTypeBreakdown = {
  content_type: string;
  count: number;
  pct: number;
};

type SectorBreakdown = {
  sector_id: number;
  sector_name: string;
  count: number;
  pct: number;
};

type OutputOverTime = {
  month: string;
  content_type: string;
  count: number;
};

type SummaryResponse = {
  total_published: number;
  breakdown_by_content_type: ContentTypeBreakdown[];
  breakdown_by_sector: SectorBreakdown[];
  output_over_time: OutputOverTime[];
};

type TableRow = {
  id: number;
  title: string;
  content_type: string;
  sector: string;
  date_published: string;
};

type TableResponse = {
  items: TableRow[];
  page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
};

type ContentFilters = PeriodFilterState & {
  contentType: string;
  sectorIds: number[];
};

const CHART_PALETTE = [
  "#2563eb",
  "#16a34a",
  "#9333ea",
  "#ea580c",
  "#0891b2",
  "#be185d",
  "#ca8a04",
  "#4f46e5",
];

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

function buildFilterParams(filters: ContentFilters): URLSearchParams {
  const params = new URLSearchParams();
  appendPeriodToParams(params, filters);
  appendTimeGranularity(params, filters);
  params.set("content_type", filters.contentType || "all");

  if (filters.sectorIds.length > 0) {
    appendIntArray(params, "sector_ids", filters.sectorIds);
  }

  return params;
}

function formatMetric(v: unknown): string {
  return typeof v === "number" && Number.isFinite(v) ? String(v) : "—";
}

function formatDatePublished(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  try {
    const d = new Date(trimmed);
    if (Number.isNaN(d.getTime())) return trimmed;
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  } catch {
    return trimmed;
  }
}

function chartColorForType(type: string, index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length] ?? "#64748b";
}

function defaultFilters(): ContentFilters {
  return {
    ...defaultPeriodFilter(),
    contentType: "all",
    sectorIds: [],
  };
}

export function InsightsAnalysisTab() {
  const [filters, setFilters] = useState<ContentFilters>(() => defaultFilters());
  const [debouncedFilters, setDebouncedFilters] = useState<ContentFilters>(() =>
    defaultFilters()
  );

  const [sectorOptions, setSectorOptions] = useState<SectorOption[]>([]);
  const [contentTypeOptions, setContentTypeOptions] = useState<string[]>([]);
  const [filtersLoading, setFiltersLoading] = useState(false);
  const [filtersError, setFiltersError] = useState<string | null>(null);

  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [tableData, setTableData] = useState<TableResponse | null>(null);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);
  const [tablePage, setTablePage] = useState(1);
  const [tableSortBy, setTableSortBy] = useState<TableSortBy>("date");
  const [tableSortDir, setTableSortDir] = useState<SortDirection>("desc");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateFilters = useCallback((patch: Partial<ContentFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
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

    async function loadFilters() {
      setFiltersLoading(true);
      setFiltersError(null);
      try {
        const resp = await fetch(FILTERS_URL, {
          method: "GET",
          headers: authHeaders(),
        });
        if (!resp.ok) {
          const text = await resp.text().catch(() => "");
          throw new Error(`${resp.status} ${resp.statusText} ${text}`);
        }
        const json = (await resp.json()) as {
          sectors?: SectorOption[];
          content_types?: ContentTypeOption[] | string[];
        };
        if (!aborted) {
          setSectorOptions(Array.isArray(json.sectors) ? json.sectors : []);
          const rawTypes = json.content_types ?? [];
          const types = rawTypes
            .map((item) =>
              typeof item === "string"
                ? item
                : typeof item === "object" && item && "content_type" in item
                  ? String((item as ContentTypeOption).content_type)
                  : ""
            )
            .filter(Boolean);
          setContentTypeOptions(types);
        }
      } catch (e) {
        if (!aborted) {
          setFiltersError(e instanceof Error ? e.message : "Failed to load filters");
        }
      } finally {
        if (!aborted) setFiltersLoading(false);
      }
    }

    loadFilters();
    return () => {
      aborted = true;
    };
  }, []);

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
            total_published: Number(json.total_published) || 0,
            breakdown_by_content_type: Array.isArray(json.breakdown_by_content_type)
              ? json.breakdown_by_content_type
              : [],
            breakdown_by_sector: Array.isArray(json.breakdown_by_sector)
              ? json.breakdown_by_sector
              : [],
            output_over_time: Array.isArray(json.output_over_time)
              ? json.output_over_time
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

  const sectorSelectOptions = useMemo(
    () =>
      sectorOptions.map((s) => ({
        value: s.sector_id,
        label: s.sector_name,
      })),
    [sectorOptions]
  );

  const contentTypeBreakdownItems = useMemo(
    () =>
      (summary?.breakdown_by_content_type ?? []).map((row) => ({
        key: row.content_type,
        label: row.content_type,
        count: row.count,
        pct: row.pct,
      })),
    [summary?.breakdown_by_content_type]
  );

  const sectorBreakdownItems = useMemo(
    () =>
      (summary?.breakdown_by_sector ?? []).map((row) => ({
        key: row.sector_id,
        label: row.sector_name,
        count: row.count,
        pct: row.pct,
      })),
    [summary?.breakdown_by_sector]
  );

  const outputChartData = useMemo(() => {
    const rows = summary?.output_over_time ?? [];
    return buildTimeSeriesData({
      rows: rows.map((row) => ({
        bucket: row.month,
        stackKey: row.content_type,
        count: row.count,
      })),
    });
  }, [summary?.output_over_time]);

  const useContentTypeDonut = contentTypeBreakdownItems.length <= 6;

  function onTableSort(col: TableSortBy) {
    if (tableSortBy === col) {
      setTableSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setTableSortBy(col);
      setTableSortDir(col === "date" ? "desc" : "asc");
    }
    setTablePage(1);
  }

  return (
    <div className="space-y-6">
      <div className="rounded border bg-white p-4">
        <h2 className="mb-4 text-lg font-semibold">Filters</h2>
        <AnalyticsPeriodFilter
          value={filters}
          onChange={updateFilters}
          className="mb-4"
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Content type</span>
            <select
              value={filters.contentType}
              onChange={(e) => updateFilters({ contentType: e.target.value })}
              disabled={filtersLoading}
              className="rounded border px-3 py-2 text-sm disabled:opacity-50"
            >
              <option value="all">All</option>
              {contentTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <div className="md:col-span-2 xl:col-span-1">
            <span className="mb-1 block text-sm font-medium text-gray-700">Sector</span>
            <SearchableMultiSelect
              options={sectorSelectOptions}
              selectedValues={filters.sectorIds}
              onSelectionChange={(values) =>
                updateFilters({ sectorIds: values as number[] })
              }
              placeholder={
                filtersLoading && sectorOptions.length === 0
                  ? "Loading sectors..."
                  : "Select sectors"
              }
              disabled={filtersLoading && sectorOptions.length === 0}
            />
          </div>
        </div>

        {filtersError && (
          <p className="mt-3 text-sm text-red-700">{filtersError}</p>
        )}
      </div>

      <div className="rounded border bg-white p-4">
        <p className="text-sm text-gray-600">Published (selected period)</p>
        <p className="mt-1 text-3xl font-semibold">
          {summaryLoading ? "…" : formatMetric(summary?.total_published)}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Excludes QA/test content · keyed on publication date
        </p>
      </div>

      {summaryError && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {summaryError}
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {useContentTypeDonut ? (
            <BreakdownDonutChart
              title="Breakdown by content type"
              items={contentTypeBreakdownItems}
              colorForLabel={chartColorForType}
              loading={summaryLoading}
            />
          ) : (
            <TopNHorizontalBarChart
              title="Top content types"
              items={contentTypeBreakdownItems}
              loading={summaryLoading}
            />
          )}
          <TopNHorizontalBarChart
            title="Top sectors"
            items={sectorBreakdownItems}
            barColor="#0891b2"
            loading={summaryLoading}
          />
        </div>

        <StackedTimeSeriesChart
          title="Output over time"
          data={outputChartData.data}
          stackKeys={outputChartData.stackKeys}
          colorForKey={chartColorForType}
          loading={summaryLoading}
        />
      </div>

      <div className="rounded border bg-white">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Published content</h3>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">
                  <button
                    onClick={() => onTableSort("content_type")}
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    Content type
                    {tableSortBy === "content_type" && (
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
                    Sector
                    {tableSortBy === "sector" && (
                      <span className="text-xs text-gray-500">
                        {tableSortDir === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </button>
                </th>
                <th className="px-3 py-2 text-left">
                  <button
                    onClick={() => onTableSort("date")}
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    Date published
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
                  <td className="px-3 py-3 text-center" colSpan={4}>
                    Loading…
                  </td>
                </tr>
              )}
              {tableError && !tableLoading && (
                <tr>
                  <td className="px-3 py-3 text-red-700 bg-red-50" colSpan={4}>
                    {tableError}
                  </td>
                </tr>
              )}
              {!tableLoading && !tableError && (tableData?.items.length ?? 0) === 0 && (
                <tr>
                  <td className="px-3 py-3 text-center text-gray-500" colSpan={4}>
                    No results
                  </td>
                </tr>
              )}
              {!tableLoading &&
                !tableError &&
                (tableData?.items ?? []).map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-3 py-2">
                      <Link
                        href={`/article/${row.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {row.title || "—"}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{row.content_type || "—"}</td>
                    <td className="px-3 py-2">{row.sector || "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatDatePublished(row.date_published)}
                    </td>
                  </tr>
                ))}
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
