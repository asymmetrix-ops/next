"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { useAuth } from "@/components/providers/AuthProvider";
import { authService } from "@/lib/auth";
import { trackError, trackLogin } from "@/lib/tracking";
import Image from "next/image";

export default function LoginPage() {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(formData.email, formData.password);
      const userId = Number(authService.getUser()?.id) || 0;
      trackLogin(userId);
      toast.success("Login successful!");
      router.push("/home-user");
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
        <div className="px-6 w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-gray-900">Login</h1>
            <p className="text-gray-600">Access your Asymmetrix dashboard.</p>
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
          </form>
        </div>
      </div>
    </div>
  );
}
