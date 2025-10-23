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

  // Values are in millions; always present as whole millions with 'M'
  const roundedMillions = Math.round(numValue);
  return `${symbol}${roundedMillions.toLocaleString()}M`;
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

export const getAdvisorYearFoundedDisplay = (advisor: {
  year_founded?: unknown;
  _years?: { Year?: unknown };
}): string => {
  const currentYear = new Date().getFullYear();
  const extract = (candidate: unknown): number | null => {
    if (candidate === null || candidate === undefined) return null;
    if (typeof candidate === "number") {
      const y = candidate;
      return y >= 1800 && y <= currentYear ? y : null;
    }
    const s = String(candidate).trim();
    if (s === "" || s.toLowerCase() === "nan") return null;
    const n = parseInt(s, 10);
    if (Number.isFinite(n) && n >= 1800 && n <= currentYear) return n;
    const m = s.match(/\b(18\d{2}|19\d{2}|20\d{2})\b/);
    if (m) {
      const mNum = parseInt(m[0], 10);
      if (mNum >= 1800 && mNum <= currentYear) return mNum;
    }
    return null;
  };

  const candidates: unknown[] = [advisor.year_founded, advisor._years?.Year];

  for (const c of candidates) {
    const y = extract(c);
    if (y !== null) return String(y);
  }
  return "Not available";
};
