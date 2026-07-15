"use client";

import { useEffect, useMemo, useState } from "react";
import type { FilterBarState } from "@/components/companies/CompaniesFilterBar";
import { locationsService } from "@/lib/locationsService";

export type LocationCountry = { locations_Country: string };
export type LocationProvince = { State__Province__County: string };
export type LocationCity = { City: string };

function getFilterEnumValues(
  filters: FilterBarState["filters"],
  filterId: string
): string[] {
  const item = filters.find((filter) => filter.id === filterId);
  return Array.isArray(item?.value) ? (item.value as string[]) : [];
}

/**
 * Loads country / state filter options for search dashboards.
 * City options are fetched on demand inside the city filter editor (paginated API).
 */
export function useLocationFilterOptions(filterBarState: FilterBarState) {
  const [countries, setCountries] = useState<LocationCountry[]>([]);
  const [provinces, setProvinces] = useState<LocationProvince[]>([]);

  const selectedCountries = useMemo(
    () => getFilterEnumValues(filterBarState.filters, "country"),
    [filterBarState.filters]
  );

  const selectedProvinces = useMemo(
    () => getFilterEnumValues(filterBarState.filters, "state"),
    [filterBarState.filters]
  );

  const allCountryNames = useMemo(
    () =>
      countries
        .map((country) => country.locations_Country)
        .filter((name): name is string => Boolean(name?.trim())),
    [countries]
  );

  const countriesForFetch = useMemo(
    () => (selectedCountries.length > 0 ? selectedCountries : allCountryNames),
    [selectedCountries, allCountryNames]
  );

  useEffect(() => {
    locationsService.getCountries().then(setCountries).catch(console.error);
  }, []);

  useEffect(() => {
    if (countriesForFetch.length === 0) {
      setProvinces([]);
      return;
    }

    let cancelled = false;
    locationsService
      .getProvinces(countriesForFetch)
      .then((data) => {
        if (!cancelled) setProvinces(data);
      })
      .catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [countriesForFetch]);

  return {
    countries,
    provinces,
    cities: [] as LocationCity[],
    selectedCountries,
    selectedProvinces,
  };
}
