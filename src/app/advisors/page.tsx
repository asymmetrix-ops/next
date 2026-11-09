"use client";

import React from "react";
import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/Footer";
import { AdvisorsListView } from "@/components/advisors/AdvisorsListView";

export default function AdvisorsPage() {
  return (
    <AppShell>
      <div className="min-h-screen">
        <AdvisorsListView />
        <Footer />
      </div>
    </AppShell>
  );
}
