"use server";

import { cookies } from "next/headers";
import type {
  CompanyHoldingPeriodResponse,
  HoldingPeriodItem,
} from "@/lib/holdingPeriod";
import { fetchInvestorPortfolioIdsServer } from "@/app/investors/[id]/portfolioActions";

const HOLDING_PERIOD_API_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:OWf5rLk9:develop";

async function getServerToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("asymmetrix_auth_token")?.value ?? null;
}

function parseDateSafe(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Choose the "primary" holding-period row for the Overview Card when a
 * company has been held by more than one investor:
 *  1. Prefer the oldest acquisition (earliest `acquisition_date`) — i.e. the
 *     longest-standing holder.
 *  2. If several investors share the exact same acquisition date, prefer the
 *     investor with the largest total portfolio (most companies).
 * Falls back to the first candidate when acquisition dates are missing.
 */
async function pickPrimaryHoldingPeriod(
  candidates: HoldingPeriodItem[]
): Promise<HoldingPeriodItem | null> {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const withDates = candidates
    .map((item) => ({ item, ts: parseDateSafe(item.acquisition_date) }))
    .filter(
      (entry): entry is { item: HoldingPeriodItem; ts: number } =>
        entry.ts !== null
    );

  if (withDates.length === 0) return candidates[0];

  const oldestTs = Math.min(...withDates.map((entry) => entry.ts));
  const oldest = withDates
    .filter((entry) => entry.ts === oldestTs)
    .map((entry) => entry.item);

  if (oldest.length === 1) return oldest[0];

  // Tie on acquisition date — the investor with the most portfolio companies wins.
  const withCounts = await Promise.all(
    oldest.map(async (item) => {
      const portfolio = await fetchInvestorPortfolioIdsServer(
        item.investor_id
      ).catch(() => null);
      return { item, count: portfolio?.count_total ?? 0 };
    })
  );
  withCounts.sort((a, b) => b.count - a.count);
  return withCounts[0]?.item ?? oldest[0];
}

async function resolveHoldingPeriodPrimary(
  data: CompanyHoldingPeriodResponse
): Promise<CompanyHoldingPeriodResponse> {
  const seen = new Set<number>();
  const candidates: HoldingPeriodItem[] = [];
  for (const item of [data.primary, ...(data.others ?? [])]) {
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    candidates.push(item);
  }

  const chosen = await pickPrimaryHoldingPeriod(candidates);
  if (!chosen || chosen.id === data.primary?.id) return data;

  return {
    ...data,
    primary: chosen,
    others: candidates.filter((item) => item.id !== chosen.id),
  };
}

export async function fetchCompanyHoldingPeriodServer(
  companyId: string | number
): Promise<CompanyHoldingPeriodResponse | null> {
  try {
    const token = await getServerToken();
    if (!token) return null;

    const response = await fetch(
      `${HOLDING_PERIOD_API_BASE}/companies/${companyId}/holding-period`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      console.error(
        "fetchCompanyHoldingPeriodServer failed:",
        response.status,
        await response.text().catch(() => "")
      );
      return null;
    }

    const data = (await response.json()) as CompanyHoldingPeriodResponse;
    return resolveHoldingPeriodPrimary(data);
  } catch (error) {
    console.error("fetchCompanyHoldingPeriodServer error:", error);
    return null;
  }
}
