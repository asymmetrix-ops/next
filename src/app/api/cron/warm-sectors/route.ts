import { NextRequest, NextResponse } from 'next/server';
import { setCachedSectorData } from '@/lib/sector-cache';
import {
  fetchSectorIds,
  fetchSectorData,
  resolveAuthToken,
} from './_lib';

// This route does real work (network + caching) and must never be pre-rendered at build time.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Allow up to 5 minutes for warming all sectors (Vercel Pro)
export const maxDuration = 300;

const CRON_MANUAL_SECRET = process.env.CRON_MANUAL_SECRET;

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
  const force =
    request.nextUrl.searchParams.get('force') === '1' ||
    request.nextUrl.searchParams.get('force') === 'true';
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
    console.warn('[CRON] ⚠️ London time check failed, continuing anyway:', e);
  }

  const startTime = performance.now();
  const results: { sectorId: string; status: string; ms: number }[] = [];

  // Step 1: Resolve a Xano auth token
  const authToken = await resolveAuthToken(request);

  if (!authToken) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Failed to authenticate with Xano. Supply a token via the Authorization: Bearer <token> or x-xano-token header, or set CRON_AUTH_EMAIL and CRON_AUTH_PASSWORD env vars.',
      },
      { status: 500 }
    );
  }

  // Step 2: Fetch all sector IDs
  console.log('[CRON] 📋 Fetching sector list from Xano...');
  const sectorIds = await fetchSectorIds(authToken);

  if (sectorIds.length === 0) {
    return NextResponse.json(
      { success: false, error: 'No sectors found to warm' },
      { status: 500 }
    );
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
        const mm = data.splitDatasets.marketMap as Record<string, unknown>;
        const counts = (mm.counts ?? {}) as Record<string, number | undefined>;
        const publicCompanies  = Array.isArray(mm.public)  ? mm.public  : [];
        const peCompanies      = Array.isArray(mm.pe)      ? mm.pe      : [];
        const vcCompanies      = Array.isArray(mm.vc)      ? mm.vc      : [];
        const privateCompanies = Array.isArray(mm.private) ? mm.private : [];
        console.log(
          `[CRON] 📊 Sector ${sectorId} marketMap: ` +
            `public=${publicCompanies.length}/${counts.public ?? 0}, ` +
            `pe=${peCompanies.length}/${counts.pe ?? 0}, ` +
            `vc=${vcCompanies.length}/${counts.vc ?? 0}, ` +
            `private=${privateCompanies.length}/${counts.private ?? 0}`
        );
        console.log(
          `[CRON] 📊 Sector ${sectorId} strategic=` +
            `${Array.isArray(data.splitDatasets.strategic) ? data.splitDatasets.strategic.length : (data.splitDatasets.strategic ? 'obj' : 'null')}, ` +
            `pe_investors=${Array.isArray(data.splitDatasets.pe) ? data.splitDatasets.pe.length : (data.splitDatasets.pe ? 'obj' : 'null')}, ` +
            `recentTx=${Array.isArray(data.splitDatasets.recentTransactions) ? data.splitDatasets.recentTransactions.length : (data.splitDatasets.recentTransactions ? 'obj' : 'null')}`
        );

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
        await new Promise((resolve) => setTimeout(resolve, 200));
        return { sectorId, status: 'success', ms };
      }

      const ms = Math.round(performance.now() - sectorStart);
      console.warn(`[CRON] ⚠️ Sector ${sectorId} returned no data`);
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
  const successCount = results.filter((r) => r.status === 'success').length;

  console.log(
    `[CRON] 🏁 Cache warm completed: ${successCount}/${sectorIds.length} sectors in ${totalMs}ms`
  );

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
