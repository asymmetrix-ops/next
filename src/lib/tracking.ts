export type TrackingEventType = "login" | "page_view" | "logout" | "error";

export interface TrackingEventInput {
  userId?: number;
  pageVisit?: string;
  pageHeading?: string;
  sessionId?: string;
  eventType: TrackingEventType;
}

const SESSION_KEY = "asym_session_id";

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return "";
  }
}

export function getPageVisit(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.location.href;
  } catch {
    return "";
  }
}

export function getPageHeading(): string {
  if (typeof document === "undefined") return "";
  try {
    return document.title || "";
  } catch {
    return "";
  }
}

async function waitForStableTitle(
  maxWaitMs = 2000,
  stableMs = 1000
): Promise<string> {
  if (typeof document === "undefined") return "";
  try {
    const start = Date.now();
    let stableSince = Date.now();
    let resolved = false;
    let resolveFn: (value: string) => void;
    const done = new Promise<string>((resolve) => {
      resolveFn = resolve;
    });

    let lastTitle = document.title || "";

    const checkResolve = () => {
      if (resolved) return;
      const now = Date.now();
      if (now - stableSince >= stableMs || now - start >= maxWaitMs) {
        resolved = true;
        observer?.disconnect();
        clearInterval(intervalId);
        resolveFn!(document.title || "");
      }
    };

    const headEl = document.head || document.querySelector("head");
    const observer = headEl
      ? new MutationObserver(() => {
          // Next.js may replace the <title> node entirely; always read document.title
          const current = document.title || "";
          if (current !== lastTitle) {
            lastTitle = current;
            stableSince = Date.now();
          }
        })
      : null;

    if (observer && headEl) {
      observer.observe(headEl, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    const intervalId = window.setInterval(checkResolve, 50);
    checkResolve();
    return await done;
  } catch {
    return document.title || "";
  }
}

async function waitForRenderSettled(
  maxWaitMs = 3000,
  quietMs = 500
): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const waitForLoad = async () => {
    if (document.readyState === "complete") return;
    await new Promise<void>((resolve) => {
      const onLoad = () => {
        window.removeEventListener("load", onLoad);
        resolve();
      };
      window.addEventListener("load", onLoad);
      // Fallback timeout
      setTimeout(() => {
        window.removeEventListener("load", onLoad);
        resolve();
      }, Math.min(maxWaitMs, 1500));
    });
  };

  const waitForFramesAndIdle = async () => {
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    await new Promise<void>((r) => requestAnimationFrame(() => r()));
    await new Promise<void>((resolve) => {
      type RequestIdle = (
        cb: () => void,
        opts?: { timeout?: number }
      ) => number;
      const w = window as unknown as { requestIdleCallback?: RequestIdle };
      const ric = w.requestIdleCallback;
      if (typeof ric === "function") {
        ric(() => resolve(), { timeout: 1000 });
      } else {
        setTimeout(() => resolve(), 200);
      }
    });
  };

  const waitForMutationQuiet = async () => {
    let lastChange = Date.now();
    let observer: MutationObserver | null = null;
    await new Promise<void>((resolve) => {
      const check = () => {
        if (Date.now() - lastChange >= quietMs) {
          observer?.disconnect();
          clearInterval(intervalId);
          resolve();
        }
      };
      const target = document.body || document.documentElement;
      if (target) {
        observer = new MutationObserver(() => {
          lastChange = Date.now();
        });
        observer.observe(target, {
          childList: true,
          subtree: true,
          attributes: false,
          characterData: false,
        });
      }
      const intervalId = window.setInterval(check, 50);
      // Initial check in case things are already quiet
      check();
      // Hard stop after maxWaitMs
      setTimeout(() => {
        observer?.disconnect();
        clearInterval(intervalId);
        resolve();
      }, maxWaitMs);
    });
  };

  await waitForLoad();
  await waitForFramesAndIdle();
  await waitForMutationQuiet();
}

export async function trackEvent(input: TrackingEventInput): Promise<void> {
  if (typeof window === "undefined") return;
  const isPageView = input.eventType === "page_view";
  if (isPageView) {
    // Heuristic: wait for render to settle to approximate "whole page rendered"
    await waitForRenderSettled();
  }
  const heading =
    input.pageHeading ??
    (isPageView ? await waitForStableTitle() : getPageHeading());
  const payload = {
    user_id: Number.isFinite(input.userId as number)
      ? (input.userId as number)
      : 0,
    page_visit: input.pageVisit ?? getPageVisit(),
    page_heading: heading,
    session_id: input.sessionId ?? getOrCreateSessionId(),
    event_type: input.eventType,
  } as const;

  try {
    await fetch("/api/user-activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: input.eventType === "logout" || input.eventType === "error",
    });
  } catch {
    // Intentionally ignore analytics failures
  }
}

export function trackPageView(userId?: number): Promise<void> {
  return trackEvent({ eventType: "page_view", userId });
}

export function trackLogin(userId?: number): Promise<void> {
  return trackEvent({ eventType: "login", userId });
}

export function trackLogout(userId?: number): Promise<void> {
  return trackEvent({ eventType: "logout", userId });
}

export function trackError(details: string, userId?: number): Promise<void> {
  return trackEvent({
    eventType: "error",
    userId,
    pageVisit: `${getPageVisit()} | ${details}`.slice(0, 1024),
  });
}
