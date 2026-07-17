"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import McpGuestPageShell from "@/components/mcp-guest/McpGuestPageShell";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  MCP_GUEST_ALLOWED_PATH,
  MCP_GUEST_REQUEST_PATH,
} from "@/lib/mcpGuest";
import {
  MCP_GUEST_AUTH_GENERIC_ERROR,
  MCP_GUEST_OTP_EXPIRY_MINUTES,
  MCP_GUEST_OTP_SENT_MESSAGE,
  sendMcpGuestOtp,
} from "@/lib/mcpGuestAuth";

export default function McpGuestLoginPage() {
  const router = useRouter();
  const { loginMcpGuestWithOtp, isMcpGuest, isAuthenticated, loading } =
    useAuth();
  const [workEmail, setWorkEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated && isMcpGuest) {
      router.replace(MCP_GUEST_ALLOWED_PATH);
    }
  }, [isAuthenticated, isMcpGuest, loading, router]);

  const handleSendOtp = async () => {
    const trimmedEmail = workEmail.trim();
    if (!trimmedEmail) {
      toast.error("Please enter your work email.");
      return;
    }

    setIsSendingOtp(true);
    try {
      await sendMcpGuestOtp(trimmedEmail);
      setOtpSent(true);
      toast.success(MCP_GUEST_OTP_SENT_MESSAGE);
    } catch {
      toast.error(MCP_GUEST_AUTH_GENERIC_ERROR);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = workEmail.trim();
    const trimmedOtp = otp.trim();

    if (!trimmedEmail) {
      toast.error("Please enter your work email.");
      return;
    }
    if (!trimmedOtp) {
      toast.error("Please enter your one-time password.");
      return;
    }

    setIsSigningIn(true);
    try {
      await loginMcpGuestWithOtp(trimmedEmail, trimmedOtp);
      router.replace(MCP_GUEST_ALLOWED_PATH);
    } catch {
      toast.error(MCP_GUEST_AUTH_GENERIC_ERROR);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <McpGuestPageShell>
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          MCP Guest sign in
        </h1>
        <p className="text-gray-600">
          Enter your work email to receive a one-time password, then sign in to
          access MCP companies.
        </p>
      </div>

      <form onSubmit={handleSignIn} className="space-y-6">
        <div>
          <label
            htmlFor="workEmail"
            className="block mb-2 text-sm font-medium text-gray-700"
          >
            Work email
          </label>
          <input
            id="workEmail"
            name="workEmail"
            type="email"
            value={workEmail}
            onChange={(e) => {
              setWorkEmail(e.target.value);
              setOtpSent(false);
            }}
            className="px-4 py-3 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your work email"
            required
            autoComplete="email"
          />
        </div>

        <button
          type="button"
          onClick={() => void handleSendOtp()}
          disabled={isSendingOtp || isSigningIn}
          className="px-4 py-3 w-full font-medium text-blue-700 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSendingOtp ? "Sending…" : otpSent ? "Resend one-time password" : "Send one-time password"}
        </button>

        {otpSent && (
          <p className="text-sm text-gray-600 leading-relaxed">
            {MCP_GUEST_OTP_SENT_MESSAGE} The code expires after{" "}
            {MCP_GUEST_OTP_EXPIRY_MINUTES} minutes.
          </p>
        )}

        <div>
          <label
            htmlFor="otp"
            className="block mb-2 text-sm font-medium text-gray-700"
          >
            One-time password
          </label>
          <input
            id="otp"
            name="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="px-4 py-3 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter the code from your email"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isSigningIn || isSendingOtp}
          className="px-4 py-3 w-full font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSigningIn ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-sm text-center text-gray-600">
        Need access?{" "}
        <Link href={MCP_GUEST_REQUEST_PATH} className="text-blue-600 hover:underline">
          Request MCP Guest access
        </Link>
      </p>
    </McpGuestPageShell>
  );
}
