import { NextRequest, NextResponse } from 'next/server';
import { setCachedSectorData, setCachedSectorsList } from '@/lib/sector-cache';

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
const CRON_MANUAL_SECRET = process.env.CRON_MANUAL_SECRET;

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
const DEFAULT_FETCH_TIMEOUT_MS = 45000;

async function fetchJsonWithTimeout(
  url: string,
  token: string,
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
  retries = 1
): Promise<{ ok: boolean; status: number; data: unknown | null; error?: string; ms: number }> {
  const start = performance.now();
  const doAttempt = async (attempt: number) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: getXanoHeaders(token),
        signal: controller.signal,
        cache: 'no-store',
      });
      const status = res.status;
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        return { ok: false, status, data: null, error: text || `HTTP ${status}`, ms: performance.now() - start };
      }
      const data = await res.json().catch(() => null);
      return { ok: true, status, data, ms: performance.now() - start };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const isAbort =
        e instanceof DOMException ? e.name === 'AbortError' : msg.toLowerCase().includes('aborted');
      const canRetry = attempt < retries;
      if (canRetry) {
        // small backoff
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
        return doAttempt(attempt + 1);
      }
      return {
        ok: false,
        status: 0,
        data: null,
        error: isAbort ? `timeout after ${timeoutMs}ms` : msg,
        ms: performance.now() - start,
      };
    } finally {
      clearTimeout(timeout);
    }
  };

  return doAttempt(0);
}

// Fetch list of sector IDs from Xano
async function fetchSectorIds(token: string): Promise<string[]> {
  try {
    const out = await fetchJsonWithTimeout(`${XANO_BASE}/Primary_sectors_with_companies_counts`, token, DEFAULT_FETCH_TIMEOUT_MS, 2);
    if (!out.ok) {
      console.error('[CRON] Failed to fetch sector list:', out.status, out.error);
      return [];
    }

    const data = out.data as any;
    const sectors = Array.isArray(data) ? data : (data?.sectors || data?.items || []);

    // Also cache the full sector list for the /sectors list-view.
    try {
      const listPayload = Array.isArray(data) ? { sectors } : (data?.sectors ? data : { sectors });
      await setCachedSectorsList(listPayload);
      console.log('[CRON] 💾 Sector list cached for list-view');
    } catch (e) {
      console.error('[CRON] ❌ Failed to cache sector list:', e);
    }

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
    const timeoutMs = Math.min(
      Math.max(Number(process.env.CRON_FETCH_TIMEOUT_MS ?? DEFAULT_FETCH_TIMEOUT_MS), 5000),
      120000
    );
    const retries = Math.min(Math.max(Number(process.env.CRON_FETCH_RETRIES ?? 1), 0), 3);

    // Fetch all 4 endpoints in parallel (no-throw)
    const [sectorOut, marketMapOut, overviewOut, recentOut] = await Promise.all([
      fetchJsonWithTimeout(`${XANO_BASE}/sectors/${sectorId}`, token, timeoutMs, retries),
      fetchJsonWithTimeout(`${XANO_BASE}/sectors_market_map?${qs}`, token, timeoutMs, retries),
      fetchJsonWithTimeout(`${XANO_BASE}/overview_data?${qs}`, token, timeoutMs, retries),
      fetchJsonWithTimeout(`${XANO_BASE}/sectors_resent_trasnactions?${qs}&top_15=true`, token, timeoutMs, retries),
    ]);

    if (!sectorOut.ok || !marketMapOut.ok || !overviewOut.ok || !recentOut.ok) {
      console.warn(`[CRON] ⚠️ Sector ${sectorId} incomplete fetch`, {
        sector: { ok: sectorOut.ok, status: sectorOut.status, error: sectorOut.error },
        market: { ok: marketMapOut.ok, status: marketMapOut.status, error: marketMapOut.error },
        overview: { ok: overviewOut.ok, status: overviewOut.status, error: overviewOut.error },
        recent: { ok: recentOut.ok, status: recentOut.status, error: recentOut.error },
      });
      return null;
    }

    const sectorData = sectorOut.data;
    const marketMapData = marketMapOut.data;
    const overviewData = overviewOut.data as Record<string, unknown> | null;
    const recentData = recentOut.data;

    // Extract market map from response structure
    const marketMap = (marketMapData as any)?.market_map ?? marketMapData;

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

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) return;
      out[i] = await fn(items[i] as T, i);
    }
  };

  await Promise.all(Array.from({ length: Math.max(1, limit) }, worker));
  return out;
}

export async function GET(request: NextRequest) {
  // No auth required - cache warming is not sensitive
  // Vercel cron will call this automatically every 2 hours
  const force = request.nextUrl.searchParams.get('force') === '1' || request.nextUrl.searchParams.get('force') === 'true';
  if (force) {
    const provided = request.headers.get('x-cron-manual-secret') ?? '';
    if (!CRON_MANUAL_SECRET || provided !== CRON_MANUAL_SECRET) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
  }
  
  // Vercel cron schedules are evaluated in UTC. To run "once per day at 06:00 London"
  // (including BST daylight savings), we trigger at 05:00 and 06:00 UTC and only
  // execute the job when it's actually 06:00 in Europe/London.
  try {
    const londonHourStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit',
      hour12: false,
    }).format(new Date());
    const londonHour = Number.parseInt(londonHourStr, 10);

    if (!force && londonHour !== 6) {
      console.log(`[CRON] ⏭️ Skipping warm-sectors (London hour=${londonHourStr})`);
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'Not 06:00 Europe/London',
        force,
        londonHour: londonHourStr,
      });
    }
  } catch (e) {
    // If timezone formatting fails for any reason, do not block cron execution.
    console.warn('[CRON] ⚠️ London time check failed, continuing anyway:', e);
  }

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
  const concurrency = Math.min(
    Math.max(Number(process.env.CRON_WARM_CONCURRENCY ?? 4), 1),
    8
  );

  const perSector = await mapWithConcurrency(sectorIds, concurrency, async (sectorId) => {
    const sectorStart = performance.now();
    try {
      const data = await fetchSectorData(sectorId, authToken);

      if (data) {
        await setCachedSectorData(sectorId, {
          ...data,
          timings: { cachedByCron: true },
          serverFetchTime: Math.round(performance.now() - sectorStart),
        });

        const ms = Math.round(performance.now() - sectorStart);
        console.log(`[CRON] ✅ Sector ${sectorId} cached in ${ms}ms`);
        // Small delay to be nice to Xano (per worker)
        await new Promise((resolve) => setTimeout(resolve, 200));
        return { sectorId, status: 'success', ms };
      }

      const ms = Math.round(performance.now() - sectorStart);
      console.log(`[CRON] ⚠️ Sector ${sectorId} returned no data`);
      await new Promise((resolve) => setTimeout(resolve, 200));
      return { sectorId, status: 'failed (no data)', ms };
    } catch (error) {
      const ms = Math.round(performance.now() - sectorStart);
      console.error(`[CRON] ❌ Sector ${sectorId} failed:`, error);
      await new Promise((resolve) => setTimeout(resolve, 200));
      return {
        sectorId,
        status: `error: ${error instanceof Error ? error.message : 'unknown'}`,
        ms,
      };
    }
  });

  results.push(...perSector);

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

// Convenience alias: some clients (Postman) might use POST by mistake.
export async function POST(request: NextRequest) {
  return GET(request);
}
