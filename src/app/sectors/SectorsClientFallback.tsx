"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { dashboardApiService } from "@/lib/dashboardApi";

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

export default function SectorsClientFallback() {
  const router = useRouter();
  const { isAuthenticated, logout, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [primarySectorsCount, setPrimarySectorsCount] = useState(0);
  const [subSectorsCount, setSubSectorsCount] = useState(0);
  const [topSectors, setTopSectors] = useState<string[]>([]);

  const fetchSectorsData = useCallback(async () => {
    // Don't fetch data if not authenticated
    if (!isAuthenticated) {
      console.log("Sectors page - Not authenticated, skipping data fetch");
      return;
    }

    try {
      setIsLoading(true);

      // Fetch sectors data
      const sectorsResponse =
        await dashboardApiService.getPrimarySectorsWithCompanyCounts();

      if (sectorsResponse.data) {
        const sectorsData = sectorsResponse.data as unknown as SectorsResponse;

        if (sectorsData.sectors && Array.isArray(sectorsData.sectors)) {
          setSectors(sectorsData.sectors);

          // Calculate statistics
          setPrimarySectorsCount(sectorsData.sectors.length);

          // Get top 5 sectors by company count
          const sortedSectors = [...sectorsData.sectors].sort(
            (a, b) => b.Number_of_Companies - a.Number_of_Companies
          );
          const top5Sectors = sortedSectors
            .slice(0, 5)
            .map((sector) => sector.sector_name);
          setTopSectors(top5Sectors);

          // For now, set sub-sectors count to a placeholder value
          // This would need to be fetched from a separate API endpoint
          setSubSectorsCount(762); // Placeholder value from the image
        }
      }
    } catch (error) {
      console.error("Error fetching sectors data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Check authentication on component mount
  useEffect(() => {
    console.log("Sectors page - authLoading:", authLoading);
    console.log("Sectors page - isAuthenticated:", isAuthenticated);

    // Wait for auth context to finish loading
    if (authLoading) {
      console.log("Sectors page - Still loading auth, waiting...");
      return;
    }

    if (!isAuthenticated) {
      console.log("Sectors page - Not authenticated, redirecting to login");
      router.push("/login");
      return;
    }

    console.log("Sectors page - Authenticated, fetching data");
    // Only fetch data if authenticated
    if (isAuthenticated) {
      fetchSectorsData();
    }
  }, [router, fetchSectorsData, isAuthenticated, authLoading]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full border-b-2 border-blue-600 animate-spin"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full border-b-2 border-blue-600 animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading sectors...</p>
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
                <Image
                  src="https://www.asymmetrixintelligence.com/images/logo.svg?_wwcv=682"
                  alt="Asymmetrix"
                  width={120}
                  height={32}
                  priority
                  className="mr-2 w-auto h-8"
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
                <Link href="/sectors" className="font-medium text-blue-600">
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

            <button
              onClick={handleLogout}
              className="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Log out
            </button>
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
