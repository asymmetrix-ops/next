"use server";

import { cookies } from "next/headers";
import { readPlatformCurrencyIdServer } from "@/lib/platformCurrencyServer";
import type {
  CorporateEventTransactionComp,
  TransactionCompsOption,
  TransactionCompsOptionType,
  TransactionCompsQuery,
  TransactionCompsResponse,
} from "@/components/transaction-comps/transactionCompsTypes";

const TRANSACTION_COMPS_API_BASE =
  "https://xdil-abvj-o7rq.e2.xano.io/api:lqZy8LiD";

function buildParams(q: TransactionCompsQuery): URLSearchParams {
  const params = new URLSearchParams();
  params.set("page", String(Math.max(1, q.page)));
  params.set("per_page", String(q.perPage));
  params.set("sort_by", q.sortBy);
  params.set("sort_dir", q.sortDir);
  if (q.searchText.trim()) params.set("search", q.searchText.trim());
  // Only send bounds the user set: the API treats 0 as a real value.
  for (const [stem, r] of Object.entries(q.ranges)) {
    if (r.min !== undefined) params.set(`${stem}_min`, String(r.min));
    if (r.max !== undefined) params.set(`${stem}_max`, String(r.max));
  }
  if (q.dealDateFrom) params.set("deal_date_from", q.dealDateFrom);
  if (q.dealDateTo) params.set("deal_date_to", q.dealDateTo);
  // Transaction comps are completed deals only (no UI filter for this).
  params.set("deal_statuses", "Completed");
  const lists: [string, (string | number)[]][] = [
    ["sector_ids", q.sectorIds],
    ["secondary_sector_ids", q.secondarySectorIds],
    ["countries", q.countries],
    ["ownership_ids", q.ownershipIds],
    ["deal_types", q.dealTypes],
    ["ev_source_types", q.evSourceTypes],
    ["acquirer_ids", q.acquirerIds],
    ["ce_ids", q.ceIds],
    ["ids", q.ids],
  ];
  for (const [name, values] of lists) {
    if (values.length > 0) params.set(name, values.join(","));
  }
  return params;
}

export async function fetchTransactionCompsServer(
  query: TransactionCompsQuery
): Promise<TransactionCompsResponse | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("asymmetrix_auth_token")?.value;
    if (!token) return null;

    const params = buildParams(query);
    params.set("preferred_currency_id", String(await readPlatformCurrencyIdServer()));
    const response = await fetch(
      `${TRANSACTION_COMPS_API_BASE}/transaction_comps?${params.toString()}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    );
    if (!response.ok) {
      console.error(
        `Transaction comps API failed (${response.status}):`,
        await response.text().catch(() => response.statusText)
      );
      return null;
    }
    const raw = (await response.json()) as Partial<TransactionCompsResponse>;
    const items = Array.isArray(raw.items) ? raw.items : [];
    return {
      total: Number(raw.total) || items.length,
      page: Number(raw.page) || query.page,
      per_page: Number(raw.per_page) || query.perPage,
      items,
    };
  } catch (error) {
    console.error("fetchTransactionCompsServer error:", error);
    return null;
  }
}

export async function fetchTransactionCompsOptionsServer(
  type: TransactionCompsOptionType,
  q = "",
  limit = 1000,
  /** For `secondary_sector`: restrict to secondary sectors under these primary sectors. */
  sectorIds: number[] = []
): Promise<TransactionCompsOption[]> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("asymmetrix_auth_token")?.value;
    if (!token) return [];
    const params = new URLSearchParams({ type, q, limit: String(limit) });
    if (sectorIds.length > 0) params.set("sector_ids", sectorIds.join(","));
    const response = await fetch(
      `${TRANSACTION_COMPS_API_BASE}/transaction_comps/options?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    );
    if (!response.ok) return [];
    const raw = (await response.json()) as unknown;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((o) => o as Partial<TransactionCompsOption>)
      .filter((o): o is TransactionCompsOption => Number.isFinite(Number(o.id)) && typeof o.label === "string")
      .map((o) => ({ id: Number(o.id), label: o.label }));
  } catch (error) {
    console.error("fetchTransactionCompsOptionsServer error:", error);
    return [];
  }
}

export async function fetchCorporateEventTransactionCompsServer(
  ceId: number
): Promise<CorporateEventTransactionComp[]> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("asymmetrix_auth_token")?.value;
    if (!token) return [];
    const response = await fetch(
      `${TRANSACTION_COMPS_API_BASE}/corporate_event_transaction_comps?ce_id=${encodeURIComponent(String(ceId))}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    );
    if (!response.ok) return [];
    const raw = (await response.json()) as { items?: CorporateEventTransactionComp[] };
    return Array.isArray(raw.items) ? raw.items : [];
  } catch (error) {
    console.error("fetchCorporateEventTransactionCompsServer error:", error);
    return [];
  }
}
