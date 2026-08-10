"use server";

import { cookies } from "next/headers";
import { appendPreferredCurrencyIdToSearchParams } from "@/lib/platformCurrency";
import { readPlatformCurrencyIdServer } from "@/lib/platformCurrencyServer";

const INVESTOR_API_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm:develop";

export interface InvestorPortfolioIdsResponse {
  all_ids: number[];
  current_ids: number[];
  past_ids: number[];
  count_current: number;
  count_past: number;
  count_total: number;
}

export interface PortfolioHeadstatTile {
  value: number | null;
  display: string | number;
  n_companies: number;
  low_sample?: boolean;
}

export interface InvestorPortfolioHeadstatsResponse {
  n_companies_in_scope: number;
  preferred_currency_id?: number;
  median_revenue_m: PortfolioHeadstatTile;
  median_ebitda_m: PortfolioHeadstatTile;
  median_fte: PortfolioHeadstatTile;
}

async function getServerToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("asymmetrix_auth_token")?.value ?? null;
}

export async function fetchInvestorPortfolioIdsServer(
  newCompId: string | number
): Promise<InvestorPortfolioIdsResponse | null> {
  try {
    const token = await getServerToken();
    if (!token) return null;

    const params = new URLSearchParams();
    params.append("new_comp_id", String(newCompId));

    const response = await fetch(
      `${INVESTOR_API_BASE}/get_investor_portfolio_ids?${params.toString()}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error(
        "fetchInvestorPortfolioIdsServer failed:",
        response.status,
        await response.text().catch(() => "")
      );
      return null;
    }

    return (await response.json()) as InvestorPortfolioIdsResponse;
  } catch (error) {
    console.error("fetchInvestorPortfolioIdsServer error:", error);
    return null;
  }
}

export async function fetchInvestorPortfolioHeadstatsServer(args: {
  currentIds: number[];
  filtersSql?: string | null;
  preferredCurrencyId?: number | null;
}): Promise<InvestorPortfolioHeadstatsResponse | null> {
  try {
    const token = await getServerToken();
    if (!token) return null;

    const preferredCurrencyId =
      args.preferredCurrencyId ?? (await readPlatformCurrencyIdServer());

    const params = new URLSearchParams();
    params.append("current_ids", JSON.stringify(args.currentIds));
    if (args.filtersSql?.trim()) {
      params.append("filters_sql", args.filtersSql.trim());
    }
    appendPreferredCurrencyIdToSearchParams(params, preferredCurrencyId);

    const response = await fetch(
      `${INVESTOR_API_BASE}/get_investor_portfolio_headstats?${params.toString()}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error(
        "fetchInvestorPortfolioHeadstatsServer failed:",
        response.status,
        await response.text().catch(() => "")
      );
      return null;
    }

    return (await response.json()) as InvestorPortfolioHeadstatsResponse;
  } catch (error) {
    console.error("fetchInvestorPortfolioHeadstatsServer error:", error);
    return null;
  }
}
