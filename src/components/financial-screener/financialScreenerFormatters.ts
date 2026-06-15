import type { FinancialScreenerItem } from "@/app/financials/actions";
import { EMPTY_DISPLAY } from "@/lib/emptyDisplay";
import {
  formatMultipleValue,
  formatPercentValue,
} from "@/lib/companyTableData";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  GBP: "£",
  EUR: "€",
  JPY: "¥",
  AUD: "A$",
};

function parseMillionsValue(value: unknown): number | null {
  if (value == null || value === "") return null;
  const num =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(num) ? num : null;
}

function getCurrencySymbol(currency?: string | null): string {
  const code = currency?.trim().toUpperCase() || "USD";
  return CURRENCY_SYMBOLS[code] ?? "$";
}

/** Format API millions values as $680m, $16.6b, etc. */
export function formatScreenerCurrency(
  value: unknown,
  currency?: string | null
): string {
  const num = parseMillionsValue(value);
  if (num == null) return EMPTY_DISPLAY;

  const sym = getCurrencySymbol(currency);
  const abs = Math.abs(num);

  if (abs >= 1000) {
    const billions = num / 1000;
    const decimals = billions % 1 === 0 ? 0 : 1;
    return `${sym}${billions.toFixed(decimals)}b`;
  }

  if (abs % 1 === 0) {
    return `${sym}${Math.round(num).toLocaleString("en-US")}m`;
  }

  return `${sym}${num.toLocaleString("en-US", { maximumFractionDigits: 1 })}m`;
}

export function formatScreenerSectorList(
  sectors: FinancialScreenerItem["primary_sectors"]
): string {
  if (!Array.isArray(sectors) || sectors.length === 0) return EMPTY_DISPLAY;
  const names = sectors
    .map((s) => s.sector_name?.trim())
    .filter(Boolean);
  if (names.length === 0) return EMPTY_DISPLAY;
  return names[0] + (names.length > 1 ? ` + ${names.length - 1}` : "");
}

export function formatScreenerSubSectorList(
  sectors: FinancialScreenerItem["secondary_sectors"]
): string {
  if (!Array.isArray(sectors) || sectors.length === 0) return EMPTY_DISPLAY;
  const names = sectors
    .map((s) => s.sector_name?.trim())
    .filter(Boolean);
  return names.length > 0 ? names.join(", ") : EMPTY_DISPLAY;
}

export function formatScreenerHq(item: FinancialScreenerItem): string {
  const country = item.location?.country?.trim();
  const city = item.location?.city?.trim();
  if (country && city) return `${city}, ${country}`;
  return country || city || EMPTY_DISPLAY;
}

export function getScreenerCellValue(
  item: FinancialScreenerItem,
  columnKey: string
): string {
  const fin = item.financials ?? {};
  switch (columnKey) {
    case "company":
      return item.name?.trim() || EMPTY_DISPLAY;
    case "description":
      return item.description?.trim() || EMPTY_DISPLAY;
    case "url":
      return item.url?.trim() || EMPTY_DISPLAY;
    case "sector":
      return formatScreenerSectorList(item.primary_sectors);
    case "sub_sector":
      return formatScreenerSubSectorList(item.secondary_sectors);
    case "ownership":
      return item.ownership_type?.trim() || EMPTY_DISPLAY;
    case "fte":
      return item.fte != null ? item.fte.toLocaleString() : EMPTY_DISPLAY;
    case "hq":
      return formatScreenerHq(item);
    case "financial_year":
      return item.financial_year != null
        ? String(item.financial_year)
        : EMPTY_DISPLAY;
    case "revenue":
      return formatScreenerCurrency(fin.revenue_m, fin.revenue_currency);
    case "revenue_growth":
      return formatPercentValue(fin.rev_growth_pct);
    case "ebitda":
      return formatScreenerCurrency(fin.ebitda_m, fin.revenue_currency);
    case "ebitda_margin":
      return formatPercentValue(fin.ebitda_margin_pct);
    case "ebit":
      return formatScreenerCurrency(fin.ebit_m, fin.revenue_currency);
    case "ev":
      return formatScreenerCurrency(fin.ev_m, fin.ev_currency);
    case "ev_revenue":
      return formatMultipleValue(fin.ev_revenue);
    case "ev_ebit":
      return formatMultipleValue(fin.ev_ebit);
    case "ev_ebitda":
      return formatMultipleValue(fin.ev_ebitda);
    case "rev_multiple":
      return formatMultipleValue(fin.rev_multiple);
    default:
      return EMPTY_DISPLAY;
  }
}

export function getOwnershipPillStyle(ownership: string | undefined): {
  background: string;
  color: string;
} {
  const normalized = ownership?.toLowerCase() ?? "";
  if (normalized.includes("public")) {
    return { background: "#ede9fe", color: "#6d28d9" };
  }
  if (normalized.includes("private equity") || normalized === "pe-owned") {
    return { background: "#e0f2fe", color: "#0369a1" };
  }
  if (normalized.includes("venture")) {
    return { background: "#fef3c7", color: "#b45309" };
  }
  if (normalized.includes("private")) {
    return { background: "#f1f5f9", color: "#475569" };
  }
  return { background: "#f1f5f9", color: "#475569" };
}
