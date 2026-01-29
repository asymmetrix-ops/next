import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCachedSectorData, setCachedSectorData, isCacheEmpty, triggerBackgroundWarming } from '@/lib/sector-cache';

// Allow caching at edge
export const revalidate = 300;

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
  
  // Check if this is a cron request (can skip auth, but still needs to fetch fresh data)
  const isCronRequest = request.headers.get('x-cron-request') === 'true';
  
  // Check cache first - return immediately if we have fresh data
  const cachedData = await getCachedSectorData(sectorId);
  if (cachedData && !isCronRequest) {
    const cacheMs = Math.round(performance.now() - startTime);
    console.log(`[API] ⚡ Serving sector ${sectorId} from cache in ${cacheMs}ms`);
    return NextResponse.json({
      ...cachedData as object,
      fromCache: true,
      cacheMs,
    });
  }
  
  // On cache miss: trigger background warming of ALL sectors (fire-and-forget)
  // This happens automatically on first request after deploy
  if (!isCronRequest && process.env.ENABLE_BACKGROUND_WARMING === 'true' && (await isCacheEmpty())) {
    console.log(`[API] 🔥 Cache empty - triggering background warming for all sectors`);
    triggerBackgroundWarming(request.nextUrl.origin); // Non-blocking, runs in background
  }
  
  console.log(`[API] 🚀 Fetching overview data for sector ${sectorId} from Xano...`);

  try {
    // Get auth token from cookie (skip for cron requests)
    const cookieStore = cookies();
    const token = cookieStore.get('asymmetrix_auth_token')?.value;

    // For cron requests, use a service token from env
    const authToken = isCronRequest 
      ? process.env.XANO_SERVICE_TOKEN 
      : token;

    if (!authToken && !isCronRequest) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const headers = {
      'Content-Type': 'application/json',
      ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
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
    
    const [overviewOut, sectorOut, recentOut, marketOut] = await Promise.all([
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
      // Market map moved out of overview_data → dedicated endpoint
      fetchJsonWithTimeout(
        `https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV/sectors_market_map?${qs.toString()}`,
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
      market: Math.round(marketOut.ms),
    });

    // Log any errors
    const errors = [
      overviewOut.error && `overview: ${overviewOut.error}`,
      sectorOut.error && `sector: ${sectorOut.error}`,
      recentOut.error && `recent: ${recentOut.error}`,
      marketOut.error && `market: ${marketOut.error}`,
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
    
    // overview_data now returns: strategic_acquirers, pe_investors (market map is separate)
    const marketMap =
      (marketOut.data as { market_map?: unknown } | null)?.market_map ??
      marketOut.data ??
      null;
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

    // Build response object
    const responseData = {
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
        marketMs: Math.round(marketOut.ms),
        timeoutMs,
        statuses: {
          overview: overviewOut.status,
          sector: sectorOut.status,
          recent: recentOut.status,
          market: marketOut.status,
        },
        errors: {
          overview: overviewOut.error,
          sector: sectorOut.error,
          recent: recentOut.error,
          market: marketOut.error,
        },
      },
      serverFetchTime: totalTime,
    };

    // Cache the response for future requests (instant <50ms responses)
    await setCachedSectorData(sectorId, responseData);
    console.log(`[API] 💾 Cached sector ${sectorId} for future requests`);

    return NextResponse.json({
      ...responseData,
      fromCache: false,
    });
  } catch (error) {
    console.error('[API] ❌ Error fetching overview data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch overview data' },
      { status: 500 }
    );
  }
}

