import { useState, useEffect, useCallback } from "react";
import { corporateEventsService } from "../lib/corporateEventsService";
import {
  CorporateEventsResponse,
  CorporateEventsFilters,
} from "../types/corporateEvents";

interface UseCorporateEventsProps {
  initialPage?: number;
  initialPerPage?: number;
  initialFilters?: Partial<CorporateEventsFilters>;
}

export const useCorporateEvents = ({
  initialPage = 1,
  initialPerPage = 50,
  initialFilters = {},
}: UseCorporateEventsProps = {}) => {
  const [data, setData] = useState<CorporateEventsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [perPage, setPerPage] = useState(initialPerPage);
  const [filters, setFilters] =
    useState<Partial<CorporateEventsFilters>>(initialFilters);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const combinedFilters = {
        ...filters,
        search_query: searchQuery,
      };

      const response = await corporateEventsService.getCorporateEvents(
        currentPage,
        perPage,
        combinedFilters
      );
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [filters, searchQuery, currentPage, perPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePerPageChange = useCallback((newPerPage: number) => {
    setPerPage(newPerPage);
    setCurrentPage(1); // Reset to first page when changing per page
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page when searching
  }, []);

  const handleFilterChange = useCallback(
    (newFilters: Partial<CorporateEventsFilters>) => {
      setFilters((prev) => ({ ...prev, ...newFilters }));
      setCurrentPage(1); // Reset to first page on filter change
    },
    []
  );

  return {
    data,
    loading,
    error,
    currentPage,
    perPage,
    filters,
    searchQuery,
    handlePageChange,
    handlePerPageChange,
    handleSearchChange,
    handleFilterChange,
    setFilters,
    refetch: fetchData,
  };
};
