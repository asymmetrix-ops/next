"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { dashboardApiService } from "@/lib/dashboardApi";
import { locationsService } from "@/lib/locationsService";
import SearchableSelect from "@/components/ui/SearchableSelect";
import CompaniesModal from "./CompaniesModal";
import {
  Currency,
  FXRates,
  getFXRates,
  convertCurrency,
  formatCurrency,
  CURRENCY_OPTIONS,
} from "@/lib/fxRates";

type MetricView = "mean" | "median";

export type FinancialMetricsRow = {
  revenue_range: string;
  num_companies: number;
  range_order?: number;

  // Financial Metrics - Mean (lowercase from API)
  mean_revenue_m?: string | number | null;
  mean_ebitda_m?: string | number | null;
  mean_ebit_m?: string | number | null;
  mean_ebit?: string | number | null;
  mean_ev?: string | number | null;
  mean_ev_m?: string | number | null;
  mean_enterprise_value_m?: string | number | null;
  mean_ev_rev_multiple?: string | number | null;
  mean_revenue_growth?: string | number | null;
  mean_ebitda_margin?: string | number | null;
  mean_rule_of_40?: string | number | null;
  mean_num_clients?: string | number | null;
  mean_revenue_per_client?: string | number | null;
  mean_num_employees?: string | number | null;
  mean_revenue_per_employee?: string | number | null;

  // Subscription Metrics - Mean
  mean_arr_percent?: string | number | null;
  mean_arr_m?: string | number | null;
  mean_churn_pc?: string | number | null;
  mean_churn?: string | number | null;
  mean_nrr?: string | number | null;
  mean_grr?: string | number | null;
  mean_upsell_pc?: string | number | null;
  mean_cross_sell_pc?: string | number | null;
  mean_price_increase_pc?: string | number | null;
  mean_rev_expansion_pc?: string | number | null;
  mean_new_client_growth_pc?: string | number | null;
  mean_new_client_growth?: string | number | null;

  // Financial Metrics - Median (lowercase from API)
  median_revenue_m?: string | number | null;
  median_ebitda_m?: string | number | null;
  median_ebit_m?: string | number | null;
  median_ebit?: string | number | null;
  median_ev?: string | number | null;
  median_ev_m?: string | number | null;
  median_enterprise_value_m?: string | number | null;
  median_ev_rev_multiple?: string | number | null;
  median_revenue_growth?: string | number | null;
  median_ebitda_margin?: string | number | null;
  median_rule_of_40?: string | number | null;
  median_num_clients?: string | number | null;
  median_revenue_per_client?: string | number | null;
  median_num_employees?: string | number | null;
  median_revenue_per_employee?: string | number | null;

  // Subscription Metrics - Median
  median_arr_percent?: string | number | null;
  median_arr_m?: string | number | null;
  median_churn_pc?: string | number | null;
  median_churn?: string | number | null;
  median_nrr?: string | number | null;
  median_grr?: string | number | null;
  median_upsell_pc?: string | number | null;
  median_cross_sell_pc?: string | number | null;
  median_price_increase_pc?: string | number | null;
  median_rev_expansion_pc?: string | number | null;
  median_new_client_growth_pc?: string | number | null;
  median_new_client_growth?: string | number | null;
};

// All available metrics organized by category
// Note: Only metrics that are actually returned by the API are included here
// Monetary fields (money_m) will be converted based on selected currency
// Key names match the API field names (without the mean_/median_ prefix)
// API returns lowercase: mean_revenue_m, mean_ev, mean_arr_m, mean_ebitda_m, mean_ebit_m
const FINANCIAL_METRICS = [
  // Monetary values - will be currency converted
  { key: "revenue_m", label: "Revenue ($M)", format: "money_m" as const },
  { key: "ebitda_m", label: "EBITDA ($M)", format: "money_m" as const },
  { key: "ebit_m", label: "EBIT ($M)", format: "money_m" as const },
  { key: "ev_m", label: "EV ($M)", format: "money_m" as const },
  // Multiples and percentages - NOT converted
  { key: "ev_rev_multiple", label: "EV / Rev (x)", format: "multiple" as const },
  { key: "revenue_growth", label: "Revenue Growth (%)", format: "percent" as const },
  { key: "ebitda_margin", label: "EBITDA Margin (%)", format: "percent" as const },
  { key: "rule_of_40", label: "Rule of 40 (%)", format: "percent" as const },
] as const;

const SUBSCRIPTION_METRICS = [
  // Monetary value - will be currency converted
  { key: "arr_m", label: "ARR ($M)", format: "money_m" as const },
  // Percentages - NOT converted
  { key: "arr_percent", label: "ARR (%)", format: "percent" as const },
  { key: "churn", label: "Churn (%)", format: "percent" as const },
  { key: "grr", label: "GRR (%)", format: "percent" as const },
  { key: "nrr", label: "NRR (%)", format: "percent" as const },
  { key: "new_client_growth", label: "New client growth (%)", format: "percent" as const },
] as const;

type MetricDefinition = {
  key: string;
  label: string;
  format: "percent" | "multiple" | "money_m" | "number";
};

const OTHER_METRICS: readonly MetricDefinition[] = [
  // Add other metrics here if available
];

// Combined list of all metrics
const ALL_METRICS = [
  ...FINANCIAL_METRICS,
  ...SUBSCRIPTION_METRICS,
  ...OTHER_METRICS,
] as const;

// Default metrics to show (all available metrics)
const DEFAULT_METRICS = [
  "revenue_m",
  "arr_m",
  "ebitda_m",
  "ebit_m",
  "ev_m",
  "ev_rev_multiple",
  "revenue_growth",
  "ebitda_margin",
  "rule_of_40",
  "arr_percent",
  "churn",
  "nrr",
  "grr",
  "new_client_growth",
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

/**
 * Format a value based on its type.
 * For money_m (monetary values in millions), applies currency conversion and formatting.
 * For percent/multiple/number, no conversion is applied.
 */
function formatValue(
  value: unknown,
  format: (typeof ALL_METRICS)[number]["format"],
  currency: Currency = "USD",
  fxRates: FXRates | null = null
): string {
  const n = toNumber(value);
  if (n === null) return "—";

  switch (format) {
    case "percent":
      // No currency conversion for percentages
      return `${n.toFixed(1).replace(/\.0$/, "")}%`;
    case "multiple":
      // No currency conversion for multiples
      return `${n.toFixed(1).replace(/\.0$/, "")}x`;
    case "money_m":
      // Apply currency conversion for monetary values
      const convertedValue = fxRates
        ? convertCurrency(n, currency, fxRates)
        : n;
      return formatCurrency(convertedValue, currency);
    case "number":
      return n.toLocaleString();
    default:
      return String(n);
  }
}

interface FilterState {
  countries: string[];
  primarySectors: number[];
  secondarySectors: number[];
  selectedMetrics: string[];
}

interface FinancialMetricsTableProps {
  initialCountries?: Array<{ locations_Country: string }>;
  initialPrimarySectors?: Array<{ id: number; sector_name: string }>;
  initialMetrics?: FinancialMetricsRow[];
}

export default function FinancialMetricsTable({
  initialCountries = [],
  initialPrimarySectors = [],
  initialMetrics = [],
}: FinancialMetricsTableProps) {
  const [view, setView] = useState<MetricView>("mean");
  const [rows, setRows] = useState<FinancialMetricsRow[]>(initialMetrics);
  const [loading, setLoading] = useState(initialMetrics.length === 0);
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
  const [showFilters, setShowFilters] = useState(false);
  
  // Currency state
  const [currency, setCurrency] = useState<Currency>("USD");
  const [fxRates, setFxRates] = useState<FXRates | null>(null);
  const [loadingFxRates, setLoadingFxRates] = useState(true);
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    countries: [],
    primarySectors: [],
    secondarySectors: [],
    selectedMetrics: [...DEFAULT_METRICS],
  });

  // Filter data state - initialize with server-provided data
  const [countries, setCountries] = useState<Array<{ locations_Country: string }>>(initialCountries);
  const [primarySectors, setPrimarySectors] = useState<Array<{ id: number; sector_name: string }>>(initialPrimarySectors);
  const [secondarySectors, setSecondarySectors] = useState<Array<{ id: number; sector_name: string }>>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingPrimarySectors, setLoadingPrimarySectors] = useState(false);
  const [loadingSecondarySectors, setLoadingSecondarySectors] = useState(false);

  // Fetch FX rates on mount (cached for 12h)
  useEffect(() => {
    const loadFxRates = async () => {
      try {
        setLoadingFxRates(true);
        const rates = await getFXRates();
        setFxRates(rates);
      } catch (error) {
        console.error("Error fetching FX rates:", error);
        // Will use USD as fallback (no conversion)
      } finally {
        setLoadingFxRates(false);
      }
    };
    loadFxRates();
  }, []);

  // Fetch filter options if not provided initially (fallback for client-side only usage)
  useEffect(() => {
    if (initialCountries.length > 0 && initialPrimarySectors.length > 0) {
      // Already have initial data, skip fetching
      return;
    }

    const fetchFilterOptions = async () => {
      try {
        setLoadingCountries(true);
        const countriesData = await locationsService.getCountries();
        setCountries(countriesData);
      } catch (error) {
        console.error("Error fetching countries:", error);
      } finally {
        setLoadingCountries(false);
      }

      try {
        setLoadingPrimarySectors(true);
        const sectorsData = await locationsService.getPrimarySectors();
        setPrimarySectors(sectorsData);
      } catch (error) {
        console.error("Error fetching primary sectors:", error);
      } finally {
        setLoadingPrimarySectors(false);
      }
    };

    fetchFilterOptions();
  }, [initialCountries.length, initialPrimarySectors.length]);

  // Always fetch all sub-sectors (secondary sectors) on mount
  useEffect(() => {
    const fetchAllSubSectors = async () => {
      try {
        setLoadingSecondarySectors(true);
        const allSecondarySectorsData = await locationsService.getAllSecondarySectorsWithPrimary();
        // Extract just the secondary sector info
        const secondarySectorsList = allSecondarySectorsData.map((item) => ({
          id: item.id,
          sector_name: item.sector_name,
        }));
        setSecondarySectors(secondarySectorsList);
      } catch (error) {
        console.error("Error fetching secondary sectors:", error);
      } finally {
        setLoadingSecondarySectors(false);
      }
    };

    fetchAllSubSectors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Fetch secondary sectors when primary sectors are selected (for backward compatibility)
  useEffect(() => {
    const fetchSecondarySectors = async () => {
      // Only fetch if primary sectors are selected AND no secondary sectors are already loaded
      if (filters.primarySectors.length === 0 || secondarySectors.length > 0) {
        return;
      }

      try {
        setLoadingSecondarySectors(true);
        const secondarySectorsData = await locationsService.getSecondarySectors(
          filters.primarySectors
        );
        setSecondarySectors(secondarySectorsData);
      } catch (error) {
        console.error("Error fetching secondary sectors:", error);
      } finally {
        setLoadingSecondarySectors(false);
      }
    };

    fetchSecondarySectors();
  }, [filters.primarySectors, secondarySectors.length]);

  const fetchMetrics = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      
      // Build filter payload
      const filterPayload: {
        Countries?: string[];
        Primary_sectors_ids?: number[];
        Secondary_sectors_ids?: number[];
      } = {};

      if (filters.countries.length > 0) {
        filterPayload.Countries = filters.countries;
      }
      if (filters.primarySectors.length > 0) {
        filterPayload.Primary_sectors_ids = filters.primarySectors;
      }
      if (filters.secondarySectors.length > 0) {
        filterPayload.Secondary_sectors_ids = filters.secondarySectors;
      }

      // Only send filters if at least one filter is applied
      const hasFilters = 
        (filterPayload.Countries?.length ?? 0) > 0 ||
        (filterPayload.Primary_sectors_ids?.length ?? 0) > 0 ||
        (filterPayload.Secondary_sectors_ids?.length ?? 0) > 0;

      const data = await dashboardApiService.getFinancialMetrics(
        hasFilters ? filterPayload : undefined
      );
      const normalized = Array.isArray(data) ? data : [];
      normalized.sort((a, b) => (a.range_order ?? 0) - (b.range_order ?? 0));
      
      // Debug: Log the first row to see what fields are actually returned
      if (normalized.length > 0) {
        console.log("[FinancialMetrics] Sample API response row:", {
          revenue_range: normalized[0].revenue_range,
          num_companies: normalized[0].num_companies,
          allKeys: Object.keys(normalized[0] as Record<string, unknown>),
          selectedMetrics: filters.selectedMetrics,
        });
      }
      
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
  }, [filters]);

  useEffect(() => {
    fetchMetrics();
    // Dev-friendly auto-refresh so the table picks up new DB rows without reload.
    const id = window.setInterval(fetchMetrics, 2 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [fetchMetrics]);

  const viewPrefix = view === "mean" ? "mean_" : "median_";

  // Map UI metric keys to possible API field suffixes (without mean_/median_ prefix)
  // This makes the table resilient to backend naming differences (e.g. `ev` vs `enterprise_value_m`).
  const METRIC_FIELD_ALIASES = useMemo<Record<string, string[]>>(
    () => ({
      ev_m: ["ev_m", "ev", "enterprise_value_m", "enterprise_value"],
      ebit_m: ["ebit_m", "ebit"],
      churn: ["churn", "churn_pc"],
      grr: ["grr", "grr_pc"],
      nrr: ["nrr"],
      rule_of_40: ["rule_of_40"],
      new_client_growth: ["new_client_growth", "new_client_growth_pc"],
    }),
    []
  );

  const getMetricValue = useCallback(
    (rowAny: Record<string, unknown>, key: string): unknown => {
      const suffixes = METRIC_FIELD_ALIASES[key] ?? [key];

      for (const suffix of suffixes) {
        const fullKey = `${viewPrefix}${suffix}`;
        const v = rowAny?.[fullKey];
        if (v !== undefined && v !== null) return v;
      }
      // Fallback: try without prefix (just in case)
      for (const suffix of suffixes) {
        const v = rowAny?.[suffix];
        if (v !== undefined && v !== null) return v;
      }
      return null;
    },
    [METRIC_FIELD_ALIASES, viewPrefix]
  );

  // Get currency symbol for dynamic labels
  const currencySymbol = CURRENCY_OPTIONS.find((c) => c.value === currency)?.symbol ?? "$";

  // Get selected metrics to display with dynamic labels for money fields
  const selectedMetricsList = useMemo(() => {
    return ALL_METRICS.filter((m) => filters.selectedMetrics.includes(m.key)).map((m) => {
      // Update label for money_m format to show selected currency
      // Replace ($M) with the selected currency symbol
      if (m.format === "money_m") {
        return {
          ...m,
          label: m.label.replace(/\(\$M\)/, `(${currencySymbol}M)`),
        };
      }
      return m;
    });
  }, [filters.selectedMetrics, currencySymbol]);

  // Handle metric selection
  const toggleMetric = useCallback((metricKey: string) => {
    setFilters((prev) => {
      const isSelected = prev.selectedMetrics.includes(metricKey);
      if (isSelected) {
        return {
          ...prev,
          selectedMetrics: prev.selectedMetrics.filter((k) => k !== metricKey),
        };
      } else {
        return {
          ...prev,
          selectedMetrics: [...prev.selectedMetrics, metricKey],
        };
      }
    });
  }, []);

  // Handle select all for a section
  const selectAllSection = useCallback((section: "financial" | "subscription" | "other" | "all") => {
    setFilters((prev) => {
      let metricsToSelect: string[] = [];
      if (section === "financial") {
        metricsToSelect = FINANCIAL_METRICS.map((m) => m.key);
      } else if (section === "subscription") {
        metricsToSelect = SUBSCRIPTION_METRICS.map((m) => m.key);
      } else if (section === "other") {
        metricsToSelect = OTHER_METRICS.map((m) => m.key);
      } else {
        metricsToSelect = ALL_METRICS.map((m) => m.key);
      }

      const allSelected = metricsToSelect.every((key) => prev.selectedMetrics.includes(key));
      
      if (allSelected) {
        // Deselect all in this section
        return {
          ...prev,
          selectedMetrics: prev.selectedMetrics.filter((k) => !metricsToSelect.includes(k)),
        };
      } else {
        // Select all in this section
        const newMetrics = [...prev.selectedMetrics];
        metricsToSelect.forEach((key) => {
          if (!newMetrics.includes(key)) {
            newMetrics.push(key);
          }
        });
        return {
          ...prev,
          selectedMetrics: newMetrics,
        };
      }
    });
  }, []);

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rowAny = r as any as Record<string, unknown>;
      
      return {
        revenue_range: r.revenue_range,
        num_companies: r.num_companies,
        range_order: r.range_order ?? 0,
        rawValues: selectedMetricsList.map((m) => getMetricValue(rowAny, m.key)),
        values: selectedMetricsList.map((m) => 
          formatValue(getMetricValue(rowAny, m.key), m.format, currency, fxRates)
        ),
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
        const metricIndex = selectedMetricsList.findIndex((m) => m.key === sortColumn);
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
  }, [rows, viewPrefix, sortColumn, sortDirection, selectedMetricsList, currency, fxRates, getMetricValue]);

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
        ...selectedMetricsList.map((m) => m.label),
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
      const filename = `financial_metrics_${view}_${currency}_${timestamp}.csv`;

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
  }, [rows, tableRows, view, selectedMetricsList, currency]);

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="flex flex-col gap-3 p-4 border-b border-gray-200 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
            Financial Metrics
          </h2>
          {lastUpdated ? (
            <div className="mt-1 text-xs text-gray-500">
              Updated{" "}
              <span className="font-medium">
                {lastUpdated.toLocaleTimeString()}
              </span>
            </div>
          ) : null}
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

          {/* Currency Selector */}
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
            {CURRENCY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCurrency(opt.value)}
                disabled={loadingFxRates && opt.value !== "USD"}
                className={
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors " +
                  (currency === opt.value
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900") +
                  (loadingFxRates && opt.value !== "USD"
                    ? " opacity-50 cursor-not-allowed"
                    : "")
                }
                title={opt.label}
              >
                {opt.symbol}
              </button>
            ))}
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

          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100"
          >
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Location Filters */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Location</h3>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <SearchableSelect
                    options={countries.map((c) => ({
                      value: c.locations_Country,
                      label: c.locations_Country,
                    }))}
                    value=""
                    onChange={(value) => {
                      if (typeof value === "string" && value && !filters.countries.includes(value)) {
                        setFilters((prev) => ({
                          ...prev,
                          countries: [...prev.countries, value],
                        }));
                      }
                    }}
                    placeholder={loadingCountries ? "Loading..." : "Select Country"}
                    disabled={loadingCountries}
                  />
                  {filters.countries.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {filters.countries.map((country) => (
                        <span
                          key={country}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                        >
                          {country}
                          <button
                            onClick={() =>
                              setFilters((prev) => ({
                                ...prev,
                                countries: prev.countries.filter((c) => c !== country),
                              }))
                            }
                            className="hover:text-blue-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sector Filters */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Sectors</h3>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Primary Sector
                  </label>
                  <SearchableSelect
                    options={primarySectors.map((s) => ({
                      value: s.id,
                      label: s.sector_name,
                    }))}
                    value=""
                    onChange={(value) => {
                      if (typeof value === "number" && value && !filters.primarySectors.includes(value)) {
                        setFilters((prev) => ({
                          ...prev,
                          primarySectors: [...prev.primarySectors, value],
                          secondarySectors: [], // Reset secondary sectors when primary sector changes
                        }));
                      }
                    }}
                    placeholder={loadingPrimarySectors ? "Loading..." : "Select Primary Sector"}
                    disabled={loadingPrimarySectors}
                  />
                  {filters.primarySectors.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {filters.primarySectors.map((sectorId) => {
                        const sector = primarySectors.find((s) => s.id === sectorId);
                        return (
                          <span
                            key={sectorId}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded"
                          >
                            {sector?.sector_name || `Sector ${sectorId}`}
                            <button
                              onClick={() =>
                                setFilters((prev) => ({
                                  ...prev,
                                  primarySectors: prev.primarySectors.filter((id) => id !== sectorId),
                                }))
                              }
                              className="hover:text-purple-600"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Sub-Sector
                  </label>
                  <SearchableSelect
                    options={secondarySectors.map((s) => ({
                      value: s.id,
                      label: s.sector_name,
                    }))}
                    value=""
                    onChange={async (value) => {
                      if (typeof value === "number" && value && !filters.secondarySectors.includes(value)) {
                        // When a sub-sector is selected, fetch related primary sectors
                        try {
                          const relatedPrimarySectors = await locationsService.getPrimarySectorsBySecondarySector(value);
                          const relatedPrimarySectorIds = relatedPrimarySectors.map((s) => s.id);
                          
                          setFilters((prev) => {
                            // Add the sub-sector
                            const newSecondarySectors = [...prev.secondarySectors, value];
                            // Add related primary sectors (avoid duplicates)
                            const combinedPrimarySectors = [...prev.primarySectors, ...relatedPrimarySectorIds];
                            const uniquePrimarySectors = Array.from(new Set(combinedPrimarySectors));
                            
                            return {
                              ...prev,
                              secondarySectors: newSecondarySectors,
                              primarySectors: uniquePrimarySectors,
                            };
                          });
                        } catch (error) {
                          console.error("Error fetching primary sectors for sub-sector:", error);
                          // Still add the sub-sector even if fetching primary sectors fails
                          setFilters((prev) => ({
                            ...prev,
                            secondarySectors: [...prev.secondarySectors, value],
                          }));
                        }
                      }
                    }}
                    placeholder={loadingSecondarySectors ? "Loading..." : "Select Sub-Sector"}
                    disabled={loadingSecondarySectors}
                  />
                  {filters.secondarySectors.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {filters.secondarySectors.map((sectorId) => {
                        const sector = secondarySectors.find((s) => s.id === sectorId);
                        return (
                          <span
                            key={sectorId}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded"
                          >
                            {sector?.sector_name || `Sector ${sectorId}`}
                            <button
                              onClick={() =>
                                setFilters((prev) => ({
                                  ...prev,
                                  secondarySectors: prev.secondarySectors.filter((id) => id !== sectorId),
                                }))
                              }
                              className="hover:text-indigo-600"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Metrics Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900">Metrics</h3>
                <button
                  type="button"
                  onClick={() => selectAllSection("all")}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Select All
                </button>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {/* Financial Metrics */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-semibold text-gray-700">Financial Metrics</h4>
                    <button
                      type="button"
                      onClick={() => selectAllSection("financial")}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Select All
                    </button>
                  </div>
                  <div className="space-y-1 pl-2">
                    {FINANCIAL_METRICS.map((metric) => (
                      <label key={metric.key} className="flex items-center gap-2 text-xs text-gray-700">
                        <input
                          type="checkbox"
                          checked={filters.selectedMetrics.includes(metric.key)}
                          onChange={() => toggleMetric(metric.key)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>{metric.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Subscription Metrics */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-semibold text-gray-700">Subscription Metrics</h4>
                    <button
                      type="button"
                      onClick={() => selectAllSection("subscription")}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Select All
                    </button>
                  </div>
                  <div className="space-y-1 pl-2">
                    {SUBSCRIPTION_METRICS.map((metric) => (
                      <label key={metric.key} className="flex items-center gap-2 text-xs text-gray-700">
                        <input
                          type="checkbox"
                          checked={filters.selectedMetrics.includes(metric.key)}
                          onChange={() => toggleMetric(metric.key)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>{metric.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Other Metrics */}
                {OTHER_METRICS.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xs font-semibold text-gray-700">Other Metrics</h4>
                      <button
                        type="button"
                        onClick={() => selectAllSection("other")}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        Select All
                      </button>
                    </div>
                    <div className="space-y-1 pl-2">
                      {OTHER_METRICS.map((metric) => (
                        <label key={metric.key} className="flex items-center gap-2 text-xs text-gray-700">
                          <input
                            type="checkbox"
                            checked={filters.selectedMetrics.includes(metric.key)}
                            onChange={() => toggleMetric(metric.key)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>{metric.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Apply Filters Button */}
          <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setFilters({
                countries: [],
                primarySectors: [],
                secondarySectors: [],
                selectedMetrics: [...DEFAULT_METRICS],
              })}
              className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg border border-gray-200 hover:bg-gray-200"
            >
              Reset Filters
            </button>
            <button
              type="button"
              onClick={fetchMetrics}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

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
                  {selectedMetricsList.map((m) => (
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
                      className="px-4 py-3 text-sm text-center text-blue-600 underline font-medium cursor-pointer hover:text-blue-800 transition-colors duration-200"
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
              Monetary values (Revenue, ARR, EBITDA, EBIT, EV) displayed in <span className="font-medium">{currencySymbol}M</span>.
              {currency !== "USD" && fxRates && (
                <span className="ml-2 text-gray-400">
                  (1 USD = {fxRates[currency].toFixed(4)} {currency})
                </span>
              )}
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
        countries={filters.countries}
        primarySectors={filters.primarySectors}
        secondarySectors={filters.secondarySectors}
      />
    </div>
  );
}


