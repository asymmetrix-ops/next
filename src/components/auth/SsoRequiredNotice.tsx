"use client";

import { MicrosoftIcon, GoogleIcon } from "@/components/auth/ProviderIcons";
import { SSO_REQUIRED_DEFAULT_MESSAGE } from "@/lib/deviceAuth";

/**
 * Shown wherever a password/OTP/code attempt comes back with the
 * `sso_required` error code: the company we now know (from the email) only
 * allows SSO. We don't know the company before this point, so the normal
 * password form can't be hidden ahead of time — this just takes over once
 * the backend tells us.
 */
export function SsoRequiredNotice({
  message,
  onBack,
}: {
  message?: string | null;
  onBack?: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="px-4 py-3 text-sm text-blue-800 bg-blue-50 rounded-lg border border-blue-200">
        {message || SSO_REQUIRED_DEFAULT_MESSAGE}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <a
          href="/api/auth/azure-ad"
          className="inline-flex flex-nowrap items-center justify-center gap-2 px-2 py-2.5 font-medium text-gray-800 bg-white rounded-lg border-2 border-blue-500 ring-2 ring-blue-200 hover:bg-blue-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm whitespace-nowrap"
        >
          <MicrosoftIcon />
          <span>Sign in with Microsoft</span>
        </a>

        <a
          href="/api/auth/google"
          className="inline-flex flex-nowrap items-center justify-center gap-2 px-2 py-2.5 font-medium text-gray-800 bg-white rounded-lg border-2 border-blue-500 ring-2 ring-blue-200 hover:bg-blue-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm whitespace-nowrap"
        >
          <GoogleIcon />
          <span>Sign in with Google</span>
        </a>
      </div>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Back to login
        </button>
      )}
    </div>
  );
}
