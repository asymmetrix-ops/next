import { NextRequest, NextResponse } from "next/server";

const USER_EMAIL_ENGAGEMENT_URL =
  "https://xdil-abvj-o7rq.e2.xano.io/api:v3Rb5urZ/get_user_email_engagement";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";

  let body: { user_id?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const userId = body.user_id;
  if (typeof userId !== "number" || !Number.isFinite(userId)) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(authHeader ? { Authorization: authHeader } : {}),
  };

  const res = await fetch(
    `${USER_EMAIL_ENGAGEMENT_URL}?user_id=${encodeURIComponent(String(userId))}`,
    { method: "GET", headers }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: text || res.statusText },
      { status: res.status }
    );
  }

  return NextResponse.json(await res.json());
}
