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
  const lastUserIdRef = useRef<number>(-1);

  useEffect(() => {
    const key = `${pathname}?${searchParams?.toString() ?? ""}`;
    const userId = user?.id ? Number.parseInt(user.id, 10) : 0;
    const safeUserId = Number.isFinite(userId) ? userId : 0;
    if (key === lastKeyRef.current && lastUserIdRef.current === safeUserId)
      return;
    lastKeyRef.current = key;
    lastUserIdRef.current = safeUserId;
    trackPageView(safeUserId);
  }, [pathname, searchParams, user]);

  return null;
}
