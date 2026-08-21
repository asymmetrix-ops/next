"use server";

import { cookies } from "next/headers";
import type {
  InvestorHoldingPeriodAverageResponse,
  InvestorHoldingPeriodsResponse,
} from "@/lib/holdingPeriod";

const HOLDING_PERIOD_API_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:OWf5rLk9:develop";

async function getServerToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("asymmetrix_auth_token")?.value ?? null;
}

export interface FetchInvestorHoldingPeriodsArgs {
  investorId: string | number;
  fromDate?: string | null;
  toDate?: string | null;
  sortBy?: "holding_days" | "acquisition_date" | null;
  sortDir?: "asc" | "desc" | null;
  page?: number;
  perPage?: number;
}

export async function fetchInvestorHoldingPeriodsServer(
  args: FetchInvestorHoldingPeriodsArgs
): Promise<InvestorHoldingPeriodsResponse | null> {
  try {
    const token = await getServerToken();
    if (!token) return null;

    const params = new URLSearchParams();
    if (args.fromDate?.trim()) params.append("from_date", args.fromDate.trim());
    if (args.toDate?.trim()) params.append("to_date", args.toDate.trim());
    if (args.sortBy) params.append("sort_by", args.sortBy);
    if (args.sortDir) params.append("sort_dir", args.sortDir);
    params.append("page", String(args.page ?? 1));
    params.append("per_page", String(args.perPage ?? 25));

    const response = await fetch(
      `${HOLDING_PERIOD_API_BASE}/investors/${args.investorId}/holding-periods?${params.toString()}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error(
        "fetchInvestorHoldingPeriodsServer failed:",
        response.status,
        await response.text().catch(() => "")
      );
      return null;
    }

    return (await response.json()) as InvestorHoldingPeriodsResponse;
  } catch (error) {
    console.error("fetchInvestorHoldingPeriodsServer error:", error);
    return null;
  }
}

/** Fetches every holding-period row for an investor (loops pages), for client-side joins. */
export async function fetchAllInvestorHoldingPeriodsServer(
  investorId: string | number
): Promise<InvestorHoldingPeriodsResponse["items"]> {
  const perPage = 200;
  const first = await fetchInvestorHoldingPeriodsServer({
    investorId,
    page: 1,
    perPage,
  });
  if (!first) return [];

  const items = [...first.items];
  const total = first.total ?? items.length;
  let page = 2;
  while (items.length < total) {
    const next = await fetchInvestorHoldingPeriodsServer({
      investorId,
      page,
      perPage,
    });
    if (!next || next.items.length === 0) break;
    items.push(...next.items);
    page += 1;
    if (page > 50) break; // safety cap
  }
  return items;
}

export async function fetchInvestorHoldingPeriodAverageServer(
  investorId: string | number
): Promise<InvestorHoldingPeriodAverageResponse | null> {
  try {
    const token = await getServerToken();
    if (!token) return null;

    const response = await fetch(
      `${HOLDING_PERIOD_API_BASE}/investors/${investorId}/holding-period-average`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error(
        "fetchInvestorHoldingPeriodAverageServer failed:",
        response.status,
        await response.text().catch(() => "")
      );
      return null;
    }

    return (await response.json()) as InvestorHoldingPeriodAverageResponse;
  } catch (error) {
    console.error("fetchInvestorHoldingPeriodAverageServer error:", error);
    return null;
  }
}
