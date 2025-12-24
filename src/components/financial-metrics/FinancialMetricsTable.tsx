"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { dashboardApiService } from "@/lib/dashboardApi";
import { locationsService } from "@/lib/locationsService";
import SearchableSelect from "@/components/ui/SearchableSelect";
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

// All available metrics organized by category
// Note: Only metrics that are actually returned by the API are included here
const FINANCIAL_METRICS = [
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
  {
    key: "ebitda_margin",
    label: "EBITDA Margin (%)",
    format: "percent" as const,
  },
] as const;

const SUBSCRIPTION_METRICS = [
  { key: "arr_percent", label: "ARR (%)", format: "percent" as const },
  { key: "nrr", label: "NRR (%)", format: "percent" as const },
  { key: "grr", label: "GRR (%)", format: "percent" as const },
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
  "arr_percent",
  "ebitda_margin",
  "enterprise_value_m",
  "ev_rev_multiple",
  "revenue_growth",
  "nrr",
  "grr",
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
  format: (typeof ALL_METRICS)[number]["format"]
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
    case "number":
      return n.toLocaleString();
    default:
      return String(n);
  }
}

interface FilterState {
  countries: string[];
  provinces: string[];
  cities: string[];
  primarySectors: number[];
  secondarySectors: number[];
  selectedMetrics: string[];
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
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    countries: [],
    provinces: [],
    cities: [],
    primarySectors: [],
    secondarySectors: [],
    selectedMetrics: [...DEFAULT_METRICS],
  });

  // Filter data state
  const [countries, setCountries] = useState<Array<{ locations_Country: string }>>([]);
  const [provinces, setProvinces] = useState<Array<{ State__Province__County: string }>>([]);
  const [cities, setCities] = useState<Array<{ City: string }>>([]);
  const [primarySectors, setPrimarySectors] = useState<Array<{ id: number; sector_name: string }>>([]);
  const [secondarySectors, setSecondarySectors] = useState<Array<{ id: number; sector_name: string }>>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingPrimarySectors, setLoadingPrimarySectors] = useState(false);
  const [loadingSecondarySectors, setLoadingSecondarySectors] = useState(false);

  // Fetch filter options
  useEffect(() => {
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
  }, []);

  // Fetch provinces when countries are selected
  useEffect(() => {
    const fetchProvinces = async () => {
      if (filters.countries.length === 0) {
        setProvinces([]);
        return;
      }

      try {
        setLoadingProvinces(true);
        const provincesData = await locationsService.getProvinces(filters.countries);
        setProvinces(provincesData);
      } catch (error) {
        console.error("Error fetching provinces:", error);
      } finally {
        setLoadingProvinces(false);
      }
    };

    fetchProvinces();
  }, [filters.countries]);

  // Fetch cities when countries or provinces are selected
  useEffect(() => {
    const fetchCities = async () => {
      if (filters.countries.length === 0) {
        setCities([]);
        return;
      }

      try {
        setLoadingCities(true);
        const citiesData = await locationsService.getCities(
          filters.countries,
          filters.provinces
        );
        setCities(citiesData);
      } catch (error) {
        console.error("Error fetching cities:", error);
      } finally {
        setLoadingCities(false);
      }
    };

    fetchCities();
  }, [filters.countries, filters.provinces]);

  // Fetch secondary sectors when primary sectors are selected
  useEffect(() => {
    const fetchSecondarySectors = async () => {
      if (filters.primarySectors.length === 0) {
        setSecondarySectors([]);
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
  }, [filters.primarySectors]);

  const fetchMetrics = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      
      // Build filter payload (only location and sector filters, no metrics)
      const filterPayload: {
        Countries?: string[];
        Provinces?: string[];
        Cities?: string[];
        Primary_sectors_ids?: number[];
        Secondary_sectors_ids?: number[];
      } = {};

      if (filters.countries.length > 0) {
        filterPayload.Countries = filters.countries;
      }
      if (filters.provinces.length > 0) {
        filterPayload.Provinces = filters.provinces;
      }
      if (filters.cities.length > 0) {
        filterPayload.Cities = filters.cities;
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
        (filterPayload.Provinces?.length ?? 0) > 0 ||
        (filterPayload.Cities?.length ?? 0) > 0 ||
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

  // Get selected metrics to display
  const selectedMetricsList = useMemo(() => {
    return ALL_METRICS.filter((m) => filters.selectedMetrics.includes(m.key));
  }, [filters.selectedMetrics]);

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
      const get = (key: string) => {
        // The API returns fields with the pattern: mean_<metric_key> or median_<metric_key>
        // We already have viewPrefix (mean_ or median_), so we just need the metric key
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rowAny = r as any;
        const fullKey = `${viewPrefix}${key}`;
        
        // Direct access to the field
        return rowAny[fullKey] ?? null;
      };
      
      return {
        revenue_range: r.revenue_range,
        num_companies: r.num_companies,
        range_order: r.range_order ?? 0,
        rawValues: selectedMetricsList.map((m) => get(m.key)),
        values: selectedMetricsList.map((m) => formatValue(get(m.key), m.format)),
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
  }, [rows, viewPrefix, sortColumn, sortDirection, selectedMetricsList]);

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
  }, [rows, tableRows, view, selectedMetricsList]);

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
                          provinces: [], // Reset provinces when country changes
                          cities: [], // Reset cities when country changes
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

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Province/State
                  </label>
                  <SearchableSelect
                    options={provinces.map((p) => ({
                      value: p.State__Province__County,
                      label: p.State__Province__County,
                    }))}
                    value=""
                    onChange={(value) => {
                      if (typeof value === "string" && value && !filters.provinces.includes(value)) {
                        setFilters((prev) => ({
                          ...prev,
                          provinces: [...prev.provinces, value],
                          cities: [], // Reset cities when province changes
                        }));
                      }
                    }}
                    placeholder={loadingProvinces ? "Loading..." : filters.countries.length === 0 ? "Select country first" : "Select Province"}
                    disabled={loadingProvinces || filters.countries.length === 0}
                  />
                  {filters.provinces.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {filters.provinces.map((province) => (
                        <span
                          key={province}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-800 rounded"
                        >
                          {province}
                          <button
                            onClick={() =>
                              setFilters((prev) => ({
                                ...prev,
                                provinces: prev.provinces.filter((p) => p !== province),
                              }))
                            }
                            className="hover:text-green-600"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <SearchableSelect
                    options={cities.map((c) => ({
                      value: c.City,
                      label: c.City,
                    }))}
                    value=""
                    onChange={(value) => {
                      if (typeof value === "string" && value && !filters.cities.includes(value)) {
                        setFilters((prev) => ({
                          ...prev,
                          cities: [...prev.cities, value],
                        }));
                      }
                    }}
                    placeholder={loadingCities ? "Loading..." : filters.countries.length === 0 ? "Select country first" : "Select City"}
                    disabled={loadingCities || filters.countries.length === 0}
                  />
                  {filters.cities.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {filters.cities.map((city) => (
                        <span
                          key={city}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded"
                        >
                          {city}
                          <button
                            onClick={() =>
                              setFilters((prev) => ({
                                ...prev,
                                cities: prev.cities.filter((c) => c !== city),
                              }))
                            }
                            className="hover:text-orange-600"
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
                    Secondary Sector
                  </label>
                  <SearchableSelect
                    options={secondarySectors.map((s) => ({
                      value: s.id,
                      label: s.sector_name,
                    }))}
                    value=""
                    onChange={(value) => {
                      if (typeof value === "number" && value && !filters.secondarySectors.includes(value)) {
                        setFilters((prev) => ({
                          ...prev,
                          secondarySectors: [...prev.secondarySectors, value],
                        }));
                      }
                    }}
                    placeholder={loadingSecondarySectors ? "Loading..." : filters.primarySectors.length === 0 ? "Select primary sector first" : "Select Secondary Sector"}
                    disabled={loadingSecondarySectors || filters.primarySectors.length === 0}
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
        countries={filters.countries}
        provinces={filters.provinces}
        cities={filters.cities}
        primarySectors={filters.primarySectors}
        secondarySectors={filters.secondarySectors}
      />
    </div>
  );
}


