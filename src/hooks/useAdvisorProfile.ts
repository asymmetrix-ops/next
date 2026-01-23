import { useState, useEffect, useCallback } from "react";
import { advisorService } from "../lib/advisorService";
import {
  type AdvisorCorporateEvent,
  type AdvisorResponse,
  type CorporateEventsResponse,
} from "../types/advisor";

interface UseAdvisorProfileProps {
  advisorId: number;
}

export const useAdvisorProfile = ({ advisorId }: UseAdvisorProfileProps) => {
  const [advisorData, setAdvisorData] = useState<AdvisorResponse | null>(null);
  const [corporateEvents, setCorporateEvents] =
    useState<AdvisorCorporateEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Call both APIs as specified in requirements
      // API 1: get_the_advisor_new_company
      // API 2: get_advosirs_corporate_ivents_new
      const completeProfile = await advisorService.getAdvisorCompleteProfile(
        advisorId
      );

      setAdvisorData(completeProfile.advisor);
      setCorporateEvents(completeProfile.events?.events || []);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An error occurred while fetching data";
      setError(errorMessage);
      console.error("Error fetching advisor profile:", err);
    } finally {
      setLoading(false);
    }
  }, [advisorId]);

  useEffect(() => {
    if (advisorId && advisorId > 0) {
      fetchData();
    }
  }, [advisorId, fetchData]);

  return {
    advisorData,
    corporateEvents,
    loading,
    error,
    refetch: fetchData,
  };
};

// Alternative hook for individual API calls if needed
export const useAdvisorIndividualCalls = ({
  advisorId,
}: UseAdvisorProfileProps) => {
  const [advisorData, setAdvisorData] = useState<AdvisorResponse | null>(null);
  const [corporateEvents, setCorporateEvents] =
    useState<AdvisorCorporateEvent[] | null>(null);
  const [loadingAdvisor, setLoadingAdvisor] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [advisorError, setAdvisorError] = useState<string | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);

  // Fetch advisor profile separately
  const fetchAdvisorProfile = useCallback(async () => {
    try {
      setLoadingAdvisor(true);
      setAdvisorError(null);
      const data = await advisorService.getAdvisorProfile(advisorId);
      setAdvisorData(data);
    } catch (err) {
      setAdvisorError(
        err instanceof Error ? err.message : "Failed to fetch advisor profile"
      );
    } finally {
      setLoadingAdvisor(false);
    }
  }, [advisorId]);

  // Fetch corporate events separately
  const fetchCorporateEvents = useCallback(async () => {
    try {
      setLoadingEvents(true);
      setEventsError(null);
      const data: CorporateEventsResponse = await advisorService.getCorporateEvents(
        advisorId
      );
      setCorporateEvents(data?.events || []);
    } catch (err) {
      setEventsError(
        err instanceof Error ? err.message : "Failed to fetch corporate events"
      );
    } finally {
      setLoadingEvents(false);
    }
  }, [advisorId]);

  useEffect(() => {
    if (advisorId && advisorId > 0) {
      fetchAdvisorProfile();
      fetchCorporateEvents();
    }
  }, [advisorId, fetchAdvisorProfile, fetchCorporateEvents]);

  return {
    advisorData,
    corporateEvents,
    loadingAdvisor,
    loadingEvents,
    loading: loadingAdvisor || loadingEvents,
    advisorError,
    eventsError,
    error: advisorError || eventsError,
    refetchAdvisor: fetchAdvisorProfile,
    refetchEvents: fetchCorporateEvents,
  };
};
