"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { usePortfolioStore } from "@/store/portfolioStore";

/**
 * Fetches portfolio when user is authenticated.
 * Resets portfolio when user logs out.
 */
export function PortfolioHydrator() {
  const { isAuthenticated } = useAuth();
  const fetchPortfolio = usePortfolioStore((s) => s.fetchPortfolio);
  const reset = usePortfolioStore((s) => s.reset);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPortfolio();
    } else {
      reset();
    }
  }, [isAuthenticated, fetchPortfolio, reset]);

  return null;
}
