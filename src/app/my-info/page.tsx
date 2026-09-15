"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import Header from "@/components/Header";
import { useAuth } from "@/components/providers/AuthProvider";
import { useAuthMe } from "@/hooks/useAuthMe";
import { getInitials } from "@/lib/userDisplay";
import { trackLogout } from "@/lib/tracking";
import {
  authService,
  PASSWORD_RESET_PERMISSION_DENIED_MESSAGE,
  PASSWORD_RESET_SUPPORT_EMAIL,
} from "@/lib/auth";

function detectDeviceLabel(): string {
  if (typeof navigator === "undefined") return "This device";
  const ua = navigator.userAgent;
  let browser = "Browser";
  if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/") && !ua.includes("Chromium")) browser = "Chrome";
  else if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Safari/") && !ua.includes("Chrome/")) browser = "Safari";

  let os = "your device";
  if (ua.includes("Mac OS X")) os = "macOS";
  else if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Linux")) os = "Linux";

  return `${browser} on ${os}`;
}

function InfoRow({
  label,
  value,
  note,
  editable,
}: {
  label: string;
  value: string;
  note?: string;
  editable?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <div className="flex items-center gap-4 px-5 py-3.5 border-b border-gray-100 last:border-0">
        <span className="w-[150px] shrink-0 text-[11px] font-bold uppercase tracking-wide text-gray-400">
          {label}
        </span>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
          autoFocus
        />
        <div className="shrink-0 flex items-center gap-3">
          <button
            type="button"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            onClick={() => {
              setEditing(false);
              setDraft(value);
              toast.error(
                "Saving profile changes isn't available yet — please contact support to update this."
              );
            }}
          >
            Save
          </button>
          <button
            type="button"
            className="text-sm font-medium text-gray-500 hover:text-gray-700"
            onClick={() => {
              setEditing(false);
              setDraft(value);
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 px-5 py-3.5 border-b border-gray-100 last:border-0">
      <span className="w-[150px] shrink-0 text-[11px] font-bold uppercase tracking-wide text-gray-400">
        {label}
      </span>
      <span className="flex-1 min-w-0 text-sm font-medium text-gray-900 break-words">
        {value || "-"}
        {note && <span className="block text-xs font-normal text-gray-500 mt-0.5">{note}</span>}
      </span>
      {editable && (
        <button
          type="button"
          className="shrink-0 text-sm font-semibold text-blue-600 hover:text-blue-700"
          onClick={() => setEditing(true)}
        >
          Edit
        </button>
      )}
    </div>
  );
}

export default function MyInfoPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { me, loading: meLoading, error: meError } = useAuthMe();
  const [isSendingResetLink, setIsSendingResetLink] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(
    null
  );

  const name = me?.name || user?.name || "";
  const email = me?.email || user?.email || "";
  const company =
    me?._new_company?.name ||
    (me?.Company != null ? String(me.Company) : "") ||
    "";

  const handleSendResetPasswordLink = async () => {
    if (!email) {
      toast.error("No email address found for your account.");
      return;
    }
    setIsSendingResetLink(true);
    setResetPasswordError(null);
    try {
      await authService.requestPasswordReset(email);
      toast.success("Password reset link sent. Check your email.");
    } catch (err) {
      if (
        err instanceof Error &&
        err.message === PASSWORD_RESET_PERMISSION_DENIED_MESSAGE
      ) {
        setResetPasswordError(PASSWORD_RESET_PERMISSION_DENIED_MESSAGE);
      } else {
        toast.error("Could not send reset link. Please try again.");
      }
    } finally {
      setIsSendingResetLink(false);
    }
  };

  const handleSignOutEverywhere = () => {
    const userId = user?.id ? Number.parseInt(user.id, 10) : 0;
    trackLogout(Number.isFinite(userId) ? userId : 0);
    logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-[900px] mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <span className="flex items-center justify-center w-[60px] h-[60px] rounded-full bg-blue-600 text-white text-xl font-bold shrink-0">
            {getInitials(name)}
          </span>
          <div className="min-w-0">
            <span className="inline-flex items-center h-[22px] px-2.5 rounded-full bg-blue-50 border border-blue-100 text-[10.5px] font-extrabold uppercase tracking-wide text-blue-600">
              Account
            </span>
            <h1 className="mt-1 text-xl font-extrabold text-gray-900 truncate">
              {name || "Your account"}
            </h1>
            <p className="text-sm text-gray-500 truncate">
              {[company, email].filter(Boolean).join(" · ")}
            </p>
          </div>
          <a
            href="/settings"
            className="ml-auto shrink-0 px-4 py-2 text-sm font-semibold text-blue-600 bg-white border border-blue-200 rounded-full hover:bg-blue-50 transition-colors"
          >
            Settings
          </a>
        </div>

        {meError && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
            <p className="font-semibold">Error</p>
            <p>{meError}</p>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-4">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3">
            <h2 className="text-[15px] font-bold text-gray-900">Your info</h2>
            <p className="text-xs text-gray-500">
              Details shown on shared research and alerts.
            </p>
            {meLoading && (
              <span className="ml-auto text-xs text-gray-400">Loading…</span>
            )}
          </div>
          <InfoRow label="Name" value={name} editable />
          <InfoRow
            label="Email address"
            value={email}
            note="Used for sign-in and every email alert."
            editable
          />
          <InfoRow label="Company" value={company} editable />
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100">
            <h2 className="text-[15px] font-bold text-gray-900">Security</h2>
          </div>
          <div className="flex items-center gap-4 px-5 py-3.5 border-b border-gray-100">
            <span className="w-[150px] shrink-0 text-[11px] font-bold uppercase tracking-wide text-gray-400">
              Password
            </span>
            <span className="flex-1 min-w-0 text-sm font-medium text-gray-900">
              Reset your password by email
              <span className="block text-xs font-normal text-gray-500 mt-0.5">
                We&apos;ll email you a reset link.
              </span>
            </span>
            <button
              type="button"
              onClick={handleSendResetPasswordLink}
              disabled={isSendingResetLink || !email}
              className="shrink-0 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSendingResetLink ? "Sending…" : "Reset password"}
            </button>
          </div>
          <div className="flex items-center gap-4 px-5 py-3.5">
            <span className="w-[150px] shrink-0 text-[11px] font-bold uppercase tracking-wide text-gray-400">
              Signed in on
            </span>
            <span className="flex-1 min-w-0 text-sm font-medium text-gray-900">
              This device
              <span className="block text-xs font-normal text-gray-500 mt-0.5">
                {detectDeviceLabel()} · active now
              </span>
            </span>
            <button
              type="button"
              onClick={handleSignOutEverywhere}
              className="shrink-0 text-sm font-semibold text-red-600 hover:text-red-700"
            >
              Sign out
            </button>
          </div>
        </div>

        {resetPasswordError && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="font-medium text-amber-900">{resetPasswordError}</p>
            <p className="mt-2 text-sm text-gray-600">
              Please reach out to{" "}
              <a
                href={`mailto:${PASSWORD_RESET_SUPPORT_EMAIL}`}
                className="font-medium text-blue-600 hover:text-blue-700"
              >
                {PASSWORD_RESET_SUPPORT_EMAIL}
              </a>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
