import { serverLocationsService } from "@/lib/server-locations";
import { serverDashboardApiService } from "@/lib/server-dashboard";
import FinancialMetricsTable from "./FinancialMetricsTable";
import type { FinancialMetricsRow } from "./FinancialMetricsTable";

export default async function FinancialMetricsTableServer() {
  // Fetch initial data on the server
  const [countries, primarySectors, initialMetrics] = await Promise.all([
    serverLocationsService.getCountries().catch(() => []),
    serverLocationsService.getPrimarySectors().catch(() => []),
    serverDashboardApiService.getFinancialMetrics().catch(() => []),
  ]);

  // Sort initial metrics by range_order
  const sortedMetrics: FinancialMetricsRow[] = Array.isArray(initialMetrics)
    ? [...initialMetrics].sort((a, b) => (a.range_order ?? 0) - (b.range_order ?? 0))
    : [];

  return (
    <FinancialMetricsTable
      initialCountries={countries}
      initialPrimarySectors={primarySectors}
      initialMetrics={sortedMetrics}
    />
  );
}

