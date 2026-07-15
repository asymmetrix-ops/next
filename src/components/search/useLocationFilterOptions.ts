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
 * Loads country / state / city filter options for search dashboards.
 * When no country filter is active, provinces and cities are loaded for all countries
 * so the City dropdown is usable without selecting Country first.
 */
export function useLocationFilterOptions(filterBarState: FilterBarState) {
  const [countries, setCountries] = useState<LocationCountry[]>([]);
  const [provinces, setProvinces] = useState<LocationProvince[]>([]);
  const [cities, setCities] = useState<LocationCity[]>([]);

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

  useEffect(() => {
    if (countriesForFetch.length === 0) {
      setCities([]);
      return;
    }

    let cancelled = false;
    locationsService
      .getCities(countriesForFetch, selectedProvinces)
      .then((data) => {
        if (!cancelled) setCities(data);
      })
      .catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [countriesForFetch, selectedProvinces]);

  return {
    countries,
    provinces,
    cities,
    selectedCountries,
    selectedProvinces,
  };
}
