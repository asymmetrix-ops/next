export type TrackingEventType =
  | "login"
  | "page_view"
  | "key_action"
  | "logout"
  | "error"
  | "download_pdf"
  | "platform_wide_search"
  | "company_search";

/** Section Insights: where the user came from on a page view. Strict enum on the server. */
export type EntrySource =
  | "left_menu"
  | "global_search"
  | "dashboard"
  | "company_profile"
  | "other_section"
  | "daily_email"
  | "direct_url";

export type TrackingSection = "transaction_comps" | "deal_radar" | "news";

export type TrackingTargetType = "company" | "corporate_event" | "article";

/** Free-text qualifiers: one fixed lowercase_underscore list per section, used everywhere. */
export type TransactionCompsTab = "list_view" | "comp_set" | "comp_identifier";

export type KeyActionName =
  // transaction_comps
  | "tab_opened"
  | "filter_applied"
  | "target_company_selected"
  | "peer_set_saved"
  | "peer_sets_compared"
  | "comp_clicked_through"
  | "export"
  | "search"
  // deal_radar
  | "column_sorted"
  | "company_clicked_through"
  // news
  | "article_opened"
  | "view_summary_opened"
  | "read_full_article_clicked"
  | "company_of_focus_clicked";
import { authService } from "@/lib/auth";
import { isActivityTrackingBlockedEmail } from "@/lib/activityTracking";
import { getDeviceType } from "@/lib/device";

export interface TrackingEventInput {
  userId?: number;
  pageVisit?: string;
  pageHeading?: string;
  sessionId?: string;
  eventType: TrackingEventType;
  query?: string | null;
  filtersUsed?: Record<string, unknown>;
  entrySource?: EntrySource;
  section?: TrackingSection;
  action?: KeyActionName;
  actionDetail?: string;
  targetType?: TrackingTargetType;
  targetId?: number;
  resultsCount?: number;
}

const SESSION_KEY = "asym_session_id";
const RECENT_EVENTS_KEY = "asym_recent_events";
const recentEvents = new Map<string, number>();

// NOTE: Global activity tracking block rule lives in `src/lib/activityTracking.ts`

const LAST_ACTIVITY_KEY = "asym_last_activity";
// Matches the server-side visit rule: a new visit starts after 30 minutes without activity.
const SESSION_IDLE_MS = 30 * 60 * 1000;

function newSessionId(): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

/** Start a fresh session id (used on login and logout). */
export function rotateSessionId(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_KEY, newSessionId());
    sessionStorage.removeItem(LAST_ACTIVITY_KEY);
  } catch {
    // ignore
  }
}

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    const now = Date.now();
    const existing = sessionStorage.getItem(SESSION_KEY);
    const last = Number(sessionStorage.getItem(LAST_ACTIVITY_KEY) || 0);
    // A tab left open overnight comes back with a new session id.
    const id = existing && !(last && now - last > SESSION_IDLE_MS)
      ? existing
      : newSessionId();
    sessionStorage.setItem(SESSION_KEY, id);
    sessionStorage.setItem(LAST_ACTIVITY_KEY, String(now));
    return id;
  } catch {
    return "";
  }
}

const ENTRY_SOURCE_KEY = "asym_entry_source";
// A stored source older than this belongs to a click that never navigated.
const ENTRY_SOURCE_TTL_MS = 10_000;

/** Remember the source of the navigation about to happen; the next page view reads and clears it. */
export function setEntrySource(source: EntrySource): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      ENTRY_SOURCE_KEY,
      JSON.stringify({ source, at: Date.now() })
    );
  } catch {
    // ignore
  }
}

let currentPagePath = "";
let previousPagePath = "";
/** Record the route of a page view; the previous route is what the next page was reached from. */
export function notePagePath(path: string): void {
  if (path === currentPagePath) return;
  previousPagePath = currentPagePath;
  currentPagePath = path;
}
export function getPreviousPagePath(): string {
  return previousPagePath;
}

let lastPageEntrySource: EntrySource = "direct_url";
/** Entry source of the most recent page view, for key actions that report where the user came from. */
export function setLastPageEntrySource(source: EntrySource): void {
  lastPageEntrySource = source;
}
export function getLastPageEntrySource(): EntrySource {
  return lastPageEntrySource;
}

/** Read and clear the stored source. Falls back to direct_url when nothing fresh is stored. */
export function consumeEntrySource(): EntrySource {
  if (typeof window === "undefined") return "direct_url";
  try {
    const raw = sessionStorage.getItem(ENTRY_SOURCE_KEY);
    sessionStorage.removeItem(ENTRY_SOURCE_KEY);
    if (!raw) return "direct_url";
    const { source, at } = JSON.parse(raw) as { source?: EntrySource; at?: number };
    if (!source || typeof at !== "number" || Date.now() - at > ENTRY_SOURCE_TTL_MS) {
      return "direct_url";
    }
    return source;
  } catch {
    return "direct_url";
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

/** Develop branch: user-activity tracking is permanently off. */
const USER_ACTIVITY_TRACKING_ENABLED = false;

export async function trackEvent(input: TrackingEventInput): Promise<void> {
  // User activity tracking is fully disabled on the develop deployment.
  if (typeof window === "undefined" || !USER_ACTIVITY_TRACKING_ENABLED) return;
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

  // Respect global block rule: skip tracking if the authenticated user's email is blocked
  if (isActivityTrackingBlockedEmail(currentEmail)) {
    return;
  }
  if (isPageView) {
    const key = `${input.eventType}|${finalUserId}|${
      input.pageVisit ?? getPageVisit()
    }`;
    if (!shouldSendOnce(key, 2000)) return;
  }
  if (input.eventType === "key_action") {
    // Guards double clicks and re-render double fires; identical actions 600ms apart count once.
    const key = [
      "key_action",
      finalUserId,
      input.section,
      input.action,
      input.actionDetail ?? "",
      input.targetType ?? "",
      input.targetId ?? "",
      input.query ?? "",
    ].join("|");
    if (!shouldSendOnce(key, 600)) return;
  }
  const payload = {
    user_id: finalUserId,
    page_visit: input.pageVisit ?? getPageVisit(),
    page_heading: heading,
    session_id: input.sessionId ?? getOrCreateSessionId(),
    event_type: input.eventType,
    device: getDeviceType(),
  } as const;

  const queryValue =
    typeof input.query === "string"
      ? input.query.trim().slice(0, 512)
      : input.query ?? null;
  const shouldIncludeQuery =
    input.eventType === "platform_wide_search" ||
    input.eventType === "company_search" ||
    queryValue !== null;
  const withQuery = shouldIncludeQuery ? { ...payload, query: queryValue } : payload;

  const filtersValue =
    input.filtersUsed && typeof input.filtersUsed === "object"
      ? (input.filtersUsed as Record<string, unknown>)
      : {};
  const withFilters =
    input.eventType === "company_search"
      ? { ...withQuery, filters_used: filtersValue }
      : withQuery;
  const payloadFinal = {
    ...withFilters,
    ...(input.entrySource ? { entry_source: input.entrySource } : {}),
    ...(input.section ? { section: input.section } : {}),
    ...(input.action ? { action: input.action } : {}),
    ...(input.actionDetail ? { action_detail: input.actionDetail } : {}),
    ...(input.targetType ? { target_type: input.targetType } : {}),
    ...(typeof input.targetId === "number" && Number.isFinite(input.targetId)
      ? { target_id: input.targetId }
      : {}),
    ...(typeof input.resultsCount === "number" && Number.isFinite(input.resultsCount)
      ? { results_count: input.resultsCount }
      : {}),
  };

  try {
    await fetch("/api/user-activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadFinal),
      keepalive: input.eventType === "logout" || input.eventType === "error",
    });
  } catch {
    // Intentionally ignore analytics failures
  }
}

export function trackPageView(
  userId?: number,
  entrySource?: EntrySource
): Promise<void> {
  return trackEvent({ eventType: "page_view", userId, entrySource });
}

export interface KeyActionInput {
  section: TrackingSection;
  action: KeyActionName;
  actionDetail?: string;
  targetType?: TrackingTargetType;
  targetId?: number | string | null;
  query?: string;
  resultsCount?: number;
}

/** Fire-and-forget: one event per user action, never blocks the UI. */
export function trackKeyAction(input: KeyActionInput): void {
  const id =
    input.targetId == null ? undefined : Number.parseInt(String(input.targetId), 10);
  void trackEvent({
    eventType: "key_action",
    section: input.section,
    action: input.action,
    actionDetail: input.actionDetail,
    targetType: input.targetType,
    targetId: Number.isFinite(id) ? id : undefined,
    query: input.query,
    resultsCount: input.resultsCount,
  }).catch(() => {});
}

export function trackLogin(userId?: number): Promise<void> {
  rotateSessionId();
  return trackEvent({ eventType: "login", userId });
}

export async function trackLogout(userId?: number): Promise<void> {
  await trackEvent({ eventType: "logout", userId });
  rotateSessionId();
}

export function trackError(details: string, userId?: number): Promise<void> {
  return trackEvent({
    eventType: "error",
    userId,
    pageVisit: `${getPageVisit()} | ${details}`.slice(0, 1024),
  });
}
