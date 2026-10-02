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

function formatMonthsAsHoldingDisplay(totalMonths: number): string | null {
  if (!Number.isFinite(totalMonths) || totalMonths < 1) return null;
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years === 1 ? "" : "s"}`);
  if (months > 0) parts.push(`${months} month${months === 1 ? "" : "s"}`);
  return parts.join(" ");
}

/**
 * Fallback for when `holding-period-average` has no value (it is exit-based and comes back
 * empty for investors with no completed exits): average the active holdings by taking the
 * mean first-investment date and measuring calendar months from it to `now`.
 */
export function computeActiveHoldingPeriodAverage(
  items: Pick<HoldingPeriodItem, "status" | "acquisition_date">[],
  now: Date = new Date()
): InvestorHoldingPeriodAverageResponse | null {
  const times = items
    .filter((i) => i.status === "current" && i.acquisition_date)
    .map((i) => new Date(i.acquisition_date as string).getTime())
    .filter((t) => Number.isFinite(t) && t <= now.getTime());
  if (times.length === 0) return null;

  const mean = new Date(times.reduce((a, b) => a + b, 0) / times.length);
  let months =
    (now.getFullYear() - mean.getFullYear()) * 12 + (now.getMonth() - mean.getMonth());
  if (now.getDate() < mean.getDate()) months -= 1;

  const display = formatMonthsAsHoldingDisplay(months);
  if (!display) return null;
  return { display, completed_exits: 0, low_sample_size: times.length < 3 };
}
