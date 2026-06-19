import { NextRequest, NextResponse } from 'next/server';
import { getCachedSectorsList } from '@/lib/sector-cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

function cacheMissResponse() {
  return NextResponse.json(
    { error: 'Sector list is not available', code: 'CACHE_MISS' },
    { status: 503 }
  );
}

function filterCachedList(cached: unknown, search: string) {
  if (!search) return cached;
  const sectors = extractSectors(cached);
  const filtered = sectors.filter((s) => sectorNameLower(s).includes(search));
  if (isRecord(cached)) return { ...cached, sectors: filtered };
  return { sectors: filtered };
}

export async function GET(request: NextRequest) {
  const cached = await getCachedSectorsList();
  if (!cached) return cacheMissResponse();

  const search = (request.nextUrl.searchParams.get('search') ?? '').trim().toLowerCase();
  return NextResponse.json(filterCachedList(cached, search));
}

export async function POST(request: NextRequest) {
  const cached = await getCachedSectorsList();
  if (!cached) return cacheMissResponse();

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const search = (isRecord(body) && typeof body['search'] === 'string'
    ? body['search']
    : ''
  ).trim().toLowerCase();

  // Sort is ignored in cache-only mode; cron-warmed list order is served as-is.
  return NextResponse.json(filterCachedList(cached, search));
}
