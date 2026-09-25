"use client";

import AppLeftNav from "./AppLeftNav";
import { NavOpenProvider } from "./NavOpenContext";
import GlobalSearchBar from "@/components/search/GlobalSearchBar";

/** Replaces the old top <Header/> nav: a persistent left sidebar + page content. */
export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NavOpenProvider>
      <div className="flex h-screen min-h-0 overflow-hidden">
        <AppLeftNav />
        <div
          className="ax-app-shell-scroll flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden pt-14 md:pt-0"
        >
          <div
            className="sticky top-0 z-40 hidden shrink-0 items-center px-4 pb-3 pt-4 sm:px-6 sm:pt-6 md:flex"
            style={{ background: "var(--ax-app-canvas, #f5f7fd)" }}
          >
            <GlobalSearchBar />
          </div>
          <div className="ax-app-shell-main">{children}</div>
        </div>
      </div>
    </NavOpenProvider>
  );
}
