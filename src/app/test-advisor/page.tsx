"use client";

import { useState } from "react";
import { useAdvisorProfile } from "../../hooks/useAdvisorProfile";
import { AdvisorOverview } from "../../components/advisor/AdvisorOverview";
import { CorporateEventsTable } from "../../components/advisor/CorporateEventsTable";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { ErrorMessage } from "../../components/ui/ErrorMessage";

export default function TestAdvisorPage() {
  const [advisorId, setAdvisorId] = useState<number>(6927); // Default to Houlihan Lokey
  const [isLoading, setIsLoading] = useState(false);

  const { advisorData, corporateEvents, loading, error } = useAdvisorProfile({
    advisorId,
  });

  const handleTest = () => {
    setIsLoading(true);
    // The hook will automatically fetch data when advisorId changes
    setTimeout(() => setIsLoading(false), 100);
  };

  if (loading || isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Advisor Profile Test</h1>

      {/* Test Controls */}
      <div className="mb-8 p-4 bg-gray-100 rounded">
        <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
        <div className="flex gap-4 items-center">
          <label className="flex items-center gap-2">
            <span>Advisor ID:</span>
            <input
              type="number"
              value={advisorId}
              onChange={(e) => setAdvisorId(parseInt(e.target.value) || 0)}
              className="border px-2 py-1 rounded"
            />
          </label>
          <button
            onClick={handleTest}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Test API Call
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Try different advisor IDs to test the API. Example: 6927 for Houlihan
          Lokey
        </p>
      </div>

      {!advisorData ? (
        <div className="text-center text-gray-500">
          Enter an advisor ID and click &quot;Test API Call&quot; to see the
          results
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded mr-4 flex items-center justify-center">
              <span className="text-white font-bold text-xl">
                {advisorData.Advisor.name.charAt(0)}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold">{advisorData.Advisor.name}</h1>
              <button className="mt-2 bg-red-600 text-white px-4 py-2 rounded text-sm">
                Report Incorrect Data
              </button>
            </div>
          </div>

          {/* Overview Section */}
          <AdvisorOverview advisorData={advisorData} />

          {/* Corporate Events Section */}
          <div className="mt-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Corporate Events</h2>
              <a href="#" className="text-blue-600 hover:underline">
                See more
              </a>
            </div>
            <CorporateEventsTable
              events={corporateEvents?.New_Events_Wits_Advisors || []}
            />
          </div>
        </>
      )}
    </div>
  );
}
