import { NextRequest, NextResponse } from 'next/server';
import {
  invalidateCachedSectorData,
  invalidateCachedSectorsList,
} from '@/lib/sector-cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const INVALIDATE_SECRET = process.env.CRON_MANUAL_SECRET;

export async function POST(req: NextRequest) {
  // Protect the endpoint with the same secret used for manual cron triggers.
  const provided = req.headers.get('x-cron-manual-secret') ?? '';
  if (!INVALIDATE_SECRET || provided !== INVALIDATE_SECRET) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    // empty body is fine if only invalidating the list
  }

  const sectorId =
    typeof body.sector_id === 'string' || typeof body.sector_id === 'number'
      ? String(body.sector_id)
      : typeof body.id === 'string' || typeof body.id === 'number'
        ? String(body.id)
        : null;

  const invalidateList = body.invalidate_list !== false; // default true
  const invalidated: string[] = [];

  if (sectorId) {
    await invalidateCachedSectorData(sectorId);
    invalidated.push(`sector:${sectorId}:overview`);
  }

  if (invalidateList) {
    await invalidateCachedSectorsList();
    invalidated.push('sectors:list:v1');
  }

  if (invalidated.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Provide sector_id and/or set invalidate_list=true' },
      { status: 400 }
    );
  }

  console.log(`[CACHE] 🗑️ Invalidated: ${invalidated.join(', ')}`);

  return NextResponse.json({ success: true, invalidated });
}
