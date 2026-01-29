import { NextRequest, NextResponse } from 'next/server';
import { setCachedSectorData } from '@/lib/sector-cache';

// This route does real work (network + caching) and must never be pre-rendered at build time.
// Force dynamic execution so `next build` doesn't attempt static generation for `/api/cron/warm-sectors`.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Allow up to 5 minutes for warming all sectors (Vercel Pro)
export const maxDuration = 300;

// Xano API base URLs
const XANO_BASE = 'https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV';
const XANO_AUTH_URL = 'https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6/auth/login';

// Credentials for cron authentication (set in Vercel environment variables)
const CRON_AUTH_EMAIL = process.env.CRON_AUTH_EMAIL;
const CRON_AUTH_PASSWORD = process.env.CRON_AUTH_PASSWORD;

// Authenticate with Xano and get auth token
async function getAuthToken(): Promise<string | null> {
  if (!CRON_AUTH_EMAIL || !CRON_AUTH_PASSWORD) {
    console.error('[CRON] ❌ Missing CRON_AUTH_EMAIL or CRON_AUTH_PASSWORD environment variables');
    return null;
  }

  try {
    console.log('[CRON] 🔐 Authenticating with Xano...');
    const resp = await fetch(XANO_AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: CRON_AUTH_EMAIL,
        password: CRON_AUTH_PASSWORD,
      }),
    });

    if (!resp.ok) {
      console.error('[CRON] ❌ Auth failed:', resp.status, await resp.text());
      return null;
    }

    const data = await resp.json();
    const token = data.authToken;
    
    if (!token) {
      console.error('[CRON] ❌ No authToken in response:', data);
      return null;
    }

    console.log('[CRON] ✅ Authentication successful');
    return token;
  } catch (error) {
    console.error('[CRON] ❌ Auth error:', error);
    return null;
  }
}

// Headers for Xano requests (using auth token)
function getXanoHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

// Fetch with timeout
async function fetchWithTimeout(url: string, token: string, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: 'GET',
      headers: getXanoHeaders(token),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

// Fetch list of sector IDs from Xano
async function fetchSectorIds(token: string): Promise<string[]> {
  try {
    const resp = await fetchWithTimeout(`${XANO_BASE}/Primary_sectors_with_companies_counts`, token);
    if (!resp.ok) {
      console.error('[CRON] Failed to fetch sector list:', resp.status);
      return [];
    }

    const data = await resp.json();
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

// Fetch all data for a single sector directly from Xano
async function fetchSectorData(sectorId: string, token: string): Promise<{
  sectorData: unknown;
  splitDatasets: {
    marketMap: unknown;
    strategic: unknown;
    pe: unknown;
    recentTransactions: unknown;
  };
} | null> {
  const qs = `Sector_id=${sectorId}`;
  
  try {
    // Fetch all 4 endpoints in parallel
    const [sectorResp, marketMapResp, overviewResp, recentResp] = await Promise.all([
      fetchWithTimeout(`${XANO_BASE}/sectors/${sectorId}`, token),
      fetchWithTimeout(`${XANO_BASE}/sectors_market_map?${qs}`, token),
      fetchWithTimeout(`${XANO_BASE}/overview_data?${qs}`, token),
      fetchWithTimeout(`${XANO_BASE}/sectors_resent_trasnactions?${qs}&top_15=true`, token),
    ]);

    // Parse responses
    const sectorData = sectorResp.ok ? await sectorResp.json() : null;
    const marketMapData = marketMapResp.ok ? await marketMapResp.json() : null;
    const overviewData = overviewResp.ok ? await overviewResp.json() : null;
    const recentData = recentResp.ok ? await recentResp.json() : null;

    // Extract market map from response structure
    const marketMap = marketMapData?.market_map ?? marketMapData;

    return {
      sectorData,
      splitDatasets: {
        marketMap,
        strategic: overviewData?.strategic_acquirers ?? null,
        pe: overviewData?.pe_investors ?? null,
        recentTransactions: recentData,
      },
    };
  } catch (error) {
    console.error(`[CRON] Error fetching sector ${sectorId}:`, error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  // No auth required - cache warming is not sensitive
  // Vercel cron will call this automatically every 2 hours
  void request; // Acknowledge request param
  
  const startTime = performance.now();
  const results: { sectorId: string; status: string; ms: number }[] = [];

  // Step 1: Authenticate with Xano to get auth token
  const authToken = await getAuthToken();
  
  if (!authToken) {
    return NextResponse.json({
      success: false,
      error: 'Failed to authenticate with Xano. Check CRON_AUTH_EMAIL and CRON_AUTH_PASSWORD env vars.',
    }, { status: 500 });
  }

  // Step 2: Fetch all sector IDs
  console.log('[CRON] 📋 Fetching sector list from Xano...');
  const sectorIds = await fetchSectorIds(authToken);
  
  if (sectorIds.length === 0) {
    return NextResponse.json({
      success: false,
      error: 'No sectors found to warm',
    }, { status: 500 });
  }

  console.log(`[CRON] 🔄 Starting standalone cache warm for ${sectorIds.length} sectors...`);

  // Step 3: Fetch and cache data for each sector
  for (const sectorId of sectorIds) {
    const sectorStart = performance.now();
    
    try {
      // Fetch all data directly from Xano
      const data = await fetchSectorData(sectorId, authToken);
      
      if (data) {
        // Store in cache (same format as API route returns)
        await setCachedSectorData(sectorId, {
          ...data,
          timings: { cachedByCron: true },
          serverFetchTime: Math.round(performance.now() - sectorStart),
        });
        
        const ms = Math.round(performance.now() - sectorStart);
        results.push({ sectorId, status: 'success', ms });
        console.log(`[CRON] ✅ Sector ${sectorId} cached in ${ms}ms`);
      } else {
        const ms = Math.round(performance.now() - sectorStart);
        results.push({ sectorId, status: 'failed (no data)', ms });
        console.log(`[CRON] ⚠️ Sector ${sectorId} returned no data`);
      }
      
      // Small delay to be nice to Xano
      await new Promise(resolve => setTimeout(resolve, 200));
      
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
  const successCount = results.filter(r => r.status === 'success').length;
  
  console.log(`[CRON] 🏁 Cache warm completed: ${successCount}/${sectorIds.length} sectors in ${totalMs}ms`);

  return NextResponse.json({
    success: true,
    totalMs,
    sectorsTotal: sectorIds.length,
    sectorsWarmed: successCount,
    sectorsFailed: sectorIds.length - successCount,
    results,
  });
}
