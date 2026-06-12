import { Location, Individual, CurrentRole } from "../types/individuals";
import {
  Location as IndividualLocation,
  JobTitle,
  CorporateEvent,
  EventIndividual,
  RelatedAdvisor,
} from "../types/individual";
import {
  normalizeExternalProfileUrl,
  normalizeLinkedInProfileUrl,
} from "@/lib/linkedinUrl";

export type ManagementRoleLike = {
  Individual_text?: string;
  advisor_individuals?: string;
  job_titles_id?: unknown;
  job_titles?: unknown;
  linkedin_url?: string;
  linkedin_URL?: string;
  LinkedIn_URL?: string;
  current_employer_url?: string;
  _individuals?: { linkedin_URL?: string; LinkedIn_URL?: string };
  Individual?: { linkedin_URL?: string; LinkedIn_URL?: string };
};

export const formatLocation = (location: Location): string => {
  if (!location) return "Not available";
  const parts = [
    location.City,
    location.State__Province__County,
    location.Country,
  ];
  return parts.filter(Boolean).join(", ");
};

export const formatCurrentRoles = (roles: CurrentRole[]): string => {
  if (!roles || roles.length === 0) return "Not available";
  return roles.map((role) => role.job_title).join(", ");
};

export const formatCurrentCompanies = (individual: Individual): string => {
  if (!individual.current_company) return "Not available";
  return individual.current_company;
};

export const getIndividualLocation = (individual: Individual): string => {
  if (!individual._locations_individual) return "Not available";
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
  if (!location) return "Not available";
  const parts = [
    location.City,
    location.State__Province__County,
    location.Country,
  ];
  return parts.filter(Boolean).join(", ");
};

export const formatCurrency = (value: string, currency: string): string => {
  if (!value || value === "0" || value === "") return "Not available";

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
  if (!dateString || dateString === "1900-01-01") return "Not available";

  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const getManagementRoleDisplayName = (role: ManagementRoleLike): string =>
  String(role.advisor_individuals || role.Individual_text || "").trim();

export const getManagementRoleLinkedInUrl = (
  role: ManagementRoleLike
): string | undefined =>
  normalizeLinkedInProfileUrl(role.linkedin_url) ||
  normalizeLinkedInProfileUrl(role.linkedin_URL) ||
  normalizeLinkedInProfileUrl(role.LinkedIn_URL) ||
  normalizeLinkedInProfileUrl(role._individuals?.linkedin_URL) ||
  normalizeLinkedInProfileUrl(role._individuals?.LinkedIn_URL) ||
  normalizeLinkedInProfileUrl(role.Individual?.linkedin_URL) ||
  normalizeLinkedInProfileUrl(role.Individual?.LinkedIn_URL) ||
  normalizeExternalProfileUrl(role.current_employer_url);

export const extractJobTitleStrings = (
  jobTitlesId: unknown,
  fallbackJobTitles?: unknown
): string[] => {
  if (Array.isArray(jobTitlesId)) {
    return jobTitlesId
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          return String(
            (item as { job_title?: string | null }).job_title ?? ""
          ).trim();
        }
        return "";
      })
      .filter(Boolean);
  }
  if (jobTitlesId && typeof jobTitlesId === "object") {
    const title = String(
      (jobTitlesId as { job_title?: string | null }).job_title ?? ""
    ).trim();
    return title ? [title] : [];
  }
  if (typeof jobTitlesId === "string" && jobTitlesId.trim()) {
    const trimmed = jobTitlesId.trim();
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        return extractJobTitleStrings(JSON.parse(trimmed));
      } catch {
        // fall through to plain string
      }
    }
    return [trimmed];
  }
  if (Array.isArray(fallbackJobTitles)) {
    return fallbackJobTitles
      .map((item) => String(item).trim())
      .filter(Boolean);
  }
  return [];
};

export const mapManagementRoleToCard = (role: ManagementRoleLike & {
  id?: number;
  individuals_id?: number;
  individual_id?: number;
}) => ({
  id: role.id,
  name: getManagementRoleDisplayName(role),
  jobTitles: extractJobTitleStrings(role.job_titles_id, role.job_titles),
  individualId: role.individuals_id ?? role.individual_id,
  linkedinUrl: getManagementRoleLinkedInUrl(role),
});

export const formatJobTitles = (jobTitles: JobTitle[] | unknown): string => {
  const titles = extractJobTitleStrings(jobTitles);
  if (titles.length === 0) return "Not available";
  return titles.join(", ");
};

export const formatRelatedJobTitles = (
  jobTitles: Array<{ job_title: string }> | unknown
): string => {
  const titles = extractJobTitleStrings(jobTitles);
  if (titles.length === 0) return "Not available";
  return titles.join(", ");
};

export const getCounterpartyRole = (event: CorporateEvent): string => {
  const advised = event._counterparty_advised_of_corporate_events[0];
  return advised?._counterpartys_type?.counterparty_status || "Not available";
};

export const formatIndividualsList = (
  individuals: EventIndividual[]
): string => {
  if (!individuals || individuals.length === 0) return "Not available";
  return individuals.map((ind) => ind.advisor_individuals).join(", ");
};

export const formatAdvisorsList = (advisors: RelatedAdvisor[]): string => {
  if (!advisors || advisors.length === 0) return "Not available";
  return advisors.map((advisor) => advisor._new_company.name).join(", ");
};
