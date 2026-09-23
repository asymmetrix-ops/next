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

const FILTERS_URL = `${ANALYTICS_BASE_URL}/events/filters`;
const SUMMARY_URL = `${ANALYTICS_BASE_URL}/events/summary`;
const TABLE_URL = `${ANALYTICS_BASE_URL}/events/table`;

const TABLE_PER_PAGE = 25;
const DEBOUNCE_MS = 300;

type TableSortBy = "date" | "investment_type" | "funding_stage" | "sector";
type SortDirection = "asc" | "desc";
type OverTimeStackBy = "investment_type" | "funding_stage";

type FundingStageBand =
  | "Early"
  | "Growth"
  | "PE"
  | "Non-dilutive"
  | "Closing"
  | "Other"
  | string;

type InvestmentTypeOption = { investment_type: string };
type FundingStageOption = { funding_stage: string; band: FundingStageBand };
type TargetSectorOption = { sector_id: number; sector_name: string };

type InvestmentTypeBreakdown = {
  investment_type: string;
  count: number;
  pct: number;
};

type FundingStageBreakdown = {
  funding_stage: string;
  band: FundingStageBand;
  count: number;
  pct: number;
};

type SectorBreakdown = {
  sector_id: number;
  sector_name: string;
  count: number;
  pct: number;
};

type EventOverTime = {
  month: string;
  investment_type?: string;
  funding_stage?: string;
  count: number;
};

type SummaryResponse = {
  total_events_announced: number;
  total_events_created: number;
  breakdown_by_investment_type: InvestmentTypeBreakdown[];
  breakdown_by_funding_stage: FundingStageBreakdown[];
  breakdown_by_target_sector: SectorBreakdown[];
  events_over_time_by_investment_type: EventOverTime[];
  events_over_time_by_funding_stage: EventOverTime[];
};

type TableRow = {
  id: number;
  date: string;
  investment_type: string;
  funding_stage: string | null;
  amount_m: number | null;
  amount_currency: string | null;
  target_company: string;
  target_sector: string;
};

type TableResponse = {
  items: TableRow[];
  page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
};

type EventsFilters = PeriodFilterState & {
  investmentTypes: string[];
  fundingStages: string[];
  targetSectorIds: number[];
};

const BAND_COLORS: Record<string, string> = {
  Early: "#2563eb",
  Growth: "#16a34a",
  PE: "#9333ea",
  "Non-dilutive": "#0891b2",
  Closing: "#ea580c",
  Other: "#64748b",
};

const BAND_ORDER = [
  "Early",
  "Growth",
  "PE",
  "Non-dilutive",
  "Closing",
  "Other",
] as const;

const INVESTMENT_TYPE_COLORS = [
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

function appendTextArray(params: URLSearchParams, key: string, values: string[]) {
  values.forEach((value) => params.append(`${key}[]`, value));
}

function buildFilterParams(filters: EventsFilters): URLSearchParams {
  const params = new URLSearchParams();
  appendPeriodToParams(params, filters);
  appendTimeGranularity(params, filters);

  if (filters.investmentTypes.length > 0) {
    appendTextArray(params, "investment_types", filters.investmentTypes);
  }

  if (filters.fundingStages.length > 0) {
    appendTextArray(params, "funding_stages", filters.fundingStages);
  }

  if (filters.targetSectorIds.length > 0) {
    appendIntArray(params, "target_sector_ids", filters.targetSectorIds);
  }

  return params;
}

function formatMetric(v: unknown): string {
  return typeof v === "number" && Number.isFinite(v) ? String(v) : "—";
}

function investmentTypeColor(label: string, index: number): string {
  return INVESTMENT_TYPE_COLORS[index % INVESTMENT_TYPE_COLORS.length];
}

function formatDate(value: string | null | undefined): string {
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

function formatAmount(row: TableRow): string {
  if (row.amount_m == null || !Number.isFinite(row.amount_m)) {
    return "Undisclosed";
  }
  const currency = (row.amount_currency ?? "").trim() || "USD";
  const amount =
    row.amount_m % 1 === 0 ? String(Math.round(row.amount_m)) : row.amount_m.toFixed(1);
  return `${amount}M ${currency}`;
}

function bandColor(band: string | null | undefined): string {
  return BAND_COLORS[band ?? ""] ?? BAND_COLORS.Other;
}

function defaultFilters(): EventsFilters {
  return {
    ...defaultPeriodFilter(),
    investmentTypes: [],
    fundingStages: [],
    targetSectorIds: [],
  };
}

function FundingStageMultiSelect(props: {
  options: FundingStageOption[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  disabled?: boolean;
}) {
  const { options, selectedValues, onSelectionChange, disabled } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const grouped = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const filtered = options.filter((opt) => {
      if (!q) return true;
      return (
        opt.funding_stage.toLowerCase().includes(q) ||
        String(opt.band).toLowerCase().includes(q)
      );
    });

    const groups = new Map<string, FundingStageOption[]>();
    filtered.forEach((opt) => {
      const band = opt.band || "Other";
      const list = groups.get(band) ?? [];
      list.push(opt);
      groups.set(band, list);
    });

    const orderedBands = [
      ...BAND_ORDER.filter((b) => groups.has(b)),
      ...Array.from(groups.keys()).filter(
        (b) => !BAND_ORDER.includes(b as (typeof BAND_ORDER)[number])
      ),
    ];

    return orderedBands.map((band) => ({
      band,
      color: bandColor(band),
      options: (groups.get(band) ?? []).sort((a, b) =>
        a.funding_stage.localeCompare(b.funding_stage)
      ),
    }));
  }, [options, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const stageBandMap = useMemo(() => {
    const map = new Map<string, string>();
    options.forEach((opt) => map.set(opt.funding_stage, opt.band || "Other"));
    return map;
  }, [options]);

  function toggleStage(stage: string) {
    if (selectedValues.includes(stage)) {
      onSelectionChange(selectedValues.filter((v) => v !== stage));
    } else {
      onSelectionChange([...selectedValues, stage]);
    }
  }

  const summaryLabel =
    selectedValues.length === 0
      ? ""
      : selectedValues.length === 1
        ? selectedValues[0]
        : `${selectedValues.length} selected`;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((open) => !open)}
        className="flex w-full items-center justify-between rounded border px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={summaryLabel ? "text-gray-900" : "text-gray-400"}>
          {summaryLabel || "Select funding stages"}
        </span>
        <span className="text-gray-500">▾</span>
      </button>

      {selectedValues.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {selectedValues.map((stage) => {
            const band = stageBandMap.get(stage) ?? "Other";
            const color = bandColor(band);
            return (
              <span
                key={stage}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs"
                style={{ backgroundColor: `${color}20`, color }}
              >
                {stage}
                <button
                  type="button"
                  onClick={() => toggleStage(stage)}
                  className="font-bold leading-none"
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded border bg-white shadow-lg">
          <div className="sticky top-0 border-b bg-white p-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search stages..."
              className="w-full rounded border px-2 py-1.5 text-sm"
            />
          </div>
          {grouped.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-500">No options found</p>
          ) : (
            grouped.map((group) => (
              <div key={group.band} className="border-b last:border-b-0">
                <div
                  className="sticky top-[41px] flex items-center gap-2 bg-gray-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
                  style={{ color: group.color }}
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                  {group.band}
                </div>
                {group.options.map((opt) => {
                  const checked = selectedValues.includes(opt.funding_stage);
                  return (
                    <label
                      key={opt.funding_stage}
                      className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleStage(opt.funding_stage)}
                      />
                      <span>{opt.funding_stage}</span>
                    </label>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function CorporateEventsTab() {
  const [filters, setFilters] = useState<EventsFilters>(() => defaultFilters());
  const [debouncedFilters, setDebouncedFilters] = useState<EventsFilters>(() =>
    defaultFilters()
  );
  const [overTimeStackBy, setOverTimeStackBy] =
    useState<OverTimeStackBy>("investment_type");

  const [investmentTypeOptions, setInvestmentTypeOptions] = useState<string[]>(
    []
  );
  const [fundingStageOptions, setFundingStageOptions] = useState<
    FundingStageOption[]
  >([]);
  const [targetSectorOptions, setTargetSectorOptions] = useState<
    TargetSectorOption[]
  >([]);
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

  const updateFilters = useCallback((patch: Partial<EventsFilters>) => {
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
          investment_types?: InvestmentTypeOption[] | string[];
          funding_stages?: FundingStageOption[];
          target_sectors?: TargetSectorOption[];
        };
        if (!aborted) {
          const rawTypes = json.investment_types ?? [];
          setInvestmentTypeOptions(
            rawTypes
              .map((item) =>
                typeof item === "string"
                  ? item
                  : typeof item === "object" && item && "investment_type" in item
                    ? String((item as InvestmentTypeOption).investment_type)
                    : ""
              )
              .filter(Boolean)
          );
          setFundingStageOptions(
            Array.isArray(json.funding_stages) ? json.funding_stages : []
          );
          setTargetSectorOptions(
            Array.isArray(json.target_sectors) ? json.target_sectors : []
          );
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
            total_events_announced: Number(json.total_events_announced) || 0,
            total_events_created: Number(json.total_events_created) || 0,
            breakdown_by_investment_type: Array.isArray(
              json.breakdown_by_investment_type
            )
              ? json.breakdown_by_investment_type
              : [],
            breakdown_by_funding_stage: Array.isArray(
              json.breakdown_by_funding_stage
            )
              ? json.breakdown_by_funding_stage
              : [],
            breakdown_by_target_sector: Array.isArray(
              json.breakdown_by_target_sector
            )
              ? json.breakdown_by_target_sector
              : [],
            events_over_time_by_investment_type: Array.isArray(
              json.events_over_time_by_investment_type
            )
              ? json.events_over_time_by_investment_type
              : [],
            events_over_time_by_funding_stage: Array.isArray(
              json.events_over_time_by_funding_stage
            )
              ? json.events_over_time_by_funding_stage
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

  const investmentTypeSelectOptions = useMemo(
    () =>
      investmentTypeOptions.map((type) => ({
        value: type,
        label: type,
      })),
    [investmentTypeOptions]
  );

  const targetSectorSelectOptions = useMemo(
    () =>
      targetSectorOptions.map((s) => ({
        value: s.sector_id,
        label: s.sector_name,
      })),
    [targetSectorOptions]
  );

  const fundingStageBandMap = useMemo(() => {
    const map = new Map<string, string>();
    fundingStageOptions.forEach((opt) => {
      map.set(opt.funding_stage, opt.band || "Other");
    });
    summary?.breakdown_by_funding_stage.forEach((row) => {
      if (!map.has(row.funding_stage)) {
        map.set(row.funding_stage, row.band || "Other");
      }
    });
    return map;
  }, [fundingStageOptions, summary?.breakdown_by_funding_stage]);

  const investmentTypeBreakdownItems = useMemo(
    () =>
      (summary?.breakdown_by_investment_type ?? []).map((row, idx) => ({
        key: row.investment_type,
        label: row.investment_type,
        count: row.count,
        pct: row.pct,
        color: INVESTMENT_TYPE_COLORS[idx % INVESTMENT_TYPE_COLORS.length],
      })),
    [summary?.breakdown_by_investment_type]
  );

  const fundingStageBreakdownItems = useMemo(
    () =>
      (summary?.breakdown_by_funding_stage ?? []).map((row) => ({
        key: row.funding_stage,
        label: row.funding_stage,
        count: row.count,
        pct: row.pct,
        color: bandColor(row.band),
      })),
    [summary?.breakdown_by_funding_stage]
  );

  const targetSectorBreakdownItems = useMemo(
    () =>
      (summary?.breakdown_by_target_sector ?? []).map((row) => ({
        key: row.sector_id,
        label: row.sector_name,
        count: row.count,
        pct: row.pct,
      })),
    [summary?.breakdown_by_target_sector]
  );

  const overTimeChartData = useMemo(() => {
    const rows =
      overTimeStackBy === "investment_type"
        ? (summary?.events_over_time_by_investment_type ?? [])
        : (summary?.events_over_time_by_funding_stage ?? []);

    const stackKey =
      overTimeStackBy === "investment_type" ? "investment_type" : "funding_stage";

    return buildTimeSeriesData({
      rows: rows
        .map((row) => ({
          bucket: row.month,
          stackKey: String(row[stackKey as keyof EventOverTime] ?? ""),
          count: row.count,
        }))
        .filter((row) => row.stackKey),
    });
  }, [summary, overTimeStackBy]);

  const overTimeColorForKey = useCallback(
    (key: string, index: number) => {
      if (overTimeStackBy === "investment_type") {
        return investmentTypeColor(key, index);
      }
      return bandColor(fundingStageBandMap.get(key));
    },
    [overTimeStackBy, fundingStageBandMap]
  );

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
          <div>
            <span className="mb-1 block text-sm font-medium text-gray-700">
              Investment type
            </span>
            <SearchableMultiSelect
              options={investmentTypeSelectOptions}
              selectedValues={filters.investmentTypes}
              onSelectionChange={(values) =>
                updateFilters({ investmentTypes: values as string[] })
              }
              placeholder={
                filtersLoading && investmentTypeOptions.length === 0
                  ? "Loading..."
                  : "Select investment types"
              }
              disabled={filtersLoading && investmentTypeOptions.length === 0}
            />
          </div>

          <div>
            <span className="mb-1 block text-sm font-medium text-gray-700">
              Funding stage
            </span>
            <FundingStageMultiSelect
              options={fundingStageOptions}
              selectedValues={filters.fundingStages}
              onSelectionChange={(values) =>
                updateFilters({ fundingStages: values })
              }
              disabled={filtersLoading && fundingStageOptions.length === 0}
            />
          </div>

          <div>
            <span className="mb-1 block text-sm font-medium text-gray-700">
              Target sector
            </span>
            <SearchableMultiSelect
              options={targetSectorSelectOptions}
              selectedValues={filters.targetSectorIds}
              onSelectionChange={(values) =>
                updateFilters({ targetSectorIds: values as number[] })
              }
              placeholder={
                filtersLoading && targetSectorOptions.length === 0
                  ? "Loading..."
                  : "Select target sectors"
              }
              disabled={filtersLoading && targetSectorOptions.length === 0}
            />
          </div>
        </div>

        {filtersError && (
          <p className="mt-3 text-sm text-red-700">{filtersError}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded border bg-white p-4">
          <p className="text-sm text-gray-600">Events created (selected period)</p>
          <p className="mt-1 text-3xl font-semibold">
            {summaryLoading ? "…" : formatMetric(summary?.total_events_created)}
          </p>
          <p className="mt-1 text-xs text-gray-500">Filtered by created date</p>
        </div>
        <div className="rounded border bg-white p-4">
          <p className="text-sm text-gray-600">Events announced (selected period)</p>
          <p className="mt-1 text-3xl font-semibold">
            {summaryLoading ? "…" : formatMetric(summary?.total_events_announced)}
          </p>
          <p className="mt-1 text-xs text-gray-500">Filtered by announcement date</p>
        </div>
      </div>

      {summaryError && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {summaryError}
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BreakdownDonutChart
            title="Breakdown by investment type"
            items={investmentTypeBreakdownItems}
            colorForLabel={investmentTypeColor}
            loading={summaryLoading}
          />
          <TopNHorizontalBarChart
            title="Top target sectors"
            items={targetSectorBreakdownItems}
            barColor="#0891b2"
            loading={summaryLoading}
          />
        </div>

        <TopNHorizontalBarChart
          title="Top funding stages"
          items={fundingStageBreakdownItems}
          loading={summaryLoading}
        />

        <StackedTimeSeriesChart
          title="Events over time"
          data={overTimeChartData.data}
          stackKeys={overTimeChartData.stackKeys}
          colorForKey={overTimeColorForKey}
          loading={summaryLoading}
          headerExtra={
            <div className="flex rounded border text-sm">
              <button
                type="button"
                onClick={() => setOverTimeStackBy("investment_type")}
                className={`px-3 py-1.5 ${
                  overTimeStackBy === "investment_type"
                    ? "bg-black text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                By investment type
              </button>
              <button
                type="button"
                onClick={() => setOverTimeStackBy("funding_stage")}
                className={`border-l px-3 py-1.5 ${
                  overTimeStackBy === "funding_stage"
                    ? "bg-black text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                By funding stage
              </button>
            </div>
          }
        />
      </div>

      <div className="rounded border bg-white">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Corporate events</h3>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-3 py-2 text-left">
                  <button
                    onClick={() => onTableSort("date")}
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    Date
                    {tableSortBy === "date" && (
                      <span className="text-xs text-gray-500">
                        {tableSortDir === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </button>
                </th>
                <th className="px-3 py-2 text-left">
                  <button
                    onClick={() => onTableSort("investment_type")}
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    Investment type
                    {tableSortBy === "investment_type" && (
                      <span className="text-xs text-gray-500">
                        {tableSortDir === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </button>
                </th>
                <th className="px-3 py-2 text-left">
                  <button
                    onClick={() => onTableSort("funding_stage")}
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    Funding stage
                    {tableSortBy === "funding_stage" && (
                      <span className="text-xs text-gray-500">
                        {tableSortDir === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </button>
                </th>
                <th className="px-3 py-2 text-left">Amount</th>
                <th className="px-3 py-2 text-left">Target company</th>
                <th className="px-3 py-2 text-left">
                  <button
                    onClick={() => onTableSort("sector")}
                    className="inline-flex items-center gap-1 hover:underline"
                  >
                    Target sector
                    {tableSortBy === "sector" && (
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
                  <td className="px-3 py-3 text-center" colSpan={6}>
                    Loading…
                  </td>
                </tr>
              )}
              {tableError && !tableLoading && (
                <tr>
                  <td className="px-3 py-3 text-red-700 bg-red-50" colSpan={6}>
                    {tableError}
                  </td>
                </tr>
              )}
              {!tableLoading && !tableError && (tableData?.items.length ?? 0) === 0 && (
                <tr>
                  <td className="px-3 py-3 text-center text-gray-500" colSpan={6}>
                    No results
                  </td>
                </tr>
              )}
              {!tableLoading &&
                !tableError &&
                (tableData?.items ?? []).map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <Link
                        href={`/corporate-event/${row.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {formatDate(row.date)}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{row.investment_type || "—"}</td>
                    <td className="px-3 py-2">
                      {row.funding_stage ? (
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="inline-block h-2 w-2 shrink-0 rounded-full"
                            style={{
                              backgroundColor: bandColor(
                                fundingStageBandMap.get(row.funding_stage)
                              ),
                            }}
                          />
                          {row.funding_stage}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatAmount(row)}
                    </td>
                    <td className="px-3 py-2">{row.target_company || "—"}</td>
                    <td className="px-3 py-2">{row.target_sector || "—"}</td>
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
