import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

// Secret key to protect the cron endpoint (set in environment variables)
const CRON_SECRET = process.env.CRON_SECRET;
const XANO_SERVICE_TOKEN = process.env.XANO_SERVICE_TOKEN;

// Fetch list of sector IDs from Xano
async function fetchSectorIds(): Promise<string[]> {
  try {
    const resp = await fetch(
      'https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV/Primary_sectors_with_companies_counts',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(XANO_SERVICE_TOKEN ? { 'Authorization': `Bearer ${XANO_SERVICE_TOKEN}` } : {}),
        },
      }
    );

    if (!resp.ok) {
      console.error('[CRON] Failed to fetch sector list:', resp.status);
      return [];
    }

    const data = await resp.json();
    
    // Extract sector IDs from the response (adjust based on actual Xano response structure)
    const sectors = Array.isArray(data) ? data : (data.sectors || data.items || []);
    const ids = sectors
      .map((s: { id?: number; Sector_id?: number }) => String(s.id || s.Sector_id))
      .filter((id: string) => id && id !== 'undefined');
    
    console.log(`[CRON] Found ${ids.length} sectors to warm`);
    return ids;
  } catch (error) {
    console.error('[CRON] Error fetching sector IDs:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  // Verify the request is from the cron job (Vercel cron sets this header)
  const authHeader = request.headers.get('authorization');
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  
  if (!isVercelCron && CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = performance.now();
  const results: { sectorId: string; status: string; ms: number }[] = [];

  // Fetch sector IDs dynamically
  const sectorIds = await fetchSectorIds();
  
  if (sectorIds.length === 0) {
    return NextResponse.json({
      success: false,
      error: 'No sectors found to warm',
    }, { status: 500 });
  }

  console.log(`[CRON] 🔄 Starting cache warm for ${sectorIds.length} sectors...`);

  // Warm cache for each sector sequentially (to avoid overwhelming Xano)
  for (const sectorId of sectorIds) {
    const sectorStart = performance.now();
    try {
      // Revalidate the sector page cache
      revalidatePath(`/sector/${sectorId}`);
      
      // Trigger the API route to cache data
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'http://localhost:3000';
      
      const resp = await fetch(`${baseUrl}/api/sector/${sectorId}/overview`, {
        method: 'GET',
        headers: {
          'x-cron-request': 'true',
        },
      });

      const ms = Math.round(performance.now() - sectorStart);
      results.push({
        sectorId,
        status: resp.ok ? 'success' : `failed (${resp.status})`,
        ms,
      });

      console.log(`[CRON] ✅ Sector ${sectorId} warmed in ${ms}ms`);
      
      // Small delay between requests to be nice to Xano
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      const ms = Math.round(performance.now() - sectorStart);
      results.push({
        sectorId,
        status: `error: ${error instanceof Error ? error.message : 'unknown'}`,
        ms,
      });
      console.error(`[CRON] ❌ Sector ${sectorId} failed:`, error);
    }
  }

  const totalMs = Math.round(performance.now() - startTime);
  console.log(`[CRON] 🏁 Cache warm completed in ${totalMs}ms`);

  return NextResponse.json({
    success: true,
    totalMs,
    sectorsWarmed: results.length,
    results,
  });
}
