"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  consumeEntrySource,
  setEntrySource,
  setLastPageEntrySource,
  trackPageView,
  type EntrySource,
} from "@/lib/tracking";

const CLICK_SOURCES: readonly EntrySource[] = [
  "left_menu",
  "global_search",
  "dashboard",
  "company_profile",
  "other_section",
];

/**
 * Records where a navigation came from. Containers declare it with
 * `data-entry-source="left_menu" | "global_search" | "dashboard" | "company_profile"`; the nearest
 * one wins. Any other internal link click counts as `other_section`. The next page view reads it.
 */
function useEntrySourceClicks() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      try {
        const target = e.target as Element | null;
        if (!target?.closest) return;
        const container = target.closest<HTMLElement>("[data-entry-source]");
        const declared = container?.dataset.entrySource as EntrySource | undefined;
        if (declared && CLICK_SOURCES.includes(declared)) {
          setEntrySource(declared);
          return;
        }
        const anchor = target.closest<HTMLAnchorElement>("a[href]");
        if (!anchor || anchor.target === "_blank") return;
        const url = new URL(anchor.href, window.location.href);
        if (url.origin === window.location.origin) setEntrySource("other_section");
      } catch {
        // never break navigation for analytics
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
}

export default function RouteTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const lastKeyRef = useRef<string>("");
  const lastUserIdRef = useRef<number>(-1);

  useEntrySourceClicks();

  useEffect(() => {
    const key = `${pathname}?${searchParams?.toString() ?? ""}`;
    const userId = user?.id ? Number.parseInt(user.id, 10) : 0;
    const safeUserId = Number.isFinite(userId) ? userId : 0;
    if (key === lastKeyRef.current && lastUserIdRef.current === safeUserId)
      return;
    lastKeyRef.current = key;
    lastUserIdRef.current = safeUserId;
    // Always consume so a stale stored source never leaks into a later page view.
    const stored = consumeEntrySource();
    const entrySource: EntrySource =
      searchParams?.get("src") === "daily_email" ? "daily_email" : stored;
    setLastPageEntrySource(entrySource);
    trackPageView(safeUserId, entrySource);
  }, [pathname, searchParams, user]);

  return null;
}
