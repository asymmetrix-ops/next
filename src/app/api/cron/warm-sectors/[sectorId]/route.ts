import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthToken, warmSector } from '../_lib';

// Force dynamic – this route hits Xano and writes to the cache.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Allow up to 60 s for a single-sector warm (well within Vercel's limits).
export const maxDuration = 60;

const CRON_MANUAL_SECRET = process.env.CRON_MANUAL_SECRET;

/**
 * GET /api/cron/warm-sectors/[sectorId]
 *
 * Warms the cache for a single sector.
 *
 * Auth – same options as the bulk endpoint:
 *   • Authorization: Bearer <xano-token>
 *   • x-xano-token: <xano-token>
 *   • CRON_AUTH_EMAIL + CRON_AUTH_PASSWORD env vars (email/password login)
 *
 * Optional header:
 *   • x-cron-manual-secret: <secret>   (required when CRON_MANUAL_SECRET is set)
 *
 * Response:
 *   200 { success: true, sectorId, status, ms }
 *   400 { success: false, error: "Invalid sector ID" }
 *   401 { success: false, error: "Unauthorized" }
 *   500 { success: false, error: "..." }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sectorId: string }> }
) {
  const { sectorId } = await params;

  if (!sectorId || sectorId.trim() === '') {
    return NextResponse.json({ success: false, error: 'Invalid sector ID' }, { status: 400 });
  }

  // Optional secret guard – if CRON_MANUAL_SECRET is configured, callers must supply it.
  const provided = request.headers.get('x-cron-manual-secret') ?? '';
  if (CRON_MANUAL_SECRET && provided !== CRON_MANUAL_SECRET) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Resolve Xano auth token
  const authToken = await resolveAuthToken(request);
  if (!authToken) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Failed to authenticate with Xano. Supply a token via Authorization: Bearer <token> or x-xano-token header, or set CRON_AUTH_EMAIL and CRON_AUTH_PASSWORD env vars.',
      },
      { status: 500 }
    );
  }

  console.log(`[CRON] 🔄 Warming single sector: ${sectorId}`);
  const result = await warmSector(sectorId, authToken);

  const httpStatus = result.status === 'success' ? 200 : 500;

  return NextResponse.json(
    {
      success: result.status === 'success',
      sectorId,
      status: result.status,
      ms: result.ms,
      ...(result.detail ? { detail: result.detail } : {}),
    },
    { status: httpStatus }
  );
}

// Convenience alias for clients that send POST by mistake.
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sectorId: string }> }
) {
  return GET(request, context);
}
