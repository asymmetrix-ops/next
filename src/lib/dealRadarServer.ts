import { cookies } from "next/headers";
import {
  normalizeDealRadarResponse,
  type DealRadarListResponse,
} from "@/lib/dashboardApi";
import {
  applyHqCountryIso2ToDealRadarItems,
  mapDealRadarItem,
  readHqCountryIso2,
  type DealRadarItem,
} from "@/lib/dealRadar";
import { fetchCompanyTableDataByIds } from "@/lib/companyTableData";

const XANO_DEAL_RADAR_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:5YnK3rYr/get_deal_radar";

export type ServerDealRadarResult = {
  items: DealRadarItem[];
  nextOffset: number | null;
};

export async function fetchDealRadarRaw(params: {
  limit: number;
  offset: number;
  token: string;
}): Promise<DealRadarListResponse> {
  const url = new URL(XANO_DEAL_RADAR_URL);
  url.searchParams.set("limit", String(params.limit));
  url.searchParams.set("offset", String(params.offset));

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Data-Source": "live",
      Authorization: `Bearer ${params.token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Deal Radar API failed: ${response.status}`);
  }

  const raw: unknown = await response.json();
  return normalizeDealRadarResponse(raw);
}

async function enrichDealRadarItems(
  items: DealRadarItem[],
  token: string
): Promise<DealRadarItem[]> {
  const missingCompanyIds = items
    .filter((item) => !item.hqCountryIso2 && item.companyId > 0)
    .map((item) => item.companyId);
  if (missingCompanyIds.length === 0) return items;

  try {
    const rows = await fetchCompanyTableDataByIds(missingCompanyIds, token);
    const isoByCompanyId = new Map<number, string | null>(
      Array.from(rows.entries()).map(([companyId, row]) => [
        companyId,
        readHqCountryIso2(row),
      ])
    );
    return applyHqCountryIso2ToDealRadarItems(items, isoByCompanyId);
  } catch (error) {
    console.error("Error enriching Deal Radar country flags:", error);
    return items;
  }
}

export async function fetchDealRadarServer(params: {
  limit: number;
  offset: number;
  token?: string | null;
}): Promise<ServerDealRadarResult | null> {
  const token =
    params.token ?? cookies().get("asymmetrix_auth_token")?.value ?? null;
  if (!token) return null;

  const res = await fetchDealRadarRaw({
    limit: params.limit,
    offset: params.offset,
    token,
  });

  const mappedItems = res.items.map((item) =>
    mapDealRadarItem(item as unknown as Record<string, unknown>)
  );
  const items = await enrichDealRadarItems(mappedItems, token);

  return {
    items,
    nextOffset: res.has_next_page ? res.next_offset : null,
  };
}
