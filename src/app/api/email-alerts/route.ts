import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

const AUTH_API_URL =
  process.env.NEXT_PUBLIC_XANO_API_URL ||
  "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6";

const EMAIL_SERVICE_URL = (
  process.env.EMAIL_SERVICE_URL || "https://asymmetrix-email-service.fly.dev"
).replace(/\/$/, "");
const ALERTS_API_KEY = process.env.ALERTS_API_KEY;

const getToken = (request: Request) =>
  cookies().get("asymmetrix_auth_token")?.value ||
  request.headers.get("x-asym-token");

async function getUser(
  token: string
): Promise<{ id: number; email: string } | null> {
  for (const authorization of [`Bearer ${token}`, token]) {
    const res = await fetch(`${AUTH_API_URL}/auth/me`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: authorization,
      },
      cache: "no-store",
    });
    if (res.status === 401) continue;
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as {
      id?: unknown;
      email?: unknown;
    } | null;
    const id = Number(data?.id);
    const email = typeof data?.email === "string" ? data.email.trim() : "";
    return Number.isFinite(id) && id > 0 && email ? { id, email } : null;
  }
  return null;
}

async function upstream(path: string, init: RequestInit = {}) {
  return fetch(`${EMAIL_SERVICE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": ALERTS_API_KEY as string,
      ...(init.headers as Record<string, string> | undefined),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
}

/** User email alerts from the Fly email service (Turso-backed). */
export async function GET(request: Request) {
  try {
    if (!ALERTS_API_KEY) {
      return NextResponse.json(
        { error: "Email alerts are not configured." },
        { status: 503 }
      );
    }

    const token = getToken(request);
    const user = token ? await getUser(token) : null;
    if (!user) {
      return NextResponse.json(
        { error: "Unable to identify the user." },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const requestedUserId = Number(url.searchParams.get("user_id"));
    if (
      Number.isFinite(requestedUserId) &&
      requestedUserId > 0 &&
      requestedUserId !== user.id
    ) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const upstreamParams = new URLSearchParams({ user_id: String(user.id) });
    const itemType = url.searchParams.get("item_type")?.trim();
    if (itemType && /^[a-z0-9_]+$/i.test(itemType)) {
      upstreamParams.set("item_type", itemType);
    }
    const emailFrequency = url.searchParams.get("email_frequency")?.trim();
    if (
      emailFrequency === "daily" ||
      emailFrequency === "weekly" ||
      emailFrequency === "as_added"
    ) {
      upstreamParams.set("email_frequency", emailFrequency);
    }
    const isActive = url.searchParams.get("is_active")?.trim().toLowerCase();
    if (isActive === "true" || isActive === "false") {
      upstreamParams.set("is_active", isActive);
    }

    const res = await upstream(`/alerts?${upstreamParams.toString()}`);
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("Email alerts upstream failed:", res.status, detail);
      return NextResponse.json(
        { error: "Unable to load email alerts." },
        { status: 502 }
      );
    }

    const data = await res.json().catch(() => null);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Email alerts GET failed:", err);
    return NextResponse.json(
      { error: "Unable to load email alerts." },
      { status: 502 }
    );
  }
}
