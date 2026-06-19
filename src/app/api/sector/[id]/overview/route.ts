import { NextRequest, NextResponse } from 'next/server';
import { getCachedSectorData } from '@/lib/sector-cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = performance.now();
  const sectorId = params.id;

  const cachedData = await getCachedSectorData(sectorId);
  if (cachedData) {
    const cacheMs = Math.round(performance.now() - startTime);
    console.log(`[API] ⚡ Serving sector ${sectorId} from cache in ${cacheMs}ms`);
    return NextResponse.json({
      ...(cachedData as object),
      fromCache: true,
      cacheMs,
    });
  }

  console.log(`[API] ❌ Cache miss for sector ${sectorId} (cache-only, no live fetch)`);
  return NextResponse.json(
    {
      error: 'Sector data is not available',
      code: 'CACHE_MISS',
      sectorId,
    },
    { status: 503 }
  );
}
