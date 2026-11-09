"use client";

import React from "react";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/Footer";
import { InvestorsListView } from "@/components/investors/InvestorsListView";

export default function InvestorsPage() {
  return (
    <AppShell>
      <div className="min-h-screen">
        <InvestorsListView />
        <Footer />
      </div>
    </AppShell>
  );
}
