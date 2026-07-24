"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { NavHeader } from "@/components/contributor-crm/NavHeader";
import { useAuth } from "@/components/contributor-crm/providers/AuthProvider";
import {
  authService,
  isAdminUser,
  syncAdminSessionFromMainApp,
} from "@/lib/contributorCrm/auth";
import { trackError, trackLogin } from "@/lib/tracking";

function TeamLoginPageInner() {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [checkingExistingSession, setCheckingExistingSession] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    const bootstrapSession = async () => {
      const requestedRedirect = searchParams.get("redirect");
      const safeRedirect =
        requestedRedirect &&
        requestedRedirect.startsWith("/contributor-crm/internal-crm")
          ? requestedRedirect
          : "/contributor-crm/internal-crm";

      const synced = await syncAdminSessionFromMainApp();
      if (cancelled) return;

      const user = authService.getUser();
      if ((synced || (authService.getAuthToken() && user && isAdminUser(user))) && user) {
        router.replace(safeRedirect);
        return;
      }

      setCheckingExistingSession(false);
    };

    void bootstrapSession();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(formData.email, formData.password);
      const user = authService.getUser();
      const userId = Number(user?.id) || 0;
      const requestedRedirect = searchParams.get("redirect");
      const safeRedirect =
        requestedRedirect &&
        requestedRedirect.startsWith("/contributor-crm/internal-crm")
          ? requestedRedirect
          : null;
      trackLogin(userId);
      toast.success("Login successful!");
      router.replace(
        isAdminUser(user) ? safeRedirect ?? "/contributor-crm/internal-crm" : "/contributor-crm/home-user"
      );
    } catch (err) {
      trackError(`Login failed: ${(err as Error)?.message || "unknown"}`);
      toast.error("Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="min-h-screen bg-[#F9FAFC]">
      <NavHeader />

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        {checkingExistingSession ? (
          <div className="text-sm text-gray-500">Checking session…</div>
        ) : (
        <div className="px-6 w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-gray-900">Team Login</h1>
            <p className="text-gray-600">Access the internal Asymmetrix dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block mb-2 text-sm font-medium text-gray-700"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-3 w-full font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Signing in..." : "Login"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-500">
            Client? <Link href="/contributor-crm/login" className="font-medium text-blue-600 hover:text-blue-700">Log in here</Link>.
          </p>
        </div>
        )}
      </div>
    </div>
  );
}

export default function TeamLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F9FAFC] text-sm text-gray-500">
          Loading...
        </div>
      }
    >
      <TeamLoginPageInner />
    </Suspense>
  );
}
