"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { locationsService } from "@/lib/locationsService";
// import { useRightClick } from "@/hooks/useRightClick";

// Types for API integration
interface Advisor {
  id: number;
  name: string;
  description?: string;
  events_advised?: number;
  sectors?: string;
  linkedin_members?: number;
  country?: string;
  linkedin_logo?: string;
}

// Response shape varies across environments; handled dynamically at runtime

// Counts response shape is normalized after fetch; keep types local

interface AdvisorsFilters {
  countries: string[];
  provinces: string[];
  cities: string[];
  Continental_Region?: string[];
  geographical_sub_region?: string[];
  primarySectors: number[];
  secondarySectors: number[];
  searchQuery: string;
  page: number;
  per_page: number;
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

const AdvisorsPage = () => {
  // Right-click handled via native anchors now

  // Shared state for advisors data
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [expandedSectors, setExpandedSectors] = useState<
    Record<number, boolean>
  >({});
  const [loading, setLoading] = useState(false);
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
  const [countsData, setCountsData] = useState({
    financialAdvisors: 0,
    commercialDueDiligence: 0,
    vendorDueDiligence: 0,
    managementTeamAdvisory: 0,
    nomad: 0,
  });
  const lastRequestIdRef = useRef(0);

  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<AdvisorsFilters>({
    countries: [],
    provinces: [],
    cities: [],
    primarySectors: [],
    secondarySectors: [],
    searchQuery: "",
    page: 1,
    per_page: 25,
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

  // Loading states
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingPrimarySectors, setLoadingPrimarySectors] = useState(false);
  const [loadingSecondarySectors, setLoadingSecondarySectors] = useState(false);

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

  // Fetch data from API (same as companies page)
  const fetchCountries = useCallback(async () => {
    try {
      setLoadingCountries(true);
      const countriesData = await locationsService.getCountries();
      setCountries(countriesData);
    } catch (error) {
      console.error("Error fetching countries:", error);
    } finally {
      setLoadingCountries(false);
    }
  }, []);

  const fetchPrimarySectors = useCallback(async () => {
    try {
      setLoadingPrimarySectors(true);
      const sectorsData = await locationsService.getPrimarySectors();
      setPrimarySectors(sectorsData);
    } catch (error) {
      console.error("Error fetching primary sectors:", error);
    } finally {
      setLoadingPrimarySectors(false);
    }
  }, []);

  const fetchContinentalRegions = useCallback(async () => {
    try {
      const list = await locationsService.getContinentalRegions();
      setContinentalRegions(list);
    } catch (error) {
      console.error("Error fetching continental regions:", error);
    }
  }, []);

  const fetchSubRegions = useCallback(async () => {
    try {
      const list = await locationsService.getSubRegions();
      setSubRegions(list);
    } catch (error) {
      console.error("Error fetching sub-regions:", error);
    }
  }, []);

  const fetchSecondarySectors = useCallback(async () => {
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
  }, [primarySectors, selectedPrimarySectors]);

  const fetchProvinces = useCallback(async () => {
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
  }, [selectedCountries]);

  const fetchCities = useCallback(async () => {
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
  }, [selectedCountries, selectedProvinces]);

  // Fetch advisors data from API
  const fetchAdvisors = useCallback(async (filters: AdvisorsFilters) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("asymmetrix_auth_token");

      // Convert filters to URL parameters for GET request
      const params = new URLSearchParams();

      // Add pagination (lowercase page/per_page)
      const page = Math.max(1, filters.page || 1);
      const perPage = filters.per_page > 0 ? filters.per_page : 25;
      params.append("page", page.toString());
      params.append("per_page", perPage.toString());

      // Add search query
      if (filters.searchQuery)
        params.append("search_query", filters.searchQuery);

      // Add filters using array format
      if (filters.countries.length > 0) {
        filters.countries.forEach((country) => {
          params.append("Countries[]", country);
        });
      }

      if (filters.provinces.length > 0) {
        filters.provinces.forEach((province) => {
          params.append("Provinces[]", province);
        });
      }

      if (filters.cities.length > 0) {
        filters.cities.forEach((city) => {
          params.append("Cities[]", city);
        });
      }

      // Region text filters (mirror Companies/Investors)
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

      if (filters.primarySectors.length > 0) {
        filters.primarySectors.forEach((sectorId) => {
          params.append("primary_sectors_ids[]", sectorId.toString());
        });
      }

      if (filters.secondarySectors.length > 0) {
        filters.secondarySectors.forEach((sectorId) => {
          params.append("Secondary_sectors_ids[]", sectorId.toString());
        });
      }

      const url = `https://xdil-abvj-o7rq.e2.xano.io/api:Cd_uVQYn/get_all_advisors_list?${params.toString()}`;

      console.log("[Advisors] Fetch list URL:", url);
      const requestId = ++lastRequestIdRef.current;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const text = await response.text();
      let rawUnknown: unknown = {};
      try {
        rawUnknown = JSON.parse(text) as unknown;
      } catch (e) {
        console.error("[Advisors] Failed to parse list response JSON:", text);
        throw e;
      }
      type AnyRecord = Record<string, unknown>;
      const raw = rawUnknown as AnyRecord;
      console.log("[Advisors] List response (keys):", Object.keys(raw || {}));
      if (raw?.result1) {
        console.log("[Advisors] result1 keys:", Object.keys(raw.result1 || {}));
      }
      if (raw?.Advisors_companies) {
        console.log(
          "[Advisors] Advisors_companies keys:",
          Object.keys(raw.Advisors_companies || {})
        );
      }

      // Support multiple possible response shapes
      // Loosely typed alias for flexible backend shapes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = raw as any;
      const listRoot =
        r?.items ?? r?.result1?.items ?? r?.Advisors_companies?.items ?? [];

      const itemsReceived =
        r?.itemsReceived ??
        r?.result1?.itemsReceived ??
        r?.Advisors_companies?.itemsReceived ??
        0;
      const curPage =
        r?.curPage ??
        r?.result1?.curPage ??
        r?.Advisors_companies?.curPage ??
        filters.page ??
        1;
      const nextPage =
        r?.nextPage ??
        r?.result1?.nextPage ??
        r?.Advisors_companies?.nextPage ??
        null;
      const prevPage =
        r?.prevPage ??
        r?.result1?.prevPage ??
        r?.Advisors_companies?.prevPage ??
        null;
      const offset =
        r?.offset ?? r?.result1?.offset ?? r?.Advisors_companies?.offset ?? 0;
      const itemsTotal =
        r?.itemsTotal ??
        r?.result1?.itemsTotal ??
        r?.Advisors_companies?.itemsTotal ??
        0;
      const pageTotal =
        r?.pageTotal ??
        r?.result1?.pageTotal ??
        r?.Advisors_companies?.pageTotal ??
        0;

      const newItems = (listRoot as Advisor[]) || [];
      console.log(
        "[Advisors] curPage:",
        Number(curPage) || 1,
        "items:",
        newItems.length
      );
      // Ignore stale responses
      if (requestId === lastRequestIdRef.current) {
        const computedPageTotal =
          Number(pageTotal) ||
          (Number(itemsTotal) && filters.per_page > 0
            ? Math.ceil(Number(itemsTotal) / filters.per_page)
            : 0);
        setAdvisors(newItems);
        setPagination({
          itemsReceived: Number(itemsReceived) || 0,
          curPage: Number(curPage) || filters.page || 1,
          nextPage: typeof nextPage === "number" ? nextPage : nextPage ?? null,
          prevPage: typeof prevPage === "number" ? prevPage : prevPage ?? null,
          offset: Number(offset) || 0,
          itemsTotal: Number(itemsTotal) || 0,
          pageTotal: computedPageTotal,
        });
      } else {
        console.log(
          "[Advisors] Ignoring stale response for request",
          requestId
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch advisors");
      console.error("Error fetching advisors:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch counts data with same filters as list
  const fetchCounts = useCallback(async (filtersForCounts: AdvisorsFilters) => {
    try {
      const token = localStorage.getItem("asymmetrix_auth_token");

      const params = new URLSearchParams();
      if (filtersForCounts.countries.length > 0)
        params.append("Countries", filtersForCounts.countries.join(","));
      if (filtersForCounts.provinces.length > 0)
        params.append("Provinces", filtersForCounts.provinces.join(","));
      if (filtersForCounts.cities.length > 0)
        params.append("Cities", filtersForCounts.cities.join(","));
      if ((filtersForCounts.Continental_Region || []).length > 0)
        params.append(
          "Continental_Region",
          (filtersForCounts.Continental_Region || []).join(",")
        );
      if ((filtersForCounts.geographical_sub_region || []).length > 0)
        params.append(
          "geographical_sub_region",
          (filtersForCounts.geographical_sub_region || []).join(",")
        );
      if (filtersForCounts.searchQuery)
        params.append("search_query", filtersForCounts.searchQuery);
      if (filtersForCounts.primarySectors.length > 0)
        params.append(
          "primary_sectors_ids",
          filtersForCounts.primarySectors.join(",")
        );
      if (filtersForCounts.secondarySectors.length > 0)
        params.append(
          "Secondary_sectors_ids",
          filtersForCounts.secondarySectors.join(",")
        );

      const url = `https://xdil-abvj-o7rq.e2.xano.io/api:Cd_uVQYn/get_all_advisors_counts?${params.toString()}`;
      console.log("[Advisors] Fetch counts URL:", url);
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("[Advisors] Counts response:", data);
      setCountsData({
        financialAdvisors: Number(
          data.financialAdvisors ??
            data?.lambda?.companiesByRole?.financialAdvisors ??
            0
        ),
        commercialDueDiligence: Number(
          data.commercialDueDiligence ??
            data?.lambda?.companiesByRole?.commercialDueDiligence ??
            0
        ),
        vendorDueDiligence: Number(
          data.vendorDueDiligence ??
            data?.lambda?.companiesByRole?.vendorDueDiligence ??
            0
        ),
        managementTeamAdvisory: Number(
          data.managementTeamAdvisory ??
            data?.lambda?.companiesByRole?.managementTeamAdvisory ??
            0
        ),
        nomad: Number(data.nomad ?? data?.lambda?.companiesByRole?.nomad ?? 0),
      });
    } catch (err) {
      console.error("Error fetching counts:", err);
      setCountsData({
        financialAdvisors: 0,
        commercialDueDiligence: 0,
        vendorDueDiligence: 0,
        managementTeamAdvisory: 0,
        nomad: 0,
      });
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchCountries();
    fetchPrimarySectors();
    fetchContinentalRegions();
    fetchSubRegions();
  }, [
    fetchCountries,
    fetchPrimarySectors,
    fetchContinentalRegions,
    fetchSubRegions,
  ]);

  useEffect(() => {
    // React to filters change for both list and counts
    fetchCounts(filters);
    fetchAdvisors(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Fetch provinces when countries are selected
  useEffect(() => {
    fetchProvinces();
  }, [selectedCountries, fetchProvinces]);

  // Fetch cities when countries or provinces are selected
  useEffect(() => {
    fetchCities();
  }, [selectedCountries, selectedProvinces, fetchCities]);

  // Fetch secondary sectors when primary sectors are selected
  useEffect(() => {
    fetchSecondarySectors();
  }, [selectedPrimarySectors, primarySectors, fetchSecondarySectors]);

  // Handle search
  const handleSearch = () => {
    const updatedFilters = {
      ...filters,
      searchQuery: searchTerm,
      Continental_Region: selectedContinentalRegions,
      geographical_sub_region: selectedSubRegions,
      countries: selectedCountries,
      provinces: selectedProvinces,
      cities: selectedCities,
      primarySectors: selectedPrimarySectors,
      secondarySectors: selectedSecondarySectors,
      page: 1, // Reset to first page when searching
    };
    setFilters(updatedFilters);
    // Fetches will be triggered by the filters effect
  };

  // Auto-apply new region filters when user selects them
  useEffect(() => {
    if (
      selectedContinentalRegions.length > 0 ||
      selectedSubRegions.length > 0
    ) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedContinentalRegions, selectedSubRegions]);

  // Handle page change
  const handlePageChange = (page: number) => {
    const updatedFilters = { ...filters, page };
    setFilters(updatedFilters);
    // Fetch will be triggered by the filters effect
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
      gridTemplateColumns: "repeat(2, 1fr)",
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

  // Helper functions
  const formatNumber = (num: number | undefined) => {
    if (num === undefined || num === null) return "0";
    return num.toLocaleString();
  };

  const truncateDescription = (description: string) => {
    return description.length > 220
      ? description.substring(0, 220) + "..."
      : description;
  };

  // Advisor Card Component for mobile
  const AdvisorCard = (advisor: Advisor, index: number) => {
    const description = advisor.description || "N/A";
    const isDescriptionLong = description.length > 220;
    const truncatedDescription = truncateDescription(description);

    // Use page-specific key to ensure proper re-rendering across pages
    const cardKey = advisor.id
      ? `card-${advisor.id}-page-${pagination.curPage}`
      : `card-${pagination.offset + index}`;

    return React.createElement(
      "div",
      {
        key: cardKey,
        className: "advisor-card",
        style: {
          backgroundColor: "white",
          borderRadius: "8px",
          padding: "12px",
          marginBottom: "8px",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          border: "1px solid #e2e8f0",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "flex",
            alignItems: "center",
            marginBottom: "12px",
            gap: "12px",
          },
        },
        advisor.linkedin_logo
          ? React.createElement("img", {
              src: `data:image/jpeg;base64,${advisor.linkedin_logo}`,
              alt: `${advisor.name} logo`,
              style: {
                width: "50px",
                height: "35px",
                objectFit: "contain",
                borderRadius: "4px",
              },
            })
          : React.createElement(
              "div",
              {
                style: {
                  width: "50px",
                  height: "35px",
                  backgroundColor: "#f7fafc",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  color: "#718096",
                },
              },
              "No Logo"
            ),
        React.createElement(
          "div",
          {
            style: {
              flex: "1",
            },
          },
          React.createElement(
            "a",
            {
              href: `/advisor/${advisor.id}`,
              style: {
                fontSize: "16px",
                fontWeight: "600",
                marginBottom: "4px",
              },
            },
            advisor.name || "N/A"
          ),
          React.createElement(
            "div",
            {
              style: {
                fontSize: "14px",
                color: "#4a5568",
              },
            },
            advisor.country || "N/A"
          )
        )
      ),
      React.createElement(
        "div",
        {
          style: {
            fontSize: "14px",
            color: "#4a5568",
            lineHeight: "1.4",
            marginBottom: "12px",
          },
        },
        React.createElement(
          "div",
          {
            id: `card-description-${index}`,
            style: { display: isDescriptionLong ? "block" : "none" },
          },
          truncatedDescription
        ),
        React.createElement(
          "div",
          {
            id: `card-description-full-${index}`,
            style: { display: isDescriptionLong ? "none" : "block" },
          },
          description
        ),
        isDescriptionLong &&
          React.createElement(
            "span",
            {
              style: {
                color: "#0075df",
                textDecoration: "underline",
                cursor: "pointer",
                fontSize: "12px",
                marginTop: "4px",
                display: "block",
              },
              onClick: () => {
                const truncatedEl = document.getElementById(
                  `card-description-${index}`
                );
                const fullEl = document.getElementById(
                  `card-description-full-${index}`
                );
                if (truncatedEl && fullEl) {
                  if (truncatedEl.style.display === "block") {
                    truncatedEl.style.display = "none";
                    fullEl.style.display = "block";
                  } else {
                    truncatedEl.style.display = "block";
                    fullEl.style.display = "none";
                  }
                }
              },
            },
            "Expand description"
          )
      ),
      React.createElement(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
            fontSize: "12px",
          },
        },
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              justifyContent: "space-between",
              padding: "4px 0",
            },
          },
          React.createElement(
            "span",
            { style: { color: "#4a5568" } },
            "Events:"
          ),
          React.createElement(
            "span",
            { style: { fontWeight: "600" } },
            formatNumber(advisor.events_advised)
          )
        ),
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              justifyContent: "space-between",
              padding: "4px 0",
            },
          },
          React.createElement(
            "span",
            { style: { color: "#4a5568" } },
            "LinkedIn:"
          ),
          React.createElement(
            "span",
            { style: { fontWeight: "600" } },
            formatNumber(advisor.linkedin_members)
          )
        ),
        React.createElement(
          "div",
          {
            style: {
              display: "flex",
              justifyContent: "space-between",
              padding: "4px 0",
              gridColumn: "1 / -1",
            },
          },
          React.createElement(
            "span",
            { style: { color: "#4a5568" } },
            "Sectors:"
          ),
          React.createElement(
            "span",
            {
              style: {
                fontWeight: "600",
                textAlign: "right",
                maxWidth: "60%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              },
            },
            advisor.sectors || "N/A"
          )
        )
      )
    );
  };

  // Generate table rows function to ensure fresh rendering
  const generateTableRows = () => {
    console.log(
      "[Advisors] generateTableRows called with",
      advisors.length,
      "advisors"
    );
    return advisors.map((advisor, index) => {
      // Truncate description for display
      const description = advisor.description || "N/A";
      const isDescriptionLong = description.length > 220;
      const truncatedDescription = isDescriptionLong
        ? description.substring(0, 220) + "..."
        : description;

      const sectorsText = advisor.sectors || "N/A";
      const sectorsIsLong = (sectorsText || "").length > 100;
      const isSectorsExpanded = !!expandedSectors[index];

      return React.createElement(
        "tr",
        { key: advisor.id ?? index },
        React.createElement(
          "td",
          null,
          advisor.linkedin_logo
            ? React.createElement("img", {
                src: `data:image/jpeg;base64,${advisor.linkedin_logo}`,
                alt: `${advisor.name} logo`,
                className: "advisor-logo",
                loading: "lazy",
              })
            : React.createElement(
                "div",
                {
                  style: {
                    width: "60px",
                    height: "40px",
                    backgroundColor: "#f7fafc",
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "10px",
                    color: "#718096",
                  },
                },
                "No Logo"
              )
        ),
        React.createElement(
          "td",
          null,
          React.createElement(
            "a",
            {
              href: `/advisor/${advisor.id}`,
              className: "advisor-name",
              style: { fontWeight: "500" },
            },
            advisor.name || "N/A"
          )
        ),
        React.createElement(
          "td",
          { className: "advisor-description" },
          React.createElement(
            "div",
            {
              className: "advisor-description-truncated",
              id: `description-${index}`,
              style: { display: isDescriptionLong ? "block" : "none" },
            },
            truncatedDescription
          ),
          React.createElement(
            "div",
            {
              className: "advisor-description-full",
              id: `description-full-${index}`,
              style: { display: isDescriptionLong ? "none" : "block" },
            },
            description
          ),
          isDescriptionLong &&
            React.createElement(
              "span",
              {
                className: "expand-description",
                onClick: () => {
                  const truncatedEl = document.getElementById(
                    `description-${index}`
                  );
                  const fullEl = document.getElementById(
                    `description-full-${index}`
                  );
                  const expandEl = document.getElementById(`expand-${index}`);
                  if (truncatedEl && fullEl && expandEl) {
                    if (truncatedEl.style.display === "block") {
                      truncatedEl.style.display = "none";
                      fullEl.style.display = "block";
                      expandEl.textContent = "Collapse description";
                    } else {
                      truncatedEl.style.display = "block";
                      fullEl.style.display = "none";
                      expandEl.textContent = "Expand description";
                    }
                  }
                },
                id: `expand-${index}`,
              },
              "Expand description"
            )
        ),
        React.createElement("td", null, formatNumber(advisor.events_advised)),
        React.createElement(
          "td",
          { className: "sectors-list" },
          React.createElement(
            React.Fragment,
            null,
            React.createElement(
              "div",
              {
                className: isSectorsExpanded
                  ? "sectors-full"
                  : "sectors-truncated",
              },
              sectorsText
            ),
            sectorsIsLong &&
              React.createElement(
                "span",
                {
                  className: "expand-sectors",
                  onClick: () =>
                    setExpandedSectors((prev) => ({
                      ...prev,
                      [index]: !prev[index],
                    })),
                },
                isSectorsExpanded ? "Show less" : "Show more"
              )
          )
        ),
        React.createElement("td", null, formatNumber(advisor.linkedin_members)),
        React.createElement("td", null, advisor.country || "N/A")
      );
    });
  };

  const style = `
    .advisor-section {
      padding: 16px 24px;
      border-radius: 8px;
    }
    .advisor-stats {
      background: #fff;
      padding: 12px 16px;
      box-shadow: 0px 1px 3px 0px rgba(227, 228, 230, 1);
      border-radius: 16px;
      margin-bottom: 16px;
    }
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
      padding: 4px 0;
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
    .advisor-table {
      width: 100%;
      background: #fff;
      padding: 20px 24px;
      box-shadow: 0px 1px 3px 0px rgba(227, 228, 230, 1);
      border-radius: 16px;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .advisor-table th:nth-child(1) { width: 7%; }  /* Logo */
    .advisor-table th:nth-child(2) { width: 14%; } /* Advisor */
    .advisor-table th:nth-child(3) { width: 36%; } /* Description - Wider */
    .advisor-table th:nth-child(4) { width: 10%; } /* Corporate Events Advised */
    .advisor-table th:nth-child(5) { width: 18%; } /* Advised D&A Sectors */
    .advisor-table th:nth-child(6) { width: 10%; } /* LinkedIn Members */
    .advisor-table th:nth-child(7) { width: 5%; }  /* Country */
    .advisor-table th,
    .advisor-table td {
      padding: 12px;
      text-align: left;
      vertical-align: top;
      border-bottom: 1px solid #e2e8f0;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .advisor-table th {
      font-weight: 600;
      color: #1a202c;
      font-size: 14px;
      background: #f9fafb;
      border-bottom: 2px solid #e2e8f0;
    }
    .advisor-table td {
      font-size: 14px;
      color: #000;
      line-height: 1.5;
    }
    .advisor-logo {
      width: 60px;
      height: 40px;
      object-fit: contain;
      vertical-align: middle;
      border-radius: 4px;
    }
    .advisor-name {
      color: #0075df;
      text-decoration: underline;
      cursor: pointer;
      font-weight: 500;
      transition: color 0.2s;
    }
    .advisor-name:hover {
      color: #005bb5;
    }
    .advisor-description {
      max-width: none;
      line-height: 1.4;
    }
    .advisor-description-truncated {
      display: -webkit-box;
      -webkit-line-clamp: 3;
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
    }
    .sectors-list {
      max-width: 250px;
      line-height: 1.4;
    }
    .sectors-truncated {
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .expand-sectors {
      color: #0075df;
      text-decoration: underline;
      cursor: pointer;
      font-size: 12px;
      margin-top: 4px;
      display: block;
    }
    .search-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .search-row .filters-input { margin: 0; max-width: 340px; }
    .search-row .filters-button { margin: 0; max-width: 140px; }
    .loading {
      text-align: center;
      padding: 40px;
      color: #666;
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
    .advisor-cards {
      display: none;
    }
    @media (max-width: 768px) {
      .advisor-table {
        display: none !important;
      }
      .advisor-cards {
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
      .advisor-section {
        padding: 12px 8px !important;
      }
      .advisor-stats {
        padding: 12px 12px !important;
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
      .advisor-cards {
        display: none !important;
      }
      .advisor-table {
        display: table !important;
      }
    }
  `;

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
            style={{
              ...styles.card,
              ...(showFilters ? {} : { padding: "12px 16px" }),
            }}
            className="filters-card"
          >
            {showFilters && (
              <h2 style={styles.heading} className="filters-heading">
                Filters
              </h2>
            )}

            {showFilters && (
              <div style={styles.grid} className="filters-grid">
                <div style={styles.gridItem}>
                  <h3 style={styles.subHeading} className="filters-sub-heading">
                    Location
                  </h3>
                  <span style={styles.label}>By Continental Region</span>
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

                  <span style={styles.label}>By Sub-Region</span>
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
                  <span style={styles.label}>By Country</span>
                  <SearchableSelect
                    options={countryOptions}
                    value=""
                    onChange={(value) => {
                      if (
                        typeof value === "string" &&
                        value &&
                        !selectedCountries.includes(value)
                      ) {
                        setSelectedCountries([...selectedCountries, value]);
                      }
                    }}
                    placeholder={
                      loadingCountries
                        ? "Loading countries..."
                        : "Select Country"
                    }
                    disabled={loadingCountries}
                    style={styles.select}
                  />

                  {/* Selected Countries Tags */}
                  {selectedCountries.length > 0 && (
                    <div
                      style={{
                        marginTop: "8px",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "4px",
                      }}
                    >
                      {selectedCountries.map((country) => (
                        <span
                          key={country}
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
                          {country}
                          <button
                            onClick={() => {
                              setSelectedCountries(
                                selectedCountries.filter((c) => c !== country)
                              );
                            }}
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

                  <span style={styles.label}>By State/County/Province</span>
                  <SearchableSelect
                    options={provinceOptions}
                    value=""
                    onChange={(value) => {
                      if (
                        typeof value === "string" &&
                        value &&
                        !selectedProvinces.includes(value)
                      ) {
                        setSelectedProvinces([...selectedProvinces, value]);
                      }
                    }}
                    placeholder={
                      loadingProvinces
                        ? "Loading provinces..."
                        : selectedCountries.length === 0
                        ? "Select country first"
                        : "Select Province"
                    }
                    disabled={
                      loadingProvinces || selectedCountries.length === 0
                    }
                    style={styles.select}
                  />

                  {/* Selected Provinces Tags */}
                  {selectedProvinces.length > 0 && (
                    <div
                      style={{
                        marginTop: "8px",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "4px",
                      }}
                    >
                      {selectedProvinces.map((province) => (
                        <span
                          key={province}
                          style={{
                            backgroundColor: "#e8f5e8",
                            color: "#2e7d32",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {province}
                          <button
                            onClick={() => {
                              setSelectedProvinces(
                                selectedProvinces.filter((p) => p !== province)
                              );
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#2e7d32",
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

                  <span style={styles.label}>By City</span>
                  <SearchableSelect
                    options={cityOptions}
                    value=""
                    onChange={(value) => {
                      if (
                        typeof value === "string" &&
                        value &&
                        !selectedCities.includes(value)
                      ) {
                        setSelectedCities([...selectedCities, value]);
                      }
                    }}
                    placeholder={
                      loadingCities
                        ? "Loading cities..."
                        : selectedCountries.length === 0
                        ? "Select country first"
                        : "Select City"
                    }
                    disabled={loadingCities || selectedCountries.length === 0}
                    style={styles.select}
                  />

                  {/* Selected Cities Tags */}
                  {selectedCities.length > 0 && (
                    <div
                      style={{
                        marginTop: "8px",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "4px",
                      }}
                    >
                      {selectedCities.map((city) => (
                        <span
                          key={city}
                          style={{
                            backgroundColor: "#fff3e0",
                            color: "#f57c00",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {city}
                          <button
                            onClick={() => {
                              setSelectedCities(
                                selectedCities.filter((c) => c !== city)
                              );
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#f57c00",
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
                </div>
                <div style={styles.gridItem}>
                  <h3 style={styles.subHeading} className="filters-sub-heading">
                    Sector of Advised Events
                  </h3>
                  <span style={styles.label}>By Primary Sectors</span>
                  <SearchableSelect
                    options={primarySectorOptions}
                    value=""
                    onChange={(value) => {
                      if (
                        typeof value === "number" &&
                        value &&
                        !selectedPrimarySectors.includes(value)
                      ) {
                        setSelectedPrimarySectors([
                          ...selectedPrimarySectors,
                          value,
                        ]);
                      }
                    }}
                    placeholder={
                      loadingPrimarySectors
                        ? "Loading primary sectors..."
                        : "Select Primary Sector"
                    }
                    disabled={loadingPrimarySectors}
                    style={styles.select}
                  />

                  {/* Selected Primary Sectors Tags */}
                  {selectedPrimarySectors.length > 0 && (
                    <div
                      style={{
                        marginTop: "8px",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "4px",
                      }}
                    >
                      {selectedPrimarySectors.map((sectorId) => {
                        const sector = primarySectors.find(
                          (s) => s.id === sectorId
                        );
                        return (
                          <span
                            key={sectorId}
                            style={{
                              backgroundColor: "#f3e5f5",
                              color: "#7b1fa2",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "12px",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            {sector?.sector_name || sectorId}
                            <button
                              onClick={() => {
                                setSelectedPrimarySectors(
                                  selectedPrimarySectors.filter(
                                    (s) => s !== sectorId
                                  )
                                );
                              }}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#7b1fa2",
                                cursor: "pointer",
                                fontWeight: "bold",
                                fontSize: "14px",
                              }}
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <span style={styles.label}>By Secondary Sector</span>
                  <SearchableSelect
                    options={secondarySectorOptions}
                    value=""
                    onChange={(value) => {
                      if (
                        typeof value === "number" &&
                        value &&
                        !selectedSecondarySectors.includes(value)
                      ) {
                        setSelectedSecondarySectors([
                          ...selectedSecondarySectors,
                          value,
                        ]);
                      }
                    }}
                    placeholder={
                      loadingSecondarySectors
                        ? "Loading secondary sectors..."
                        : selectedPrimarySectors.length === 0
                        ? "Select primary sector first"
                        : "Select Secondary Sector"
                    }
                    disabled={
                      loadingSecondarySectors ||
                      selectedPrimarySectors.length === 0
                    }
                    style={styles.select}
                  />

                  {/* Selected Secondary Sectors Tags */}
                  {selectedSecondarySectors.length > 0 && (
                    <div
                      style={{
                        marginTop: "8px",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "4px",
                      }}
                    >
                      {selectedSecondarySectors.map((sectorId) => {
                        const sector = secondarySectors.find(
                          (s) => s.id === sectorId
                        );
                        return (
                          <span
                            key={sectorId}
                            style={{
                              backgroundColor: "#e8f5e8",
                              color: "#388e3c",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "12px",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            {sector?.sector_name || sectorId}
                            <button
                              onClick={() => {
                                setSelectedSecondarySectors(
                                  selectedSecondarySectors.filter(
                                    (s) => s !== sectorId
                                  )
                                );
                              }}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#388e3c",
                                cursor: "pointer",
                                fontWeight: "bold",
                                fontSize: "14px",
                              }}
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
            )}

            <div style={{ marginTop: showFilters ? "20px" : "0" }}>
              {showFilters && (
                <h3 style={styles.subHeading}>Search for Advisors</h3>
              )}
              <div className="search-row">
                <input
                  type="text"
                  placeholder="Enter name here"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ ...styles.input, marginBottom: 0 }}
                  className="filters-input"
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                />
                <button
                  style={styles.button}
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
              onClick={() => setShowFilters(!showFilters)}
              style={styles.linkButton}
            >
              {showFilters ? "Hide & Reset Filters" : "Show Filters"}
            </button>
          </div>

          {/* Error Display */}
          {error && <div style={styles.error}>{error}</div>}

          {/* Loading Display */}
          {loading && <div style={styles.loading}>Loading advisors...</div>}
        </div>
      </div>

      {/* Advisors Table Section */}
      <div className="advisor-section">
        {/* Statistics Block */}
        <div className="advisor-stats">
          <h2 className="stats-title">Advisors</h2>
          <div className="stats-grid">
            <div className="stats-column">
              <div className="stats-item">
                <span className="stats-label">Financial Advisors: </span>
                <span className="stats-value">
                  {countsData.financialAdvisors.toLocaleString()}
                </span>
              </div>
              <div className="stats-item">
                <span className="stats-label">Commercial Due Diligence: </span>
                <span className="stats-value">
                  {countsData.commercialDueDiligence.toLocaleString()}
                </span>
              </div>
              <div className="stats-item">
                <span className="stats-label">Vendor Due Diligence: </span>
                <span className="stats-value">
                  {countsData.vendorDueDiligence.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="stats-column">
              <div className="stats-item">
                <span className="stats-label">Management Team Advisory: </span>
                <span className="stats-value">
                  {countsData.managementTeamAdvisory.toLocaleString()}
                </span>
              </div>
              <div className="stats-item">
                <span className="stats-label">NOMAD: </span>
                <span className="stats-value">
                  {countsData.nomad.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Cards */}
        {!loading && (
          <div className="advisor-cards" key={`cards-${pagination.curPage}`}>
            {advisors.map((advisor, index) => AdvisorCard(advisor, index))}
          </div>
        )}

        {/* Desktop Table */}
        {!loading && (
          <table className="advisor-table" key={`table-${pagination.curPage}`}>
            <thead>
              <tr>
                <th>Logo</th>
                <th>Advisor</th>
                <th>Description</th>
                <th># Corporate Events Advised</th>
                <th>Advised D&A Sectors</th>
                <th>LinkedIn Members</th>
                <th>Country</th>
              </tr>
            </thead>
            <tbody>{generateTableRows()}</tbody>
          </table>
        )}

        {/* Loading state for table */}
        {loading && (
          <div style={styles.loading}>Loading page {filters.page}...</div>
        )}

        <div className="pagination">{generatePaginationButtons()}</div>
      </div>

      <Footer />
      <style dangerouslySetInnerHTML={{ __html: style }} />
    </div>
  );
};

export default AdvisorsPage;
