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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractSectorsList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (isRecord(value)) {
    const sectors = value['sectors'];
    if (Array.isArray(sectors)) return sectors;
    const items = value['items'];
    if (Array.isArray(items)) return items;
  }
  return [];
}

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

// Fetch with timeout (default 60s)
const DEFAULT_FETCH_TIMEOUT_MS = 60000;

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

    const data = out.data;
    const sectors = extractSectorsList(data);

    // Also cache the full sector list for the /sectors list-view.
    try {
      const listPayload = isRecord(data) && Array.isArray(data['sectors']) ? data : { sectors };
      await setCachedSectorsList(listPayload);
      console.log('[CRON] 💾 Sector list cached for list-view');
    } catch (e) {
      console.error('[CRON] ❌ Failed to cache sector list:', e);
    }

    const ids = sectors
      .map((s) => {
        if (!isRecord(s)) return '';
        const id = s['id'];
        const sectorId = s['Sector_id'];
        const val =
          typeof id === 'number' || typeof id === 'string'
            ? id
            : typeof sectorId === 'number' || typeof sectorId === 'string'
              ? sectorId
              : '';
        return String(val);
      })
      .filter((id) => id && id !== 'undefined');
    
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

    // Fetch all 7 endpoints in parallel (no-throw)
    const [sectorOut, mmPublicOut, mmPeOut, mmVcOut, mmPrivateOut, overviewOut, recentOut] = await Promise.all([
      fetchJsonWithTimeout(`${XANO_BASE}/sectors/${sectorId}`, token, timeoutMs, retries),
      fetchJsonWithTimeout(`${XANO_BASE}/sectors_market_map_public?${qs}`, token, timeoutMs, retries),
      fetchJsonWithTimeout(`${XANO_BASE}/sectors_market_map_pe?${qs}`, token, timeoutMs, retries),
      fetchJsonWithTimeout(`${XANO_BASE}/sectors_market_map_vc?${qs}`, token, timeoutMs, retries),
      fetchJsonWithTimeout(`${XANO_BASE}/sectors_market_map_private?${qs}`, token, timeoutMs, retries),
      fetchJsonWithTimeout(`${XANO_BASE}/overview_data?${qs}`, token, timeoutMs, retries),
      fetchJsonWithTimeout(`${XANO_BASE}/sectors_resent_trasnactions?${qs}&top_15=true`, token, timeoutMs, retries),
    ]);

    if (!sectorOut.ok || !mmPublicOut.ok || !mmPeOut.ok || !mmVcOut.ok || !mmPrivateOut.ok || !overviewOut.ok || !recentOut.ok) {
      console.warn(`[CRON] ⚠️ Sector ${sectorId} incomplete fetch`, {
        sector: { ok: sectorOut.ok, status: sectorOut.status, error: sectorOut.error },
        mmPublic: { ok: mmPublicOut.ok, status: mmPublicOut.status, error: mmPublicOut.error },
        mmPe: { ok: mmPeOut.ok, status: mmPeOut.status, error: mmPeOut.error },
        mmVc: { ok: mmVcOut.ok, status: mmVcOut.status, error: mmVcOut.error },
        mmPrivate: { ok: mmPrivateOut.ok, status: mmPrivateOut.status, error: mmPrivateOut.error },
        overview: { ok: overviewOut.ok, status: overviewOut.status, error: overviewOut.error },
        recent: { ok: recentOut.ok, status: recentOut.status, error: recentOut.error },
      });
      return null;
    }

    const sectorData = sectorOut.data;
    const overviewData = overviewOut.data as Record<string, unknown> | null;
    const recentData = recentOut.data;

    const extractCompanies = (data: unknown): unknown[] => {
      if (isRecord(data) && Array.isArray(data['companies'])) return data['companies'] as unknown[];
      if (Array.isArray(data)) return data;
      return [];
    };

    const marketMap = {
      public: extractCompanies(mmPublicOut.data),
      pe: extractCompanies(mmPeOut.data),
      vc: extractCompanies(mmVcOut.data),
      private: extractCompanies(mmPrivateOut.data),
    };

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

// Resolve a Xano auth token: prefer an explicit header, fall back to email/password login.
async function resolveAuthToken(request: NextRequest): Promise<string | null> {
  // Accept a pre-existing Xano token via `x-xano-token` or `Authorization: Bearer <token>`
  const xanoTokenHeader = request.headers.get('x-xano-token');
  if (xanoTokenHeader) {
    console.log('[CRON] 🔑 Using token from x-xano-token header');
    return xanoTokenHeader;
  }

  const authHeader = request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) {
      console.log('[CRON] 🔑 Using token from Authorization header');
      return token;
    }
  }

  // Fall back to email/password credentials
  return getAuthToken();
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

  // Step 1: Resolve a Xano auth token (header-supplied token or email/password login)
  const authToken = await resolveAuthToken(request);
  
  if (!authToken) {
    return NextResponse.json({
      success: false,
      error: 'Failed to authenticate with Xano. Supply a token via the Authorization: Bearer <token> or x-xano-token header, or set CRON_AUTH_EMAIL and CRON_AUTH_PASSWORD env vars.',
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
        const mm = data.splitDatasets.marketMap as Record<string, unknown[]>;
        console.log(`[CRON] 📊 Sector ${sectorId} marketMap: public=${mm.public?.length ?? 0}, pe=${mm.pe?.length ?? 0}, vc=${mm.vc?.length ?? 0}, private=${mm.private?.length ?? 0}`);
        console.log(`[CRON] 📊 Sector ${sectorId} strategic=${Array.isArray(data.splitDatasets.strategic) ? data.splitDatasets.strategic.length : (data.splitDatasets.strategic ? 'obj' : 'null')}, pe_investors=${Array.isArray(data.splitDatasets.pe) ? data.splitDatasets.pe.length : (data.splitDatasets.pe ? 'obj' : 'null')}, recentTx=${Array.isArray(data.splitDatasets.recentTransactions) ? data.splitDatasets.recentTransactions.length : (data.splitDatasets.recentTransactions ? 'obj' : 'null')}`);

        const payload = {
          ...data,
          timings: { cachedByCron: true },
          serverFetchTime: Math.round(performance.now() - sectorStart),
        };
        console.log(`[CRON] 📦 Sector ${sectorId} cache payload keys: ${Object.keys(payload).join(', ')}`);
        console.log(`[CRON] 📦 Sector ${sectorId} splitDatasets keys: ${Object.keys(payload.splitDatasets).join(', ')}`);

        await setCachedSectorData(sectorId, payload);

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
