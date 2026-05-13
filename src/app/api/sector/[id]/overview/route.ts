import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 300; // Cache for 5 minutes

const XANO_BASE = 'https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV:develop';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = performance.now();
  const sectorId = params.id;

  console.log(`[API] 🚀 Fetching overview data for sector ${sectorId}`);

  try {
    const cookieStore = cookies();
    const token = cookieStore.get('asymmetrix_auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    const qs = new URLSearchParams();
    qs.append('Sector_id', sectorId);
    const strategicQs = new URLSearchParams();
    strategicQs.append('Sector_id', sectorId);
    strategicQs.append('limit', '5');
    strategicQs.append('offset', '0');
    const peQs = new URLSearchParams();
    peQs.append('Sector_id', sectorId);
    peQs.append('limit', '5');
    peQs.append('offset', '0');

    // Fetch all overview data in parallel
    const [sectorRes, marketMapRes, strategicRes, peRes, recentRes] =
      await Promise.all([
        fetch(`${XANO_BASE}/sectors/${sectorId}`, {
          method: 'GET',
          headers: authHeaders,
          cache: 'no-store',
        }),
        fetch(`${XANO_BASE}/sectors_market_map?${qs.toString()}`, {
          method: 'GET',
          headers: authHeaders,
          cache: 'no-store',
        }),
        // Strategic acquirers — paginated GET endpoint, limit 5 for overview
        fetch(`${XANO_BASE}/sectors_strategic_acquirers?${strategicQs.toString()}`, {
          method: 'GET',
          headers: authHeaders,
          cache: 'no-store',
        }),
        fetch(`${XANO_BASE}/sectors_pe_investors?${peQs.toString()}`, {
          method: 'GET',
          headers: authHeaders,
          cache: 'no-store',
        }),
        fetch(`${XANO_BASE}/sectors_resent_trasnactions?${qs.toString()}&top_15=true`, {
          method: 'GET',
          headers: authHeaders,
          cache: 'no-store',
        }),
      ]);

    const [sectorData, marketMap, strategic, pe, recentTransactions] =
      await Promise.all([
        sectorRes.ok ? sectorRes.json() : null,
        marketMapRes.ok ? marketMapRes.json() : null,
        strategicRes.ok ? strategicRes.json() : null,
        peRes.ok ? peRes.json() : null,
        recentRes.ok ? recentRes.json() : null,
      ]);

    const totalTime = performance.now() - startTime;
    console.log(`[API] ✅ Overview data fetched in ${totalTime.toFixed(0)}ms`);

    return NextResponse.json({
      sectorData,
      splitDatasets: {
        marketMap,
        strategic,
        pe,
        recentTransactions,
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
