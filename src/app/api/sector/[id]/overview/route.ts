import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

async function fetchJsonWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<{ data: unknown | null; ms: number; ok: boolean; status: number; error?: string }> {
  const start = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  // Log fetch start
  const urlShort = url.split('?')[0].split('/').slice(-1)[0];
  console.log(`[FETCH] ⏳ Starting ${urlShort}...`);
  
  try {
    const fetchStart = performance.now();
    const res = await fetch(url, { ...init, signal: controller.signal });
    const fetchEnd = performance.now();
    console.log(`[FETCH] 📡 ${urlShort} response received in ${(fetchEnd - fetchStart).toFixed(0)}ms, status: ${res.status}`);
    
    const jsonStart = performance.now();
    const data = await res.json();
    const jsonEnd = performance.now();
    console.log(`[FETCH] 📦 ${urlShort} JSON parsed in ${(jsonEnd - jsonStart).toFixed(0)}ms, size: ${JSON.stringify(data).length} chars`);
    
    const ms = performance.now() - start;
    if (!res.ok) return { data: null, ms, ok: false, status: res.status, error: `HTTP ${res.status}` };
    return { data, ms, ok: true, status: res.status };
  } catch (err) {
    const ms = performance.now() - start;
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.log(`[FETCH] ❌ ${urlShort} failed after ${ms.toFixed(0)}ms: ${errorMsg}`);
    return { data: null, ms, ok: false, status: 0, error: errorMsg };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = performance.now();
  const sectorId = params.id;
  
  console.log(`[API] 🚀 Fetching overview data for sector ${sectorId} using aggregated endpoint`);

  try {
    // Get auth token from cookie
    const cookieStore = cookies();
    const token = cookieStore.get('asymmetrix_auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    // IMPORTANT: Do NOT use `next: { revalidate }` here - it causes fetch to hang in production.
    // Use `cache: 'no-store'` for reliable behavior.
    const fetchInit: RequestInit = {
      method: 'GET',
      headers,
      cache: 'no-store',
    };

    const timeoutMs = 20000; // Increased to 20s temporarily for diagnostics
    const fetchStartTime = performance.now();

    // Use the new aggregated Xano endpoint + recent transactions (not included in overview_data)
    const qs = new URLSearchParams();
    qs.append('Sector_id', parseInt(sectorId, 10).toString());
    
    const [overviewOut, sectorOut, recentOut] = await Promise.all([
      fetchJsonWithTimeout(
        `https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV/overview_data?${qs.toString()}`,
        fetchInit,
        timeoutMs
      ),
      // Still need sector details separately for thesis etc.
      fetchJsonWithTimeout(
        `https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV/sectors/${sectorId}`,
        fetchInit,
        timeoutMs
      ),
      // Recent transactions not included in overview_data, fetch separately
      fetchJsonWithTimeout(
        `https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV/sectors_resent_trasnactions?${qs.toString()}&top_15=true`,
        fetchInit,
        timeoutMs
      ),
    ]);

    const fetchTotalMs = performance.now() - fetchStartTime;
    console.log(`[API] Aggregated fetch took: ${fetchTotalMs.toFixed(0)}ms`);
    console.log(`[API] Timings (ms):`, {
      overview: Math.round(overviewOut.ms),
      sector: Math.round(sectorOut.ms),
      recent: Math.round(recentOut.ms),
    });

    // Log any errors
    const errors = [
      overviewOut.error && `overview: ${overviewOut.error}`,
      sectorOut.error && `sector: ${sectorOut.error}`,
      recentOut.error && `recent: ${recentOut.error}`,
    ].filter(Boolean);
    if (errors.length > 0) {
      console.log(`[API] ⚠️ Fetch errors:`, errors.join(', '));
    }

    // Extract data from the aggregated response
    const overviewData = overviewOut.data as Record<string, unknown> | null;
    const sectorData = sectorOut.data;
    
    // Debug: log what keys overview_data actually returns
    if (overviewData) {
      console.log(`[API] 🔍 overview_data keys:`, Object.keys(overviewData));
    }
    
    // The aggregated endpoint returns: market_map, strategic_acquirers, pe_investors
    const marketMap = overviewData?.market_map ?? null;
    const strategic = overviewData?.strategic_acquirers ?? null;
    const pe = overviewData?.pe_investors ?? null;
    // Recent transactions from separate endpoint
    const recentTransactions = recentOut.data ?? null;

    // Debug logging: inspect what the backend is returning for the sector thesis
    try {
      type SectorApiItem = {
        Sector_thesis?: unknown;
        Sector?: { Sector_thesis?: unknown };
      };

      const items: SectorApiItem[] = Array.isArray(sectorData)
        ? (sectorData as SectorApiItem[])
        : ([sectorData] as SectorApiItem[]);

      const first = items[0] ?? {};
      const flatThesis = first.Sector_thesis;
      const nestedThesis = first.Sector?.Sector_thesis;

      console.log('[API] 🧪 Sector thesis debug:', {
        hasData: Boolean(sectorData),
        flatThesisSample:
          typeof flatThesis === 'string' ? flatThesis.slice(0, 300) : flatThesis,
        nestedThesisSample:
          typeof nestedThesis === 'string' ? nestedThesis.slice(0, 300) : nestedThesis,
      });
    } catch (e) {
      console.log('[API] 🧪 Sector thesis debug failed to inspect sectorData', e);
    }

    const totalTime = performance.now() - startTime;
    console.log(`[API] ✅ Overview data fetched in ${totalTime.toFixed(0)}ms`);
    console.log(`[API]    - Sector: ${sectorData ? 'OK' : 'failed'}`);
    console.log(`[API]    - Market Map: ${marketMap ? 'OK' : 'failed'}`);
    console.log(`[API]    - Strategic: ${strategic ? 'OK' : 'failed'}`);
    console.log(`[API]    - PE: ${pe ? 'OK' : 'failed'}`);
    console.log(`[API]    - Recent: ${recentTransactions ? 'OK' : 'failed'}`);

    // Return everything in one response (same structure as before for client compatibility)
    return NextResponse.json({
      sectorData,
      splitDatasets: {
        marketMap,
        strategic,
        pe,
        recentTransactions,
      },
      timings: {
        fetchTotalMs: Math.round(fetchTotalMs),
        overviewMs: Math.round(overviewOut.ms),
        sectorMs: Math.round(sectorOut.ms),
        recentMs: Math.round(recentOut.ms),
        timeoutMs,
        statuses: {
          overview: overviewOut.status,
          sector: sectorOut.status,
          recent: recentOut.status,
        },
        errors: {
          overview: overviewOut.error,
          sector: sectorOut.error,
          recent: recentOut.error,
        },
      },
      serverFetchTime: totalTime,
    });
  } catch (error) {
    console.error('[API] ❌ Error fetching overview data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch overview data' },
      { status: 500 }
    );
  }
}

