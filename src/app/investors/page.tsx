"use client";

import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SearchableMultiSelect from "@/components/ui/SearchableMultiSelect";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { locationsService } from "@/lib/locationsService";

// Types for API integration
interface Investor {
  id?: number;
  original_new_company_id?: number;
  company_name?: string;
  investor_type?: string[];
  description?: string;
  number_of_active_investments?: number;
  da_primary_sector_names?: string[];
  linkedin_members?: number;
  country?: string;
  linkedin_logo?: string;
}

interface InvestorsResponse {
  investors: {
    itemsReceived: number;
    curPage: number;
    nextPage: number | null;
    prevPage: number | null;
    offset: number;
    itemsTotal: number;
    pageTotal: number;
    items: Investor[];
    summary_by_company_focus?: {
      privateEquityCount?: number;
      ventureCapitalCount?: number;
      familyOfficeCount?: number;
      assetManagementCount?: number;
      hedgeFundCount?: number;
      numberOfPEInvestments?: number;
      numberOfVCInvestments?: number;
      numberOfFamilyOfficeInvestments?: number;
      numberOfAssetManagerInvestments?: number;
      numberOfHedgeFundInvestments?: number;
      sumOfInvestorsActiveDAInvestments?: number;
    };
  };
}

interface InvestorsFilters {
  Investor_Types: number[];
  Primary_Sectors: number[]; // Changed from string[] to number[]
  Secondary_Sectors: number[]; // Changed from string[] to number[]
  Horizontals: string[];
  Portfolio_Companies_Min: number;
  Portfolio_Companies_Max: number;
  Search_Query: string;
  page: number;
  per_page: number;
  Countries: string[];
  Provinces: string[];
  Cities: string[];
  Continental_Region?: string[];
  geographical_sub_region?: string[];
}

// API data interfaces (same as companies page)
interface Country {
  locations_Country: string;
}

interface Province {
  State__Province__County: string;
}

interface City {
  City: string;
}

interface PrimarySector {
  id: number;
  sector_name: string;
}

interface SecondarySector {
  id: number;
  sector_name: string;
}

interface InvestorCSVRow {
  Name: string;
  Type: string;
  Description: string;
  "Current D&A Portfolio Companies": string;
  "D&A Primary Sectors": string;
  "LinkedIn Members": string;
  Country: string;
  "Investor Link": string;
}

const InvestorsPage = () => {
  const router = useRouter();

  // Shared state for investors data
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    itemsReceived: 0,
    curPage: 1,
    nextPage: null as number | null,
    prevPage: null as number | null,
    offset: 0,
    itemsTotal: 0,
    pageTotal: 0,
  });
  const [summaryData, setSummaryData] = useState({
    privateEquityCount: 0,
    ventureCapitalCount: 0,
    familyOfficeCount: 0,
    assetManagementCount: 0,
    hedgeFundCount: 0,
    numberOfPEInvestments: 0,
    numberOfVCInvestments: 0,
    numberOfFamilyOfficeInvestments: 0,
    numberOfAssetManagerInvestments: 0,
    numberOfHedgeFundInvestments: 0,
    sumOfInvestorsActiveDAInvestments: 0,
  });
  const lastRequestIdRef = useRef(0);

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<InvestorsFilters>({
    Investor_Types: [],
    Primary_Sectors: [],
    Secondary_Sectors: [],
    Horizontals: [],
    Portfolio_Companies_Min: 0,
    Portfolio_Companies_Max: 0,
    Search_Query: "",
    page: 1,
    per_page: 50,
    Countries: [],
    Provinces: [],
    Cities: [],
  });

  // State for API data (same as companies page)
  const [countries, setCountries] = useState<Country[]>([]);
  const [continentalRegions, setContinentalRegions] = useState<string[]>([]);
  const [subRegions, setSubRegions] = useState<string[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [primarySectors, setPrimarySectors] = useState<PrimarySector[]>([]);
  const [secondarySectors, setSecondarySectors] = useState<SecondarySector[]>(
    []
  );
  const [investorTypes, setInvestorTypes] = useState<
    Array<{
      id: number;
      sector_name?: string;
      name?: string;
      investor_type?: string;
    }>
  >([]);

  // Loading states
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingPrimarySectors, setLoadingPrimarySectors] = useState(false);
  const [loadingSecondarySectors, setLoadingSecondarySectors] = useState(false);
  const [loadingInvestorTypes, setLoadingInvestorTypes] = useState(false);

  // Convert API data to dropdown options format
  const countryOptions = countries.map((country) => ({
    value: country.locations_Country,
    label: country.locations_Country,
  }));

  const provinceOptions = provinces.map((province) => ({
    value: province.State__Province__County,
    label: province.State__Province__County,
  }));

  const cityOptions = cities.map((city) => ({
    value: city.City,
    label: city.City,
  }));

  const primarySectorOptions = primarySectors.map((sector) => ({
    value: sector.id,
    label: sector.sector_name,
  }));

  const secondarySectorOptions = secondarySectors.map((sector) => ({
    value: sector.id,
    label: sector.sector_name,
  }));

  const investorTypeOptions = investorTypes.map((type) => ({
    value: type.id,
    label: type.sector_name || type.name || type.investor_type || String(type),
  }));

  // State for each filter (arrays for multi-select)
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedContinentalRegions, setSelectedContinentalRegions] = useState<
    string[]
  >([]);
  const [selectedSubRegions, setSelectedSubRegions] = useState<string[]>([]);
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedPrimarySectors, setSelectedPrimarySectors] = useState<
    number[]
  >([]);
  const [selectedSecondarySectors, setSelectedSecondarySectors] = useState<
    number[]
  >([]);
  const [selectedInvestorTypes, setSelectedInvestorTypes] = useState<number[]>(
    []
  );
  const [portfolioMin, setPortfolioMin] = useState<number>(0);
  const [portfolioMax, setPortfolioMax] = useState<number>(0);
  
  // Track if initial mount is complete to prevent duplicate API calls
  const isInitialMount = useRef(true);

  const parseInitialInvestorTypeIdsFromUrl = (): number[] => {
    if (typeof window === "undefined") return [];
    try {
      const params = new URLSearchParams(window.location.search);

      const raw: string[] = [];
      // Preferred param from dashboard links
      const direct = params.get("investorTypeId");
      if (direct) raw.push(direct);

      // Support repeated/array-style params if ever used elsewhere
      params.getAll("investorTypeId").forEach((v) => raw.push(v));
      params.getAll("Investor_Types[]").forEach((v) => raw.push(v));

      // Support comma-separated list
      const list = params.get("investorTypeIds");
      if (list) raw.push(...list.split(","));

      const ids = raw
        .map((v) => Number(String(v).trim()))
        .filter((n) => Number.isFinite(n) && n > 0);

      // Dedupe
      return Array.from(new Set(ids));
    } catch {
      return [];
    }
  };

  // Fetch data from API (same as companies page)
  const fetchCountries = async () => {
    try {
      setLoadingCountries(true);
      const countriesData = await locationsService.getCountries();
      setCountries(countriesData);
    } catch (error) {
      console.error("Error fetching countries:", error);
    } finally {
      setLoadingCountries(false);
    }
  };

  const fetchContinentalRegions = async () => {
    try {
      const list = await locationsService.getContinentalRegions();
      setContinentalRegions(list);
    } catch (error) {
      console.error("Error fetching continental regions:", error);
    }
  };

  const fetchSubRegions = async () => {
    try {
      const list = await locationsService.getSubRegions();
      setSubRegions(list);
    } catch (error) {
      console.error("Error fetching sub-regions:", error);
    }
  };

  const fetchPrimarySectors = async () => {
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

  const fetchSecondarySectors = async () => {
    if (selectedPrimarySectors.length === 0) {
      setSecondarySectors([]);
      setSelectedSecondarySectors([]);
      return;
    }

    try {
      setLoadingSecondarySectors(true);

      // Get the IDs of selected primary sectors
      const selectedPrimarySectorIds = primarySectors
        .filter((sector) => selectedPrimarySectors.includes(sector.id))
        .map((sector) => sector.id);

      const secondarySectorsData = await locationsService.getSecondarySectors(
        selectedPrimarySectorIds
      );
      setSecondarySectors(secondarySectorsData);
      // Reset selected secondary sectors when primary sectors change
      setSelectedSecondarySectors([]);
    } catch (error) {
      console.error("Error fetching secondary sectors:", error);
    } finally {
      setLoadingSecondarySectors(false);
    }
  };

  const fetchProvinces = async () => {
    if (selectedCountries.length === 0) {
      setProvinces([]);
      setSelectedProvinces([]);
      return;
    }

    try {
      setLoadingProvinces(true);
      const provincesData = await locationsService.getProvinces(
        selectedCountries
      );
      setProvinces(provincesData);
      // Reset selected provinces when countries change
      setSelectedProvinces([]);
    } catch (error) {
      console.error("Error fetching provinces:", error);
    } finally {
      setLoadingProvinces(false);
    }
  };

  const fetchCities = async () => {
    if (selectedCountries.length === 0) {
      setCities([]);
      setSelectedCities([]);
      return;
    }

    try {
      setLoadingCities(true);
      const citiesData = await locationsService.getCities(
        selectedCountries,
        selectedProvinces
      );
      setCities(citiesData);
      // Reset selected cities when countries or provinces change
      setSelectedCities([]);
    } catch (error) {
      console.error("Error fetching cities:", error);
    } finally {
      setLoadingCities(false);
    }
  };

  // Fetch investor types from API (cached via locationsService)
  const fetchInvestorTypes = useCallback(async () => {
    setLoadingInvestorTypes(true);
    try {
      const data = await locationsService.getInvestorTypes();
      setInvestorTypes(data);
    } catch (err) {
      console.error("Error fetching investor types:", err);
      setError(
        `Failed to load investor types: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    } finally {
      setLoadingInvestorTypes(false);
    }
  }, []);

  const buildInvestorsSearchParams = (filters: InvestorsFilters) => {
    const params = new URLSearchParams();

    // Static per_page, change only page. Keep existing API param names
    const page = Math.max(1, filters.page || 1);
    const perPage = filters.per_page > 0 ? filters.per_page : 50;
    params.append("page", page.toString());
    params.append("per_page", perPage.toString());

    // Add search query
    if (filters.Search_Query) params.append("Search_Query", filters.Search_Query);

    // Add location filters as arrays
    if (filters.Countries.length > 0) {
      filters.Countries.forEach((country) => {
        params.append("Countries[]", country);
      });
    }

    if (filters.Provinces.length > 0) {
      filters.Provinces.forEach((province) => {
        params.append("Provinces[]", province);
      });
    }

    if (filters.Cities.length > 0) {
      filters.Cities.forEach((city) => {
        params.append("Cities[]", city);
      });
    }

    // Add new region text filters (same param names used on companies page export/search)
    if ((filters.Continental_Region || []).length > 0) {
      params.append(
        "Continental_Region",
        (filters.Continental_Region || []).join(",")
      );
    }
    if ((filters.geographical_sub_region || []).length > 0) {
      params.append(
        "geographical_sub_region",
        (filters.geographical_sub_region || []).join(",")
      );
    }

    // Add sector filters as arrays
    if (filters.Primary_Sectors.length > 0) {
      filters.Primary_Sectors.forEach((sector) => {
        params.append("Primary_Sectors[]", sector.toString());
      });
    }

    if (filters.Secondary_Sectors.length > 0) {
      filters.Secondary_Sectors.forEach((sector) => {
        params.append("Secondary_Sectors[]", sector.toString());
      });
    }

    // Add investor types as arrays
    if (filters.Investor_Types.length > 0) {
      filters.Investor_Types.forEach((type) => {
        params.append("Investor_Types[]", type.toString());
      });
    }

    // Add portfolio company range
    if (filters.Portfolio_Companies_Min > 0) {
      params.append(
        "Portfolio_Companies_Min",
        filters.Portfolio_Companies_Min.toString()
      );
    }
    if (filters.Portfolio_Companies_Max > 0) {
      params.append(
        "Portfolio_Companies_Max",
        filters.Portfolio_Companies_Max.toString()
      );
    }

    // Add horizontals if needed
    if (filters.Horizontals.length > 0) {
      filters.Horizontals.forEach((horizontal) => {
        params.append("Horizontals[]", horizontal);
      });
    }

    return params;
  };

  // Fetch investors data from API
  const fetchInvestors = useCallback(async (filters: InvestorsFilters) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("asymmetrix_auth_token");

      // Use our cached proxy endpoint (Redis-backed for initial page).
      const params = buildInvestorsSearchParams(filters);
      const url = `/api/investors/list?${params.toString()}`;

      const requestId = ++lastRequestIdRef.current;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        const statusText = response.statusText || "";
        const status = response.status;
        const details = [statusText, errorText].filter(Boolean).join(" - ");
        throw new Error(`API request failed (${status}): ${details}`);
      }

      const data: InvestorsResponse = await response.json();
      // Ignore stale responses
      if (requestId === lastRequestIdRef.current) {
        setInvestors(data.investors.items);
        setPagination({
          itemsReceived: data.investors.itemsReceived,
          curPage: data.investors.curPage,
          nextPage: data.investors.nextPage,
          prevPage: data.investors.prevPage,
          offset: data.investors.offset,
          itemsTotal: data.investors.itemsTotal,
          pageTotal: data.investors.pageTotal,
        });
        setSummaryData({
          privateEquityCount:
            data.investors.summary_by_company_focus?.privateEquityCount || 0,
          ventureCapitalCount:
            data.investors.summary_by_company_focus?.ventureCapitalCount || 0,
          familyOfficeCount:
            data.investors.summary_by_company_focus?.familyOfficeCount || 0,
          assetManagementCount:
            data.investors.summary_by_company_focus?.assetManagementCount || 0,
          hedgeFundCount:
            data.investors.summary_by_company_focus?.hedgeFundCount || 0,
          numberOfPEInvestments:
            data.investors.summary_by_company_focus?.numberOfPEInvestments || 0,
          numberOfVCInvestments:
            data.investors.summary_by_company_focus?.numberOfVCInvestments || 0,
          numberOfFamilyOfficeInvestments:
            data.investors.summary_by_company_focus
              ?.numberOfFamilyOfficeInvestments || 0,
          numberOfAssetManagerInvestments:
            data.investors.summary_by_company_focus
              ?.numberOfAssetManagerInvestments || 0,
          numberOfHedgeFundInvestments:
            data.investors.summary_by_company_focus
              ?.numberOfHedgeFundInvestments || 0,
          sumOfInvestorsActiveDAInvestments:
            data.investors.summary_by_company_focus
              ?.sumOfInvestorsActiveDAInvestments || 0,
        });
      } else {
        console.log(
          "[Investors] Ignoring stale response for request",
          requestId
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch investors"
      );
      console.error("Error fetching investors:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const escapeCsvValue = (value: unknown) => {
    const str = value === undefined || value === null ? "" : String(value);
    return `"${str.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
  };

  const convertToCSV = (rows: InvestorCSVRow[]) => {
    if (rows.length === 0) return "";
    const headers = Object.keys(rows[0]) as Array<keyof InvestorCSVRow>;
    const csvBody = [
      headers.map((h) => escapeCsvValue(h)).join(","),
      ...rows.map((row) => headers.map((h) => escapeCsvValue(row[h])).join(",")),
    ].join("\r\n");

    // Prepend UTF-8 BOM to help Excel/Sheets parse correctly
    const BOM = "\uFEFF";
    return BOM + csvBody;
  };

  const downloadCSV = (csvContent: string, filename: string) => {
    const timestamp = new Date().toISOString().split("T")[0];
    const fullFilename = `${filename}_${timestamp}.csv`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fullFilename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = useCallback(async () => {
    setExporting(true);
    setError(null);

    try {
      const total = Math.max(0, Number(pagination.itemsTotal || 0));
      if (!total) throw new Error("No results to export");

      const token = localStorage.getItem("asymmetrix_auth_token");

      // IMPORTANT: export should include *all* results, not just the current page.
      // We request per_page as itemsTotal. If the backend caps per_page anyway,
      // we fall back to paging until nextPage is null.
      const exportFilters: InvestorsFilters = {
        ...filters,
        page: 1,
        per_page: total,
      };

      const all: Investor[] = [];
      const seen = new Set<string>();

      let page = 1;
      let nextPage: number | null = 1;
      let safety = 0;

      while (nextPage && safety < 250) {
        safety += 1;
        page = nextPage;

        const params = buildInvestorsSearchParams({ ...exportFilters, page });
        const url = `/api/investors/list?${params.toString()}`;

        const resp = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });

        if (!resp.ok) {
          const errText = await resp.text().catch(() => "");
          throw new Error(
            `Export request failed (${resp.status}): ${resp.statusText} ${errText}`.trim()
          );
        }

        const data: InvestorsResponse = await resp.json();
        const items = data.investors.items || [];

        for (const it of items) {
          const key = String(it.original_new_company_id ?? it.id ?? "");
          if (key && !seen.has(key)) {
            seen.add(key);
            all.push(it);
          } else if (!key) {
            all.push(it);
          }
        }

        nextPage = data.investors.nextPage;
      }

      if (all.length === 0) throw new Error("Export returned empty data");

      const rows: InvestorCSVRow[] = all.map((inv) => {
        const link =
          typeof window !== "undefined" && inv.original_new_company_id
            ? `${window.location.origin}/investors/${inv.original_new_company_id}`
            : inv.original_new_company_id
              ? `/investors/${inv.original_new_company_id}`
              : "";

        return {
          Name: inv.company_name || "N/A",
          Type:
            inv.investor_type && inv.investor_type.length > 0
              ? inv.investor_type.join(", ")
              : "N/A",
          Description: inv.description || "N/A",
          "Current D&A Portfolio Companies": String(
            inv.number_of_active_investments ?? 0
          ),
          "D&A Primary Sectors":
            inv.da_primary_sector_names && inv.da_primary_sector_names.length > 0
              ? inv.da_primary_sector_names.join(", ")
              : "N/A",
          "LinkedIn Members": String(inv.linkedin_members ?? 0),
          Country: inv.country || "N/A",
          "Investor Link": link,
        };
      });

      const csv = convertToCSV(rows);
      downloadCSV(csv, "investors_filtered");
    } catch (e) {
      console.error("Error exporting investors CSV:", e);
      setError(e instanceof Error ? e.message : "Failed to export CSV");
    } finally {
      setExporting(false);
    }
  }, [filters, pagination.itemsTotal]);

  // Initial data fetch
  useEffect(() => {
    fetchCountries();
    fetchPrimarySectors();
    fetchInvestorTypes();
    fetchContinentalRegions();
    fetchSubRegions();

    const initialInvestorTypeIds = parseInitialInvestorTypeIdsFromUrl();
    const initialFilters: InvestorsFilters =
      initialInvestorTypeIds.length > 0
        ? { ...filters, Investor_Types: initialInvestorTypeIds, page: 1 }
        : filters;

    if (initialInvestorTypeIds.length > 0) {
      // Pre-set the "By Type" dropdown and reveal filters
      setSelectedInvestorTypes(initialInvestorTypeIds);
      setShowFilters(true);
      setFilters(initialFilters);
    }

    // Initial fetch (optionally pre-filtered from URL)
    fetchInvestors(initialFilters);
    
    // Mark initial mount as complete after a short delay
    setTimeout(() => {
      isInitialMount.current = false;
    }, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch provinces when countries are selected
  useEffect(() => {
    fetchProvinces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountries]);

  // Fetch cities when countries or provinces are selected
  useEffect(() => {
    fetchCities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountries, selectedProvinces]);

  // Fetch secondary sectors when primary sectors are selected
  useEffect(() => {
    fetchSecondarySectors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPrimarySectors, primarySectors]);

  // Handle search
  const handleSearch = () => {
    const updatedFilters = {
      ...filters,
      Search_Query: searchTerm,
      Continental_Region: selectedContinentalRegions,
      geographical_sub_region: selectedSubRegions,
      Countries: selectedCountries,
      Provinces: selectedProvinces,
      Cities: selectedCities,
      Primary_Sectors: selectedPrimarySectors,
      Secondary_Sectors: selectedSecondarySectors,
      Investor_Types: selectedInvestorTypes,
      Portfolio_Companies_Min: portfolioMin,
      Portfolio_Companies_Max: portfolioMax,
      page: 1, // Reset to first page when searching
    };
    setFilters(updatedFilters);
    fetchInvestors(updatedFilters);
  };

  // Auto-apply new location region filters as on Companies page
  useEffect(() => {
    if (isInitialMount.current) return;
    
    if (
      selectedContinentalRegions.length > 0 ||
      selectedSubRegions.length > 0
    ) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContinentalRegions, selectedSubRegions]);

  // Auto-refresh results when Investor Types change
  useEffect(() => {
    if (isInitialMount.current) return;
    
    const updatedFilters = {
      ...filters,
      Investor_Types: selectedInvestorTypes,
      page: 1,
    };
    setFilters(updatedFilters);
    fetchInvestors(updatedFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInvestorTypes]);

  // Handle page change
  const handlePageChange = (page: number) => {
    const updatedFilters = { ...filters, page };
    setFilters(updatedFilters);
    fetchInvestors(updatedFilters);
  };

  // Handle filter reset
  const handleResetFilters = () => {
    setSelectedCountries([]);
    setSelectedContinentalRegions([]);
    setSelectedSubRegions([]);
    setSelectedProvinces([]);
    setSelectedCities([]);
    setSelectedPrimarySectors([]);
    setSelectedSecondarySectors([]);
    setSelectedInvestorTypes([]);
    setPortfolioMin(0);
    setPortfolioMax(0);
    setSearchTerm("");

    const resetFilters: InvestorsFilters = {
      Investor_Types: [],
      Primary_Sectors: [],
      Secondary_Sectors: [],
      Horizontals: [],
      Portfolio_Companies_Min: 0,
      Portfolio_Companies_Max: 0,
      Search_Query: "",
      page: 1,
      per_page: 50,
      Countries: [],
      Provinces: [],
      Cities: [],
      Continental_Region: [],
      geographical_sub_region: [],
    };
    setFilters(resetFilters);
    fetchInvestors(resetFilters);
  };

  const styles = {
    container: {
      backgroundColor: "#f9fafb",
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    maxWidth: {
      padding: "16px",
      display: "flex" as const,
      flexDirection: "column" as const,
      gap: "16px",
    },
    card: {
      backgroundColor: "white",
      borderRadius: "12px",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
      padding: "20px 24px",
      marginBottom: "0",
    },
    heading: {
      fontSize: "24px",
      fontWeight: "700",
      color: "#1a202c",
      marginBottom: "8px",
      marginTop: "0px",
    },
    subHeading: {
      fontSize: "20px",
      fontWeight: "600",
      color: "#1a202c",
      marginBottom: "12px",
    },
    searchDiv: {
      display: "flex" as const,
      flexDirection: "column" as const,
    },
    input: {
      width: "100%",
      maxWidth: "300px",
      padding: "15px 14px",
      border: "1px solid #e2e8f0",
      borderRadius: "6px",
      fontSize: "14px",
      color: "#4a5568",
      outline: "none",
      marginBottom: "12px",
    },
    button: {
      width: "100%",
      maxWidth: "300px",
      backgroundColor: "#0075df",
      color: "white",
      fontWeight: "600",
      padding: "15px 14px",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
      marginTop: "8px",
    },
    linkButton: {
      color: "#000",
      fontWeight: "400",
      textDecoration: "underline",
      background: "none",
      border: "none",
      cursor: "pointer",
      fontSize: "14px",
      marginTop: "16px",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "12px 24px",
      marginBottom: "16px",
    },
    gridItem: {
      display: "flex" as const,
      flexDirection: "column" as const,
    },
    label: {
      color: "#00050B",
      fontWeight: "600",
      fontSize: "16px",
      marginBottom: "8px",
      marginTop: "14px",
    },
    select: {
      width: "100%",
      padding: "13px 14px",
      border: "1px solid #e2e8f0",
      borderRadius: "6px",
      fontSize: "16px",
      color: "#718096",
      outline: "none",
      marginBottom: "0px",
      appearance: "none" as const,
      background:
        "white url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%234a5568' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E\") no-repeat right 12px center",
      cursor: "pointer",
    },
    rangeInput: {
      width: "100%",
      padding: "13px 14px",
      border: "1px solid #e2e8f0",
      borderRadius: "6px",
      fontSize: "16px",
      color: "#4a5568",
      outline: "none",
      marginBottom: "12px",
    },
    loading: {
      textAlign: "center" as const,
      padding: "20px",
      color: "#666",
    },
    error: {
      textAlign: "center" as const,
      padding: "20px",
      color: "#e53e3e",
      backgroundColor: "#fed7d7",
      borderRadius: "6px",
      marginBottom: "16px",
    },
  };

  // Format numbers with commas
  const formatNumber = (num: number | undefined) => {
    if (num === undefined || num === null) return "0";
    return num.toLocaleString();
  };

  // Truncate description for display
  const truncateDescription = (description: string) => {
    const isDescriptionLong = description.length > 220;
    return isDescriptionLong
      ? description.substring(0, 220) + "..."
      : description;
  };

  // Memoized table row component for better performance
  const InvestorRow = memo(({ investor, index, onNavigate, isPriority }: { investor: Investor; index: number; onNavigate: (id: number) => void; isPriority?: boolean }) => {
    const description = investor.description || "N/A";
    const isDescriptionLong = description.length > 220;
    const truncatedDescription = isDescriptionLong
      ? description.substring(0, 220) + "..."
      : description;
    const [isExpanded, setIsExpanded] = useState(false);

    return (
      <tr key={investor.id || index}>
        <td>
          {investor.linkedin_logo ? (
            <img
              src={`data:image/jpeg;base64,${investor.linkedin_logo}`}
              alt={`${investor.company_name} logo`}
              className="investor-logo"
              loading={isPriority ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={isPriority ? "high" : undefined}
            />
          ) : (
            <div
              style={{
                width: "60px",
                height: "40px",
                backgroundColor: "#f7fafc",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10px",
                color: "#718096",
              }}
            >
              No Logo
            </div>
          )}
        </td>
        <td>
          {investor.original_new_company_id ? (
            <a
              href={`/investors/${investor.original_new_company_id}`}
              className="investor-name"
              style={{
                textDecoration: "underline",
                color: "#0075df",
                cursor: "pointer",
                fontWeight: "500",
              }}
              onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                if (
                  e.defaultPrevented ||
                  e.button !== 0 ||
                  e.metaKey ||
                  e.ctrlKey ||
                  e.shiftKey ||
                  e.altKey
                ) {
                  return;
                }
                e.preventDefault();
                onNavigate(investor.original_new_company_id!);
              }}
              title="Open investor"
            >
              {investor.company_name || "N/A"}
            </a>
          ) : (
            <span className="investor-name">{investor.company_name || "N/A"}</span>
          )}
        </td>
        <td>
          {investor.investor_type && investor.investor_type.length > 0
            ? investor.investor_type.join(", ")
            : "N/A"}
        </td>
        <td className="investor-description">
          {isDescriptionLong ? (
            <>
              <div style={{ display: isExpanded ? "none" : "block" }}>
                {truncatedDescription}
              </div>
              <div style={{ display: isExpanded ? "block" : "none" }}>
                {description}
              </div>
              <span
                className="expand-description"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? "Collapse description" : "Expand description"}
              </span>
            </>
          ) : (
            description
          )}
        </td>
        <td>{formatNumber(investor.number_of_active_investments)}</td>
        <td className="sectors-list">
          {investor.da_primary_sector_names &&
          investor.da_primary_sector_names.length > 0
            ? investor.da_primary_sector_names.slice(0, 3).join(", ") + 
              (investor.da_primary_sector_names.length > 3 ? "..." : "")
            : "N/A"}
        </td>
        <td>{formatNumber(investor.linkedin_members)}</td>
        <td>{investor.country || "N/A"}</td>
      </tr>
    );
  });

  // Memoized Investor Card Component for mobile
  const InvestorCard = memo(({ investor, index, onNavigate }: { investor: Investor; index: number; onNavigate: (id: number) => void }) => {
    const description = investor.description || "N/A";
    const isDescriptionLong = description.length > 220;
    const truncatedDescription = truncateDescription(description);
    const [isExpanded, setIsExpanded] = useState(false);

    return (
      <div
        key={investor.id || index}
        className="investor-card"
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "12px",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          border: "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "12px",
            gap: "12px",
          }}
        >
          {investor.linkedin_logo ? (
            <img
              src={`data:image/jpeg;base64,${investor.linkedin_logo}`}
              alt={`${investor.company_name} logo`}
              style={{
                width: "50px",
                height: "35px",
                objectFit: "contain",
                borderRadius: "4px",
              }}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div
              style={{
                width: "50px",
                height: "35px",
                backgroundColor: "#f7fafc",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10px",
                color: "#718096",
              }}
            >
              No Logo
            </div>
          )}
          <div style={{ flex: "1" }}>
            <a
              href={
                investor.original_new_company_id
                  ? `/investors/${investor.original_new_company_id}`
                  : undefined
              }
              style={{
                fontSize: "16px",
                fontWeight: "600",
                color: "#0075df",
                textDecoration: "underline",
                cursor: "pointer",
                marginBottom: "4px",
              }}
              onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                if (
                  !investor.original_new_company_id ||
                  e.defaultPrevented ||
                  e.button !== 0 ||
                  e.metaKey ||
                  e.ctrlKey ||
                  e.shiftKey ||
                  e.altKey
                )
                  return;
                e.preventDefault();
                onNavigate(investor.original_new_company_id);
              }}
            >
              {investor.company_name || "N/A"}
            </a>
            <div style={{ fontSize: "14px", color: "#4a5568" }}>
              {investor.investor_type && investor.investor_type.length > 0
                ? investor.investor_type.join(", ")
                : "N/A"}
            </div>
          </div>
        </div>
        <div
          style={{
            fontSize: "14px",
            color: "#4a5568",
            lineHeight: "1.4",
            marginBottom: "12px",
          }}
        >
          {isDescriptionLong ? (
            <>
              <div style={{ display: isExpanded ? "none" : "block" }}>
                {truncatedDescription}
              </div>
              <div style={{ display: isExpanded ? "block" : "none" }}>
                {description}
              </div>
              <span
                style={{
                  color: "#0075df",
                  textDecoration: "underline",
                  cursor: "pointer",
                  fontSize: "12px",
                  marginTop: "4px",
                  display: "block",
                }}
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? "Collapse description" : "Expand description"}
              </span>
            </>
          ) : (
            description
          )}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            fontSize: "12px",
            borderTop: "1px solid #e2e8f0",
            paddingTop: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px 0",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <span style={{ color: "#4a5568", fontWeight: "500" }}>Portfolio:</span>
            <span style={{ fontWeight: "600", color: "#1a202c" }}>
              {formatNumber(investor.number_of_active_investments)}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px 0",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <span style={{ color: "#4a5568", fontWeight: "500" }}>LinkedIn:</span>
            <span style={{ fontWeight: "600", color: "#1a202c" }}>
              {formatNumber(investor.linkedin_members)}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px 0",
              borderBottom: "1px solid #f1f5f9",
            }}
          >
            <span style={{ color: "#4a5568", fontWeight: "500" }}>Country:</span>
            <span style={{ fontWeight: "600", color: "#1a202c" }}>
              {investor.country || "N/A"}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "8px 0",
            }}
          >
            <span style={{ color: "#4a5568", fontWeight: "500" }}>Sectors:</span>
            <span
              style={{
                fontWeight: "600",
                color: "#1a202c",
                textAlign: "right",
                maxWidth: "60%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {investor.da_primary_sector_names &&
              investor.da_primary_sector_names.length > 0
                ? investor.da_primary_sector_names.join(", ")
                : "N/A"}
            </span>
          </div>
        </div>
      </div>
    );
  });

  InvestorRow.displayName = "InvestorRow";
  InvestorCard.displayName = "InvestorCard";

  // Navigation handler
  const handleNavigate = useCallback((id: number) => {
    router.push(`/investors/${id}`);
  }, [router]);

  // Skeleton loader for initial load
  const TableSkeleton = () => (
    <table className="investor-table">
      <thead>
        <tr>
          <th>Logo</th>
          <th>Name</th>
          <th>Type</th>
          <th>Description</th>
          <th>Current D&A Portfolio Companies</th>
          <th>D&A Primary Sectors</th>
          <th>LinkedIn Members</th>
          <th>Country</th>
        </tr>
      </thead>
      <tbody>
        {[...Array(10)].map((_, i) => (
          <tr key={i}>
            <td><div className="loading-skeleton" style={{ width: "60px", height: "40px" }} /></td>
            <td><div className="loading-skeleton" style={{ width: "100%", height: "20px" }} /></td>
            <td><div className="loading-skeleton" style={{ width: "100%", height: "20px" }} /></td>
            <td><div className="loading-skeleton" style={{ width: "100%", height: "40px" }} /></td>
            <td><div className="loading-skeleton" style={{ width: "60px", height: "20px" }} /></td>
            <td><div className="loading-skeleton" style={{ width: "100%", height: "20px" }} /></td>
            <td><div className="loading-skeleton" style={{ width: "60px", height: "20px" }} /></td>
            <td><div className="loading-skeleton" style={{ width: "80%", height: "20px" }} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const style = `
    * {
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .investor-section {
      padding: 16px 24px;
      border-radius: 8px;
    }
    .investor-stats { background: #fff; padding: 16px 16px; box-shadow: 0px 1px 3px 0px rgba(227, 228, 230, 1); border-radius: 16px; margin-bottom: 12px; }
    .stats-title {
      font-size: 22px;
      font-weight: 700;
      color: #1a202c;
      margin: 0 0 16px 0;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .stats-column {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .stats-item {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      gap: 8px;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .stats-item:last-child {
      border-bottom: none;
    }
    .stats-label {
      font-size: 14px;
      color: #4a5568;
      font-weight: 500;
    }
    .stats-value {
      font-size: 16px;
      color: #000;
      font-weight: 600;
    }
    .investor-table { 
      width: 100%; 
      background: #fff; 
      padding: 16px 16px; 
      box-shadow: 0px 1px 3px 0px rgba(227, 228, 230, 1); 
      border-radius: 16px; 
      border-collapse: collapse; 
      table-layout: fixed;
      content-visibility: auto;
      contain-intrinsic-size: auto 500px;
    }
    .investor-table tbody {
      content-visibility: auto;
    }
    .investor-table th:nth-child(1) { width: 8%; }  /* Logo */
    .investor-table th:nth-child(2) { width: 12%; } /* Name */
    .investor-table th:nth-child(3) { width: 10%; } /* Type */
    .investor-table th:nth-child(4) { width: 25%; } /* Description - Wider */
    .investor-table th:nth-child(5) { width: 10%; } /* Portfolio Companies */
    .investor-table th:nth-child(6) { width: 18%; } /* Sectors */
    .investor-table th:nth-child(7) { width: 9%; }  /* LinkedIn Members */
    .investor-table th:nth-child(8) { width: 8%; }  /* Country */
    .investor-table th,
    .investor-table td {
      padding: 12px;
      text-align: left;
      vertical-align: top;
      border-bottom: 1px solid #e2e8f0;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .investor-table th {
      font-weight: 600;
      color: #1a202c;
      font-size: 14px;
      background: #f9fafb;
      border-bottom: 2px solid #e2e8f0;
    }
    .investor-table td {
      font-size: 14px;
      color: #000;
      line-height: 1.5;
    }
    .investor-logo {
      width: 60px;
      height: 40px;
      object-fit: contain;
      vertical-align: middle;
      border-radius: 4px;
    }
    .investor-name {
      color: #0075df;
      text-decoration: underline;
      cursor: pointer;
      font-weight: 500;
      transition: color 0.2s;
    }
    .investor-name:hover {
      color: #005bb5;
    }
    .investor-description { max-width: 380px; line-height: 1.4; }
    .search-row { display: flex; align-items: center; gap: 12px; }
    .search-row .filters-input { margin: 0; max-width: 340px; }
    .search-row .filters-button { margin: 0; max-width: 140px; }
    .investor-description-truncated {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .expand-description {
      color: #0075df;
      text-decoration: underline;
      cursor: pointer;
      font-size: 12px;
      margin-top: 4px;
      display: block;
      will-change: transform;
    }
    .sectors-list {
      max-width: 250px;
      line-height: 1.3;
      contain: layout style;
    }
    .loading {
      text-align: center;
      padding: 40px;
      color: #666;
    }
    .loading-skeleton {
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: loading 1.5s ease-in-out infinite;
      border-radius: 4px;
    }
    @keyframes loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .error {
      text-align: center;
      padding: 20px;
      color: #e53e3e;
      background-color: #fed7d7;
      border-radius: 6px;
      margin-bottom: 16px;
    }
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 16px;
      margin-top: 24px;
      padding: 16px;
    }
    .pagination-button {
      padding: 8px 12px;
      border: none;
      background: none;
      color: #000;
      cursor: pointer;
      font-size: 14px;
      font-weight: 400;
      transition: color 0.2s;
      text-decoration: none;
    }
    .pagination-button:hover {
      color: #0075df;
    }
    .pagination-button.active {
      color: #0075df;
      text-decoration: underline;
      font-weight: 500;
    }
    .pagination-button:disabled {
      opacity: 0.3;
      cursor: not-allowed;
      color: #666;
    }
    .pagination-ellipsis {
      padding: 8px 12px;
      color: #000;
      font-size: 14px;
    }
    .investor-cards {
      display: none;
    }
    .investor-card {
      content-visibility: auto;
      contain-intrinsic-size: auto 300px;
    }
    @media (max-width: 768px) {
      .investor-table {
        display: none !important;
      }
      .investor-cards {
        display: block !important;
        padding: 8px !important;
      }
      .pagination {
        flex-wrap: wrap !important;
        gap: 8px !important;
        padding: 16px 8px !important;
      }
      .pagination-button {
        padding: 8px 10px !important;
        font-size: 13px !important;
        min-width: 32px !important;
        text-align: center !important;
      }
      .pagination-ellipsis {
        padding: 8px 6px !important;
        font-size: 13px !important;
      }
      .investor-section {
        padding: 12px 8px !important;
      }
      .investor-stats {
        padding: 16px 16px !important;
      }
      .stats-title {
        font-size: 18px !important;
        margin-bottom: 12px !important;
      }
      .stats-grid {
        grid-template-columns: 1fr !important;
        gap: 12px !important;
      }
      .stats-item {
        padding: 6px 0 !important;
      }
      .stats-label {
        font-size: 12px !important;
      }
      .stats-value {
        font-size: 14px !important;
      }
      .filters-grid {
        display: grid !important;
        grid-template-columns: 1fr !important;
        gap: 16px !important;
      }
      .filters-card {
        padding: 16px 16px !important;
      }
      .filters-heading {
        font-size: 20px !important;
        margin-bottom: 16px !important;
      }
      .filters-sub-heading {
        font-size: 16px !important;
        margin-bottom: 8px !important;
      }
      .filters-input {
        max-width: 100% !important;
      }
      .filters-button {
        max-width: 100% !important;
      }
    }
    @media (min-width: 769px) {
      .investor-cards {
        display: none !important;
      }
      .investor-table {
        display: table !important;
      }
    }
  `;

  // Memoize investor rows to prevent unnecessary re-renders
  const investorRows = useMemo(
    () =>
      investors.map((investor, index) => (
        <InvestorRow
          key={investor.id || index}
          investor={investor}
          index={index}
          onNavigate={handleNavigate}
          isPriority={index < 5}
        />
      )),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [investors, handleNavigate]
  );

  // Memoize investor cards for mobile
  const investorCards = useMemo(
    () =>
      investors.map((investor, index) => (
        <InvestorCard
          key={investor.id || index}
          investor={investor}
          index={index}
          onNavigate={handleNavigate}
        />
      )),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [investors, handleNavigate]
  );

  // Generate pagination buttons
  const generatePaginationButtons = () => {
    const buttons = [];
    const currentPage = pagination.curPage;
    const totalPages = pagination.pageTotal;

    // Previous button
    buttons.push(
      React.createElement(
        "button",
        {
          key: "prev",
          className: "pagination-button",
          onClick: () => handlePageChange(currentPage - 1),
          disabled: !pagination.prevPage,
        },
        "<"
      )
    );

    // Page numbers
    if (totalPages <= 7) {
      // Show all pages if total is 7 or less
      for (let i = 1; i <= totalPages; i++) {
        buttons.push(
          React.createElement(
            "button",
            {
              key: i,
              className: `pagination-button ${
                i === currentPage ? "active" : ""
              }`,
              onClick: () => handlePageChange(i),
            },
            i.toString()
          )
        );
      }
    } else {
      // Show first page
      buttons.push(
        React.createElement(
          "button",
          {
            key: 1,
            className: `pagination-button ${currentPage === 1 ? "active" : ""}`,
            onClick: () => handlePageChange(1),
          },
          "1"
        )
      );

      // Show second page if not first
      if (currentPage > 2) {
        buttons.push(
          React.createElement(
            "button",
            {
              key: 2,
              className: "pagination-button",
              onClick: () => handlePageChange(2),
            },
            "2"
          )
        );
      }

      // Show ellipsis if needed
      if (currentPage > 3) {
        buttons.push(
          React.createElement(
            "span",
            { key: "ellipsis1", className: "pagination-ellipsis" },
            "..."
          )
        );
      }

      // Show current page and neighbors
      for (
        let i = Math.max(3, currentPage - 1);
        i <= Math.min(totalPages - 2, currentPage + 1);
        i++
      ) {
        if (i > 2 && i < totalPages - 1) {
          buttons.push(
            React.createElement(
              "button",
              {
                key: i,
                className: `pagination-button ${
                  i === currentPage ? "active" : ""
                }`,
                onClick: () => handlePageChange(i),
              },
              i.toString()
            )
          );
        }
      }

      // Show ellipsis if needed
      if (currentPage < totalPages - 2) {
        buttons.push(
          React.createElement(
            "span",
            { key: "ellipsis2", className: "pagination-ellipsis" },
            "..."
          )
        );
      }

      // Show second to last page if not last
      if (currentPage < totalPages - 1) {
        buttons.push(
          React.createElement(
            "button",
            {
              key: totalPages - 1,
              className: "pagination-button",
              onClick: () => handlePageChange(totalPages - 1),
            },
            (totalPages - 1).toString()
          )
        );
      }

      // Show last page
      buttons.push(
        React.createElement(
          "button",
          {
            key: totalPages,
            className: `pagination-button ${
              currentPage === totalPages ? "active" : ""
            }`,
            onClick: () => handlePageChange(totalPages),
          },
          totalPages.toString()
        )
      );
    }

    // Next button
    buttons.push(
      React.createElement(
        "button",
        {
          key: "next",
          className: "pagination-button",
          onClick: () => handlePageChange(currentPage + 1),
          disabled: !pagination.nextPage,
        },
        ">"
      )
    );

    return buttons;
  };

  return (
    <div className="min-h-screen">
      <Header />

      {/* Filters Section */}
      <div style={styles.container}>
        <div style={styles.maxWidth}>
          <div
            className="filters-card"
            style={{
              ...styles.card,
              ...(showFilters ? {} : { padding: "12px 16px" }),
            }}
          >
            {showFilters && (
              <h2 className="filters-heading" style={styles.heading}>
                Filters
              </h2>
            )}

            {showFilters && (
              <div className="filters-grid" style={styles.grid}>
                <div style={styles.gridItem}>
                  <h3 className="filters-sub-heading" style={styles.subHeading}>
                    HQ of Portfolio companies
                  </h3>
                  <span className="filters-label" style={styles.label}>
                    By Continental Region
                  </span>
                  <SearchableSelect
                    options={continentalRegions.map((r) => ({
                      value: r,
                      label: r,
                    }))}
                    value=""
                    onChange={(value) => {
                      if (
                        typeof value === "string" &&
                        value &&
                        !selectedContinentalRegions.includes(value)
                      ) {
                        setSelectedContinentalRegions([
                          ...selectedContinentalRegions,
                          value,
                        ]);
                      }
                    }}
                    placeholder={"Select Continental Region"}
                    style={styles.select}
                  />
                  {selectedContinentalRegions.length > 0 && (
                    <div
                      style={{
                        marginTop: "8px",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "4px",
                      }}
                    >
                      {selectedContinentalRegions.map((r) => (
                        <span
                          key={r}
                          style={{
                            backgroundColor: "#e3f2fd",
                            color: "#1976d2",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {r}
                          <button
                            onClick={() =>
                              setSelectedContinentalRegions(
                                selectedContinentalRegions.filter(
                                  (x) => x !== r
                                )
                              )
                            }
                            style={{
                              background: "none",
                              border: "none",
                              color: "#1976d2",
                              cursor: "pointer",
                              fontWeight: "bold",
                              fontSize: "14px",
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <span className="filters-label" style={styles.label}>
                    By Sub-Region
                  </span>
                  <SearchableSelect
                    options={subRegions.map((r) => ({ value: r, label: r }))}
                    value=""
                    onChange={(value) => {
                      if (
                        typeof value === "string" &&
                        value &&
                        !selectedSubRegions.includes(value)
                      ) {
                        setSelectedSubRegions([...selectedSubRegions, value]);
                      }
                    }}
                    placeholder={"Select Sub-Region"}
                    style={styles.select}
                  />
                  {selectedSubRegions.length > 0 && (
                    <div
                      style={{
                        marginTop: "8px",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "4px",
                      }}
                    >
                      {selectedSubRegions.map((r) => (
                        <span
                          key={r}
                          style={{
                            backgroundColor: "#e3f2fd",
                            color: "#1976d2",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {r}
                          <button
                            onClick={() =>
                              setSelectedSubRegions(
                                selectedSubRegions.filter((x) => x !== r)
                              )
                            }
                            style={{
                              background: "none",
                              border: "none",
                              color: "#1976d2",
                              cursor: "pointer",
                              fontWeight: "bold",
                              fontSize: "14px",
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <span className="filters-label" style={styles.label}>
                    By Country
                  </span>
                  <SearchableMultiSelect
                    options={countryOptions}
                    selectedValues={selectedCountries}
                    onSelectionChange={setSelectedCountries}
                    placeholder={
                      loadingCountries ? "Loading..." : "Select Country"
                    }
                    disabled={loadingCountries}
                    style={styles.select}
                  />
                  <span className="filters-label" style={styles.label}>
                    By State/County/Province
                  </span>
                  <SearchableMultiSelect
                    options={provinceOptions}
                    selectedValues={selectedProvinces}
                    onSelectionChange={setSelectedProvinces}
                    placeholder={
                      loadingProvinces ? "Loading..." : "Select Province"
                    }
                    disabled={loadingProvinces}
                    style={styles.select}
                  />
                  <span className="filters-label" style={styles.label}>
                    By City
                  </span>
                  <SearchableMultiSelect
                    options={cityOptions}
                    selectedValues={selectedCities}
                    onSelectionChange={setSelectedCities}
                    placeholder={loadingCities ? "Loading..." : "Select City"}
                    disabled={loadingCities}
                    style={styles.select}
                  />
                </div>
                <div style={styles.gridItem}>
                  <h3 className="filters-sub-heading" style={styles.subHeading}>
                    Sector Invested In
                  </h3>
                  <span className="filters-label" style={styles.label}>
                    By Primary Sectors
                  </span>
                  <SearchableMultiSelect
                    options={primarySectorOptions}
                    selectedValues={selectedPrimarySectors}
                    onSelectionChange={setSelectedPrimarySectors}
                    placeholder={
                      loadingPrimarySectors
                        ? "Loading..."
                        : "Select Primary Sector"
                    }
                    disabled={loadingPrimarySectors}
                    style={styles.select}
                  />
                  <span className="filters-label" style={styles.label}>
                    By Secondary Sector
                  </span>
                  <SearchableMultiSelect
                    options={secondarySectorOptions}
                    selectedValues={selectedSecondarySectors}
                    onSelectionChange={setSelectedSecondarySectors}
                    placeholder={
                      loadingSecondarySectors
                        ? "Loading..."
                        : "Select Secondary Sector"
                    }
                    disabled={loadingSecondarySectors}
                    style={styles.select}
                  />
                </div>
                <div style={styles.gridItem}>
                  <h3 className="filters-sub-heading" style={styles.subHeading}>
                    Investor Type
                  </h3>
                  <span className="filters-label" style={styles.label}>
                    By Type
                  </span>
                  <SearchableMultiSelect
                    options={investorTypeOptions}
                    selectedValues={selectedInvestorTypes}
                    onSelectionChange={setSelectedInvestorTypes}
                    placeholder={
                      loadingInvestorTypes
                        ? "Loading..."
                        : "Select Investor Type"
                    }
                    disabled={loadingInvestorTypes}
                    style={styles.select}
                  />
                  <span className="filters-label" style={styles.label}>
                    Portfolio Companies
                  </span>
                  <div style={{ display: "flex", gap: "14px" }}>
                    <input
                      type="number"
                      style={styles.rangeInput}
                      placeholder="Min"
                      className="filters-input"
                      value={portfolioMin || ""}
                      onChange={(e) =>
                        setPortfolioMin(Number(e.target.value) || 0)
                      }
                    />
                    <input
                      type="number"
                      style={styles.rangeInput}
                      placeholder="Max"
                      className="filters-input"
                      value={portfolioMax || ""}
                      onChange={(e) =>
                        setPortfolioMax(Number(e.target.value) || 0)
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginTop: showFilters ? "20px" : "0" }}>
              {showFilters && (
                <h3 style={styles.subHeading}>Search for Investor</h3>
              )}
              <div className="search-row">
                <input
                  type="text"
                  placeholder="Enter name here"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ ...styles.input, marginBottom: 0, maxWidth: 340 }}
                  className="filters-input"
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                />
                <button
                  style={{ ...styles.button, marginTop: 0, maxWidth: 140 }}
                  className="filters-button"
                  onClick={handleSearch}
                  onMouseOver={(e) =>
                    ((e.target as HTMLButtonElement).style.backgroundColor =
                      "#005bb5")
                  }
                  onMouseOut={(e) =>
                    ((e.target as HTMLButtonElement).style.backgroundColor =
                      "#0075df")
                  }
                >
                  {loading ? "Searching..." : "Search"}
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                if (showFilters) handleResetFilters();
                setShowFilters(!showFilters);
              }}
              style={styles.linkButton}
            >
              {showFilters ? "Hide & Reset Filters" : "Show Filters"}
            </button>
          </div>

          {/* Error Display */}
          {error && <div style={styles.error}>{error}</div>}
        </div>
      </div>

      {/* Investors Table Section */}
      <div className="investor-section">
        {/* Statistics Block */}
        {!loading && investors.length > 0 && (
        <div className="investor-stats">
          <h2 className="stats-title">Investors</h2>
          <div className="stats-grid">
            <div className="stats-column">
              <div className="stats-item">
                <span className="stats-label">Private Equity: </span>
                <span className="stats-value">
                  {summaryData.privateEquityCount.toLocaleString()}
                </span>
              </div>
              <div className="stats-item">
                <span className="stats-label">Venture Capital: </span>
                <span className="stats-value">
                  {summaryData.ventureCapitalCount.toLocaleString()}
                </span>
              </div>
              <div className="stats-item">
                <span className="stats-label">Asset Managers: </span>
                <span className="stats-value">
                  {summaryData.assetManagementCount.toLocaleString()}
                </span>
              </div>
              <div className="stats-item">
                <span className="stats-label">Hedge Fund: </span>
                <span className="stats-value">
                  {summaryData.hedgeFundCount.toLocaleString()}
                </span>
              </div>
              <div className="stats-item">
                <span className="stats-label">Family Office: </span>
                <span className="stats-value">
                  {summaryData.familyOfficeCount.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="stats-column">
              <div className="stats-item">
                <span className="stats-label">Number of PE investments: </span>
                <span className="stats-value">
                  {summaryData.numberOfPEInvestments.toLocaleString()}
                </span>
              </div>
              <div className="stats-item">
                <span className="stats-label">Number of VC investments: </span>
                <span className="stats-value">
                  {summaryData.numberOfVCInvestments.toLocaleString()}
                </span>
              </div>
              <div className="stats-item">
                <span className="stats-label">
                  Number of Asset Management investments:{" "}
                </span>
                <span className="stats-value">
                  {summaryData.numberOfAssetManagerInvestments.toLocaleString()}
                </span>
              </div>
              <div className="stats-item">
                <span className="stats-label">
                  Number Hedge Fund investments:{" "}
                </span>
                <span className="stats-value">
                  {summaryData.numberOfHedgeFundInvestments.toLocaleString()}
                </span>
              </div>
              <div
                className="stats-item"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="stats-label">
                    Number of Family Office investments:{" "}
                  </span>
                  <span className="stats-value">
                    {summaryData.numberOfFamilyOfficeInvestments.toLocaleString()}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  disabled={exporting || loading || pagination.itemsTotal === 0}
                  title={
                    pagination.itemsTotal === 0
                      ? "No results to export"
                      : undefined
                  }
                  style={{
                    marginLeft: "auto",
                    padding: "9px 20px",
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#fff",
                    backgroundColor: "#22c55e",
                    border: "none",
                    borderRadius: "4px",
                    cursor: pagination.itemsTotal === 0 ? "not-allowed" : "pointer",
                    opacity: exporting || loading || pagination.itemsTotal === 0 ? 0.7 : 1,
                  }}
                >
                  {exporting ? "Exporting…" : "Export CSV"}
                </button>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Show skeleton on initial load, otherwise show table */}
        {loading && investors.length === 0 ? (
          <TableSkeleton />
        ) : (
          <>
            {/* Desktop Table */}
            <table className="investor-table">
              <thead>
                <tr>
                  <th>Logo</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Current D&A Portfolio Companies</th>
                  <th>D&A Primary Sectors</th>
                  <th>LinkedIn Members</th>
                  <th>Country</th>
                </tr>
              </thead>
              <tbody>
                {investorRows}
              </tbody>
            </table>

            {/* Mobile Cards */}
            <div className="investor-cards">
              {investorCards}
            </div>
          </>
        )}

        {!loading && investors.length > 0 && (
          <div className="pagination">{generatePaginationButtons()}</div>
        )}
      </div>

      <Footer />
      <style dangerouslySetInnerHTML={{ __html: style }} />
    </div>
  );
};

export default InvestorsPage;
