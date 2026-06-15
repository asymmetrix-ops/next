export const TIME_SINCE_LAST_INVESTMENT_EMPTY = "—";

export type TimeSinceLastInvestmentValue = {
  id?: number | null;
  created_at?: number | null;
  new_company_id?: number | null;
  display?: string | null;
  date?: string | null;
  days_since?: number | string | null;
  // Legacy response fields
  time_since_last_investment?: string | null;
  last_investment_date?: string | null;
  corporate_event_id?: number | null;
  total_months?: number | null;
};

type TimeSinceLastInvestmentResponse = {
  value?: TimeSinceLastInvestmentValue | null;
};

const ENDPOINT =
  "https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/get_time_since_last_investment";

const MS_PER_DAY = 86_400_000;

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

/** Format a month count as "X years Y months" with singular/plural handling. */
export function formatYearsAndMonths(totalMonths: number): string {
  const total = Math.max(0, Math.floor(totalMonths));
  const years = Math.floor(total / 12);
  const months = total % 12;

  if (years > 0) {
    const yearPart = `${years} ${years === 1 ? "year" : "years"}`;
    const monthPart = `${months} ${months === 1 ? "month" : "months"}`;
    return `${yearPart} ${monthPart}`;
  }

  if (months > 0) {
    return `${months} ${months === 1 ? "month" : "months"}`;
  }

  return "0 months";
}

function parseApiTimeString(raw: string): string | null {
  const combined = raw.match(/(\d+)\s*years?\s+(\d+)\s*months?/i);
  if (combined) {
    const years = Number.parseInt(combined[1], 10);
    const months = Number.parseInt(combined[2], 10);
    if (Number.isFinite(years) && Number.isFinite(months)) {
      return formatYearsAndMonths(years * 12 + months);
    }
  }

  const yearOnly = raw.match(/^(\d+)\s*years?$/i);
  if (yearOnly) {
    const years = Number.parseInt(yearOnly[1], 10);
    if (Number.isFinite(years)) return formatYearsAndMonths(years * 12);
  }

  const monthOnly = raw.match(/^(\d+)\s*months?$/i);
  if (monthOnly) {
    const months = Number.parseInt(monthOnly[1], 10);
    if (Number.isFinite(months)) return formatYearsAndMonths(months);
  }

  return null;
}

function formatFromDaysSince(daysSince: number): string {
  const days = Math.max(0, Math.floor(daysSince));
  if (days < 30) return "This month";
  return formatYearsAndMonths(Math.floor(days / 30));
}

function resolveDaysSince(data: TimeSinceLastInvestmentValue): number | undefined {
  const fromField = toFiniteNumber(data.days_since);
  if (fromField !== undefined) return fromField;

  const dateStr = String(data.date ?? data.last_investment_date ?? "").trim();
  if (!dateStr) return undefined;

  const investmentDate = new Date(dateStr);
  if (Number.isNaN(investmentDate.getTime())) return undefined;

  return Math.max(
    0,
    Math.floor((Date.now() - investmentDate.getTime()) / MS_PER_DAY)
  );
}

export function formatTimeSinceLastInvestmentDisplay(
  data: TimeSinceLastInvestmentValue | null | undefined
): string {
  if (!data) return TIME_SINCE_LAST_INVESTMENT_EMPTY;

  const display = String(data.display ?? "").trim();
  if (display) {
    return parseApiTimeString(display) ?? display;
  }

  if (
    typeof data.total_months === "number" &&
    Number.isFinite(data.total_months)
  ) {
    return formatYearsAndMonths(data.total_months);
  }

  const legacyText = String(data.time_since_last_investment ?? "").trim();
  if (legacyText) {
    return parseApiTimeString(legacyText) ?? legacyText;
  }

  const daysSince = resolveDaysSince(data);
  if (daysSince !== undefined) {
    return formatFromDaysSince(daysSince);
  }

  return TIME_SINCE_LAST_INVESTMENT_EMPTY;
}

function hasQualifyingInvestmentData(
  value: TimeSinceLastInvestmentValue
): boolean {
  const display = String(value.display ?? "").trim();
  if (display) return true;

  if (toFiniteNumber(value.days_since) !== undefined) return true;

  const date = String(value.date ?? value.last_investment_date ?? "").trim();
  if (date) return true;

  if (
    typeof value.total_months === "number" &&
    Number.isFinite(value.total_months)
  ) {
    return true;
  }

  const legacyText = String(value.time_since_last_investment ?? "").trim();
  return legacyText.length > 0;
}

export async function fetchTimeSinceLastInvestment(
  newCompanyId: string | number
): Promise<TimeSinceLastInvestmentValue | null> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("asymmetrix_auth_token")
      : null;
  if (!token) return null;

  const params = new URLSearchParams({
    new_company_id: String(newCompanyId),
  });

  const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    credentials: "include",
  });

  if (!res.ok) return null;

  const data = (await res.json()) as TimeSinceLastInvestmentResponse;
  const value = data?.value;
  if (!value || typeof value !== "object") return null;
  if (!hasQualifyingInvestmentData(value)) return null;

  return value;
}
