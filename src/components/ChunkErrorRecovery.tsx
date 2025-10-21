"use client";

import { useEffect, useRef } from "react";

// Reload once on chunk load failures or script/css load errors
export default function ChunkErrorRecovery() {
  const reloadedRef = useRef(false);

  useEffect(() => {
    // Guard: avoid infinite loops
    try {
      const storageKey = "asx_chunk_reloaded";
      reloadedRef.current = sessionStorage.getItem(storageKey) === "1";

      const markReloaded = () => {
        try {
          sessionStorage.setItem(storageKey, "1");
        } catch {
          // ignore
        }
      };

      const handleWindowError = (event: ErrorEvent) => {
        const message = String(event?.message || "");
        const isChunkError =
          message.includes("ChunkLoadError") ||
          message.includes("Loading chunk");

        if (isChunkError && !reloadedRef.current) {
          markReloaded();
          window.location.reload();
        }
      };

      const handleResourceError = (event: Event) => {
        const target = event.target as HTMLElement | null;
        const src =
          (
            target as HTMLScriptElement | HTMLLinkElement | null
          )?.getAttribute?.("src") ||
          (target as HTMLLinkElement | null)?.href ||
          "";
        const isNextAsset = src.includes("/_next/static/");
        if (isNextAsset && !reloadedRef.current) {
          markReloaded();
          window.location.reload();
        }
      };

      window.addEventListener("error", handleWindowError);
      window.addEventListener("error", handleResourceError, true);

      return () => {
        window.removeEventListener("error", handleWindowError);
        window.removeEventListener("error", handleResourceError, true);
      };
    } catch {
      // Ignore
    }
  }, []);

  return null;
}
