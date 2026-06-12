export const TIME_SINCE_LAST_INVESTMENT_EMPTY = "—";

export type TimeSinceLastInvestmentValue = {
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

export function formatTimeSinceLastInvestmentDisplay(
  data: TimeSinceLastInvestmentValue | null | undefined
): string {
  if (!data) return TIME_SINCE_LAST_INVESTMENT_EMPTY;

  if (
    typeof data.total_months === "number" &&
    Number.isFinite(data.total_months)
  ) {
    return formatYearsAndMonths(data.total_months);
  }

  const raw = String(data.time_since_last_investment ?? "").trim();
  if (!raw) return TIME_SINCE_LAST_INVESTMENT_EMPTY;

  return parseApiTimeString(raw) ?? raw;
}

function hasQualifyingInvestmentData(
  value: TimeSinceLastInvestmentValue
): boolean {
  const hasDate =
    typeof value.last_investment_date === "string" &&
    value.last_investment_date.trim().length > 0;
  const hasMonths =
    typeof value.total_months === "number" &&
    Number.isFinite(value.total_months);
  const hasText =
    typeof value.time_since_last_investment === "string" &&
    value.time_since_last_investment.trim().length > 0;

  return hasDate || hasMonths || hasText;
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
