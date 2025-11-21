import { serverDashboardApiService } from "@/lib/server-auth";
import SectorDetailPage from "./_components/SectorDetailClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: {
    id: string;
  };
}

async function fetchSectorData(sectorId: string) {
  try {
    const [
      sectorData,
      marketMap,
      strategicAcquirers,
      peInvestors,
      recentTransactions,
    ] = await Promise.all([
      serverDashboardApiService.getSector(sectorId).catch(() => null),
      serverDashboardApiService.getSectorMarketMap(sectorId).catch(() => null),
      serverDashboardApiService.getSectorStrategicAcquirers(sectorId).catch(() => null),
      serverDashboardApiService.getSectorPEInvestors(sectorId).catch(() => null),
      serverDashboardApiService.getSectorRecentTransactions(sectorId).catch(() => null),
    ]);

    return {
      sectorData,
      marketMap,
      strategicAcquirers,
      peInvestors,
      recentTransactions,
    };
  } catch (error) {
    console.error("[Server] Error fetching sector data:", error);
    return {
      sectorData: null,
      marketMap: null,
      strategicAcquirers: null,
      peInvestors: null,
      recentTransactions: null,
    };
  }
}

export default async function SectorPage({ params }: PageProps) {
  const { id } = params;
  
  // Fetch all initial data server-side
  const initialData = await fetchSectorData(id);

  return (
    <SectorDetailPage
      initialSectorData={initialData.sectorData}
      initialMarketMap={initialData.marketMap}
      initialStrategicAcquirers={initialData.strategicAcquirers}
      initialPEInvestors={initialData.peInvestors}
      initialRecentTransactions={initialData.recentTransactions}
    />
  );
}
