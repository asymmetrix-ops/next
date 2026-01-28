"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { checkExportLimit, EXPORT_LIMIT } from "@/utils/exportLimitCheck";
import { ExportLimitModal } from "@/components/ExportLimitModal";
import {
  CompaniesCSVExporter,
  CompanyCSVRow,
} from "@/utils/companiesCSVExport";

interface Company {
  id: number;
  name: string;
  description: string;
  country: string;
  ownership: string;
  linkedin_members: number;
  // Financial metrics
  Revenue_m?: number | string | null;
  EBITDA_m?: number | string | null;
  EBIT_m?: number | string | null;
  EV?: number | string | null;
  Revenue_multiple?: number | string | null;
  Rev_Growth_PC?: number | string | null;
  EBITDA_margin?: number | string | null;
  Rule_of_40?: number | string | null;
  // Subscription metrics
  ARR_m?: number | string | null;
  ARR_pc?: number | string | null;
  NRR?: number | string | null;
  GRR_pc?: number | string | null;
  Churn_pc?: number | string | null;
  New_client_growth_pc?: number | string | null;
}

interface CompaniesModalProps {
  isOpen: boolean;
  onClose: () => void;
  revenueRange: string;
  revenueMin: number | null;
  revenueMax: number | null;
  numCompanies: number;
  // Filters from FinancialMetricsTable
  countries?: string[];
  primarySectors?: number[];
  secondarySectors?: number[];
  selectedMetrics?: string[];
}

// Mapping from filter metric keys (from FinancialMetricsTable) to company field names and labels
const METRIC_MAP: Record<
  string,
  { field: string; label: string; format: "percent" | "multiple" | "money_m" | "number" }
> = {
  revenue_m: { field: "Revenue_m", label: "Revenue ($M)", format: "money_m" },
  ebitda_m: { field: "EBITDA_m", label: "EBITDA ($M)", format: "money_m" },
  ebit_m: { field: "EBIT_m", label: "EBIT ($M)", format: "money_m" },
  ev_m: { field: "EV", label: "EV ($M)", format: "money_m" },
  ev_rev_multiple: { field: "Revenue_multiple", label: "EV / Rev (x)", format: "multiple" },
  revenue_growth: { field: "Rev_Growth_PC", label: "Revenue Growth (%)", format: "percent" },
  ebitda_margin: { field: "EBITDA_margin", label: "EBITDA Margin (%)", format: "percent" },
  rule_of_40: { field: "Rule_of_40", label: "Rule of 40 (%)", format: "percent" },
  arr_m: { field: "ARR_m", label: "ARR ($M)", format: "money_m" },
  arr_percent: { field: "ARR_pc", label: "ARR (%)", format: "percent" },
  churn: { field: "Churn_pc", label: "Churn (%)", format: "percent" },
  grr: { field: "GRR_pc", label: "GRR (%)", format: "percent" },
  nrr: { field: "NRR", label: "NRR (%)", format: "percent" },
  new_client_growth: { field: "New_client_growth_pc", label: "New client growth (%)", format: "percent" },
};

function getNumericValue(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  
  const num = typeof value === "number" 
    ? value 
    : typeof value === "string" 
    ? Number(value.replace(/,/g, "")) 
    : null;
  
  if (num === null || !Number.isFinite(num)) return null;
  return num;
}

type MetricFormat = "percent" | "multiple" | "money_m" | "number";

function formatValue(
  value: unknown,
  format: MetricFormat
): string {
  const num = getNumericValue(value);
  if (num === null) return "—";

  switch (format) {
    case "percent":
      return `${num.toFixed(2).replace(/\.00$/, "")}%`;
    case "multiple":
      return `${num.toFixed(2).replace(/\.00$/, "")}x`;
    case "money_m":
      const formatted = num.toFixed(2).replace(/\.00$/, "");
      const parts = formatted.split(".");
      const integerPart = parts[0];
      const decimalPart = parts[1] ? `.${parts[1]}` : "";
      const withCommas = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      return `$${withCommas}${decimalPart}`;
    default:
      return String(num);
  }
}

function getCompanyValue(company: Company, key: string): unknown {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const companyAny = company as unknown as Record<string, unknown>;
  let value: unknown = companyAny[key];
  
  // If not found at top level, try various nested structures
  if (value === undefined || value === null) {
    // Try nested financial_metrics objects
    value = (companyAny.financial_metrics as Record<string, unknown>)?.[key] || 
            (companyAny._financial_metrics as Record<string, unknown>)?.[key] ||
            (companyAny.financialMetrics as Record<string, unknown>)?.[key];
    
    // Try array of financial metrics (take the first/latest one)
    if ((value === undefined || value === null) && Array.isArray(companyAny.company_financial_metrics)) {
      const latestMetrics = companyAny.company_financial_metrics[companyAny.company_financial_metrics.length - 1] as Record<string, unknown>;
      value = latestMetrics?.[key];
    }
    if ((value === undefined || value === null) && Array.isArray(companyAny._company_financial_metrics)) {
      const latestMetrics = companyAny._company_financial_metrics[companyAny._company_financial_metrics.length - 1] as Record<string, unknown>;
      value = latestMetrics?.[key];
    }
    
    // Try alternative field names (case variations)
    if (value === undefined || value === null) {
      const altKey = key.toLowerCase();
      value = companyAny[altKey] || 
              (companyAny.financial_metrics as Record<string, unknown>)?.[altKey] ||
              (companyAny._financial_metrics as Record<string, unknown>)?.[altKey];
    }
    
    // Special handling for ARR_pc - try common variations
    if (key === "ARR_pc" && (value === undefined || value === null)) {
      value = companyAny.arr_pc ?? 
              companyAny.ARR ?? 
              companyAny.arr_percent ??
              companyAny.ARR_percent ??
              (companyAny.financial_metrics as Record<string, unknown>)?.arr_pc ??
              (companyAny.financial_metrics as Record<string, unknown>)?.ARR_pc;
    }
  }
  
  return value;
}

export default function CompaniesModal({
  isOpen,
  onClose,
  revenueRange,
  revenueMin,
  revenueMax,
  numCompanies,
  countries = [],
  primarySectors = [],
  secondarySectors = [],
  selectedMetrics = [],
}: CompaniesModalProps) {
  // Build METRICS array from selectedMetrics
  const METRICS = useMemo(() => {
    return selectedMetrics
      .filter((key) => METRIC_MAP[key])
      .map((key) => {
        const mapping = METRIC_MAP[key];
        return {
          key: mapping.field,
          label: mapping.label,
          format: mapping.format,
        };
      });
  }, [selectedMetrics]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [exporting, setExporting] = useState(false);
  const [showExportLimitModal, setShowExportLimitModal] = useState(false);
  const [exportsLeft, setExportsLeft] = useState(0);

  // Fetch companies when modal opens
  const fetchCompanies = useCallback(async () => {
    if (!isOpen) return;
    if (revenueMin === null && revenueMax === null) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("asymmetrix_auth_token");

      // Fetch all pages if needed
      let allItems: Company[] = [];
      let currentPage = 1;
      let hasMore = true;
      const perPage = 100;

      while (hasMore) {
        const pageParams = new URLSearchParams();
        pageParams.append("Offset", currentPage.toString());
        pageParams.append("Per_page", perPage.toString());
        
        // Add primary sectors if provided
        if (primarySectors.length > 0) {
          primarySectors.forEach((id) => {
            pageParams.append("Primary_sectors_ids[]", id.toString());
          });
        }
        
        // Add secondary sectors if provided
        if (secondarySectors.length > 0) {
          secondarySectors.forEach((id) => {
            pageParams.append("Secondary_sectors_ids[]", id.toString());
          });
        }
        
        // Add location filters
        if (countries.length > 0) {
          countries.forEach((country) => {
            pageParams.append("Countries[]", country);
          });
        }
        
        if (revenueMin !== null) {
          pageParams.append("Revenue_min", revenueMin.toString());
        }
        if (revenueMax !== null) {
          pageParams.append("Revenue_max", revenueMax.toString());
        }

        const url = `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/Get_new_companies?${pageParams.toString()}`;
        
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          credentials: "include",
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `API request failed: ${response.statusText} - ${errorText}`
          );
        }

        const data = await response.json();
        const items = data.result1?.items || [];
        allItems = [...allItems, ...items];
        
        // Check if there are more pages
        const pageTotal = data.result1?.pageTotal || 1;
        hasMore = currentPage < pageTotal;
        currentPage++;
      }

      // Debug: Log first company to see structure
      if (allItems.length > 0) {
        const sampleCompany = allItems[0] as unknown as Record<string, unknown>;
        console.log("[CompaniesModal] Sample company structure:", {
          id: allItems[0].id,
          name: allItems[0].name,
          ARR_pc: sampleCompany.ARR_pc,
          arr_pc: sampleCompany.arr_pc,
          financial_metrics: sampleCompany.financial_metrics,
          _financial_metrics: sampleCompany._financial_metrics,
          allKeys: Object.keys(allItems[0]),
        });
      }
      
      setCompanies(allItems);
      // Reset sorting when new data is loaded
      setSortColumn(null);
      setSortDirection("desc");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load companies";
      setError(msg);
      console.error("Error fetching companies:", e);
    } finally {
      setLoading(false);
    }
  }, [isOpen, revenueMin, revenueMax, countries, primarySectors, secondarySectors]);

  useEffect(() => {
    // Fetch companies when modal opens
    if (isOpen) {
      fetchCompanies();
    }
  }, [isOpen, fetchCompanies]);

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

  // Sort companies based on current sort settings
  const sortedCompanies = useMemo(() => {
    if (!sortColumn) return companies;
    
    return [...companies].sort((a, b) => {
      let aValue: number | string | null = null;
      let bValue: number | string | null = null;
      
      if (sortColumn === "name") {
        aValue = a.name || "";
        bValue = b.name || "";
      } else if (sortColumn === "country") {
        aValue = a.country || "";
        bValue = b.country || "";
      } else if (sortColumn === "ownership") {
        aValue = a.ownership || "";
        bValue = b.ownership || "";
      } else {
        // For metric columns, get numeric values
        aValue = getNumericValue(getCompanyValue(a, sortColumn));
        bValue = getNumericValue(getCompanyValue(b, sortColumn));
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
  }, [companies, sortColumn, sortDirection]);

  // Export CSV function - similar to companies page
  const handleExportCSV = useCallback(async () => {
    try {
      // Check export limit first
      const limitCheck = await checkExportLimit();
      if (!limitCheck.canExport) {
        setExportsLeft(limitCheck.exportsLeft);
        setShowExportLimitModal(true);
        return;
      }

      setExporting(true);
      const token = localStorage.getItem("asymmetrix_auth_token");
      const params = new URLSearchParams();

      // Add filters to export request
      if (primarySectors.length > 0) {
        primarySectors.forEach((id) => {
          params.append("Primary_sectors_ids[]", id.toString());
        });
      }

      if (secondarySectors.length > 0) {
        secondarySectors.forEach((id) => {
          params.append("Secondary_sectors_ids[]", id.toString());
        });
      }

      if (countries.length > 0) {
        countries.forEach((country) => {
          params.append("Countries[]", country);
        });
      }

      if (revenueMin !== null) {
        params.append("Revenue_min", revenueMin.toString());
      }
      if (revenueMax !== null) {
        params.append("Revenue_max", revenueMax.toString());
      }

      // First, fetch page 1 to get total page count
      const baseParams = new URLSearchParams(params.toString());
      baseParams.append("Offset", "1");
      baseParams.append("Per_page", "25");
      
      const firstPageUrl = `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/Export_new_companies_csv?${baseParams.toString()}`;
      
      const firstResp = await fetch(firstPageUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
      
      if (!firstResp.ok) {
        // Check if it's an export limit error
        if (firstResp.status === 403 || firstResp.status === 429) {
          const limitCheck = await checkExportLimit();
          setExportsLeft(limitCheck.exportsLeft);
          setShowExportLimitModal(true);
          return;
        }
        const errText = await firstResp.text();
        throw new Error(
          `Export failed: ${firstResp.status} ${firstResp.statusText} - ${errText}`
        );
      }
      
      // Parse first page to get pagination info
      const firstPageText = await firstResp.text();
      let firstPageParsed: unknown;
      let isJson = false;
      let totalPages = 1;
      
      try {
        firstPageParsed = JSON.parse(firstPageText);
        isJson = true;
        // Check if response has pagination info
        if (
          firstPageParsed &&
          typeof firstPageParsed === "object" &&
          "pageTotal" in (firstPageParsed as Record<string, unknown>)
        ) {
          totalPages = (firstPageParsed as { pageTotal?: number }).pageTotal || 1;
        } else if (
          firstPageParsed &&
          typeof firstPageParsed === "object" &&
          "result1" in (firstPageParsed as Record<string, unknown>)
        ) {
          const result1 = (firstPageParsed as { result1?: { pageTotal?: number } }).result1;
          totalPages = result1?.pageTotal || 1;
        }
      } catch {
        isJson = false;
      }
      
      // Type guard for export JSON items
      const isExportCompanyJson = (value: unknown): value is {
        name?: string;
        description?: string;
        primary_sectors?: string | string[];
        secondary_sectors?: string | string[];
        ownership?: string;
        linkedin_members?: number | string;
        country?: string;
        company_link?: string;
        Revenue_m?: number | string;
        EBITDA_m?: number | string;
        EV?: number | string;
        Revenue_multiple?: number | string;
        Rev_Growth_PC?: number | string;
        EBITDA_margin?: number | string;
        Rule_of_40?: number | string;
        ARR_pc?: number | string;
        ARR_m?: number | string;
        Churn_pc?: number | string;
        GRR_pc?: number | string;
        NRR?: number | string;
        New_client_growth_pc?: number | string;
      } => {
        if (!value || typeof value !== "object") return false;
        const obj = value as Record<string, unknown>;
        return (
          typeof obj.name === "string" ||
          typeof obj.description === "string" ||
          typeof obj.country === "string"
        );
      };
      
      // Collect all items from all pages
      let allItems: unknown[] = [];
      
      // Process first page
      if (isJson) {
        const itemsUnknown: unknown[] = Array.isArray(firstPageParsed)
          ? (firstPageParsed as unknown[])
          : firstPageParsed &&
            typeof firstPageParsed === "object" &&
            Array.isArray((firstPageParsed as { items?: unknown[] }).items)
          ? ((firstPageParsed as { items?: unknown[] }).items as unknown[])
          : firstPageParsed &&
            typeof firstPageParsed === "object" &&
            "result1" in (firstPageParsed as Record<string, unknown>) &&
            Array.isArray((firstPageParsed as { result1?: { items?: unknown[] } }).result1?.items)
          ? ((firstPageParsed as { result1?: { items?: unknown[] } }).result1?.items as unknown[])
          : [];
        allItems = itemsUnknown.filter(isExportCompanyJson);
      }
      
      // Fetch remaining pages if there are more
      if (totalPages > 1) {
        for (let page = 2; page <= totalPages; page++) {
          const pageParams = new URLSearchParams(params.toString());
          pageParams.append("Offset", page.toString());
          pageParams.append("Per_page", "25");
          
          const pageUrl = `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/Export_new_companies_csv?${pageParams.toString()}`;
          
          const pageResp = await fetch(pageUrl, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            credentials: "include",
          });
          
          if (!pageResp.ok) {
            console.warn(`Failed to fetch page ${page}, continuing with available data`);
            continue;
          }
          
          const pageText = await pageResp.text();
          try {
            const pageParsed = JSON.parse(pageText);
            const pageItemsUnknown: unknown[] = Array.isArray(pageParsed)
              ? (pageParsed as unknown[])
              : pageParsed &&
                typeof pageParsed === "object" &&
                Array.isArray((pageParsed as { items?: unknown[] }).items)
              ? ((pageParsed as { items?: unknown[] }).items as unknown[])
              : pageParsed &&
                typeof pageParsed === "object" &&
                "result1" in (pageParsed as Record<string, unknown>) &&
                Array.isArray((pageParsed as { result1?: { items?: unknown[] } }).result1?.items)
              ? ((pageParsed as { result1?: { items?: unknown[] } }).result1?.items as unknown[])
              : [];
            const pageItems = pageItemsUnknown.filter(isExportCompanyJson);
            allItems = [...allItems, ...pageItems];
          } catch (e) {
            console.warn(`Failed to parse page ${page}, continuing with available data`, e);
          }
        }
      }
      
      if (allItems.length === 0) {
        throw new Error("Export returned empty data");
      }
      
      if (isJson) {
        const items = allItems as Array<{
          name?: string;
          description?: string;
          primary_sectors?: string | string[];
          secondary_sectors?: string | string[];
          ownership?: string;
          linkedin_members?: number | string;
          country?: string;
          company_link?: string;
          Revenue_m?: number | string;
          EBITDA_m?: number | string;
          EV?: number | string;
          Revenue_multiple?: number | string;
          Rev_Growth_PC?: number | string;
          EBITDA_margin?: number | string;
          Rule_of_40?: number | string;
          ARR_pc?: number | string;
          ARR_m?: number | string;
          Churn_pc?: number | string;
          GRR_pc?: number | string;
          NRR?: number | string;
          New_client_growth_pc?: number | string;
        }>;
        
        // Ensure all rows have all columns by creating a base row structure
        const rows: CompanyCSVRow[] = items.map((it) => {
          const primaryVal = it.primary_sectors ?? "";
          const secondaryVal = it.secondary_sectors ?? "";
          const primaryStr = Array.isArray(primaryVal)
            ? primaryVal.join(", ")
            : String(primaryVal);
          const secondaryStr = Array.isArray(secondaryVal)
            ? secondaryVal.join(", ")
            : String(secondaryVal);
          const primary = primaryStr
            ? primaryStr
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean)
            : [];
          const secondary = secondaryStr
            ? secondaryStr
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean)
            : [];

          const arrPcRaw =
            (it as Record<string, unknown>)["arr_pc"] ?? it.ARR_pc;
          const arrPc =
            typeof arrPcRaw === "number" || typeof arrPcRaw === "string"
              ? arrPcRaw
              : undefined;
          
          // Create row with ALL columns always present
          const row: CompanyCSVRow = {
            Name: it.name ?? "N/A",
            Description: it.description ?? "N/A",
            "Primary Sector(s)": CompaniesCSVExporter.formatSectors(primary),
            Sectors: CompaniesCSVExporter.formatSectors(secondary),
            Ownership: it.ownership ?? "N/A",
            "LinkedIn Members": CompaniesCSVExporter.formatLinkedinMembers(
              typeof it.linkedin_members === "number"
                ? it.linkedin_members
                : Number(it.linkedin_members)
            ),
            Country: it.country ?? "N/A",
            "Company URL": it.company_link ?? "",
            // Financial Metrics - always include all fields
            Revenue: (it.Revenue_m != null && it.Revenue_m !== "") 
              ? `${it.Revenue_m}M`
              : "N/A",
            EBITDA: (it.EBITDA_m != null && it.EBITDA_m !== "")
              ? `${it.EBITDA_m}M`
              : "N/A",
            "Enterprise Value": (it.EV != null && it.EV !== "")
              ? `${it.EV}M`
              : "N/A",
            "Revenue Multiple": (it.Revenue_multiple != null && it.Revenue_multiple !== "")
              ? String(it.Revenue_multiple)
              : "N/A",
            "Revenue Growth": (it.Rev_Growth_PC != null && it.Rev_Growth_PC !== "")
              ? `${it.Rev_Growth_PC}%`
              : "N/A",
            "EBITDA Margin": (it.EBITDA_margin != null && it.EBITDA_margin !== "")
              ? `${it.EBITDA_margin}%`
              : "N/A",
            "Rule of 40": (it.Rule_of_40 != null && it.Rule_of_40 !== "")
              ? String(it.Rule_of_40)
              : "N/A",
            // Subscription Metrics - always include all fields
            "Recurring Revenue": CompaniesCSVExporter.formatPercent(arrPc),
            ARR: (it.ARR_m != null && it.ARR_m !== "")
              ? `${it.ARR_m}M`
              : "N/A",
            Churn: (it.Churn_pc != null && it.Churn_pc !== "")
              ? `${it.Churn_pc}%`
              : "N/A",
            GRR: (it.GRR_pc != null && it.GRR_pc !== "")
              ? `${it.GRR_pc}%`
              : "N/A",
            NRR: (it.NRR != null && it.NRR !== "")
              ? `${it.NRR}%`
              : "N/A",
            "New Clients Revenue Growth": (it.New_client_growth_pc != null && it.New_client_growth_pc !== "")
              ? `${it.New_client_growth_pc}%`
              : "N/A",
          };
          return row;
        });
        
        const csv = CompaniesCSVExporter.convertToCSV(rows);
        CompaniesCSVExporter.downloadCSV(csv, `financial_metrics_companies_${revenueRange.replace(/[^a-zA-Z0-9]/g, "_")}`);
      } else {
        // Fallback: If API returns CSV directly, use it as-is
        console.warn("API returned CSV directly - financial columns may be missing and only first page will be exported");
        const normalized = firstPageText.replace(/\r?\n/g, "\r\n");
        const contentWithBOM = "\uFEFF" + normalized;
        const blob = new Blob([contentWithBOM], {
          type: "text/csv;charset=utf-8;",
        });
        const link = document.createElement("a");
        const urlObject = URL.createObjectURL(blob);
        link.href = urlObject;
        link.download = `financial_metrics_companies_${revenueRange.replace(/[^a-zA-Z0-9]/g, "_")}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(urlObject);
      }
    } catch (e) {
      console.error("Error exporting CSV:", e);
      alert("Failed to export CSV. Please try again.");
    } finally {
      setExporting(false);
    }
  }, [countries, primarySectors, secondarySectors, revenueMin, revenueMax, revenueRange]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-7xl w-full mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Companies in Revenue Range: {revenueRange}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {numCompanies.toLocaleString()} companies
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="py-10 text-center">
              <div className="mx-auto w-10 h-10 rounded-full border-b-2 border-blue-600 animate-spin" />
              <div className="mt-3 text-sm text-gray-600">Loading companies…</div>
            </div>
          ) : error ? (
            <div className="p-4 text-sm text-red-800 bg-red-50 rounded-lg border border-red-200">
              <div className="font-semibold">Couldn&apos;t load companies</div>
              <div className="mt-1 break-words">{error}</div>
            </div>
          ) : companies.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-600">
              No companies found in this revenue range.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1200px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center gap-1">
                        <span>Company Name</span>
                        {sortColumn === "name" && (
                          <span className="text-gray-400">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("country")}
                    >
                      <div className="flex items-center gap-1">
                        <span>Country</span>
                        {sortColumn === "country" && (
                          <span className="text-gray-400">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("ownership")}
                    >
                      <div className="flex items-center gap-1">
                        <span>Ownership</span>
                        {sortColumn === "ownership" && (
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
                  {sortedCompanies.map((company) => (
                    <tr key={company.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <a
                          href={`/company/${company.id}`}
                          className="text-blue-600 hover:text-blue-800 underline font-medium cursor-pointer transition-colors duration-200"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {company.name || "N/A"}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {company.country || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {company.ownership || "—"}
                      </td>
                      {METRICS.map((m) => {
                        const value = getCompanyValue(company, m.key);
                        return (
                          <td
                            key={m.key}
                            className="px-4 py-3 text-sm text-center text-gray-900"
                          >
                            {formatValue(value, m.format)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={handleExportCSV}
            disabled={exporting || companies.length === 0}
            className="px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
        </div>
        
        <ExportLimitModal
          isOpen={showExportLimitModal}
          onClose={() => setShowExportLimitModal(false)}
          exportsLeft={exportsLeft}
          totalExports={EXPORT_LIMIT}
        />
      </div>
    </div>
  );
}

