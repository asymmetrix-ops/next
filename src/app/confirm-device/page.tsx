"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  confirmDevice,
  type ConfirmDeviceResponse,
  type DeviceSummary,
} from "@/lib/deviceAuth";

function formatLastSeen(unixSeconds?: number): string {
  if (!unixSeconds) return "Unknown";
  try {
    return new Date(unixSeconds * 1000).toLocaleString();
  } catch {
    return "Unknown";
  }
}

function ConfirmDeviceContent() {
  const searchParams = useSearchParams();
  const confirmationId = Number(searchParams.get("id"));
  const linkToken = searchParams.get("token") || "";

  const [status, setStatus] = useState<"loading" | "success" | "error" | "picker">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [maxDevices, setMaxDevices] = useState<number | null>(null);
  const [selectedReplaceId, setSelectedReplaceId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const runConfirm = async (replaceDeviceId?: number) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const result: ConfirmDeviceResponse = await confirmDevice({
        confirmation_id: confirmationId,
        link_token: linkToken,
        replace_device_id: replaceDeviceId,
      });

      if (result.confirmed) {
        setStatus("success");
        return;
      }

      switch (result.error) {
        case "expired":
          setStatus("error");
          setErrorMessage("This link has expired. Please sign in again to get a new one.");
          break;
        case "already_used":
          setStatus("error");
          setErrorMessage("This link has already been used.");
          break;
        case "too_many_attempts":
          setStatus("error");
          setErrorMessage("Too many attempts. Please sign in again to get a new link.");
          break;
        case "device_limit_reached":
          setDevices(result.devices || []);
          setMaxDevices(result.max_devices ?? null);
          setStatus("picker");
          break;
        default:
          setStatus("error");
          setErrorMessage("Could not confirm this device.");
      }
    } catch (e) {
      setStatus("error");
      setErrorMessage((e as Error)?.message || "Could not confirm this device.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!confirmationId || !linkToken) {
      setStatus("error");
      setErrorMessage("This confirmation link is invalid.");
      return;
    }
    void runConfirm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex justify-center items-center px-6 min-h-screen bg-[#F9FAFC]">
      <div className="p-8 w-full max-w-md bg-white rounded-xl border border-gray-200 shadow-sm">
        {status === "loading" && (
          <p className="text-center text-gray-600">Confirming your device...</p>
        )}

        {status === "success" && (
          <div className="text-center">
            <h1 className="mb-2 text-xl font-semibold text-gray-900">
              Device confirmed
            </h1>
            <p className="text-gray-600">
              Return to the app and sign in.
            </p>
            <Link
              href="/login"
              className="inline-block mt-6 px-4 py-2.5 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Go to login
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="text-center">
            <h1 className="mb-2 text-xl font-semibold text-gray-900">
              Could not confirm device
            </h1>
            <p className="text-gray-600">{errorMessage}</p>
            <Link
              href="/login"
              className="inline-block mt-6 px-4 py-2.5 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Go to login
            </Link>
          </div>
        )}

        {status === "picker" && (
          <div className="space-y-5">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                Device limit reached
              </h1>
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

            {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

            <button
              type="button"
              disabled={!selectedReplaceId || isSubmitting}
              onClick={() => selectedReplaceId && runConfirm(selectedReplaceId)}
              className="px-4 py-2.5 w-full font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Replacing..." : "Sign out that device & continue"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConfirmDevicePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F9FAFC]" />}>
      <ConfirmDeviceContent />
    </Suspense>
  );
}
