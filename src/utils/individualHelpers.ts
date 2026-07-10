import { Location, Individual, CurrentRole } from "../types/individuals";
import {
  Location as IndividualLocation,
  JobTitle,
  CorporateEvent,
  EventIndividual,
  RelatedAdvisor,
} from "../types/individual";

export const formatLocation = (location: Location): string => {
  if (!location) return "-";
  const parts = [
    location.City,
    location.State__Province__County,
    location.Country,
  ];
  return parts.filter(Boolean).join(", ");
};

export const formatCurrentRoles = (roles: CurrentRole[]): string => {
  if (!roles || roles.length === 0) return "-";
  return roles.map((role) => role.job_title).join(", ");
};

export const formatCurrentCompanies = (individual: Individual): string => {
  if (!individual.current_company) return "-";
  return individual.current_company;
};

export const getIndividualLocation = (individual: Individual): string => {
  if (!individual._locations_individual) return "-";
  const location = individual._locations_individual;
  const parts = [
    location.City,
    location.State__Province__County,
    location.Country,
  ];
  return parts.filter(Boolean).join(", ");
};

export const getTotalPages = (totalItems: number, perPage: number): number => {
  return Math.ceil(totalItems / perPage);
};

export const getPageNumbers = (
  currentPage: number,
  totalPages: number,
  maxVisible: number = 10
): number[] => {
  const half = Math.floor(maxVisible / 2);
  let start = Math.max(currentPage - half, 1);
  const end = Math.min(start + maxVisible - 1, totalPages);

  if (end - start + 1 < maxVisible) {
    start = Math.max(end - maxVisible + 1, 1);
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
};

// Individual Profile Page Helper Functions
export const formatIndividualLocation = (
  location: IndividualLocation
): string => {
  if (!location) return "-";
  const parts = [
    location.City,
    location.State__Province__County,
    location.Country,
  ];
  return parts.filter(Boolean).join(", ");
};

export const formatCurrency = (value: string, currency: string): string => {
  if (!value || value === "0" || value === "") return "-";

  const numValue = parseFloat(value);
  const currencySymbols: { [key: string]: string } = {
    USD: "$",
    GBP: "£",
    EUR: "€",
    JPY: "¥",
  };

  const symbol = currencySymbols[currency] || currency;

  // Values are provided in millions; always display as whole millions with 'M'
  const roundedMillions = Math.round(numValue);
  return `${symbol}${roundedMillions.toLocaleString()}M`;
};

export const formatDate = (dateString: string): string => {
  if (!dateString || dateString === "1900-01-01") return "-";

  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/** Coerce API job title fields (array, single object, or string) into a uniform list. */
export function normalizeJobTitlesId(
  value: unknown,
  fallback?: unknown
): Array<{ job_title: string }> {
  const normalized = toJobTitleRecords(value);
  if (normalized.length > 0) return normalized;
  return toJobTitleRecords(fallback);
}

function toJobTitleRecords(value: unknown): Array<{ job_title: string }> {
  if (value == null) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string" && item.trim()) {
          return { job_title: item.trim() };
        }
        if (item && typeof item === "object" && "job_title" in item) {
          const title = (item as { job_title?: unknown }).job_title;
          return typeof title === "string" && title.trim()
            ? { job_title: title.trim() }
            : null;
        }
        return null;
      })
      .filter((item): item is { job_title: string } => item != null);
  }

  if (typeof value === "string" && value.trim()) {
    return [{ job_title: value.trim() }];
  }

  if (typeof value === "object" && value !== null && "job_title" in value) {
    const title = (value as { job_title?: unknown }).job_title;
    return typeof title === "string" && title.trim()
      ? [{ job_title: title.trim() }]
      : [];
  }

  return [];
}

export function getJobTitleStringsFromId(
  jobTitlesId: unknown,
  fallback?: unknown
): string[] {
  return normalizeJobTitlesId(jobTitlesId, fallback)
    .map((item) => item.job_title)
    .filter(Boolean);
}

export function formatJobTitlesFromId(
  jobTitlesId: unknown,
  fallback?: unknown
): string {
  const titles = getJobTitleStringsFromId(jobTitlesId, fallback);
  return titles.length > 0 ? titles.join(", ") : "";
}

export const formatJobTitles = (jobTitles: JobTitle[]): string => {
  if (!jobTitles || jobTitles.length === 0) return "-";
  return jobTitles.map((title) => title.job_title).join(", ");
};

export const formatRelatedJobTitles = (
  jobTitles: Array<{ job_title: string }>
): string => {
  if (!jobTitles || jobTitles.length === 0) return "-";
  return jobTitles.map((title) => title.job_title).join(", ");
};

export const getCounterpartyRole = (event: CorporateEvent): string => {
  const advised = event._counterparty_advised_of_corporate_events[0];
  return advised?._counterpartys_type?.counterparty_status || "-";
};

export const formatIndividualsList = (
  individuals: EventIndividual[]
): string => {
  if (!individuals || individuals.length === 0) return "-";
  return individuals.map((ind) => ind.advisor_individuals).join(", ");
};

export const formatAdvisorsList = (advisors: RelatedAdvisor[]): string => {
  if (!advisors || advisors.length === 0) return "-";
  return advisors.map((advisor) => advisor._new_company.name).join(", ");
};
