"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { locationsService } from "@/lib/locationsService";
import {
  CorporateEvent,
  CorporateEventsResponse,
  CorporateEventsFilters,
} from "../../types/corporateEvents";
import { useRightClick } from "@/hooks/useRightClick";

// Types for API integration
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

// Removed unused interfaces since we're using hardcoded options

// Shared styles object
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
    fontSize: "14px",
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
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#374151",
    marginBottom: "4px",
  },
  select: {
    width: "100%",
    maxWidth: "300px",
  },
};

// Generate pagination buttons (similar to advisors page)
const generatePaginationButtons = (
  pagination: {
    curPage: number;
    pageTotal: number;
    prevPage: number | null;
    nextPage: number | null;
  },
  handlePageChange: (page: number) => void
) => {
  const buttons = [];
  const currentPage = pagination.curPage;
  const totalPages = pagination.pageTotal;

  // Previous button
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

  // Page numbers
  if (totalPages <= 7) {
    // Show all pages if total is 7 or less
    for (let i = 1; i <= totalPages; i++) {
      buttons.push(
        <button
          key={i}
          className={`pagination-button ${i === currentPage ? "active" : ""}`}
          onClick={() => handlePageChange(i)}
        >
          {i.toString()}
        </button>
      );
    }
  } else {
    // Show first page
    buttons.push(
      <button
        key={1}
        className={`pagination-button ${currentPage === 1 ? "active" : ""}`}
        onClick={() => handlePageChange(1)}
      >
        1
      </button>
    );

    // Show second page if not first
    if (currentPage > 2) {
      buttons.push(
        <button
          key={2}
          className="pagination-button"
          onClick={() => handlePageChange(2)}
        >
          2
        </button>
      );
    }

    // Show ellipsis if needed
    if (currentPage > 3) {
      buttons.push(
        <span key="ellipsis1" className="pagination-ellipsis">
          ...
        </span>
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
          <button
            key={i}
            className={`pagination-button ${i === currentPage ? "active" : ""}`}
            onClick={() => handlePageChange(i)}
          >
            {i.toString()}
          </button>
        );
      }
    }

    // Show ellipsis if needed
    if (currentPage < totalPages - 2) {
      buttons.push(
        <span key="ellipsis2" className="pagination-ellipsis">
          ...
        </span>
      );
    }

    // Show second to last page if not last
    if (currentPage < totalPages - 1) {
      buttons.push(
        <button
          key={totalPages - 1}
          className="pagination-button"
          onClick={() => handlePageChange(totalPages - 1)}
        >
          {(totalPages - 1).toString()}
        </button>
      );
    }

    // Show last page
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

  // Next button
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

// Corporate Events Table Component
const CorporateEventsTable = ({
  events,
  loading,
}: {
  events: CorporateEvent[];
  loading: boolean;
}) => {
  const { createClickableElement } = useRightClick();

  // Corporate Event Card Component for mobile
  const CorporateEventCard = ({ event }: { event: CorporateEvent }) => {
    const { createClickableElement } = useRightClick();
    const target = event.target_counterparty?.new_company;
    const targetCounterpartyId =
      event.target_counterparty?.new_company_counterparty;

    const formatDate = (dateString: string) => {
      if (!dateString) return "Not available";
      try {
        return new Date(dateString).toLocaleDateString();
      } catch {
        return "Invalid date";
      }
    };

    const formatCurrency = (
      amount: string | undefined,
      currency: string | undefined
    ) => {
      if (!amount || !currency) return "Not available";
      return `${currency} ${parseFloat(amount).toLocaleString()}`;
    };

    return (
      <div className="corporate-event-card">
        <div className="corporate-event-card-header">
          <div style={{ flex: "1" }}>
            {createClickableElement(
              `/corporate-event/${event.id}`,
              event.description || "N/A",
              "corporate-event-card-title"
            )}
            <div className="corporate-event-card-date">
              {formatDate(event.announcement_date || "")}
            </div>
          </div>
        </div>
        <div className="corporate-event-card-info">
          <div className="corporate-event-card-info-item">
            <span className="corporate-event-card-info-label">Target:</span>
            {target && targetCounterpartyId ? (
              createClickableElement(
                `/company/${targetCounterpartyId}`,
                target.name || "N/A",
                "corporate-event-card-info-value-link"
              )
            ) : (
              <span className="corporate-event-card-info-value">
                Not available
              </span>
            )}
          </div>
          <div className="corporate-event-card-info-item">
            <span className="corporate-event-card-info-label">Type:</span>
            <span className="corporate-event-card-info-value">
              {event.deal_type || "N/A"}
            </span>
          </div>
          <div className="corporate-event-card-info-item corporate-event-card-info-full-width">
            <span className="corporate-event-card-info-label">Investment:</span>
            <span
              className="corporate-event-card-info-value"
              style={{ textAlign: "right" }}
            >
              {formatCurrency(
                event.investment_data?.investment_amount_m,
                event.investment_data?.currency?.Currency
              )}
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="loading">Loading corporate events...</div>;
  }

  if (!events || events.length === 0) {
    return <div className="loading">No corporate events found.</div>;
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not available";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return "Invalid date";
    }
  };

  const formatCurrency = (
    amount: string | undefined,
    currency: string | undefined
  ) => {
    if (!amount || !currency) return "Not available";
    return `${currency} ${parseFloat(amount).toLocaleString()}`;
  };

  const formatSectors = (sectors: { sector_name: string }[] | undefined) => {
    if (!sectors || sectors.length === 0) return "Not available";
    return sectors.map((s) => s.sector_name).join(", ");
  };

  return (
    <div>
      {/* Mobile Cards */}
      <div className="corporate-event-cards">
        {events.map((event, index) => (
          <CorporateEventCard key={event.id || index} event={event} />
        ))}
      </div>

      {/* Desktop Table */}
      <table className="corporate-event-table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Date Announced</th>
            <th>Target Name</th>
            <th>Target Country</th>
            <th>Primary Sector</th>
            <th>Secondary Sectors</th>
            <th>Type</th>
            <th>Investment</th>
            <th>Enterprise Value</th>
            <th>Other Counterparties</th>
            <th>Advisors</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event: CorporateEvent, index: number) => {
            const target = event.target_counterparty?.new_company;
            const targetCounterpartyId =
              event.target_counterparty?.new_company_counterparty;
            return (
              <tr key={event.id || index}>
                <td>
                  {createClickableElement(
                    `/corporate-event/${event.id}`,
                    event.description || "Not Available",
                    "corporate-event-name",
                    {
                      fontWeight: "500",
                    }
                  )}
                </td>
                <td>{formatDate(event.announcement_date)}</td>
                <td>
                  {targetCounterpartyId ? (
                    createClickableElement(
                      `/company/${targetCounterpartyId}`,
                      target?.name || "Not Available"
                    )
                  ) : (
                    <span>{target?.name || "Not Available"}</span>
                  )}
                </td>
                <td>{target?.country || "Not Available"}</td>
                <td>{formatSectors(target?._sectors_primary)}</td>
                <td>{formatSectors(target?._sectors_secondary)}</td>
                <td>{event.deal_type || "Not Available"}</td>
                <td>
                  {formatCurrency(
                    event.investment_data?.investment_amount_m,
                    event.investment_data?.currency?.Currency
                  )}
                </td>
                <td>
                  {formatCurrency(
                    event.ev_data?.enterprise_value_m,
                    event.ev_data?.currency?.Currency
                  )}
                </td>
                <td>
                  {event.other_counterparties?.map((counterparty, subIndex) => {
                    return (
                      <span key={subIndex}>
                        {counterparty._new_company._is_that_investor ? (
                          createClickableElement(
                            `/investors/${counterparty.new_company_counterparty}`,
                            counterparty._new_company.name
                          )
                        ) : (
                          <span style={{ color: "#000" }}>
                            {counterparty._new_company.name}
                          </span>
                        )}
                        {subIndex < event.other_counterparties.length - 1 &&
                          ", "}
                      </span>
                    );
                  }) || "Not Available"}
                </td>
                <td>
                  {event.advisors?.map((advisor, subIndex) => (
                    <span key={subIndex}>
                      {createClickableElement(
                        `/company/${advisor._new_company.id}`,
                        advisor._new_company.name
                      )}
                      {subIndex < event.advisors.length - 1 && ", "}
                    </span>
                  )) || "Not Available"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// Main Corporate Events Page Component
const CorporateEventsPage = () => {
  // State for filter visibility
  const [showFilters, setShowFilters] = useState(false);

  // State for filters
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

  // State for each filter (arrays for multi-select)
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedPrimarySectors, setSelectedPrimarySectors] = useState<
    number[]
  >([]);
  const [selectedSecondarySectors, setSelectedSecondarySectors] = useState<
    number[]
  >([]);
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [selectedDealStatuses, setSelectedDealStatuses] = useState<string[]>(
    []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");

  // State for API data
  const [countries, setCountries] = useState<Country[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [primarySectors, setPrimarySectors] = useState<PrimarySector[]>([]);
  const [secondarySectors, setSecondarySectors] = useState<SecondarySector[]>(
    []
  );
  // Removed eventTypes and dealStatuses state since we're using hardcoded options

  // Loading states
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingPrimarySectors, setLoadingPrimarySectors] = useState(false);
  const [loadingSecondarySectors, setLoadingSecondarySectors] = useState(false);
  // Removed loading states for event types and deal statuses since we're using hardcoded options

  // State for corporate events data
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

  // Hardcoded options for Deal Types (By Type)
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
  ];

  // Hardcoded options for Deal Status
  const dealStatusOptions = [
    { value: "Completed", label: "Completed" },
    { value: "In Market", label: "In Market" },
    { value: "Not yet launched", label: "Not yet launched" },
    { value: "Strategic Review", label: "Strategic Review" },
    { value: "Deal Prep", label: "Deal Prep" },
    { value: "In Exclusivity", label: "In Exclusivity" },
  ];

  // Fetch functions
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

  // Removed fetchEventTypes and fetchDealStatuses functions since we're using hardcoded options

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
    } catch (error) {
      console.error("Error fetching provinces:", error);
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
    } catch (error) {
      console.error("Error fetching cities:", error);
    } finally {
      setLoadingCities(false);
    }
  };

  const fetchSecondarySectors = async () => {
    if (selectedPrimarySectors.length === 0) {
      setSecondarySectors([]);
      return;
    }
    try {
      setLoadingSecondarySectors(true);
      const sectorsData = await locationsService.getSecondarySectors(
        selectedPrimarySectors
      );
      setSecondarySectors(sectorsData);
    } catch (error) {
      console.error("Error fetching secondary sectors:", error);
    } finally {
      setLoadingSecondarySectors(false);
    }
  };

  const fetchCorporateEvents = async (filters: CorporateEventsFilters) => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("asymmetrix_auth_token");
      if (!token) {
        setError("Authentication required");
        return;
      }

      // Convert filters to URL parameters for GET request
      const params = new URLSearchParams();

      // Add page and per_page
      params.append("Page", filters.Page.toString());
      params.append("Per_page", filters.Per_page.toString());

      // Add search query
      if (filters.search_query)
        params.append("search_query", filters.search_query);

      // Add location filters as comma-separated values
      if (filters.Countries.length > 0) {
        params.append("Countries", filters.Countries.join(","));
      }

      if (filters.Provinces.length > 0) {
        params.append("Provinces", filters.Provinces.join(","));
      }

      if (filters.Cities.length > 0) {
        params.append("Cities", filters.Cities.join(","));
      }

      // Add sector filters as comma-separated values
      if (filters.primary_sectors_ids.length > 0) {
        params.append(
          "primary_sectors_ids",
          filters.primary_sectors_ids.join(",")
        );
      }

      if (filters.Secondary_sectors_ids.length > 0) {
        params.append(
          "Secondary_sectors_ids",
          filters.Secondary_sectors_ids.join(",")
        );
      }

      // Add event types as comma-separated values
      if (filters.deal_types.length > 0) {
        params.append("deal_types", filters.deal_types.join(","));
      }

      // Add deal statuses as comma-separated values
      if (filters.Deal_Status.length > 0) {
        params.append("Deal_Status", filters.Deal_Status.join(","));
      }

      // Add date filters
      if (filters.Date_start) {
        params.append("Date_start", filters.Date_start);
      }

      if (filters.Date_end) {
        params.append("Date_end", filters.Date_end);
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
        perPage: filters.Per_page,
        pageTotal: data.pageTotal,
      });
      setSummaryData({
        acquisitions: data.acquisitions,
        investments: data.investments,
        ipos: data.ipos,
      });
    } catch (error) {
      console.error("Error fetching corporate events:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to fetch corporate events"
      );
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchCountries();
    fetchPrimarySectors();
    // Initial fetch of all corporate events
    fetchCorporateEvents(filters);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch provinces when countries change
  useEffect(() => {
    fetchProvinces();
  }, [selectedCountries]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch cities when provinces change
  useEffect(() => {
    fetchCities();
  }, [selectedProvinces]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch secondary sectors when primary sectors are selected
  useEffect(() => {
    fetchSecondarySectors();
  }, [selectedPrimarySectors]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle search
  const handleSearch = () => {
    const updatedFilters = {
      ...filters,
      search_query: searchTerm,
      Countries: selectedCountries,
      Provinces: selectedProvinces,
      Cities: selectedCities,
      primary_sectors_ids: selectedPrimarySectors,
      Secondary_sectors_ids: selectedSecondarySectors,
      deal_types: selectedEventTypes,
      Deal_Status: selectedDealStatuses,
      Date_start: dateStart || null,
      Date_end: dateEnd || null,
      Page: 1, // Reset to first page when searching
    };
    setFilters(updatedFilters);
    fetchCorporateEvents(updatedFilters);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    const updatedFilters = { ...filters, Page: page };
    setFilters(updatedFilters);
    fetchCorporateEvents(updatedFilters);
  };

  const style = `
    .corporate-event-section { padding: 16px 24px; border-radius: 8px; }
    .corporate-event-stats { background: #fff; padding: 12px 16px; box-shadow: 0px 1px 3px 0px rgba(227, 228, 230, 1); border-radius: 16px; margin-bottom: 16px; }
    .stats-title { font-size: 22px; font-weight: 700; color: #1a202c; margin: 0 0 16px 0; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px 24px;
    }
    .stats-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .stats-label {
      font-size: 14px;
      color: #4a5568;
      font-weight: 500;
      line-height: 1.4;
    }
    .stats-value {
      font-size: 20px;
      color: #000;
      font-weight: 700;
    }
    .corporate-event-table { width: 100%; background: #fff; padding: 20px 24px; box-shadow: 0px 1px 3px 0px rgba(227, 228, 230, 1); border-radius: 16px; border-collapse: collapse; table-layout: fixed; }
    .corporate-event-table th, .corporate-event-table td { padding: 12px; text-align: left; vertical-align: top; border-bottom: 1px solid #e2e8f0; word-wrap: break-word; overflow-wrap: break-word; }
    .corporate-event-table th:nth-child(1) { width: 20%; }
    .corporate-event-table th:nth-child(2) { width: 10%; }
    .corporate-event-table th:nth-child(3) { width: 12%; }
    .corporate-event-table th:nth-child(4) { width: 10%; }
    .corporate-event-table th:nth-child(5) { width: 12%; }
    .corporate-event-table th:nth-child(6) { width: 12%; }
    .corporate-event-table th:nth-child(7) { width: 8%; }
    .corporate-event-table th:nth-child(8) { width: 8%; }
    .corporate-event-table th:nth-child(9) { width: 8%; }
    .corporate-event-table th:nth-child(10) { width: 18%; }
    .corporate-event-table th:nth-child(11) { width: 18%; }
    .corporate-event-table th {
      font-weight: 600;
      color: #1a202c;
      font-size: 14px;
      background: #f9fafb;
      border-bottom: 2px solid #e2e8f0;
    }
    .corporate-event-table td {
      font-size: 14px;
      color: #000;
      line-height: 1.5;
    }
    .corporate-event-name { color: #0075df; text-decoration: underline; cursor: pointer; font-weight: 500; transition: color 0.2s; }
    .corporate-event-name:hover {
      color: #005bb5;
    }
    .loading { text-align: center; padding: 40px; color: #666; }
    .error { text-align: center; padding: 20px; color: #e53e3e; background-color: #fed7d7; border-radius: 6px; margin-bottom: 16px; }
    .pagination { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 24px; padding: 16px; }
    .pagination-button { padding: 8px 12px; border: none; background: none; color: #000; cursor: pointer; font-size: 14px; font-weight: 400; transition: color 0.2s; text-decoration: none; }
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
    .corporate-event-cards { display: none; }
    .corporate-event-card { background-color: white; border-radius: 8px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; }
    .corporate-event-card-header { display: flex; align-items: center; margin-bottom: 12px; gap: 12px; }
    .corporate-event-card-title { font-size: 16px; font-weight: 600; color: #0075df; text-decoration: underline; cursor: pointer; margin-bottom: 4px; line-height: 1.4; }
    .corporate-event-card-date { font-size: 14px; color: #4a5568; }
    .corporate-event-card-info { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; }
    .corporate-event-card-info-item { display: flex; justify-content: space-between; padding: 4px 0; }
    .corporate-event-card-info-label { color: #4a5568; }
    .corporate-event-card-info-value { font-weight: 600; max-width: 60%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .corporate-event-card-info-value-link { font-weight: 600; color: #0075df; text-decoration: underline; cursor: pointer; max-width: 60%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .corporate-event-card-info-full-width { grid-column: 1 / -1; }
    .search-row { display: flex; align-items: center; gap: 12px; }
    .search-row .filters-input { margin: 0; max-width: 340px; }
    .search-row .filters-button { margin: 0; max-width: 140px; }
    @media (max-width: 768px) {
      .corporate-event-table {
        display: none !important;
      }
      .corporate-event-cards {
        display: block !important;
        padding: 8px !important;
      }
      .corporate-event-card {
        padding: 12px !important;
        margin-bottom: 8px !important;
      }
      .corporate-event-card-title {
        font-size: 15px !important;
        line-height: 1.3 !important;
      }
      .corporate-event-card-date {
        font-size: 13px !important;
      }
      .corporate-event-card-info {
        gap: 6px !important;
        font-size: 11px !important;
      }
      .corporate-event-card-info-item {
        padding: 3px 0 !important;
      }
      .corporate-event-card-info-value,
      .corporate-event-card-info-value-link {
        max-width: 55% !important;
        font-size: 11px !important;
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
      .corporate-event-section { padding: 12px 8px !important; }
      .corporate-event-stats { padding: 12px 12px !important; }
      .stats-title {
        font-size: 18px !important;
        margin-bottom: 12px !important;
      }
      .stats-grid {
        grid-template-columns: 1fr !important;
        gap: 12px !important;
      }
      .stats-item { padding: 6px 0 !important; }
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
      .filters-card { padding: 16px 16px !important; }
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
      .corporate-event-cards {
        display: none !important;
      }
      .corporate-event-table {
        display: table !important;
      }
    }
  `;

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
                    Corporate Event Type
                  </h3>
                  <span style={styles.label}>By Type</span>
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
                    style={styles.select}
                  />

                  {/* Selected Event Types Tags */}
                  {selectedEventTypes.length > 0 && (
                    <div
                      style={{
                        marginTop: "8px",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "4px",
                      }}
                    >
                      {selectedEventTypes.map((eventType) => (
                        <span
                          key={eventType}
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
                          {eventType}
                          <button
                            onClick={() => {
                              setSelectedEventTypes(
                                selectedEventTypes.filter(
                                  (t) => t !== eventType
                                )
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
                </div>

                <div style={styles.gridItem}>
                  <h3 style={styles.subHeading} className="filters-sub-heading">
                    Location
                  </h3>
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
                    Sector
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
                        ? "Loading sectors..."
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
                            {sector?.sector_name || `Sector ${sectorId}`}
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

                  <span style={styles.label}>By Secondary Sectors</span>
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
                        ? "Loading sectors..."
                        : selectedPrimarySectors.length === 0
                        ? "Select primary sectors first"
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
                              color: "#2e7d32",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "12px",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            {sector?.sector_name || `Sector ${sectorId}`}
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
                                color: "#2e7d32",
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

                <div style={styles.gridItem}>
                  <h3 style={styles.subHeading} className="filters-sub-heading">
                    Deal Status
                  </h3>
                  <span style={styles.label}>By Deal Status</span>
                  <SearchableSelect
                    options={dealStatusOptions}
                    value=""
                    onChange={(value) => {
                      if (
                        typeof value === "string" &&
                        value &&
                        !selectedDealStatuses.includes(value)
                      ) {
                        setSelectedDealStatuses([
                          ...selectedDealStatuses,
                          value,
                        ]);
                      }
                    }}
                    placeholder="Select Deal Status"
                    disabled={false}
                    style={styles.select}
                  />

                  {/* Selected Deal Statuses Tags */}
                  {selectedDealStatuses.length > 0 && (
                    <div
                      style={{
                        marginTop: "8px",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "4px",
                      }}
                    >
                      {selectedDealStatuses.map((dealStatus) => (
                        <span
                          key={dealStatus}
                          style={{
                            backgroundColor: "#ffebee",
                            color: "#c62828",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {dealStatus}
                          <button
                            onClick={() => {
                              setSelectedDealStatuses(
                                selectedDealStatuses.filter(
                                  (s) => s !== dealStatus
                                )
                              );
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#c62828",
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
                    Announcement Date
                  </h3>
                  <span style={styles.label}>Start</span>
                  <input
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    style={styles.input}
                    className="filters-input"
                    placeholder="dd/mm/yyyy"
                  />

                  <span style={styles.label}>End</span>
                  <input
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    style={styles.input}
                    className="filters-input"
                    placeholder="dd/mm/yyyy"
                  />
                </div>

                {/* Removed inline grid Search section to reduce space; use compact search row below */}
              </div>
            )}

            {/* Compact Search Row */}
            <div style={{ marginTop: showFilters ? "20px" : "0" }}>
              {showFilters && (
                <h3 style={styles.subHeading}>Search Corporate Events</h3>
              )}
              <div className="search-row">
                <input
                  type="text"
                  placeholder="Enter search terms here"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ ...styles.input, marginBottom: 0, maxWidth: 340 }}
                  className="filters-input"
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                />
                <button
                  onClick={handleSearch}
                  style={{ ...styles.button, marginTop: 0, maxWidth: 140 }}
                  className="filters-button"
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

            {/* Error Display */}
            {error && <div className="error">{error}</div>}

            {/* Loading Display */}
            {loading && (
              <div className="loading">Loading corporate events...</div>
            )}
          </div>
        </div>
      </div>

      {/* Corporate Events Table Section */}
      <div className="corporate-event-section">
        {/* Statistics Block */}
        {summaryData.acquisitions > 0 && (
          <div className="corporate-event-stats">
            <h2 className="stats-title">Corporate Events</h2>
            <div className="stats-grid">
              <div className="stats-item">
                <span className="stats-label">Acquisitions:</span>
                <span className="stats-value">
                  {summaryData.acquisitions?.toLocaleString() || "0"}
                </span>
              </div>
              <div className="stats-item">
                <span className="stats-label">Investments:</span>
                <span className="stats-value">
                  {summaryData.investments?.toLocaleString() || "0"}
                </span>
              </div>
              <div className="stats-item">
                <span className="stats-label">IPOs:</span>
                <span className="stats-value">
                  {summaryData.ipos?.toLocaleString() || "0"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Results Table */}
        {corporateEvents.length > 0 && (
          <CorporateEventsTable events={corporateEvents} loading={loading} />
        )}

        {/* Pagination */}
        {pagination.pageTotal > 1 && (
          <div className="pagination">
            {generatePaginationButtons(pagination, handlePageChange)}
          </div>
        )}
      </div>

      <Footer />
      <style dangerouslySetInnerHTML={{ __html: style }} />
    </div>
  );
};

export default CorporateEventsPage;
