"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";

// Routes that should remain accessible even when the user is not authenticated
// or their token has expired.
const PUBLIC_PATHS = [
  "/",
  "/about-us",
  "/login",
  "/trial-expired",
  "/forgot-password",
  "/reset-password",
];

export default function AuthRouteGuard() {
  const { isAuthenticated, loading, setShowLoginModal } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || loading) return;

    const isPublicPath = PUBLIC_PATHS.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    );

    // Show the login modal overlay instead of redirecting, so the user stays
    // on the page they came from (e.g. via an email alert link) and can sign
    // in without losing their context.
    setShowLoginModal(!isPublicPath && !isAuthenticated);
  }, [pathname, isAuthenticated, loading, setShowLoginModal]);

  return null;
}


