/**
 * Shared client for Xano `get_company_table_data` (article Generate Table, Companies Search).
 */

import { appendMetricCurrency } from "@/lib/buildFinancialMetricsSections";
import type { CompanyColumnType } from "@/components/companies/companiesColumnCategories";
import { EMPTY_DISPLAY, normalizeEmptyDisplay, isEmptyDisplayValue } from "@/lib/emptyDisplay";

export const COMPANY_TABLE_DATA_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/get_company_table_data";

/** Columns rendered from Companies Search results only (no table-data fetch). */
export const SEARCH_ONLY_COLUMN_KEYS = new Set([
  "logo",
  "name",
  "description",
  "primary_sectors",
  "secondary_sectors",
]);

export function selectedColumnsNeedTableData(columnKeys: string[]): boolean {
  return columnKeys.some((key) => !SEARCH_ONLY_COLUMN_KEYS.has(key));
}

const toPlainText = (value: unknown): string => {
  if (value == null || value === "") return EMPTY_DISPLAY;
  if (typeof value === "number")
    return Number.isFinite(value) ? value.toLocaleString() : EMPTY_DISPLAY;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") return normalizeEmptyDisplay(value);
  if (Array.isArray(value)) {
    const text = value
      .map((item) => {
        if (typeof item === "string" || typeof item === "number") return String(item);
        if (item && typeof item === "object") {
          const rec = item as Record<string, unknown>;
          return (
            rec.name ??
            rec.sector_name ??
            rec.investor_name ??
            rec.Product_Type ??
            rec.Data_Collection_Method ??
            rec.Revenue_Model_ ??
            ""
          );
        }
        return "";
      })
      .map((item) => String(item).trim())
      .filter(Boolean)
      .join(", ");
    return text || EMPTY_DISPLAY;
  }
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    const preferred =
      rec.name ??
      rec.ownership ??
      rec.sector_name ??
      rec.City ??
      rec.Country ??
      rec.Currency ??
      rec.display ??
      rec.label;
    if (preferred != null) return toPlainText(preferred);
    return EMPTY_DISPLAY;
  }
  return String(value);
};

export const formatPlainNumber = (value: unknown): string => {
  if (value == null || value === "") return EMPTY_DISPLAY;
  const num =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(num)) return toPlainText(value);
  return num.toLocaleString("en-US", {
    maximumFractionDigits: Math.abs(num) >= 100 ? 0 : 1,
  });
};

export const formatPercentValue = (value: unknown): string => {
  if (value == null || value === "") return EMPTY_DISPLAY;
  const num =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(num)) return toPlainText(value);
  const pct = Math.abs(num) <= 1 ? num * 100 : num;
  const decimals = Math.abs(pct) % 1 === 0 ? 0 : 1;
  return `${pct.toFixed(decimals)}%`;
};

/** LinkedIn YoY growth is stored as percent points (0.7 = 0.7%), not a decimal fraction. */
export const formatLinkedInGrowthPercentValue = (value: unknown): string => {
  if (value == null || value === "") return EMPTY_DISPLAY;
  const num =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(num)) return toPlainText(value);
  const rounded = Math.round(num * 10) / 10;
  const decimals = Math.abs(rounded) % 1 === 0 ? 0 : 1;
  return `${rounded.toFixed(decimals)}%`;
};

export const formatMultipleValue = (value: unknown): string => {
  if (value == null || value === "") return EMPTY_DISPLAY;
  const num =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(num)) return toPlainText(value);
  return `${num.toFixed(1)}x`;
};

const DEFAULT_METRIC_CURRENCY = "USD";

const isEmptyMetricValue = (value: unknown): boolean => {
  if (value == null || value === "") return true;
  if (typeof value === "string" && isEmptyDisplayValue(value)) return true;
  return false;
};

export function formatNrrValue(value: unknown): string {
  if (isEmptyMetricValue(value)) return EMPTY_DISPLAY;
  const str = String(value).trim();
  if (str.includes("%")) {
    const num = Number(str.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(num) && Math.abs(num) > 1000) {
      const normalized = num / 100;
      const decimals = Math.abs(normalized) % 1 === 0 ? 0 : 1;
      return `${normalized.toFixed(decimals)}%`;
    }
    return normalizeEmptyDisplay(str);
  }
  return formatPercentValue(value);
}

export function formatMetricMillions(value: unknown): string {
  if (isEmptyMetricValue(value)) return EMPTY_DISPLAY;
  return appendMetricCurrency(formatPlainNumber(value), DEFAULT_METRIC_CURRENCY);
}

export function formatMetricCurrency(value: unknown): string {
  if (isEmptyMetricValue(value)) return EMPTY_DISPLAY;
  const num =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(num)) return toPlainText(value);
  const formatted = Math.round(num).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  });
  return appendMetricCurrency(formatted, DEFAULT_METRIC_CURRENCY);
}

export function formatWholeNumberValue(value: unknown): string {
  if (isEmptyMetricValue(value)) return EMPTY_DISPLAY;
  const num =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(num)) return toPlainText(value);
  return Math.round(num).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function formatYearValue(value: unknown): string {
  if (isEmptyMetricValue(value)) return EMPTY_DISPLAY;
  const num = Number(String(value).replace(/[^0-9.-]/g, ""));
  if (Number.isFinite(num) && num >= 1800 && num <= 2100) {
    return String(Math.round(num));
  }
  return toPlainText(value);
}

const PERCENT_COLUMN_KEYS = new Set([
  "revenue_growth",
  "ebitda_margin",
  "subscription_revenue_pc",
  "churn_pc",
  "grr_pc",
  "nrr",
  "new_client_growth_pc",
  "upsell_pc",
  "cross_sell_pc",
  "price_increase_pc",
  "rev_expansion_pc",
]);

/** Formats a Companies Search cell using the same units as the company profile. */
export function formatCompanyColumnDisplay(
  columnKey: string,
  columnType: CompanyColumnType,
  raw: unknown
): string {
  if (isEmptyMetricValue(raw)) return EMPTY_DISPLAY;

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (/[%x]$/i.test(trimmed)) {
      return normalizeEmptyDisplay(trimmed);
    }
  }

  if (columnKey === "nrr") return formatNrrValue(raw);
  if (columnKey === "linkedin_growth") {
    return formatLinkedInGrowthPercentValue(raw);
  }
  if (columnKey === "years_since_last_investment") return toPlainText(raw);
  if (columnKey === "created_at") {
    if (isEmptyMetricValue(raw)) return EMPTY_DISPLAY;
    const date = new Date(String(raw));
    if (Number.isNaN(date.getTime())) return EMPTY_DISPLAY;
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  if (columnKey === "revenue_multiple") return formatMultipleValue(raw);
  if (columnKey === "rule_of_40") {
    const formatted = formatPlainNumber(raw);
    return formatted === EMPTY_DISPLAY ? formatted : `${formatted}%`;
  }

  if (PERCENT_COLUMN_KEYS.has(columnKey) || columnType === "percent") {
    return formatPercentValue(raw);
  }

  if (
    columnKey === "revenue_m" ||
    columnKey === "ebitda_m" ||
    columnKey === "enterprise_value" ||
    columnKey === "arr_m" ||
    columnKey === "subscription_revenue_m" ||
    columnKey === "ebit_m"
  ) {
    return formatMetricMillions(raw);
  }

  if (columnKey === "rev_per_client" || columnKey === "rev_per_employee") {
    return formatMetricCurrency(raw);
  }

  if (columnType === "currency") {
    return formatMetricMillions(raw);
  }

  if (columnType === "number") {
    if (
      columnKey === "linkedin_members" ||
      columnKey === "no_of_clients" ||
      columnKey === "no_employees"
    ) {
      return formatWholeNumberValue(raw);
    }
    return formatPlainNumber(raw);
  }

  if (columnType === "date") {
    return formatYearValue(raw);
  }

  return toPlainText(raw);
}

const parseMaybeSetLikeList = (value: unknown): string[] => {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.map(toPlainText).filter((item) => item !== EMPTY_DISPLAY);
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .flatMap((item) =>
        item && typeof item === "object" && !Array.isArray(item)
          ? Object.values(item as Record<string, unknown>).map(toPlainText)
          : [toPlainText(item)]
      )
      .filter((item) => item !== EMPTY_DISPLAY);
  }
  const text = toPlainText(value);
  if (text === EMPTY_DISPLAY || text === "{}" || text === "[]") return [];

  try {
    const parsed = JSON.parse(text) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map(toPlainText).filter((item) => item !== EMPTY_DISPLAY);
    }
  } catch {
    // Fall through to set-like string parsing.
  }

  return text
    .replace(/^\{/, "")
    .replace(/\}$/, "")
    .split(",")
    .map((item) => item.replace(/^["']|["']$/g, "").trim())
    .filter(Boolean);
};

const normalizeWebsite = (raw: unknown): string => {
  const text = toPlainText(raw);
  if (text === EMPTY_DISPLAY) return text;
  return /^https?:\/\//i.test(text) ? text : `https://${text}`;
};

/** Normalizes a `get_company_table_data` row (same mapping as article Generate Table). */
export function mapCompanyTableApiRow(
  row: Record<string, unknown>
): Record<string, unknown> {
  const id = Number(row.id) || 0;
  const primarySectors = parseMaybeSetLikeList(row.primary_sector_names).join(", ");
  const secondarySectors = parseMaybeSetLikeList(row.secondary_sector_names).join(", ");
  const investorNames = parseMaybeSetLikeList(row.investor_names).join(", ");
  const hqLocation = [
    toPlainText(row.hq_city),
    toPlainText(row.hq_state),
    toPlainText(row.hq_country),
  ]
    .filter((item) => item !== EMPTY_DISPLAY)
    .join(", ");

  return {
    ...row,
    id,
    name: toPlainText(row.name),
    url: normalizeWebsite(row.url),
    website: normalizeWebsite(row.url),
    loc: hqLocation || EMPTY_DISPLAY,
    hq: hqLocation || EMPTY_DISPLAY,
    city: toPlainText(row.hq_city),
    state: toPlainText(row.hq_state),
    country: toPlainText(row.hq_country),
    year_founded: toPlainText(row.year_founded_label ?? row.year_founded),
    primary_sector_names: primarySectors || EMPTY_DISPLAY,
    secondary_sector_names: secondarySectors || EMPTY_DISPLAY,
    investor_names: investorNames || EMPTY_DISPLAY,
    investors: investorNames || EMPTY_DISPLAY,
    ownership: toPlainText(row.ownership_type ?? row.ownership_status),
    ownership_type: toPlainText(row.ownership_type ?? row.ownership_status),
    linkedin_members: formatPlainNumber(row.linkedin_employee),
    li_emp: formatPlainNumber(row.linkedin_employee),
    li_growth_pc: formatLinkedInGrowthPercentValue(row.linkedin_growth_1y_pct),
    linkedin_growth: formatLinkedInGrowthPercentValue(row.linkedin_growth_1y_pct),
    revenue_m: formatPlainNumber(row.Revenue_m),
    ebitda_m: formatPlainNumber(row.EBITDA_m),
    ebit_m: formatPlainNumber(row.EBIT_m),
    ev: formatPlainNumber(row.EV),
    enterprise_value: formatPlainNumber(row.EV),
    subscription_revenue_pc: formatPercentValue(
      row.Subscription_revenue_pc ?? row.ARR_pc
    ),
    subscription_revenue_m: formatPlainNumber(row.Subscription_revenue_m),
    arr_m: formatPlainNumber(row.ARR_m),
    churn_pc: formatPercentValue(row.Churn_pc),
    grr_pc: formatPercentValue(row.GRR_pc),
    nrr: formatPercentValue(row.NRR),
    upsell_pc: formatPercentValue(row.Upsell_pc),
    cross_sell_pc: formatPercentValue(row.Cross_sell_pc),
    price_increase_pc: formatPercentValue(row.Price_increase_pc),
    rev_expansion_pc: formatPercentValue(row.Rev_expansion_pc),
    new_client_growth_pc: formatPercentValue(row.New_client_growth_pc),
    rev_growth_pc: formatPercentValue(row.Rev_Growth_PC),
    revenue_growth: formatPercentValue(row.Rev_Growth_PC),
    ebitda_margin: formatPercentValue(row.EBITDA_margin),
    rule_of_40: formatPlainNumber(row.Rule_of_40),
    revenue_multiple: formatMultipleValue(row.Revenue_multiple),
    no_of_clients: formatPlainNumber(row.No_of_Clients),
    rev_per_client: formatPlainNumber(row.Rev_per_client),
    no_employees: formatPlainNumber(row.No_Employees),
    rev_per_employee: formatPlainNumber(row.Revenue_per_employee),
    ticker: toPlainText(row.ticker ?? row.Ticker ?? row.stock_ticker),
  };
}

export async function fetchCompanyTableDataByIds(
  companyIds: number[],
  token: string
): Promise<Map<number, Record<string, unknown>>> {
  if (companyIds.length === 0) return new Map();

  const params = new URLSearchParams();
  params.append("company_ids", JSON.stringify(companyIds));

  const response = await fetch(`${COMPANY_TABLE_DATA_URL}?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load company table data: ${response.status}`);
  }

  const payload = (await response.json()) as unknown;
  const items = Array.isArray(payload) ? payload : [];
  const rows = items
    .filter((item) => item && typeof item === "object")
    .map((item) => mapCompanyTableApiRow(item as Record<string, unknown>))
    .filter((row) => Number(row.id) > 0);

  return new Map(rows.map((row) => [Number(row.id), row]));
}
