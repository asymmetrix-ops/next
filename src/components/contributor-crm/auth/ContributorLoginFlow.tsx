"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { NavHeader } from "@/components/contributor-crm/NavHeader";
import {
  fetchMe,
  getCompanyByUrl,
  otpLogin,
  saveCompanyContactEmail,
  sendOtp,
} from "@/lib/contributorCrm/api";
import {
  authService,
  buildCompanyAccessErrorPath,
  buildContributorEntryPath,
  buildInternalCrmPath,
  contributorAccessService,
  isAdminUser,
  isTokenExpired,
  type User,
} from "@/lib/contributorCrm/auth";
import { trackError } from "@/lib/tracking";

const OTP_LENGTH = 6;

function parseCompanyId(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchOtpUser(token: string): Promise<User | null> {
  try {
    return await fetchMe(token);
  } catch (error) {
    trackError(`OTP user lookup failed: ${(error as Error)?.message || "unknown"}`);
    return null;
  }
}

function ContributorLoginFlowInner() {
  const searchParams = useSearchParams();
  const shouldOpenReview = searchParams.get("review") === "1";
  const expectedCompanyId = useMemo(
    () => parseCompanyId(searchParams.get("companyId")),
    [searchParams]
  );

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState<string[]>(() => Array(OTP_LENGTH).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    contributorAccessService.setExpectedCompanyId(expectedCompanyId);
  }, [expectedCompanyId]);

  useEffect(() => {
    if (expectedCompanyId == null) return;
    const token = authService.getAuthToken();
    if (token && !isTokenExpired(token)) return;
    window.location.href = buildContributorEntryPath(expectedCompanyId, {
      review: shouldOpenReview,
    });
  }, [expectedCompanyId, shouldOpenReview]);

  useEffect(() => {
    const token = authService.getAuthToken();
    if (!token || isTokenExpired(token)) return;

    const user = authService.getUser();
    const boundCompanyId = contributorAccessService.getCompanyId();
    const reviewOptions = { review: shouldOpenReview };

    if (user && isAdminUser(user)) {
      window.location.href =
        expectedCompanyId != null
          ? buildContributorEntryPath(expectedCompanyId, reviewOptions)
          : buildInternalCrmPath();
      return;
    }

    if (boundCompanyId != null) {
      window.location.href = buildContributorEntryPath(
        boundCompanyId,
        boundCompanyId === expectedCompanyId ? reviewOptions : undefined
      );
    }
  }, [expectedCompanyId, shouldOpenReview]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsLoading(true);
    try {
      await sendOtp(email.trim());
      toast.success("Check your email for the 6-digit code.");
      setOtp(Array(OTP_LENGTH).fill(""));
      setStep("otp");
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      trackError(`OTP send failed: ${(err as Error)?.message || "unknown"}`);
      toast.error((err as Error)?.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const setOtpDigit = useCallback((index: number, value: string) => {
    const char = value.replace(/[^A-Za-z0-9]/g, "").slice(-1);
    setOtp((prev) => {
      const next = [...prev];
      next[index] = char;
      return next;
    });
    if (char && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  }, []);

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
      setOtp((prev) => {
        const next = [...prev];
        next[index - 1] = "";
        return next;
      });
    }
    if (e.key === "ArrowLeft" && index > 0) otpRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(0, OTP_LENGTH)
      .split("");
    if (pasted.length === 0) return;
    setOtp((prev) => {
      const next = [...prev];
      pasted.forEach((char, i) => (next[i] = char));
      return next;
    });
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    otpRefs.current[focusIndex]?.focus();
  };

  const otpValue = otp.join("");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpValue.length !== OTP_LENGTH) {
      toast.error("Please enter the full 6-character code.");
      return;
    }

    setIsVerifying(true);
    const normalizedEmail = email.trim().toLowerCase();
    const expectedId =
      expectedCompanyId ?? contributorAccessService.getExpectedCompanyId();

    try {
      const { token } = await otpLogin(normalizedEmail, otpValue);

      const domain = normalizedEmail.split("@")[1]?.trim();
      if (!domain) {
        authService.clearUser();
        contributorAccessService.clear();
        window.location.href = buildCompanyAccessErrorPath(expectedId);
        return;
      }

      authService.setAuthToken(token);
      const authenticatedUser = await fetchOtpUser(token);

      if (authenticatedUser && isAdminUser(authenticatedUser)) {
        authService.setUser(authenticatedUser);
        contributorAccessService.clear();
        toast.success("Signed in successfully.");
        window.location.href =
          expectedId != null
            ? buildContributorEntryPath(expectedId, { review: shouldOpenReview })
            : buildInternalCrmPath();
        return;
      }

      let company = null;
      try {
        company = await getCompanyByUrl(domain);
      } catch (lookupError) {
        trackError(
          `Company lookup failed: ${(lookupError as Error)?.message || "unknown"}`
        );
        authService.clearUser();
        contributorAccessService.clear();
        window.location.href = buildCompanyAccessErrorPath(expectedId);
        return;
      }

      if (!company?.id || (expectedId != null && company.id !== expectedId)) {
        authService.clearUser();
        contributorAccessService.clear();
        window.location.href = buildCompanyAccessErrorPath(expectedId);
        return;
      }

      if (authenticatedUser) authService.setUser(authenticatedUser);
      contributorAccessService.setLoginEmail(normalizedEmail);
      contributorAccessService.setCompanyId(company.id);
      contributorAccessService.setExpectedCompanyId(company.id);

      try {
        await saveCompanyContactEmail(token, company.id, normalizedEmail);
      } catch (saveError) {
        trackError(
          `Company contact save failed: ${(saveError as Error)?.message || "unknown"}`
        );
        toast.error("Signed in, but we couldn't save your contact email.");
      }

      toast.success("Signed in successfully.");
      const entryPath = buildContributorEntryPath(company.id, {
        review: shouldOpenReview,
      });
      window.location.href = entryPath;
    } catch (err) {
      trackError(`OTP verify failed: ${(err as Error)?.message || "unknown"}`);
      toast.error((err as Error)?.message || "Invalid or expired code. Try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const backToEmail = () => {
    setStep("email");
    setOtp(Array(OTP_LENGTH).fill(""));
  };

  return (
    <div className="min-h-screen bg-[#F9FAFC]">
      <NavHeader activeLink="login" />

      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">
        <div className="w-full max-w-md px-6">
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <svg
              className="h-5 w-5 shrink-0 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>To Initiate sessions please provide your Email address</span>
          </div>

          {step === "email" ? (
            <>
              <div className="mb-8 text-center">
                <h1 className="mb-2 text-3xl font-bold text-gray-900">
                  Data Contribution Portal
                </h1>
                <p className="text-gray-600">
                  Sign in with your work email to access your company profile.
                </p>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your work email"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isLoading ? "Sending code..." : "Continue"}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-8 text-center">
                <h1 className="mb-2 text-3xl font-bold text-gray-900">
                  Enter verification code
                </h1>
                <p className="text-gray-600">
                  We sent a 6-digit code to{" "}
                  <span className="font-medium text-gray-900">{email}</span>
                </p>
                <button
                  type="button"
                  onClick={backToEmail}
                  className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Use a different email
                </button>
              </div>

              <form onSubmit={handleVerify} className="space-y-8">
                <div className="flex justify-center gap-2 sm:gap-3" onPaste={handleOtpPaste}>
                  {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        otpRefs.current[i] = el;
                      }}
                      type="text"
                      inputMode="text"
                      maxLength={1}
                      autoComplete="one-time-code"
                      value={otp[i]}
                      onChange={(e) => setOtpDigit(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="h-12 w-11 rounded-xl border-2 border-gray-300 bg-white text-center text-xl font-semibold text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 sm:h-14 sm:w-12"
                      aria-label={`Character ${i + 1}`}
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={otpValue.length !== OTP_LENGTH || isVerifying}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isVerifying ? "Verifying..." : "Verify"}
                </button>

                <p className="text-center text-sm text-gray-500">
                  Didn&apos;t receive the code?{" "}
                  <button
                    type="button"
                    onClick={() =>
                      sendOtp(email)
                        .then(() => toast.success("Code resent."))
                        .catch(() => toast.error("Failed to resend."))
                    }
                    className="font-medium text-blue-600 hover:text-blue-700"
                  >
                    Resend
                  </button>
                </p>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

export function ContributorLoginFlow() {
  return (
    <Suspense>
      <ContributorLoginFlowInner />
    </Suspense>
  );
}
