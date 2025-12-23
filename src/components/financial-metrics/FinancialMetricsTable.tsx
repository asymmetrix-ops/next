"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { dashboardApiService } from "@/lib/dashboardApi";
import CompaniesModal from "./CompaniesModal";

type MetricView = "mean" | "median";

export type FinancialMetricsRow = {
  revenue_range: string;
  num_companies: number;
  range_order?: number;

  mean_arr_percent?: string | number | null;
  mean_ebitda_margin?: string | number | null;
  mean_enterprise_value_m?: string | number | null;
  mean_ev_rev_multiple?: string | number | null;
  mean_revenue_growth?: string | number | null;
  mean_nrr?: string | number | null;
  mean_grr?: string | number | null;

  median_arr_percent?: string | number | null;
  median_ebitda_margin?: string | number | null;
  median_enterprise_value_m?: string | number | null;
  median_ev_rev_multiple?: string | number | null;
  median_revenue_growth?: string | number | null;
  median_nrr?: string | number | null;
  median_grr?: string | number | null;
};

const METRICS = [
  { key: "arr_percent", label: "ARR (%)", format: "percent" as const },
  {
    key: "ebitda_margin",
    label: "EBITDA Margin (%)",
    format: "percent" as const,
  },
  {
    key: "enterprise_value_m",
    label: "Enterprise Value ($M)",
    format: "money_m" as const,
  },
  { key: "ev_rev_multiple", label: "EV / Rev (x)", format: "multiple" as const },
  {
    key: "revenue_growth",
    label: "Revenue Growth (%)",
    format: "percent" as const,
  },
  { key: "nrr", label: "NRR (%)", format: "percent" as const },
  { key: "grr", label: "GRR (%)", format: "percent" as const },
] as const;

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const cleaned = value.trim().replace(/,/g, "");
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function formatValue(
  value: unknown,
  format: (typeof METRICS)[number]["format"]
): string {
  const n = toNumber(value);
  if (n === null) return "—";

  switch (format) {
    case "percent":
      return `${n.toFixed(2).replace(/\.00$/, "")}%`;
    case "multiple":
      return `${n.toFixed(2).replace(/\.00$/, "")}x`;
    case "money_m":
      // Add commas to large numbers (e.g., 1,234.56)
      const formatted = n.toFixed(2).replace(/\.00$/, "");
      const parts = formatted.split(".");
      const integerPart = parts[0];
      const decimalPart = parts[1] ? `.${parts[1]}` : "";
      const withCommas = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      return `$${withCommas}${decimalPart}`;
    default:
      return String(n);
  }
}

export default function FinancialMetricsTable() {
  const [view, setView] = useState<MetricView>("mean");
  const [rows, setRows] = useState<FinancialMetricsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [exporting, setExporting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRevenueRange, setSelectedRevenueRange] = useState<string>("");
  const [selectedRevenueMin, setSelectedRevenueMin] = useState<number | null>(null);
  const [selectedRevenueMax, setSelectedRevenueMax] = useState<number | null>(null);
  const [selectedNumCompanies, setSelectedNumCompanies] = useState<number>(0);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const fetchMetrics = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await dashboardApiService.getFinancialMetrics();
      const normalized = Array.isArray(data) ? data : [];
      normalized.sort((a, b) => (a.range_order ?? 0) - (b.range_order ?? 0));
      setRows(normalized);
      setLastUpdated(new Date());
      // Reset sorting when new data is loaded
      setSortColumn(null);
      setSortDirection("desc");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load metrics";
      setError(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    // Dev-friendly auto-refresh so the table picks up new DB rows without reload.
    const id = window.setInterval(fetchMetrics, 2 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [fetchMetrics]);

  const viewPrefix = view === "mean" ? "mean_" : "median_";

  // Handle column sorting
  const handleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new column and default to descending
      setSortColumn(column);
      setSortDirection("desc");
    }
  }, [sortColumn, sortDirection]);

  const tableRows = useMemo(() => {
    const mapped = rows.map((r) => {
      const get = (key: (typeof METRICS)[number]["key"]) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (r as any)[`${viewPrefix}${key}`];
      return {
        revenue_range: r.revenue_range,
        num_companies: r.num_companies,
        range_order: r.range_order ?? 0,
        rawValues: METRICS.map((m) => get(m.key)),
        values: METRICS.map((m) => formatValue(get(m.key), m.format)),
      };
    });

    // Apply sorting if a column is selected
    if (!sortColumn) return mapped;

    return [...mapped].sort((a, b) => {
      let aValue: number | string | null = null;
      let bValue: number | string | null = null;

      if (sortColumn === "revenue_range") {
        // Sort by range_order for revenue range
        aValue = a.range_order;
        bValue = b.range_order;
      } else if (sortColumn === "companies") {
        aValue = a.num_companies;
        bValue = b.num_companies;
      } else {
        // Find the metric index
        const metricIndex = METRICS.findIndex((m) => m.key === sortColumn);
        if (metricIndex >= 0) {
          aValue = toNumber(a.rawValues[metricIndex]);
          bValue = toNumber(b.rawValues[metricIndex]);
        }
      }

      // Handle null/undefined values - put them at the end
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1;
      if (bValue === null) return -1;

      // Compare values
      let comparison = 0;
      if (typeof aValue === "number" && typeof bValue === "number") {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [rows, viewPrefix, sortColumn, sortDirection]);

  // Parse revenue range to get min/max values
  const parseRevenueRange = useCallback((range: string): { min: number | null; max: number | null } => {
    // Examples: "<$10M", "$10M-$50M", "$50M-$100M", "$100M-$250M", "$250M-$500M", "$500M+"
    const cleanRange = range.trim();
    
    if (cleanRange.startsWith("<")) {
      // "<$10M" -> min: null, max: 10
      const match = cleanRange.match(/<\$?(\d+(?:\.\d+)?)M?/i);
      if (match) {
        const max = parseFloat(match[1]);
        return { min: null, max: Number.isFinite(max) ? max : null };
      }
    } else if (cleanRange.includes("+")) {
      // "$500M+" -> min: 500, max: null
      const match = cleanRange.match(/\$?(\d+(?:\.\d+)?)M?\s*\+/i);
      if (match) {
        const min = parseFloat(match[1]);
        return { min: Number.isFinite(min) ? min : null, max: null };
      }
    } else if (cleanRange.includes("-")) {
      // "$10M-$50M" -> min: 10, max: 50
      const match = cleanRange.match(/\$?(\d+(?:\.\d+)?)M?\s*-\s*\$?(\d+(?:\.\d+)?)M?/i);
      if (match) {
        const min = parseFloat(match[1]);
        const max = parseFloat(match[2]);
        return {
          min: Number.isFinite(min) ? min : null,
          max: Number.isFinite(max) ? max : null,
        };
      }
    }
    
    return { min: null, max: null };
  }, []);

  const handleCompaniesClick = useCallback((revenueRange: string, numCompanies: number) => {
    const { min, max } = parseRevenueRange(revenueRange);
    setSelectedRevenueRange(revenueRange);
    setSelectedRevenueMin(min);
    setSelectedRevenueMax(max);
    setSelectedNumCompanies(numCompanies);
    setModalOpen(true);
  }, [parseRevenueRange]);

  const handleExportCSV = useCallback(() => {
    if (rows.length === 0) return;

    try {
      setExporting(true);

      // Create CSV headers
      const headers = [
        "Revenue Range",
        "Companies",
        ...METRICS.map((m) => m.label),
      ];

      // Create CSV rows
      const csvRows = tableRows.map((r) => [
        r.revenue_range,
        r.num_companies.toString(),
        ...r.values,
      ]);

      // Build CSV content
      const csvContent = [
        headers.map((h) => `"${h}"`).join(","),
        ...csvRows.map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\r\n");

      // Prepend UTF-8 BOM for Excel compatibility
      const BOM = "\uFEFF";
      const fullCsv = BOM + csvContent;

      // Create blob and download
      const blob = new Blob([fullCsv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `financial_metrics_${view}_${timestamp}.csv`;

      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error("Error exporting CSV:", e);
      alert("Failed to export CSV. Please try again.");
    } finally {
      setExporting(false);
    }
  }, [rows, tableRows, view]);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="flex flex-col gap-3 p-4 border-b border-gray-200 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
            Financial Metrics
          </h2>
          <div className="mt-1 text-xs text-gray-500">
            Primary Sector: <span className="font-medium">Real Estate</span>
            {lastUpdated ? (
              <>
                {" "}
                · Updated{" "}
                <span className="font-medium">
                  {lastUpdated.toLocaleTimeString()}
                </span>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
            <button
              type="button"
              onClick={() => {
                setView("mean");
                setSortColumn(null);
                setSortDirection("desc");
              }}
              className={
                "px-3 py-1.5 text-xs font-medium rounded-md " +
                (view === "mean"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900")
              }
            >
              Mean
            </button>
            <button
              type="button"
              onClick={() => {
                setView("median");
                setSortColumn(null);
                setSortDirection("desc");
              }}
              className={
                "px-3 py-1.5 text-xs font-medium rounded-md " +
                (view === "median"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900")
              }
            >
              Median
            </button>
          </div>

          <button
            type="button"
            onClick={fetchMetrics}
            className="px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg border border-blue-100 hover:bg-blue-100"
          >
            Refresh
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={exporting || rows.length === 0}
            className="px-3 py-2 text-xs font-medium text-green-700 bg-green-50 rounded-lg border border-green-100 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="py-10 text-center">
            <div className="mx-auto w-10 h-10 rounded-full border-b-2 border-blue-600 animate-spin" />
            <div className="mt-3 text-sm text-gray-600">Loading metrics…</div>
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-red-800 bg-red-50 rounded-lg border border-red-200">
            <div className="font-semibold">Couldn’t load Financial Metrics</div>
            <div className="mt-1 break-words">{error}</div>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-600">
            No data returned.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px]">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort("revenue_range")}
                  >
                    <div className="flex items-center gap-1">
                      <span>Revenue Range</span>
                      {sortColumn === "revenue_range" && (
                        <span className="text-gray-400">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort("companies")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Companies</span>
                      {sortColumn === "companies" && (
                        <span className="text-gray-400">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  {METRICS.map((m) => (
                    <th
                      key={m.key}
                      className="px-4 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort(m.key)}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>{m.label}</span>
                        {sortColumn === m.key && (
                          <span className="text-gray-400">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tableRows.map((r, idx) => (
                  <tr key={`${r.revenue_range}-${idx}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {r.revenue_range}
                    </td>
                    <td
                      className="px-4 py-3 text-sm text-center text-gray-900 cursor-pointer hover:text-blue-600 hover:underline"
                      onClick={() => handleCompaniesClick(r.revenue_range, r.num_companies)}
                      title="Click to view all companies in this revenue range"
                    >
                      {Number.isFinite(r.num_companies)
                        ? r.num_companies.toLocaleString()
                        : "—"}
                    </td>
                    {r.values.map((v, i) => (
                      <td
                        key={`${r.revenue_range}-${i}`}
                        className="px-4 py-3 text-sm text-center text-gray-900"
                      >
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-3 text-xs text-gray-500">
              Enterprise Value is displayed in <span className="font-medium">$M</span>.
            </div>
          </div>
        )}
      </div>

      <CompaniesModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        revenueRange={selectedRevenueRange}
        revenueMin={selectedRevenueMin}
        revenueMax={selectedRevenueMax}
        numCompanies={selectedNumCompanies}
      />
    </div>
  );
}


