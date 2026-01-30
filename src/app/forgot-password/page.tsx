"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { authService } from "@/lib/auth";
import Image from "next/image";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email.");
      return;
    }

    setIsLoading(true);
    try {
      await authService.requestPasswordReset(email);
      setIsSubmitted(true);
      toast.success("Check your email for instructions to reset your password.");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFC]">
      <header className="flex justify-between items-center px-4 py-3 bg-white border-b border-gray-200 sm:px-6">
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
        <Link
          href="/login"
          className="font-semibold text-blue-600 no-underline hover:text-blue-700"
        >
          Log in
        </Link>
      </header>

      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="px-6 w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-gray-900">
              Reset your password
            </h1>
            <p className="text-gray-600">
              Enter your email and we&apos;ll send you a link to reset your
              password.
            </p>
          </div>

          {isSubmitted ? (
            <div className="space-y-6">
              <p className="text-center text-gray-600">
                If an account exists for that email, you&apos;ll receive
                instructions shortly.
              </p>
              <Link
                href="/login"
                className="block w-full py-3 text-center font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
              >
                ← Back to login
              </Link>
            </div>
          ) : (
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="px-4 py-3 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-3 w-full font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Sending..." : "Send reset link"}
              </button>

              <p className="text-center">
                <Link
                  href="/login"
                  className="font-medium text-blue-600 hover:text-blue-700"
                >
                  ← Back to login
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
