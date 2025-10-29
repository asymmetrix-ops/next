"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";

export default function TrialRouteGuard() {
  const { isTrialActive, isTrialExpired, isTrial } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!pathname) return;

    // If trial expired, redirect to trial-expired page from anywhere
    if (isTrial && isTrialExpired && pathname !== "/trial-expired") {
      router.replace("/trial-expired");
      return;
    }

    if (!isTrialActive) return;
    // Block individual Company and Corporate Event detail pages
    const restrictedPatterns = [/^\/company\//, /^\/corporate-event\//];
    if (restrictedPatterns.some((re) => re.test(pathname))) {
      router.replace("/home-user");
    }
  }, [isTrial, isTrialExpired, isTrialActive, pathname, router]);

  return null;
}
