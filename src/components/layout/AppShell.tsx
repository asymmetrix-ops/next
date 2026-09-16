"use client";

import AppLeftNav from "./AppLeftNav";

/** Replaces the old top <Header/> nav: a persistent left sidebar + page content. */
export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      <AppLeftNav />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
