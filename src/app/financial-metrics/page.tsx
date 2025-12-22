"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import FinancialMetricsTable from "@/components/financial-metrics/FinancialMetricsTable";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function FinancialMetricsPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [router, isAuthenticated, authLoading]);

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full border-b-2 border-blue-600 animate-spin"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full border-b-2 border-red-600 animate-spin"></div>
          <p className="mt-4 text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />

      <main className="px-2 py-4 mx-auto w-full sm:px-4 sm:py-8">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
            Financial Metrics
          </h1>
        </div>

        <FinancialMetricsTable />
      </main>

      <Footer />
    </div>
  );
}

