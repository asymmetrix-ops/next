import { NextRequest, NextResponse } from 'next/server';
import { getCachedSectorsList, setCachedSectorsList } from '@/lib/sector-cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const XANO_BASE = 'https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV';
const XANO_AUTH_URL = 'https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6/auth/login';

const CRON_AUTH_EMAIL = process.env.CRON_AUTH_EMAIL;
const CRON_AUTH_PASSWORD = process.env.CRON_AUTH_PASSWORD;

function getBearerFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get('authorization') || request.headers.get('Authorization');
  if (auth && auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
  return null;
}

function getBearerFromCookie(request: NextRequest): string | null {
  // Works in both Node and Edge runtimes.
  const raw = request.cookies.get('asymmetrix_auth_token')?.value;
  return raw ? String(raw) : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractSectors(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (isRecord(value)) {
    const sectors = value['sectors'];
    if (Array.isArray(sectors)) return sectors;
    const items = value['items'];
    if (Array.isArray(items)) return items;
  }
  return [];
}

function sectorNameLower(value: unknown): string {
  if (!isRecord(value)) return '';
  const name = value['sector_name'];
  return typeof name === 'string' ? name.toLowerCase() : '';
}

async function getAuthToken(): Promise<string | null> {
  if (!CRON_AUTH_EMAIL || !CRON_AUTH_PASSWORD) return null;
  try {
    const resp = await fetch(XANO_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: CRON_AUTH_EMAIL, password: CRON_AUTH_PASSWORD }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.authToken ?? null;
  } catch {
    return null;
  }
}

async function getOrWarmDefaultSectorList(tokenForXanoFetch?: string | null): Promise<unknown | null> {
  const cached = await getCachedSectorsList();
  if (cached) return cached;

  // Cache miss: fetch from Xano using either:
  // - the caller's bearer token (preferred for local/dev and when cron creds are not configured), OR
  // - cron creds fallback (public list-view data).
  const token = tokenForXanoFetch || (await getAuthToken());
  if (!token) return null;

  const url = `${XANO_BASE}/Primary_sectors_with_companies_counts`;
  const resp = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!resp.ok) return null;

  const data = await resp.json();
  const sectors = extractSectors(data);
  const payload = isRecord(data) && Array.isArray(data['sectors']) ? data : { sectors };
  await setCachedSectorsList(payload);
  return payload;
}

function coerceTrimmedString(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

export async function GET(request: NextRequest) {
  const search = (request.nextUrl.searchParams.get('search') ?? '').trim().toLowerCase();

  const token = getBearerFromCookie(request) || getBearerFromRequest(request);
  const cached = await getOrWarmDefaultSectorList(token);
  if (cached) {
    if (!search) return NextResponse.json(cached);
    const sectors = extractSectors(cached);

    // Note: this is a *simple* client-style search (by sector_name only).
    // For richer search semantics, use POST with {search, sort} and we will proxy to Xano.
    const filtered = sectors.filter((s) => sectorNameLower(s).includes(search));
    if (isRecord(cached)) return NextResponse.json({ ...cached, sectors: filtered });
    return NextResponse.json({ sectors: filtered });
  }

  return NextResponse.json(
    { error: 'Sector list cache is empty and Xano auth is not configured' },
    { status: 503 }
  );
}

export async function POST(request: NextRequest) {
  // Support Xano-style search/sort requests:
  // POST https://.../Primary_sectors_with_companies_counts
  // { "sort": "", "search": "private" }
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const sort = coerceTrimmedString(isRecord(body) ? body['sort'] : '');
  const search = coerceTrimmedString(isRecord(body) ? body['search'] : '');

  // If there is no search/sort, serve the cached default list (fast path).
  if (!sort && !search) {
    const token = getBearerFromCookie(request) || getBearerFromRequest(request);
    const cached = await getOrWarmDefaultSectorList(token);
    if (cached) return NextResponse.json(cached);
    return NextResponse.json(
      { error: 'Sector list cache is empty and Xano auth is not configured' },
      { status: 503 }
    );
  }

  // For non-empty search/sort, bypass the cache and proxy to Xano so results match backend semantics.
  const token = getBearerFromCookie(request) || getBearerFromRequest(request) || (await getAuthToken());
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = `${XANO_BASE}/Primary_sectors_with_companies_counts`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ sort, search }),
    cache: 'no-store',
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    return NextResponse.json({ error: `Xano error ${resp.status}`, details: text }, { status: 502 });
  }

  const data = await resp.json();
  return NextResponse.json(data);
}

