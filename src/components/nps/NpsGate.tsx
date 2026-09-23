"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { npsService } from "@/lib/npsService";
import NpsModal from "@/components/nps/NpsModal";

/**
 * Mounted once near the root of the app. On every successful login it checks
 * NPS eligibility with the backend and shows the NPS modal if eligible.
 * All cadence / account-age / opt-out logic lives server-side — this component
 * is intentionally thin.
 */
export default function NpsGate() {
  const { isAuthenticated, loading, isMcpGuest, isContributor } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const checkedForSessionRef = useRef(false);

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      checkedForSessionRef.current = false;
      return;
    }

    // Skip guest/contributor sessions — they aren't regular users.
    if (isMcpGuest || isContributor) return;

    if (checkedForSessionRef.current) return;
    checkedForSessionRef.current = true;

    let isCancelled = false;

    npsService
      .getEligibility()
      .then((response) => {
        if (isCancelled) return;
        if (response?.eligible) {
          setIsModalOpen(true);
        }
      })
      .catch((error) => {
        console.error("NPS eligibility check failed:", error);
      });

    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated, loading, isMcpGuest, isContributor]);

  return <NpsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />;
}
