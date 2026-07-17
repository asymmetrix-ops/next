"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  ACCESS_DENIED_PATH,
  MCP_GUEST_ALLOWED_PATH,
  MCP_GUEST_CONVERSION_PATH,
  MCP_GUEST_LOGIN_PATH,
  MCP_GUEST_PUBLIC_PATHS,
  MCP_GUEST_SESSION_PATHS,
} from "@/lib/mcpGuest";

function isMcpGuestPublicPath(pathname: string): boolean {
  return MCP_GUEST_PUBLIC_PATHS.some((path) => pathname === path);
}

function isMcpGuestSessionPath(pathname: string): boolean {
  return MCP_GUEST_SESSION_PATHS.some((path) => pathname === path);
}

export default function TrialRouteGuard() {
  const {
    isTrialActive,
    isTrialExpired,
    isTrial,
    isMcpGuest,
    isContributor,
    isAuthenticated,
    loading,
  } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!pathname || loading) return;

    if (isAuthenticated && isContributor) {
      if (pathname !== ACCESS_DENIED_PATH) {
        router.replace(ACCESS_DENIED_PATH);
      }
      return;
    }

    if (isMcpGuestPublicPath(pathname)) {
      if (isAuthenticated && isMcpGuest) {
        router.replace(MCP_GUEST_ALLOWED_PATH);
      }
      return;
    }

    if (isMcpGuest) {
      const isCompanyDetailPath =
        /^\/company\//.test(pathname) || /^\/new_company\//.test(pathname);

      if (isCompanyDetailPath) {
        router.replace(MCP_GUEST_CONVERSION_PATH);
        return;
      }

      if (!isMcpGuestSessionPath(pathname)) {
        router.replace(MCP_GUEST_ALLOWED_PATH);
      }
      return;
    }

    if (
      !isAuthenticated &&
      (pathname === MCP_GUEST_ALLOWED_PATH ||
        pathname === MCP_GUEST_CONVERSION_PATH)
    ) {
      router.replace(MCP_GUEST_LOGIN_PATH);
      return;
    }

    if (isTrial && isTrialExpired && pathname !== "/trial-expired") {
      router.replace("/trial-expired");
      return;
    }

    if (!isTrialActive) return;
    const restrictedPatterns = [/^\/company\//, /^\/corporate-event\//];
    if (restrictedPatterns.some((re) => re.test(pathname))) {
      router.replace("/home-user");
    }
  }, [
    isAuthenticated,
    isContributor,
    isMcpGuest,
    isTrial,
    isTrialExpired,
    isTrialActive,
    loading,
    pathname,
    router,
  ]);

  return null;
}
