"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";

const protectedPatterns: RegExp[] = [
  /^\/company\//,
  /^\/investors\//,
  /^\/individual\//,
  /^\/corporate-event\//,
  /^\/sector\//,
  /^\/article\//,
];

export default function AuthRouteGuard() {
  const { isAuthenticated, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!pathname || loading) return;
    const requiresAuth = protectedPatterns.some((re) => re.test(pathname));
    if (requiresAuth && !isAuthenticated) {
      router.replace("/login");
    }
  }, [pathname, isAuthenticated, loading, router]);

  return null;
}


