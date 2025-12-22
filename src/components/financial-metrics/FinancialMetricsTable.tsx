"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { dashboardApiService } from "@/lib/dashboardApi";

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
      return `$${n.toFixed(2).replace(/\.00$/, "")}`;
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

  const fetchMetrics = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await dashboardApiService.getFinancialMetrics();
      const normalized = Array.isArray(data) ? data : [];
      normalized.sort((a, b) => (a.range_order ?? 0) - (b.range_order ?? 0));
      setRows(normalized);
      setLastUpdated(new Date());
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

  const tableRows = useMemo(() => {
    return rows.map((r) => {
      const get = (key: (typeof METRICS)[number]["key"]) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (r as any)[`${viewPrefix}${key}`];
      return {
        revenue_range: r.revenue_range,
        num_companies: r.num_companies,
        values: METRICS.map((m) => formatValue(get(m.key), m.format)),
      };
    });
  }, [rows, viewPrefix]);

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
              onClick={() => setView("mean")}
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
              onClick={() => setView("median")}
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
                  <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                    Revenue Range
                  </th>
                  <th className="px-4 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">
                    Companies
                  </th>
                  {METRICS.map((m) => (
                    <th
                      key={m.key}
                      className="px-4 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase"
                    >
                      {m.label}
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
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      {Number.isFinite(r.num_companies)
                        ? r.num_companies.toLocaleString()
                        : "—"}
                    </td>
                    {r.values.map((v, i) => (
                      <td
                        key={`${r.revenue_range}-${i}`}
                        className="px-4 py-3 text-sm text-right text-gray-900"
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
    </div>
  );
}


