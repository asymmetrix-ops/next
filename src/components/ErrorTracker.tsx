"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { trackError } from "@/lib/tracking";

export default function ErrorTracker() {
  const { user } = useAuth();

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const details = `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`;
      const userId = user?.id ? Number.parseInt(user.id, 10) : 0;
      trackError(details, Number.isFinite(userId) ? userId : 0);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason =
        (event.reason && (event.reason.stack || event.reason.message)) ||
        String(event.reason);
      const details = `UnhandledRejection: ${reason}`;
      const userId = user?.id ? Number.parseInt(user.id, 10) : 0;
      trackError(details, Number.isFinite(userId) ? userId : 0);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, [user]);

  return null;
}
