import { redirect } from "next/navigation";
import { serverAuthService } from "@/lib/server-auth";
import FinancialMetricsTableServer from "@/components/financial-metrics/FinancialMetricsTableServer";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default async function FinancialMetricsPage() {
  // Check authentication on the server
  if (!serverAuthService.isAuthenticated()) {
    redirect("/login");
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

        <FinancialMetricsTableServer />
      </main>

      <Footer />
    </div>
  );
}

