"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { useAuth } from "@/components/providers/AuthProvider";
import { authService } from "@/lib/auth";
import { DeviceConfirmationRequiredError, LoginApiError } from "@/lib/deviceAuth";
import { DeviceConfirmationForm } from "@/components/auth/DeviceConfirmationForm";
import { SsoRequiredNotice } from "@/components/auth/SsoRequiredNotice";
import { MicrosoftIcon, GoogleIcon } from "@/components/auth/ProviderIcons";
import { AZURE_SSO_ERROR_MESSAGES } from "@/lib/azureSsoServer";
import { GOOGLE_SSO_ERROR_MESSAGES } from "@/lib/googleSsoServer";
import { trackError, trackLogin } from "@/lib/tracking";
import Image from "next/image";

const SSO_ERROR_MESSAGES = {
  ...AZURE_SSO_ERROR_MESSAGES,
  ...GOOGLE_SSO_ERROR_MESSAGES,
};

export default function LoginPage() {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [ssoError, setSsoError] = useState<string | null>(null);
  // Credentials are kept in memory only (never persisted) while the user confirms
  // this new device; pendingConfirmationId drives whether the code screen shows.
  const [pendingConfirmationId, setPendingConfirmationId] = useState<number | null>(
    null
  );
  const [ssoRequiredMessage, setSsoRequiredMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const expired = params.get("expired");
    if (expired === "sso") {
      // Neutral wording: an SSO-managed session has no device_id to reference,
      // and we don't want to hint at devices/passwords for these users.
      toast.error("Your session has ended.", { id: "session-expired" });
    } else if (expired) {
      toast.error("Your session has expired. Please log in again.", { id: "session-expired" });
    }
    const error = params.get("error") || params.get("sso_error");
    if (error) {
      const [code, missingVars] = error.split(":");
      const baseMessage = SSO_ERROR_MESSAGES[code] || error;
      setSsoError(
        missingVars
          ? `${baseMessage} Missing env vars: ${missingVars.replace(/,/g, ", ")}.`
          : baseMessage
      );
      params.delete("error");
      params.delete("sso_error");
      const nextQuery = params.toString();
      const nextUrl = nextQuery
        ? `${window.location.pathname}?${nextQuery}`
        : window.location.pathname;
      window.history.replaceState({}, "", nextUrl);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSsoRequiredMessage(null);

    try {
      await login(formData.email, formData.password);
      completeLogin();
    } catch (err) {
      if (err instanceof DeviceConfirmationRequiredError) {
        setPendingConfirmationId(err.confirmationId);
        setIsLoading(false);
        return;
      }
      if (err instanceof LoginApiError && err.code === "sso_required") {
        setSsoRequiredMessage(err.message || "Your organisation requires SSO sign-in.");
        setIsLoading(false);
        return;
      }
      trackError(`Login failed: ${(err as Error)?.message || "unknown"}`);
      toast.error(
        (err as Error)?.message && (err as Error).message !== "Login failed"
          ? (err as Error).message
          : "Login failed. Please check your credentials."
      );
      setIsLoading(false);
    }
  };

  const completeLogin = () => {
    const userId = Number(authService.getUser()?.id) || 0;
    trackLogin(userId);
    toast.success("Login successful!");
    const redirect = new URLSearchParams(window.location.search).get("redirect");
    const safe =
      redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : null;
    router.push(safe || "/home-user");
  };

  const handleDeviceConfirmed = async () => {
    // The device is now trusted — calling login again with the same device_token
    // (already persisted) returns the real authToken this time.
    setIsLoading(true);
    try {
      await login(formData.email, formData.password);
      setPendingConfirmationId(null);
      completeLogin();
    } catch (err) {
      if (err instanceof DeviceConfirmationRequiredError) {
        // Shouldn't normally happen right after confirmation, but handle gracefully.
        setPendingConfirmationId(err.confirmationId);
      } else if (err instanceof LoginApiError && err.code === "sso_required") {
        setPendingConfirmationId(null);
        setSsoRequiredMessage(err.message || "Your organisation requires SSO sign-in.");
      } else {
        toast.error("Login failed. Please try again.");
        setPendingConfirmationId(null);
      }
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

          {pendingConfirmationId !== null ? (
            <DeviceConfirmationForm
              email={formData.email}
              password={formData.password}
              confirmationId={pendingConfirmationId}
              onConfirmed={handleDeviceConfirmed}
              onCancel={() => setPendingConfirmationId(null)}
            />
          ) : ssoRequiredMessage ? (
            <SsoRequiredNotice
              message={ssoRequiredMessage}
              onBack={() => setSsoRequiredMessage(null)}
            />
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
