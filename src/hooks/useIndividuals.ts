import { useState, useEffect, useCallback } from "react";
import { individualsService } from "../lib/individualsService";
import { IndividualsFilters, IndividualsResponse } from "../types/individuals";

interface UseIndividualsProps {
  initialPage?: number;
  initialPerPage?: number;
  initialFilters?: Partial<IndividualsFilters>;
}

export const useIndividuals = ({
  initialPage = 1,
  initialPerPage = 50,
  initialFilters = {},
}: UseIndividualsProps = {}) => {
  const [data, setData] = useState<IndividualsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [perPage, setPerPage] = useState(initialPerPage);
  const [filters, setFilters] =
    useState<Partial<IndividualsFilters>>(initialFilters);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchIndividuals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const combinedFilters = {
        ...filters,
        search_query: searchQuery,
        Offset: currentPage,
        Per_page: perPage,
      };

      const response = await individualsService.filterIndividuals(
        combinedFilters,
        currentPage,
        perPage
      );

      setData(response);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch individuals";
      setError(errorMessage);
      console.error("Error fetching individuals:", err);
    } finally {
      setLoading(false);
    }
  }, [filters, searchQuery, currentPage, perPage]);

  useEffect(() => {
    fetchIndividuals();
  }, [fetchIndividuals]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page on search
  }, []);

  const handleFilterChange = useCallback(
    (newFilters: Partial<IndividualsFilters>) => {
      setFilters((prev) => ({ ...prev, ...newFilters }));
      setCurrentPage(1); // Reset to first page on filter change
    },
    []
  );

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handlePerPageChange = useCallback((newPerPage: number) => {
    setPerPage(newPerPage);
    setCurrentPage(1); // Reset to first page when changing page size
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setSearchQuery("");
    setCurrentPage(1);
  }, []);

  return {
    data,
    loading,
    error,
    currentPage,
    perPage,
    filters,
    searchQuery,
    handleSearch,
    handleFilterChange,
    handlePageChange,
    handlePerPageChange,
    clearFilters,
    refetch: fetchIndividuals,
  };
};
