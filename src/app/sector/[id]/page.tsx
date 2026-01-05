import SectorDetailPage from "./_components/SectorDetailClient";
import { cookies } from "next/headers";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { id: string };
};

type ServerPrefetchProps = {
  sectorId: string;
};

async function fetchJsonWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<unknown | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function SectorPrefetchServer({ sectorId }: ServerPrefetchProps) {
  const token = cookies().get("asymmetrix_auth_token")?.value;
  const sectorIdNum = Number(sectorId);

  // If we can't auth (or the id is invalid) on the server, fall back to the existing
  // client logic. This keeps navigation fast instead of blocking server render.
  if (!token || Number.isNaN(sectorIdNum)) {
    return <SectorDetailPage />;
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // IMPORTANT: Do NOT use `next: { revalidate }` here - it causes fetch to hang in production.
  // Use `cache: 'no-store'` for reliable behavior with external APIs.
  const init: RequestInit = {
    method: "GET",
    headers,
    cache: "no-store",
  };

  const qs = new URLSearchParams();
  qs.append("Sector_id", String(sectorIdNum));

  // Cap worst-case navigation stalls by timing out individual endpoints.
  // If something times out, the client island will fetch it progressively.
  const timeoutMs = 3000;
  
  // Use the new aggregated Xano endpoint + recent transactions (not in overview_data)
  // Plus sector details endpoint for thesis etc.
  const [overviewData, initialSectorData, recentData] = await Promise.all([
    fetchJsonWithTimeout(
      `https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV/overview_data?${qs.toString()}`,
      init,
      timeoutMs
    ),
    fetchJsonWithTimeout(
      `https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV/sectors/${sectorId}`,
      init,
      timeoutMs
    ),
    fetchJsonWithTimeout(
      `https://xdil-abvj-o7rq.e2.xano.io/api:xCPLTQnV/sectors_resent_trasnactions?${qs.toString()}&top_15=true`,
      init,
      timeoutMs
    ),
  ]);

  // Extract data from the aggregated response
  const overview = overviewData as Record<string, unknown> | null;
  const initialMarketMap = overview?.market_map ?? null;
  const initialStrategicAcquirers = overview?.strategic_acquirers ?? null;
  const initialPEInvestors = overview?.pe_investors ?? null;
  const initialRecentTransactions = recentData;

  return (
    <SectorDetailPage
      initialSectorData={initialSectorData}
      initialMarketMap={initialMarketMap}
      initialStrategicAcquirers={initialStrategicAcquirers}
      initialPEInvestors={initialPEInvestors}
      initialRecentTransactions={initialRecentTransactions}
    />
  );
}

export default function SectorPage({ params }: PageProps) {
  // Stream a fast fallback immediately; don't block navigation on slow upstream APIs.
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br to-blue-50 from-slate-50">
          <div className="px-6 py-10 text-center text-slate-600">
            Loading sector…
          </div>
        </div>
      }
    >
      <SectorPrefetchServer sectorId={params.id} />
    </Suspense>
  );
}
