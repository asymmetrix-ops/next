"use client";

import { useEffect, useState } from "react";
import AsymIQButton from "@/components/AsymIQButton";
import { useAuth } from "@/components/providers/AuthProvider";

const FLAG_KEY = "asymiq_enabled";

/**
 * Floating AsymIQ launcher, mounted once in the root layout so the conversation survives
 * navigation (entity chips, "View results" links). Test gate: visit any page with ?asymiq=1 to
 * enable it in this browser (?asymiq=0 disables it). Only shown to signed-in, non-guest users.
 */
export default function AsymIQLauncher() {
  const { isAuthenticated, isMcpGuest } = useAuth();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    try {
      const param = new URLSearchParams(window.location.search).get("asymiq");
      if (param === "1") localStorage.setItem(FLAG_KEY, "1");
      if (param === "0") localStorage.removeItem(FLAG_KEY);
      setEnabled(localStorage.getItem(FLAG_KEY) === "1");
    } catch {
      setEnabled(false);
    }
  }, []);

  if (!enabled || !isAuthenticated || isMcpGuest) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      <AsymIQButton />
    </div>
  );
}
