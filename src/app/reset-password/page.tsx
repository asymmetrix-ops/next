"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { authService } from "@/lib/auth";
import Image from "next/image";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword(token!, password);
      toast.success("Password reset successfully. You can now log in.");
      router.push("/login");
    } catch (err) {
      toast.error("Reset failed. The link may have expired. Please request a new one.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="px-6 w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Invalid or expired link</h1>
          <p className="mb-6 text-gray-600">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <Link
            href="/login"
            className="inline-block font-medium text-blue-600 hover:text-blue-700"
          >
            ← Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 w-full max-w-md">
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Reset your password</h1>
        <p className="text-gray-600">
          You followed a magic link from your email. Enter your new password below.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="password"
            className="block mb-2 text-sm font-medium text-gray-700"
          >
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-4 py-3 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter new password"
            required
            minLength={8}
          />
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block mb-2 text-sm font-medium text-gray-700"
          >
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="px-4 py-3 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Confirm new password"
            required
            minLength={8}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-3 w-full font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Resetting password..." : "Reset password"}
        </button>
      </form>

      <p className="mt-6 text-center">
        <Link
          href="/login"
          className="font-medium text-blue-600 hover:text-blue-700"
        >
          ← Back to login
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
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
        <Suspense
          fallback={
            <div className="px-6 w-full max-w-md text-center text-gray-600">
              Loading...
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
