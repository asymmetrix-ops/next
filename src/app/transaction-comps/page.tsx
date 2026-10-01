"use client";

import AppShell from "@/components/layout/AppShell";
import Footer from "@/components/Footer";
import { TransactionCompsView } from "@/components/transaction-comps/TransactionCompsView";

export default function TransactionCompsPage() {
  return (
    <AppShell>
      <div className="min-h-screen">
        <TransactionCompsView />
        <Footer />
      </div>
    </AppShell>
  );
}
