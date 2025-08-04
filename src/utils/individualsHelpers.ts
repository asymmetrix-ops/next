import { Location, Individual, CurrentRole } from "../types/individuals";

export const formatLocation = (location: Location): string => {
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
  if (individual._locations_individual) {
    return formatLocation(individual._locations_individual);
  }
  if (
    individual.current_company_location &&
    individual.current_company_location.length > 0
  ) {
    return formatLocation(individual.current_company_location[0]);
  }
  return "Not available";
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
