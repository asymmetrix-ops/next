import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import {
  getInvestorsListCacheKey,
  warmInvestorsListCache,
} from "@/lib/investorsListServer";
import { runInBackground } from "@/lib/run-background";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 300;

const XANO_AUTH_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6/auth/login";

const CRON_AUTH_EMAIL = process.env.CRON_AUTH_EMAIL;
const CRON_AUTH_PASSWORD = process.env.CRON_AUTH_PASSWORD;
const CRON_MANUAL_SECRET = process.env.CRON_MANUAL_SECRET;
const XANO_SERVICE_TOKEN = process.env.XANO_SERVICE_TOKEN;

function getRedisClient(): Redis | null {
  if (
    process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return Redis.fromEnv();
  }
  return null;
}

async function getAuthToken(): Promise<string | null> {
  if (!CRON_AUTH_EMAIL || !CRON_AUTH_PASSWORD) return null;
  try {
    const resp = await fetch(XANO_AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: CRON_AUTH_EMAIL,
        password: CRON_AUTH_PASSWORD,
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.authToken ?? null;
  } catch {
    return null;
  }
}

function isLondonSixAM(): { ok: boolean; londonHour: string } {
  const londonHourStr = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    hour12: false,
  }).format(new Date());
  return {
    ok: Number.parseInt(londonHourStr, 10) === 6,
    londonHour: londonHourStr,
  };
}

async function warmInvestors(page: number, perPage: number): Promise<void> {
  const start = performance.now();
  const cacheKey = getInvestorsListCacheKey(page, perPage);

  try {
    const token = XANO_SERVICE_TOKEN || (await getAuthToken());
    if (!token) {
      console.error("[CRON] warm-investors: Failed to authenticate with Xano");
      return;
    }

    const ok = await warmInvestorsListCache(token, page, perPage);
    if (!ok) {
      console.error("[CRON] warm-investors: Redis not configured");
      return;
    }

    const totalMs = Math.round(performance.now() - start);
    console.log(
      `[CRON] warm-investors cached key=${cacheKey} totalMs=${totalMs}`
    );
  } catch (error) {
    console.error("[CRON] warm-investors failed:", error);
  }
}

export async function GET(request: NextRequest) {
  const force =
    request.nextUrl.searchParams.get("force") === "1" ||
    request.nextUrl.searchParams.get("force") === "true";

  if (force) {
    const provided = request.headers.get("x-cron-manual-secret") ?? "";
    if (!CRON_MANUAL_SECRET || provided !== CRON_MANUAL_SECRET) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  try {
    const { ok, londonHour } = isLondonSixAM();
    if (!force && !ok) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "Not 06:00 Europe/London",
        londonHour,
      });
    }
  } catch {
    // If timezone formatting fails, continue anyway.
  }

  const redis = getRedisClient();
  if (!redis) {
    return NextResponse.json(
      {
        success: false,
        error: "Redis not configured (UPSTASH_REDIS_REST_URL/TOKEN missing)",
      },
      { status: 500 }
    );
  }

  const page = 1;
  const perPage = 50;
  const cacheKey = getInvestorsListCacheKey(page, perPage);
  const ttlSeconds = Math.min(
    Math.max(Number(process.env.INVESTORS_INITIAL_TTL_SECONDS ?? 26 * 60 * 60), 60),
    7 * 24 * 60 * 60
  );

  runInBackground(warmInvestors(page, perPage));

  return NextResponse.json({
    success: true,
    started: true,
    cachedKey: cacheKey,
    ttlSeconds,
    page,
    perPage,
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
