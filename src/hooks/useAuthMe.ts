"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";

export type AuthMeResponse = {
  id: number;
  created_at?: number;
  name?: string;
  email?: string;
  Company?: number | string | null;
  Status?: string;
  status?: string;
  _new_company?: {
    id: number;
    name?: string;
  } | null;
};

/** Fetches the current user's full profile record (name/email/company) from /api/auth-me. */
export function useAuthMe() {
  const { user } = useAuth();
  const [me, setMe] = useState<AuthMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setMe(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const resp = await fetch("/api/auth-me", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!resp.ok) {
          const body = (await resp.json().catch(() => null)) as
            | { error?: string; message?: string }
            | null;
          throw new Error(
            body?.error || body?.message || "Failed to load user info"
          );
        }

        const data = (await resp.json()) as AuthMeResponse;
        setMe(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("Error loading auth/me:", err);
        setError(err instanceof Error ? err.message : "Failed to load user info");
        setMe(null);
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [user?.id]);

  return { me, loading, error };
}
