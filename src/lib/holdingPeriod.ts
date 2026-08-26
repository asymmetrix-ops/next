/**
 * Shared types + helpers for the "Holding Period" feature.
 * See API reference: investors/{id}/holding-periods, investors/{id}/holding-period-average,
 * companies/{id}/holding-period.
 *
 * IMPORTANT: `display` (and the other pre-formatted strings) is always the source of
 * truth — computed server-side with correct calendar math. Never reformat client-side.
 */

export type HoldingPeriodStatus = "current" | "past";

export interface HoldingPeriodItem {
  id: number;
  new_company_id: number;
  investor_id: number;
  company_name?: string;
  investor_name?: string;
  acquisition_event_id: number | null;
  exit_event_id: number | null;
  acquisition_date: string | null;
  exit_date: string | null;
  status: HoldingPeriodStatus;
  holding_years: number;
  holding_months: number;
  holding_days: number;
  display: string;
  headcount_at_acquisition: number | null;
  headcount_current: number | null;
  headcount_growth_pct: number | null;
  revenue_at_acquisition_m: number | null;
  revenue_current_m: number | null;
  revenue_growth_pct: number | null;
}

export interface InvestorHoldingPeriodsResponse {
  items: HoldingPeriodItem[];
  total: number;
  page: number;
  per_page: number;
}

export interface InvestorHoldingPeriodAverageResponse {
  display: string | null;
  completed_exits: number;
  low_sample_size: boolean;
}

export interface CompanyHoldingPeriodResponse {
  has_holding_period: boolean;
  primary: HoldingPeriodItem | null;
  others: HoldingPeriodItem[];
}

export const HOLDING_PERIOD_EMPTY_DISPLAY = "—";

/** Percent growth fields are `null` on `"past"` rows or when data is patchy — render as em dash, not 0%. */
export function formatGrowthPct(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return HOLDING_PERIOD_EMPTY_DISPLAY;
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function formatHoldingPeriodDisplay(
  item: Pick<HoldingPeriodItem, "display"> | null | undefined
): string {
  const display = item?.display?.trim();
  return display ? display : HOLDING_PERIOD_EMPTY_DISPLAY;
}

/**
 * `"0 months"` means the acquisition was so recent there's no meaningful holding
 * period to show yet — treat it the same as missing data (render `—` / hide the row),
 * not as a real "0 months" figure.
 */
export function isZeroHoldingPeriodDisplay(
  display: string | null | undefined
): boolean {
  if (!display) return false;
  return /^0\s+months?$/i.test(display.trim());
}

/** Returns a display string, or `null` when the value is empty or a "0 months" holding period. */
export function normalizeHoldingPeriodDisplay(
  display: string | null | undefined
): string | null {
  const trimmed = display?.trim();
  if (!trimmed) return null;
  if (isZeroHoldingPeriodDisplay(trimmed)) return null;
  return trimmed;
}

/**
 * Get_new_companies `hp2.status` is `"current" | "past"`.
 * Portfolio Investment status column labels match the Active / Inactive tabs.
 */
export function formatHoldingPeriodStatusLabel(raw: unknown): string {
  if (raw == null || raw === "") return HOLDING_PERIOD_EMPTY_DISPLAY;
  const normalized = String(raw).trim().toLowerCase();
  if (normalized === "current" || normalized === "active") return "Active";
  if (normalized === "past" ||
    normalized === "inactive" ||
    normalized === "inactive/exited" ||
    normalized === "inactive / exited"
  ) {
    return "Inactive / Exited";
  }
  return HOLDING_PERIOD_EMPTY_DISPLAY;
}
