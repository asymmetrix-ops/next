export type PeriodType =
  | "this_month"
  | "specific_month"
  | "multiple_months"
  | "ytd"
  | "last_year";

export type PeriodFilterState = {
  periodType: PeriodType;
  periodYear: number;
  periodMonth: number;
  periodMonths: number[];
};

export const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function defaultPeriodFilter(): PeriodFilterState {
  const now = new Date();
  return {
    periodType: "this_month",
    periodYear: now.getFullYear(),
    periodMonth: now.getMonth() + 1,
    periodMonths: [now.getMonth() + 1],
  };
}

export function getYearOptions(count = 8): number[] {
  const current = new Date().getFullYear();
  return Array.from({ length: count }, (_, i) => current - i);
}

export function appendPeriodToParams(
  params: URLSearchParams,
  period: PeriodFilterState
): void {
  params.set("period_type", period.periodType);

  if (
    period.periodType === "specific_month" ||
    period.periodType === "multiple_months" ||
    period.periodType === "last_year"
  ) {
    params.set("period_year", String(period.periodYear));
  }

  if (period.periodType === "specific_month") {
    params.set("period_month", String(period.periodMonth));
  }

  if (period.periodType === "multiple_months") {
    period.periodMonths.forEach((month) =>
      params.append("period_months[]", String(month))
    );
  }
}

export function getCurrentYear(): number {
  return new Date().getFullYear();
}

export function getMaxSelectableMonth(year: number): number {
  return year >= getCurrentYear() ? new Date().getMonth() + 1 : 12;
}

export function isMonthSelectable(year: number, month: number): boolean {
  return month <= getMaxSelectableMonth(year);
}

export function clampPeriodMonths(months: number[], year: number): number[] {
  const maxMonth = getMaxSelectableMonth(year);
  const clamped = months.filter((month) => month <= maxMonth);
  return clamped.length > 0 ? clamped : [maxMonth];
}

export function clampPeriodMonth(month: number, year: number): number {
  return Math.min(month, getMaxSelectableMonth(year));
}

export function applyYearConstraints(
  period: PeriodFilterState,
  periodYear: number
): Partial<PeriodFilterState> {
  const patch: Partial<PeriodFilterState> = { periodYear };

  if (period.periodType === "multiple_months") {
    patch.periodMonths = clampPeriodMonths(period.periodMonths, periodYear);
  }

  if (period.periodType === "specific_month") {
    patch.periodMonth = clampPeriodMonth(period.periodMonth, periodYear);
  }

  return patch;
}

export function togglePeriodMonth(
  current: number[],
  month: number
): number[] {
  const next = current.includes(month)
    ? current.filter((m) => m !== month)
    : [...current, month].sort((a, b) => a - b);
  return next.length > 0 ? next : [month];
}
