import { useState, useEffect, useCallback } from "react";
import type { InvestorData } from "@/types/investor";

export const useInvestorData = (investorId: string) => {
  const [investorData, setInvestorData] = useState<InvestorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvestorData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("asymmetrix_auth_token");

      const params = new URLSearchParams();
      params.append("new_comp_id", investorId);

      const response = await fetch(
        `https://xdil-abvj-o7rq.e2.xano.io/api:y4OAXSVm/get_the_investor_new_company?${params.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          credentials: "include",
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Investor not found");
        }
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data: InvestorData = await response.json();
      setInvestorData(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch investor data"
      );
      console.error("Error fetching investor data:", err);
    } finally {
      setLoading(false);
    }
  }, [investorId]);

  useEffect(() => {
    if (investorId) {
      fetchInvestorData();
    }
  }, [fetchInvestorData, investorId]);

  return {
    investorData,
    loading,
    error,
    refetch: fetchInvestorData,
  };
};
