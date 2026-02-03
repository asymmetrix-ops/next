import { NextRequest, NextResponse } from 'next/server';
import { getCachedSectorsList, setCachedSectorsList } from '@/lib/sector-cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const XANO_BASE = 'https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV';
const XANO_AUTH_URL = 'https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6/auth/login';

const CRON_AUTH_EMAIL = process.env.CRON_AUTH_EMAIL;
const CRON_AUTH_PASSWORD = process.env.CRON_AUTH_PASSWORD;

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

export async function GET(request: NextRequest) {
  const search = (request.nextUrl.searchParams.get('search') ?? '').trim().toLowerCase();

  const cached = await getCachedSectorsList();
  if (cached) {
    if (!search) return NextResponse.json(cached);
    const sectors = extractSectors(cached);

    const filtered = sectors.filter((s) => {
      return sectorNameLower(s).includes(search);
    });
    if (isRecord(cached)) return NextResponse.json({ ...cached, sectors: filtered });
    return NextResponse.json({ sectors: filtered });
  }

  // Cache miss: best-effort fetch from Xano using cron creds (public list-view data).
  const token = await getAuthToken();
  if (!token) {
    return NextResponse.json(
      { error: 'Sector list cache is empty and Xano auth is not configured' },
      { status: 503 }
    );
  }

  const url = `${XANO_BASE}/Primary_sectors_with_companies_counts`;
  const resp = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!resp.ok) {
    return NextResponse.json({ error: `Xano error ${resp.status}` }, { status: 502 });
  }

  const data = await resp.json();
  const sectors = extractSectors(data);
  const payload = isRecord(data) && Array.isArray(data['sectors']) ? data : { sectors };
  await setCachedSectorsList(payload);

  if (!search) return NextResponse.json(payload);
  const filtered = sectors.filter((s) => sectorNameLower(s).includes(search));
  return NextResponse.json(isRecord(payload) ? { ...payload, sectors: filtered } : { sectors: filtered });
}

