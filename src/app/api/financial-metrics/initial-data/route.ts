import { NextResponse } from "next/server";
import { serverLocationsService } from "@/lib/server-locations";
import { serverDashboardApiService } from "@/lib/server-dashboard";

export async function GET() {
  try {
    // Fetch initial data in parallel
    const [countries, primarySectors, initialMetrics] = await Promise.all([
      serverLocationsService.getCountries().catch(() => []),
      serverLocationsService.getPrimarySectors().catch(() => []),
      serverDashboardApiService.getFinancialMetrics().catch(() => []),
    ]);

    // Sort initial metrics by range_order
    const sortedMetrics = Array.isArray(initialMetrics)
      ? [...initialMetrics].sort((a, b) => (a.range_order ?? 0) - (b.range_order ?? 0))
      : [];

    return NextResponse.json({
      countries,
      primarySectors,
      initialMetrics: sortedMetrics,
    });
  } catch (error) {
    console.error("Error fetching initial data:", error);
    return NextResponse.json(
      {
        countries: [],
        primarySectors: [],
        initialMetrics: [],
      },
      { status: 500 }
    );
  }
}

