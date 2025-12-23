"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { locationsService } from "@/lib/locationsService";

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
  EV?: number | string | null;
  Revenue_multiple?: number | string | null;
  Rev_Growth_PC?: number | string | null;
  EBITDA_margin?: number | string | null;
  // Subscription metrics
  ARR_pc?: number | string | null;
  NRR?: number | string | null;
  GRR_pc?: number | string | null;
}

interface CompaniesModalProps {
  isOpen: boolean;
  onClose: () => void;
  revenueRange: string;
  revenueMin: number | null;
  revenueMax: number | null;
  numCompanies: number;
}

const METRICS = [
  { key: "ARR_pc", label: "ARR (%)", format: "percent" as const },
  { key: "EBITDA_margin", label: "EBITDA Margin (%)", format: "percent" as const },
  { key: "EV", label: "Enterprise Value ($M)", format: "money_m" as const },
  { key: "Revenue_multiple", label: "EV / Rev (x)", format: "multiple" as const },
  { key: "Rev_Growth_PC", label: "Revenue Growth (%)", format: "percent" as const },
  { key: "NRR", label: "NRR (%)", format: "percent" as const },
  { key: "GRR_pc", label: "GRR (%)", format: "percent" as const },
] as const;

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

function formatValue(
  value: unknown,
  format: (typeof METRICS)[number]["format"]
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
}: CompaniesModalProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realEstateSectorId, setRealEstateSectorId] = useState<number | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Fetch Real Estate sector ID
  useEffect(() => {
    if (!isOpen) return;
    
    let cancelled = false;
    const fetchSectorId = async () => {
      try {
        const sectors = await locationsService.getPrimarySectors();
        if (!cancelled) {
          const realEstate = sectors.find(
            (s) => s.sector_name?.toLowerCase() === "real estate"
          );
          if (realEstate?.id) {
            setRealEstateSectorId(realEstate.id);
          }
        }
      } catch (e) {
        console.error("Error fetching sector ID:", e);
      }
    };
    fetchSectorId();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  // Fetch companies when modal opens
  const fetchCompanies = useCallback(async () => {
    if (!isOpen || realEstateSectorId === null) return;
    if (revenueMin === null && revenueMax === null) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("asymmetrix_auth_token");
      const params = new URLSearchParams();
      
      params.append("Offset", "1");
      params.append("Per_page", "1000"); // Get all companies in this range
      params.append("Primary_sectors_ids[]", realEstateSectorId.toString());
      
      if (revenueMin !== null) {
        params.append("Revenue_min", revenueMin.toString());
      }
      if (revenueMax !== null) {
        params.append("Revenue_max", revenueMax.toString());
      }

      // Fetch all pages if needed
      let allItems: Company[] = [];
      let currentPage = 1;
      let hasMore = true;
      const perPage = 100;

      while (hasMore) {
        const pageParams = new URLSearchParams();
        pageParams.append("Offset", currentPage.toString());
        pageParams.append("Per_page", perPage.toString());
        pageParams.append("Primary_sectors_ids[]", realEstateSectorId.toString());
        
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
  }, [isOpen, realEstateSectorId, revenueMin, revenueMax]);

  useEffect(() => {
    if (isOpen && realEstateSectorId !== null) {
      fetchCompanies();
    }
  }, [isOpen, realEstateSectorId, fetchCompanies]);

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
              {numCompanies.toLocaleString()} companies · Primary Sector: Real Estate
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
                          className="text-blue-600 hover:text-blue-800 hover:underline"
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
        <div className="flex items-center justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

