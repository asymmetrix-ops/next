"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";

// Routes that should remain accessible even when the user is not authenticated
// or their token has expired.
const PUBLIC_PATHS = ["/", "/about-us", "/login", "/register", "/trial-expired"];

export default function AuthRouteGuard() {
  const { isAuthenticated, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!pathname || loading) return;

    const isPublicPath = PUBLIC_PATHS.includes(pathname);

    // If the user is not authenticated (including when their token has expired
    // and been cleared) and they're not on a public page, always redirect
    // them to the login screen regardless of which specific page they were on.
    if (!isPublicPath && !isAuthenticated) {
      router.replace("/login");
    }
  }, [pathname, isAuthenticated, loading, router]);

  return null;
}


