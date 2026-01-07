"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/lib/auth";

/**
 * Client-side auth gate for /financial-metrics.
 *
 * This route previously relied on a server-side cookie check, but the app's
 * general auth state is driven by localStorage. We align behavior here to
 * prevent authenticated users from being incorrectly redirected to /login.
 */
export default function FinancialMetricsAuthGate() {
  const router = useRouter();

  useEffect(() => {
    const token = authService.getToken();
    if (!token) router.replace("/login");
  }, [router]);

  return null;
}


