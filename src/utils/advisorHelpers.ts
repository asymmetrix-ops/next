import { AdvisedSector, CorporateEvent } from "../types/advisor";

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

  if (numValue >= 1000) {
    return `${symbol}${(numValue / 1000).toFixed(1)}B`;
  } else {
    return `${symbol}${numValue}M`;
  }
};

export const formatDate = (dateString: string): string => {
  if (dateString === "1900-01-01") return "Not available";

  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const formatSectorsList = (sectors: AdvisedSector[]): string => {
  return sectors.map((sector) => sector.sector_name).join(", ");
};

export const getCounterpartyRole = (event: CorporateEvent): string => {
  const advised = event._counterparty_advised_of_corporate_events[0];
  return advised?._counterpartys_type?.counterparty_status || "Unknown";
};

export const getOtherAdvisorsText = (advisors: unknown[]): string => {
  if (advisors.length === 0) return "None";
  return advisors
    .map((advisor) => {
      const advisorObj = advisor as { _new_company: { name: string } };
      return advisorObj._new_company.name;
    })
    .join(", ");
};
