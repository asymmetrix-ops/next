import { Sector } from "../types/corporateEvents";

export const formatSectors = (sectors: Sector[] | undefined): string => {
  if (!sectors || sectors.length === 0) return "Not Available";
  return sectors.map((s) => s.sector_name).join(", ");
};

export const formatCurrency = (
  amount: string | undefined,
  currency: string | null
): string => {
  if (!amount) return "Not Available";
  return `${currency || ""} ${amount}`;
};

export const formatDate = (date: string | undefined): string => {
  if (!date) return "Not Available";
  return date;
};

export const formatOtherCounterparties = (
  counterparties: { _new_company: { name: string } }[] | undefined
): string => {
  if (!counterparties || counterparties.length === 0) return "Not Available";
  return counterparties
    .map((cp) => cp._new_company?.name)
    .filter(Boolean)
    .join(", ");
};

export const formatAdvisors = (
  advisors: { _new_company: { name: string } }[] | undefined
): string => {
  if (!advisors || advisors.length === 0) return "Not Available";
  return advisors
    .map((advisor) => advisor._new_company?.name)
    .filter(Boolean)
    .join(", ");
};

export const getPaginationInfo = (
  currentPage: number,
  totalPages: number,
  totalItems: number,
  perPage: number
) => {
  const start = (currentPage - 1) * perPage + 1;
  const end = Math.min(currentPage * perPage, totalItems);

  return {
    start,
    end,
    total: totalItems,
    currentPage,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
};
