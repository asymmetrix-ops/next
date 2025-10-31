"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { trackPageView } from "@/lib/tracking";

export default function RouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const lastKeyRef = useRef<string>("");

  useEffect(() => {
    const key = `${pathname}?${searchParams?.toString() ?? ""}`;
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    const userId = user?.id ? Number.parseInt(user.id, 10) : 0;
    trackPageView(Number.isFinite(userId) ? userId : 0);
  }, [pathname, searchParams, user]);

  return null;
}
