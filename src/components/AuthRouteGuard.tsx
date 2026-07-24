"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { GET_ACCESS_PATH } from "@/lib/prospect";
import { MCP_GUEST_PUBLIC_PATHS } from "@/lib/mcpGuest";

// Routes that should remain accessible even when the user is not authenticated
// or their token has expired.
const PUBLIC_PATHS = [
  "/",
  "/about-us",
  "/login",
  "/trial-expired",
  "/forgot-password",
  "/reset-password",
  GET_ACCESS_PATH,
  "/access-denied",
  "/contributor-crm",
  ...MCP_GUEST_PUBLIC_PATHS,
];

export default function AuthRouteGuard() {
  const { isAuthenticated, isContributor, isProspect, loading, setShowLoginModal } =
    useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || loading) return;

    const isPublicPath = PUBLIC_PATHS.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    );

    // Show the login modal overlay instead of redirecting, so the user stays
    // on the page they came from (e.g. via an email alert link) and can sign
    // in without losing their context.
    setShowLoginModal(
      !isPublicPath && !isAuthenticated && !isContributor && !isProspect
    );
  }, [pathname, isAuthenticated, isContributor, isProspect, loading, setShowLoginModal]);

  return null;
}


