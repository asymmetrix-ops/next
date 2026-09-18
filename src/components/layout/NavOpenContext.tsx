"use client";

import { createContext, useContext, useEffect, useState } from "react";

const NAV_OPEN_STORAGE_KEY = "asymmetrix_nav_open";

type NavOpenContextValue = {
  open: boolean;
  setOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
};

const NavOpenContext = createContext<NavOpenContextValue | null>(null);

function readStoredOpen(): boolean {
  if (typeof window === "undefined") return true;
  const stored = window.localStorage.getItem(NAV_OPEN_STORAGE_KEY);
  return stored === null ? true : stored === "1";
}

/** Shares the left nav's open/collapsed state with page content (e.g. to
 * change a grid's column count when the sidebar is collapsed), and persists
 * it across navigations — AppShell is mounted fresh by every page, so
 * without this the sidebar would snap back open on every route change. */
export function NavOpenProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpenState] = useState<boolean>(readStoredOpen);

  useEffect(() => {
    try {
      window.localStorage.setItem(NAV_OPEN_STORAGE_KEY, open ? "1" : "0");
    } catch {
      // Ignore storage errors (private browsing, quota, etc.).
    }
  }, [open]);

  return (
    <NavOpenContext.Provider value={{ open, setOpen: setOpenState }}>
      {children}
    </NavOpenContext.Provider>
  );
}

/** Defaults to `open: true` outside a NavOpenProvider (e.g. pages without AppShell). */
export function useNavOpen(): NavOpenContextValue {
  const ctx = useContext(NavOpenContext);
  if (ctx) return ctx;
  return { open: true, setOpen: () => {} };
}
