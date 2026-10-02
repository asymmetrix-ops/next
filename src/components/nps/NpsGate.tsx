"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { npsService } from "@/lib/npsService";
import NpsModal from "@/components/nps/NpsModal";

/**
 * Route prefixes considered "platform" pages (logged-in app: list + entity
 * views). The NPS modal must never show on public/marketing pages (landing,
 * about-us, login, etc.) even if the visitor happens to be authenticated.
 */
const PLATFORM_PATH_PREFIXES = [
  "/home-user",
  "/companies",
  "/company",
  "/new_company",
  "/advisors",
  "/advisor",
  "/investors",
  "/investor",
  "/individuals",
  "/individual",
  "/sectors",
  "/sector",
  "/sub-sector",
  "/corporate-events",
  "/corporate-event",
  "/deal-radar",
  "/financial-intelligence",
  "/financial-metrics",
  "/financials",
  "/financials-tsx",
  "/benchmarking",
  "/my-portfolio",
  "/my-info",
  "/settings",
  "/insights-analysis",
  "/article",
];

/** Internal team accounts are excluded from NPS tracking. */
const INTERNAL_EMAIL_DOMAIN = "@asymmetrixintelligence.com";
/** AuthProvider uses this placeholder until the real profile has loaded. */
const PLACEHOLDER_EMAIL = "user@example.com";

function isInternalEmail(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase().endsWith(INTERNAL_EMAIL_DOMAIN);
}

function isPlatformPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return PLATFORM_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * Mounted once near the root of the app. On every successful login it checks
 * NPS eligibility with the backend and shows the NPS modal if eligible —
 * but only while the user is on a platform (list/entity view) page, never on
 * public/marketing pages. All cadence / account-age / opt-out logic lives
 * server-side — this component is intentionally thin.
 */
export default function NpsGate() {
  const { isAuthenticated, loading, isMcpGuest, isContributor, user } = useAuth();
  const userEmail = user?.email?.trim().toLowerCase() ?? "";
  const isInternalUser = isInternalEmail(userEmail);
  const pathname = usePathname();
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

    // Wait for the real profile (AuthProvider uses a placeholder email at first),
    // then never check or show NPS for internal team accounts.
    if (!userEmail || userEmail === PLACEHOLDER_EMAIL) return;
    if (isInternalUser) return;

    // Never check/show on public/marketing pages, even if authenticated.
    if (!isPlatformPath(pathname)) return;

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
  }, [
    isAuthenticated,
    loading,
    isMcpGuest,
    isContributor,
    pathname,
    userEmail,
    isInternalUser,
  ]);

  // Close the modal immediately if the user navigates to a non-platform page.
  useEffect(() => {
    if ((!isPlatformPath(pathname) || isInternalUser) && isModalOpen) {
      setIsModalOpen(false);
    }
  }, [pathname, isModalOpen, isInternalUser]);

  return <NpsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />;
}
