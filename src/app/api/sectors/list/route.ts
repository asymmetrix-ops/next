import { NextRequest, NextResponse } from 'next/server';
import { getCachedSectorsList, setCachedSectorsList } from '@/lib/sector-cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const XANO_BASE = 'https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV';
const XANO_AUTH_URL = 'https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6/auth/login';

const CRON_AUTH_EMAIL = process.env.CRON_AUTH_EMAIL;
const CRON_AUTH_PASSWORD = process.env.CRON_AUTH_PASSWORD;

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
    const obj = cached as { sectors?: unknown[] } | unknown;
    const sectors = (obj && typeof obj === 'object' && Array.isArray((obj as { sectors?: unknown[] }).sectors))
      ? ((obj as { sectors: any[] }).sectors)
      : (Array.isArray(cached) ? (cached as any[]) : []);

    const filtered = sectors.filter((s) => {
      const name = String((s as any)?.sector_name ?? '').toLowerCase();
      return name.includes(search);
    });
    return NextResponse.json({ ...(typeof obj === 'object' && obj ? obj : {}), sectors: filtered });
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
  const sectors = Array.isArray(data) ? data : (data?.sectors ?? data?.items ?? []);
  const payload = Array.isArray(data) ? { sectors } : (data?.sectors ? data : { sectors });
  await setCachedSectorsList(payload);

  if (!search) return NextResponse.json(payload);
  const filtered = (payload.sectors ?? []).filter((s: any) =>
    String(s?.sector_name ?? '').toLowerCase().includes(search)
  );
  return NextResponse.json({ ...payload, sectors: filtered });
}

