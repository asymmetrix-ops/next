import SectorDetailPage from "./_components/SectorDetailClient";
import { serverDashboardApiService } from "@/lib/server-auth";

type PageProps = {
  params: { id: string };
};

// Server-side fetch ONLY for Market Map (fast endpoint, reduces client work).
// Everything else remains client-fetched for best perceived performance.
export default async function SectorPage({ params }: PageProps) {
  let initialMarketMap: unknown = null;
  try {
    const res = await serverDashboardApiService.getSectorMarketMap(params.id);
    // Xano returns: { market_map: { ... } }
    initialMarketMap =
      (res as { market_map?: unknown })?.market_map ?? (res as unknown);
  } catch {
    // Keep rendering; client will still load the rest of the page.
    initialMarketMap = null;
  }

  return <SectorDetailPage initialMarketMap={initialMarketMap} />;
}
