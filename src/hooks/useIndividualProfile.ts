import { useState, useEffect, useCallback } from "react";
import { individualService } from "../lib/individualService";
import {
  IndividualResponse,
  IndividualEventsResponse,
} from "../types/individual";

interface UseIndividualProfileProps {
  individualId: number;
}

export const useIndividualProfile = ({
  individualId,
}: UseIndividualProfileProps) => {
  const [profileData, setProfileData] = useState<IndividualResponse | null>(
    null
  );
  const [eventsData, setEventsData] = useState<IndividualEventsResponse | null>(
    null
  );
  const [individualName, setIndividualName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Call all three APIs as specified
      const completeProfile =
        await individualService.getIndividualCompleteProfile(individualId);

      setProfileData(completeProfile.profile);
      setEventsData(completeProfile.events);
      setIndividualName(completeProfile.name);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An error occurred while fetching data";
      setError(errorMessage);
      console.error("Error fetching individual profile:", err);
    } finally {
      setLoading(false);
    }
  }, [individualId]);

  useEffect(() => {
    if (individualId && individualId > 0) {
      fetchData();
    }
  }, [individualId, fetchData]);

  return {
    profileData,
    eventsData,
    individualName,
    loading,
    error,
    refetch: fetchData,
  };
};
