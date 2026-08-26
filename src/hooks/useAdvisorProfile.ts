import { useState, useEffect, useCallback } from "react";
import { advisorService } from "../lib/advisorService";
import { flattenAdvisorTransactionEngagementResults } from "@/lib/normalizeAdvisorDealEvent";
import {
  type AdvisorCorporateEvent,
  type AdvisorResponse,
} from "../types/advisor";

interface UseAdvisorProfileProps {
  advisorId: number;
  dealsPage?: number;
  dealsPageSize?: number;
}

export const DEFAULT_ADVISOR_DEALS_PAGE_SIZE = 3;

export const useAdvisorProfile = ({
  advisorId,
  dealsPage = 1,
  dealsPageSize = DEFAULT_ADVISOR_DEALS_PAGE_SIZE,
}: UseAdvisorProfileProps) => {
  const [advisorData, setAdvisorData] = useState<AdvisorResponse | null>(null);
  const [corporateEvents, setCorporateEvents] =
    useState<AdvisorCorporateEvent[] | null>(null);
  const [dealsTotal, setDealsTotal] = useState(0);
  const [dealsTotalPages, setDealsTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactionEngagements = useCallback(
    async (page: number) => {
      const data = await advisorService.getAdvisorTransactionEngagements(
        advisorId,
        page,
        dealsPageSize
      );
      setCorporateEvents(
        flattenAdvisorTransactionEngagementResults(
          data.results
        ) as AdvisorCorporateEvent[]
      );
      setDealsTotal(data.total);
      setDealsTotalPages(data.total_pages);
      return data;
    },
    [advisorId, dealsPageSize]
  );

  useEffect(() => {
    if (!advisorId || advisorId <= 0) return;

    let cancelled = false;

    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const profile = await advisorService.getAdvisorProfile(advisorId);
        if (!cancelled) setAdvisorData(profile);
      } catch (err) {
        if (!cancelled) {
          const errorMessage =
            err instanceof Error
              ? err.message
              : "An error occurred while fetching data";
          setError(errorMessage);
          console.error("Error fetching advisor profile:", err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [advisorId]);

  useEffect(() => {
    if (!advisorId || advisorId <= 0) return;

    let cancelled = false;

    void (async () => {
      try {
        setDealsLoading(true);
        setError(null);
        await fetchTransactionEngagements(dealsPage);
      } catch (err) {
        if (!cancelled) {
          const errorMessage =
            err instanceof Error
              ? err.message
              : "An error occurred while fetching deals";
          setError(errorMessage);
          console.error("Error fetching advisor transaction engagements:", err);
        }
      } finally {
        if (!cancelled) setDealsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [advisorId, dealsPage, fetchTransactionEngagements]);

  return {
    advisorData,
    corporateEvents,
    dealsTotal,
    dealsTotalPages,
    dealsPageSize,
    loading,
    dealsLoading,
    error,
  };
};
