import { cookies } from "next/headers";
import { Redis } from "@upstash/redis";
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
import { DEAL_RADAR_CACHE_KEY } from "@/lib/deal-radar-cache-key";

const XANO_DEAL_RADAR_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:5YnK3rYr/get_deal_radar";

export type ServerDealRadarResult = {
  items: DealRadarItem[];
  nextOffset: number | null;
};

function getRedisClient(): Redis | null {
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return Redis.fromEnv();
  }
  return null;
}

function getDefaultTtlSeconds(): number {
  return Math.min(
    Math.max(Number(process.env.DEAL_RADAR_INITIAL_TTL_SECONDS ?? 26 * 60 * 60), 60),
    7 * 24 * 60 * 60
  );
}

function isDefaultPage(limit: number, offset: number): boolean {
  return limit === 25 && offset === 0;
}

async function fetchDealRadarFromXano(
  token: string,
  limit: number,
  offset: number
): Promise<DealRadarListResponse> {
  const url = new URL(XANO_DEAL_RADAR_URL);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Data-Source": "live",
      Authorization: `Bearer ${token}`,
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

/** Fetch deal radar with Redis cache for the default first page. */
export async function fetchDealRadarRaw(params: {
  limit: number;
  offset: number;
  token: string;
}): Promise<DealRadarListResponse> {
  const { limit, offset, token } = params;
  const redis = getRedisClient();

  if (redis && isDefaultPage(limit, offset)) {
    try {
      const cached = await redis.get<DealRadarListResponse>(DEAL_RADAR_CACHE_KEY);
      if (cached != null) {
        console.log("[DEAL RADAR] Cache HIT (default page)");
        return cached;
      }
    } catch (error) {
      console.warn("[DEAL RADAR] Redis read failed:", error);
    }
  }

  const result = await fetchDealRadarFromXano(token, limit, offset);

  if (redis && isDefaultPage(limit, offset)) {
    try {
      await redis.set(DEAL_RADAR_CACHE_KEY, result as never, {
        ex: getDefaultTtlSeconds(),
      });
    } catch (error) {
      console.warn("[DEAL RADAR] Redis write failed:", error);
    }
  }

  return result;
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

/** Write default page to Redis (cron warm). */
export async function warmDealRadarCache(token: string): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  const result = await fetchDealRadarFromXano(token, 25, 0);
  await redis.set(DEAL_RADAR_CACHE_KEY, result as never, {
    ex: getDefaultTtlSeconds(),
  });
  return true;
}
