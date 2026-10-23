import { NextRequest, NextResponse } from "next/server";

type EventType =
  | "login"
  | "page_view"
  | "key_action"
  | "logout"
  | "error"
  | "download_pdf"
  | "platform_wide_search"
  | "company_search";

const ENTRY_SOURCES = [
  "left_menu",
  "global_search",
  "dashboard",
  "company_profile",
  "other_section",
  "daily_email",
  "direct_url",
] as const;
const SECTIONS = ["transaction_comps", "deal_radar", "news"] as const;
const TARGET_TYPES = ["company", "corporate_event", "article"] as const;

interface UserActivityPayload {
  user_id: number;
  page_visit: string;
  page_heading: string;
  session_id: string;
  event_type: EventType;
  query?: string;
  entry_source?: (typeof ENTRY_SOURCES)[number];
  section?: (typeof SECTIONS)[number];
  action?: string;
  action_detail?: string;
  target_type?: (typeof TARGET_TYPES)[number];
  target_id?: number;
  results_count?: number;
}

const XANO_ENDPOINT =
  process.env.XANO_USER_ACTIVITY_URL ||
  "https://xdil-abvj-o7rq.e2.xano.io/api:T3Zh6ok0:develop/user_activity";

const USER_ACTIVITY_TRACKING_ENABLED: boolean = false;

export async function POST(req: NextRequest) {
  // User activity tracking is fully disabled on the develop deployment.
  if (USER_ACTIVITY_TRACKING_ENABLED === false) {
    return new NextResponse(null, { status: 204 });
  }
  try {
    const body = (await req.json()) as Partial<UserActivityPayload>;

    const {
      user_id = 0,
      page_visit = "",
      page_heading = "",
      session_id = "",
      event_type,
    } = body;

    const allowed: EventType[] = [
      "login",
      "page_view",
      "key_action",
      "logout",
      "error",
      "download_pdf",
      "platform_wide_search",
      "company_search",
    ];
    if (!event_type || !allowed.includes(event_type as EventType)) {
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
    const queryVal = body.query;
    if (queryVal != null && typeof queryVal === "string" && queryVal.trim() !== "") {
      payload.query = queryVal.trim();
    }

    // Section Insights fields: optional; strict enums are dropped when invalid so the event is not lost.
    const pick = <T extends string>(v: unknown, list: readonly T[]) =>
      typeof v === "string" && (list as readonly string[]).includes(v)
        ? (v as T)
        : undefined;
    const entrySource = pick(body.entry_source, ENTRY_SOURCES);
    if (entrySource) payload.entry_source = entrySource;
    const section = pick(body.section, SECTIONS);
    if (section) payload.section = section;
    if (typeof body.action === "string" && /^[a-z_]{1,64}$/.test(body.action)) {
      payload.action = body.action;
    }
    if (typeof body.action_detail === "string" && body.action_detail.trim()) {
      payload.action_detail = body.action_detail.trim().slice(0, 128);
    }
    const targetType = pick(body.target_type, TARGET_TYPES);
    if (targetType) payload.target_type = targetType;
    if (Number.isInteger(body.target_id)) payload.target_id = body.target_id;
    if (Number.isInteger(body.results_count) && (body.results_count as number) >= 0) {
      payload.results_count = body.results_count;
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


