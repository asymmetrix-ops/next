import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

const AUTH_API_URL =
  process.env.NEXT_PUBLIC_XANO_API_URL ||
  "https://xdil-abvj-o7rq.e2.xano.io/api:vnXelut6:develop";

// Alerts / email service (Fly). The key is a server secret: this route is the
// only place it is used, and the user's id and email come from their own login
// token, never from the request body.
const EMAIL_SERVICE_URL = (
  process.env.EMAIL_SERVICE_URL || "https://asymmetrix-email-service.fly.dev"
).replace(/\/$/, "");
const ALERTS_API_KEY = process.env.ALERTS_API_KEY;

const getToken = (request: Request) =>
  cookies().get("asymmetrix_auth_token")?.value || request.headers.get("x-asym-token");

async function getUser(token: string): Promise<{ id: number; email: string } | null> {
  for (const authorization of [`Bearer ${token}`, token]) {
    const res = await fetch(`${AUTH_API_URL}/auth/me`, {
      headers: { "Content-Type": "application/json", Authorization: authorization },
      cache: "no-store",
    });
    if (res.status === 401) continue;
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as { id?: unknown; email?: unknown } | null;
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
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
}

async function resolveUser(request: Request) {
  if (!ALERTS_API_KEY) {
    return { error: NextResponse.json({ error: "Follow news is not configured." }, { status: 503 }) };
  }
  const token = getToken(request);
  const user = token ? await getUser(token) : null;
  if (!user) {
    return { error: NextResponse.json({ error: "Unable to identify the user." }, { status: 401 }) };
  }
  return { user };
}

/** Current follow state for the signed-in user. */
export async function GET(request: Request) {
  try {
    const { user, error } = await resolveUser(request);
    if (error) return error;

    const res = await upstream(`/news/status/${user.id}`);
    // A user with no listener may be reported as 404 instead of is_following:false.
    if (res.status === 404) return NextResponse.json({ is_following: false });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = (await res.json()) as { is_following?: boolean };
    return NextResponse.json({ is_following: Boolean(data.is_following) });
  } catch (err) {
    console.error("News follow status failed:", err);
    return NextResponse.json({ error: "Unable to load your follow status." }, { status: 502 });
  }
}

/** Body: { action: "follow" | "unfollow" }. Both are idempotent for the user. */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { action?: unknown };
    if (body.action !== "follow" && body.action !== "unfollow") {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    const { user, error } = await resolveUser(request);
    if (error) return error;

    const res = await upstream(`/news/${body.action}`, {
      method: "POST",
      body: JSON.stringify({ user_id: user.id, email: user.email }),
    });
    // Unfollowing when not following is 404: the user is already unsubscribed.
    if (body.action === "unfollow" && res.status === 404) {
      return NextResponse.json({ is_following: false });
    }
    if (!res.ok) throw new Error(`${body.action} ${res.status}: ${await res.text().catch(() => "")}`);
    return NextResponse.json({ is_following: body.action === "follow" });
  } catch (err) {
    console.error("News follow update failed:", err);
    return NextResponse.json({ error: "Unable to update your preference. Please try again." }, { status: 502 });
  }
}
