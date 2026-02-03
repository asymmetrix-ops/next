import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const XANO_URL = 'https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm/investors_with_d_a_list';

function getRedisClient(): Redis | null {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return Redis.fromEnv();
  }
  return null;
}

function getBearerFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get('authorization') || request.headers.get('Authorization');
  if (auth && auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  return null;
}

function getBearerFromCookie(): string | null {
  try {
    return cookies().get('asymmetrix_auth_token')?.value ?? null;
  } catch {
    return null;
  }
}

function isInitialParams(sp: URLSearchParams): { page: number; perPage: number; ok: boolean } {
  const page = Number(sp.get('page') ?? '1');
  const perPage = Number(sp.get('per_page') ?? '50');
  // Cache only when only {page, per_page} are present and page=1.
  const keys = Array.from(sp.keys());
  const allowed = new Set(['page', 'per_page']);
  const ok = page === 1 && keys.every((k) => allowed.has(k));
  return { page, perPage, ok };
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const { page, perPage, ok: isInitial } = isInitialParams(sp);

  const token = getBearerFromCookie() || getBearerFromRequest(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const redis = getRedisClient();
  const ttlSeconds = Math.min(
    Math.max(Number(process.env.INVESTORS_INITIAL_TTL_SECONDS ?? 26 * 60 * 60), 60),
    7 * 24 * 60 * 60
  );

  const cacheKey = `investors:initial:v1:page${page}:per${perPage}`;
  if (redis && isInitial) {
    try {
      const cached = await redis.get<unknown>(cacheKey);
      if (cached != null) return NextResponse.json(cached);
    } catch (e) {
      console.error('[INVESTORS CACHE] ❌ Redis read failed:', e);
    }
  }

  const url = `${XANO_URL}?${sp.toString()}`;
  const resp = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    return NextResponse.json(
      { error: `Xano error ${resp.status}`, details: text },
      { status: 502 }
    );
  }

  const data = await resp.json();

  if (redis && isInitial) {
    try {
      await redis.set(cacheKey, data as never, { ex: ttlSeconds });
    } catch (e) {
      console.error('[INVESTORS CACHE] ❌ Redis write failed:', e);
    }
  }

  return NextResponse.json(data);
}

