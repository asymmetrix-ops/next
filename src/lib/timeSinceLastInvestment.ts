import { getCompanyLinkedInApiBase } from "@/lib/companyLinkedIn";
import { EMPTY_DISPLAY } from "@/lib/emptyDisplay";

export type TimeSinceLastInvestmentValue = {
  id?: number | null;
  created_at?: number | null;
  new_company_id?: number | null;
  display?: string | null;
  date?: string | null;
  days_since?: number | string | null;
};

type TimeSinceLastInvestmentResponse = {
  value?: TimeSinceLastInvestmentValue | null;
};

export function readTimeSinceLastInvestmentDisplay(
  value: TimeSinceLastInvestmentValue | null | undefined
): string {
  const display = String(value?.display ?? "").trim();
  return display || EMPTY_DISPLAY;
}

export async function fetchTimeSinceLastInvestment(
  newCompanyId: string | number,
  token?: string | null
): Promise<TimeSinceLastInvestmentValue | null> {
  const authToken =
    token ??
    (typeof window !== "undefined"
      ? localStorage.getItem("asymmetrix_auth_token")
      : null);

  if (!authToken) return null;

  const params = new URLSearchParams({
    new_company_id: String(newCompanyId),
  });

  const response = await fetch(
    `${getCompanyLinkedInApiBase()}/get_time_since_last_investment?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: "application/json",
      },
      credentials: "include",
    }
  );

  if (!response.ok) return null;

  const data = (await response.json()) as TimeSinceLastInvestmentResponse;
  const value = data?.value;
  if (!value || typeof value !== "object") return null;

  const display = String(value.display ?? "").trim();
  return display ? value : null;
}
