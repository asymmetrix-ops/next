export type TrackingEventType = "login" | "page_view" | "logout" | "error";
import { authService } from "@/lib/auth";

export interface TrackingEventInput {
  userId?: number;
  pageVisit?: string;
  pageHeading?: string;
  sessionId?: string;
  eventType: TrackingEventType;
}

const SESSION_KEY = "asym_session_id";
const RECENT_EVENTS_KEY = "asym_recent_events";
const recentEvents = new Map<string, number>();

// Do not track activities for these users
const BLOCKED_EMAILS = new Set<string>(
  [
    "a.boden@gmail.com",
    "j.bochner@asymmetrixintelligence.com",
    "d.dinsey@asymmetrixintelligence.com",
    "a.grishko@asymmetrixintelligence.com",
    "tucha.dev@gmail.com",
  ].map((e) => e.toLowerCase())
);

function isBlockedEmail(email: string | undefined): boolean {
  if (!email) return false;
  try {
    return BLOCKED_EMAILS.has(email.toLowerCase());
  } catch {
    return false;
  }
}

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

function shouldSendOnce(key: string, windowMs: number): boolean {
  try {
    const now = Date.now();
    const lastInMemory = recentEvents.get(key) ?? 0;
    if (now - lastInMemory < windowMs) return false;

    // Load persisted recent events
    const raw = sessionStorage.getItem(RECENT_EVENTS_KEY);
    const obj: Record<string, number> = raw ? JSON.parse(raw) : {};
    const lastPersisted = obj[key] ?? 0;
    if (now - lastPersisted < windowMs) return false;

    // Update caches
    recentEvents.set(key, now);
    obj[key] = now;
    // Keep only recent entries to avoid growth
    const cutoff = now - 5 * 60 * 1000;
    for (const k of Object.keys(obj)) {
      if (obj[k] < cutoff) delete obj[k];
    }
    sessionStorage.setItem(RECENT_EVENTS_KEY, JSON.stringify(obj));
    return true;
  } catch {
    // Fallback: only in-memory
    const now = Date.now();
    const last = recentEvents.get(key) ?? 0;
    if (now - last < windowMs) return false;
    recentEvents.set(key, now);
    return true;
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
    const h1 = document.querySelector("h1");
    const h1Text = (h1?.textContent || h1?.innerHTML || "").trim();
    return h1Text || document.title || "";
  } catch {
    return document.title || "";
  }
}

async function waitForStableTitle(
  maxWaitMs = 6000,
  stableMs = 1200
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

    let lastValue = ((): string => {
      try {
        const h1 = document.querySelector("h1");
        const h1Text = (h1?.textContent || h1?.innerHTML || "").trim();
        return h1Text || document.title || "";
      } catch {
        return document.title || "";
      }
    })();

    const computeCurrent = (): string => {
      try {
        const h1 = document.querySelector("h1");
        const h1Text = (h1?.textContent || h1?.innerHTML || "").trim();
        return h1Text || document.title || "";
      } catch {
        return document.title || "";
      }
    };

    const checkResolve = () => {
      if (resolved) return;
      const now = Date.now();
      const current = computeCurrent();
      if (current !== lastValue) {
        lastValue = current;
        stableSince = now;
      }
      if (
        (current && now - stableSince >= stableMs) ||
        now - start >= maxWaitMs
      ) {
        resolved = true;
        headObserver?.disconnect();
        bodyObserver?.disconnect();
        clearInterval(intervalId);
        resolveFn!(current || lastValue || document.title || "");
      }
    };

    const headEl = document.head || document.querySelector("head");
    const bodyEl = document.body || document.documentElement;

    const headObserver = headEl
      ? new MutationObserver(() => {
          checkResolve();
        })
      : null;
    const bodyObserver = bodyEl
      ? new MutationObserver(() => {
          checkResolve();
        })
      : null;

    if (headObserver && headEl) {
      headObserver.observe(headEl, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
    if (bodyObserver && bodyEl) {
      bodyObserver.observe(bodyEl, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: false,
      });
    }

    const intervalId = window.setInterval(checkResolve, 100);
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
  // Determine the most up-to-date user id at send time
  let finalUserId: number = 0;
  // Resolve current email early so blocklist applies even if userId is already provided
  let currentEmail: string | undefined = (() => {
    try {
      const u0 = authService.getUser();
      return (u0?.email as string | undefined) || undefined;
    } catch {
      return undefined;
    }
  })();
  if (
    typeof input.userId === "number" &&
    Number.isFinite(input.userId) &&
    input.userId !== 0
  ) {
    finalUserId = input.userId;
  } else {
    try {
      const u = authService.getUser();
      currentEmail = u?.email as string | undefined;
      const parsed = u?.id ? Number.parseInt(u.id, 10) : NaN;
      if (Number.isFinite(parsed)) {
        finalUserId = parsed as number;
      }
    } catch {
      // ignore
    }
  }

  // If still missing user on page_view, try to refresh from /auth/me once
  if (isPageView && finalUserId === 0) {
    try {
      const token = authService.getToken?.();
      if (token) {
        const refreshed = await authService.fetchMe?.();
        if (refreshed && typeof refreshed.id === "string") {
          // Persist for subsequent events
          authService.setUser?.(refreshed);
          currentEmail = (refreshed as { email?: string }).email as
            | string
            | undefined;
          const parsed = Number.parseInt(refreshed.id, 10);
          if (Number.isFinite(parsed)) {
            finalUserId = parsed as number;
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // Respect blocklist: skip tracking if the authenticated user's email is blocked
  if (isBlockedEmail(currentEmail)) {
    return;
  }
  if (isPageView) {
    const key = `${input.eventType}|${finalUserId}|${
      input.pageVisit ?? getPageVisit()
    }`;
    if (!shouldSendOnce(key, 2000)) return;
  }
  const payload = {
    user_id: finalUserId,
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
