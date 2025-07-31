"use client";

import { createContext, useContext, useEffect, useCallback } from "react";

interface AnalyticsContextType {
  trackEvent: (eventName: string, properties?: Record<string, unknown>) => void;
  trackPageView: (pageName: string) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(
  undefined
);

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const trackEvent = useCallback(
    (eventName: string, properties?: Record<string, unknown>) => {
      // Hotjar tracking
      if (
        typeof window !== "undefined" &&
        (window as unknown as { hj?: unknown }).hj
      ) {
        (
          window as unknown as {
            hj: (
              event: string,
              name: string,
              props?: Record<string, unknown>
            ) => void;
          }
        ).hj("event", eventName, properties);
      }

      // Google Analytics tracking
      if (
        typeof window !== "undefined" &&
        (window as unknown as { gtag?: unknown }).gtag
      ) {
        (
          window as unknown as {
            gtag: (
              event: string,
              name: string,
              props?: Record<string, unknown>
            ) => void;
          }
        ).gtag("event", eventName, properties);
      }
    },
    []
  );

  const trackPageView = useCallback(
    (pageName: string) => {
      trackEvent("page_view", { page_name: pageName });
    },
    [trackEvent]
  );

  useEffect(() => {
    // Track initial page view
    trackPageView(window.location.pathname);
  }, [trackPageView]);

  return (
    <AnalyticsContext.Provider value={{ trackEvent, trackPageView }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error("useAnalytics must be used within an AnalyticsProvider");
  }
  return context;
}
