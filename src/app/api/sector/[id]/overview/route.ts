import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 300; // Cache for 5 minutes

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = performance.now();
  const sectorId = params.id;
  
  console.log(`[API] 🚀 Fetching overview data for sector ${sectorId}`);

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

    const qs = new URLSearchParams();
    qs.append('Sector_id', sectorId);

    // Fetch all overview data in parallel ON THE SERVER
    // Track individual API call timings to identify bottleneck
    const fetchStartTime = performance.now();
    
    const sectorStart = performance.now();
    const sectorRes = await fetch(
      `https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV/sectors/${sectorId}`,
      { 
        method: 'GET', 
        headers,
        cache: 'no-store', // Disable caching temporarily to test raw speed
      }
    );
    console.log(`[API] Sector (lightweight) fetch took: ${(performance.now() - sectorStart).toFixed(0)}ms`);

    const mmStart = performance.now();
    const marketMapRes = await fetch(
      `https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV/sectors_market_map?${qs.toString()}`,
      { 
        method: 'GET', 
        headers,
        cache: 'no-store',
      }
    );
    console.log(`[API] Market Map fetch took: ${(performance.now() - mmStart).toFixed(0)}ms`);

    const stratStart = performance.now();
    const strategicRes = await fetch(
      `https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV/sectors_strategic_acquirers?${qs.toString()}`,
      { 
        method: 'GET', 
        headers,
        cache: 'no-store',
      }
    );
    console.log(`[API] Strategic fetch took: ${(performance.now() - stratStart).toFixed(0)}ms`);

    const peStart = performance.now();
    const peRes = await fetch(
      `https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV/sectors_pe_investors?${qs.toString()}`,
      { 
        method: 'GET', 
        headers,
        cache: 'no-store',
      }
    );
    console.log(`[API] PE fetch took: ${(performance.now() - peStart).toFixed(0)}ms`);

    const recentStart = performance.now();
    const recentRes = await fetch(
      `https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV/sectors_resent_trasnactions?${qs.toString()}&top_15=true`,
      { 
        method: 'GET', 
        headers,
        cache: 'no-store',
      }
    );
    console.log(`[API] Recent fetch took: ${(performance.now() - recentStart).toFixed(0)}ms`);
    
    console.log(`[API] All fetches (sequential) took: ${(performance.now() - fetchStartTime).toFixed(0)}ms`);

    // Parse all responses in parallel
    const [sectorData, marketMap, strategic, pe, recentTransactions] = await Promise.all([
      sectorRes.ok ? sectorRes.json() : null,
      marketMapRes.ok ? marketMapRes.json() : null,
      strategicRes.ok ? strategicRes.json() : null,
      peRes.ok ? peRes.json() : null,
      recentRes.ok ? recentRes.json() : null,
    ]);

    const totalTime = performance.now() - startTime;
    console.log(`[API] ✅ Overview data fetched in ${totalTime.toFixed(0)}ms`);
    console.log(`[API]    - Sector: ${sectorData ? 'OK' : 'failed'}`);
    console.log(`[API]    - Market Map: ${marketMap ? 'OK' : 'failed'}`);
    console.log(`[API]    - Strategic: ${strategic ? 'OK' : 'failed'}`);
    console.log(`[API]    - PE: ${pe ? 'OK' : 'failed'}`);
    console.log(`[API]    - Recent: ${recentTransactions ? 'OK' : 'failed'}`);

    // Return everything in one response
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

