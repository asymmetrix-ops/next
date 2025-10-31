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

export async function trackEvent(input: TrackingEventInput): Promise<void> {
  if (typeof window === "undefined") return;
  const payload = {
    user_id: Number.isFinite(input.userId as number)
      ? (input.userId as number)
      : 0,
    page_visit: input.pageVisit ?? getPageVisit(),
    page_heading: input.pageHeading ?? getPageHeading(),
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
