import { NextRequest, NextResponse } from 'next/server';
import {
  clearCachedWarmSectorIds,
  getCachedWarmSectorIds,
  setCachedWarmSectorIds,
} from '@/lib/sector-cache';
import {
  fetchSectorIds,
  resolveAuthToken,
  triggerWarmContinuation,
  warmSectorsUntilDeadline,
  WARM_TIME_BUDGET_MS,
} from './_lib';

// This route does real work (network + caching) and must never be pre-rendered at build time.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Allow up to 5 minutes per batch (Vercel Pro). Large sector counts chain via ?continuation=1.
export const maxDuration = 300;

const CRON_MANUAL_SECRET = process.env.CRON_MANUAL_SECRET;

export async function GET(request: NextRequest) {
  const force =
    request.nextUrl.searchParams.get('force') === '1' ||
    request.nextUrl.searchParams.get('force') === 'true';
  const isContinuation = request.nextUrl.searchParams.get('continuation') === '1';
  const startIndex = Math.max(
    0,
    Number.parseInt(request.nextUrl.searchParams.get('startIndex') ?? '0', 10) || 0
  );

  if (force) {
    const provided = request.headers.get('x-cron-manual-secret') ?? '';
    if (!CRON_MANUAL_SECRET || provided !== CRON_MANUAL_SECRET) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
  } else if (isContinuation && CRON_MANUAL_SECRET) {
    const provided = request.headers.get('x-cron-manual-secret') ?? '';
    if (provided !== CRON_MANUAL_SECRET) {
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

    if (!force && !isContinuation && londonHour !== 6) {
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
  const deadlineAt = Date.now() + WARM_TIME_BUDGET_MS;

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

  // Step 2: Resolve sector IDs (reuse cached list on continuation batches)
  let sectorIds: string[] | null = null;
  let sectorListError: string | undefined;

  if (isContinuation || startIndex > 0) {
    sectorIds = await getCachedWarmSectorIds();
    if (sectorIds?.length) {
      console.log(
        `[CRON] 📋 Using cached sector list (${sectorIds.length} sectors, startIndex=${startIndex})`
      );
    }
  }

  if (!sectorIds?.length) {
    console.log('[CRON] 📋 Fetching sector list from Xano...');
    const fetched = await fetchSectorIds(authToken);
    sectorIds = fetched.ids;
    sectorListError = fetched.error;
    if (sectorIds.length > 0) {
      await setCachedWarmSectorIds(sectorIds);
    }
  }

  if (!sectorIds.length) {
    return NextResponse.json(
      { success: false, error: sectorListError ?? 'No sectors found to warm' },
      { status: 500 }
    );
  }

  if (startIndex >= sectorIds.length) {
    await clearCachedWarmSectorIds();
    return NextResponse.json({
      success: true,
      partial: false,
      message: 'All sectors already warmed',
      sectorsTotal: sectorIds.length,
      startIndex,
      sectorsWarmed: 0,
      sectorsFailed: 0,
      results: [],
    });
  }

  console.log(
    `[CRON] 🔄 Warming sectors ${startIndex + 1}-${sectorIds.length} of ${sectorIds.length} ` +
      `(budget ${WARM_TIME_BUDGET_MS}ms)...`
  );

  // Step 3: Warm as many sectors as fit within the time budget
  const concurrency = Math.min(
    Math.max(Number(process.env.CRON_WARM_CONCURRENCY ?? 4), 1),
    8
  );

  const { results, nextIndex } = await warmSectorsUntilDeadline(
    sectorIds,
    startIndex,
    deadlineAt,
    authToken,
    concurrency
  );

  const hasMore = nextIndex < sectorIds.length;
  if (hasMore) {
    triggerWarmContinuation(request.nextUrl.origin, nextIndex, CRON_MANUAL_SECRET);
  } else {
    await clearCachedWarmSectorIds();
  }

  const totalMs = Math.round(performance.now() - startTime);
  const successCount = results.filter((r) => r.status === 'success').length;

  console.log(
    `[CRON] 🏁 Batch completed: ${successCount}/${results.length} sectors in ${totalMs}ms` +
      (hasMore ? ` — continuation at index ${nextIndex}` : ' — all done')
  );

  return NextResponse.json({
    success: true,
    partial: hasMore,
    totalMs,
    sectorsTotal: sectorIds.length,
    startIndex,
    nextIndex,
    sectorsWarmedThisBatch: successCount,
    sectorsFailedThisBatch: results.length - successCount,
    results,
    ...(hasMore
      ? { message: `Warming continues in background from sector index ${nextIndex}` }
      : {}),
  });
}

// Convenience alias: some clients (Postman) might use POST by mistake.
export async function POST(request: NextRequest) {
  return GET(request);
}
