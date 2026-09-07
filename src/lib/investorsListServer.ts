import { cookies } from "next/headers";
import { Redis } from "@upstash/redis";
import { INVESTORS_API_BASE } from "@/lib/investorsApiBase";

const XANO_INVESTORS_LIST_URL = `${INVESTORS_API_BASE}/investors_with_d_a_list`;

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
    Math.max(Number(process.env.INVESTORS_INITIAL_TTL_SECONDS ?? 26 * 60 * 60), 60),
    7 * 24 * 60 * 60
  );
}

export function getInvestorsListCacheKey(page: number, perPage: number): string {
  return `investors:initial:v1:page${page}:per${perPage}`;
}

function isEmptyParam(searchParams: URLSearchParams, key: string): boolean {
  const value = searchParams.get(key);
  return value == null || value.trim() === "";
}

function isDefaultPortfolioOnly(searchParams: URLSearchParams): boolean {
  const value = searchParams.get("portfolio_only");
  return value == null || value === "false" || value === "0";
}

/** True when this matches the cron-warmed default list (page 1, no filters/sort). */
export function isInitialInvestorsListParams(searchParams: URLSearchParams): {
  page: number;
  perPage: number;
  ok: boolean;
} {
  const page = Number(searchParams.get("page") ?? "1");
  const perPage = Number(searchParams.get("per_page") ?? "50");
  const ok =
    page === 1 &&
    perPage === 50 &&
    isEmptyParam(searchParams, "filters_sql") &&
    isEmptyParam(searchParams, "geo_filter_sql") &&
    isEmptyParam(searchParams, "PC_Primary_ids_str") &&
    isEmptyParam(searchParams, "PC_Secondary_ids_str") &&
    isDefaultPortfolioOnly(searchParams) &&
    isEmptyParam(searchParams, "sort_column");

  return { page, perPage, ok };
}

export async function fetchInvestorsListRaw(params: {
  token: string;
  searchParams: URLSearchParams;
}): Promise<unknown> {
  const { token, searchParams } = params;
  const { page, perPage, ok: isInitial } = isInitialInvestorsListParams(searchParams);
  const redis = getRedisClient();
  const cacheKey = getInvestorsListCacheKey(page, perPage);

  if (redis && isInitial) {
    try {
      const cached = await redis.get<unknown>(cacheKey);
      if (cached != null) {
        console.log("[INVESTORS] Cache HIT (default page)");
        return cached;
      }
    } catch (error) {
      console.warn("[INVESTORS] Redis read failed:", error);
    }
  }

  const response = await fetch(
    `${XANO_INVESTORS_LIST_URL}?${searchParams.toString()}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `investors_with_d_a_list failed: ${response.status} ${text || response.statusText}`
    );
  }

  const data = await response.json();

  if (redis && isInitial) {
    try {
      await redis.set(cacheKey, data as never, { ex: getDefaultTtlSeconds() });
    } catch (error) {
      console.warn("[INVESTORS] Redis write failed:", error);
    }
  }

  return data;
}

export async function fetchInvestorsListWithCookie(
  searchParams: URLSearchParams,
  token?: string | null
): Promise<unknown | null> {
  const authToken =
    token ?? cookies().get("asymmetrix_auth_token")?.value ?? null;
  if (!authToken) return null;
  return fetchInvestorsListRaw({ token: authToken, searchParams });
}

export async function warmInvestorsListCache(
  token: string,
  page = 1,
  perPage = 50
): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  const searchParams = new URLSearchParams();
  searchParams.set("page", String(page));
  searchParams.set("per_page", String(perPage));

  const data = await fetchInvestorsListRaw({ token, searchParams });
  return data != null;
}
