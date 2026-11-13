"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/components/providers/AuthProvider";
import { authService } from "@/lib/auth";
import { clearDeviceToken, fetchDevices, revokeDevice, type DeviceSummary } from "@/lib/deviceAuth";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

function formatLastSeen(unixSeconds?: number): string {
  if (!unixSeconds) return "Never";
  try {
    return new Date(unixSeconds * 1000).toLocaleString();
  } catch {
    return "Unknown";
  }
}

export function DevicesSection() {
  const { logout, user } = useAuth();
  const isSsoOrg = user?.sso_required === true;
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    const token = authService.getToken();
    if (!token) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await fetchDevices(token);
      setDevices(data.devices || []);
      setCurrentDeviceId(data.current_device_id ?? null);
    } catch (e) {
      setLoadError((e as Error)?.message || "Could not load devices.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isSsoOrg) {
      setIsLoading(false);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSsoOrg]);

  const handleRevoke = async (device: DeviceSummary) => {
    const confirmed = window.confirm(
      `Revoke access for "${device.label || device.kind}"? This device will need to confirm again next time it signs in.`
    );
    if (!confirmed) return;

    const token = authService.getToken();
    if (!token) return;

    setRevokingId(device.id);
    try {
      const result = await revokeDevice(token, device.id);
      setDevices((prev) => prev.filter((d) => d.id !== device.id));
      toast.success("Device revoked.");

      if (result.was_current) {
        // Revoke takes effect at the next login/token refresh, but since the user
        // just revoked their own current device, sign them out locally right away.
        clearDeviceToken();
        logout();
      }
    } catch (e) {
      toast.error((e as Error)?.message || "Could not revoke device.");
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900">Devices</h2>
        <p className="text-sm text-gray-500 mt-1">
          Devices that have signed in to your account. Revoking a device takes effect
          at its next sign-in or token refresh (sessions can last up to 24h).
        </p>
      </div>

      {isSsoOrg ? (
        <p className="text-sm text-gray-600">
          Your organisation uses SSO; devices are managed by your identity provider.
        </p>
      ) : isLoading ? (
        <div className="py-8 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : loadError ? (
        <p className="text-sm text-red-600">{loadError}</p>
      ) : devices.length === 0 ? (
        <p className="text-sm text-gray-500">No devices found.</p>
      ) : (
        <div className="space-y-3">
          {devices.map((device) => {
            const isCurrent = device.id === currentDeviceId;
            const isPending = device.status === "pending";
            return (
              <div
                key={device.id}
                className="flex items-center justify-between gap-4 p-4 rounded-lg border border-gray-200"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 truncate">
                      {device.label || device.kind}
                    </span>
                    <span className="text-xs text-gray-400 uppercase">{device.kind}</span>
                    {isCurrent && (
                      <span className="inline-flex items-center h-5 px-2 rounded-full bg-blue-50 border border-blue-100 text-[10px] font-bold uppercase tracking-wide text-blue-600">
                        This device
                      </span>
                    )}
                    {isPending && (
                      <span className="inline-flex items-center h-5 px-2 rounded-full bg-amber-50 border border-amber-100 text-[10px] font-bold uppercase tracking-wide text-amber-600">
                        Awaiting confirmation
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5">
                    Last seen {formatLastSeen(device.last_seen_at)}
                    {device.last_ip ? ` · ${device.last_ip}` : ""}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevoke(device)}
                  disabled={revokingId === device.id}
                  className="shrink-0 px-3 py-1.5 text-sm font-semibold text-red-600 bg-white border border-red-200 rounded-full hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {revokingId === device.id ? "Revoking..." : "Revoke"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
