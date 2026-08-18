import { cookies } from "next/headers";
import { Redis } from "@upstash/redis";
import {
  applyHqCountryIso2ToCorporateEvents,
  collectMissingHqCountryIso2CompanyIdsFromCorporateEvents,
  readHqCountryIso2,
} from "@/lib/dealRadar";
import { fetchCompanyTableDataByIds } from "@/lib/companyTableData";
import { HOME_CORPORATE_EVENTS_CACHE_KEY } from "@/lib/home-corporate-events-cache-key";

const XANO_HOME_CORPORATE_EVENTS_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:5YnK3rYr/corporate_events";

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
    Math.max(
      Number(process.env.HOME_CORPORATE_EVENTS_TTL_SECONDS ?? 26 * 60 * 60),
      60
    ),
    7 * 24 * 60 * 60
  );
}

export function parseHomeCorporateEventsResponse(
  responseValue: unknown
): Record<string, unknown>[] {
  if (Array.isArray(responseValue)) {
    return responseValue as Record<string, unknown>[];
  }

  if (!responseValue || typeof responseValue !== "object") {
    return [];
  }

  const record = responseValue as Record<string, unknown>;
  if (Array.isArray(record.CorporateEvents)) {
    return record.CorporateEvents as Record<string, unknown>[];
  }
  if (Array.isArray(record.data)) {
    return record.data as Record<string, unknown>[];
  }

  return [];
}

async function fetchHomeCorporateEventsFromXano(
  token: string
): Promise<unknown> {
  const url = new URL(XANO_HOME_CORPORATE_EVENTS_URL);
  url.searchParams.set("show_followed", "false");

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
    throw new Error(`Home corporate events API failed: ${response.status}`);
  }

  return response.json();
}

async function enrichCorporateEvents(
  events: Record<string, unknown>[],
  token: string
): Promise<Record<string, unknown>[]> {
  const missingCompanyIds =
    collectMissingHqCountryIso2CompanyIdsFromCorporateEvents(events);
  if (missingCompanyIds.length === 0) return events;

  try {
    const rows = await fetchCompanyTableDataByIds(missingCompanyIds, token);
    const isoByCompanyId = new Map<number, string | null>(
      Array.from(rows.entries()).map(([companyId, row]) => [
        companyId,
        readHqCountryIso2(row),
      ])
    );
    return applyHqCountryIso2ToCorporateEvents(events, isoByCompanyId);
  } catch (error) {
    console.error("Error enriching corporate event country flags:", error);
    return events;
  }
}

/** Fetch home corporate events with Redis cache for the default view. */
export async function fetchHomeCorporateEventsRaw(params: {
  token: string;
}): Promise<unknown> {
  const redis = getRedisClient();

  if (redis) {
    try {
      const cached = await redis.get<unknown>(HOME_CORPORATE_EVENTS_CACHE_KEY);
      if (cached != null) {
        console.log("[HOME CE] Cache HIT (default page)");
        return cached;
      }
    } catch (error) {
      console.warn("[HOME CE] Redis read failed:", error);
    }
  }

  const result = await fetchHomeCorporateEventsFromXano(params.token);

  if (redis) {
    try {
      await redis.set(HOME_CORPORATE_EVENTS_CACHE_KEY, result as never, {
        ex: getDefaultTtlSeconds(),
      });
    } catch (error) {
      console.warn("[HOME CE] Redis write failed:", error);
    }
  }

  return result;
}

export async function fetchHomeCorporateEventsServer(params?: {
  token?: string | null;
}): Promise<Record<string, unknown>[] | null> {
  const token =
    params?.token ?? cookies().get("asymmetrix_auth_token")?.value ?? null;
  if (!token) return null;

  const raw = await fetchHomeCorporateEventsRaw({ token });
  const events = parseHomeCorporateEventsResponse(raw);
  return enrichCorporateEvents(events, token);
}

/** Write default home corporate events to Redis (cron warm). */
export async function warmHomeCorporateEventsCache(
  token: string
): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  const result = await fetchHomeCorporateEventsFromXano(token);
  await redis.set(HOME_CORPORATE_EVENTS_CACHE_KEY, result as never, {
    ex: getDefaultTtlSeconds(),
  });
  return true;
}
