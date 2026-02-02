import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 300;

const XANO_COMPANIES_URL = 'https://xdil-abvj-o7rq.e2.xano.io/api:GYQcK4au/Get_new_companies';
const XANO_AUTH_URL = 'https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6/auth/login';

const CRON_AUTH_EMAIL = process.env.CRON_AUTH_EMAIL;
const CRON_AUTH_PASSWORD = process.env.CRON_AUTH_PASSWORD;
const CRON_MANUAL_SECRET = process.env.CRON_MANUAL_SECRET;

function getRedisClient(): Redis | null {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return Redis.fromEnv();
  }
  return null;
}

async function getAuthToken(): Promise<string | null> {
  if (!CRON_AUTH_EMAIL || !CRON_AUTH_PASSWORD) {
    console.error('[CRON] ❌ Missing CRON_AUTH_EMAIL or CRON_AUTH_PASSWORD environment variables');
    return null;
  }

  try {
    const resp = await fetch(XANO_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: CRON_AUTH_EMAIL, password: CRON_AUTH_PASSWORD }),
    });

    if (!resp.ok) {
      console.error('[CRON] ❌ Auth failed:', resp.status, await resp.text());
      return null;
    }

    const data = await resp.json();
    const token = data.authToken;
    if (!token) {
      console.error('[CRON] ❌ No authToken in response:', data);
      return null;
    }
    return token;
  } catch (e) {
    console.error('[CRON] ❌ Auth error:', e);
    return null;
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
  const force = request.nextUrl.searchParams.get('force') === '1' || request.nextUrl.searchParams.get('force') === 'true';
  if (force) {
    const provided = request.headers.get('x-cron-manual-secret') ?? '';
    if (!CRON_MANUAL_SECRET || provided !== CRON_MANUAL_SECRET) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const { ok, londonHour } = isLondonSixAM();
    if (!force && !ok) {
      console.log(`[CRON] ⏭️ Skipping warm-companies (London hour=${londonHour})`);
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'Not 06:00 Europe/London',
        londonHour,
      });
    }
  } catch (e) {
    console.warn('[CRON] ⚠️ London time check failed, continuing anyway:', e);
  }

  const start = performance.now();
  const perPage = 20;
  const offset = 1;

  const redis = getRedisClient();
  if (!redis) {
    return NextResponse.json(
      { success: false, error: 'Redis not configured (UPSTASH_REDIS_REST_URL/TOKEN missing)' },
      { status: 500 }
    );
  }

  const ttlSeconds = Math.min(
    Math.max(Number(process.env.COMPANIES_INITIAL_TTL_SECONDS ?? 26 * 60 * 60), 60),
    7 * 24 * 60 * 60
  );

  const token = await getAuthToken();
  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Failed to authenticate with Xano' },
      { status: 500 }
    );
  }

  const params = new URLSearchParams();
  params.append('Offset', String(offset));
  params.append('Per_page', String(perPage));

  const url = `${XANO_COMPANIES_URL}?${params.toString()}`;
  const resp = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!resp.ok) {
    const text = await resp.text();
    return NextResponse.json(
      { success: false, error: `Xano error ${resp.status}`, details: text },
      { status: 500 }
    );
  }

  const data = await resp.json();

  const key = `companies:initial:v1:per${perPage}`;
  await redis.set(key, data as never, { ex: ttlSeconds });

  const totalMs = Math.round(performance.now() - start);
  return NextResponse.json({
    success: true,
    totalMs,
    cachedKey: key,
    ttlSeconds,
    perPage,
    offset,
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}

