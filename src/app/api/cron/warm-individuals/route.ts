import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 300;

const XANO_URL = 'https://xdil-abvj-o7rq.e2.xano.io/api:Xpykjv0R/get_all_individuals';
const XANO_AUTH_URL = 'https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6/auth/login';

const CRON_AUTH_EMAIL = process.env.CRON_AUTH_EMAIL;
const CRON_AUTH_PASSWORD = process.env.CRON_AUTH_PASSWORD;
const CRON_MANUAL_SECRET = process.env.CRON_MANUAL_SECRET;
const XANO_SERVICE_TOKEN = process.env.XANO_SERVICE_TOKEN;

function getBearerFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get('authorization') || request.headers.get('Authorization');
  if (auth && auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  return null;
}

function getRedisClient(): Redis | null {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return Redis.fromEnv();
  }
  return null;
}

async function getAuthToken(): Promise<{ token: string | null; debug?: unknown }> {
  if (!CRON_AUTH_EMAIL || !CRON_AUTH_PASSWORD) {
    return {
      token: null,
      debug: {
        missingEnv: {
          CRON_AUTH_EMAIL: !CRON_AUTH_EMAIL,
          CRON_AUTH_PASSWORD: !CRON_AUTH_PASSWORD,
        },
      },
    };
  }
  try {
    const resp = await fetch(XANO_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: CRON_AUTH_EMAIL, password: CRON_AUTH_PASSWORD }),
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      return { token: null, debug: { status: resp.status, body: text } };
    }
    const data = await resp.json();
    return { token: data.authToken ?? null, debug: data };
  } catch (e) {
    return { token: null, debug: { error: e instanceof Error ? e.message : String(e) } };
  }
}

function isLondonSixAM(): { ok: boolean; londonHour: string } {
  const londonHourStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    hour12: false,
  }).format(new Date());
  return { ok: Number.parseInt(londonHourStr, 10) === 6, londonHour: londonHourStr };
}

export async function GET(request: NextRequest) {
  const force =
    request.nextUrl.searchParams.get('force') === '1' ||
    request.nextUrl.searchParams.get('force') === 'true';

  if (force) {
    const provided = request.headers.get('x-cron-manual-secret') ?? '';
    if (!CRON_MANUAL_SECRET || provided !== CRON_MANUAL_SECRET) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const { ok, londonHour } = isLondonSixAM();
    if (!force && !ok) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'Not 06:00 Europe/London',
        londonHour,
      });
    }
  } catch {
    // If timezone formatting fails, continue anyway.
  }

  const redis = getRedisClient();
  if (!redis) {
    return NextResponse.json(
      { success: false, error: 'Redis not configured (UPSTASH_REDIS_REST_URL/TOKEN missing)' },
      { status: 500 }
    );
  }

  const ttlSeconds = Math.min(
    Math.max(Number(process.env.INDIVIDUALS_INITIAL_TTL_SECONDS ?? 26 * 60 * 60), 60),
    7 * 24 * 60 * 60
  );

  const start = performance.now();
  const offset = 0;
  const perPage = 50;

  const bearerFromReq = getBearerFromRequest(request);
  const auth = await getAuthToken();
  const token = XANO_SERVICE_TOKEN || bearerFromReq || auth.token;
  if (!token) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to authenticate with Xano',
        debug: {
          hasXanoServiceToken: !!XANO_SERVICE_TOKEN,
          hasBearerFromRequest: !!bearerFromReq,
          cronAuthConfigured: !!CRON_AUTH_EMAIL && !!CRON_AUTH_PASSWORD,
          authDebug: auth.debug,
        },
      },
      { status: 500 }
    );
  }

  const params = new URLSearchParams();
  params.append('Offset', String(offset));
  params.append('Per_page', String(perPage));

  const resp = await fetch(`${XANO_URL}?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    return NextResponse.json({ success: false, error: `Xano error ${resp.status}`, details: text }, { status: 502 });
  }

  const data = await resp.json();
  const cacheKey = `individuals:initial:v1:offset${offset}:per${perPage}`;
  await redis.set(cacheKey, data as never, { ex: ttlSeconds });

  return NextResponse.json({
    success: true,
    totalMs: Math.round(performance.now() - start),
    cachedKey: cacheKey,
    ttlSeconds,
    offset,
    perPage,
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}

