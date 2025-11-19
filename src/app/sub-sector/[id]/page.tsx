"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { locationsService } from "@/lib/locationsService";
import SearchableSelect from "@/components/ui/SearchableSelect";
import {
  CorporateEvent,
  CorporateEventsResponse,
  CorporateEventsFilters,
} from "@/types/corporateEvents";
import {
  ContentArticle,
  InsightsAnalysisResponse,
} from "@/types/insightsAnalysis";
import { CSVExporter } from "@/utils/csvExport";

const TABS = [
  { id: "all", name: "All Companies" },
  { id: "transactions", name: "Transactions" },
  { id: "insights", name: "Insights & Analysis" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface CompanyItem {
  id: number;
  name: string;
  description?: string;
  primary_sectors?: string[];
  secondary_sectors?: string[];
  ownership_type_id?: number;
  ownership?: string;
  locations_id?: number;
  country?: string;
  investors?: Array<{
    id: number;
    name: string;
  }>;
  companies_investors?: Array<{
    company_name: string;
    original_new_company_id: number;
  }>;
  linkedin_logo?: string; // base64
  linkedin_members?: number;
}

const truncateDescription = (
  description: string,
  maxLength: number = 250
): { text: string; isLong: boolean } => {
  const isLong = description.length > maxLength;
  const truncated = isLong
    ? description.substring(0, maxLength) + "..."
    : description;
  return { text: truncated, isLong };
};

const DescriptionCell: React.FC<{ description?: string; index: number }> = ({
  description,
  index,
}) => {
  const full = description || "N/A";
  const { text, isLong } = truncateDescription(full);
  const [expanded, setExpanded] = useState(false);

  if (!isLong) {
    return (
      <span className="text-slate-700 whitespace-normal break-words">
        {full}
      </span>
    );
  }

  return (
    <div className="space-y-1 text-left">
      <p className="text-slate-700 whitespace-normal break-words">
        {expanded ? full : text}
      </p>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="text-xs text-blue-600 underline"
        aria-expanded={expanded}
        aria-controls={`subsec-description-${index}`}
        id={`subsec-expand-${index}`}
      >
        {expanded ? "Collapse description" : "Expand description"}
      </button>
    </div>
  );
};

// Transactions tab – mirrors corporate events grid layout,
// pre-filtered by current sub-sector (secondary sector)
function SubSectorTransactionsTab({ subSectorId }: { subSectorId: number }) {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<CorporateEventsFilters>({
    Countries: [],
    Provinces: [],
    Cities: [],
    primary_sectors_ids: [],
    Secondary_sectors_ids: [],
    deal_types: [],
    Deal_Status: [],
    Date_start: null,
    Date_end: null,
    search_query: "",
    Page: 1,
    Per_page: 50,
  });

  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedContinentalRegions, setSelectedContinentalRegions] = useState<
    string[]
  >([]);
  const [selectedSubRegions, setSelectedSubRegions] = useState<string[]>([]);
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [selectedDealStatuses, setSelectedDealStatuses] = useState<string[]>(
    []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  const [countries, setCountries] = useState<Array<{ locations_Country: string }>>(
    []
  );
  const [continentalRegions, setContinentalRegions] = useState<string[]>([]);
  const [subRegions, setSubRegions] = useState<string[]>([]);
  const [provinces, setProvinces] = useState<
    Array<{ State__Province__County: string }>
  >([]);
  const [cities, setCities] = useState<Array<{ City: string }>>([]);

  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  const [corporateEvents, setCorporateEvents] = useState<CorporateEvent[]>([]);
  const [pagination, setPagination] = useState({
    itemsReceived: 0,
    curPage: 1,
    nextPage: null as number | null,
    prevPage: null as number | null,
    offset: 0,
    perPage: 50,
    pageTotal: 0,
  });
  const [summaryData, setSummaryData] = useState({
    acquisitions: 0,
    investments: 0,
    ipos: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const eventTypeOptions = [
    { value: "Acquisition", label: "Acquisition" },
    { value: "Sale", label: "Sale" },
    { value: "IPO", label: "IPO" },
    { value: "MBO", label: "MBO" },
    { value: "Investment", label: "Investment" },
    { value: "Strategic Review", label: "Strategic Review" },
    { value: "Divestment", label: "Divestment" },
    { value: "Restructuring", label: "Restructuring" },
    { value: "Dual track", label: "Dual track" },
    { value: "Closing", label: "Closing" },
    { value: "Grant", label: "Grant" },
    { value: "Debt financing", label: "Debt financing" },
    { value: "Partnership", label: "Partnership" },
  ];

  const dealStatusOptions = [
    { value: "Completed", label: "Completed" },
    { value: "In Market", label: "In Market" },
    { value: "Not yet launched", label: "Not yet launched" },
    { value: "Strategic Review", label: "Strategic Review" },
    { value: "Deal Prep", label: "Deal Prep" },
    { value: "In Exclusivity", label: "In Exclusivity" },
  ];

  const fetchCountries = async () => {
    try {
      setLoadingCountries(true);
      const countriesData = await locationsService.getCountries();
      setCountries(countriesData);
    } catch {
      // ignore
    } finally {
      setLoadingCountries(false);
    }
  };

  const fetchContinentalRegions = async () => {
    try {
      const list = await locationsService.getContinentalRegions();
      if (Array.isArray(list)) setContinentalRegions(list);
    } catch {
      // ignore
    }
  };

  const fetchSubRegions = async () => {
    try {
      const list = await locationsService.getSubRegions();
      if (Array.isArray(list)) setSubRegions(list);
    } catch {
      // ignore
    }
  };

  const fetchProvinces = async () => {
    if (selectedCountries.length === 0) {
      setProvinces([]);
      return;
    }
    try {
      setLoadingProvinces(true);
      const provincesData = await locationsService.getProvinces(
        selectedCountries
      );
      setProvinces(provincesData);
    } catch {
      // ignore
    } finally {
      setLoadingProvinces(false);
    }
  };

  const fetchCities = async () => {
    if (selectedCountries.length === 0 || selectedProvinces.length === 0) {
      setCities([]);
      return;
    }
    try {
      setLoadingCities(true);
      const citiesData = await locationsService.getCities(
        selectedCountries,
        selectedProvinces
      );
      setCities(citiesData);
    } catch {
      // ignore
    } finally {
      setLoadingCities(false);
    }
  };

  const fetchCorporateEvents = async (nextFilters: CorporateEventsFilters) => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("asymmetrix_auth_token");
      if (!token) {
        setError("Authentication required");
        return;
      }

      const params = new URLSearchParams();
      params.append("Page", nextFilters.Page.toString());
      params.append("Per_page", nextFilters.Per_page.toString());

      if (nextFilters.search_query)
        params.append("search_query", nextFilters.search_query);

      if (nextFilters.Countries.length > 0) {
        params.append("Countries", nextFilters.Countries.join(","));
      }
      if (nextFilters.Provinces.length > 0) {
        params.append("Provinces", nextFilters.Provinces.join(","));
      }
      if (nextFilters.Cities.length > 0) {
        params.append("Cities", nextFilters.Cities.join(","));
      }

      const asPartial = nextFilters as Partial<CorporateEventsFilters>;
      if (asPartial.continentalRegions && asPartial.continentalRegions.length) {
        params.append(
          "Continental_Region",
          asPartial.continentalRegions.join(",")
        );
      }
      if (asPartial.subRegions && asPartial.subRegions.length) {
        params.append(
          "geographical_sub_region",
          asPartial.subRegions.join(",")
        );
      }

      // Always pre-filter by current sub-sector (secondary sector)
      const secondaryIds = [
        subSectorId,
        ...(nextFilters.Secondary_sectors_ids || []).filter(
          (id) => id !== subSectorId
        ),
      ];
      secondaryIds.forEach((id) =>
        params.append("Secondary_sectors_ids[]", id.toString())
      );

      if (nextFilters.deal_types.length > 0) {
        params.append("deal_types", nextFilters.deal_types.join(","));
      }
      if (nextFilters.Deal_Status.length > 0) {
        params.append("Deal_Status", nextFilters.Deal_Status.join(","));
      }
      if (nextFilters.Date_start) {
        params.append("Date_start", nextFilters.Date_start);
      }
      if (nextFilters.Date_end) {
        params.append("Date_end", nextFilters.Date_end);
      }

      const url = `https://xdil-abvj-o7rq.e2.xano.io/api:617tZc8l/get_all_corporate_events?${params.toString()}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: CorporateEventsResponse = await response.json();

      setCorporateEvents(data.items);
      setPagination({
        itemsReceived: data.itemsReceived,
        curPage: data.curPage,
        nextPage: data.nextPage,
        prevPage: data.prevPage,
        offset: data.offset,
        perPage: nextFilters.Per_page,
        pageTotal: data.pageTotal,
      });
      setSummaryData({
        acquisitions: data.acquisitions,
        investments: data.investments,
        ipos: data.ipos,
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to fetch corporate events"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCountries();
    fetchContinentalRegions();
    fetchSubRegions();

    if (!Number.isNaN(subSectorId) && subSectorId > 0) {
      const initialFilters: CorporateEventsFilters = {
        ...filters,
        Secondary_sectors_ids: [subSectorId],
      };
      setFilters(initialFilters);
      fetchCorporateEvents(initialFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subSectorId]);

  useEffect(() => {
    fetchProvinces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountries]);

  useEffect(() => {
    fetchCities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProvinces]);

  const handleSearch = () => {
    const updatedFilters: CorporateEventsFilters = {
      ...filters,
      search_query: searchTerm,
      Countries: selectedCountries,
      Provinces: selectedProvinces,
      Cities: selectedCities,
      deal_types: selectedEventTypes,
      Deal_Status: selectedDealStatuses,
      Date_start: dateStart || null,
      Date_end: dateEnd || null,
      Page: 1,
      Secondary_sectors_ids: [subSectorId],
    };
    setFilters(updatedFilters);
    fetchCorporateEvents(updatedFilters);
  };

  const handlePageChange = (page: number) => {
    const updatedFilters: CorporateEventsFilters = {
      ...filters,
      Page: page,
      Secondary_sectors_ids: [subSectorId],
    };
    setFilters(updatedFilters);
    fetchCorporateEvents(updatedFilters);
  };

  const handleExportCSV = () => {
    if (corporateEvents.length > 0) {
      CSVExporter.exportCorporateEvents(
        corporateEvents,
        `sub_sector_${subSectorId}_transactions`
      );
    }
  };

  const generatePaginationButtons = () => {
    const buttons = [];
    const currentPage = pagination.curPage;
    const totalPages = pagination.pageTotal;

    buttons.push(
      <button
        key="prev"
        className="pagination-button"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={!pagination.prevPage}
      >
        &lt;
      </button>
    );

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        buttons.push(
          <button
            key={i}
            className={`pagination-button ${
              i === currentPage ? "active" : ""
            }`}
            onClick={() => handlePageChange(i)}
          >
            {i.toString()}
          </button>
        );
      }
    } else {
      buttons.push(
        <button
          key={1}
          className={`pagination-button ${currentPage === 1 ? "active" : ""}`}
          onClick={() => handlePageChange(1)}
        >
          1
        </button>
      );

      if (currentPage > 3) {
        buttons.push(
          <span key="ellipsis1" className="pagination-ellipsis">
            ...
          </span>
        );
      }

      for (
        let i = Math.max(2, currentPage - 1);
        i <= Math.min(totalPages - 1, currentPage + 1);
        i++
      ) {
        if (i > 1 && i < totalPages) {
          buttons.push(
            <button
              key={i}
              className={`pagination-button ${
                i === currentPage ? "active" : ""
              }`}
              onClick={() => handlePageChange(i)}
            >
              {i.toString()}
            </button>
          );
        }
      }

      if (currentPage < totalPages - 2) {
        buttons.push(
          <span key="ellipsis2" className="pagination-ellipsis">
            ...
          </span>
        );
      }

      buttons.push(
        <button
          key={totalPages}
          className={`pagination-button ${
            currentPage === totalPages ? "active" : ""
          }`}
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages.toString()}
        </button>
      );
    }

    buttons.push(
      <button
        key="next"
        className="pagination-button"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={!pagination.nextPage}
      >
        &gt;
      </button>
    );

    return buttons;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not available";
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  const formatCurrency = (
    amount: string | undefined,
    currency: string | undefined
  ) => {
    if (!amount || !currency) return "Not available";
    const n = Number(amount);
    if (Number.isNaN(n)) return "Not available";
    return `${currency}${n.toLocaleString(undefined, {
      maximumFractionDigits: 3,
    })}`;
  };

  const formatSectorArray = (
    sectors:
      | Array<string | { sector_name?: string }>
      | undefined
  ): string => {
    if (!Array.isArray(sectors) || sectors.length === 0) {
      return "Not available";
    }
    const names = sectors
      .map((s) => (typeof s === "string" ? s : s.sector_name || ""))
      .filter((s) => s.trim().length > 0);
    return names.length > 0 ? names.join(", ") : "Not available";
  };

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <div className="p-6 bg-white rounded-xl border shadow-lg border-slate-200/60">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900">Filters</h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-sm text-blue-600 underline hover:text-blue-800"
          >
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>
        </div>

        {showFilters && (
          <>
            <h2 className="mt-4 mb-4 text-xl font-bold text-slate-900">
              Filter Corporate Events
            </h2>
            <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-3">
              {/* Event Type */}
              <div>
                <h3 className="mb-4 text-lg font-semibold text-slate-900">
                  Corporate Event Type
                </h3>
                <label className="block mb-2 text-sm font-semibold text-slate-900">
                  By Type
                </label>
                <SearchableSelect
                  options={eventTypeOptions}
                  value=""
                  onChange={(value) => {
                    if (
                      typeof value === "string" &&
                      value &&
                      !selectedEventTypes.includes(value)
                    ) {
                      setSelectedEventTypes([...selectedEventTypes, value]);
                    }
                  }}
                  placeholder="Select Type"
                  disabled={false}
                  style={{}}
                />
                {selectedEventTypes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedEventTypes.map((eventType) => (
                      <span
                        key={eventType}
                        className="inline-flex gap-1 items-center px-2 py-1 text-xs text-blue-700 bg-blue-50 rounded"
                      >
                        {eventType}
                        <button
                          onClick={() =>
                            setSelectedEventTypes(
                              selectedEventTypes.filter((t) => t !== eventType)
                            )
                          }
                          className="font-bold text-blue-700 hover:text-blue-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <label className="block mt-4 mb-2 text-sm font-semibold text-slate-900">
                  By Deal Status
                </label>
                <SearchableSelect
                  options={dealStatusOptions}
                  value=""
                  onChange={(value) => {
                    if (
                      typeof value === "string" &&
                      value &&
                      !selectedDealStatuses.includes(value)
                    ) {
                      setSelectedDealStatuses([...selectedDealStatuses, value]);
                    }
                  }}
                  placeholder="Select Deal Status"
                  disabled={false}
                  style={{}}
                />
                {selectedDealStatuses.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedDealStatuses.map((status) => (
                      <span
                        key={status}
                        className="inline-flex gap-1 items-center px-2 py-1 text-xs text-red-700 bg-red-50 rounded"
                      >
                        {status}
                        <button
                          onClick={() =>
                            setSelectedDealStatuses(
                              selectedDealStatuses.filter((s) => s !== status)
                            )
                          }
                          className="font-bold text-red-700 hover:text-red-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Location */}
              <div>
                <h3 className="mb-4 text-lg font-semibold text-slate-900">
                  Location
                </h3>

                <label className="block mb-2 text-sm font-semibold text-slate-900">
                  By Continental Region
                </label>
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
                  placeholder="Select Continental Region"
                  disabled={false}
                  style={{}}
                />
                {selectedContinentalRegions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedContinentalRegions.map((r) => (
                      <span
                        key={r}
                        className="inline-flex gap-1 items-center px-2 py-1 text-xs text-blue-700 bg-blue-50 rounded"
                      >
                        {r}
                        <button
                          onClick={() =>
                            setSelectedContinentalRegions(
                              selectedContinentalRegions.filter((x) => x !== r)
                            )
                          }
                          className="font-bold text-blue-700 hover:text-blue-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <label className="block mt-4 mb-2 text-sm font-semibold text-slate-900">
                  By Sub-Region
                </label>
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
                  placeholder="Select Sub-Region"
                  disabled={false}
                  style={{}}
                />
                {selectedSubRegions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedSubRegions.map((r) => (
                      <span
                        key={r}
                        className="inline-flex gap-1 items-center px-2 py-1 text-xs text-orange-700 bg-orange-50 rounded"
                      >
                        {r}
                        <button
                          onClick={() =>
                            setSelectedSubRegions(
                              selectedSubRegions.filter((x) => x !== r)
                            )
                          }
                          className="font-bold text-orange-700 hover:text-orange-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <label className="block mt-4 mb-2 text-sm font-semibold text-slate-900">
                  By Country
                </label>
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
                    loadingCountries ? "Loading..." : "Select Country"
                  }
                  disabled={loadingCountries}
                  style={{}}
                />
                {selectedCountries.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedCountries.map((country) => (
                      <span
                        key={country}
                        className="inline-flex gap-1 items-center px-2 py-1 text-xs text-blue-700 bg-blue-50 rounded"
                      >
                        {country}
                        <button
                          onClick={() =>
                            setSelectedCountries(
                              selectedCountries.filter((c) => c !== country)
                            )
                          }
                          className="font-bold text-blue-700 hover:text-blue-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <label className="block mt-4 mb-2 text-sm font-semibold text-slate-900">
                  By Province
                </label>
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
                      ? "Loading..."
                      : selectedCountries.length === 0
                      ? "Select country first"
                      : "Select Province"
                  }
                  disabled={loadingProvinces || selectedCountries.length === 0}
                  style={{}}
                />
                {selectedProvinces.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedProvinces.map((province) => (
                      <span
                        key={province}
                        className="inline-flex gap-1 items-center px-2 py-1 text-xs text-green-700 bg-green-50 rounded"
                      >
                        {province}
                        <button
                          onClick={() =>
                            setSelectedProvinces(
                              selectedProvinces.filter((p) => p !== province)
                            )
                          }
                          className="font-bold text-green-700 hover:text-green-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <label className="block mt-4 mb-2 text-sm font-semibold text-slate-900">
                  By City
                </label>
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
                      ? "Loading..."
                      : selectedCountries.length === 0
                      ? "Select country first"
                      : "Select City"
                  }
                  disabled={loadingCities || selectedCountries.length === 0}
                  style={{}}
                />
                {selectedCities.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedCities.map((city) => (
                      <span
                        key={city}
                        className="inline-flex gap-1 items-center px-2 py-1 text-xs text-orange-700 bg-orange-50 rounded"
                      >
                        {city}
                        <button
                          onClick={() =>
                            setSelectedCities(
                              selectedCities.filter((c) => c !== city)
                            )
                          }
                          className="font-bold text-orange-700 hover:text-orange-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Date Filters */}
              <div>
                <h3 className="mb-4 text-lg font-semibold text-slate-900">
                  Announcement Date
                </h3>
                <label className="block mb-2 text-sm font-semibold text-slate-900">
                  Start
                </label>
                <input
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  className="px-3 py-2 w-full rounded-md border border-slate-300"
                />

                <label className="block mt-4 mb-2 text-sm font-semibold text-slate-900">
                  End
                </label>
                <input
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  className="px-3 py-2 w-full rounded-md border border-slate-300"
                />
              </div>
            </div>
          </>
        )}

        {/* Search Row */}
        <div className="mt-4">
          {showFilters && (
            <h3 className="mb-2 text-lg font-semibold text-slate-900">
              Search Corporate Events
            </h3>
          )}
          <div className="flex gap-3 items-center">
            <input
              type="text"
              placeholder="Enter search terms here"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 max-w-md rounded-md border border-slate-300"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button
              onClick={handleSearch}
              className="px-6 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 mt-4 text-red-700 bg-red-50 rounded-md">
            {error}
          </div>
        )}
      </div>

      {/* Statistics Block */}
      {summaryData.acquisitions > 0 && (
        <div className="p-6 bg-white rounded-xl border shadow-lg border-slate-200/60">
          <h2 className="mb-4 text-xl font-bold text-slate-900">
            Corporate Events
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <span className="text-sm text-slate-600">Acquisitions:</span>
              <p className="text-2xl font-bold text-slate-900">
                {summaryData.acquisitions?.toLocaleString() || "0"}
              </p>
            </div>
            <div>
              <span className="text-sm text-slate-600">Investments:</span>
              <p className="text-2xl font-bold text-slate-900">
                {summaryData.investments?.toLocaleString() || "0"}
              </p>
            </div>
            <div>
              <span className="text-sm text-slate-600">IPOs:</span>
              <p className="text-2xl font-bold text-slate-900">
                {summaryData.ipos?.toLocaleString() || "0"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Export Button */}
      {corporateEvents.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleExportCSV}
            className="px-6 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700"
            disabled={loading}
          >
            {loading ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      )}

      {/* Results Table */}
      {loading && (
        <div className="py-10 text-center text-slate-600">
          Loading corporate events...
        </div>
      )}

      {!loading && corporateEvents.length === 0 && (
        <div className="py-10 text-center text-slate-600">
          No corporate events found.
        </div>
      )}

      {!loading && corporateEvents.length > 0 && (
        <div className="overflow-x-auto p-6 bg-white rounded-xl border shadow-lg border-slate-200/60">
          <table className="w-full table-fixed">
            <colgroup>
              <col style={{ width: "30%" }} />
              <col style={{ width: "18%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "18%" }} />
            </colgroup>
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="p-3 text-sm font-semibold text-left text-slate-900">
                  Event Details
                </th>
                <th className="p-3 text-sm font-semibold text-left text-slate-900">
                  Parties
                </th>
                <th className="p-3 text-sm font-semibold text-left text-slate-900">
                  Deal Details
                </th>
                <th className="p-3 text-sm font-semibold text-left text-slate-900">
                  Advisors
                </th>
                <th className="p-3 text-sm font-semibold text-left text-slate-900">
                  Sectors
                </th>
              </tr>
            </thead>
            <tbody>
              {corporateEvents.map((event: CorporateEvent, index: number) => {
                const target = event.target_counterparty?.new_company;
                const targetCounterpartyId =
                  event.target_counterparty?.new_company_counterparty;
                const targetName = target?.name || "Not Available";
                const targetHref = targetCounterpartyId
                  ? `/company/${targetCounterpartyId}`
                  : "";
                const targetCountry =
                  target?.country ||
                  (target as
                    | { _location?: { Country?: string } }
                    | undefined)?._location?.Country ||
                  "Not Available";
                const fundingStage =
                  (
                    event.investment_data?.Funding_stage ||
                    event.investment_data?.funding_stage ||
                    ""
                  ).trim();

                return (
                  <tr
                    key={event.id || index}
                    className="border-b border-slate-100"
                  >
                    {/* Event Details */}
                    <td className="p-3 align-top break-words">
                      <div className="mb-1">
                        <a
                          href={`/corporate-event/${event.id}`}
                          className="font-medium text-blue-600 underline hover:text-blue-800"
                        >
                          {event.description || "Not Available"}
                        </a>
                      </div>
                      <div className="text-xs text-slate-600">
                        Date: {formatDate(event.announcement_date)}
                      </div>
                      <div className="text-xs text-slate-600">
                        Target HQ: {targetCountry}
                      </div>
                    </td>

                    {/* Parties */}
                    <td className="p-3 align-top text-xs break-words text-slate-600">
                      <div className="mb-1">
                        <strong>Target:</strong>{" "}
                        {targetHref ? (
                          <a
                            href={targetHref}
                            className="text-blue-600 underline hover:text-blue-800"
                          >
                            {targetName}
                          </a>
                        ) : (
                          <span>{targetName}</span>
                        )}
                      </div>
                      <div>
                        {(() => {
                          const list = Array.isArray(event.other_counterparties)
                            ? event.other_counterparties.filter((cp) =>
                                /investor|acquirer/i.test(
                                  cp._counterparty_type?.counterparty_status ||
                                    ""
                                )
                              )
                            : [];
                          if (list.length === 0) {
                            return (
                              <>
                                <strong>Buyer(s):</strong> Not Available
                              </>
                            );
                          }
                          const statuses = list
                            .map((cp) =>
                              (
                                cp._counterparty_type?.counterparty_status || ""
                              ).toLowerCase()
                            )
                            .join(" ");
                          const hasAcquirer = /acquirer/.test(statuses);
                          const label = hasAcquirer ? "Buyer(s)" : "Investor(s)";
                          const names = list
                            .map((cp) => cp._new_company?.name || "Unknown")
                            .join(", ");
                          return (
                            <>
                              <strong>{label}:</strong>{" "}
                              {names || "Not Available"}
                            </>
                          );
                        })()}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        <strong>Seller(s):</strong>{" "}
                        {Array.isArray(event.other_counterparties) &&
                        event.other_counterparties.length > 0
                          ? (() => {
                              const sellers =
                                event.other_counterparties.filter((cp) => {
                                  const status =
                                    cp._counterparty_type?.counterparty_status ||
                                    "";
                                  return /divestor|seller|vendor/i.test(status);
                                });
                              if (sellers.length === 0)
                                return "Not Available";
                              return sellers
                                .map(
                                  (cp) => cp._new_company?.name || "Unknown"
                                )
                                .join(", ");
                            })()
                          : "Not Available"}
                      </div>
                    </td>

                    {/* Deal Details */}
                    <td className="p-3 align-top text-xs break-words text-slate-600">
                      <div className="mb-1">
                        <strong>Deal Type:</strong>{" "}
                        {event.deal_type ? (
                          <span className="inline-flex flex-wrap gap-1 align-middle">
                            <span className="inline-block px-2 py-1 text-xs text-blue-700 bg-blue-50 rounded">
                              {event.deal_type}
                            </span>
                            {fundingStage && (
                              <span className="inline-block px-2 py-1 text-xs text-green-700 bg-green-50 rounded">
                                {fundingStage}
                              </span>
                            )}
                          </span>
                        ) : (
                          "Not Available"
                        )}
                      </div>
                      <div>
                        <strong>Amount (m):</strong>{" "}
                        {formatCurrency(
                          event.investment_data?.investment_amount_m,
                          event.investment_data?.currency?.Currency
                        )}
                      </div>
                      <div>
                        <strong>EV (m):</strong>{" "}
                        {formatCurrency(
                          event.ev_data?.enterprise_value_m,
                          event.ev_data?.currency?.Currency
                        )}
                      </div>
                    </td>

                    {/* Advisors */}
                    <td className="p-3 align-top text-xs break-words text-slate-600">
                      <div>
                        <strong>Advisors:</strong>{" "}
                        {Array.isArray(event.advisors) &&
                        event.advisors.length > 0
                          ? event.advisors
                              .map((advisor) => {
                                const nc = advisor._new_company;
                                return nc?.name || "Unknown";
                              })
                              .join(", ")
                          : "Not Available"}
                      </div>
                    </td>

                    {/* Sectors */}
                    <td className="p-3 align-top text-xs break-words text-slate-600">
                      <div>
                        <strong>Primary:</strong>{" "}
                        {formatSectorArray(
                          event.target_counterparty?.new_company
                            ?.primary_sectors as
                            | Array<string | { sector_name?: string }>
                            | undefined
                        )}
                      </div>
                      <div className="mt-1">
                        <strong>Secondary:</strong>{" "}
                        {formatSectorArray(
                          event.target_counterparty?.new_company
                            ?.secondary_sectors as
                            | Array<string | { sector_name?: string }>
                            | undefined
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.pageTotal > 1 && (
        <div className="flex gap-2 justify-center items-center mt-6">
          {generatePaginationButtons()}
        </div>
      )}

      {/* Scoped styles for pagination */}
      <style jsx>{`
        .pagination-button {
          padding: 8px 12px;
          border: none;
          background: none;
          color: #000;
          cursor: pointer;
          font-size: 14px;
          transition: color 0.2s;
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
      `}</style>
    </div>
  );
}

const SubSectorPage = () => {
  const params = useParams();
  const subSectorId = Number(params.id);
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>(
    (searchParams?.get("tab") as TabId) || "all"
  );

  // Header title lookup
  const [subSectorName, setSubSectorName] = useState<string>("");
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const all = await locationsService.getAllSecondarySectorsWithPrimary();
        if (cancelled) return;
        const found = (Array.isArray(all) ? all : []).find(
          (s) => s.id === subSectorId
        );
        setSubSectorName(found?.sector_name || "");
      } catch {
        // ignore name fetch failure
      }
    };
    if (!Number.isNaN(subSectorId)) run();
    return () => {
      cancelled = true;
    };
  }, [subSectorId]);

  // Sync tab in URL
  const setTab = (id: TabId) => {
    setActiveTab(id);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", id);
      window.history.replaceState({}, "", url.toString());
    }
  };

  // -------------------------
  // All Companies (by sub-sector)
  // -------------------------
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companiesError, setCompaniesError] = useState<string | null>(null);
  const [companiesPagination, setCompaniesPagination] = useState({
    itemsReceived: 0,
    curPage: 1,
    nextPage: null as number | null,
    prevPage: null as number | null,
    offset: 0,
    perPage: 25,
    pageTotal: 0,
  });

  const fetchCompanies = useCallback(
    async (page: number = 1) => {
      setCompaniesLoading(true);
      setCompaniesError(null);
      try {
        const token = localStorage.getItem("asymmetrix_auth_token");
        if (!token) {
          setCompaniesError("Authentication required");
          return;
        }
        if (Number.isNaN(subSectorId) || subSectorId <= 0) {
          setCompaniesError("Invalid sub-sector id");
          return;
        }

        const perPage = 25;

        // Use investors-enriched companies endpoint so we can display Investors
        const params = new URLSearchParams();
        params.append("Offset", String(page));
        params.append("Per_page", String(perPage));
        params.append("Min_linkedin_members", "0");
        params.append("Max_linkedin_members", "0");
        // No horizontals filter needed for this view
        params.append("Secondary_sectors_ids[]", String(subSectorId));

        const url = `https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/Get_new_companies_with_investors?${params.toString()}`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        });
        if (!response.ok) {
          const text = await response.text();
          throw new Error(
            `API request failed: ${response.status} ${response.statusText} - ${text}`
          );
        }

        const data = (await response.json()) as {
          result1?: {
            items?: CompanyItem[];
            itemsReceived?: number;
            curPage?: number;
            nextPage?: number | null;
            prevPage?: number | null;
            offset?: number;
            perPage?: number;
            pageTotal?: number;
          };
        };
        const r1 = data.result1 || {};
        setCompanies(r1.items || []);
        setCompaniesPagination({
          itemsReceived: r1.itemsReceived || 0,
          curPage: r1.curPage || 1,
          nextPage: r1.nextPage || null,
          prevPage: r1.prevPage || null,
          offset: r1.offset || 0,
          perPage: r1.perPage || perPage,
          pageTotal: r1.pageTotal || 0,
        });
      } catch (e) {
        setCompaniesError(
          e instanceof Error ? e.message : "Failed to fetch companies"
        );
      } finally {
        setCompaniesLoading(false);
      }
    },
    [subSectorId]
  );

  useEffect(() => {
    if (activeTab === "all") fetchCompanies(1);
  }, [activeTab, fetchCompanies]);

  // -------------------------
  // Insights & Analysis (by sub-sector)
  // -------------------------
  const [articles, setArticles] = useState<ContentArticle[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [insightsPagination, setInsightsPagination] = useState({
    itemsReceived: 0,
    curPage: 1,
    nextPage: null as number | null,
    prevPage: null as number | null,
    offset: 0,
    perPage: 10,
    pageTotal: 0,
  });

  const fetchInsights = useCallback(
    async (page: number = 1) => {
      setInsightsLoading(true);
      setInsightsError(null);
      try {
        const token = localStorage.getItem("asymmetrix_auth_token");
        if (!token) {
          setInsightsError("Authentication required");
          return;
        }
        if (Number.isNaN(subSectorId) || subSectorId <= 0) {
          setInsightsError("Invalid sub-sector id");
          return;
        }
        const params = new URLSearchParams();
        params.append("Offset", String(page));
        params.append("Per_page", String(10));
        params.append("Secondary_sectors_ids", String(subSectorId));
        const url = `https://xdil-abvj-o7rq.e2.xano.io/api:Z3F6JUiu/Get_All_Content_Articles?${params.toString()}`;
        const resp = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!resp.ok) throw new Error(`HTTP error ${resp.status}`);
        const data: InsightsAnalysisResponse = await resp.json();
        setArticles(data.items || []);
        setInsightsPagination({
          itemsReceived: data.itemsReceived,
          curPage: data.curPage,
          nextPage: data.nextPage,
          prevPage: data.prevPage,
          offset: data.offset,
          perPage: 10,
          pageTotal: data.pageTotal,
        });
      } catch (e) {
        setInsightsError(
          e instanceof Error ? e.message : "Failed to fetch insights"
        );
      } finally {
        setInsightsLoading(false);
      }
    },
    [subSectorId]
  );

  useEffect(() => {
    if (activeTab === "insights") fetchInsights(1);
  }, [activeTab, fetchInsights]);

  return (
    <div className="min-h-screen bg-gradient-to-br to-blue-50 from-slate-50">
      <Header />
      <header className="bg-white border-b shadow-sm border-slate-200/60">
        <div className="px-6 py-4 w-full">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="flex justify-center items-center w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl">
                <svg
                  className="w-6 h-6 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 12h18M3 6h18M3 18h18" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  {subSectorName || "Sub-Sector"}
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="px-6 py-8 w-full">
        <div className="mb-8">
          <div className="border-b border-slate-200">
            <nav className="flex overflow-x-auto space-x-8">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTab(tab.id)}
                  className={`relative py-4 px-2 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
                    activeTab === tab.id
                      ? "text-blue-600"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.name}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {activeTab === "all" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border shadow-lg border-slate-200/60">
              <div className="px-5 py-4 border-b border-slate-100">
                <div className="flex justify-between items-center">
                  <div className="flex gap-3 items-center text-xl">
                    <span className="inline-flex justify-center items-center w-8 h-8 bg-indigo-50 rounded-lg">
                      <svg
                        className="w-4 h-4 text-indigo-600"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M3 12h18M3 6h18M3 18h18" />
                      </svg>
                    </span>
                    <span className="text-slate-900">All Companies</span>
                  </div>
                  <div className="text-sm text-slate-600">
                    {companiesPagination.itemsReceived.toLocaleString()} total
                  </div>
                </div>
              </div>
              <div className="px-5 py-4">
                {companiesLoading ? (
                  <div className="py-10 text-center text-slate-500">
                    Loading companies...
                  </div>
                ) : companiesError ? (
                  <div className="py-4 text-center text-red-600">
                    {companiesError}
                  </div>
                ) : companies.length === 0 ? (
                  <div className="py-10 text-center text-slate-500">
                    No companies found for this sub-sector.
                  </div>
                ) : (
                  <div className="overflow-x-hidden">
                    <table className="w-full text-sm table-fixed">
                      <thead className="bg-slate-50/80">
                        <tr className="hover:bg-slate-50/80">
                          <th className="py-3 font-semibold text-center text-slate-700 w-[8%]">
                            Logo
                          </th>
                          <th className="py-3 font-semibold text-center text-slate-700 w-[18%]">
                            Name
                          </th>
                          <th className="py-3 font-semibold text-center text-slate-700 w-[26%]">
                            Description
                          </th>
                          <th className="py-3 font-semibold text-center text-slate-700 w-[12%]">
                            Ownership
                          </th>
                          <th className="py-3 font-semibold text-center text-slate-700 w-[14%]">
                            Investors
                          </th>
                          <th className="py-3 font-semibold text-center text-slate-700 w-[14%]">
                            HQ
                          </th>
                          <th className="py-3 px-3 font-semibold text-center text-slate-700 w-[8%]">
                            LinkedIn Members
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {companies.map((c, index) => (
                          <tr key={c.id} className="hover:bg-slate-50/50">
                            <td className="py-3 pr-4">
                              {c.linkedin_logo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={`data:image/jpeg;base64,${c.linkedin_logo}`}
                                  alt={`${c.name} logo`}
                                  className="object-contain w-12 h-8 rounded"
                                  onError={(e) => {
                                    (
                                      e.target as HTMLImageElement
                                    ).style.display = "none";
                                  }}
                                />
                              ) : (
                                <div className="flex justify-center items-center w-12 h-8 text-[10px] text-slate-500 bg-slate-100 rounded">
                                  No Logo
                                </div>
                              )}
                            </td>
                            <td className="py-3 pr-4 align-middle text-center whitespace-normal break-words">
                              <a
                                href={`/company/${c.id}`}
                                className="font-medium text-blue-600 underline"
                              >
                                {c.name}
                              </a>
                            </td>
                            <td className="py-3 pr-4 align-top whitespace-normal break-words">
                              <DescriptionCell
                                description={c.description}
                                index={index}
                              />
                            </td>
                            <td className="py-3 pr-4 align-middle text-center whitespace-normal break-words text-slate-700">
                              {c.ownership || "N/A"}
                            </td>
                            <td className="py-3 pr-4 align-middle text-center whitespace-normal break-words text-slate-700">
                              {(() => {
                                // Prefer new investors array from Get_new_companies_with_investors
                                if (Array.isArray(c.investors) && c.investors.length > 0) {
                                  const names = c.investors
                                    .map((inv) => (inv.name || "").trim())
                                    .filter((name) => name.length > 0);
                                  if (names.length > 0) {
                                    return names.join(", ");
                                  }
                                }

                                // Fallback to legacy companies_investors, if present
                                if (
                                  Array.isArray(c.companies_investors) &&
                                  c.companies_investors.length > 0
                                ) {
                                  const names = c.companies_investors
                                    .map((inv) => (inv.company_name || "").trim())
                                    .filter((name) => name.length > 0);
                                  if (names.length > 0) {
                                    return names.join(", ");
                                  }
                                }

                                return "N/A";
                              })()}
                            </td>
                            <td className="py-3 pr-4 align-middle text-center whitespace-normal break-words text-slate-700">
                              {c.country || "N/A"}
                            </td>
                            <td className="py-3 pr-4 text-center text-slate-700">
                              {typeof c.linkedin_members === "number"
                                ? c.linkedin_members.toLocaleString()
                                : "0"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            {companiesPagination.pageTotal > 1 && (
              <div className="flex gap-2 justify-center items-center">
                <button
                  disabled={!companiesPagination.prevPage}
                  onClick={() =>
                    companiesPagination.prevPage &&
                    fetchCompanies(companiesPagination.prevPage)
                  }
                  className="px-3 py-1.5 rounded-md text-sm border border-blue-600 text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
                >
                  ← Previous
                </button>
                <span className="text-sm text-slate-600">
                  Page {companiesPagination.curPage} of{" "}
                  {companiesPagination.pageTotal}
                </span>
                <button
                  disabled={!companiesPagination.nextPage}
                  onClick={() =>
                    companiesPagination.nextPage &&
                    fetchCompanies(companiesPagination.nextPage)
                  }
                  className="px-3 py-1.5 rounded-md text-sm border border-blue-600 text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "transactions" && (
          <SubSectorTransactionsTab subSectorId={subSectorId} />
        )}

        {activeTab === "insights" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border shadow-lg border-slate-200/60">
              <div className="px-5 py-4 border-b border-slate-100">
                <div className="flex justify-between items-center">
                  <div className="flex gap-3 items-center text-xl">
                    <span className="inline-flex justify-center items-center w-8 h-8 bg-indigo-50 rounded-lg">
                      <svg
                        className="w-4 h-4 text-indigo-600"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M3 12h18M3 6h18M3 18h18" />
                      </svg>
                    </span>
                    <span className="text-slate-900">Insights & Analysis</span>
                  </div>
                </div>
              </div>
              <div className="px-5 py-4">
                {insightsLoading ? (
                  <div className="py-10 text-center text-slate-500">
                    Loading articles...
                  </div>
                ) : insightsError ? (
                  <div className="py-4 text-center text-red-600">
                    {insightsError}
                  </div>
                ) : articles.length === 0 ? (
                  <div className="py-10 text-center text-slate-500">
                    No articles found.
                  </div>
                ) : (
                  <div
                    className="grid gap-4"
                    style={{
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(320px, 1fr))",
                    }}
                  >
                    {articles.map((article) => (
                      <a
                        key={article.id}
                        href={`/article/${article.id}`}
                        className="block p-4 bg-white rounded-lg border shadow-sm transition-shadow border-slate-200 hover:shadow-md"
                      >
                        <h3 className="text-base font-semibold text-slate-900">
                          {article.Headline || "Not Available"}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {article.Publication_Date
                            ? new Date(
                                article.Publication_Date
                              ).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            : "Not available"}
                        </p>
                        {article.Content_Type && (
                          <span className="inline-block mt-2 px-2 py-0.5 text-xs rounded border bg-blue-50 text-blue-700 border-blue-200">
                            {article.Content_Type}
                          </span>
                        )}
                        <p className="mt-3 text-sm text-slate-700 line-clamp-4">
                          {article.Strapline || "No summary available"}
                        </p>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {insightsPagination.pageTotal > 1 && (
              <div className="flex gap-2 justify-center items-center">
                <button
                  disabled={!insightsPagination.prevPage}
                  onClick={() =>
                    insightsPagination.prevPage &&
                    fetchInsights(insightsPagination.prevPage)
                  }
                  className="px-3 py-1.5 rounded-md text-sm border border-blue-600 text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
                >
                  ← Previous
                </button>
                <span className="text-sm text-slate-600">
                  Page {insightsPagination.curPage} of{" "}
                  {insightsPagination.pageTotal}
                </span>
                <button
                  disabled={!insightsPagination.nextPage}
                  onClick={() =>
                    insightsPagination.nextPage &&
                    fetchInsights(insightsPagination.nextPage)
                  }
                  className="px-3 py-1.5 rounded-md text-sm border border-blue-600 text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default SubSectorPage;
