import { NextRequest, NextResponse } from "next/server";

type EventType = "login" | "page_view" | "logout" | "error";

interface UserActivityPayload {
  user_id: number;
  page_visit: string;
  page_heading: string;
  session_id: string;
  event_type: EventType;
}

const XANO_ENDPOINT =
  process.env.XANO_USER_ACTIVITY_URL ||
  "https://xdil-abvj-o7rq.e2.xano.io/api:T3Zh6ok0:develop/user_activity";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<UserActivityPayload>;

    const {
      user_id = 0,
      page_visit = "",
      page_heading = "",
      session_id = "",
      event_type,
    } = body;

    if (!event_type || !["login", "page_view", "logout", "error"].includes(event_type)) {
      return NextResponse.json(
        { error: "Invalid or missing event_type" },
        { status: 400 }
      );
    }

    const payload: UserActivityPayload = {
      user_id: Number.isFinite(user_id as number) ? (user_id as number) : 0,
      page_visit: String(page_visit || ""),
      page_heading: String(page_heading || ""),
      session_id: String(session_id || ""),
      event_type: event_type as EventType,
    };

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


