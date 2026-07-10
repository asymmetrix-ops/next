"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  MCP_GUEST_ALLOWED_PATH,
  MCP_GUEST_LOGIN_PATH,
} from "@/lib/mcpGuest";

export default function TrialRouteGuard() {
  const { isTrialActive, isTrialExpired, isTrial, isMcpGuest, loading } =
    useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!pathname || loading) return;

    if (isMcpGuest) {
      if (pathname === MCP_GUEST_LOGIN_PATH) {
        router.replace(MCP_GUEST_ALLOWED_PATH);
        return;
      }

      const isAllowedPath = pathname === MCP_GUEST_ALLOWED_PATH;
      const isCompanyDetailPath =
        /^\/company\//.test(pathname) || /^\/new_company\//.test(pathname);

      if (!isAllowedPath || isCompanyDetailPath) {
        router.replace(MCP_GUEST_ALLOWED_PATH);
      }
      return;
    }

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
  }, [
    isTrial,
    isTrialExpired,
    isTrialActive,
    isMcpGuest,
    loading,
    pathname,
    router,
  ]);

  return null;
}
