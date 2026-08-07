"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { Suspense } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { authService } from "@/lib/auth";
import { AZURE_SSO_ERROR_MESSAGES } from "@/lib/azureSsoServer";
import { GOOGLE_SSO_ERROR_MESSAGES } from "@/lib/googleSsoServer";
import { CONTRIBUTOR_ACCESS_MESSAGE } from "@/lib/userStatus";
import { trackError, trackLogin } from "@/lib/tracking";
import Image from "next/image";

const SSO_ERROR_MESSAGES = {
  ...AZURE_SSO_ERROR_MESSAGES,
  ...GOOGLE_SSO_ERROR_MESSAGES,
};

function MicrosoftIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 23 23" aria-hidden="true">
      <path fill="#f35325" d="M1 1h10v10H1z" />
      <path fill="#81bc06" d="M12 1h10v10H12z" />
      <path fill="#05a6f0" d="M1 12h10v10H1z" />
      <path fill="#ffba08" d="M12 12h10v10H12z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function LoginPageInner() {
  const { login } = useAuth();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [ssoError, setSsoError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const error = searchParams.get("error") || searchParams.get("sso_error");
    if (!error) return;

    const [code, missingVars] = error.split(":");
    const baseMessage = SSO_ERROR_MESSAGES[code] || error;
    setSsoError(
      missingVars
        ? `${baseMessage} Missing env vars: ${missingVars.replace(/,/g, ", ")}.`
        : baseMessage
    );
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(formData.email, formData.password);
      const userId = Number(authService.getUser()?.id) || 0;
      trackLogin(userId);
      toast.success("Login successful!");
      const safeRedirect =
        redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
          ? redirectTo
          : "/home-user";
      router.push(safeRedirect);
    } catch (err) {
      trackError(`Login failed: ${(err as Error)?.message || "unknown"}`);
      const message = (err as Error)?.message;
      toast.error(
        message === CONTRIBUTOR_ACCESS_MESSAGE
          ? message
          : "Login failed. Please check your credentials."
      );
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
      {/* Header (white variant of home header) */}
      <header className="flex relative justify-between items-center px-4 py-3 bg-white border-b border-gray-200 sm:px-6">
        <div className="flex gap-3 items-center">
          <Link
            href="/"
            className="flex gap-3 items-center text-gray-900 no-underline"
          >
            <Image
              src="/icons/logo.svg"
              alt="Logo"
              width={40}
              height={40}
              style={{ borderRadius: "50%" }}
            />
            <span className="hidden font-bold tracking-wide sm:inline">
              ASYMMETRIX
            </span>
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden gap-6 items-center md:flex">
          <a
            href="https://asymmetrixintelligence.substack.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-800 no-underline hover:text-blue-700"
          >
            Substack
          </a>
          <Link
            href="/about-us"
            className="text-gray-800 no-underline hover:text-blue-700"
          >
            About Us
          </Link>
          <Link
            href="/login"
            className="font-semibold text-blue-600 no-underline hover:text-blue-700"
          >
            Log in
          </Link>
        </nav>

        {/* Mobile menu button */}
        <button
          aria-label="Open menu"
          className="flex justify-center items-center w-9 h-9 rounded-lg md:hidden"
          onClick={() => setIsMenuOpen((v) => !v)}
          style={{ appearance: "none", background: "transparent", border: 0 }}
        >
          <span
            className="inline-block relative"
            style={{ width: 18, height: 2, background: "#111" }}
          >
            <span
              className="absolute left-0 right-0 -top-1.5"
              style={{ height: 2, background: "#111" }}
            />
            <span
              className="absolute left-0 right-0 top-1.5"
              style={{ height: 2, background: "#111" }}
            />
          </span>
        </button>

        {/* Mobile nav */}
        {isMenuOpen && (
          <div className="flex absolute right-0 left-0 top-full z-50 flex-col gap-2 p-3 bg-white border-t border-gray-200 md:hidden">
            <a
              href="https://asymmetrixintelligence.substack.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 text-gray-800 no-underline"
              onClick={() => setIsMenuOpen(false)}
            >
              Substack
            </a>
            <Link
              href="/about-us"
              className="py-2 text-gray-800 no-underline"
              onClick={() => setIsMenuOpen(false)}
            >
              About Us
            </Link>
            <Link
              href="/login"
              className="py-2 font-semibold text-blue-600 no-underline"
              onClick={() => setIsMenuOpen(false)}
            >
              Log in
            </Link>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="px-6 w-full max-w-xl">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-gray-900">Login</h1>
            <p className="text-gray-600">Access your Asymmetrix dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {ssoError ? (
              <div className="px-4 py-3 text-sm text-red-700 bg-red-50 rounded-lg border border-red-200">
                {ssoError}
              </div>
            ) : null}

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
                className="px-4 py-3 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="px-4 py-3 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

            <div className="grid grid-cols-2 gap-3">
              <a
                href="/api/auth/azure-ad"
                className="inline-flex flex-nowrap items-center justify-center gap-2 px-2 py-2.5 font-medium text-gray-800 bg-white rounded-lg border border-gray-300 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm whitespace-nowrap"
              >
                <MicrosoftIcon />
                <span>Sign in with Microsoft</span>
              </a>

              <a
                href="/api/auth/google"
                className="inline-flex flex-nowrap items-center justify-center gap-2 px-2 py-2.5 font-medium text-gray-800 bg-white rounded-lg border border-gray-300 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm whitespace-nowrap"
              >
                <GoogleIcon />
                <span>Sign in with Google</span>
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F9FAFC]" />}>
      <LoginPageInner />
    </Suspense>
  );
}
