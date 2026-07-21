"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { authService } from "@/lib/auth";
import { trackPageView } from "@/lib/tracking";

const protectedPatterns: RegExp[] = [
  /^\/company\//,
  /^\/investors\//,
  /^\/individual\//,
  /^\/corporate-event\//,
  /^\/sector\//,
  /^\/article\//,
];

function parseUserId(user: { id?: string } | null | undefined): number {
  if (!user?.id) return 0;
  const parsed = Number.parseInt(String(user.id), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function RouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, loading } = useAuth();
  const lastKeyRef = useRef<string>("");
  const lastUserIdRef = useRef<number>(-1);
  const trackedInitialMountRef = useRef(false);

  useEffect(() => {
    // Wait until auth bootstrap finishes (including optional fetchMe refresh)
    // so hard loads from email links with an existing session are tracked once
    // the user record and auth cookie are fully ready.
    if (loading) return;

    const requiresAuth = protectedPatterns.some((re) => re.test(pathname || ""));

    if (!isAuthenticated) {
      trackedInitialMountRef.current = false;
      if (requiresAuth) return;
    }

    if (isAuthenticated) {
      authService.ensureAuthCookie();
    }

    const key = `${pathname}?${searchParams?.toString() ?? ""}`;
    const safeUserId = isAuthenticated ? parseUserId(user) : 0;

    const routeOrUserChanged =
      key !== lastKeyRef.current || lastUserIdRef.current !== safeUserId;
    const shouldTrackInitialMount =
      isAuthenticated && !trackedInitialMountRef.current;

    if (!shouldTrackInitialMount && !routeOrUserChanged) return;

    if (isAuthenticated) {
      trackedInitialMountRef.current = true;
    }

    lastKeyRef.current = key;
    lastUserIdRef.current = safeUserId;
    trackPageView(safeUserId);
  }, [pathname, searchParams, user, isAuthenticated, loading]);

  return null;
}
