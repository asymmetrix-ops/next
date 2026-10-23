"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type GlobalSearchContextType = {
  open: boolean;
  openSearch: () => void;
  closeSearch: () => void;
};

const GlobalSearchContext = createContext<GlobalSearchContextType | undefined>(
  undefined
);

/**
 * Owns the open/closed state for the single, app-wide search modal (rendered
 * once by GlobalSearchModal) and the Cmd/Ctrl+K shortcut to open it. Any
 * trigger anywhere in the tree (sidebar, dashboard hero, …) just calls
 * `openSearch()` from this context instead of managing its own dropdown.
 */
export function GlobalSearchProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const openSearch = useCallback(() => setOpen(true), []);
  const closeSearch = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      if (isMeta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <GlobalSearchContext.Provider value={{ open, openSearch, closeSearch }}>
      {children}
    </GlobalSearchContext.Provider>
  );
}

export function useGlobalSearch(): GlobalSearchContextType {
  const ctx = useContext(GlobalSearchContext);
  if (!ctx) {
    throw new Error("useGlobalSearch must be used within GlobalSearchProvider");
  }
  return ctx;
}
