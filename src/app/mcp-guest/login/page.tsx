"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import McpGuestPageShell from "@/components/mcp-guest/McpGuestPageShell";
import McpGuestRequestForm from "@/components/mcp-guest/McpGuestRequestForm";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  ACCESS_DENIED_PATH,
  MCP_GUEST_ALLOWED_PATH,
  MCP_GUEST_REQUEST_PATH,
} from "@/lib/mcpGuest";
import {
  fetchMcpGuestRequestStatus,
  type McpGuestRequestStatus,
  type McpGuestRequestStatusResult,
} from "@/lib/mcpGuestRequest";
import {
  MCP_GUEST_AUTH_GENERIC_ERROR,
  MCP_GUEST_OTP_EXPIRY_MINUTES,
  MCP_GUEST_OTP_SENT_MESSAGE,
  sendMcpGuestOtp,
} from "@/lib/mcpGuestAuth";
import { isWorkEmail, WORK_EMAIL_REQUIRED_MESSAGE } from "@/lib/workEmail";

type LoginStep = "email" | McpGuestRequestStatus;

export default function McpGuestLoginPage() {
  const router = useRouter();
  const { loginMcpGuestWithOtp, isMcpGuest, isContributor, isAuthenticated, loading } =
    useAuth();
  const [workEmail, setWorkEmail] = useState("");
  const [step, setStep] = useState<LoginStep>("email");
  const [statusResult, setStatusResult] =
    useState<McpGuestRequestStatusResult | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (isAuthenticated && isContributor) {
      router.replace(ACCESS_DENIED_PATH);
      return;
    }
    if (isAuthenticated && isMcpGuest) {
      router.replace(MCP_GUEST_ALLOWED_PATH);
    }
  }, [isAuthenticated, isContributor, isMcpGuest, loading, router]);

  const resetToEmailStep = () => {
    setStep("email");
    setStatusResult(null);
    setOtp("");
    setOtpSent(false);
  };

  const handleContinue = async () => {
    const trimmedEmail = workEmail.trim();
    if (!trimmedEmail) {
      toast.error("Please enter your work email.");
      return;
    }
    if (!isWorkEmail(trimmedEmail)) {
      toast.error(WORK_EMAIL_REQUIRED_MESSAGE);
      return;
    }

    setIsCheckingStatus(true);
    try {
      const result = await fetchMcpGuestRequestStatus(trimmedEmail);
      setStatusResult(result);
      setStep(result.status);
      setOtp("");
      setOtpSent(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to check your request status. Please try again."
      );
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleSendOtp = async () => {
    const trimmedEmail = workEmail.trim();
    if (!trimmedEmail) {
      toast.error("Please enter your work email.");
      return;
    }
    if (!isWorkEmail(trimmedEmail)) {
      toast.error(WORK_EMAIL_REQUIRED_MESSAGE);
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
    if (!isWorkEmail(trimmedEmail)) {
      toast.error(WORK_EMAIL_REQUIRED_MESSAGE);
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

  const companyLabel = statusResult?.company?.trim() || "your company";
  const emailLocked = step !== "email";

  return (
    <McpGuestPageShell>
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          MCP Guest sign in
        </h1>
        <p className="text-gray-600">
          {step === "email"
            ? "Enter your work email to continue."
            : step === "approved"
              ? "Your access request was approved. Sign in with a one-time password."
              : step === "not_submitted"
                ? "Request MCP Guest access to get started."
                : "We found your MCP Guest access request."}
        </p>
      </div>

      <div className="space-y-6">
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
              if (step !== "email") {
                resetToEmailStep();
              } else {
                setOtpSent(false);
              }
            }}
            readOnly={emailLocked && step === "approved"}
            className={`px-4 py-3 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              emailLocked && step === "approved"
                ? "bg-gray-50 text-gray-700 cursor-not-allowed"
                : ""
            }`}
            placeholder="Enter your work email"
            required
            autoComplete="email"
          />
        </div>

        {step === "email" && (
          <button
            type="button"
            onClick={() => void handleContinue()}
            disabled={isCheckingStatus}
            className="px-4 py-3 w-full font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCheckingStatus ? "Checking…" : "Continue"}
          </button>
        )}

        {step === "not_submitted" && (
          <div className="pt-2">
            <p className="mb-6 text-sm text-gray-600 leading-relaxed">
              We don&apos;t have an MCP Guest request for this email yet. Submit
              the form below and our team will review it.
            </p>
            <McpGuestRequestForm
              initialWorkEmail={workEmail.trim()}
              lockWorkEmail
              onSubmitted={() => setStep("pending")}
            />
          </div>
        )}

        {step === "pending" && (
          <div className="p-5 text-center bg-blue-50 rounded-lg border border-blue-100">
            <h2 className="mb-2 text-lg font-semibold text-gray-900">
              Request in review
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Your MCP Guest access request for{" "}
              <strong>{companyLabel}</strong> is being reviewed. We&apos;ll email
              you once a decision has been made.
            </p>
          </div>
        )}

        {step === "rejected" && (
          <div className="p-5 text-center bg-red-50 rounded-lg border border-red-100">
            <h2 className="mb-2 text-lg font-semibold text-gray-900">
              Request not approved
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Sorry, your MCP Guest access request for{" "}
              <strong>{companyLabel}</strong> was not approved. If you believe
              this is an error, contact{" "}
              <a
                href="mailto:asymmetrix@asymmetrixintelligence.com"
                className="text-blue-600 hover:underline"
              >
                asymmetrix@asymmetrixintelligence.com
              </a>
              .
            </p>
          </div>
        )}

        {step === "approved" && (
          <form onSubmit={handleSignIn} className="space-y-6">
            <div className="p-5 bg-green-50 rounded-lg border border-green-100">
              <p className="text-sm text-gray-700 leading-relaxed">
                Your MCP Guest access for <strong>{companyLabel}</strong> has been
                approved. Send a one-time password to your email, then sign in
                below.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleSendOtp()}
              disabled={isSendingOtp || isSigningIn}
              className="px-4 py-3 w-full font-medium text-blue-700 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSendingOtp
                ? "Sending…"
                : otpSent
                  ? "Resend one-time password"
                  : "Send one-time password"}
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
        )}

        {step !== "email" && (
          <button
            type="button"
            onClick={resetToEmailStep}
            className="px-4 py-2 w-full text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Use a different email
          </button>
        )}
      </div>

      {step === "email" && (
        <p className="mt-6 text-sm text-center text-gray-600">
          Need access?{" "}
          <Link
            href={MCP_GUEST_REQUEST_PATH}
            className="text-blue-600 hover:underline"
          >
            Request MCP Guest access
          </Link>
        </p>
      )}
    </McpGuestPageShell>
  );
}
