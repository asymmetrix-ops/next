// Shared helpers for sector cache-warming routes.
// Used by both the bulk warm-sectors route and the individual [sectorId] route.

import { setCachedSectorData, setCachedSectorsList } from '@/lib/sector-cache';

export const XANO_BASE = 'https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV';
export const XANO_AUTH_URL = 'https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6/auth/login';

const CRON_AUTH_EMAIL = process.env.CRON_AUTH_EMAIL;
const CRON_AUTH_PASSWORD = process.env.CRON_AUTH_PASSWORD;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function extractSectorsList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (isRecord(value)) {
    const sectors = value['sectors'];
    if (Array.isArray(sectors)) return sectors;
    const items = value['items'];
    if (Array.isArray(items)) return items;
  }
  return [];
}

export async function getAuthToken(): Promise<string | null> {
  if (!CRON_AUTH_EMAIL || !CRON_AUTH_PASSWORD) {
    console.error('[CRON] ❌ Missing CRON_AUTH_EMAIL or CRON_AUTH_PASSWORD environment variables');
    return null;
  }

  try {
    console.log('[CRON] 🔐 Authenticating with Xano...');
    const resp = await fetch(XANO_AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: CRON_AUTH_EMAIL, password: CRON_AUTH_PASSWORD }),
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
    return token as string;
  } catch (error) {
    console.error('[CRON] ❌ Auth error:', error);
    return null;
  }
}

export function getXanoHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export const DEFAULT_FETCH_TIMEOUT_MS = 60000;

export async function fetchJsonWithTimeout(
  url: string,
  token: string,
  timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
  retries = 1
): Promise<{ ok: boolean; status: number; data: unknown | null; error?: string; ms: number }> {
  const start = performance.now();
  const doAttempt = async (attempt: number): Promise<{ ok: boolean; status: number; data: unknown | null; error?: string; ms: number }> => {
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

export async function fetchSectorIds(token: string): Promise<string[]> {
  try {
    const out = await fetchJsonWithTimeout(
      `${XANO_BASE}/Primary_sectors_with_companies_counts`,
      token,
      DEFAULT_FETCH_TIMEOUT_MS,
      2
    );
    if (!out.ok) {
      console.error('[CRON] Failed to fetch sector list:', out.status, out.error);
      return [];
    }

    const data = out.data;
    const sectors = extractSectorsList(data);

    try {
      const listPayload =
        isRecord(data) && Array.isArray(data['sectors']) ? data : { sectors };
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

export interface SectorFetchResult {
  sectorData: unknown;
  splitDatasets: {
    marketMap: {
      public: unknown[];
      pe: unknown[];
      vc: unknown[];
      private: unknown[];
      counts: {
        public: number;
        pe: number;
        vc: number;
        private: number;
      };
    };
    strategic: unknown;
    pe: unknown;
    recentTransactions: unknown;
  };
}

export async function fetchSectorData(
  sectorId: string,
  token: string
): Promise<SectorFetchResult | null> {
  const qs = `Sector_id=${sectorId}`;

  try {
    const timeoutMs = Math.min(
      Math.max(Number(process.env.CRON_FETCH_TIMEOUT_MS ?? DEFAULT_FETCH_TIMEOUT_MS), 5000),
      120000
    );
    const retries = Math.min(Math.max(Number(process.env.CRON_FETCH_RETRIES ?? 1), 0), 3);

    const [sectorOut, mmPublicOut, mmPeOut, mmVcOut, mmPrivateOut, overviewOut, recentOut] =
      await Promise.all([
        fetchJsonWithTimeout(`${XANO_BASE}/sectors/${sectorId}`, token, timeoutMs, retries),
        fetchJsonWithTimeout(`${XANO_BASE}/sectors_market_map_public?${qs}`, token, timeoutMs, retries),
        fetchJsonWithTimeout(`${XANO_BASE}/sectors_market_map_pe?${qs}`, token, timeoutMs, retries),
        fetchJsonWithTimeout(`${XANO_BASE}/sectors_market_map_vc?${qs}`, token, timeoutMs, retries),
        fetchJsonWithTimeout(`${XANO_BASE}/sectors_market_map_private?${qs}`, token, timeoutMs, retries),
        fetchJsonWithTimeout(`${XANO_BASE}/overview_data?${qs}`, token, timeoutMs, retries),
        fetchJsonWithTimeout(
          `${XANO_BASE}/sectors_resent_trasnactions?${qs}&top_15=true`,
          token,
          timeoutMs,
          retries
        ),
      ]);

    if (
      !sectorOut.ok ||
      !mmPublicOut.ok ||
      !mmPeOut.ok ||
      !mmVcOut.ok ||
      !mmPrivateOut.ok ||
      !overviewOut.ok ||
      !recentOut.ok
    ) {
      console.warn(`[CRON] ⚠️ Sector ${sectorId} incomplete fetch`, {
        sector:   { ok: sectorOut.ok,    status: sectorOut.status,    error: sectorOut.error },
        mmPublic: { ok: mmPublicOut.ok,  status: mmPublicOut.status,  error: mmPublicOut.error },
        mmPe:     { ok: mmPeOut.ok,      status: mmPeOut.status,      error: mmPeOut.error },
        mmVc:     { ok: mmVcOut.ok,      status: mmVcOut.status,      error: mmVcOut.error },
        mmPrivate:{ ok: mmPrivateOut.ok, status: mmPrivateOut.status, error: mmPrivateOut.error },
        overview: { ok: overviewOut.ok,  status: overviewOut.status,  error: overviewOut.error },
        recent:   { ok: recentOut.ok,    status: recentOut.status,    error: recentOut.error },
      });
      return null;
    }

    const extractMarketMapBucket = (
      data: unknown
    ): { companies: unknown[]; totalCount?: number } => {
      if (isRecord(data)) {
        return {
          companies: Array.isArray(data['companies']) ? (data['companies'] as unknown[]) : [],
          totalCount:
            typeof data['total_count'] === 'number' ? data['total_count'] : undefined,
        };
      }
      if (Array.isArray(data)) return { companies: data, totalCount: data.length };
      return { companies: [] };
    };

    const publicBucket  = extractMarketMapBucket(mmPublicOut.data);
    const peBucket      = extractMarketMapBucket(mmPeOut.data);
    const vcBucket      = extractMarketMapBucket(mmVcOut.data);
    const privateBucket = extractMarketMapBucket(mmPrivateOut.data);

    const overviewData = overviewOut.data as Record<string, unknown> | null;

    return {
      sectorData: sectorOut.data,
      splitDatasets: {
        marketMap: {
          public:  publicBucket.companies,
          pe:      peBucket.companies,
          vc:      vcBucket.companies,
          private: privateBucket.companies,
          counts: {
            public:  publicBucket.totalCount  ?? publicBucket.companies.length,
            pe:      peBucket.totalCount      ?? peBucket.companies.length,
            vc:      vcBucket.totalCount      ?? vcBucket.companies.length,
            private: privateBucket.totalCount ?? privateBucket.companies.length,
          },
        },
        strategic:          overviewData?.strategic_acquirers ?? null,
        pe:                 overviewData?.pe_investors         ?? null,
        recentTransactions: recentOut.data,
      },
    };
  } catch (error) {
    console.error(`[CRON] Error fetching sector ${sectorId}:`, error);
    return null;
  }
}

export async function warmSector(
  sectorId: string,
  token: string
): Promise<{ status: 'success' | 'failed' | 'error'; ms: number; detail?: string }> {
  const start = performance.now();
  try {
    const data = await fetchSectorData(sectorId, token);

    if (!data) {
      const ms = Math.round(performance.now() - start);
      console.warn(`[CRON] ⚠️ Sector ${sectorId} returned no data`);
      return { status: 'failed', ms, detail: 'no data returned from Xano' };
    }

    const mm = data.splitDatasets.marketMap;
    console.log(
      `[CRON] 📊 Sector ${sectorId} marketMap: ` +
        `public=${mm.public.length}/${mm.counts.public}, ` +
        `pe=${mm.pe.length}/${mm.counts.pe}, ` +
        `vc=${mm.vc.length}/${mm.counts.vc}, ` +
        `private=${mm.private.length}/${mm.counts.private}`
    );

    const payload = {
      ...data,
      timings: { cachedByCron: true },
      serverFetchTime: Math.round(performance.now() - start),
    };

    await setCachedSectorData(sectorId, payload);

    const ms = Math.round(performance.now() - start);
    console.log(`[CRON] ✅ Sector ${sectorId} cached in ${ms}ms`);
    return { status: 'success', ms };
  } catch (error) {
    const ms = Math.round(performance.now() - start);
    const detail = error instanceof Error ? error.message : 'unknown';
    console.error(`[CRON] ❌ Sector ${sectorId} failed:`, error);
    return { status: 'error', ms, detail };
  }
}

export async function resolveAuthToken(request: Request): Promise<string | null> {
  const xanoTokenHeader = (request as Request & { headers: Headers }).headers.get('x-xano-token');
  if (xanoTokenHeader) {
    console.log('[CRON] 🔑 Using token from x-xano-token header');
    return xanoTokenHeader;
  }

  const authHeader =
    (request as Request & { headers: Headers }).headers.get('authorization') ??
    (request as Request & { headers: Headers }).headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) {
      console.log('[CRON] 🔑 Using token from Authorization header');
      return token;
    }
  }

  return getAuthToken();
}
