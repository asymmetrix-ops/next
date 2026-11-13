"use client";

import { useMemo, useState } from "react";
import {
  confirmDevice,
  loginWithDevice,
  LoginApiError,
  DeviceConfirmationRequiredError,
  type DeviceSummary,
} from "@/lib/deviceAuth";
import { SsoRequiredNotice } from "@/components/auth/SsoRequiredNotice";

interface DeviceConfirmationFormProps {
  email: string;
  password: string;
  confirmationId: number;
  /** Called once the device is confirmed and login should be retried by the caller. */
  onConfirmed: () => void;
  onCancel: () => void;
  /** Re-runs the login that issued the code (defaults to the web login). */
  resendLogin?: () => Promise<unknown>;
  /** API base used to confirm the device (defaults to the web login group). */
  baseUrl?: string;
}

function formatLastSeen(unixSeconds?: number): string {
  if (!unixSeconds) return "Unknown";
  try {
    return new Date(unixSeconds * 1000).toLocaleString();
  } catch {
    return "Unknown";
  }
}

export function DeviceConfirmationForm({
  email,
  password,
  confirmationId: initialConfirmationId,
  onConfirmed,
  onCancel,
  resendLogin,
  baseUrl,
}: DeviceConfirmationFormProps) {
  const [confirmationId, setConfirmationId] = useState(initialConfirmationId);
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [devices, setDevices] = useState<DeviceSummary[] | null>(null);
  const [maxDevices, setMaxDevices] = useState<number | null>(null);
  const [selectedReplaceId, setSelectedReplaceId] = useState<number | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [ssoRequiredMessage, setSsoRequiredMessage] = useState<string | null>(null);

  const codeIsValid = useMemo(() => /^\d{6}$/.test(code), [code]);

  const submitCode = async (replaceDeviceId?: number) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await confirmDevice(
        {
          confirmation_id: confirmationId,
          code,
          replace_device_id: replaceDeviceId,
        },
        baseUrl
      );

      if (result.confirmed) {
        onConfirmed();
        return;
      }

      switch (result.error) {
        case "invalid_code":
          setAttemptsLeft(result.attempts_left ?? null);
          setError(
            typeof result.attempts_left === "number"
              ? `Incorrect code. ${result.attempts_left} attempt${
                  result.attempts_left === 1 ? "" : "s"
                } left.`
              : "Incorrect code."
          );
          break;
        case "expired":
          setError("This code has expired. Please resend a new one.");
          break;
        case "already_used":
          setError("This code has already been used. Please resend a new one.");
          break;
        case "too_many_attempts":
          setError("Too many attempts. Please resend a new code.");
          break;
        case "device_limit_reached":
          setDevices(result.devices || []);
          setMaxDevices(result.max_devices ?? null);
          setError(null);
          break;
        default:
          setError("Could not confirm this device. Please try again.");
      }
    } catch (e) {
      if (e instanceof LoginApiError && e.code === "sso_required") {
        setSsoRequiredMessage(e.message || "Your organisation requires SSO sign-in.");
      } else {
        setError((e as Error)?.message || "Could not confirm this device.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeIsValid || isSubmitting) return;
    await submitCode();
  };

  const handleReplace = async () => {
    if (!selectedReplaceId || isSubmitting) return;
    // The code is not consumed in this case, so we resend it with replace_device_id.
    await submitCode(selectedReplaceId);
  };

  const handleResend = async () => {
    setIsResending(true);
    setError(null);
    setInfo(null);
    setDevices(null);
    try {
      await (resendLogin ? resendLogin() : loginWithDevice(email, password, "web"));
      // A confirmed, non-pending device would resolve here without throwing —
      // treat that as success too.
      onConfirmed();
    } catch (e) {
      if (e instanceof DeviceConfirmationRequiredError) {
        setConfirmationId(e.confirmationId);
        setCode("");
        setAttemptsLeft(null);
        setInfo("A new code has been sent to your email.");
      } else if (e instanceof LoginApiError && e.code === "sso_required") {
        setSsoRequiredMessage(e.message || "Your organisation requires SSO sign-in.");
      } else if (e instanceof LoginApiError) {
        setError(e.message);
      } else {
        setError("Could not resend the code. Please try again.");
      }
    } finally {
      setIsResending(false);
    }
  };

  if (ssoRequiredMessage) {
    return (
      <SsoRequiredNotice message={ssoRequiredMessage} onBack={onCancel} />
    );
  }

  if (devices) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Device limit reached
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            {maxDevices
              ? `You can have up to ${maxDevices} devices. Choose one to sign out to continue.`
              : "Choose a device to sign out to continue."}
          </p>
        </div>

        <div className="space-y-2">
          {devices.map((d) => (
            <label
              key={d.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
            >
              <input
                type="radio"
                name="replace-device"
                checked={selectedReplaceId === d.id}
                onChange={() => setSelectedReplaceId(d.id)}
              />
              <div className="flex-1 text-sm">
                <div className="font-medium text-gray-900">
                  {d.label || d.kind} <span className="text-gray-400">({d.kind})</span>
                </div>
                <div className="text-gray-500">
                  Last seen {formatLastSeen(d.last_seen_at)}
                  {d.last_ip ? ` · ${d.last_ip}` : ""}
                </div>
              </div>
            </label>
          ))}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleReplace}
            disabled={!selectedReplaceId || isSubmitting}
            className="px-4 py-2.5 flex-1 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? "Replacing..." : "Sign out that device & continue"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 font-medium text-gray-700 bg-white rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Confirm this device</h2>
        <p className="mt-1 text-sm text-gray-600">
          We sent a 6-digit code to <span className="font-medium">{email}</span>.
          Enter it below to continue.
        </p>
      </div>

      {info && <p className="text-sm text-green-700">{info}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div>
        <label
          htmlFor="device-code"
          className="block mb-2 text-sm font-medium text-gray-700"
        >
          Verification code
        </label>
        <input
          id="device-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="123456"
          className="px-4 py-3 w-full text-lg tracking-[0.5em] text-center rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {attemptsLeft !== null && (
          <p className="mt-1 text-xs text-gray-500">{attemptsLeft} attempt(s) left</p>
        )}
      </div>

      <button
        type="submit"
        disabled={!codeIsValid || isSubmitting}
        className="px-4 py-3 w-full font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Confirming..." : "Confirm device"}
      </button>

      <div className="flex justify-between items-center text-sm">
        <button
          type="button"
          onClick={handleResend}
          disabled={isResending}
          className="font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
        >
          {isResending ? "Resending..." : "Resend code"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          Back to login
        </button>
      </div>
    </form>
  );
}
