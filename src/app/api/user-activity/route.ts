import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isActivityTrackingBlockedEmail } from "@/lib/activityTracking";

type EventType =
  | "login"
  | "page_view"
  | "logout"
  | "error"
  | "platform_wide_search"
  | "company_search";

interface UserActivityPayload {
  user_id: number;
  page_visit: string;
  page_heading: string;
  session_id: string;
  event_type: EventType;
  query?: string | null;
  filters_used?: Record<string, unknown>;
}

const XANO_ENDPOINT =
  process.env.XANO_USER_ACTIVITY_URL ||
  "https://xdil-abvj-o7rq.e2.xano.io/api:T3Zh6ok0/user_activity";

const XANO_AUTH_API_URL =
  process.env.NEXT_PUBLIC_XANO_API_URL || "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6";

type TokenEmailCacheValue = { email: string; expiresAt: number };
const tokenEmailCache = new Map<string, TokenEmailCacheValue>();

function base64UrlDecodeToString(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function extractEmailFromJwt(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payloadJson = base64UrlDecodeToString(parts[1] || "");
    const payload = JSON.parse(payloadJson) as Record<string, unknown>;

    const direct =
      (payload.email as string | undefined) ||
      (payload.user_email as string | undefined) ||
      (payload.username as string | undefined);
    if (typeof direct === "string" && direct) return direct;

    const user = payload.user as Record<string, unknown> | undefined;
    const nestedEmail = user?.email;
    if (typeof nestedEmail === "string" && nestedEmail) return nestedEmail;

    return null;
  } catch {
    return null;
  }
}

async function fetchEmailFromAuthMe(token: string): Promise<string | null> {
  try {
    // Prefer standard Bearer, fallback to raw token if 401 (matches /api/auth-me behavior)
    let resp = await fetch(`${XANO_AUTH_API_URL}/auth/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (resp.status === 401) {
      resp = await fetch(`${XANO_AUTH_API_URL}/auth/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${token}`,
        },
        cache: "no-store",
      });
    }

    if (!resp.ok) return null;
    const data = (await resp.json()) as { email?: unknown };
    return typeof data.email === "string" ? data.email : null;
  } catch {
    return null;
  }
}

async function getEmailForToken(token: string): Promise<string | null> {
  try {
    const now = Date.now();
    const cached = tokenEmailCache.get(token);
    if (cached && cached.expiresAt > now) return cached.email;
    if (cached) tokenEmailCache.delete(token);

    const jwtEmail = extractEmailFromJwt(token);
    if (jwtEmail) {
      tokenEmailCache.set(token, { email: jwtEmail, expiresAt: now + 10 * 60 * 1000 });
      return jwtEmail;
    }

    const meEmail = await fetchEmailFromAuthMe(token);
    if (meEmail) {
      tokenEmailCache.set(token, { email: meEmail, expiresAt: now + 10 * 60 * 1000 });
      return meEmail;
    }

    return null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<UserActivityPayload>;

    const {
      user_id = 0,
      page_visit = "",
      page_heading = "",
      session_id = "",
      event_type,
      query = null,
      filters_used,
    } = body;

    // Drop events when unauthenticated to avoid bot noise
    const token = cookies().get("asymmetrix_auth_token")?.value;
    if (!token) {
      return new NextResponse(null, { status: 204 });
    }

    // Global strict rule: never track activity for blocked emails (server-side enforcement)
    const email = await getEmailForToken(token);
    if (isActivityTrackingBlockedEmail(email)) {
      return new NextResponse(null, { status: 204 });
    }

    // Require a valid user id
    const normalizedUserId = Number.isFinite(user_id as number)
      ? (user_id as number)
      : 0;
    if (!normalizedUserId) {
      return new NextResponse(null, { status: 204 });
    }

    if (
      !event_type ||
      ![
        "login",
        "page_view",
        "logout",
        "error",
        "platform_wide_search",
        "company_search",
      ].includes(event_type)
    ) {
      return NextResponse.json(
        { error: "Invalid or missing event_type" },
        { status: 400 }
      );
    }

    const normalizedQuery =
      typeof query === "string"
        ? query.trim().slice(0, 512)
        : query === null || query === undefined
          ? null
          : String(query).trim().slice(0, 512);

    const payload: UserActivityPayload = {
      user_id: normalizedUserId,
      page_visit: String(page_visit || ""),
      page_heading: String(page_heading || ""),
      session_id: String(session_id || ""),
      event_type: event_type as EventType,
    };
    if (
      event_type === "platform_wide_search" ||
      event_type === "company_search" ||
      normalizedQuery !== null
    ) {
      payload.query = normalizedQuery;
    }

    if (event_type === "company_search") {
      payload.filters_used =
        filters_used && typeof filters_used === "object"
          ? (filters_used as Record<string, unknown>)
          : {};
    }

    const upstream = await fetch(XANO_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const text = await upstream.text().catch(() => "");
    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Upstream error", statusText: upstream.statusText, text },
        { status: upstream.status }
      );
    }

    // Try to return JSON if possible, otherwise text
    try {
      const data = JSON.parse(text);
      return NextResponse.json(data, { status: 200 });
    } catch {
      return new NextResponse(text, { status: 200 });
    }
  } catch (e) {
    return NextResponse.json(
      { error: "Internal error", message: (e as Error).message },
      { status: 500 }
    );
  }
}


