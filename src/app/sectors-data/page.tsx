"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { dashboardApiService } from "@/lib/dashboardApi";
import Head from "next/head";

// Types for sectors data
interface Sector {
  id: number;
  sector_name: string;
  Number_of_Companies: number;
  Number_of_PE: number;
  Number_of_VC: number;
  Number_of_Public: number;
  Number_of_Private: number;
}

interface SectorsResponse {
  sectors: Sector[];
}

interface SectorsOverview {
  Primary_sictors_count: number;
  Sub_sectors_count: number;
  top_5: Array<{
    id: number;
    sector_name: string;
    Number_of_Companies: number;
  }>;
}

// Skeleton loading component for better perceived performance
function SkeletonLoader() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Skeleton */}
      <header className="bg-white border-b shadow-sm">
        <div className="px-4 mx-auto w-full">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <div className="w-32 h-8 bg-gray-200 rounded animate-pulse"></div>
              <nav className="hidden space-x-8 md:flex">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="w-20 h-4 bg-gray-200 rounded animate-pulse"
                  ></div>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Content Skeleton */}
      <main className="px-4 py-8 mx-auto w-full">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="mb-4 w-48 h-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="space-y-2">
              <div className="w-64 h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-56 h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="mt-4">
              <div className="mb-2 w-40 h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-96 h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>

          <div className="p-6">
            <div className="mb-4 w-32 h-6 bg-gray-200 rounded animate-pulse"></div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <th key={i} className="px-4 py-3">
                        <div className="w-24 h-3 bg-gray-200 rounded animate-pulse"></div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[1, 2, 3, 4, 5].map((row) => (
                    <tr key={row}>
                      {[1, 2, 3, 4, 5, 6].map((cell) => (
                        <td key={cell} className="px-4 py-3">
                          <div className="w-20 h-3 bg-gray-200 rounded animate-pulse"></div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Optimized sectors content component
function SectorsContent() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [primarySectorsCount, setPrimarySectorsCount] = useState(0);
  const [subSectorsCount, setSubSectorsCount] = useState(0);
  const [topSectors, setTopSectors] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchSectorsData = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch sectors overview data
      const overviewResponse = await dashboardApiService.getSectorsOverview();

      if (overviewResponse.data) {
        const overviewData =
          overviewResponse.data as unknown as SectorsOverview;

        setPrimarySectorsCount(overviewData.Primary_sictors_count);
        setSubSectorsCount(overviewData.Sub_sectors_count);

        const top5Sectors = overviewData.top_5.map(
          (sector) => sector.sector_name
        );
        setTopSectors(top5Sectors);
      }

      // Fetch detailed sectors data
      const sectorsResponse =
        await dashboardApiService.getPrimarySectorsWithCompanyCounts();

      if (sectorsResponse.data) {
        const sectorsData = sectorsResponse.data as unknown as SectorsResponse;

        if (sectorsData.sectors && Array.isArray(sectorsData.sectors)) {
          setSectors(sectorsData.sectors);
        }
      }
    } catch (error) {
      console.error("Error fetching sectors data:", error);
      setError("Failed to load sectors data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchSectorsData();
    }
  }, [isAuthenticated, authLoading, fetchSectorsData]);

  // Show skeleton while loading data
  if (isLoading) {
    return <SkeletonLoader />;
  }

  // Show error state
  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full border-b-2 border-red-600 animate-spin"></div>
          <p className="mb-4 text-red-600">{error}</p>
          <button
            onClick={fetchSectorsData}
            className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="px-4 mx-auto w-full">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/home-user" className="flex items-center">
                <img
                  src="https://www.asymmetrixintelligence.com/images/logo.svg?_wwcv=682"
                  alt="Asymmetrix"
                  className="mr-2 w-auto h-8"
                  loading="eager"
                  fetchPriority="high"
                />
              </Link>

              <nav className="hidden space-x-8 md:flex">
                <Link
                  href="/home-user"
                  className="text-gray-500 hover:text-gray-700"
                >
                  Dashboard
                </Link>
                <button
                  className="text-gray-500 cursor-not-allowed hover:text-gray-700"
                  disabled
                >
                  Companies
                </button>
                <Link
                  href="/sectors-data"
                  className="font-medium text-blue-600"
                >
                  Sectors
                </Link>
                <button
                  className="text-gray-500 cursor-not-allowed hover:text-gray-700"
                  disabled
                >
                  Insights & Analysis
                </button>
                <button
                  className="text-gray-500 cursor-not-allowed hover:text-gray-700"
                  disabled
                >
                  Investors
                </button>
                <button
                  className="text-gray-500 cursor-not-allowed hover:text-gray-700"
                  disabled
                >
                  Advisors
                </button>
                <button
                  className="text-gray-500 cursor-not-allowed hover:text-gray-700"
                  disabled
                >
                  Individuals
                </button>
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-8 mx-auto w-full">
        <div className="bg-white rounded-lg shadow">
          {/* Sectors Summary Section */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="mb-4 text-2xl font-bold text-gray-900">Sectors</h1>

            <div className="mb-4 space-y-2">
              <p className="text-gray-700">
                Primary Sectors:{" "}
                <span className="font-bold">{primarySectorsCount}</span>
              </p>
              <p className="text-gray-700">
                Sub-sectors:{" "}
                <span className="font-bold">{subSectorsCount}</span>
              </p>
            </div>

            <div>
              <p className="mb-2 text-gray-700">Top 5 Primary Sectors:</p>
              <p className="text-gray-600">{topSectors.join(", ")}</p>
            </div>
          </div>

          {/* Primary Sectors Table Section */}
          <div className="p-6">
            <h2 className="mb-4 text-xl font-bold text-gray-900">
              Primary Sectors
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                      Sector name
                    </th>
                    <th className="px-4 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">
                      Number of Companies
                    </th>
                    <th className="px-4 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">
                      Number of Public Companies
                    </th>
                    <th className="px-4 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">
                      Number of PE-owned Companies
                    </th>
                    <th className="px-4 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">
                      Number of VC-owned Companies
                    </th>
                    <th className="px-4 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">
                      Number of Private Companies
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sectors.map((sector) => (
                    <tr key={sector.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-blue-600 underline cursor-pointer">
                        {sector.sector_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {sector.Number_of_Companies}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {sector.Number_of_Public}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {sector.Number_of_PE}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {sector.Number_of_VC}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {sector.Number_of_Private}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SectorsDataPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Show skeleton immediately while auth is loading
  if (authLoading) {
    return <SkeletonLoader />;
  }

  // Show authentication required message
  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full border-b-2 border-red-600 animate-spin"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <link
          rel="preload"
          href="https://www.asymmetrixintelligence.com/images/logo.svg?_wwcv=682"
          as="image"
        />
        <link rel="dns-prefetch" href="https://xdil-abvj-o7rq.e2.xano.io" />
        <link rel="preconnect" href="https://xdil-abvj-o7rq.e2.xano.io" />
      </Head>
      <Suspense fallback={<SkeletonLoader />}>
        <SectorsContent />
      </Suspense>
    </>
  );
}
